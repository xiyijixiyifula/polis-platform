use std::sync::Arc;
use axum::{extract::State, Extension, Json};
use chrono::Utc;
use serde::Serialize;
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::{ApiResponse, CreatorScore, Follow, InviteCode, UserBadge, UserQuest, UserXpLog};
use crate::handlers::user_handler::UserHandler;

#[derive(Serialize)]
pub struct ExportData {
    pub exported_at: String,
    pub user: serde_json::Value,
    pub follows: Vec<Follow>,
    pub xp_logs: Vec<UserXpLog>,
    pub badges: Vec<UserBadge>,
    pub quests: Vec<UserQuest>,
    pub creator_score: Option<CreatorScore>,
    pub push_subscriptions: Vec<serde_json::Value>,
    pub invite_codes: Vec<InviteCode>,
}

pub async fn export_my_data(
    State(h): State<Arc<UserHandler>>,
    Extension(uid): Extension<Uuid>,
) -> Result<Json<ApiResponse<ExportData>>, AppError> {
    tracing::info!("User {} requested data export", uid);

    let user = h
        .repo
        .find_by_id(uid)
        .await?
        .ok_or(AppError::not_found("User not found"))?;

    let user_json = serde_json::json!({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "verified": user.verified,
        "verified_type": user.verified_type,
        "notification_prefs": user.notification_prefs,
        "banned": user.banned,
        "banned_at": user.banned_at,
        "ban_reason": user.ban_reason,
        "chain_address": user.chain_address,
        "chain_bound_at": user.chain_bound_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    });

    let follows = h.repo.find_user_follows(uid).await?;
    let xp_logs = h.repo.find_user_xp_logs_all(uid, 10000).await?;
    let badges = h.repo.get_user_badges(uid).await?;
    let quests = h.repo.get_user_quests(uid).await?;
    let creator_score = h.repo.find_creator_score(uid).await?;

    let raw_subs = h.repo.get_push_subscriptions(uid).await?;
    let push_subscriptions: Vec<serde_json::Value> = raw_subs
        .into_iter()
        .map(|(endpoint, _p256dh, _auth)| serde_json::json!({ "endpoint": endpoint }))
        .collect();

    let invite_codes = h.repo.get_user_invite_codes(uid).await?;

    let export = ExportData {
        exported_at: Utc::now().to_rfc3339(),
        user: user_json,
        follows,
        xp_logs,
        badges,
        quests,
        creator_score,
        push_subscriptions,
        invite_codes,
    };

    tracing::info!("Data export completed for user {}", uid);
    Ok(Json(ApiResponse::success(export)))
}
