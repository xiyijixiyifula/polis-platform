use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{
    ApiResponse, CreateThreadRequest, AddThreadMessageRequest, PublishThreadRequest,
};
use crate::handlers::content_handler::ContentHandler;
use crate::handlers::thread_handler::ThreadHandler;

type JVal = ApiResponse<serde_json::Value>;
fn ok(d: serde_json::Value) -> Json<JVal> {
    Json(JVal { code: 0, message: "ok".to_string(), data: Some(d), pagination: None })
}

fn extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth = match headers.get("Authorization").and_then(|v| v.to_str().ok()) {
        Some(h) => h, None => return Ok(None),
    };
    let token = match auth.strip_prefix("Bearer ") {
        Some(t) => t, None => return Ok(None),
    };
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set");
    match jsonwebtoken::decode::<Claims>(token, &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()), &polis_core::auth::secure_validation()) {
        Ok(data) => Uuid::parse_str(&data.claims.sub).map(Some).map_err(|_| AppError::Forbidden("Invalid token".to_string())),
        Err(_) => Ok(None),
    }
}

fn require_user(headers: &HeaderMap) -> Result<Uuid, AppError> {
    extract_user_id(headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))
}

use polis_core::auth::Claims;

#[derive(Deserialize)]
struct PageQuery { page: Option<u32>, page_size: Option<u32> }

pub fn thread_routes() -> Router<Arc<ContentHandler>> {
    Router::new()
        .route("/api/threads", get(list_my_threads).post(create_thread))
        .route("/api/threads/{id}", get(get_thread))
        .route("/api/threads/{id}/messages", get(get_messages).post(add_message))
        .route("/api/threads/{id}/publish", post(publish_thread))
        .route("/api/threads/{id}/archive", post(archive_thread))
}

async fn create_thread(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateThreadRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    let thread = handler.create(uid, req).await?;
    Ok(ok(serde_json::to_value(thread).unwrap_or_default()))
}

async fn list_my_threads(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Query(q): Query<PageQuery>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    let page = q.page.unwrap_or(1);
    let page_size = q.page_size.unwrap_or(20);
    let (threads, pagination) = handler.list_mine(uid, page, page_size).await?;
    Ok(Json(JVal {
        code: 0, message: "ok".to_string(),
        data: Some(serde_json::to_value(threads).unwrap_or_default()),
        pagination: Some(pagination),
    }))
}

async fn get_thread(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    let thread = handler.get(id, uid).await?;
    Ok(ok(serde_json::to_value(thread).unwrap_or_default()))
}

async fn get_messages(
    State(h): State<Arc<ContentHandler>>,
    Path(thread_id): Path<Uuid>,
) -> Result<Json<JVal>, AppError> {
    let handler = ThreadHandler::new(h.pool.clone());
    let msgs = handler.messages(thread_id).await?;
    Ok(ok(serde_json::to_value(msgs).unwrap_or_default()))
}

async fn add_message(
    State(h): State<Arc<ContentHandler>>,
    Path(thread_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<AddThreadMessageRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    let msg = handler.add_message(uid, thread_id, req).await?;
    Ok(ok(serde_json::to_value(msg).unwrap_or_default()))
}

async fn publish_thread(
    State(h): State<Arc<ContentHandler>>,
    Path(thread_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<PublishThreadRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    let result = handler.publish(uid, thread_id, req).await?;
    Ok(ok(result))
}

async fn archive_thread(
    State(h): State<Arc<ContentHandler>>,
    Path(thread_id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = ThreadHandler::new(h.pool.clone());
    handler.archive(thread_id, uid).await?;
    Ok(ok(serde_json::json!("已归档")))
}
