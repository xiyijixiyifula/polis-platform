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
use polis_core::models::{
    ApiResponse, Pagination, PaginationParams,
    ReviewQueueQuery, BatchReviewRequest, AgentAdminLoginRequest,
    CreateReviewRuleRequest, AuditLogQuery, AgentReviewRequest,
};

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
        .route("/api/admin/login", post(admin_login))
        .route("/api/admin/agent/login", post(agent_admin_login));

    let auth = Router::new()
        // 设置
        .route("/api/admin/settings", get(get_settings))
        .route("/api/admin/settings/code", put(update_admin_code_handler))
        .route("/api/admin/settings/platform", get(get_platform_settings).put(update_platform_settings))
        // 统计 & 仪表盘
        .route("/api/admin/stats", get(get_stats))
        .route("/api/admin/dashboard", get(get_dashboard))
        // 用户管理
        .route("/api/admin/users", get(get_users))
        .route("/api/admin/users/{id}", get(get_user_detail))
        .route("/api/admin/users/{id}/ban", post(ban_user))
        .route("/api/admin/users/{id}/unban", post(unban_user))
        .route("/api/admin/users/{id}/verify", post(verify_user))
        .route("/api/admin/users/{id}/hide-works", post(hide_user_works))
        .route("/api/admin/users/{id}/hide-spaces", post(hide_user_spaces))
        // 社区管理
        .route("/api/admin/spaces", get(get_spaces))
        .route("/api/admin/spaces/{id}", get(get_space_detail))
        .route("/api/admin/spaces/{id}/archive", post(archive_space))
        .route("/api/admin/spaces/{id}/status", put(update_space_status))
        // 帖子管理
        .route("/api/admin/posts", get(get_posts))
        .route("/api/admin/posts/{id}", get(get_post_detail))
        .route("/api/admin/posts/{id}", delete(delete_post_handler))
        .route("/api/admin/posts/{id}/delete", post(delete_post))
        .route("/api/admin/posts/{id}/feature", post(feature_post))
        .route("/api/admin/posts/{id}/unfeature", post(unfeature_post))
        .route("/api/admin/posts/{id}/approve", post(approve_post))
        .route("/api/admin/posts/{id}/reject", post(reject_post))
        .route("/api/admin/posts/{id}/hide", post(hide_post))
        .route("/api/admin/posts/{id}/unhide", post(unhide_post))
        // 举报管理
        .route("/api/admin/reports", get(get_reports))
        .route("/api/admin/reports/{id}/resolve", post(resolve_report))
        // 审核队列 & 批量操作
        .route("/api/admin/review-queue", get(get_review_queue))
        .route("/api/admin/review-queue/batch", post(batch_review))
        // 审核规则
        .route("/api/admin/review-rules", get(list_review_rules).post(create_review_rule))
        .route("/api/admin/review-rules/{id}", put(update_review_rule).delete(delete_review_rule))
        .route("/api/admin/review-rules/{id}/toggle", post(toggle_review_rule))
        // Agent 审查 API
        .route("/api/admin/agent/policy", get(get_agent_policy))
        .route("/api/admin/agent/new-content", get(get_agent_new_content))
        .route("/api/admin/agent/review", post(agent_review))
        .route("/api/admin/agent/stats", get(get_agent_stats))
        // 审计日志
        .route("/api/admin/audit-logs", get(get_audit_logs))
        // 跨社区引用管理
        .route("/api/admin/refs", get(list_refs))
        .route("/api/admin/refs/{id}/review", post(review_ref))
        // 评论 & 交易
        .route("/api/admin/comments", get(get_comments))
        .route("/api/admin/comments/{id}", delete(delete_comment))
        .route("/api/admin/transactions", get(get_transactions))
        // 分析
        .route("/api/admin/analytics/users", get(get_user_analytics))
        .route("/api/admin/analytics/posts", get(get_post_analytics))
        .route_layer(middleware::from_fn_with_state(handler.clone(), admin_auth));

    public.merge(auth).with_state(handler)
}

