use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user::UserPublic;
use crate::types::{ContentType, ModuleType, Visibility};

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
    pub hidden_by_owner: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub metadata: serde_json::Value,
    /// 分享密码（明文，NULL 表示无密码保护）
    pub password_hash: Option<String>,
    pub hidden_until: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 帖子公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostPublic {
    pub id: Uuid,
    pub space_id: Uuid,
    /// 社区 namespace（用于前端 API 调用，避免额外的一次空间查询）
    #[serde(default)]
    pub space_ns: String,
    pub module_type: String,
    pub author: UserPublic,
    pub title: String,
    pub body: String,
    pub content_type: String,
    pub media_urls: Vec<String>,
    pub tags: Vec<String>,
    pub visibility: Visibility,
    pub is_pinned: bool,
    pub is_featured: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub is_liked: bool,
    pub is_bookmarked: bool,
    pub is_hidden: bool,
    /// 是否设置有分享密码（需要解锁才能查看正文）
    pub has_password: bool,
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
    /// 密码分享密码（明文，仅 visibility=unlisted 时生效）
    pub password: Option<String>,
}

/// 更新帖子请求
#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub body: Option<String>,
    pub tags: Option<Vec<String>>,
    pub visibility: Option<Visibility>,
    /// 密码分享密码（明文，仅 visibility=unlisted 时生效）
    pub password: Option<String>,
}

/// 解锁密码保护帖子请求
#[derive(Debug, Deserialize)]
pub struct UnlockPostRequest {
    pub password: String,
}

// ==================== 跨社区投稿引用（Rust 所有权模型） ====================

/// 帖子引用：内容在不同社区的投放
/// 用户Ⓚ OS: 内容本体属于创作者，社区持有内容的引用（类似 Rust &T）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PostReference {
    pub id: Uuid,
    pub post_id: Uuid,
    pub space_id: Uuid,
    pub module_type: String,
    pub status: String, // pending | approved | rejected
    pub submitted_by: Uuid,
    pub reviewed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub reviewed_at: Option<DateTime<Utc>>,
}

/// 投稿请求
#[derive(Debug, Deserialize)]
pub struct CreateReferenceRequest {
    pub space_ns: String,      // 目标社区 namespace
    pub module_type: Option<String>, // 目标模块，默认 forum
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
    pub is_pinned: bool,
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
    pub is_pinned: bool,
    pub like_count: i32,
    pub created_at: DateTime<Utc>,
}

/// 创建评论请求
#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub body: String,
    pub parent_id: Option<Uuid>,
}

// ==================== 通用 ====================

/// 分页参数
#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    /// 排序方式: "latest" | "hot" | "following"
    pub sort: Option<String>,
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(20),
            sort: None,
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

// ==================== 创作者数据本体 ====================

/// 创作数据模型 - 唯一真实数据，归创作者所有
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Creation {
    pub id: Uuid,
    pub creator_id: Uuid,
    pub content_type: String,
    pub title: String,
    pub body: String,
    pub body_json: Option<serde_json::Value>,
    pub cover_url: Option<String>,
    pub media_urls: serde_json::Value,
    pub visibility: String,
    pub password_hash: Option<String>,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub bookmark_count: i64,
    pub share_count: i64,
    pub tags: serde_json::Value,
    pub metadata: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 社区简要信息（用于嵌入展示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceMini {
    pub id: Uuid,
    pub namespace: String,
    pub title: String,
}

/// 投稿信息（嵌入在 CreationPublic 中）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionInfo {
    pub ref_id: Uuid,
    pub space: SpaceMini,
    pub module_type: String,
    /// 自定义模块显示名称（来自 space_modules.name），内置模块为 null
    pub module_name: Option<String>,
    pub display_status: String,
    pub is_pinned: bool,
    pub module_views: i32,
    pub submitted_at: DateTime<Utc>,
    /// 社区统计数据
    pub community_member_count: i64,
    pub community_post_count: i64,
    pub community_level: Option<i32>,
    pub community_xp: Option<i32>,
    pub community_like_count: i64,
    pub community_comment_count: i64,
}

