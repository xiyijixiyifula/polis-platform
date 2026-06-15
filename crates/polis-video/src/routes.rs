use std::sync::Arc;
use axum::{
    extract::{Extension, Multipart, Path, Query, State},
    http::HeaderMap,
    middleware,
    routing::{get, post, put},
    Json, Router,
};
use jsonwebtoken::{decode, DecodingKey};
use serde::Deserialize;
use tower_http::services::ServeDir;
use uuid::Uuid;
use polis_core::auth::Claims;
use polis_core::error::AppError;
use polis_core::models::ApiResponse;
use crate::handler::VideoHandler;
use crate::middleware::auth::auth_middleware;
use crate::models::{CreateVideoCommentRequest, PublishRequest, ReviewVideoRequest, SetPasswordRequest, UpdateVideoRequest};

type JVal = ApiResponse<serde_json::Value>;

fn ok(d: serde_json::Value) -> Json<JVal> { Json(JVal { code: 0, message: "ok".to_string(), data: Some(d), pagination: None }) }
fn ok_str(s: &str) -> Json<JVal> { ok(serde_json::Value::String(s.to_string())) }

/// 尝试从请求头中提取用户 ID（可选认证）
/// - 无 Authorization 头或非 Bearer → Ok(None)
/// - token 无效或过期 → Ok(None)（不报错，视为未登录）
/// - token 有效 → Ok(Some(uid))
fn maybe_extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth_header = match headers.get("Authorization").and_then(|v| v.to_str().ok()) {
        Some(h) => h,
        None => return Ok(None),
    };
    let token = match auth_header.strip_prefix("Bearer ") {
        Some(t) => t,
        None => return Ok(None),
    };
    let secret = std::env::var("JWT_SECRET")
        .map_err(|_| AppError::internal("JWT_SECRET environment variable must be set".to_string()))?;
    match decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &polis_core::auth::secure_validation()) {
        Ok(data) => {
            match Uuid::parse_str(&data.claims.sub) {
                Ok(uid) => Ok(Some(uid)),
                Err(_) => Ok(None),
            }
        }
        Err(_) => Ok(None),
    }
}

// ===== Query params =====

#[derive(Deserialize)]
struct PageQuery { page: Option<i64>, page_size: Option<i64> }

#[derive(Deserialize)]
struct ShareQuery { password: Option<String> }

fn page_params(q: PageQuery) -> (i64, i64) {
    (q.page.unwrap_or(1).max(1), q.page_size.unwrap_or(20).clamp(1, 100))
}

// ===== Space path parser =====

enum SpaceAction { List, GetVideo(Uuid), Review(Uuid) }

fn parse_space_path(path: &str) -> Result<(String, SpaceAction), AppError> {
    let rem = path.strip_prefix("/api/spaces/").unwrap_or("");
    let pos = rem.find("/videos").ok_or(AppError::not_found("Invalid path".to_string()))?;
    let ns_raw = &rem[..pos];
    let ns = percent_encoding::percent_decode_str(ns_raw).decode_utf8()
        .map_err(|_| AppError::validation("Invalid UTF-8 in namespace".to_string()))?
        .to_string()
        .replace('~', "/");
    if ns.is_empty() { return Err(AppError::not_found("Missing namespace".to_string())); }

    let after = &rem[pos + 7..].trim_start_matches('/');
    if after.is_empty() {
        return Ok((ns, SpaceAction::List));
    }
    if let Some(rest) = after.strip_suffix("/review").or_else(|| after.strip_suffix("/review/")) {
        let vid = Uuid::parse_str(rest).map_err(|_| AppError::validation("Invalid video ID".to_string()))?;
        return Ok((ns, SpaceAction::Review(vid)));
    }
    let vid = Uuid::parse_str(after).map_err(|_| AppError::validation("Invalid video ID".to_string()))?;
    Ok((ns, SpaceAction::GetVideo(vid)))
}

// ===== Router =====

