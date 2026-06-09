use polis_core::error::AppError;
use polis_core::models::{
    Thread, ThreadMessage, CreateThreadRequest, AddThreadMessageRequest,
    PublishThreadRequest, Pagination,
};
use sqlx::PgPool;
use uuid::Uuid;

pub struct ThreadHandler {
    pool: PgPool,
}

impl ThreadHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 创建对话流
    pub async fn create(
        &self,
        user_id: Uuid,
        req: CreateThreadRequest,
    ) -> Result<Thread, AppError> {
        let participants = req.participants.unwrap_or(serde_json::json!({}));
        let thread = sqlx::query_as::<_, Thread>(
            r#"INSERT INTO threads (title, creator_id, community_id, participants)
               VALUES ($1, $2, $3, $4) RETURNING *"#,
        )
        .bind(&req.title)
        .bind(user_id)
        .bind(req.community_id)
        .bind(&participants)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(thread)
    }

    /// 获取对话流
    pub async fn get(&self, id: Uuid, user_id: Uuid) -> Result<Thread, AppError> {
        let thread = sqlx::query_as::<_, Thread>(
            "SELECT * FROM threads WHERE id = $1 AND creator_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?
        .ok_or(AppError::not_found("对话流不存在".to_string()))?;
        Ok(thread)
    }

    /// 列出我的对话流
    pub async fn list_mine(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<Thread>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM threads WHERE creator_id = $1",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        let threads = sqlx::query_as::<_, Thread>(
            "SELECT * FROM threads WHERE creator_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        let total_pages = (total.0 as f64 / page_size as f64).ceil() as u32;
        Ok((threads, Pagination { page, page_size, total: total.0 as u64, total_pages }))
    }

    /// 获取对话消息
    pub async fn messages(&self, thread_id: Uuid) -> Result<Vec<ThreadMessage>, AppError> {
        let msgs = sqlx::query_as::<_, ThreadMessage>(
            "SELECT * FROM thread_messages WHERE thread_id = $1 ORDER BY message_order ASC",
        )
        .bind(thread_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(msgs)
    }

    /// 添加消息
    pub async fn add_message(
        &self,
        user_id: Uuid,
        thread_id: Uuid,
        req: AddThreadMessageRequest,
    ) -> Result<ThreadMessage, AppError> {
        // 验证所有权
        let _thread: (Uuid,) = sqlx::query_as(
            "SELECT id FROM threads WHERE id = $1 AND creator_id = $2",
        )
        .bind(thread_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?
        .ok_or(AppError::forbidden("无权操作此对话流".to_string()))?;

        // 获取下一个 message_order
        let max_order: Option<(i32,)> = sqlx::query_as(
            "SELECT MAX(message_order) FROM thread_messages WHERE thread_id = $1",
        )
        .bind(thread_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        let next_order = max_order.map(|(o,)| o + 1).unwrap_or(0);
        let content_type = req.content_type.unwrap_or_else(|| "text".to_string());

        let msg = sqlx::query_as::<_, ThreadMessage>(
            r#"INSERT INTO thread_messages (thread_id, user_id, agent_id, role, content, content_type, message_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *"#,
        )
        .bind(thread_id)
        .bind(user_id)
        .bind(req.agent_id)
        .bind(&req.role)
        .bind(&req.content)
        .bind(&content_type)
        .bind(next_order)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        // 更新 thread 的 updated_at
        if let Err(e) = sqlx::query("UPDATE threads SET updated_at = NOW() WHERE id = $1")
            .bind(thread_id)
            .execute(&self.pool)
            .await {
            tracing::warn!("Failed to update thread {} updated_at: {}", thread_id, e);
        }

        Ok(msg)
    }

    /// 发布对话流为作品
    pub async fn publish(
        &self,
        user_id: Uuid,
        thread_id: Uuid,
        req: PublishThreadRequest,
    ) -> Result<serde_json::Value, AppError> {
        // 验证所有权
        let _exists: (Uuid,) = sqlx::query_as(
            "SELECT id FROM threads WHERE id = $1 AND creator_id = $2",
        )
        .bind(thread_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?
        .ok_or(AppError::forbidden("无权操作此对话流".to_string()))?;

        // 获取所有消息并格式化为 Markdown
        let msgs = sqlx::query_as::<_, ThreadMessage>(
            "SELECT * FROM thread_messages WHERE thread_id = $1 ORDER BY message_order ASC",
        )
        .bind(thread_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        let markdown_body: String = msgs.iter().map(|m| {
            let role_label = match m.role.as_str() {
                "assistant" => "🤖 **AI**",
                "system" => "⚙️ **System**",
                _ => "👤 **User**",
            };
            format!("### {}\n\n{}\n\n---\n", role_label, m.content)
        }).collect();

        // 创建创作记录
        let visibility = req.visibility.unwrap_or_else(|| "public".to_string());
        let tags = serde_json::json!(["对话", "thread"]);
        let creation: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO creations (creator_id, content_type, title, body, visibility, tags, status)
               VALUES ($1, 'text', $2, $3, $4, $5, 'published') RETURNING id"#,
        )
        .bind(user_id)
        .bind(&req.title)
        .bind(&markdown_body)
        .bind(&visibility)
        .bind(&tags)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        // 更新 thread 状态
        if let Err(e) = sqlx::query(
            "UPDATE threads SET status = 'published', creation_id = $1, updated_at = NOW() WHERE id = $2",
        )
        .bind(creation.0)
        .bind(thread_id)
        .execute(&self.pool)
        .await {
            tracing::warn!("Failed to update thread {} status to published: {}", thread_id, e);
        }

        // 如果有社区列表，自动投稿
        let submitted_spaces = if let Some(spaces) = req.spaces {
            let mut results = Vec::new();
            for ns in &spaces {
                let sp_id: Option<Uuid> = sqlx::query_scalar(
                    "SELECT id FROM spaces WHERE namespace = $1",
                )
                .bind(ns)
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| AppError::internal(e.to_string()))
                .ok()
                .flatten();

                if let Some(sid) = sp_id {
                    // 插入引用
                    let ref_result = sqlx::query(
                        r#"INSERT INTO community_module_refs (creation_id, creator_id, space_id, module_type, display_status)
                           VALUES ($1, $2, $3, $4, 'visible')
                           ON CONFLICT (creation_id, space_id, module_type) DO NOTHING"#,
                    )
                    .bind(creation.0)
                    .bind(user_id)
                    .bind(sid)
                    .bind(&req.module_type)
                    .execute(&self.pool)
                    .await;

                    if ref_result.map(|r| r.rows_affected()).unwrap_or(0) > 0 {
                        // 同步创建 posts
                        if let Err(e) = sqlx::query(
                            r#"INSERT INTO posts (space_id, module_type, author_id, title, body, content_type, tags, visibility, creation_id)
                               SELECT $1, $2, $3, $4, $5, 'text', $6, $7, $8
                               WHERE NOT EXISTS (SELECT 1 FROM posts WHERE creation_id = $8 AND space_id = $1 AND module_type = $2)"#,
                        )
                        .bind(sid)
                        .bind(&req.module_type)
                        .bind(user_id)
                        .bind(&req.title)
                        .bind(&markdown_body)
                        .bind(&tags)
                        .bind(&visibility)
                        .bind(creation.0)
                        .execute(&self.pool)
                        .await {
                            tracing::warn!("Failed to sync post for creation {} in space {}: {}", creation.0, sid, e);
                        }
                        // 更新社区帖子计数
                        if let Err(e) = sqlx::query("UPDATE spaces SET post_count = post_count + 1 WHERE id = $1")
                            .bind(sid)
                            .execute(&self.pool)
                            .await {
                            tracing::warn!("Failed to update post_count for space {}: {}", sid, e);
                        }
                        results.push(ns.clone());
                    }
                }
            }
            results
        } else {
            Vec::new()
        };

        Ok(serde_json::json!({
            "thread_id": thread_id,
            "creation_id": creation.0,
            "title": req.title,
            "body_preview": markdown_body.chars().take(300).collect::<String>(),
            "submitted_spaces": submitted_spaces,
        }))
    }

    /// 归档对话流
    pub async fn archive(&self, thread_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query(
            "UPDATE threads SET status = 'archived', updated_at = NOW() WHERE id = $1 AND creator_id = $2",
        )
        .bind(thread_id)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(AppError::not_found("对话流不存在".to_string()));
        }
        Ok(())
    }
}
