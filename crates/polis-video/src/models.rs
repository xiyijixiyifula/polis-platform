use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 视频数据库模型（含 JOIN 字段）
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Video {
    pub id: Uuid,
    pub space_id: Uuid,
    pub uploader_id: Uuid,
    pub title: String,
    pub description: String,
    pub duration_seconds: Option<i32>,
    pub original_url: String,
    pub hls_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub resolutions: serde_json::Value,
    pub status: String,
    pub review_status: String,
    pub visibility: String,
    pub file_size: Option<i64>,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub share_code: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct CreateVideoRequest {
    pub title: String,
    pub description: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVideoRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewVideoRequest {
    pub status: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVideoCommentRequest {
    pub body: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoPublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub space_ns: String,
    pub uploader: UserMini,
    pub title: String,
    pub description: String,
    pub duration_seconds: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub hls_url: Option<String>,
    pub status: String,
    pub review_status: String,
    pub visibility: String,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub is_liked: bool,
    pub share_code: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserMini {
    pub id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
}