pub fn video_routes(handler: Arc<VideoHandler>) -> Router {
    let public = Router::new()
        .route("/health", get(health_check))
        // === 视频本体（公开读取 + 可选认证）===
        .route("/api/videos/{id}", get(get_video))
        // === 互动（公开读取）===
        .route("/api/videos/{id}/comments", get(get_comments))
        // === 分享码 ===
        .route("/api/videos/share/{code}", get(get_by_share))
        // === 社区上下文（公开读取）===
        .route("/api/spaces/{*path}", get(space_get))
        .nest_service("/hls", ServeDir::new(&handler.config.hls_output_path));

    let auth = Router::new()
        // === 视频本体 CRUD（需认证）===
        .route("/api/videos", get(list_my_videos).post(upload_video))
        .route("/api/videos/{id}", put(update_video).delete(delete_video))
        // === 发布 & 分享 ===
        .route("/api/videos/{id}/publish", post(publish_to_spaces))
        .route("/api/videos/{id}/password", post(set_password))
        // === 互动（需认证）===
        .route("/api/videos/{id}/like", post(toggle_like))
        .route("/api/videos/{id}/bookmark", post(toggle_bookmark))
        .route("/api/videos/{id}/comments", post(create_comment))
        // === 社区上下文（需认证的 POST）===
        .route("/api/spaces/{*path}", post(space_post))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware));

    public.merge(auth)
        // 视频上传需要支持大文件（使用配置值 + 50MB buffer）
        .layer(axum::extract::DefaultBodyLimit::max((handler.config.max_file_size_mb + 50) as usize * 1024 * 1024))
        .with_state(handler)
}

// ================================================================
// 视频本体路由（需认证）
// ================================================================

/// POST /api/videos — 上传视频 (multipart/form-data)
async fn upload_video(State(h): State<Arc<VideoHandler>>, Extension(uid): Extension<Uuid>, mut multipart: Multipart) -> Result<Json<JVal>, AppError> {
    let mut title = String::from("未命名");
    let mut desc = String::new();
    let mut vis = String::from("public");
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::validation(format!("读取表单字段失败: {}", e)))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                filename = field.file_name().unwrap_or("video.mp4").to_string();
                let data = field.bytes().await.map_err(|e| AppError::validation(format!("读取文件数据失败: {}", e)))?;
                if data.len() > (h.config.max_file_size_mb as usize) * 1024 * 1024 {
                    return Err(AppError::validation(format!("文件大小超过{}MB限制", h.config.max_file_size_mb)));
                }
                file_data = Some(data.to_vec());
            }
            "title" => { title = field.text().await.unwrap_or_default(); }
            "description" => { desc = field.text().await.unwrap_or_default(); }
            "visibility" => { vis = field.text().await.unwrap_or_default(); }
            _ => {}
        }
    }

    let data = file_data.ok_or(AppError::validation("请选择视频文件".to_string()))?;
    let ext = std::path::Path::new(&filename).extension()
        .and_then(|e| e.to_str()).unwrap_or("mp4").to_string();

    let result = h.upload_video(uid, &title, &desc, &data, &ext, &vis).await?;
    Ok(ok(result))
}

/// GET /api/videos — 我的视频列表（创作中心）
async fn list_my_videos(State(h): State<Arc<VideoHandler>>, Extension(uid): Extension<Uuid>, Query(q): Query<PageQuery>) -> Result<Json<JVal>, AppError> {
    let (page, psize) = page_params(q);
    let videos = h.list_my_videos(uid, page, psize).await?;
    Ok(ok(serde_json::to_value(videos).unwrap_or_default()))
}

/// PUT /api/videos/{id} — 编辑视频
async fn update_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>, Json(data): Json<UpdateVideoRequest>) -> Result<Json<JVal>, AppError> {
    h.update_video(id, uid, data).await?;
    Ok(ok_str("视频已更新"))
}

/// DELETE /api/videos/{id} — 删除视频
async fn delete_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>) -> Result<Json<JVal>, AppError> {
    h.delete_video(id, uid).await?;
    Ok(ok_str("视频已删除"))
}

// ================================================================
// 发布 & 分享
// ================================================================

/// POST /api/videos/{id}/publish — 发布到社区
async fn publish_to_spaces(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>, Json(data): Json<PublishRequest>) -> Result<Json<JVal>, AppError> {
    h.publish_to_spaces(id, uid, data).await?;
    Ok(ok_str("已提交到社区"))
}

/// POST /api/videos/{id}/password — 设置分享密码
async fn set_password(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>, Json(data): Json<SetPasswordRequest>) -> Result<Json<JVal>, AppError> {
    h.set_share_password(id, uid, data).await?;
    Ok(ok_str("密码已设置"))
}