/// 创作数据公开信息（返回给客户端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreationPublic {
    pub id: Uuid,
    pub creator: UserPublic,
    pub content_type: String,
    pub title: String,
    pub body: String,
    pub cover_url: Option<String>,
    pub media_urls: Vec<String>,
    pub visibility: Visibility,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub bookmark_count: i64,
    pub share_count: i64,
    pub is_liked: bool,
    pub is_bookmarked: bool,
    pub has_password: bool,
    pub tags: Vec<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// 投稿信息（在"我的创作"页面中展示）
    pub submissions: Vec<SubmissionInfo>,
}

// ==================== 社区模块引用 ====================

/// 社区模块引用 - 社区模块中的内容是引用的引用
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommunityModuleRef {
    pub id: Uuid,
    pub creation_id: Uuid,
    pub creator_id: Uuid,
    pub space_id: Uuid,
    pub module_type: String,
    pub display_status: String,
    pub is_pinned: bool,
    pub pin_order: i32,
    pub module_views: i32,
    pub created_at: DateTime<Utc>,
}

/// 模块引用公开信息（展示在社区模块页面中）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleRefPublic {
    pub id: Uuid,
    pub creation: CreationPublic,
    pub space: SpaceMini,
    pub module_type: String,
    pub display_status: String,
    pub is_pinned: bool,
    pub module_views: i32,
    pub created_at: DateTime<Utc>,
}

// ==================== 投稿申请 ====================

