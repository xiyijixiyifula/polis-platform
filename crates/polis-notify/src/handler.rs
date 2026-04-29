use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

pub struct NotifyHandler {
    pool: PgPool,
}

impl NotifyHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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
