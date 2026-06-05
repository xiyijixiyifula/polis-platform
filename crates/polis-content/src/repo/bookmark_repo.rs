use polis_core::error::AppError;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct BookmarkRepo {
    pool: Arc<PgPool>,
}

impl BookmarkRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn toggle_bookmark(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
        )
        .bind(user_id)
        .bind(target_type)
        .bind(target_id)
        .fetch_optional(&*self.pool)
        .await?;

        if let Some(_) = existing {
            sqlx::query(
                "DELETE FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
            )
            .bind(user_id)
            .bind(target_type)
            .bind(target_id)
            .execute(&*self.pool)
            .await?;
            Ok(false)
        } else {
            sqlx::query(
                "INSERT INTO bookmarks (user_id, target_type, target_id) VALUES ($1, $2, $3)",
            )
            .bind(user_id)
            .bind(target_type)
            .bind(target_id)
            .execute(&*self.pool)
            .await?;
            Ok(true)
        }
    }

    pub async fn has_bookmarked(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let result = sqlx::query_scalar::<_, Option<i32>>(
            "SELECT 1 FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3",
        )
        .bind(user_id)
        .bind(target_type)
        .bind(target_id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(result.is_some())
    }

    pub async fn list_bookmarks(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;

        // 帖子收藏
        let post_rows = sqlx::query_as::<_, (String, String, String, String, String, i64, i64, i64, String, String, String, String, String, String, String, String,)>(
            r#"SELECT
                b.created_at::text as bm_created_at,
                p.id::text, p.title, LEFT(p.body, 200) as preview, p.content_type,
                p.comment_count, p.like_count, p.view_count,
                p.created_at::text,
                u.id::text, u.username, u.display_name, COALESCE(u.avatar_url, ''),
                s.id::text, s.namespace, s.title
            FROM bookmarks b
            JOIN posts p ON p.id = b.target_id AND b.target_type = 'post'
            LEFT JOIN users u ON u.id = p.author_id
            LEFT JOIN spaces s ON s.id = p.space_id
            WHERE b.user_id = $1 AND p.is_deleted = FALSE"#
        ).bind(user_id)
        .fetch_all(&*self.pool).await
        .map_err(|e| AppError::Internal(format!("bookmarks post query: {}", e)))?;

        // 视频收藏
        let video_rows = sqlx::query(
            r#"SELECT
                b.created_at::text as bm_created_at,
                v.id::text, v.title, COALESCE(v.description, '') as preview,
                v.comment_count, v.like_count, v.view_count,
                v.created_at::text,
                COALESCE(u.id::text, ''), COALESCE(u.username, ''), COALESCE(u.display_name, ''), COALESCE(u.avatar_url, ''),
                COALESCE(sv.space_id::text, ''), COALESCE(sp.namespace, ''), COALESCE(sp.title, ''),
                v.thumbnail_url
            FROM bookmarks b
            JOIN videos v ON v.id = b.target_id AND b.target_type = 'video'
            LEFT JOIN users u ON u.id = v.uploader_id
            LEFT JOIN LATERAL (SELECT space_id FROM space_videos WHERE video_id = v.id LIMIT 1) sv ON TRUE
            LEFT JOIN spaces sp ON sp.id = sv.space_id
            WHERE b.user_id = $1"#
        ).bind(user_id)
        .fetch_all(&*self.pool).await
        .map_err(|e| AppError::Internal(format!("bookmarks video query: {}", e)))?;

        use sqlx::Row;
        let mut items: Vec<(String, serde_json::Value)> = Vec::new();
        for r in &post_rows {
            let bm_ts = r.0.clone();
            items.push((bm_ts, serde_json::json!({
                "id": r.1,
                "type": "post",
                "module_type": r.4,
                "title": r.2,
                "preview": r.3,
                "content_type": r.4,
                "comment_count": r.5,
                "like_count": r.6,
                "view_count": r.7,
                "created_at": r.8,
                "author": {
                    "id": r.9,
                    "username": r.10,
                    "display_name": r.11,
                    "avatar_url": r.12
                },
                "space": {
                    "id": r.13,
                    "namespace": r.14,
                    "title": r.15
                }
            })));
        }
        for row in &video_rows {
            let bm_ts: String = row.try_get("bm_created_at").unwrap_or_default();
            let vid: String = row.try_get("id").unwrap_or_default();
            let title: String = row.try_get("title").unwrap_or_default();
            let preview: String = row.try_get("preview").unwrap_or_default();
            let comment_count: i64 = row.try_get("comment_count").unwrap_or(0);
            let like_count: i64 = row.try_get("like_count").unwrap_or(0);
            let view_count: i64 = row.try_get("view_count").unwrap_or(0);
            let created_at: String = row.try_get("created_at").unwrap_or_default();
            let author_id: String = row.try_get("id").unwrap_or_default();
            let author_username: String = row.try_get("username").unwrap_or_default();
            let author_display: String = row.try_get("display_name").unwrap_or_default();
            let author_avatar: String = row.try_get("avatar_url").unwrap_or_default();
            let space_id: String = row.try_get("space_id").unwrap_or_default();
            let space_ns: String = row.try_get("namespace").unwrap_or_default();
            let space_title: String = row.try_get("title").unwrap_or_default();
            let thumbnail_url: Option<String> = row.try_get("thumbnail_url").ok().flatten();

            items.push((bm_ts, serde_json::json!({
                "id": vid,
                "type": "video",
                "module_type": "video",
                "title": title,
                "preview": preview,
                "content_type": "video",
                "thumbnail_url": thumbnail_url,
                "comment_count": comment_count,
                "like_count": like_count,
                "view_count": view_count,
                "created_at": created_at,
                "author": {
                    "id": author_id,
                    "username": author_username,
                    "display_name": author_display,
                    "avatar_url": author_avatar
                },
                "space": if !space_id.is_empty() {
                    Some(serde_json::json!({
                        "id": space_id,
                        "namespace": space_ns,
                        "title": space_title
                    }))
                } else {
                    None
                }
            })));
        }

        items.sort_by(|a, b| b.0.cmp(&a.0));
        let paged: Vec<serde_json::Value> = items
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, item)| item)
            .collect();
        Ok(paged)
    }
}