/// 投稿申请
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SubmissionRequest {
    pub id: Uuid,
    pub creation_id: Uuid,
    pub creator_id: Uuid,
    pub target_space_id: Uuid,
    pub target_module_type: String,
    pub message: Option<String>,
    pub status: String,
    pub reviewed_by: Option<Uuid>,
    pub review_note: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ==================== 请求/响应类型 ====================

/// 创建创作请求
#[derive(Debug, Deserialize)]
pub struct CreateCreationRequest {
    pub content_type: String,
    pub title: String,
    pub body: String,
    pub cover_url: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub visibility: Option<Visibility>,
    pub password: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// 更新创作请求
#[derive(Debug, Deserialize)]
pub struct UpdateCreationRequest {
    pub title: Option<String>,
    pub body: Option<String>,
    pub cover_url: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub visibility: Option<Visibility>,
    pub password: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub status: Option<String>,
}

/// 投稿到社区请求
#[derive(Debug, Deserialize)]
pub struct SubmitToCommunityRequest {
    pub creation_id: Uuid,
    pub space_ns: String,
    pub module_type: String,
    pub message: Option<String>,
}

/// 撤稿请求
#[derive(Debug, Deserialize)]
pub struct WithdrawSubmissionRequest {
    pub ref_id: Uuid,
}

/// 审核引用请求（模块管理者）
#[derive(Debug, Deserialize)]
pub struct ReviewRefRequest {
    pub ref_id: Uuid,
    pub action: String, // 'approve' | 'reject' | 'hide' | 'show' | 'pin' | 'unpin'
    pub note: Option<String>,
}

/// 获取我的创作列表查询参数
#[derive(Debug, Deserialize)]
pub struct ListCreationsQuery {
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub visibility: Option<String>,
    pub creator_username: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// 获取社区模块引用列表查询参数
#[derive(Debug, Deserialize)]
pub struct ListModuleRefsQuery {
    pub module_type: Option<String>,
    pub status: Option<String>, // 'visible' | 'pending' | 'hidden' | 'all'
    pub sort: Option<String>,   // 'newest' | 'hot' | 'pinned'
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

// ==================== 编辑精选系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EditorPick {
    pub id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub title_override: Option<String>,
    pub description_override: Option<String>,
    pub pick_type: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub picked_by: Option<Uuid>,
    pub picked_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEditorPickRequest {
    pub target_type: String,
    pub target_id: Uuid,
    pub title_override: Option<String>,
    pub description_override: Option<String>,
    pub pick_type: Option<String>,
    pub sort_order: Option<i32>,
}

// ==================== AI 助手 ====================

#[derive(Debug, Deserialize)]
pub struct AiSuggestionRequest {
    pub content_type: String,   // "title" | "summary" | "tags" | "outline"
    pub context: String,        // 文章内容或主题
    pub tone: Option<String>,   // "professional" | "casual" | "humorous"
}

#[derive(Debug, Serialize)]
pub struct AiSuggestionResponse {
    pub suggestions: Vec<String>,
    pub content_type: String,
}

// ==================== 推荐系统 ====================

#[derive(Debug, Deserialize)]
pub struct RecommendationQuery {
    pub limit: Option<u32>,
    pub include_type: Option<String>, // "posts" | "spaces" | "users" | "all"
}

#[derive(Debug, Serialize)]
pub struct RecommendationResult {
    pub posts: Vec<serde_json::Value>,
    pub spaces: Vec<serde_json::Value>,
    pub users: Vec<UserPublic>,
    pub topics: Vec<super::hashtag::HashtagWithCount>,
}

// ==================== 审核审计系统 ====================

/// 审核审计日志
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub actor_id: Uuid,
    pub actor_type: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub action: String,
    pub old_state: Option<String>,
    pub new_state: Option<String>,
    pub reason: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// 管理员用户
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AdminUser {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub granted_by: Option<Uuid>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// Agent 管理员关联
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AdminAgent {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub permissions: serde_json::Value,
    pub is_active: bool,
    pub granted_by: Uuid,
    pub created_at: DateTime<Utc>,
}

/// 审核规则
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewRule {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub rule_type: String,
    pub config: serde_json::Value,
    pub target_types: serde_json::Value,
    pub priority: i32,
    pub is_active: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 审核队列查询参数
#[derive(Debug, Deserialize)]
pub struct ReviewQueueQuery {
    pub status: Option<String>,
    pub r#type: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// 批量审核请求
#[derive(Debug, Deserialize)]
pub struct BatchReviewRequest {
    pub items: Vec<BatchReviewItem>,
    pub action: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchReviewItem {
    pub target_type: String,
    pub target_id: Uuid,
}

/// 举报联动审核
#[derive(Debug, Deserialize)]
pub struct ResolveReportWithActionRequest {
    pub action: String,
    pub target_action: Option<String>,  // 对举报目标执行的联动操作
    pub target_action_reason: Option<String>,
}

/// Agent Admin 登录请求
#[derive(Debug, Deserialize)]
pub struct AgentAdminLoginRequest {
    pub agent_id: Uuid,
    pub api_key: String,
}

/// 创建/更新审核规则请求
#[derive(Debug, Deserialize)]
pub struct CreateReviewRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub rule_type: String,
    pub config: serde_json::Value,
    pub target_types: Vec<String>,
    pub priority: Option<i32>,
}

/// Agent 审查决策
#[derive(Debug, Deserialize)]
pub struct AgentReviewDecision {
    pub target_type: String,       // "post" | "creation" | "user"
    pub target_id: Uuid,
    pub action: String,            // "approve" | "hide" | "ban_user"
    pub duration_hours: Option<i32>,
    pub reason: String,
    pub confidence: f64,           // 0.0 - 1.0
    pub violation_type: Option<String>, // "nsfw" | "violence" | "hate_speech" | "spam" | "illegal" | "harassment"
}

/// Agent 审查请求
#[derive(Debug, Deserialize)]
pub struct AgentReviewRequest {
    pub decisions: Vec<AgentReviewDecision>,
}

/// 审计日志查询
#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub actor_id: Option<Uuid>,
    pub target_type: Option<String>,
    pub action: Option<String>,
    pub actor_type: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}
