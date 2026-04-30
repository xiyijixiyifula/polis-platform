use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::types::*;

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
    pub created_at: DateTime<Utc>,
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
            created_at: u.created_at,
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
}

/// 登录响应
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserPublic,
}

/// 更新用户资料请求
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

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
    pub created_at: DateTime<Utc>,
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
            created_at: s.created_at,
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
    pub enabled_modules: Option<Vec<ModuleType>>,
}

/// 更新社区请求
#[derive(Debug, Deserialize)]
pub struct UpdateSpaceRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub banner_url: Option<String>,
    pub visibility: Option<Visibility>,
    pub custom_rules: Option<serde_json::Value>,
    pub enabled_modules: Option<Vec<ModuleType>>,
}

// ==================== 内容 ====================

/// 帖子模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Post {
    pub id: Uuid,
    pub space_id: Uuid,
    pub module_type: String,
    pub author_id: Uuid,
    pub title: String,
    pub body: String,
    pub content_type: String,
    pub media_urls: serde_json::Value,
    pub tags: serde_json::Value,
    pub visibility: String,
    pub is_pinned: bool,
    pub is_featured: bool,
    pub is_deleted: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 帖子公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostPublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub module_type: ModuleType,
    pub author: UserPublic,
    pub title: String,
    pub body: String,
    pub content_type: ContentType,
    pub media_urls: Vec<String>,
    pub tags: Vec<String>,
    pub is_pinned: bool,
    pub is_featured: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建帖子请求
#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub module_type: Option<ModuleType>,
    pub title: String,
    pub body: String,
    pub content_type: Option<ContentType>,
    pub tags: Option<Vec<String>>,
    pub visibility: Option<Visibility>,
}

/// 更新帖子请求
#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub body: Option<String>,
    pub tags: Option<Vec<String>>,
    pub visibility: Option<Visibility>,
}

// ==================== 评论 ====================

/// 评论模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Comment {
    pub id: Uuid,
    pub post_id: Uuid,
    pub author_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub body: String,
    pub is_deleted: bool,
    pub like_count: i32,
    pub created_at: DateTime<Utc>,
}

/// 评论公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentPublic {
    pub id: Uuid,
    pub post_id: Uuid,
    pub author: UserPublic,
    pub parent_id: Option<Uuid>,
    pub body: String,
    pub like_count: i32,
    pub created_at: DateTime<Utc>,
}

/// 创建评论请求
#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub body: String,
    pub parent_id: Option<Uuid>,
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

// ==================== 通用 ====================

/// 分页参数
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(20),
        }
    }
}

/// 分页信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub page_size: u32,
    pub total: u64,
    pub total_pages: u32,
}

/// 统一 API 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<Pagination>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 0,
            message: "ok".to_string(),
            data: Some(data),
            pagination: None,
        }
    }

    pub fn success_with_pagination(data: T, pagination: Pagination) -> Self {
        Self {
            code: 0,
            message: "ok".to_string(),
            data: Some(data),
            pagination: Some(pagination),
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            data: None,
            pagination: None,
        }
    }
}

// Re-export commonly used types
pub use crate::types::{
    Visibility, SpaceStatus, MemberRole, ModuleType, ContentType, VerifiedType,
};
