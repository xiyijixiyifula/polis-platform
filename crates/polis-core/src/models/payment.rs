use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== 打赏系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Tip {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub amount: i32,
    pub message: Option<String>,
    pub is_anonymous: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TipLeaderboard {
    pub user_id: Uuid,
    pub total_tips_received: i32,
    pub total_amount_received: i64,
    pub total_tips_sent: i32,
    pub weekly_amount: i64,
    pub monthly_amount: i64,
    pub all_time_amount: i64,
    pub weekly_rank: Option<i32>,
    pub monthly_rank: Option<i32>,
    pub all_time_rank: Option<i32>,
    pub last_updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTipRequest {
    pub target_type: Option<String>,
    pub target_id: Uuid,
    pub amount: Option<i32>,
    pub message: Option<String>,
    pub is_anonymous: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct TipLeaderboardEntry {
    pub user_id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub total_amount_received: i64,
    pub total_tips_received: i32,
    pub rank: i32,
}
