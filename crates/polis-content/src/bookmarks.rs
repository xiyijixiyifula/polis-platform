//! 书签管理 + 举报管理
use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

pub struct BookmarkRepo {
    pool: PgPool,
}

impl BookmarkRepo {
    pub fn new(pool: PgPool) -> Self { Self { pool } }

    /// 切换书签 (添加/取消)
    pub async fn toggle(&self, user_id: Uuid, target_type: &str, target_id: Uuid) -> Result<bool, AppError> {
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3"
        ).bind(user_id).bind(target_type).bind(target_id)
        .fetch_optional(&self.pool).await?;

        if existing.is_some() {
            sqlx::query("DELETE FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3")
                .bind(user_id).bind(target_type).bind(target_id)
                .execute(&self.pool).await?;
            Ok(false) // 取消收藏
        } else {
            sqlx::query("INSERT INTO bookmarks (user_id, target_type, target_id) VALUES ($1, $2, $3)")
                .bind(user_id).bind(target_type).bind(target_id)
                .execute(&self.pool).await?;
            Ok(true) // 添加收藏
        }
    }

    /// 获取用户收藏
    pub async fn list(&self, user_id: Uuid, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', b.id, 'target_type', b.target_type, 'target_id', b.target_id, 'created_at', b.created_at,
                'post', CASE WHEN b.target_type = 'post' THEN
                    (SELECT json_build_object('id', p.id, 'title', p.title, 'created_at', p.created_at)
                     FROM posts p WHERE p.id = b.target_id)
                ELSE NULL END
            ) FROM bookmarks b WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(user_id).bind(limit).bind(offset)
        .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}

pub struct ReportRepo {
    pool: PgPool,
}

impl ReportRepo {
    pub fn new(pool: PgPool) -> Self { Self { pool } }

    /// 提交举报
    pub async fn create(&self, reporter_id: Uuid, target_type: &str, target_id: Uuid, reason: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4)"
        ).bind(reporter_id).bind(target_type).bind(target_id).bind(reason)
        .execute(&self.pool).await?;
        Ok(())
    }
}
