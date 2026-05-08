use std::sync::Arc;
use axum::{extract::{Query, State}, middleware, routing::{get, post}, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, PaginationParams};
use crate::handler::NotifyHandler;
use crate::auth_mw::auth_middleware;

#[derive(Deserialize)]
pub struct MarkReadRequest { pub notification_id: Uuid }

pub fn notify_routes(handler: Arc<NotifyHandler>) -> Router {
    Router::new()
        .route("/api/notifications", get(get_notifications))
        .route("/api/notifications/unread-count", get(get_unread_count))
        .route("/api/notifications/read", post(mark_read))
        .route("/api/notifications/read-all", post(mark_all_read))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware))
        .with_state(handler)
}

async fn get_notifications(
    State(handler): State<Arc<NotifyHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    Query(params): Query<PaginationParams>,
    Query(unread): Query<Option<String>>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let unread_only = unread.as_deref().unwrap_or("") == "true";
    let notifs = handler.get_notifications(user_id, params.page.unwrap_or(1), params.page_size.unwrap_or(20), unread_only).await?;
    Ok(Json(ApiResponse::success(notifs)))
}

async fn get_unread_count(
    State(handler): State<Arc<NotifyHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
) -> Result<Json<ApiResponse<i64>>, AppError> {
    let count = handler.get_unread_count(user_id).await?;
    Ok(Json(ApiResponse::success(count)))
}

async fn mark_read(
    State(handler): State<Arc<NotifyHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.mark_read(req.notification_id, user_id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn mark_all_read(
    State(handler): State<Arc<NotifyHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.mark_all_read(user_id).await?;
    Ok(Json(ApiResponse::success(())))
}
