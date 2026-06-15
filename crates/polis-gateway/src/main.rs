use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::{ConnectInfo, Request, State},
    http::StatusCode,
    middleware,
    response::Response,
    routing::{any, get, Router},
    Json,
};
use polis_core::models::ApiResponse;
use polis_core::shutdown::shutdown_signal;
use serde_json::{json, Value};
use tokio::sync::Mutex;
use tower_http::{compression::CompressionLayer, trace::TraceLayer};
use tracing_subscriber::EnvFilter;

use crate::config::GatewayConfig;

mod config;

/// Global metrics counters (Prometheus-compatible)
static CONNECTION_COUNT: AtomicU64 = AtomicU64::new(0);
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);
static ERROR_COUNT: AtomicU64 = AtomicU64::new(0);

/// 速率限制条目
#[derive(Debug)]
struct RateLimitEntry {
    count: u32,
    window_start: Instant,
}

/// API 网关状态
struct GatewayState {
    config: GatewayConfig,
    client: reqwest::Client,
    /// 速率限制映射 — 条目通过后台清理任务驱逐（每 5 分钟扫描一次，清理 window_start 过期超过 60s 的 IP），防止内存泄漏
    rate_limits: Mutex<HashMap<IpAddr, RateLimitEntry>>,
    /// 后台任务的 JoinHandle — graceful shutdown 时全部 abort，防止任务静默丢失
    handles: Mutex<Vec<tokio::task::JoinHandle<()>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = GatewayConfig::from_env();
    let state = Arc::new(GatewayState {
        client: reqwest::Client::builder()
            .pool_max_idle_per_host(32)
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .tcp_keepalive(std::time::Duration::from_secs(60))
            .timeout(std::time::Duration::from_secs(30))
            .connect_timeout(std::time::Duration::from_secs(5))
            .build()?,
        config: config.clone(),
        rate_limits: Mutex::new(HashMap::new()),
        handles: Mutex::new(Vec::new()),
    });

    // CORS 由 Nginx 统一管理

    // 路由
    // 代理路由 - 视频服务 (可配置 body limit，默认 600MB)
    let video_routes = Router::new()
        .route("/api/videos/{*path}", any(proxy_to_video))
        .route("/api/videos", any(proxy_to_video))
        .route("/hls/{*path}", any(proxy_to_video))
        .layer(axum::extract::DefaultBodyLimit::max(config.max_video_bytes));

