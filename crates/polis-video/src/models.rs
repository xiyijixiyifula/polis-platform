use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 视频本体 — 属于创作者，不绑定社区
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Video {
    pub id: Uuid,
    pub space_id: Option<Uuid>, // 保留：首次发布社区（便于快速引用）
    pub uploader_id: Uuid,
    pub title: String,
    pub description: String,
    pub duration_seconds: Option<i32>,
    pub original_url: String,
    pub hls_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub resolutions: serde_json::Value,
    pub status: String,        // processing/ready/failed
    pub visibility: String,    // public/private/unlisted
    pub file_size: Option<i64>,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub share_code: Option<String>,
    pub share_password: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub uploader_username: Option<String>,
    #[serde(default)]
    pub uploader_display_name: Option<String>,
    #[serde(default)]
    pub uploader_avatar_url: Option<String>,
    #[serde(default)]
    pub space_namespace: Option<String>,
    #[serde(default)]
    pub space_title: Option<String>,
}

/// 社区-视频关联（审核按社区独立）
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SpaceVideo {
    pub space_id: Uuid,
    pub video_id: Uuid,
    pub review_status: String,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub reject_reason: Option<String>,
    pub submitted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct VideoComment {
    pub id: Uuid,
    pub video_id: Uuid,
    pub author_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub body: String,
    pub is_deleted: bool,
    pub like_count: i32,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub author_username: Option<String>,
    #[serde(default)]
    pub author_display_name: Option<String>,
    #[serde(default)]
    pub author_avatar_url: Option<String>,
}

// ===== 请求体 =====

#[derive(Debug, Deserialize)]
pub struct UpdateVideoRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewVideoRequest {
    pub status: String,        // approved / rejected
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVideoCommentRequest {
    pub body: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct PublishRequest {
    pub space_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct SetPasswordRequest {
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct AccessWithPasswordRequest {
    pub password: String,
}

// ===== 响应体 =====

#[derive(Debug, Clone, Serialize)]
pub struct VideoPublic {
    pub id: Uuid,
    pub uploader: UserMini,
    pub title: String,
    pub description: String,
    pub duration_seconds: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub hls_url: Option<String>,
    pub status: String,
    pub visibility: String,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub is_liked: bool,
    pub is_bookmarked: bool,
    pub share_code: Option<String>,
    pub has_password: bool,
    pub created_at: DateTime<Utc>,
    // 社区上下文（在社区页面查看时填充）
    pub space_id: Option<Uuid>,
    pub space_ns: Option<String>,
    pub space_review_status: Option<String>,
    // 提交到的社区列表
    pub published_spaces: Vec<SpaceRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpaceRef {
    pub space_id: Uuid,
    pub namespace: String,
    pub title: String,
    pub review_status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserMini {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
}
