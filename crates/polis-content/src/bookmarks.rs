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

    /// 获取用户收藏（返回 Feed 风格数据）
    pub async fn list(&self, user_id: Uuid, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;
        limit.checked_add(0); // suppress unused warning
        let rows = sqlx::query_as::<_, (String, String, String, String, i64, i64, i64, String, String, String, String, String, String, String,)>(
            r#"SELECT
                p.id::text, p.title, LEFT(p.body, 200), p.content_type,
                p.comment_count, p.like_count, p.view_count,
                p.created_at::text,
                u.id::text, u.username, u.display_name, COALESCE(u.avatar_url, ''),
                s.id::text, s.namespace, s.title
            FROM bookmarks b
            JOIN posts p ON p.id = b.target_id AND b.target_type = 'post'
            LEFT JOIN users u ON u.id = p.author_id
            LEFT JOIN spaces s ON s.id = p.space_id
            WHERE b.user_id = $1 AND p.is_deleted = FALSE
            ORDER BY b.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(user_id).bind(page_size as i64).bind(offset)
        .fetch_all(&self.pool).await
        .map_err(|e| AppError::internal(format!("bookmarks list query: {}", e)))?;

        Ok(rows.into_iter().map(|r| {
            serde_json::json!({
                "id": r.0,
                "type": "post",
                "module_type": r.3,
                "title": r.1,
                "preview": r.2,
                "comment_count": r.4,
                "like_count": r.5,
                "view_count": r.6,
                "created_at": r.7,
                "author": {
                    "id": r.8,
                    "username": r.9,
                    "display_name": r.10,
                    "avatar_url": r.11
                },
                "space": {
                    "id": r.12,
                    "namespace": r.13,
                    "title": r.14
                }
            })
        }).collect())
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