// ================================================================
// 互动
// ================================================================

/// POST /api/videos/{id}/like — 切换点赞
async fn toggle_like(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>) -> Result<Json<JVal>, AppError> {
    let liked = h.toggle_like(id, uid).await?;
    Ok(ok(serde_json::json!({"liked": liked})))
}

/// POST /api/videos/{id}/bookmark — 切换收藏
async fn toggle_bookmark(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>) -> Result<Json<JVal>, AppError> {
    let bookmarked = h.toggle_bookmark(id, uid).await?;
    Ok(ok(serde_json::json!({"bookmarked": bookmarked})))
}

/// GET /api/videos/{id}/comments — 评论列表（公开）
async fn get_comments(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>) -> Result<Json<JVal>, AppError> {
    let cs = h.get_comments(id).await?;
    Ok(ok(serde_json::to_value(cs).unwrap_or_default()))
}

/// POST /api/videos/{id}/comments — 创建评论
async fn create_comment(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, Extension(uid): Extension<Uuid>, Json(data): Json<CreateVideoCommentRequest>) -> Result<Json<JVal>, AppError> {
    let comment = h.create_comment(id, uid, data).await?;
    Ok(ok(serde_json::to_value(comment).unwrap_or_default()))
}

// ================================================================
// 公开路由（可选认证）
// ================================================================

/// GET /api/videos/{id} — 视频详情（可选认证）
async fn get_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap) -> Result<Json<JVal>, AppError> {
    let uid = maybe_extract_user_id(&headers)?;
    let v = h.get_video(id, uid).await?;
    Ok(ok(serde_json::to_value(v).unwrap_or_default()))
}

/// GET /api/videos/share/{code}?password=xxx — 通过分享码查看视频（可选认证）
async fn get_by_share(State(h): State<Arc<VideoHandler>>, Path(code): Path<String>, headers: HeaderMap, Query(q): Query<ShareQuery>) -> Result<Json<JVal>, AppError> {
    let uid = maybe_extract_user_id(&headers)?;
    let v = h.get_video_by_share_code(&code, uid, q.password.as_deref()).await?;
    Ok(ok(serde_json::to_value(v).unwrap_or_default()))
}

// ================================================================
// 社区上下文路由（catch-all）
// ================================================================

/// GET /api/spaces/{ns}/videos[/{id}] — 社区视频列表 / 视频详情（可选认证）
async fn space_get(State(h): State<Arc<VideoHandler>>, Path(path): Path<String>, headers: HeaderMap, Query(q): Query<PageQuery>) -> Result<Json<JVal>, AppError> {
    let full_path = format!("/api/spaces/{}", path);
    let (ns, action) = parse_space_path(&full_path)?;
    match action {
        SpaceAction::List => {
            let (page, psize) = page_params(q);
            let uid = maybe_extract_user_id(&headers)?;
            let videos = h.list_space_videos(&ns, uid, page, psize).await?;
            Ok(ok(serde_json::to_value(videos).unwrap_or_default()))
        }
        SpaceAction::GetVideo(vid) => {
            let uid = maybe_extract_user_id(&headers)?;
            let v = h.get_video_in_space(vid, &ns, uid).await?;
            Ok(ok(serde_json::to_value(v).unwrap_or_default()))
        }
        SpaceAction::Review(_) => Err(AppError::validation("Use POST for review".to_string())),
    }
}

/// POST /api/spaces/{ns}/videos/{id}/review — 社区内审核
async fn space_post(State(h): State<Arc<VideoHandler>>, Path(path): Path<String>, Extension(uid): Extension<Uuid>, Json(data): Json<ReviewVideoRequest>) -> Result<Json<JVal>, AppError> {
    let full_path = format!("/api/spaces/{}", path);
    let (ns, action) = parse_space_path(&full_path)?;
    match action {
        SpaceAction::Review(vid) => {
            h.review_in_space(&ns, vid, uid, data).await?;
            Ok(ok_str("审核完成"))
        }
        _ => Err(AppError::not_found("Unknown action".to_string())),
    }
}

// ================================================================
// Health
// ================================================================

async fn health_check(State(h): State<Arc<VideoHandler>>) -> Json<JVal> {
    let db_ok = sqlx::query("SELECT 1").fetch_one(&h.repo.pool).await.is_ok();
    ok(serde_json::json!({
        "service": "polis-video",
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
