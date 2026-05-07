use polis_core::error::AppError;
use polis_core::models::{DirectMessage, SendMessageRequest, MarkMessagesReadRequest};
use sqlx::PgPool;
use uuid::Uuid;
use crate::repo::ContentRepo;

pub struct MessageHandler {
    pub repo: ContentRepo,
}

impl MessageHandler {
    pub fn new(pool: PgPool) -> Self {
        Self {
            repo: ContentRepo::new(pool),
        }
    }

    /// 发送私信
    pub async fn send_message(&self, sender_id: Uuid, req: SendMessageRequest) -> Result<DirectMessage, AppError> {
        if req.to_user_id == sender_id {
            return Err(AppError::Validation("Cannot send message to yourself".to_string()));
        }
        self.repo.send_direct_message(sender_id, req.to_user_id, &req.content).await
    }

    /// 获取所有会话摘要
    pub async fn get_conversations(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.get_conversations(user_id).await
    }

    /// 获取与指定用户的对话消息
    pub async fn get_conversation_messages(&self, user_id: Uuid, other_user_id: Uuid, limit: u32, page: u32) -> Result<Vec<DirectMessage>, AppError> {
        let offset = ((page.saturating_sub(1)) * limit) as i64;
        self.repo.get_conversation_messages(user_id, other_user_id, limit as i64, offset).await
    }

    /// 标记来自某用户的消息为已读
    pub async fn mark_messages_read(&self, user_id: Uuid, req: MarkMessagesReadRequest) -> Result<i64, AppError> {
        self.repo.mark_messages_read(user_id, req.from_user_id).await
    }

    /// 获取未读私信数
    pub async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        self.repo.get_unread_dm_count(user_id).await
    }
}
