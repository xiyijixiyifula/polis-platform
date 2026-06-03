use std::sync::Arc;
use axum::{extract::{Path, State}, middleware, routing::{get, post, put}, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, LoginRequest, LoginResponse, RegisterRequest, UpdateUserRequest, UserPublic, PushSubscribeRequest, RedeemInviteRequest, CompleteQuestRequest};
use crate::handlers::user_handler::UserHandler;
use crate::middleware::auth::auth_middleware;

#[derive(Deserialize)]
pub struct ChangePasswordRequest { pub old_password: String, pub new_password: String }
#[derive(Deserialize)]
pub struct ForgotPasswordRequest { pub email: String }
#[derive(Deserialize)]
pub struct ResetPasswordRequest { pub token: String, pub new_password: String }
#[derive(Deserialize)]
pub struct FollowRequest { pub followee_type: String, pub followee_id: Uuid }
#[derive(Deserialize)]
pub struct AppealRequest { pub email: String, pub reason: String }
#[derive(Deserialize)]
pub struct BanStatusQuery { pub email: String }

pub fn user_routes(handler: Arc<UserHandler>) -> Router {
    let public = Router::new()
        .route("/health", get(health_check))
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/forgot-password", post(forgot_password))
        .route("/api/auth/reset-password", post(reset_password))
        .route("/api/users/search", get(search_users))
        .route("/api/users/{username}", get(get_user_profile))
        .route("/api/users/{username}/spaces", get(get_user_spaces))
        .route("/api/users/{username}/followers", get(get_followers))
        .route("/api/users/{username}/following", get(get_following))
        .route("/api/user/ban-status", get(ban_status))
        .route("/api/user/appeal", post(submit_appeal))
        // XP bridge (跨服务内部调用，无需认证)
        .route("/api/internal/xp/award", post(award_xp_bridge));
    let auth = Router::new()
        .route("/api/users/me", get(get_my_profile).put(update_profile))
        .route("/api/users/me/password", put(change_password))
        .route("/api/users/me/settings", put(update_settings))
        .route("/api/follow", post(toggle_follow))
        // RESTful 风格 API 别名 (v0.3.22)
        .route("/api/users/{username}/follow", post(follow_by_username).delete(unfollow_by_username))
        .route("/api/contacts/mutual", get(get_mutual_contacts))
        .route("/api/auth/logout", post(logout))
        // XP 系统
        .route("/api/users/me/xp", get(get_my_xp))
        .route("/api/users/me/xp/logs", get(get_my_xp_logs))
        .route("/api/users/me/daily-login", post(daily_login))
        // 新手任务
        .route("/api/users/me/onboarding", get(get_onboarding))
        .route("/api/users/me/onboarding/complete", post(complete_quest))
        .route("/api/users/me/onboarding/claim", post(claim_quest))
        // 徽章
        .route("/api/users/me/badges", get(get_my_badges))
        // 邀请
        .route("/api/users/me/invites", get(get_invites).post(create_invite))
        .route("/api/auth/redeem-invite", post(redeem_invite))
        // Push
        .route("/api/users/me/push-subscribe", post(subscribe_push))
        .route("/api/users/me/push-unsubscribe", post(unsubscribe_push))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware));
    public.merge(auth).with_state(handler)
}

async fn register(State(h): State<Arc<UserHandler>>, Json(r): Json<RegisterRequest>) -> Result<Json<ApiResponse<LoginResponse>>, AppError> {
    Ok(Json(ApiResponse::success(h.register(r).await?)))
}
async fn login(State(h): State<Arc<UserHandler>>, Json(r): Json<LoginRequest>) -> Result<Json<ApiResponse<LoginResponse>>, AppError> {
    Ok(Json(ApiResponse::success(h.login(r).await?)))
}
async fn get_user_profile(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_user_profile(&u).await?)))
}
async fn get_user_spaces(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_user_spaces(&u).await?)))
}
async fn update_profile(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<UpdateUserRequest>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.update_profile(uid, r).await?)))
}
async fn get_my_profile(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_my_profile(uid).await?)))
}
async fn change_password(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<ChangePasswordRequest>) -> Result<Json<ApiResponse<()>>, AppError> {
    h.change_password(uid, &r.old_password, &r.new_password).await?;
    Ok(Json(ApiResponse::success(())))
}
async fn forgot_password(State(h): State<Arc<UserHandler>>, Json(r): Json<ForgotPasswordRequest>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let token = h.generate_reset_token(&r.email).await?;
    tracing::info!("Password reset token generated for {}: {}", r.email, token);
    Ok(Json(ApiResponse::success(serde_json::json!({
        "message": "如果该邮箱已注册，密码重置链接已发送",
    }))))
}

async fn reset_password(State(h): State<Arc<UserHandler>>, Json(r): Json<ResetPasswordRequest>) -> Result<Json<ApiResponse<()>>, AppError> {
    h.reset_password(&r.token, &r.new_password).await?;
    Ok(Json(ApiResponse::success(())))
}
async fn update_settings(State(_h): State<Arc<UserHandler>>, axum::Extension(_uid): axum::Extension<Uuid>, Json(_r): Json<serde_json::Value>) -> Result<Json<ApiResponse<()>>, AppError> {
    // Settings stored as JSON in user metadata (for future)
    Ok(Json(ApiResponse::success(())))
}
async fn toggle_follow(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<FollowRequest>) -> Result<Json<ApiResponse<bool>>, AppError> {
    Ok(Json(ApiResponse::success(h.toggle_follow(uid, &r.followee_type, r.followee_id).await?)))
}
async fn get_followers(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_followers(&u).await?)))
}
async fn get_following(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_following(&u).await?)))
}

