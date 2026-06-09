use polis_core::error::AppError;
use polis_core::events::Event;
use sqlx::PgPool;
use uuid::Uuid;

/// 内容聚合器
///
/// 监听所有社区的内容事件，将优质内容收录到根社区精选流。
/// 评分规则: 基于点赞数、评论数、浏览量的综合评分
#[derive(Clone)]
pub struct Aggregator {
    pool: PgPool,
}

impl Aggregator {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 处理内容创建事件
    pub async fn handle_post_created(&self, event: &Event) -> Result<(), AppError> {
        let post_id = event.payload["post_id"].as_str()
            .ok_or(AppError::validation("Missing post_id".to_string()))?;
        let space_id = event.payload["space_id"].as_str()
            .ok_or(AppError::validation("Missing space_id".to_string()))?;

        let post_uuid = Uuid::parse_str(post_id)
            .map_err(|_| AppError::validation("Invalid post_id".to_string()))?;
        let space_uuid = Uuid::parse_str(space_id)
            .map_err(|_| AppError::validation("Invalid space_id".to_string()))?;

        // 查找这个社区所属的根社区
        let root_id: Option<(Uuid,)> = sqlx::query_as(
            "SELECT root_space_id FROM spaces WHERE id = $1 AND root_space_id IS NOT NULL"
        )
        .bind(space_uuid)
        .fetch_optional(&self.pool)
        .await?;

        if let Some((root_space_id,)) = root_id {
            // 评估内容质量
            let score = self.calculate_score(post_uuid).await?;

            // 如果达到精选阈值，标记为精选
            if score >= 10.0 {
                sqlx::query("UPDATE posts SET is_featured = TRUE WHERE id = $1")
                    .bind(post_uuid)
                    .execute(&self.pool)
                    .await?;

                tracing::info!(
                    "Post {} featured in root space {} (score: {})",
                    post_id, root_space_id, score
                );
            }
        }

        Ok(())
    }

    /// 计算内容质量评分
    async fn calculate_score(&self, post_id: Uuid) -> Result<f64, AppError> {
        let stats: Option<(i64, i64, i64)> = sqlx::query_as(
            "SELECT like_count, comment_count, view_count FROM posts WHERE id = $1"
        )
        .bind(post_id)
        .fetch_optional(&self.pool)
        .await?;

        match stats {
            Some((likes, comments, views)) => {
                // 评分公式: likes * 2 + comments * 3 + log(views + 1) * 5
                let score = likes as f64 * 2.0
                    + comments as f64 * 3.0
                    + (views as f64 + 1.0).ln() * 5.0;
                Ok(score)
            }
            None => Ok(0.0),
        }
    }

    /// 获取根社区的精选内容
    pub async fn get_featured_posts(
        &self,
        root_slug: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"
            SELECT row_to_json(p.*) FROM posts p
            JOIN spaces s ON p.space_id = s.id
            WHERE (s.root_space_id = (SELECT id FROM spaces WHERE slug = $1 AND is_root = TRUE)
                   OR s.slug = $1)
              AND p.is_featured = TRUE
              AND p.is_deleted = FALSE
            ORDER BY p.like_count DESC, p.view_count DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(root_slug)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取根社区的热榜
    pub async fn get_trending_posts(
        &self,
        root_slug: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"
            SELECT row_to_json(p.*) FROM posts p
            JOIN spaces s ON p.space_id = s.id
            WHERE (s.root_space_id = (SELECT id FROM spaces WHERE slug = $1 AND is_root = TRUE)
                   OR s.slug = $1)
              AND p.is_deleted = FALSE
              AND p.created_at > NOW() - INTERVAL '7 days'
            ORDER BY (p.like_count * 2 + p.comment_count * 3 + p.view_count) DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(root_slug)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取关联的用户社区列表
    pub async fn get_sub_spaces(
        &self,
        root_slug: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"
            SELECT row_to_json(s.*) FROM spaces s
            WHERE s.root_space_id = (SELECT id FROM spaces WHERE slug = $1 AND is_root = TRUE)
              AND s.status = 'active'
            ORDER BY s.member_count DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(root_slug)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
