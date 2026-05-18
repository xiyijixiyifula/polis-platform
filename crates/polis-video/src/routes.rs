use std::sync::Arc;
use axum::{extract::{Path, Request, State}, http::HeaderMap, routing::{get, post}, Json, Router};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use tower_http::services::ServeDir;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::ApiResponse;
use polis_core::resolver::resolve::resolve_space_id;
use crate::handler::VideoHandler;
use crate::models::{CreateVideoCommentRequest, ReviewVideoRequest, UpdateVideoRequest};

#[derive(Deserialize)] struct Claims { sub: String }
type JVal = ApiResponse<serde_json::Value>;

fn ok(d: serde_json::Value) -> Json<JVal> { Json(JVal { code: 0, message: "ok".to_string(), data: Some(d), pagination: None }) }
fn ok_str(s: &str) -> Json<JVal> { ok(serde_json::Value::String(s.to_string())) }

fn extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth = match headers.get("Authorization").and_then(|v| v.to_str().ok()) {
        Some(h) => h, None => return Ok(None),
    };
    let token = match auth.strip_prefix("Bearer ") {
        Some(t) => t, None => return Ok(None),
    };
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());
    match decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default()) {
        Ok(data) => Uuid::parse_str(&data.claims.sub).map(Some).map_err(|_| AppError::Forbidden("Invalid token".to_string())),
        Err(_) => Ok(None),
    }
}

fn parse_path(path: &str) -> Result<(String, Option<Uuid>), AppError> {
    let rem = path.strip_prefix("/api/spaces/").unwrap_or("");
    let pos = rem.find("/videos").ok_or(AppError::NotFound("Invalid path".to_string()))?;
    let ns_raw = &rem[..pos];
    let ns = percent_encoding::percent_decode_str(ns_raw).decode_utf8()
        .map_err(|_| AppError::Validation("Invalid UTF-8 in namespace".to_string()))?
        .to_string()
        .replace('~', "/");
    if ns.is_empty() { return Err(AppError::NotFound("Missing namespace".to_string())); }
    let after = &rem[pos + 7..].trim_start_matches('/');
    let vid = if after.is_empty() { None }
        else { Some(Uuid::parse_str(after).map_err(|_| AppError::Validation("Invalid video ID".to_string()))?) };
    Ok((ns, vid))
}

fn parse_list_query(q: Option<&str>) -> (i64, i64) {
    let get = |key: &str| q.and_then(|s| s.split('&').find(|p| p.starts_with(&format!("{}=",key)))
        .and_then(|p| p.split('=').nth(1)).and_then(|v| v.parse().ok()));
    (get("page").unwrap_or(1), get("page_size").unwrap_or(20).min(100))
}

pub fn video_routes(handler: Arc<VideoHandler>) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/spaces/{*path}", get(handle_public).post(handle_post).put(handle_put).delete(handle_del))
        .route("/api/videos/{id}", get(get_video).put(update_video).delete(delete_video))
        .route("/api/videos/{id}/review", post(review))
        .route("/api/videos/{id}/like", post(like_video))
        .route("/api/videos/{id}/comments", get(get_comments).post(create_comment))
        .route("/api/videos/share/{code}", get(get_by_share))
        .nest_service("/hls", ServeDir::new(&handler.config.hls_output_path))
        .with_state(handler)
}

async fn handle_public(State(h): State<Arc<VideoHandler>>, req: Request) -> Result<Json<JVal>, AppError> {
    let path = req.uri().path().to_string();
    let (ns, vid) = parse_path(&path)?;
    let sid = resolve_space_id(&h.repo.pool, &ns).await?;
    if let Some(id) = vid {
        let uid = extract_user_id(req.headers())?;
        let v = h.get_video(id, uid).await?;
        Ok(ok(serde_json::to_value(v).unwrap_or_default()))
    } else {
        let (page, psize) = parse_list_query(req.uri().query());
        let uid = extract_user_id(req.headers())?;
        let videos = h.list_videos(sid, uid, page, psize).await?;
        Ok(ok(serde_json::to_value(videos).unwrap_or_default()))
    }
}

