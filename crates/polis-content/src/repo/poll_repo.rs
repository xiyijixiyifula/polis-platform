use polis_core::error::AppError;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct PollRepo {
    pool: Arc<PgPool>,
}

impl PollRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn create_poll(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        title: &str,
        desc: &str,
        poll_type: &str,
        options: &[String],
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Uuid, AppError> {
        let poll_id: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO polls (space_id, author_id, title, description, poll_type, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"#,
        )
        .bind(space_id)
        .bind(author_id)
        .bind(title)
        .bind(desc)
        .bind(poll_type)
        .bind(expires_at)
        .fetch_one(&*self.pool)
        .await?;
        for (i, opt) in options.iter().enumerate() {
            sqlx::query(
                "INSERT INTO poll_options (poll_id, label, sort_order) VALUES ($1, $2, $3)",
            )
            .bind(poll_id.0)
            .bind(opt)
            .bind(i as i32)
            .execute(&*self.pool)
            .await?;
        }
        Ok(poll_id.0)
    }

    pub async fn vote_poll(
        &self,
        poll_id: Uuid,
        option_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| AppError::internal(e.to_string()))?;
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2",
        )
        .bind(poll_id)
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?;
        if existing.is_some() {
            return Err(AppError::forbidden("你已经投过票了".to_string()));
        }
        sqlx::query(
            "INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)",
        )
        .bind(poll_id)
        .bind(option_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
        sqlx::query("UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1")
            .bind(option_id)
            .execute(&mut *tx)
            .await?;
        tx.commit()
            .await
            .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(())
    }

    pub async fn list_polls_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let polls = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'poll_type', p.poll_type, 'author_id', p.author_id,
                'expires_at', p.expires_at, 'created_at', p.created_at,
                'options', COALESCE((
                    SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count) ORDER BY po.sort_order)
                    FROM poll_options po WHERE po.poll_id = p.id
                ), '[]'::json),
                'total_votes', COALESCE((
                    SELECT SUM(po2.vote_count) FROM poll_options po2 WHERE po2.poll_id = p.id
                ), 0)
            ) FROM polls p WHERE p.space_id = $1 ORDER BY p.created_at DESC"#,
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(polls.into_iter().map(|r| r.0).collect())
    }

    /// List all active polls across all spaces (for global polls page)
    pub async fn list_all_polls(
        &self,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'poll_type', p.poll_type, 'author_id', p.author_id,
                'expires_at', p.expires_at, 'created_at', p.created_at,
                'total_votes', COALESCE((SELECT SUM(po.vote_count) FROM poll_options po WHERE po.poll_id = p.id), 0),
                'space_id', p.space_id,
                'space_ns', s.namespace,
                'space_title', s.title
            ) FROM polls p
            JOIN spaces s ON s.id = p.space_id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2"#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn get_poll_results(
        &self,
        poll_id: Uuid,
    ) -> Result<serde_json::Value, AppError> {
        let row: Option<(serde_json::Value,)> = sqlx::query_as(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'options', COALESCE((
                    SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count) ORDER BY po.sort_order)
                    FROM poll_options po WHERE po.poll_id = p.id
                ), '[]'::json),
                'total_votes', COALESCE((
                    SELECT SUM(po2.vote_count) FROM poll_options po2 WHERE po2.poll_id = p.id
                ), 0)
            ) FROM polls p WHERE p.id = $1"#,
        )
        .bind(poll_id)
        .fetch_optional(&*self.pool)
        .await?;

        Ok(row.map(|r| r.0).unwrap_or(serde_json::json!({
            "id": poll_id.to_string(), "title": "", "options": [], "total_votes": 0
        })))
    }

    // ===== 通用投票 (赞同/反对) =====

    pub async fn vote(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        value: i16,
    ) -> Result<i16, AppError> {
        if value == 0 {
            sqlx::query(
                "DELETE FROM votes WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
            )
            .bind(user_id)
            .bind(target_type)
            .bind(target_id)
            .execute(&*self.pool)
            .await?;
            return Ok(0);
        }
        sqlx::query(
            r#"INSERT INTO votes (user_id, target_type, target_id, vote_value)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, target_type, target_id)
               DO UPDATE SET vote_value = $4"#,
        )
        .bind(user_id)
        .bind(target_type)
        .bind(target_id)
        .bind(value)
        .execute(&*self.pool)
        .await?;
        Ok(value)
    }

    pub async fn get_vote_score(
        &self,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<(i64, i64, i64), AppError> {
        let ups: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM votes WHERE target_type = $1 AND target_id = $2 AND vote_value = 1",
        )
        .bind(target_type)
        .bind(target_id)
        .fetch_one(&*self.pool)
        .await?;
        let downs: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM votes WHERE target_type = $1 AND target_id = $2 AND vote_value = -1",
        )
        .bind(target_type)
        .bind(target_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok((ups.0, downs.0, ups.0 - downs.0))
    }
}
