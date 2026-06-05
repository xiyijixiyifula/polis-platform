use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== Thread 对话流 ====================

/// 对话流
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Thread {
    pub id: Uuid,
    pub title: String,
    pub creator_id: Uuid,
    pub community_id: Option<Uuid>,
    pub participants: serde_json::Value,
    pub status: String,
    pub creation_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 对话消息
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ThreadMessage {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub user_id: Option<Uuid>,
    pub agent_id: Option<Uuid>,
    pub role: String,
    pub content: String,
    pub content_type: String,
    pub message_order: i32,
    pub created_at: DateTime<Utc>,
}

/// 创建对话流请求
#[derive(Debug, Deserialize)]
pub struct CreateThreadRequest {
    pub title: String,
    pub community_id: Option<Uuid>,
    pub participants: Option<serde_json::Value>,
}

/// 添加消息请求
#[derive(Debug, Deserialize)]
pub struct AddThreadMessageRequest {
    pub role: String,
    pub content: String,
    pub content_type: Option<String>,
    pub agent_id: Option<Uuid>,
}

/// 发布对话流为作品请求
#[derive(Debug, Deserialize)]
pub struct PublishThreadRequest {
    pub title: String,
    pub module_type: String,
    pub visibility: Option<String>,
    pub spaces: Option<Vec<String>>, // namespace 列表
}
