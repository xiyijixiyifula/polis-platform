use polis_core::error::AppError;
use polis_core::models::{Hashtag, Pagination, Post};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct HashtagRepo {
    pool: Arc<PgPool>,
}

impl HashtagRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn upsert_hashtag(&self, tag: &str, normalized: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO hashtags (tag, normalized_tag) VALUES ($1, $2) ON CONFLICT (normalized_tag) DO UPDATE SET post_count = hashtags.post_count + 1, total_use_count = hashtags.total_use_count + 1, last_used_at = now()",
        )
        .bind(tag)
        .bind(normalized)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn create_hashtag_mapping(
        &self,
        normalized_tag: &str,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<(), AppError> {
        let hashtag_id: Option<Uuid> =
            sqlx::query_scalar("SELECT id FROM hashtags WHERE normalized_tag = $1")
                .bind(normalized_tag)
                .fetch_optional(&*self.pool)
                .await?;
        if let Some(hid) = hashtag_id {
            sqlx::query(
                "INSERT INTO hashtag_mappings (hashtag_id, target_type, target_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            )
            .bind(hid)
            .bind(target_type)
            .bind(target_id)
            .execute(&*self.pool)
            .await?;
        }
        Ok(())
    }

    pub async fn get_trending_hashtags(&self, limit: i64) -> Result<Vec<Hashtag>, AppError> {
        sqlx::query_as::<_, Hashtag>(
            "SELECT id, tag, normalized_tag, post_count, creation_count, total_use_count, last_used_at, created_at FROM hashtags ORDER BY total_use_count DESC, last_used_at DESC LIMIT $1",
        )
        .bind(limit)
        .fetch_all(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn get_posts_by_hashtag(
        &self,
        normalized_tag: &str,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let posts = sqlx::query_as::<_, Post>(
            "SELECT p.* FROM posts p JOIN hashtag_mappings hm ON p.id = hm.target_id JOIN hashtags h ON hm.hashtag_id = h.id WHERE h.normalized_tag = $1 AND p.is_deleted = false AND hm.target_type = 'post' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(normalized_tag)
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts p JOIN hashtag_mappings hm ON p.id = hm.target_id JOIN hashtags h ON hm.hashtag_id = h.id WHERE h.normalized_tag = $1 AND p.is_deleted = false",
        )
        .bind(normalized_tag)
        .fetch_one(&*self.pool)
        .await?;
        let total_pages = ((total as f64) / (page_size as f64)).ceil() as u32;
        Ok((
            posts,
            Pagination {
                page,
                page_size,
                total: total as u64,
                total_pages,
            },
        ))
    }
}