    // 启动速率限制器后台清理：每 5 分钟清除过期条目以避免内存泄漏
    // 过期判定：window_start + 60s < now（与中间件窗口一致）
    {
        let state_for_spawn = state.clone();
        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
            loop {
                interval.tick().await;
                let mut limits = state_for_spawn.rate_limits.lock().await;
                let before = limits.len();
                let now = Instant::now();
                let window = std::time::Duration::from_secs(60);
                limits.retain(|_ip, entry| {
                    now.duration_since(entry.window_start) <= window
                });
                let removed = before - limits.len();
                if removed > 0 {
                    tracing::debug!("Rate limiter cleanup: removed {} expired entries", removed);
                }
            }
        });
        state.handles.lock().await.push(handle);
    }

    let app = Router::new()
        // 代理路由 - 用户服务
        .route("/api/auth/{*path}", any(proxy_to_user))
        .route("/api/users/{*path}", any(proxy_user_router))
        .route("/api/user/{*path}", any(proxy_to_user))
        .route("/api/my/{*path}", any(proxy_to_content))
        .route("/api/follow", any(proxy_to_user))
        .route("/api/contacts/{*path}", any(proxy_to_user))
        .route("/api/profile/{*path}", any(proxy_to_user))
        // 代理路由 - 社区 + 内容服务 (同一 catch-all, 按 path 分发)
        .route("/api/search", any(proxy_to_space))
        .route("/api/explore", any(proxy_to_space))
        .route("/api/hot", any(proxy_to_space))
        .route("/api/saved", any(proxy_to_content))
        .route("/api/spaces", any(proxy_space_router))
        .route("/api/spaces/{*path}", any(proxy_space_router))
        .route("/api/space/{*path}", any(proxy_space_router))
        // 代理路由 - 聚合服务 (精选/趋势/子社区)
        .route("/api/aggregate/root/{slug}/featured", any(proxy_to_aggregate))
        .route("/api/aggregate/root/{slug}/trending", any(proxy_to_aggregate))
        .route("/api/aggregate/root/{slug}/subspaces", any(proxy_to_aggregate))
        // 代理路由 - 根社区
        .route("/api/root/{*path}", any(proxy_to_space))
        // 代理路由 - 内容服务 (帖子, 投票, 投票/问卷, 草稿, 通知, 书签列表, 公告)
        .route("/api/posts/{*path}", any(proxy_to_content))
        .route("/api/comments/{*path}", any(proxy_to_content))
        .route("/api/chat/{*path}", any(proxy_to_content))
        .route("/api/series/{*path}", any(proxy_to_content))
        .route("/api/tiers/{*path}", any(proxy_to_content))
        .route("/api/subscribe/{*path}", any(proxy_to_content))
        .route("/api/vote", any(proxy_to_content))
        .route("/api/polls", any(proxy_to_content))
        .route("/api/polls/{*path}", any(proxy_to_content))
        .route("/api/drafts", any(proxy_to_content))
        .route("/api/notifications", any(proxy_to_content))
        .route("/api/notifications/unread-count", any(proxy_to_content))
        .route("/api/notifications/read", any(proxy_to_content))
        .route("/api/notifications/read-all", any(proxy_to_content))
        .route("/api/notifications/delete", any(proxy_to_content))
        // 代理路由 - 收藏
        .route("/api/bookmarks", any(proxy_to_content))
        .route("/api/bookmarks/{*path}", any(proxy_to_content))
        // 点赞列表
        .route("/api/liked-posts", any(proxy_to_content))
        // 创作者中心评论管理
        .route("/api/creator/{*path}", any(proxy_to_content))
        .route("/api/creator", any(proxy_to_content))
        // 代理路由 - 文件
        .route("/api/files/{*path}", any(proxy_to_content))
        .route("/api/share/{*path}", any(proxy_to_content))
        .route("/api/announcements/{*path}", any(proxy_to_content))
        .route("/api/upload", any(proxy_to_content))
        .route("/api/import/markdown", any(proxy_to_content))
        .route("/api/feed", any(proxy_to_content))
        // 代理路由 - 创作中心 & 引用驱动架构
        .route("/api/creations", any(proxy_to_content))
        .route("/api/creations/{*path}", any(proxy_to_content))
        .route("/api/module-refs/{*path}", any(proxy_to_content))
        .route("/api/refs/{*path}", any(proxy_to_content))
        // 代理路由 - AI 线程
        .route("/api/threads", any(proxy_to_content))
        .route("/api/threads/{*path}", any(proxy_to_content))
        // 代理路由 - 私信
        .route("/api/messages", any(proxy_to_content))
        .route("/api/messages/{*path}", any(proxy_to_content))
        // 代理路由 - 视频服务
        .merge(video_routes)
        // 代理路由 - 管理后台服务
        .route("/api/admin/{*path}", any(proxy_to_admin))
        .route("/api/admin", any(proxy_to_admin))
        // 代理路由 - 新功能 (v1.1.0)
        .route("/api/hashtags", any(proxy_to_content))
        .route("/api/hashtags/{*path}", any(proxy_to_content))
        .route("/api/editor-picks", any(proxy_to_content))
        .route("/api/leaderboard", any(proxy_to_content))
        .route("/api/leaderboard/{*path}", any(proxy_to_content))
        .route("/api/tips", any(proxy_to_content))
        .route("/api/tips/{*path}", any(proxy_to_content))
        .route("/api/weekly-topic", any(proxy_to_content))
        .route("/api/weekly-topic/{*path}", any(proxy_to_content))
        .route("/api/recommendations", any(proxy_to_content))
        .route("/api/events", any(proxy_to_content))
        .route("/api/events/{*path}", any(proxy_to_content))
        // 健康检查 - Gateway 自身
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        // Prometheus 指标
        .route("/metrics", get(metrics_handler))
        // 健康检查 - 各微服务代理
        .route("/api/health/user", get(proxy_health_user))
        .route("/api/health/space", get(proxy_health_space))
        .route("/api/health/content", get(proxy_health_content))
        .route("/api/health/admin", get(proxy_health_admin))
        .route("/api/health/video", get(proxy_health_video))
        // 健康检查 - 聚合
        .route("/api/health/all", get(health_check_all))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            rate_limit_middleware,
        ))
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .with_state(state.clone());

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("API Gateway starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    // 优雅关闭：abort 所有后台任务以确保完整清理
    let mut handles = state.handles.lock().await;
    for handle in handles.drain(..) {
        handle.abort();
    }
    tracing::info!("All background tasks aborted, gateway shut down cleanly");

    Ok(())
}

