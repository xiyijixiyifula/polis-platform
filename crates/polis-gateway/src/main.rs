use std::sync::Arc;

use axum::{
    extract::{Path, Request, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, get, Router},
    Json,
};
use polis_core::models::ApiResponse;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

use crate::config::GatewayConfig;

mod config;

/// API 网关状态
struct GatewayState {
    config: GatewayConfig,
    client: reqwest::Client,
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
            .timeout(std::time::Duration::from_secs(30))
            .build()?,
        config: config.clone(),
    });

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    // 路由
    let app = Router::new()
        // 代理路由 - 用户服务
        .route("/api/auth/{*path}", any(proxy_to_user))
        .route("/api/users/{*path}", any(proxy_to_user))
        .route("/api/follow", any(proxy_to_user))
        // 代理路由 - 社区 + 内容服务 (同一 catch-all, 按 path 分发)
        .route("/api/spaces", any(proxy_space_router))
        .route("/api/spaces/{*path}", any(proxy_space_router))
        // 代理路由 - 根社区
        .route("/api/root/{*path}", any(proxy_to_space))
        // 代理路由 - 内容服务 (帖子, 投票, 投票/问卷, 草稿, 通知, 书签列表, 公告)
        .route("/api/posts/{*path}", any(proxy_to_content))
        .route("/api/vote", any(proxy_to_content))
        .route("/api/polls", any(proxy_to_content))
        .route("/api/polls/{*path}", any(proxy_to_content))
        .route("/api/drafts", any(proxy_to_content))
        .route("/api/notifications", any(proxy_to_content))
        .route("/api/notifications/unread-count", any(proxy_to_content))
        .route("/api/notifications/read-all", any(proxy_to_content))
        .route("/api/bookmarks", any(proxy_to_content))
        // File sharing
        .route("/api/files/{*path}", any(proxy_to_content))
        .route("/api/share/{*path}", any(proxy_to_content))
        .route("/api/announcements/{*path}", any(proxy_to_content))
        // 代理路由 - 管理后台服务
        .route("/api/admin/{*path}", any(proxy_to_admin))
        .route("/api/admin", any(proxy_to_admin))
        // 健康检查
        .route("/health", get(health_check))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("API Gateway starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// 健康检查
async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("Polis API Gateway is running".to_string()))
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
    let is_content = remaining.contains("/posts") || remaining.contains("/featured") || remaining.contains("/bookmarks") || remaining.contains("/announcements") || remaining.contains("/polls") || remaining.contains("/files") || remaining.contains("/share");

    let base_url = if is_content {
        &state.config.content_service_url
    } else {
        &state.config.space_service_url
    };

    let target_url = format!("{}{}", base_url, path_and_query);
    proxy_request(&state.client, &target_url, req).await
}

/// 代理请求到用户服务
async fn proxy_to_user(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.user_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req).await
}

/// 代理请求到社区服务
async fn proxy_to_space(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.space_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req).await
}

/// 代理请求到内容服务
async fn proxy_to_content(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.content_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req).await
}

/// 代理请求到管理后台服务
async fn proxy_to_admin(
    State(state): State<Arc<GatewayState>>,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let path_and_query = req.uri().path_and_query().map(|pq| pq.as_str()).unwrap_or_else(|| req.uri().path());
    let target_url = format!("{}{}", state.config.admin_service_url, path_and_query);
    proxy_request(&state.client, &target_url, req).await
}

/// 通用代理转发
async fn proxy_request(
    client: &reqwest::Client,
    target_url: &str,
    req: Request,
) -> Result<Response, (StatusCode, Json<ApiResponse<()>>)> {
    let method = req.method().clone();
    let headers = req.headers().clone();

    // 读取请求体
    let body_bytes = axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024) // 10MB 限制
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(1400, "Failed to read request body")),
            )
        })?;

    // 构建代理请求
    let proxy_req = client
        .request(method, target_url)
        .headers(headers)
        .body(body_bytes);

    // 发送请求
    match proxy_req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let resp_headers = resp.headers().clone();
            let resp_body = resp.bytes().await.unwrap_or_default();

            let mut response = Response::new(axum::body::Body::from(resp_body));
            *response.status_mut() = status;
            for (key, value) in resp_headers.iter() {
                if key != "transfer-encoding" && key != "content-encoding" {
                    response.headers_mut().insert(key.clone(), value.clone());
                }
            }
            Ok(response)
        }
        Err(e) => {
            tracing::error!("Proxy error: {}", e);
            Err((
                StatusCode::BAD_GATEWAY,
                Json(ApiResponse::error(1502, &format!("Service unavailable: {}", e))),
            ))
        }
    }
}
