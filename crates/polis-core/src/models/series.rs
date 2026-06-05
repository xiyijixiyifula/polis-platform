use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user::UserPublic;

// ==================== 专栏/内容系列 ====================

/// 系列（专栏）模型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Series {
    pub id: Uuid,
    pub space_id: Uuid,
    pub author_id: Uuid,
    pub title: String,
    pub description: String,
    pub cover_url: Option<String>,
    pub visibility: String,
    pub is_published: bool,
    pub post_count: i32,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 系列公开信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesPublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub author: UserPublic,
    pub title: String,
    pub description: String,
    pub cover_url: Option<String>,
    pub visibility: String,
    pub is_published: bool,
    pub post_count: i32,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 系列-帖子关联
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SeriesPost {
    pub id: Uuid,
    pub series_id: Uuid,
    pub post_id: Uuid,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

/// 创建系列请求
#[derive(Debug, Deserialize)]
pub struct CreateSeriesRequest {
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: Option<String>,
}

/// 更新系列请求
#[derive(Debug, Deserialize)]
pub struct UpdateSeriesRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: Option<String>,
    pub is_published: Option<bool>,
    pub sort_order: Option<i32>,
}

/// 添加帖子到系列请求
#[derive(Debug, Deserialize)]
pub struct AddPostToSeriesRequest {
    pub post_id: Uuid,
    pub sort_order: Option<i32>,
}
