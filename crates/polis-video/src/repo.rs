use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

/// 视频数据库操作
pub struct VideoRepo {
    pool: PgPool,
}

impl VideoRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 创建视频记录
    pub async fn create(
        &self,
        space_id: Uuid,
        uploader_id: Uuid,
        title: &str,
        description: &str,
        original_url: &str,
        file_size: i64,
        duration_seconds: Option<i32>,
    ) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO videos (space_id, uploader_id, title, description, original_url, file_size, duration_seconds)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#,
        )
        .bind(space_id)
        .bind(uploader_id)
        .bind(title)
        .bind(description)
        .bind(original_url)
        .bind(file_size)
        .bind(duration_seconds)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    /// 更新转码状态
    pub async fn update_transcode_status(
        &self,
        video_id: Uuid,
        hls_url: &str,
        thumbnail_url: Option<&str>,
        resolutions: &serde_json::Value,
        status: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE videos
            SET hls_url = $2, thumbnail_url = $3, resolutions = $4, status = $5
            WHERE id = $1
            "#,
        )
        .bind(video_id)
        .bind(hls_url)
        .bind(thumbnail_url)
        .bind(resolutions)
        .bind(status)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// 获取视频
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<serde_json::Value>, AppError> {
        let row = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(videos.*) FROM videos WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| r.0))
    }

    /// 获取社区视频列表
    pub async fn find_by_space(
        &self,
        space_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(v.*) FROM videos v WHERE v.space_id = $1 ORDER BY v.created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(space_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
