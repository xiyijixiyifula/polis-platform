use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user::UserPublic;
use crate::types::{MemberRole, SpaceStatus, Visibility};

// ==================== 社区 ====================

/// 社区模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Space {
    pub id: Uuid,
    pub namespace: String,
    pub slug: String,
    pub owner_id: Option<Uuid>,
    pub is_root: bool,
    pub root_space_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub visibility: String,
    pub status: String,
    pub custom_rules: serde_json::Value,
    pub enabled_modules: serde_json::Value,
    pub metadata: serde_json::Value,
    pub member_count: i64,
    pub post_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 社区公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpacePublic {
    pub id: Uuid,
    pub namespace: String,
    pub slug: String,
    pub owner_id: Option<Uuid>,
    pub is_root: bool,
    pub root_space_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub visibility: Visibility,
    pub status: SpaceStatus,
    pub member_count: i64,
    pub post_count: i64,
    pub follower_count: i64,
    pub star_count: i64,
    pub has_password: bool,
    pub created_at: DateTime<Utc>,
    pub level: Option<i32>,
    pub xp: Option<i32>,
}

impl From<Space> for SpacePublic {
    fn from(s: Space) -> Self {
        Self {
            id: s.id,
            namespace: s.namespace,
            slug: s.slug,
            owner_id: s.owner_id,
            is_root: s.is_root,
            root_space_id: s.root_space_id,
            title: s.title,
            description: s.description,
            icon_url: s.icon_url,
            banner_url: s.banner_url,
            visibility: serde_json::from_str(&format!("\"{}\"", s.visibility)).unwrap_or_default(),
            status: serde_json::from_str(&format!("\"{}\"", s.status)).unwrap_or_default(),
            member_count: s.member_count,
            post_count: s.post_count,
            follower_count: 0,
            star_count: 0,
            has_password: false,
            created_at: s.created_at,
            level: None,
            xp: None,
        }
    }
}

/// 创建社区请求
#[derive(Debug, Deserialize)]
pub struct CreateSpaceRequest {
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub visibility: Option<Visibility>,
}

/// 更新社区请求
#[derive(Debug, Deserialize)]
pub struct UpdateSpaceRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub visibility: Option<Visibility>,
    pub password: Option<String>,
    pub custom_rules: Option<serde_json::Value>,
}

// ==================== 自定义模块 ====================

/// 自定义模块 (DB 行)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SpaceModule {
    pub id: Uuid,
    pub space_id: Uuid,
    pub name: String,
    pub module_key: String,
    pub mode: String,
    pub allowed_content_types: serde_json::Value,
    pub icon: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// 自定义模块公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceModulePublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub name: String,
    pub module_key: String,
    pub mode: String,
    pub allowed_content_types: Vec<String>,
    pub icon: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

impl From<SpaceModule> for SpaceModulePublic {
    fn from(m: SpaceModule) -> Self {
        Self {
            id: m.id,
            space_id: m.space_id,
            name: m.name,
            module_key: m.module_key,
            mode: m.mode,
            allowed_content_types: serde_json::from_value(m.allowed_content_types).unwrap_or_default(),
            icon: m.icon,
            sort_order: m.sort_order,
            is_active: m.is_active,
            created_at: m.created_at,
        }
    }
}

/// 创建自定义模块请求
#[derive(Debug, Deserialize)]
pub struct CreateModuleRequest {
    pub name: String,
    pub module_key: Option<String>,
    pub mode: Option<String>,
    pub allowed_content_types: Option<Vec<String>>,
    pub icon: Option<String>,
}

/// 更新自定义模块请求
#[derive(Debug, Deserialize)]
pub struct UpdateModuleRequest {
    pub name: Option<String>,
    pub mode: Option<String>,
    pub allowed_content_types: Option<Vec<String>>,
    pub icon: Option<String>,
    pub is_active: Option<bool>,
}

