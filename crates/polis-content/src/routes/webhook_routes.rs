use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, CreateWebhookRequest, UpdateWebhookRequest};
use crate::handlers::content_handler::ContentHandler;
use crate::handlers::webhook_handler::WebhookHandler;

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
        Ok(data) => Uuid::parse_str(&data.claims.sub).map(Some).map_err(|_| AppError::forbidden("Invalid token".to_string())),
        Err(_) => Ok(None),
    }
}

fn require_user(headers: &HeaderMap) -> Result<Uuid, AppError> {
    extract_user_id(headers)?.ok_or(AppError::forbidden("请先登录".to_string()))
}

use polis_core::auth::Claims;

#[derive(Deserialize)]
struct WebhookListQuery {
    space_id: Option<Uuid>,
}

#[derive(Deserialize)]
struct DeliveryQuery {
    page: Option<u32>,
    page_size: Option<u32>,
}

pub fn webhook_routes() -> Router<Arc<ContentHandler>> {
    Router::new()
        .route("/api/webhooks", get(list_webhooks).post(create_webhook))
        .route("/api/webhooks/{id}", put(update_webhook).delete(delete_webhook))
        .route("/api/webhooks/{id}/deliveries", get(list_deliveries))
}

async fn create_webhook(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateWebhookRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = WebhookHandler::new(h.pool.clone());
    let wh = handler.create(uid, req).await?;
    Ok(ok(serde_json::to_value(wh).unwrap_or_default()))
}

async fn list_webhooks(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Query(q): Query<WebhookListQuery>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = WebhookHandler::new(h.pool.clone());
    let webhooks = handler.list(uid, q.space_id).await?;
    Ok(ok(serde_json::to_value(webhooks).unwrap_or_default()))
}

async fn update_webhook(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateWebhookRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = WebhookHandler::new(h.pool.clone());
    let wh = handler.update(id, uid, req).await?;
    Ok(ok(serde_json::to_value(wh).unwrap_or_default()))
}

async fn delete_webhook(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = WebhookHandler::new(h.pool.clone());
    handler.delete(id, uid).await?;
    Ok(ok(serde_json::json!("已删除")))
}

async fn list_deliveries(
    State(h): State<Arc<ContentHandler>>,
    Path(webhook_id): Path<Uuid>,
    headers: HeaderMap,
    Query(q): Query<DeliveryQuery>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = WebhookHandler::new(h.pool.clone());
    let page = q.page.unwrap_or(1);
    let page_size = q.page_size.unwrap_or(20);
    let (deliveries, pagination) = handler.deliveries(webhook_id, uid, page, page_size).await?;
    Ok(Json(JVal {
        code: 0,
        message: "ok".to_string(),
        data: Some(serde_json::to_value(deliveries).unwrap_or_default()),
        pagination: Some(pagination),
    }))
}
