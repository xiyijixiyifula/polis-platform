use polis_core::error::AppError;
use polis_core::models::{Post, Series};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct SeriesRepo {
    pool: Arc<PgPool>,
}

impl SeriesRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_series(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        title: &str,
        description: &str,
        cover_url: Option<&str>,
        visibility: &str,
    ) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO series (space_id, author_id, title, description, cover_url, visibility) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(space_id)
        .bind(author_id)
        .bind(title)
        .bind(description)
        .bind(cover_url)
        .bind(visibility)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update_series(
        &self,
        series_id: Uuid,
        user_id: Uuid,
        title: Option<&str>,
        description: Option<&str>,
        cover_url: Option<&str>,
        visibility: Option<&str>,
        is_published: Option<bool>,
        sort_order: Option<i32>,
    ) -> Result<(), AppError> {
        let existing: (Uuid,) = sqlx::query_as("SELECT author_id FROM series WHERE id = $1")
            .bind(series_id)
            .fetch_one(&*self.pool)
            .await
            .map_err(|_| AppError::not_found("Series not found".to_string()))?;
        if existing.0 != user_id {
            return Err(AppError::forbidden("Not the series owner".to_string()));
        }
        sqlx::query(
            "UPDATE series SET title = COALESCE($2, title), description = COALESCE($3, description), cover_url = COALESCE($4, cover_url), visibility = COALESCE($5, visibility), is_published = COALESCE($6, is_published), sort_order = COALESCE($7, sort_order), updated_at = NOW() WHERE id = $1",
        )
        .bind(series_id)
        .bind(title)
        .bind(description)
        .bind(cover_url)
        .bind(visibility)
        .bind(is_published)
        .bind(sort_order)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_series(
        &self,
        series_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let existing: (Uuid,) = sqlx::query_as("SELECT author_id FROM series WHERE id = $1")
            .bind(series_id)
            .fetch_one(&*self.pool)
            .await
            .map_err(|_| AppError::not_found("Series not found".to_string()))?;
        if existing.0 != user_id {
            return Err(AppError::forbidden("Not the series owner".to_string()));
        }
        sqlx::query("DELETE FROM series_posts WHERE series_id = $1")
            .bind(series_id)
            .execute(&*self.pool)
            .await?;
        sqlx::query("DELETE FROM series WHERE id = $1")
            .bind(series_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_series_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<Series>, AppError> {
        let series = sqlx::query_as::<_, Series>(
            "SELECT id, space_id, author_id, title, description, cover_url, visibility, is_published, post_count, sort_order, created_at, updated_at FROM series WHERE space_id = $1 AND is_published = TRUE ORDER BY sort_order ASC, created_at DESC",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(series)
    }

    pub async fn get_series(&self, series_id: Uuid) -> Result<Series, AppError> {
        sqlx::query_as::<_, Series>("SELECT id, space_id, author_id, title, description, cover_url, visibility, is_published, post_count, sort_order, created_at, updated_at FROM series WHERE id = $1")
            .bind(series_id)
            .fetch_one(&*self.pool)
            .await
            .map_err(|_| AppError::not_found("Series not found".to_string()))
    }

    pub async fn add_post_to_series(
        &self,
        series_id: Uuid,
        post_id: Uuid,
        sort_order: i32,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO series_posts (series_id, post_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (series_id, post_id) DO UPDATE SET sort_order = $3",
        )
        .bind(series_id)
        .bind(post_id)
        .bind(sort_order)
        .execute(&*self.pool)
        .await?;
        sqlx::query("UPDATE series SET post_count = (SELECT COUNT(*) FROM series_posts WHERE series_id = $1), updated_at = NOW() WHERE id = $1")
            .bind(series_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_post_from_series(
        &self,
        series_id: Uuid,
        post_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM series_posts WHERE series_id = $1 AND post_id = $2")
            .bind(series_id)
            .bind(post_id)
            .execute(&*self.pool)
            .await?;
        sqlx::query("UPDATE series SET post_count = (SELECT COUNT(*) FROM series_posts WHERE series_id = $1), updated_at = NOW() WHERE id = $1")
            .bind(series_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_series_posts(&self, series_id: Uuid) -> Result<Vec<Post>, AppError> {
        let posts = sqlx::query_as::<_, Post>(
            "SELECT p.* FROM posts p INNER JOIN series_posts sp ON p.id = sp.post_id WHERE sp.series_id = $1 AND p.is_deleted = FALSE AND p.hidden_by_owner = FALSE ORDER BY sp.sort_order ASC, sp.created_at ASC",
        )
        .bind(series_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(posts)
    }
}