// ============================================================
// 公共路由（无需鉴权）
// ============================================================

/// POST /api/admin/login - 人类管理员登录
async fn admin_login(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<AdminLoginRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    if let Some(ref code) = req.admin_code {
        if code != &handler.get_admin_code() {
            return Err(AppError::Unauthorized);
        }
    } else {
        return Err(AppError::Validation("Admin code required".to_string()));
    }

    use sqlx::Row;
    let user_row = sqlx::query(
        "SELECT id, username, display_name, password_hash FROM users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(&handler.pool)
    .await?
    .ok_or(AppError::NotFound("User not found".to_string()))?;

    let user_id: Uuid = user_row.get("id");
    let username: String = user_row.get("username");
    let display_name: String = user_row.get("display_name");
    let password_hash: String = user_row.get("password_hash");

    let pwd = req.password.clone();
    let hash = password_hash.clone();
    tokio::task::spawn_blocking(move || {
        use argon2::{
            password_hash::{PasswordHash, PasswordVerifier},
            Argon2,
        };
        let parsed_hash = PasswordHash::new(&hash)
            .map_err(|e| AppError::Internal(format!("Password hash error: {}", e)))?;
        Argon2::default().verify_password(pwd.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)
    }).await.map_err(|e| AppError::Internal(e.to_string()))??;

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

/// POST /api/admin/agent/login - AI Agent 管理员登录
async fn agent_admin_login(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<AgentAdminLoginRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let token = handler.agent_admin_login(req).await?;
    Ok(Json(ApiResponse::success(serde_json::json!({
        "access_token": token,
        "user_type": "agent",
    }))))
}

// ============================================================
// 统计数据
// ============================================================

async fn get_stats(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<PlatformStats>>, AppError> {
    let stats = handler.get_stats().await?;
    Ok(Json(ApiResponse::success(stats)))
}

async fn get_dashboard(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let data = handler.get_dashboard().await?;
    Ok(Json(ApiResponse::success(data)))
}

// ============================================================
// 用户管理
// ============================================================

async fn get_users(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let users = handler.get_users(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(users)))
}

async fn get_user_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let user = handler.get_user_detail(id).await?;
    Ok(Json(ApiResponse::success(user)))
}

async fn ban_user(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<BanRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.ban_user(admin_id, id, &req.reason).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unban_user(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unban_user(admin_id, id).await?;
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

#[derive(Deserialize)]
pub struct HideWorksRequest {
    pub reason: String,
    pub duration_hours: Option<i32>,
}

async fn hide_user_works(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<HideWorksRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.hide_user_works(admin_id, id, &req.reason, req.duration_hours).await?;
    Ok(Json(ApiResponse::success(result)))
}

#[derive(Deserialize)]
pub struct HideSpacesRequest {
    pub reason: String,
}

async fn hide_user_spaces(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<HideSpacesRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let count = handler.hide_user_spaces(admin_id, id, &req.reason).await?;
    Ok(Json(ApiResponse::success(serde_json::json!({"spaces_hidden": count}))))
}

// ============================================================
// 社区管理
// ============================================================

async fn get_spaces(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let spaces = handler.get_spaces(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(spaces)))
}

async fn get_space_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let space = handler.get_space_detail(id).await?;
    Ok(Json(ApiResponse::success(space)))
}

async fn archive_space(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.archive_space(admin_id, id).await?;
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

// ============================================================
// 帖子管理
// ============================================================

async fn get_posts(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let posts = crate::stats::list_all_posts(&handler.pool, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(posts)))
}

async fn get_post_detail(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let post = handler.get_post_detail(id).await?;
    Ok(Json(ApiResponse::success(post)))
}

async fn delete_post_handler(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn delete_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn feature_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.feature_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unfeature_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unfeature_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn approve_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.approve_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

#[derive(Deserialize)]
pub struct RejectRequest {
    pub reason: Option<String>,
}

async fn reject_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(body): Json<RejectRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.reject_post(admin_id, id, body.reason.as_deref().unwrap_or("violation")).await?;
    Ok(Json(ApiResponse::success(())))
}

#[derive(Deserialize)]
pub struct HideRequest {
    pub duration_hours: Option<i32>,
}

async fn hide_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<HideRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.hide_post(admin_id, id, req.duration_hours).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unhide_post(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.unhide_post(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

// ============================================================
// 举报管理（增强版：支持联动审核）
// ============================================================

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
    /// 对举报目标执行的联动操作（可选）
    pub target_action: Option<String>,
    /// 联动操作的原因
    pub target_action_reason: Option<String>,
}

async fn resolve_report(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Extension(role): Extension<String>,
    Json(req): Json<ResolveReportRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.resolve_report_with_action(
        id,
        &req.action,
        req.target_action.as_deref(),
        req.target_action_reason.as_deref(),
        admin_id,
        &role,
    ).await?;
    Ok(Json(ApiResponse::success(result)))
}

// ============================================================
// 审核队列 & 批量操作
// ============================================================

#[derive(Deserialize)]
pub struct ReviewQueueQueryParams {
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub queue_type: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

async fn get_review_queue(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<ReviewQueueQueryParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let query = ReviewQueueQuery {
        status: params.status,
        r#type: params.queue_type,
        page: params.page,
        page_size: params.page_size,
    };
    let (items, total) = handler.get_review_queue(query).await?;
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(50);
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": items, "total": total }),
        Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        },
    )))
}