#[derive(Deserialize)]
struct SearchUsersQuery { q: String, #[serde(default = "default_limit")] limit: u32 }
fn default_limit() -> u32 { 20 }

async fn search_users(State(h): State<Arc<UserHandler>>, axum::extract::Query(q): axum::extract::Query<SearchUsersQuery>) -> Result<Json<ApiResponse<Vec<UserPublic>>>, AppError> {
    Ok(Json(ApiResponse::success(h.search_users(&q.q, q.limit).await?)))
}

async fn health_check(State(h): State<Arc<UserHandler>>) -> Json<ApiResponse<serde_json::Value>> {
    let db_ok = sqlx::query("SELECT 1").fetch_one(&h.repo.pool).await.is_ok();
    Json(ApiResponse::success(serde_json::json!({
        "service": "polis-user",
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "version": env!("CARGO_PKG_VERSION"),
    })))
}

// ===== RESTful 风格 API 别名 (v0.3.22) =====

/// POST /api/users/{username}/follow — RESTful 关注用户
async fn follow_by_username(
    State(h): State<Arc<UserHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(username): Path<String>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let target = h.repo.find_by_username(&username).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;
    if target.id == uid {
        return Err(AppError::Validation("Cannot follow yourself".to_string()));
    }
    let followed = h.toggle_follow(uid, "user", target.id).await?;
    Ok(Json(ApiResponse::success(followed)))
}

/// DELETE /api/users/{username}/follow — RESTful 取消关注用户
async fn unfollow_by_username(
    State(h): State<Arc<UserHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(username): Path<String>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let target = h.repo.find_by_username(&username).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;
    let followed = h.toggle_follow(uid, "user", target.id).await?;
    Ok(Json(ApiResponse::success(followed)))
}

/// POST /api/auth/logout — 登出
async fn logout() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("logged_out".to_string()))
}

/// GET /api/contacts/mutual — 互相关注的联系人（微信式通讯录）
async fn get_mutual_contacts(
    State(h): State<Arc<UserHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_mutual_contacts(uid).await?)))
}

/// GET /api/user/ban-status?email=xxx — 查询封禁状态（公开端点）
async fn ban_status(
    State(h): State<Arc<UserHandler>>,
    axum::extract::Query(q): axum::extract::Query<BanStatusQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match h.get_ban_status(&q.email).await {
        Ok(status) => Json(ApiResponse::success(status)),
        Err(_) => Json(ApiResponse::success(serde_json::json!({
            "banned": false,
            "ban_reason": null,
            "banned_at": null,
        }))),
    }
}

/// POST /api/user/appeal — 提交账号申诉（公开端点）
async fn submit_appeal(
    State(h): State<Arc<UserHandler>>,
    Json(r): Json<AppealRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    h.submit_appeal(&r.email, &r.reason).await?;
    Ok(Json(ApiResponse::success(serde_json::json!({
        "message": "申诉已提交，管理员将在1-3个工作日内审核",
    }))))
}

// ==================== XP 系统 handlers ====================

async fn get_my_xp(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_user_xp(uid).await?)))
}

async fn get_my_xp_logs(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_xp_logs(uid).await?)))
}

async fn daily_login(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.daily_login(uid).await?)))
}

async fn get_onboarding(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_onboarding_status(uid).await?)))
}

async fn complete_quest(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<CompleteQuestRequest>) -> Result<Json<ApiResponse<bool>>, AppError> {
    Ok(Json(ApiResponse::success(h.complete_onboarding_quest(uid, &r.quest_key).await?)))
}

async fn claim_quest(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<CompleteQuestRequest>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.claim_quest_reward(uid, &r.quest_key).await?)))
}

async fn get_my_badges(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_badges(uid).await?)))
}

async fn get_invites(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.create_invite(uid).await?)))
}

async fn create_invite(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.create_invite(uid).await?)))
}

async fn redeem_invite(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<RedeemInviteRequest>) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    Ok(Json(ApiResponse::success(h.redeem_invite(uid, &r.code).await?)))
}

async fn subscribe_push(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<PushSubscribeRequest>) -> Result<Json<ApiResponse<()>>, AppError> {
    h.subscribe_push(uid, r).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn unsubscribe_push(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<serde_json::Value>) -> Result<Json<ApiResponse<()>>, AppError> {
    let endpoint = r.get("endpoint").and_then(|v| v.as_str()).unwrap_or("");
    h.unsubscribe_push(uid, endpoint).await?;
    Ok(Json(ApiResponse::success(())))
}

/// POST /api/internal/xp/award — 跨服务 XP bridge
#[derive(Deserialize)]
struct AwardXpRequest {
    user_id: Uuid,
    action_type: String,
    description: String,
    target_type: Option<String>,
    target_id: Option<Uuid>,
}
async fn award_xp_bridge(State(h): State<Arc<UserHandler>>, Json(r): Json<AwardXpRequest>) -> Result<Json<ApiResponse<()>>, AppError> {
    h.award_xp_bridge(r.user_id, &r.action_type, &r.description, r.target_type.as_deref(), r.target_id).await?;
    Ok(Json(ApiResponse::success(())))
}
