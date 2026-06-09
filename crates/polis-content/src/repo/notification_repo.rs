use polis_core::error::AppError;
use polis_core::models::DirectMessage;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct NotificationRepo {
    pool: Arc<PgPool>,
}

impl NotificationRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    // ===== 私信 (Direct Messages) =====

    pub async fn send_direct_message(
        &self,
        sender_id: Uuid,
        receiver_id: Uuid,
        content: &str,
    ) -> Result<DirectMessage, AppError> {
        let msg = sqlx::query_as::<_, DirectMessage>(
            "INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
        )
        .bind(sender_id)
        .bind(receiver_id)
        .bind(content)
        .fetch_one(&*self.pool)
        .await?;
        Ok(msg)
    }

    pub async fn get_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, serde_json::Value, chrono::DateTime<chrono::Utc>, String, chrono::DateTime<chrono::Utc>, i64)>(
            r#"SELECT
                u.id, u.username, u.display_name, u.avatar_url, COALESCE(u.bio, ''),
                u.verified, COALESCE(u.notification_prefs, '{}'::jsonb), u.created_at,
                dm.content, dm.created_at as last_msg_at,
                COALESCE(unread.cnt, 0) as unread
            FROM (
                SELECT DISTINCT ON (
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
                )
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_id,
                    content,
                    created_at
                FROM direct_messages
                WHERE (sender_id = $1 OR receiver_id = $1) AND is_deleted = FALSE
                ORDER BY
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END,
                    created_at DESC
            ) dm
            JOIN users u ON u.id = dm.other_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as cnt
                FROM direct_messages dm2
                WHERE dm2.sender_id = dm.other_id
                  AND dm2.receiver_id = $1
                  AND dm2.is_read = false
            ) unread ON true
            ORDER BY dm.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&*self.pool)
        .await
        .map_err(|e| AppError::internal(format!("Failed to get conversations: {}", e)))?;

        Ok(rows.into_iter().map(|(id, username, display_name, avatar_url, bio, verified, notification_prefs, created_at, last_message, last_message_at, unread_count)| {
            serde_json::json!({
                "other_user": {
                    "id": id,
                    "username": username,
                    "display_name": display_name,
                    "avatar_url": avatar_url,
                    "bio": bio,
                    "verified": verified,
                    "notification_prefs": notification_prefs,
                    "created_at": created_at,
                },
                "last_message": last_message,
                "last_message_at": last_message_at,
                "unread_count": unread_count,
            })
        }).collect())
    }

    pub async fn get_conversation_messages(
        &self,
        user_id: Uuid,
        other_user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<DirectMessage>, AppError> {
        let msgs = sqlx::query_as::<_, DirectMessage>(
            "SELECT * FROM direct_messages WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        )
        .bind(user_id)
        .bind(other_user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;
        Ok(msgs)
    }

    pub async fn mark_messages_read(
        &self,
        user_id: Uuid,
        from_user_id: Uuid,
    ) -> Result<i64, AppError> {
        let result = sqlx::query_as::<_, (i64,)>(
            "WITH updated AS (UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false RETURNING 1) SELECT COUNT(*)::BIGINT FROM updated",
        )
        .bind(user_id)
        .bind(from_user_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(result.0)
    }

    pub async fn get_unread_dm_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND is_read = false",
        )
        .bind(user_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(count.0)
    }

    /// 删除私信（软删除）
    pub async fn delete_direct_message(
        &self,
        msg_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let affected = sqlx::query(
            "UPDATE direct_messages SET is_deleted = TRUE WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)",
        )
        .bind(msg_id)
        .bind(user_id)
        .execute(&*self.pool)
        .await?
        .rows_affected();
        if affected == 0 {
            return Err(AppError::not_found("Message not found".to_string()));
        }
        Ok(())
    }

    /// 批量删除与多个用户的会话（软删除）
    pub async fn batch_delete_conversations(
        &self,
        user_id: Uuid,
        other_user_ids: &[Uuid],
    ) -> Result<u64, AppError> {
        let mut total = 0u64;
        for other_id in other_user_ids {
            let affected = sqlx::query(
                "UPDATE direct_messages SET is_deleted = TRUE WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND is_deleted = FALSE",
            )
            .bind(user_id)
            .bind(other_id)
            .execute(&*self.pool)
            .await?
            .rows_affected();
            total += affected;
        }
        Ok(total)
    }

    /// 置顶/取消置顶消息（切换 is_pinned）
    pub async fn toggle_pin_message(
        &self,
        msg_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let row: (bool,) = sqlx::query_as(
            "UPDATE direct_messages SET is_pinned = NOT is_pinned WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2) RETURNING is_pinned",
        )
        .bind(msg_id)
        .bind(user_id)
        .fetch_optional(&*self.pool)
        .await?
        .ok_or(AppError::not_found("Message not found".to_string()))?;
        Ok(row.0)
    }

    /// 获取置顶消息列表
    pub async fn get_pinned_messages(
        &self,
        user_id: Uuid,
        other_user_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM direct_messages WHERE is_pinned = TRUE AND is_deleted = FALSE AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) ORDER BY created_at ASC",
        )
        .bind(user_id)
        .bind(other_user_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 搜索对话消息
    pub async fn search_direct_messages(
        &self,
        user_id: Uuid,
        other_user_id: Option<Uuid>,
        q: &str,
        limit: i64,
    ) -> Result<Vec<DirectMessage>, AppError> {
        let pattern = format!("%{}%", q);
        let msgs = if let Some(ouid) = other_user_id {
            sqlx::query_as::<_, DirectMessage>(
                "SELECT * FROM direct_messages WHERE is_deleted = FALSE AND content ILIKE $1 AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)) ORDER BY created_at DESC LIMIT $4",
            )
            .bind(&pattern)
            .bind(user_id)
            .bind(ouid)
            .bind(limit)
            .fetch_all(&*self.pool)
            .await?
        } else {
            sqlx::query_as::<_, DirectMessage>(
                "SELECT * FROM direct_messages WHERE is_deleted = FALSE AND content ILIKE $1 AND (sender_id = $2 OR receiver_id = $2) ORDER BY created_at DESC LIMIT $3",
            )
            .bind(&pattern)
            .bind(user_id)
            .bind(limit)
            .fetch_all(&*self.pool)
            .await?
        };
        Ok(msgs)
    }

    // ===== 对话静音 =====

    pub async fn mute_conversation(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO user_conversation_mutes (user_id, muted_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(muted_user_id)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn unmute_conversation(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query(
            "DELETE FROM user_conversation_mutes WHERE user_id = $1 AND muted_user_id = $2",
        )
        .bind(user_id)
        .bind(muted_user_id)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn is_conversation_muted(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<bool, AppError> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM user_conversation_mutes WHERE user_id = $1 AND muted_user_id = $2)",
        )
        .bind(user_id)
        .bind(muted_user_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(exists)
    }

    pub async fn get_muted_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT muted_user_id FROM user_conversation_mutes WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== 通知系统 =====

    pub async fn create_notification(
        &self,
        user_id: Uuid,
        typ: &str,
        actor_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        content: &str,
    ) -> Result<(), AppError> {
        if user_id == actor_id {
            return Ok(());
        }
        sqlx::query(
            "INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content) VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(user_id)
        .bind(typ)
        .bind(actor_id)
        .bind(target_type)
        .bind(target_id)
        .bind(content)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }
}
