use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ==================== 通知系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub notification_type: String,
    pub title: String,
    pub body: Option<String>,
    pub link: Option<String>,
    pub is_read: bool,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

// ==================== Webhook 事件系统 ====================

/// Webhook 订阅
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Webhook {
    pub id: Uuid,
    pub user_id: Uuid,
    pub space_id: Option<Uuid>,
    pub events: serde_json::Value,
    pub url: String,
    pub secret: Option<String>,
    pub is_active: bool,
    pub last_delivery_at: Option<DateTime<Utc>>,
    pub last_delivery_status: Option<i32>,
    pub delivery_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Webhook 推送日志
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WebhookDelivery {
    pub id: Uuid,
    pub webhook_id: Uuid,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub status_code: Option<i32>,
    pub response_body: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
}

/// 创建 Webhook 订阅请求
#[derive(Debug, Deserialize)]
pub struct CreateWebhookRequest {
    pub space_id: Option<Uuid>,
    pub events: Vec<String>,
    pub url: String,
    pub secret: Option<String>,
}

/// 更新 Webhook 订阅请求
#[derive(Debug, Deserialize)]
pub struct UpdateWebhookRequest {
    pub events: Option<Vec<String>>,
    pub url: Option<String>,
    pub secret: Option<String>,
    pub is_active: Option<bool>,
}

/// Webhook 事件类型常量
pub mod webhook_events {
    pub const CONTENT_CREATED: &str = "content.created";
    pub const CONTENT_UPDATED: &str = "content.updated";
    pub const CONTENT_SUBMITTED: &str = "content.submitted";
    pub const CONTENT_LIKED: &str = "content.liked";
    pub const CONTENT_COMMENTED: &str = "content.commented";
    pub const CONTENT_BOOKMARKED: &str = "content.bookmarked";
    pub const SPACE_JOINED: &str = "space.joined";
    pub const AGENT_MENTIONED: &str = "agent.mentioned";
}