async fn handle_post(State(h): State<Arc<VideoHandler>>, req: Request) -> Result<Json<JVal>, AppError> {
    let path = req.uri().path().to_string();
    let (ns, _) = parse_path(&path)?;
    let sid = resolve_space_id(&h.repo.pool, &ns).await?;
    let uid = extract_user_id(req.headers())?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    let body = axum::body::to_bytes(req.into_body(), 600*1024*1024).await
        .map_err(|_| AppError::Validation("读取请求体失败".to_string()))?;
    let v: serde_json::Value = serde_json::from_slice(&body).map_err(|e| AppError::Validation(format!("JSON错误: {}", e)))?;
    let title = v["title"].as_str().unwrap_or("未命名");
    let desc = v["description"].as_str().unwrap_or("");
    let vis = v["visibility"].as_str().unwrap_or("public");
    let ext = v["extension"].as_str().unwrap_or("mp4");
    let b64 = v["file_data"].as_str().ok_or(AppError::Validation("缺少 file_data".to_string()))?;
    use base64::Engine;
    let data = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| AppError::Validation(format!("Base64: {}", e)))?;
    let result = h.upload_video(sid, uid, title, desc, &data, ext, vis).await?;
    Ok(ok(result))
}

async fn handle_put(State(h): State<Arc<VideoHandler>>, req: Request) -> Result<Json<JVal>, AppError> {
    let path = req.uri().path().to_string();
    let (ns, vid) = parse_path(&path)?;
    let _sid = resolve_space_id(&h.repo.pool, &ns).await?;
    let uid = extract_user_id(req.headers())?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    let id = vid.ok_or(AppError::NotFound("缺少视频ID".to_string()))?;
    let body = axum::body::to_bytes(req.into_body(), 1024*1024).await
        .map_err(|_| AppError::Validation("读取请求体失败".to_string()))?;
    let data: UpdateVideoRequest = serde_json::from_slice(&body).map_err(|e| AppError::Validation(format!("JSON: {}", e)))?;
    h.update_video(id, uid, data).await?;
    Ok(ok_str("视频已更新"))
}

async fn handle_del(State(h): State<Arc<VideoHandler>>, req: Request) -> Result<Json<JVal>, AppError> {
    let path = req.uri().path().to_string();
    let (ns, vid) = parse_path(&path)?;
    let _sid = resolve_space_id(&h.repo.pool, &ns).await?;
    let uid = extract_user_id(req.headers())?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    let id = vid.ok_or(AppError::NotFound("缺少视频ID".to_string()))?;
    h.delete_video(id, uid).await?;
    Ok(ok_str("视频已删除"))
}

async fn get_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?;
    let v = h.get_video(id, uid).await?;
    Ok(ok(serde_json::to_value(v).unwrap_or_default()))
}

async fn update_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap, Json(data): Json<UpdateVideoRequest>) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    h.update_video(id, uid, data).await?;
    Ok(ok_str("视频已更新"))
}

async fn delete_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    h.delete_video(id, uid).await?;
    Ok(ok_str("视频已删除"))
}

async fn review(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap, Json(data): Json<ReviewVideoRequest>) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    h.review_video(id, uid, data).await?;
    Ok(ok_str("审核完成"))
}

async fn like_video(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    let liked = h.toggle_like(id, uid).await?;
    Ok(ok(serde_json::json!({"liked": liked})))
}

async fn get_comments(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>) -> Result<Json<JVal>, AppError> {
    let cs = h.get_comments(id).await?;
    Ok(ok(serde_json::to_value(cs).unwrap_or_default()))
}

async fn create_comment(State(h): State<Arc<VideoHandler>>, Path(id): Path<Uuid>, headers: HeaderMap, Json(data): Json<CreateVideoCommentRequest>) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))?;
    let comment = h.create_comment(id, uid, data).await?;
    Ok(ok(serde_json::to_value(comment).unwrap_or_default()))
}

async fn get_by_share(State(h): State<Arc<VideoHandler>>, Path(code): Path<String>, headers: HeaderMap) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?;
    let v = h.get_video_by_share_code(&code, uid).await?;
    Ok(ok(serde_json::to_value(v).unwrap_or_default()))
}

async fn health_check() -> Json<JVal> { ok_str("Video service is running") }
