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
            .map_err(|e| AppError::internal(e.to_string()))?;

        let comment = sqlx::query_as::<_, Comment>(
            r#"
            INSERT INTO comments (post_id, author_id, body, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, post_id, author_id, parent_id, body, is_deleted, is_pinned, like_count, created_at
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
            .map_err(|e| AppError::internal(e.to_string()))?;

        Ok(comment)
    }

    pub async fn find_comments_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<Comment>, AppError> {
        let comments = sqlx::query_as::<_, Comment>(
            "SELECT id, post_id, author_id, parent_id, body, is_deleted, is_pinned, like_count, created_at FROM comments WHERE post_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC",
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
            "SELECT id, post_id, author_id, parent_id, body, is_deleted, is_pinned, like_count, created_at FROM comments WHERE id = $1 AND is_deleted = FALSE",
        )
        .bind(id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(c)
    }

    /// List all non-deleted comments on posts authored by `author_id`, ordered by newest.
    ///
    /// # SQL injection safety
    /// Column names in this query are static strings — no user input is interpolated
    /// into SQL identifiers. All values are passed via parameterized `$N` binds.
    pub async fn find_comments_by_post_author(
        &self,
        author_id: Uuid,
        post_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Comment>, i64), AppError> {
        if let Some(pid) = post_id {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id \
                 WHERE c.is_deleted = FALSE AND p.author_id = $1 AND c.post_id = $2",
            )
            .bind(author_id)
            .bind(pid)
            .fetch_one(&*self.pool)
            .await?;

            let comments = sqlx::query_as::<_, Comment>(
                "SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id \
                 WHERE c.is_deleted = FALSE AND p.author_id = $1 AND c.post_id = $2 \
                 ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT $3 OFFSET $4",
            )
            .bind(author_id)
            .bind(pid)
            .bind(limit)
            .bind(offset)
            .fetch_all(&*self.pool)
            .await?;

            Ok((comments, count.0))
        } else {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id \
                 WHERE c.is_deleted = FALSE AND p.author_id = $1",
            )
            .bind(author_id)
            .fetch_one(&*self.pool)
            .await?;

            let comments = sqlx::query_as::<_, Comment>(
                "SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id \
                 WHERE c.is_deleted = FALSE AND p.author_id = $1 \
                 ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT $2 OFFSET $3",
            )
            .bind(author_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&*self.pool)
            .await?;

            Ok((comments, count.0))
        }
    }
}
