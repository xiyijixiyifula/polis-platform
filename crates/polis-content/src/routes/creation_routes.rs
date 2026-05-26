use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, patch, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{
    ApiResponse, CreateCreationRequest, ListCreationsQuery, ListModuleRefsQuery,
    ReviewRefRequest, SubmitToCommunityRequest, UpdateCreationRequest,
};
use crate::handlers::content_handler::ContentHandler;
use crate::handlers::creation::CreationHandler;

type JVal = ApiResponse<serde_json::Value>;
fn ok(d: serde_json::Value) -> Json<JVal> {
    Json(JVal { code: 0, message: "ok".to_string(), data: Some(d), pagination: None })
}
fn ok_str(s: &str) -> Json<JVal> { ok(serde_json::Value::String(s.to_string())) }

#[derive(Deserialize)]
struct Claims { sub: String }

fn extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth = match headers.get("Authorization").and_then(|v| v.to_str().ok()) {
        Some(h) => h, None => return Ok(None),
    };
    let token = match auth.strip_prefix("Bearer ") {
        Some(t) => t, None => return Ok(None),
    };
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set");
    match jsonwebtoken::decode::<Claims>(token, &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()), &jsonwebtoken::Validation::default()) {
        Ok(data) => Uuid::parse_str(&data.claims.sub).map(Some).map_err(|_| AppError::Forbidden("Invalid token".to_string())),
        Err(_) => Ok(None),
    }
}

fn require_user(headers: &HeaderMap) -> Result<Uuid, AppError> {
    extract_user_id(headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))
}

pub fn creation_routes() -> Router<Arc<ContentHandler>> {
    Router::new()
        // 创作数据 CRUD
        .route("/api/creations", get(list_my_creations).post(create_creation))
        .route("/api/creations/{id}", get(get_creation).put(update_creation).delete(delete_creation))
        // 投稿管理
        .route("/api/creations/{id}/submit", post(submit_to_community))
        .route("/api/creations/{id}/submissions", get(list_creation_submissions))
        // 社区模块引用
        .route("/api/module-refs/{ns}/{module_type}", get(list_module_refs))
        .route("/api/refs/{id}", patch(manage_ref).delete(withdraw_submission))
        // 引用地图：查看某个创作被哪些社区引用
        .route("/api/creations/{id}/refs", get(get_creation_refs))
}

fn make_handler(pool: &sqlx::PgPool) -> CreationHandler {
    CreationHandler::new(pool.clone())
}

// ===== 创作 CRUD =====

async fn create_creation(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateCreationRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let creation = make_handler(&h.pool).create_creation(uid, req).await?;
    Ok(ok(serde_json::to_value(creation).unwrap_or_default()))
}

async fn list_my_creations(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Query(q): Query<ListCreationsQuery>,
) -> Result<Json<JVal>, AppError> {
    // 公开访问：通过 creator_username 查询某用户的公开作品
    if q.creator_username.is_some() {
        let username = q.creator_username.clone().unwrap_or_default();
        let uid = extract_user_id(&headers)?;
        let (creations, pagination) = make_handler(&h.pool).list_user_public_creations(&username, q, uid).await?;
        return Ok(Json(JVal { code: 0, message: "ok".to_string(), data: Some(serde_json::to_value(creations).unwrap_or_default()), pagination: Some(pagination) }));
    }
    // 需要登录：查看自己的创作
    let uid = require_user(&headers)?;
    let (creations, pagination) = make_handler(&h.pool).list_my_creations(uid, q).await?;
    Ok(Json(JVal { code: 0, message: "ok".to_string(), data: Some(serde_json::to_value(creations).unwrap_or_default()), pagination: Some(pagination) }))
}

async fn get_creation(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?;
    let creation = make_handler(&h.pool).get_creation(id, uid).await?;
    Ok(ok(serde_json::to_value(creation).unwrap_or_default()))
}

async fn update_creation(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCreationRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let creation = make_handler(&h.pool).update_creation(id, uid, req).await?;
    Ok(ok(serde_json::to_value(creation).unwrap_or_default()))
}

async fn delete_creation(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    make_handler(&h.pool).delete_creation(id, uid).await?;
    Ok(ok_str("已删除"))
}

// ===== 投稿管理 =====

async fn submit_to_community(
    State(h): State<Arc<ContentHandler>>,
    Path(creation_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<SubmitToCommunityRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let module_ref = make_handler(&h.pool).submit_to_community(creation_id, uid, req).await?;

    // Webhook: content.submitted
    h.webhook.dispatch("content.submitted", serde_json::json!({
        "creation_id": module_ref.creation_id,
        "space_id": module_ref.space_id,
        "module_type": module_ref.module_type,
        "creator_id": uid,
    }), Some(module_ref.space_id));

    Ok(ok(serde_json::to_value(module_ref).unwrap_or_default()))
}

async fn withdraw_submission(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    make_handler(&h.pool).withdraw_submission(id, uid).await?;
    Ok(ok_str("已撤稿"))
}

async fn list_creation_submissions(
    State(h): State<Arc<ContentHandler>>,
    Path(creation_id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let subs = make_handler(&h.pool).list_creation_submissions(creation_id, uid).await?;
    Ok(ok(serde_json::to_value(subs).unwrap_or_default()))
}

// ===== 社区模块引用 =====

async fn list_module_refs(
    State(h): State<Arc<ContentHandler>>,
    Path((ns, module_type)): Path<(String, String)>,
    headers: HeaderMap,
    Query(q): Query<ListModuleRefsQuery>,
) -> Result<Json<JVal>, AppError> {
    let uid = extract_user_id(&headers)?;
    let (refs, pagination) = make_handler(&h.pool).list_module_refs(&ns, &module_type, q, uid).await?;
    Ok(Json(JVal { code: 0, message: "ok".to_string(), data: Some(serde_json::to_value(refs).unwrap_or_default()), pagination: Some(pagination) }))
}

async fn manage_ref(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReviewRefRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let module_ref = make_handler(&h.pool).manage_ref(id, uid, req).await?;
    Ok(ok(serde_json::to_value(module_ref).unwrap_or_default()))
}

/// GET /api/creations/{id}/refs — 引用地图：查看创作被哪些社区引用
async fn get_creation_refs(
    State(h): State<Arc<ContentHandler>>,
    Path(creation_id): Path<Uuid>,
) -> Result<Json<JVal>, AppError> {
    let refs = make_handler(&h.pool).get_creation_refs(creation_id).await?;
    Ok(ok(serde_json::to_value(refs).unwrap_or_default()))
}