async fn batch_review(
    State(handler): State<Arc<AdminHandler>>,
    Extension(admin_id): Extension<Uuid>,
    Extension(role): Extension<String>,
    Json(req): Json<BatchReviewRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.batch_review(admin_id, &role, req).await?;
    Ok(Json(ApiResponse::success(result)))
}

// ============================================================
// 审核规则
// ============================================================

async fn list_review_rules(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let rules = handler.list_review_rules().await?;
    Ok(Json(ApiResponse::success(rules)))
}

async fn create_review_rule(
    State(handler): State<Arc<AdminHandler>>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<CreateReviewRuleRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let rule = handler.create_review_rule(admin_id, req).await?;
    Ok(Json(ApiResponse::success(rule)))
}

#[derive(Deserialize)]
pub struct ToggleRuleRequest {
    pub is_active: bool,
}

async fn toggle_review_rule(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Json(req): Json<ToggleRuleRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.toggle_review_rule(id, req.is_active).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn update_review_rule(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<CreateReviewRuleRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.update_review_rule(admin_id, id, req).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn delete_review_rule(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_review_rule(admin_id, id).await?;
    Ok(Json(ApiResponse::success(())))
}

// ============================================================
// 审计日志
// ============================================================

#[derive(Deserialize)]
pub struct AuditLogQueryParams {
    pub actor_id: Option<Uuid>,
    pub target_type: Option<String>,
    pub action: Option<String>,
    pub actor_type: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

async fn get_audit_logs(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<AuditLogQueryParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let query = AuditLogQuery {
        actor_id: params.actor_id,
        target_type: params.target_type,
        action: params.action,
        actor_type: params.actor_type,
        page: params.page,
        page_size: params.page_size,
    };
    let (items, total) = handler.get_audit_logs(query).await?;
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(50);
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": items, "total": total }),
        Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        },
    )))
}

// ============================================================
// 跨社区引用管理
// ============================================================

#[derive(Deserialize)]
pub struct ListRefsQuery {
    pub status: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

async fn list_refs(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<ListRefsQuery>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (items, total) = handler.list_refs(
        params.status.as_deref(),
        params.page.unwrap_or(1),
        params.page_size.unwrap_or(50),
    ).await?;
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(50);
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": items, "total": total }),
        Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        },
    )))
}