/// 速率限制中间件
async fn rate_limit_middleware(
    State(state): State<Arc<GatewayState>>,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    request: Request,
    next: axum::middleware::Next,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let ip = addr.ip();
    let limit = state.config.rate_limit_per_minute;

    let mut limits = state.rate_limits.lock().await;
    let now = Instant::now();
    let window = std::time::Duration::from_secs(60);

    let entry = limits.entry(ip).or_insert_with(|| RateLimitEntry {
        count: 0,
        window_start: now,
    });

    // 如果窗口超过 60 秒，重置计数
    if now.duration_since(entry.window_start) > window {
        entry.count = 0;
        entry.window_start = now;
    }

    entry.count += 1;

    if entry.count > limit {
        tracing::warn!("Rate limit exceeded for {} ({} req/min)", ip, entry.count);
        ERROR_COUNT.fetch_add(1, Ordering::Relaxed);
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(ApiResponse::error(1429, "请求过于频繁，请稍后再试")),
        ));
    }

    drop(limits);
    CONNECTION_COUNT.fetch_add(1, Ordering::Relaxed);
    REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);
    Ok(next.run(request).await)
}

/// 健康检查
async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("Polis API Gateway is running".to_string()))
}

/// Prometheus 风格 /metrics 端点
async fn metrics_handler() -> String {
    let connections = CONNECTION_COUNT.load(Ordering::Relaxed);
    let requests = REQUEST_COUNT.load(Ordering::Relaxed);
    let errors = ERROR_COUNT.load(Ordering::Relaxed);

    format!(
        "# HELP polis_gateway_connections_total Total HTTP connections accepted.\n\
         # TYPE polis_gateway_connections_total counter\n\
         polis_gateway_connections_total {}\n\
         # HELP polis_gateway_requests_total Total HTTP requests received.\n\
         # TYPE polis_gateway_requests_total counter\n\
         polis_gateway_requests_total {}\n\
         # HELP polis_gateway_errors_total Total proxy/processing errors.\n\
         # TYPE polis_gateway_errors_total counter\n\
         polis_gateway_errors_total {}\n",
        connections, requests, errors,
    )
}

/// 代理 health 请求到指定 URL，返回服务健康 JSON
async fn proxy_health(client: &reqwest::Client, service_url: &str) -> Value {
    match client
        .get(format!("{}/health", service_url))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<Value>().await {
                    Ok(body) => body.get("data").cloned().unwrap_or(json!({
                        "service": "unknown",
                        "status": "degraded",
                        "error": "Invalid response format"
                    })),
                    Err(_) => json!({"service": "unknown", "status": "degraded", "error": "JSON parse error"})
                }
            } else {
                json!({"status": "degraded", "error": format!("HTTP {}", resp.status().as_u16())})
            }
        }
        Err(e) => json!({"status": "unreachable", "error": e.to_string()})
    }
}

