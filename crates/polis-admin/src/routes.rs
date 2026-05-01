use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    middleware,
    routing::{get, post, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use polis_core::admin::*;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, PaginationParams};

use crate::admin_handler::AdminHandler;
use crate::admin_middleware::admin_auth;

#[derive(Deserialize)]
pub struct BanRequest {
    pub reason: String,
}

#[derive(Deserialize)]
pub struct VerifyRequest {
    pub verify_type: String, // "enterprise" | "personal"
}

pub fn admin_routes(handler: Arc<AdminHandler>) -> Router {
    let public = Router::new()
        .route("/api/admin/login", post(admin_login));

    let auth = Router::new()
        .route("/api/admin/stats", get(get_stats))
        .route("/api/admin/users", get(get_users))
        .route("/api/admin/users/{id}/ban", post(ban_user))
        .route("/api/admin/users/{id}/unban", post(unban_user))
        .route("/api/admin/users/{id}/verify", post(verify_user))
        .route("/api/admin/spaces", get(get_spaces))
        .route("/api/admin/spaces/{id}/archive", post(archive_space))
        .route("/api/admin/posts", get(get_posts))
        .route("/api/admin/posts/{id}/delete", post(delete_post))
        .route("/api/admin/posts/{id}/feature", post(feature_post))
        .route("/api/admin/posts/{id}/unfeature", post(unfeature_post))
        .route_layer(middleware::from_fn_with_state(handler.clone(), admin_auth));

    public.merge(auth).with_state(handler)
}

/// POST /api/admin/login - 管理员登录
async fn admin_login(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<AdminLoginRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    // 验证 admin_code
    if let Some(ref code) = req.admin_code {
        if code != &handler.config.admin_code {
            return Err(AppError::Unauthorized);
        }
    } else {
        return Err(AppError::Validation("Admin code required".to_string()));
    }

    // 查找用户
    use sqlx::Row;
    let user_row = sqlx::query(
        "SELECT id, username, display_name FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(&handler.pool)
    .await?
    .ok_or(AppError::NotFound("User not found".to_string()))?;

    let user_id: Uuid = user_row.get("id");
    let username: String = user_row.get("username");
    let display_name: String = user_row.get("display_name");

    // 生成 admin token
    let token = crate::auth::generate_admin_token(user_id, "admin", &handler.config)
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

    Ok(Json(ApiResponse::success(serde_json::json!({
        "access_token": token,
        "user": {
            "id": user_id,
            "username": username,
            "display_name": display_name,
        }
    }))))
}

async fn get_stats(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<PlatformStats>>, AppError> {
    let stats = handler.get_stats().await?;
    Ok(Json(ApiResponse::success(stats)))
}

async fn get_users(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let users = handler.get_users(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(users)))
}

async fn ban_user(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Json(req): Json<BanRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.ban_user(id, &req.reason).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unban_user(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unban_user(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn verify_user(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.verify_user(id, &req.verify_type).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_spaces(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let spaces = handler.get_spaces(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(spaces)))
}

async fn archive_space(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.archive_space(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_posts(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let posts = crate::stats::list_all_posts(&handler.pool, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(posts)))
}

async fn delete_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn feature_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.feature_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unfeature_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unfeature_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}
