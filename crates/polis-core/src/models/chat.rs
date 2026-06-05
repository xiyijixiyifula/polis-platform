use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user::UserPublic;

// ==================== 私信 (Direct Messages) ====================

/// 发送私信请求
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub to_user_id: Uuid,
    pub content: String,
}

/// 私信消息
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DirectMessage {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
    pub is_read: bool,
    pub is_pinned: bool,
    pub is_deleted: bool,
    pub created_at: DateTime<Utc>,
}

/// 私信会话摘要 — 每个会话显示对方用户和最后一条消息
#[derive(Debug, Clone, Serialize)]
pub struct ConversationSummary {
    pub other_user: UserPublic,
    pub last_message: String,
    pub last_message_at: DateTime<Utc>,
    pub unread_count: i64,
}

/// 标记已读请求
#[derive(Debug, Deserialize)]
pub struct MarkMessagesReadRequest {
    pub from_user_id: Uuid,
}

/// 静音/取消静音对话
#[derive(Debug, Deserialize)]
pub struct ToggleMuteRequest {
    pub user_id: Uuid,
}

/// 置顶/取消置顶消息
#[derive(Debug, Deserialize)]
pub struct TogglePinMessageRequest {
    pub message_id: Uuid,
}

/// 消息搜索请求
#[derive(Debug, Deserialize)]
pub struct SearchMessagesQuery {
    pub q: String,
    pub user_id: Option<Uuid>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}
