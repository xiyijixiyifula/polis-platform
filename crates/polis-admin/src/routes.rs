use std::sync::Arc;

use axum::{
    extract::{Extension, Path, Query, State},
    middleware,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use polis_core::admin::*;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, Pagination, PaginationParams};

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
        .route("/health", get(health_check))
        .route("/api/admin/login", post(admin_login));

    let auth = Router::new()
        .route("/api/admin/settings", get(get_settings))
        .route("/api/admin/settings/code", put(update_admin_code_handler))
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
        .route("/api/admin/posts/{id}/approve", post(approve_post))
        .route("/api/admin/posts/{id}/reject", post(reject_post))
        .route("/api/admin/posts/{id}/hide", post(hide_post))
        .route("/api/admin/posts/{id}/unhide", post(unhide_post))
        .route("/api/admin/reports", get(get_reports))
        .route("/api/admin/reports/{id}/resolve", post(resolve_report))
        .route("/api/admin/dashboard", get(get_dashboard))
        // Detail endpoints
        .route("/api/admin/users/{id}", get(get_user_detail))
        .route("/api/admin/spaces/{id}", get(get_space_detail))
        .route("/api/admin/posts/{id}", get(get_post_detail))
        .route("/api/admin/posts/{id}", delete(delete_post_handler))
        // Management endpoints
        .route("/api/admin/spaces/{id}/status", put(update_space_status))
        .route("/api/admin/transactions", get(get_transactions))
        .route("/api/admin/comments", get(get_comments))
        .route("/api/admin/comments/{id}", delete(delete_comment))
        // Analytics endpoints
        .route("/api/admin/analytics/users", get(get_user_analytics))
        .route("/api/admin/analytics/posts", get(get_post_analytics))
        .route_layer(middleware::from_fn_with_state(handler.clone(), admin_auth));

    public.merge(auth).with_state(handler)
}

/// POST /api/admin/login - 管理员登录
async fn admin_login(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<AdminLoginRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    // 验证 admin_code（运行时可变）
    if let Some(ref code) = req.admin_code {
        if code != &handler.get_admin_code() {
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

async fn approve_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.approve_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

#[derive(Deserialize)]
pub struct RejectRequest {
    pub reason: Option<String>,
}

async fn reject_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Json(body): Json<RejectRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.reject_post(id, body.reason.as_deref().unwrap_or("violation")).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn hide_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.hide_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unhide_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unhide_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

/// GET /api/admin/reports
async fn get_reports(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (reports, total) = handler.get_reports(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": reports, "total": total }),
        Pagination {
            page: params.page.unwrap_or(1),
            page_size: params.page_size.unwrap_or(20),
            total: total as u64,
            total_pages: ((total as f64) / (params.page_size.unwrap_or(20) as f64)).ceil() as u32,
        },
    )))
}

#[derive(Deserialize)]
pub struct ResolveReportRequest {
    pub action: String,
}

async fn resolve_report(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<ResolveReportRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.resolve_report(id, &req.action, user_id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_dashboard(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let data = handler.get_dashboard().await?;
    Ok(Json(ApiResponse::success(data)))
}

// ============================================================
// Detail endpoints
// ============================================================

async fn get_user_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let user = handler.get_user_detail(id).await?;
    Ok(Json(ApiResponse::success(user)))
}

async fn get_space_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let space = handler.get_space_detail(id).await?;
    Ok(Json(ApiResponse::success(space)))
}

async fn get_post_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let post = handler.get_post_detail(id).await?;
    Ok(Json(ApiResponse::success(post)))
}

// ============================================================
// Management endpoints
// ============================================================

/// DELETE /api/admin/posts/{id} - alternative to POST .../delete
async fn delete_post_handler(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_post(id).await?;
    Ok(Json(ApiResponse::success(())))
}

#[derive(Deserialize)]
pub struct UpdateSpaceStatusRequest {
    pub status: String,
}

async fn update_space_status(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSpaceStatusRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.update_space_status(id, &req.status).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_transactions(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (txs, total) = handler.get_transactions(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": txs, "total": total }),
        Pagination { page: params.page.unwrap_or(1), page_size: params.page_size.unwrap_or(20), total: total as u64, total_pages: ((total as f64) / (params.page_size.unwrap_or(20) as f64)).ceil() as u32 },
    )))
}

async fn get_comments(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (comments, total) = handler.get_comments(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": comments, "total": total }),
        Pagination { page: params.page.unwrap_or(1), page_size: params.page_size.unwrap_or(20), total: total as u64, total_pages: ((total as f64) / (params.page_size.unwrap_or(20) as f64)).ceil() as u32 },
    )))
}

async fn delete_comment(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_comment(id).await?;
    Ok(Json(ApiResponse::success(())))
}

// ============================================================
// Analytics endpoints
// ============================================================

#[derive(Deserialize)]
pub struct AnalyticsQuery {
    pub days: Option<i32>,
}

async fn get_user_analytics(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let data = handler.get_user_analytics(params.days.unwrap_or(30)).await?;
    Ok(Json(ApiResponse::success(data)))
}

async fn get_post_analytics(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let data = handler.get_post_analytics(params.days.unwrap_or(30)).await?;
    Ok(Json(ApiResponse::success(data)))
}



// ============================================================
// Settings endpoints
// ============================================================

/// GET /api/admin/settings - 获取当前设置
async fn get_settings() -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(serde_json::json!({
        "admin_email": "admin@polis.app",
        "admin_code_set": true,
    }))))
}

/// PUT /api/admin/settings/code - 更新管理验证码
#[derive(Deserialize)]
pub struct UpdateAdminCodeRequest {
    pub current_code: String,
    pub new_code: String,
}

async fn update_admin_code_handler(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<UpdateAdminCodeRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    // 验证当前密码
    if req.current_code != handler.get_admin_code() {
        return Err(AppError::Unauthorized);
    }
    // 更新
    handler.update_admin_code(&req.new_code)?;
    tracing::info!("Admin code updated via API");
    Ok(Json(ApiResponse::success(())))
}

async fn health_check(State(h): State<Arc<AdminHandler>>) -> Json<ApiResponse<serde_json::Value>> {
    let db_ok = sqlx::query("SELECT 1").fetch_one(&h.pool).await.is_ok();
    Json(ApiResponse::success(serde_json::json!({
        "service": "polis-admin",
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "version": env!("CARGO_PKG_VERSION"),
    })))
}
