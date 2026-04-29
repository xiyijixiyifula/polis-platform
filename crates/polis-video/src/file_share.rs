//! 文件分享（百度网盘风格）
use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;
use rand::Rng;

pub struct FileShareRepo {
    pool: PgPool,
}

impl FileShareRepo {
    pub fn new(pool: PgPool) -> Self { Self { pool } }

    /// 生成分享码
    fn generate_code() -> String {
        let mut rng = rand::thread_rng();
        let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".chars().collect();
        (0..8).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
    }

    /// 创建分享链接
    pub async fn create_share_link(&self, file_id: Uuid, password: Option<&str>, expires_hours: Option<i32>, max_downloads: Option<i32>) -> Result<serde_json::Value, AppError> {
        let code = Self::generate_code();
        let expires_at = expires_hours.map(|h| chrono::Utc::now() + chrono::Duration::hours(h as i64));

        let link_id: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO share_links (file_id, code, password, expires_at, max_downloads)
               VALUES ($1, $2, $3, $4, $5) RETURNING id"#
        ).bind(file_id).bind(&code).bind(password).bind(expires_at).bind(max_downloads)
        .fetch_one(&self.pool).await?;

        Ok(serde_json::json!({
            "id": link_id.0,
            "code": code,
            "url": format!("/share/{}", code),
            "password": password,
            "expires_at": expires_at,
            "max_downloads": max_downloads,
        }))
    }

    /// 通过分享码获取文件
    pub async fn get_by_share_code(&self, code: &str, password: Option<&str>) -> Result<serde_json::Value, AppError> {
        let link = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', sl.id, 'code', sl.code, 'password', sl.password,
                'expires_at', sl.expires_at, 'max_downloads', sl.max_downloads,
                'download_count', sl.download_count, 'is_active', sl.is_active,
                'file', (SELECT json_build_object('id', f.id, 'filename', f.filename, 'file_size', f.file_size, 'mime_type', f.mime_type)
                         FROM file_shares f WHERE f.id = sl.file_id)
            ) FROM share_links sl WHERE sl.code = $1"#
        ).bind(code).fetch_optional(&self.pool).await?
        .ok_or(AppError::NotFound("分享链接不存在或已失效".to_string()))?;

        let data = link.0;
        // 验证密码
        if let Some(stored_pwd) = data["password"].as_str() {
            if !stored_pwd.is_empty() {
                if password.is_none() || password.unwrap_or("") != stored_pwd {
                    return Err(AppError::Forbidden("提取码错误".to_string()));
                }
            }
        }
        // 检查过期
        if let Some(expires) = data["expires_at"].as_str() {
            if let Ok(t) = chrono::DateTime::parse_from_rfc3339(expires) {
                if t < chrono::Utc::now() {
                    return Err(AppError::Forbidden("分享链接已过期".to_string()));
                }
            }
        }
        // 增加下载计数
        sqlx::query("UPDATE share_links SET download_count = download_count + 1 WHERE code = $1")
            .bind(code).execute(&self.pool).await?;

        Ok(data)
    }

    /// 文件上传记录
    pub async fn record_file(&self, space_id: Uuid, uploader_id: Uuid, filename: &str, file_size: i64, mime_type: &str, storage_path: &str) -> Result<Uuid, AppError> {
        let id: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO file_shares (space_id, uploader_id, filename, file_size, mime_type, storage_path)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"#
        ).bind(space_id).bind(uploader_id).bind(filename).bind(file_size).bind(mime_type).bind(storage_path)
        .fetch_one(&self.pool).await?;
        Ok(id.0)
    }

    /// 获取社区文件列表
    pub async fn list_files(&self, space_id: Uuid, folder_id: Option<Uuid>, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let rows = if let Some(fid) = folder_id {
            sqlx::query_as::<_, (serde_json::Value,)>(
                "SELECT json_build_object('id', id, 'filename', filename, 'file_size', file_size, 'mime_type', mime_type, 'download_count', download_count, 'created_at', created_at)
                 FROM file_shares WHERE space_id = $1 AND parent_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            ).bind(space_id).bind(fid).bind(page_size as i64).bind(offset).fetch_all(&self.pool).await?
        } else {
            sqlx::query_as::<_, (serde_json::Value,)>(
                "SELECT json_build_object('id', id, 'filename', filename, 'file_size', file_size, 'mime_type', mime_type, 'download_count', download_count, 'created_at', created_at)
                 FROM file_shares WHERE space_id = $1 AND parent_id IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            ).bind(space_id).bind(page_size as i64).bind(offset).fetch_all(&self.pool).await?
        };
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