// ==================== 付费社区（会员等级） ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SpaceTier {
    pub id: Uuid,
    pub space_id: Uuid,
    pub name: String,
    pub price_cents: i64,
    pub currency: String,
    pub description: String,
    pub benefits: serde_json::Value,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTierRequest {
    pub name: String,
    pub price_cents: i64,
    pub currency: Option<String>,
    pub description: Option<String>,
    pub benefits: Option<Vec<String>>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTierRequest {
    pub name: Option<String>,
    pub price_cents: Option<i64>,
    pub description: Option<String>,
    pub benefits: Option<Vec<String>>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subscription {
    pub id: Uuid,
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub tier_id: Uuid,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub auto_renew: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinPaidSpaceRequest {
    pub tier_id: Uuid,
}

// ==================== 成员关系 ====================

/// 成员关系模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Membership {
    pub id: Uuid,
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

/// 成员信息（含用户）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberInfo {
    pub user: UserPublic,
    pub role: MemberRole,
    pub joined_at: DateTime<Utc>,
}

// ==================== 模块管理者 ====================

/// 模块管理者
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ModuleModerator {
    pub id: Uuid,
    pub space_id: Uuid,
    pub module_type: String,
    pub user_id: Uuid,
    pub can_review: bool,
    pub can_hide: bool,
    pub can_pin: bool,
    pub can_manage_members: bool,
    pub can_edit_settings: bool,
    pub granted_by: Uuid,
    pub created_at: DateTime<Utc>,
}

/// 设置模块管理者请求
#[derive(Debug, Deserialize)]
pub struct SetModuleModeratorRequest {
    pub user_id: Uuid,
    pub module_type: String,
    pub can_review: Option<bool>,
    pub can_hide: Option<bool>,
    pub can_pin: Option<bool>,
    pub can_manage_members: Option<bool>,
    pub can_edit_settings: Option<bool>,
}

/// 封禁用户请求（模块管理者）
#[derive(Debug, Deserialize)]
pub struct BanFromModuleRequest {
    pub user_id: Uuid,
    pub module_type: String,
    pub reason: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

// ==================== 社区等级 ====================

/// 社区等级
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommunityLevel {
    pub id: Uuid,
    pub space_id: Uuid,
    pub level: i32,
    pub title: String,
    pub required_score: i32,
    pub perks: serde_json::Value,
}

/// 社区等级公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunityLevelPublic {
    pub level: i32,
    pub title: String,
    pub required_score: i32,
    pub perks: serde_json::Value,
    pub current_score: i32,
    pub progress_percent: f32,
}

/// 社区等级配置请求
#[derive(Debug, Deserialize)]
pub struct ConfigureLevelsRequest {
    pub levels: Vec<LevelConfig>,
}

#[derive(Debug, Deserialize)]
pub struct LevelConfig {
    pub level: i32,
    pub title: String,
    pub required_score: i32,
    pub perks: Option<serde_json::Value>,
}

// ==================== 经验日志 ====================

/// 经验日志
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommunityExpLog {
    pub id: Uuid,
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub action_type: String,
    pub exp_gained: i32,
    pub created_at: DateTime<Utc>,
}

// ==================== 社区 Agent ====================

/// 社区 Agent 注册
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SpaceAgent {
    pub id: Uuid,
    pub space_id: Uuid,
    pub agent_id: Uuid,
    pub registered_by: Uuid,
    pub is_active: bool,
    pub trigger_words: serde_json::Value,
    pub auto_trigger: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// 社区 Agent 公开信息（含 Agent 基础信息 + 社区配置）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceAgentPublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub agent: super::user::AgentPublic,
    pub trigger_words: Vec<String>,
    pub auto_trigger: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// 社区注册 Agent 请求
#[derive(Debug, Deserialize)]
pub struct RegisterSpaceAgentRequest {
    pub agent_id: Uuid,
    pub trigger_words: Option<Vec<String>>,
    pub auto_trigger: Option<serde_json::Value>,
}

// ==================== 社区活动系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommunityEvent {
    pub id: Uuid,
    pub space_id: Uuid,
    pub creator_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub event_type: String,
    pub start_at: DateTime<Utc>,
    pub end_at: Option<DateTime<Utc>>,
    pub max_participants: Option<i32>,
    pub rules: serde_json::Value,
    pub prizes: serde_json::Value,
    pub status: String,
    pub participant_count: i32,
    pub submission_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EventParticipant {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub submission_id: Option<Uuid>,
    pub status: String,
    pub registered_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub event_type: Option<String>,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub max_participants: Option<i32>,
    pub rules: Option<serde_json::Value>,
    pub prizes: Option<serde_json::Value>,
}

// ==================== 每周话题 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WeeklyTopic {
    pub id: Uuid,
    pub topic_key: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub topic_type: String,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub is_active: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWeeklyTopicRequest {
    pub topic_key: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub topic_type: Option<String>,
    pub end_at: Option<DateTime<Utc>>,
}