#[derive(Deserialize)]
pub struct ReviewRefRequest {
    pub action: String,
}

async fn review_ref(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<ReviewRefRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.review_ref(admin_id, id, &req.action).await?;
    Ok(Json(ApiResponse::success(())))
}

// ============================================================
// 评论 & 交易
// ============================================================

async fn get_comments(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (comments, total) = handler.get_comments(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": comments, "total": total }),
        Pagination {
            page: params.page.unwrap_or(1),
            page_size: params.page_size.unwrap_or(20),
            total: total as u64,
            total_pages: ((total as f64) / (params.page_size.unwrap_or(20) as f64)).ceil() as u32,
        },
    )))
}

async fn delete_comment(
    State(handler): State<Arc<AdminHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.delete_comment(id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_transactions(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (txs, total) = handler.get_transactions(params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": txs, "total": total }),
        Pagination {
            page: params.page.unwrap_or(1),
            page_size: params.page_size.unwrap_or(20),
            total: total as u64,
            total_pages: ((total as f64) / (params.page_size.unwrap_or(20) as f64)).ceil() as u32,
        },
    )))
}

// ============================================================
// 分析
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
// 设置
// ============================================================

async fn get_settings() -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(serde_json::json!({
        "admin_email": "admin@polis.app",
        "admin_code_set": true,
    }))))
}

#[derive(Deserialize)]
pub struct UpdateAdminCodeRequest {
    pub current_code: String,
    pub new_code: String,
}

async fn update_admin_code_handler(
    State(handler): State<Arc<AdminHandler>>,
    Json(req): Json<UpdateAdminCodeRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    if req.current_code != handler.get_admin_code() {
        return Err(AppError::Validation("当前验证码不正确".to_string()));
    }
    handler.update_admin_code(&req.new_code)?;
    tracing::info!("Admin code updated via API");
    Ok(Json(ApiResponse::success(())))
}

async fn get_platform_settings(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let settings = handler.get_platform_settings().await?;
    Ok(Json(ApiResponse::success(settings)))
}

async fn update_platform_settings(
    State(handler): State<Arc<AdminHandler>>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let map = body.as_object()
        .ok_or_else(|| AppError::Validation("请求体必须是 JSON 对象".to_string()))?
        .clone();
    handler.update_platform_settings(map).await?;
    Ok(Json(ApiResponse::success(())))
}

// ============================================================
// Agent 审查 API
// ============================================================

async fn get_agent_policy(
    State(handler): State<Arc<AdminHandler>>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let policy = handler.get_agent_policy().await?;
    Ok(Json(ApiResponse::success(policy)))
}

#[derive(Deserialize)]
pub struct AgentNewContentQuery {
    pub hours: Option<i32>,
    pub space_id: Option<Uuid>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

async fn get_agent_new_content(
    State(handler): State<Arc<AdminHandler>>,
    Query(params): Query<AgentNewContentQuery>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let (items, total) = handler.get_agent_new_content(
        params.hours.unwrap_or(24),
        params.space_id,
        params.limit.unwrap_or(100),
        params.offset.unwrap_or(0),
    ).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": items, "total": total }),
        Pagination {
            page: 1,
            page_size: params.limit.unwrap_or(100) as u32,
            total: total as u64,
            total_pages: 1,
        },
    )))
}

async fn agent_review(
    State(handler): State<Arc<AdminHandler>>,
    Extension(admin_id): Extension<Uuid>,
    Json(req): Json<AgentReviewRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.agent_review(admin_id, req.decisions).await?;
    Ok(Json(ApiResponse::success(result)))
}

async fn get_agent_stats(
    State(handler): State<Arc<AdminHandler>>,
    Extension(admin_id): Extension<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let stats = handler.get_agent_stats(admin_id).await?;
    Ok(Json(ApiResponse::success(stats)))
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
