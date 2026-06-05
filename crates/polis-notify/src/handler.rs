use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;
use tracing;

pub struct NotifyHandler {
    pool: PgPool,
}

impl NotifyHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// 根据帖子ID获取作者ID
    pub async fn find_post_author(&self, post_id: Uuid) -> Option<Uuid> {
        sqlx::query_scalar::<_, Uuid>(
            "SELECT author_id FROM posts WHERE id = $1 AND is_deleted = FALSE"
        )
        .bind(post_id)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()
    }

    /// 处理 NATS 事件并创建通知
    pub async fn handle_event(&self, subject: &str, payload: &serde_json::Value) {
        match subject {
            // CONTENT_POST_LIKED / CONTENT_COMMENT_CREATED — 通知由 content handler 直接写入 DB，
            // notify service 不再重复创建，仅记录事件日志。
            polis_core::events::subjects::CONTENT_POST_LIKED => {
                tracing::debug!("Received CONTENT_POST_LIKED event (notification handled by content handler)");
            }
            polis_core::events::subjects::CONTENT_COMMENT_CREATED => {
                tracing::debug!("Received CONTENT_COMMENT_CREATED event (notification handled by content handler)");
            }
            // 新帖子创建 → 通知社区成员（简化：仅通知社区创建者）
            polis_core::events::subjects::CONTENT_POST_CREATED => {
                let author_id_str = payload.get("author_id").and_then(|v| v.as_str()).unwrap_or("");
                let space_id_str = payload.get("space_id").and_then(|v| v.as_str()).unwrap_or("");
                let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("新帖子");

                if let Ok(author_id) = Uuid::parse_str(author_id_str) {
                    if let Ok(space_id) = Uuid::parse_str(space_id_str) {
                        let actor_name = self.find_user_display_name(author_id).await.unwrap_or_else(|| "有人".to_string());
                        let content = format!("{} 在社区发布了「{}」", actor_name, title);

                        // Notify space members (excluding author)
                        if let Ok(members) = self.find_space_members(space_id).await {
                            for member_id in members {
                                if member_id != author_id {
                                    if let Err(e) = self.create_notification(
                                        member_id, "post_created",
                                        Some(author_id), Some("post"), None,
                                        &content,
                                    ).await {
                                        tracing::warn!("Failed to create post notification for member {}: {}", member_id, e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // 用户被关注 → 通知被关注的用户
            polis_core::events::subjects::USER_FOLLOWED => {
                // Structure depends on who publishes this event
                let followed_id_str = payload.get("followed_id").and_then(|v| v.as_str())
                    .or_else(|| payload.get("target_user_id").and_then(|v| v.as_str()))
                    .unwrap_or("");
                let follower_id_str = payload.get("follower_id").and_then(|v| v.as_str())
                    .or_else(|| payload.get("user_id").and_then(|v| v.as_str()))
                    .unwrap_or("");

                if let Ok(followed_id) = Uuid::parse_str(followed_id_str) {
                    if let Ok(follower_id) = Uuid::parse_str(follower_id_str) {
                        let follower_name = self.find_user_display_name(follower_id).await.unwrap_or_else(|| "有人".to_string());
                        let content = format!("{} 关注了你", follower_name);
                        if let Err(e) = self.create_notification(
                            followed_id, "follow",
                            Some(follower_id), Some("user"), Some(follower_id),
                            &content,
                        ).await {
                            tracing::warn!("Failed to create follow notification: {}", e);
                        }
                    }
                }
            }
            _ => {
                tracing::debug!("Unhandled NATS subject: {}", subject);
            }
        }
    }

    /// 查找用户显示名称
    pub async fn find_user_display_name(&self, user_id: Uuid) -> Option<String> {
        sqlx::query_scalar::<_, String>(
            "SELECT COALESCE(display_name, username) FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()
    }

    /// 获取社区成员列表
    pub async fn find_space_members(&self, space_id: Uuid) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT user_id FROM memberships WHERE space_id = $1 AND role != 'banned'"
        )
        .bind(space_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 创建通知
    pub async fn create_notification(
        &self, user_id: Uuid, notif_type: &str,
        actor_id: Option<Uuid>, target_type: Option<&str>,
        target_id: Option<Uuid>, content: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content)
               VALUES ($1, $2, $3, $4, $5, $6)"#
        )
        .bind(user_id).bind(notif_type).bind(actor_id)
        .bind(target_type).bind(target_id).bind(content)
        .execute(&self.pool).await?;
        Ok(())
    }

    /// 获取用户通知列表
    pub async fn get_notifications(
        &self, user_id: Uuid, page: u32, page_size: u32, unread_only: bool,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let filter = if unread_only { "AND n.is_read = FALSE" } else { "" };
        let query_str = format!(
            r#"SELECT json_build_object(
                'id', n.id, 'type', n.type, 'content', n.content,
                'is_read', n.is_read, 'created_at', n.created_at,
                'actor', CASE WHEN n.actor_id IS NOT NULL THEN
                    (SELECT json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url)
                     FROM users u WHERE u.id = n.actor_id)
                ELSE NULL END,
                'target_type', n.target_type, 'target_id', n.target_id
            ) FROM notifications n
            WHERE n.user_id = $1 {} ORDER BY n.created_at DESC LIMIT $2 OFFSET $3"#,
            filter
        );
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(&query_str)
            .bind(user_id).bind(limit).bind(offset)
            .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取未读通知数
    pub async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE"
        ).bind(user_id).fetch_one(&self.pool).await?;
        Ok(count.0)
    }

    /// 标记通知为已读
    pub async fn mark_read(&self, notif_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2")
            .bind(notif_id).bind(user_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    /// 标记全部已读
    pub async fn mark_all_read(&self, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE")
            .bind(user_id).execute(&self.pool).await?;
        Ok(())
    }
}
