use polis_core::error::AppError;
use polis_core::models::Comment;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct CommentRepo {
    pool: Arc<PgPool>,
}

impl CommentRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn create_comment(
        &self,
        post_id: Uuid,
        author_id: Uuid,
        body: &str,
        parent_id: Option<Uuid>,
    ) -> Result<Comment, AppError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let comment = sqlx::query_as::<_, Comment>(
            r#"
            INSERT INTO comments (post_id, author_id, body, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(post_id)
        .bind(author_id)
        .bind(body)
        .bind(parent_id)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query("UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1")
            .bind(post_id)
            .execute(&mut *tx)
            .await?;

        tx.commit()
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(comment)
    }

    pub async fn find_comments_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<Comment>, AppError> {
        let comments = sqlx::query_as::<_, Comment>(
            "SELECT * FROM comments WHERE post_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC",
        )
        .bind(post_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(comments)
    }

    pub async fn delete_comment(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE comments SET is_deleted = TRUE WHERE id = $1")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn toggle_comment_pin(&self, id: Uuid) -> Result<bool, AppError> {
        let row = sqlx::query_as::<_, (bool,)>(
            "UPDATE comments SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING is_pinned",
        )
        .bind(id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn find_comment_by_id(&self, id: Uuid) -> Result<Option<Comment>, AppError> {
        let c = sqlx::query_as::<_, Comment>(
            "SELECT * FROM comments WHERE id = $1 AND is_deleted = FALSE",
        )
        .bind(id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(c)
    }

    /// List all non-deleted comments on posts authored by `author_id`, ordered by newest
    pub async fn find_comments_by_post_author(
        &self,
        author_id: Uuid,
        post_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Comment>, i64), AppError> {
        let mut conditions =
            vec!["c.is_deleted = FALSE".to_string(), "p.author_id = $1".to_string()];
        if let Some(pid) = post_id {
            conditions.push(format!("c.post_id = '{}'::uuid", pid));
        }
        let where_clause = conditions.join(" AND ");

        let count: (i64,) = sqlx::query_as(&format!(
            "SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id WHERE {}",
            where_clause
        ))
        .bind(author_id)
        .fetch_one(&*self.pool)
        .await?;

        let comments = sqlx::query_as::<_, Comment>(&format!(
            "SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id WHERE {} ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT $2 OFFSET $3",
            where_clause
        ))
        .bind(author_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;

        Ok((comments, count.0))
    }
}