/// 聚合所有微服务健康状态
async fn health_check_all(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let user_health = proxy_health(&state.client, &state.config.user_service_url);
    let space_health = proxy_health(&state.client, &state.config.space_service_url);
    let content_health = proxy_health(&state.client, &state.config.content_service_url);
    let admin_health = proxy_health(&state.client, &state.config.admin_service_url);
    let video_health = proxy_health(&state.client, &state.config.video_service_url);

    let (u, s, c, a, v) = tokio::join!(user_health, space_health, content_health, admin_health, video_health);

    let all_healthy = [&u, &s, &c, &a, &v].iter().all(|h| {
        h.get("status").and_then(|v| v.as_str()) == Some("healthy")
    });

    Json(ApiResponse::success(json!({
        "gateway": "healthy",
        "services": {
            "user": u,
            "space": s,
            "content": c,
            "admin": a,
            "video": v,
        },
        "all_healthy": all_healthy,
    })))
}

/// 代理用户服务 health
async fn proxy_health_user(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let health = proxy_health(&state.client, &state.config.user_service_url).await;
    Json(ApiResponse::success(health))
}

/// 代理空间服务 health
async fn proxy_health_space(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let health = proxy_health(&state.client, &state.config.space_service_url).await;
    Json(ApiResponse::success(health))
}

/// 代理内容服务 health
async fn proxy_health_content(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let health = proxy_health(&state.client, &state.config.content_service_url).await;
    Json(ApiResponse::success(health))
}

/// 代理管理后台 health
async fn proxy_health_admin(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let health = proxy_health(&state.client, &state.config.admin_service_url).await;
    Json(ApiResponse::success(health))
}

/// 代理视频服务 health
async fn proxy_health_video(
    State(state): State<Arc<GatewayState>>,
) -> Json<ApiResponse<Value>> {
    let health = proxy_health(&state.client, &state.config.video_service_url).await;
    Json(ApiResponse::success(health))
}

