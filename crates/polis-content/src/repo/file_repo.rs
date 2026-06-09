use polis_core::error::AppError;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct FileRepo {
    pool: Arc<PgPool>,
}

impl FileRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn create_file_record(
        &self,
        space_id: Uuid,
        uploader_id: Uuid,
        filename: &str,
        file_size: i64,
        mime_type: &str,
        storage_path: &str,
    ) -> Result<Uuid, AppError> {
        let id: (Uuid,) = sqlx::query_as(
            "INSERT INTO file_shares (space_id, uploader_id, filename, file_size, mime_type, storage_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(space_id)
        .bind(uploader_id)
        .bind(filename)
        .bind(file_size)
        .bind(mime_type)
        .bind(storage_path)
        .fetch_one(&*self.pool)
        .await?;
        Ok(id.0)
    }

    pub async fn list_files_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'filename', filename, 'file_size', file_size, 'mime_type', mime_type, 'download_count', download_count, 'created_at', created_at) FROM file_shares WHERE space_id = $1 AND is_folder = FALSE ORDER BY created_at DESC LIMIT 100",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn get_file_by_id(
        &self,
        file_id: Uuid,
    ) -> Result<(Uuid, String, i64, String, String), AppError> {
        sqlx::query_as(
            "SELECT id, filename, file_size, mime_type, storage_path FROM file_shares WHERE id = $1",
        )
        .bind(file_id)
        .fetch_one(&*self.pool)
        .await
        .map_err(|_| AppError::not_found("File not found".to_string()))
    }

    pub async fn create_share_link(
        &self,
        file_id: Uuid,
        code: &str,
        password: Option<&str>,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
        max_downloads: Option<i32>,
    ) -> Result<serde_json::Value, AppError> {
        let row: (serde_json::Value,) = sqlx::query_as(
            "INSERT INTO share_links (file_id, code, password, expires_at, max_downloads) VALUES ($1, $2, $3, $4, $5) RETURNING json_build_object('id', id, 'code', code, 'password', password, 'expires_at', expires_at, 'is_active', is_active)",
        )
        .bind(file_id)
        .bind(code)
        .bind(password)
        .bind(expires_at)
        .bind(max_downloads)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn get_share_link_by_code(
        &self,
        code: &str,
    ) -> Result<
        (
            Uuid,
            Uuid,
            Option<String>,
            Option<chrono::DateTime<chrono::Utc>>,
            Option<i32>,
            i32,
            bool,
        ),
        AppError,
    > {
        sqlx::query_as(
            "SELECT id, file_id, password, expires_at, max_downloads, download_count, is_active FROM share_links WHERE code = $1",
        )
        .bind(code)
        .fetch_one(&*self.pool)
        .await
        .map_err(|_| AppError::not_found("Share link not found".to_string()))
    }

    pub async fn increment_share_download(
        &self,
        link_id: Uuid,
        file_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query("UPDATE share_links SET download_count = download_count + 1 WHERE id = $1")
            .bind(link_id)
            .execute(&*self.pool)
            .await?;
        sqlx::query("UPDATE file_shares SET download_count = download_count + 1 WHERE id = $1")
            .bind(file_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }
}
