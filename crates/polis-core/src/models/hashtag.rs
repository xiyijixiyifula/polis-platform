use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== #话题标签系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Hashtag {
    pub id: Uuid,
    pub tag: String,
    pub normalized_tag: String,
    pub post_count: i64,
    pub creation_count: i64,
    pub total_use_count: i64,
    pub last_used_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HashtagMapping {
    pub id: Uuid,
    pub hashtag_id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct HashtagWithCount {
    pub tag: String,
    pub normalized_tag: String,
    pub post_count: i64,
    pub creation_count: i64,
    pub total_use_count: i64,
}
