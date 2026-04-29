//! 管理后台共享模型
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 管理员角色
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AdminRole {
    SuperAdmin,  // 超级管理员 - 所有权限
    Admin,       // 管理员 - 大多数权限
    Moderator,   // 审核员 - 内容审核权限
}

impl AdminRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SuperAdmin => "super_admin",
            Self::Admin => "admin",
            Self::Moderator => "moderator",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "super_admin" => Some(Self::SuperAdmin),
            "admin" => Some(Self::Admin),
            "moderator" => Some(Self::Moderator),
            _ => None,
        }
    }
}

/// 管理员账号
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Admin {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub permissions: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 管理员登录请求
#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub email: String,
    pub password: String,
    pub admin_code: Option<String>, // 管理员专用验证码
}

/// 平台统计概览
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformStats {
    pub total_users: i64,
    pub total_spaces: i64,
    pub total_posts: i64,
    pub total_comments: i64,
    pub total_transactions: i64,
    pub active_users_today: i64,
    pub new_users_today: i64,
    pub new_posts_today: i64,
    pub storage_used_mb: f64,
    pub reported_content: i64,
}

/// 用户管理操作
#[derive(Debug, Deserialize)]
pub struct AdminUserAction {
    pub user_id: Uuid,
    pub action: UserAction,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub enum UserAction {
    Ban,
    Unban,
    VerifyEnterprise,
    VerifyPersonal,
    RevokeVerification,
    SetRole(AdminRole),
}

/// 内容审核操作
#[derive(Debug, Deserialize)]
pub struct AdminContentAction {
    pub target_type: String, // "post" | "comment" | "space"
    pub target_id: Uuid,
    pub action: ContentAction,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub enum ContentAction {
    Approve,
    Reject,
    Feature,
    Unfeature,
    Pin,
    Unpin,
    Delete,
}

/// 系统设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSettings {
    pub site_name: String,
    pub site_description: String,
    pub allow_registration: bool,
    pub require_email_verification: bool,
    pub default_space_quota: i32,
    pub max_upload_size_mb: i32,
    pub platform_fee_percent: f64,
    pub maintenance_mode: bool,
    pub announcement: Option<String>,
}