/// 空间/内容路由分发器
/// 根据路径判断转发到空间服务还是内容服务
async fn proxy_space_router(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path = req.uri().path();
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or(path);
    // 判断是否是内容服务路径（包含 /posts, /featured, /bookmarks, /announcements）
    let remaining = path.strip_prefix("/api/spaces").unwrap_or(path);
    let is_content = remaining.contains("/posts") || remaining.contains("/featured") || remaining.contains("/bookmarks") || remaining.contains("/announcements") || remaining.contains("/polls") || remaining.contains("/files") || remaining.contains("/share") || remaining.contains("/analytics") || remaining.contains("/references");
    let is_video = remaining.contains("/videos");

    let base_url = if is_video {
        &state.config.video_service_url
    } else if is_content {
        &state.config.content_service_url
    } else {
        &state.config.space_service_url
    };

    let target_url = format!("{}{}", base_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 代理请求到用户服务
async fn proxy_to_user(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.user_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 用户路由分发：/contents → 内容服务, 其他 → 用户服务
async fn proxy_user_router(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path = req.uri().path();
    let base_url = if path.ends_with("/contents") {
        &state.config.content_service_url
    } else {
        &state.config.user_service_url
    };
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", base_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 代理请求到社区服务
async fn proxy_to_space(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.space_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 代理请求到内容服务
async fn proxy_to_content(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.content_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 代理请求到视频服务（大文件上传支持）
async fn proxy_to_video(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.video_service_url, path_and_query);
    proxy_request_with_limit(&state.client, &target_url, req, state.config.max_video_bytes).await
}

/// 代理请求到管理后台服务
async fn proxy_to_admin(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.admin_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 代理请求到聚合服务
async fn proxy_to_aggregate(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.aggregate_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req, state.config.max_upload_bytes).await
}

/// 通用代理转发（使用配置的 body limit）
async fn proxy_request(
    client: &reqwest::Client,
    target_url: &str,
    req: Request,
    limit_bytes: usize,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    proxy_request_with_limit(client, target_url, req, limit_bytes).await
}

/// 通用代理转发，支持自定义请求体大小限制
async fn proxy_request_with_limit(
    client: &reqwest::Client,
    target_url: &str,
    req: Request,
    limit_bytes: usize,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let method = req.method().clone();
    let original_headers = req.headers().clone();

    // 读取请求体（根据 limit_bytes 限制大小）
    let body_bytes = axum::body::to_bytes(req.into_body(), limit_bytes)
        .await
        .map_err(|e| {
            tracing::error!("Body read error (limit={}MB): {}", limit_bytes / 1024 / 1024, e);
            ERROR_COUNT.fetch_add(1, Ordering::Relaxed);
            (
                StatusCode::PAYLOAD_TOO_LARGE,
                Json(ApiResponse::error(1413, &format!("Request body exceeds {} MB limit", limit_bytes / 1024 / 1024))),
            )
        })?;

    // 构建转发 headers：剥离 hop-by-hop 和不应转发的 headers
    // RFC 7230: hop-by-hop headers 不应该被代理转发
    let mut fwd_headers = reqwest::header::HeaderMap::new();
    for (key, value) in original_headers.iter() {
        let lower = key.as_str().to_lowercase();
        // 剥离 hop-by-hop headers（由 reqwest 自行管理）
        if lower == "connection"
            || lower == "keep-alive"
            || lower == "proxy-authenticate"
            || lower == "proxy-authorization"
            || lower == "te"
            || lower == "trailer"
            || lower == "transfer-encoding"
            || lower == "upgrade"
            || lower == "host"
            || lower == "content-length"
        {
            continue;
        }
        fwd_headers.insert(key.clone(), value.clone());
    }

    tracing::debug!("Proxying {} to {} (body: {} bytes)", method, target_url, body_bytes.len());

    // 发送请求（带 1 次重试以应对瞬时连接故障）
    let mut last_error: Option<(StatusCode, Json<ApiResponse<()>>)> = None;
    for attempt in 0..2 {
        let proxy_req = client
            .request(method.clone(), target_url)
            .headers(fwd_headers.clone())
            .body(body_bytes.clone());

        match proxy_req.send().await {
            Ok(resp) => {
                let status = resp.status();
                let resp_headers = resp.headers().clone();
                let resp_body = resp.bytes().await.unwrap_or_default();

                let mut response = Response::new(axum::body::Body::from(resp_body));
                *response.status_mut() = status;
                for (key, value) in resp_headers.iter() {
                    // 剥离上游 CORS 头，由 gateway 统一设置
                    let lower = key.as_str().to_lowercase();
                    if lower == "transfer-encoding"
                        || lower == "content-encoding"
                        || lower.starts_with("access-control-")
                    {
                        continue;
                    }
                    response.headers_mut().insert(key.clone(), value.clone());
                }
                return Ok(response);
            }
            Err(e) => {
                let is_connect = e.is_connect();
                // 获取底层错误链以获得更详细的信息
                let mut source_detail = String::new();
                if let Some(src) = std::error::Error::source(&e) {
                    source_detail = format!(" | source: {}", src);
                }
                tracing::warn!("Proxy attempt {} failed: {} (is_connect={}, is_timeout={}, is_body={}, is_decode={}, url={}){}",
                    attempt + 1, e, is_connect, e.is_timeout(), e.is_body(), e.is_decode(), target_url, source_detail);
                last_error = Some((
                    StatusCode::BAD_GATEWAY,
                    Json(ApiResponse::error(1502, "Service temporarily unavailable")),
                ));
                // 仅对非连接错误重试（连接错误通常不是瞬时的）
                if is_connect { break; }
                if attempt == 0 {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                }
            }
        }
    }

    tracing::error!("Proxy failed after all retries for {}", target_url);
    ERROR_COUNT.fetch_add(1, Ordering::Relaxed);
    match last_error {
        Some(e) => Err(e),
        None => Err((
            StatusCode::BAD_GATEWAY,
            Json(ApiResponse::error(1502, "All backend services unreachable")),
        )),
    }
}
