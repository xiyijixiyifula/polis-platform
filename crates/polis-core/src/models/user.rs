use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== 用户 ====================

/// 用户模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub password_hash: String,
    pub avatar_url: Option<String>,
    pub bio: String,
    pub verified: bool,
    pub verified_type: Option<String>,
    pub notification_prefs: serde_json::Value,
    pub banned: bool,
    pub banned_at: Option<DateTime<Utc>>,
    pub ban_reason: Option<String>,
    pub chain_address: Option<String>,
    pub chain_bound_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 用户公开信息（返回给客户端时不包含敏感字段）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub bio: String,
    pub verified: bool,
    pub notification_prefs: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub total_likes: i64,
    pub post_count: i64,
}

impl From<User> for UserPublic {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            bio: u.bio,
            verified: u.verified,
            notification_prefs: u.notification_prefs,
            created_at: u.created_at,
            total_likes: 0,
            post_count: 0,
        }
    }
}

/// 注册请求
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    /// 可选，不填则默认使用用户名
    pub display_name: Option<String>,
    pub email: String,
    pub password: String,
}

/// 登录请求
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub remember_me: Option<bool>,
}

/// 登录响应
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserPublic,
}

/// 刷新 Token 请求
#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

/// 登出请求（可选携带 refresh_token 一并撤销）
#[derive(Debug, Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: Option<String>,
}

/// 更新用户资料请求
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub notification_prefs: Option<serde_json::Value>,
}

// ==================== 点赞 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Like {
    pub id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

// ==================== 关注 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Follow {
    pub id: Uuid,
    pub follower_id: Uuid,
    pub followee_type: String,
    pub followee_id: Uuid,
    pub created_at: DateTime<Utc>,
}

// ==================== 用户经验值与等级系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserXp {
    pub user_id: Uuid,
    pub total_xp: i64,
    pub current_level: i32,
    pub daily_xp: i32,
    pub daily_xp_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserXpPublic {
    pub user_id: Uuid,
    pub total_xp: i64,
    pub current_level: i32,
    pub level_title: String,
    pub level_icon: String,
    pub xp_to_next_level: i64,
    pub daily_xp: i32,
    pub daily_xp_limit: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserXpLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub action_type: String,
    pub xp_gained: i32,
    pub description: String,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserLevel {
    pub level: i32,
    pub title: String,
    pub icon: String,
    pub required_xp: i64,
    pub perks: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct XpConfig {
    pub id: Uuid,
    pub action_type: String,
    pub xp_amount: i32,
    pub daily_limit: i32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XpAction {
    pub action: String,
    pub label: String,
    pub xp: i32,
}

/// 每日登录请求
#[derive(Debug, Deserialize)]
pub struct DailyLoginRequest {
    pub bonus_code: Option<String>,
}

/// 每日登录响应
#[derive(Debug, Serialize)]
pub struct DailyLoginResponse {
    pub xp_gained: i32,
    pub streak_days: i32,
    pub total_xp: i64,
    pub current_level: i32,
}

// ==================== 新手任务系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OnboardingQuest {
    #[sqlx(default)]
    pub id: Uuid,
    pub quest_key: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub xp_reward: i32,
    pub sort_order: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserQuest {
    pub id: Uuid,
    pub user_id: Uuid,
    pub quest_key: String,
    pub is_completed: bool,
    pub is_claimed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub claimed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserQuestPublic {
    pub quest_key: String,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub xp_reward: i32,
    pub is_completed: bool,
    pub is_claimed: bool,
}

/// 新手任务完成请求
#[derive(Debug, Deserialize)]
pub struct CompleteQuestRequest {
    pub quest_key: String,
}

// ==================== 徽章系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserBadge {
    pub id: Uuid,
    pub user_id: Uuid,
    pub badge_key: String,
    pub badge_name: String,
    pub badge_icon: String,
    pub badge_description: String,
    #[sqlx(rename = "awarded_at")]
    pub earned_at: DateTime<Utc>,
}

// ==================== 邀请系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InviteCode {
    pub id: Uuid,
    pub code: String,
    pub inviter_id: Uuid,
    pub invitee_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub redeemed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InviteReward {
    pub id: Uuid,
    pub inviter_id: Uuid,
    pub invitee_id: Uuid,
    pub reward_type: String,
    pub xp_amount: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct InviteInfo {
    pub code: String,
    pub invite_url: String,
    pub total_invited: i64,
    pub total_rewards_xp: i64,
    pub invitees: Vec<UserPublic>,
}

/// 兑换邀请码请求
#[derive(Debug, Deserialize)]
pub struct RedeemInviteRequest {
    pub code: String,
}

// ==================== Push 通知订阅 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PushSubscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub endpoint: String,
    pub p256dh_key: String,
    pub auth_key: String,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct PushSubscribeRequest {
    pub endpoint: String,
    pub p256dh_key: String,
    pub auth_key: String,
    pub user_agent: Option<String>,
}

// ==================== Agent 身份系统 ====================

/// Agent 扩展信息
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub user_id: Uuid,
    pub owner_user_id: Uuid,
    pub agent_type: String,
    pub capabilities: serde_json::Value,
    pub api_key_hash: Option<String>,
    pub api_key_prefix: Option<String>,
    pub is_active: bool,
    pub status: String,
    pub last_active_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Agent 公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPublic {
    pub id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub display_name: String,
    pub agent_type: String,
    pub capabilities: Vec<String>,
    pub is_active: bool,
    pub status: String,
    pub last_active_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// 注册 Agent 请求
#[derive(Debug, Deserialize)]
pub struct RegisterAgentRequest {
    pub username: String,
    pub display_name: String,
    pub agent_type: String,
    pub capabilities: Vec<String>,
    pub password: String, // Agent 登录密码（可选，优先用 API Key）
}

/// Agent API Key 登录请求
#[derive(Debug, Deserialize)]
pub struct AgentApiKeyLoginRequest {
    pub agent_id: Uuid,
    pub api_key: String,
}

/// Agent JWT 登录请求
#[derive(Debug, Deserialize)]
pub struct AgentLoginRequest {
    pub username: String,
    pub password: String,
}

/// Agent 设置状态请求
#[derive(Debug, Deserialize)]
pub struct UpdateAgentStatusRequest {
    pub status: String,
}

// ==================== 创作者认证与排行榜 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CreatorCertification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub cert_type: String,
    pub cert_level: i32,
    pub cert_reason: Option<String>,
    pub certified_by: Option<Uuid>,
    pub is_active: bool,
    pub certified_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CreatorScore {
    pub user_id: Uuid,
    pub total_posts: i32,
    pub total_likes_received: i32,
    pub total_comments_received: i32,
    pub total_views: i64,
    pub total_tips_received: i32,
    pub total_followers: i32,
    pub weekly_score: i64,
    pub monthly_score: i64,
    pub all_time_score: i64,
    pub weekly_rank: Option<i32>,
    pub monthly_rank: Option<i32>,
    pub all_time_rank: Option<i32>,
    pub last_calculated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub score: i64,
    pub rank: i32,
    pub total_posts: i32,
    pub total_likes_received: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateCertificationRequest {
    pub user_id: Uuid,
    pub cert_type: String,
    pub cert_level: Option<i32>,
    pub cert_reason: Option<String>,
}
