use polis_core::error::AppError;
use polis_core::models::{Post, Comment, Pagination, UserPublic, Series, SpaceTier, Subscription, DirectMessage};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

pub struct ContentRepo {
    pool: PgPool,
}

impl ContentRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ===== 帖子 =====

    pub async fn create_post(
        &self,
        space_id: Uuid,
        module_type: &str,
        author_id: Uuid,
        title: &str,
        body: &str,
        content_type: &str,
        tags: &serde_json::Value,
        visibility: &str,
    ) -> Result<Post, AppError> {
        let post = sqlx::query_as::<_, Post>(
            r#"
            INSERT INTO posts (space_id, module_type, author_id, title, body, content_type, tags, visibility)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(space_id)
        .bind(module_type)
        .bind(author_id)
        .bind(title)
        .bind(body)
        .bind(content_type)
        .bind(tags)
        .bind(visibility)
        .fetch_one(&self.pool)
        .await?;
        Ok(post)
    }

    pub async fn find_post_by_id(&self, id: Uuid) -> Result<Option<Post>, AppError> {
        let post = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE id = $1 AND is_deleted = FALSE",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(post)
    }

    pub async fn find_posts_by_author(
        &self,
        author_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM posts WHERE author_id = $1 AND is_deleted = FALSE"
        )
        .bind(author_id)
        .fetch_one(&self.pool)
        .await?;
        let posts = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE author_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(author_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        let total_pages = (total.0 as f64 / page_size as f64).ceil() as u32;
        Ok((posts, Pagination { page, page_size, total: total.0 as u64, total_pages }))
    }

    pub async fn find_posts_by_space(
        &self,
        space_id: Uuid,
        page: u32,
        page_size: u32,
        module_type: Option<&str>,
        sort: Option<&str>,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        // Determine ORDER BY clause: default newest, supports 'views' and 'likes'
        let order_clause = match sort {
            Some("views") => "ORDER BY is_pinned DESC, view_count DESC, created_at DESC",
            Some("likes") => "ORDER BY is_pinned DESC, like_count DESC, created_at DESC",
            _ => "ORDER BY is_pinned DESC, created_at DESC",
        };

        let (posts, total) = if let Some(mt) = module_type {
            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'",
            )
            .bind(space_id)
            .bind(mt)
            .fetch_one(&self.pool)
            .await?;

            let query_str = format!(
                "SELECT * FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' {} LIMIT $3 OFFSET $4",
                order_clause
            );
            let posts = sqlx::query_as::<_, Post>(&query_str)
            .bind(space_id)
            .bind(mt)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            (posts, total.0 as u64)
        } else {
            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'",
            )
            .bind(space_id)
            .fetch_one(&self.pool)
            .await?;

            let query_str = format!(
                "SELECT * FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' {} LIMIT $2 OFFSET $3",
                order_clause
            );
            let posts = sqlx::query_as::<_, Post>(&query_str)
            .bind(space_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            (posts, total.0 as u64)
        };

        let total_pages = (total as f64 / page_size as f64).ceil() as u32;
        Ok((
            posts,
            Pagination {
                page,
                page_size,
                total,
                total_pages,
            },
        ))
    }

    pub async fn update_post(
        &self,
        id: Uuid,
        title: Option<&str>,
        body: Option<&str>,
        tags: Option<&serde_json::Value>,
        visibility: Option<&str>,
    ) -> Result<Post, AppError> {
        let post = sqlx::query_as::<_, Post>(
            r#"
            UPDATE posts
            SET title = COALESCE($2, title),
                body = COALESCE($3, body),
                tags = COALESCE($4, tags),
                visibility = COALESCE($5, visibility),
                updated_at = NOW()
            WHERE id = $1 AND is_deleted = FALSE
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(title)
        .bind(body)
        .bind(tags)
        .bind(visibility)
        .fetch_one(&self.pool)
        .await?;
        Ok(post)
    }

    pub async fn hide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET hidden_by_owner = TRUE WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn unhide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET hidden_by_owner = FALSE WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn toggle_pin(&self, post_id: Uuid) -> Result<bool, AppError> {
        let row: (bool,) = sqlx::query_as(
            "UPDATE posts SET is_pinned = NOT is_pinned, updated_at = NOW() WHERE id = $1 RETURNING is_pinned"
        )
        .bind(post_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn toggle_featured(&self, post_id: Uuid) -> Result<bool, AppError> {
        let row: (bool,) = sqlx::query_as(
            "UPDATE posts SET is_featured = NOT is_featured, updated_at = NOW() WHERE id = $1 RETURNING is_featured"
        )
        .bind(post_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<i64, AppError> {
        let row: (i64,) = sqlx::query_as(
            "UPDATE posts SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count",
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn find_featured_posts(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        let posts = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE space_id = $1 AND is_featured = TRUE AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY created_at DESC LIMIT $2",
        )
        .bind(space_id)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(posts)
    }

    // ===== 评论 =====

    pub async fn create_comment(
        &self,
        post_id: Uuid,
        author_id: Uuid,
        body: &str,
        parent_id: Option<Uuid>,
    ) -> Result<Comment, AppError> {
        let comment = sqlx::query_as::<_, Comment>(
            r#"
            INSERT INTO comments (post_id, author_id, body, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(post_id)
        .bind(author_id)
        .bind(body)
        .bind(parent_id)
        .fetch_one(&self.pool)
        .await?;

        sqlx::query("UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;

        Ok(comment)
    }

    pub async fn find_comments_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<Comment>, AppError> {
        let comments = sqlx::query_as::<_, Comment>(
            "SELECT * FROM comments WHERE post_id = $1 AND is_deleted = FALSE ORDER BY created_at ASC",
        )
        .bind(post_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(comments)
    }

    pub async fn delete_comment(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE comments SET is_deleted = TRUE WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ===== 点赞 =====

    pub async fn toggle_like(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM likes WHERE target_type = $1 AND target_id = $2 AND user_id = $3",
        )
        .bind(target_type)
        .bind(target_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(_) = existing {
            // 取消点赞
            sqlx::query("DELETE FROM likes WHERE target_type = $1 AND target_id = $2 AND user_id = $3")
                .bind(target_type)
                .bind(target_id)
                .bind(user_id)
                .execute(&self.pool)
                .await?;

            // 递减计数
            self.decrement_like_count(target_type, target_id).await?;
            Ok(false)
        } else {
            // 点赞
            sqlx::query(
                "INSERT INTO likes (target_type, target_id, user_id) VALUES ($1, $2, $3)",
            )
            .bind(target_type)
            .bind(target_id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

            self.increment_like_count(target_type, target_id).await?;
            Ok(true)
        }
    }

    async fn increment_like_count(&self, target_type: &str, target_id: Uuid) -> Result<(), AppError> {
        match target_type {
            "post" => {
                sqlx::query("UPDATE posts SET like_count = like_count + 1 WHERE id = $1")
                    .bind(target_id)
                    .execute(&self.pool)
                    .await?;
            }
            "comment" => {
                sqlx::query("UPDATE comments SET like_count = like_count + 1 WHERE id = $1")
                    .bind(target_id)
                    .execute(&self.pool)
                    .await?;
            }
            _ => {}
        }
        Ok(())
    }

    async fn decrement_like_count(&self, target_type: &str, target_id: Uuid) -> Result<(), AppError> {
        match target_type {
            "post" => {
                sqlx::query("UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1")
                    .bind(target_id)
                    .execute(&self.pool)
                    .await?;
            }
            "comment" => {
                sqlx::query("UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1")
                    .bind(target_id)
                    .execute(&self.pool)
                    .await?;
            }
            _ => {}
        }
        Ok(())
    }

    pub async fn has_liked(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let result = sqlx::query_scalar::<_, Option<i32>>(
            "SELECT 1 FROM likes WHERE target_type = $1 AND target_id = $2 AND user_id = $3",
        )
        .bind(target_type)
        .bind(target_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result.is_some())
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
        .fetch_optional(&self.pool)
        .await?;
        Ok(result.is_some())
    }

    // ===== 书签 =====

    pub async fn toggle_bookmark(&self, user_id: Uuid, target_type: &str, target_id: Uuid) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3"
        ).bind(user_id).bind(target_type).bind(target_id)
        .fetch_optional(&self.pool).await?;

        if let Some(_) = existing {
            sqlx::query("DELETE FROM bookmarks WHERE user_id = $1 AND target_type = $2 AND target_id = $3")
                .bind(user_id).bind(target_type).bind(target_id)
                .execute(&self.pool).await?;
            Ok(false)
        } else {
            sqlx::query("INSERT INTO bookmarks (user_id, target_type, target_id) VALUES ($1, $2, $3)")
                .bind(user_id).bind(target_type).bind(target_id)
                .execute(&self.pool).await?;
            Ok(true)
        }
    }

    pub async fn list_bookmarks(&self, user_id: Uuid, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let rows = sqlx::query_as::<_, (String, String, String, String, i64, i64, i64, String, String, String, String, String, String, String, String,)>(
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
        .map_err(|e| AppError::Internal(format!("bookmarks list query: {}", e)))?;

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

    /// 获取用户点赞的帖子（Feed 风格数据）
    pub async fn list_liked_posts(&self, user_id: Uuid, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let rows = sqlx::query_as::<_, (String, String, String, String, i64, i64, i64, String, String, String, String, String, String, String, String,)>(
            r#"SELECT
                p.id::text, p.title, LEFT(p.body, 200), p.content_type,
                p.comment_count, p.like_count, p.view_count,
                p.created_at::text,
                u.id::text, u.username, u.display_name, COALESCE(u.avatar_url, ''),
                s.id::text, s.namespace, s.title
            FROM likes l
            JOIN posts p ON p.id = l.target_id AND l.target_type = 'post'
            LEFT JOIN users u ON u.id = p.author_id
            LEFT JOIN spaces s ON s.id = p.space_id
            WHERE l.user_id = $1 AND p.is_deleted = FALSE
            ORDER BY l.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(user_id).bind(page_size as i64).bind(offset)
        .fetch_all(&self.pool).await
        .map_err(|e| AppError::Internal(format!("liked posts query: {}", e)))?;

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

    // ===== 举报 =====

    pub async fn create_report(&self, reporter_id: Uuid, target_type: &str, target_id: Uuid, reason: &str) -> Result<Uuid, AppError> {
        let (id,): (Uuid,) = sqlx::query_as(
            "INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4) RETURNING id"
        )
            .bind(reporter_id).bind(target_type).bind(target_id).bind(reason)
            .fetch_one(&self.pool).await?;
        Ok(id)
    }

    // ===== 投票 (赞同/反对) =====

    pub async fn vote(&self, user_id: Uuid, target_type: &str, target_id: Uuid, value: i16) -> Result<i16, AppError> {
        if value == 0 {
            sqlx::query("DELETE FROM votes WHERE user_id = $1 AND target_type = $2 AND target_id = $3")
                .bind(user_id).bind(target_type).bind(target_id)
                .execute(&self.pool).await?;
            return Ok(0);
        }
        sqlx::query(
            r#"INSERT INTO votes (user_id, target_type, target_id, vote_value)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, target_type, target_id)
               DO UPDATE SET vote_value = $4"#
        ).bind(user_id).bind(target_type).bind(target_id).bind(value)
        .execute(&self.pool).await?;
        Ok(value)
    }

    pub async fn get_vote_score(&self, target_type: &str, target_id: Uuid) -> Result<(i64, i64, i64), AppError> {
        let ups: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM votes WHERE target_type = $1 AND target_id = $2 AND vote_value = 1"
        ).bind(target_type).bind(target_id).fetch_one(&self.pool).await?;
        let downs: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM votes WHERE target_type = $1 AND target_id = $2 AND vote_value = -1"
        ).bind(target_type).bind(target_id).fetch_one(&self.pool).await?;
        Ok((ups.0, downs.0, ups.0 - downs.0))
    }

    // ===== 社区投票/问卷 =====

    pub async fn create_poll(&self, space_id: Uuid, author_id: Uuid, title: &str, desc: &str,
        poll_type: &str, options: &[String], expires_at: Option<chrono::DateTime<chrono::Utc>>) -> Result<Uuid, AppError> {
        let poll_id: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO polls (space_id, author_id, title, description, poll_type, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"#
        ).bind(space_id).bind(author_id).bind(title).bind(desc).bind(poll_type).bind(expires_at)
        .fetch_one(&self.pool).await?;
        for (i, opt) in options.iter().enumerate() {
            sqlx::query("INSERT INTO poll_options (poll_id, label, sort_order) VALUES ($1, $2, $3)")
                .bind(poll_id.0).bind(opt).bind(i as i32)
                .execute(&self.pool).await?;
        }
        Ok(poll_id.0)
    }

    pub async fn vote_poll(&self, poll_id: Uuid, option_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2"
        ).bind(poll_id).bind(user_id).fetch_optional(&self.pool).await?;
        if existing.is_some() {
            return Err(AppError::Forbidden("你已经投过票了".to_string()));
        }
        sqlx::query("INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)")
            .bind(poll_id).bind(option_id).bind(user_id)
            .execute(&self.pool).await?;
        sqlx::query("UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1")
            .bind(option_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn list_polls_by_space(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let polls = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'poll_type', p.poll_type, 'author_id', p.author_id,
                'expires_at', p.expires_at, 'created_at', p.created_at,
                'options', COALESCE((
                    SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count) ORDER BY po.sort_order)
                    FROM poll_options po WHERE po.poll_id = p.id
                ), '[]'::json),
                'total_votes', COALESCE((
                    SELECT SUM(po2.vote_count) FROM poll_options po2 WHERE po2.poll_id = p.id
                ), 0)
            ) FROM polls p WHERE p.space_id = $1 ORDER BY p.created_at DESC"#
        ).bind(space_id).fetch_all(&self.pool).await?;
        Ok(polls.into_iter().map(|r| r.0).collect())
    }

    /// List all active polls across all spaces (for global polls page)
    pub async fn list_all_polls(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'poll_type', p.poll_type, 'author_id', p.author_id,
                'expires_at', p.expires_at, 'created_at', p.created_at,
                'total_votes', COALESCE((SELECT SUM(po.vote_count) FROM poll_options po WHERE po.poll_id = p.id), 0),
                'space_id', p.space_id,
                'space_ns', s.namespace,
                'space_title', s.title
            ) FROM polls p
            JOIN spaces s ON s.id = p.space_id
            WHERE p.status = 'active'
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2"#
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn get_poll_results(&self, poll_id: Uuid) -> Result<serde_json::Value, AppError> {
        // Get poll info (id, title) with options in single query
        let row: Option<(serde_json::Value,)> = sqlx::query_as(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title, 'description', p.description,
                'options', COALESCE((
                    SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count) ORDER BY po.sort_order)
                    FROM poll_options po WHERE po.poll_id = p.id
                ), '[]'::json),
                'total_votes', COALESCE((
                    SELECT SUM(po2.vote_count) FROM poll_options po2 WHERE po2.poll_id = p.id
                ), 0)
            ) FROM polls p WHERE p.id = $1"#
        ).bind(poll_id).fetch_optional(&self.pool).await?;

        Ok(row.map(|r| r.0).unwrap_or(serde_json::json!({
            "id": poll_id.to_string(), "title": "", "options": [], "total_votes": 0
        })))
    }

    // ===== 草稿 =====

    pub async fn save_draft(&self, user_id: Uuid, space_id: Option<Uuid>, title: &str, body: &str, module_type: &str, tags: &serde_json::Value) -> Result<Uuid, AppError> {
        // UPSERT by user_id + COALESCE on update
        let existing: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM drafts WHERE user_id = $1 AND space_id IS NOT DISTINCT FROM $2 ORDER BY updated_at DESC LIMIT 1")
            .bind(user_id).bind(space_id).fetch_optional(&self.pool).await?;
        if let Some((did,)) = existing {
            sqlx::query("UPDATE drafts SET title = $1, body = $2, module_type = $3, tags = $4, updated_at = NOW() WHERE id = $5")
                .bind(title).bind(body).bind(module_type).bind(tags).bind(did)
                .execute(&self.pool).await?;
            Ok(did)
        } else {
            let id: (Uuid,) = sqlx::query_as(
                "INSERT INTO drafts (user_id, space_id, title, body, module_type, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
            ).bind(user_id).bind(space_id).bind(title).bind(body).bind(module_type).bind(tags)
            .fetch_one(&self.pool).await?;
            Ok(id.0)
        }
    }

    pub async fn list_drafts(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'title', title, 'body', body, 'module_type', module_type, 'tags', tags, 'updated_at', updated_at)
             FROM drafts WHERE user_id = $1 ORDER BY updated_at DESC"
        ).bind(user_id).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== 公告 =====

    pub async fn create_announcement(&self, space_id: Uuid, author_id: Uuid, title: &str, body: &str, importance: &str) -> Result<Uuid, AppError> {
        let id: (Uuid,) = sqlx::query_as(
            "INSERT INTO announcements (space_id, author_id, title, body, importance) VALUES ($1, $2, $3, $4, $5) RETURNING id"
        ).bind(space_id).bind(author_id).bind(title).bind(body).bind(importance)
        .fetch_one(&self.pool).await?;
        Ok(id.0)
    }

    pub async fn list_announcements(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'title', title, 'body', body, 'importance', importance, 'is_pinned', is_pinned, 'created_at', created_at)
             FROM announcements WHERE space_id = $1 ORDER BY is_pinned DESC, created_at DESC LIMIT 10"
        ).bind(space_id).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 批量查询用户信息

    /// 搜索帖子（按标题和正文模糊匹配，或按标签搜索）
    pub async fn search_posts(&self, query: Option<&str>, tag: Option<&str>, limit: u32) -> Result<Vec<Post>, AppError> {
        if let Some(t) = tag {
            // 按标签搜索
            let tag_json = serde_json::json!([t]);
            let posts = sqlx::query_as::<_, Post>(
                "SELECT * FROM posts WHERE is_deleted = FALSE AND visibility = 'public' AND tags @> $1::jsonb ORDER BY created_at DESC LIMIT $2",
            )
            .bind(&tag_json)
            .bind(limit as i64)
            .fetch_all(&self.pool)
            .await?;
            return Ok(posts);
        }
        let q = query.unwrap_or("");
        let pattern = format!("%{}%", q);
        let posts = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE is_deleted = FALSE AND visibility = 'public' AND (title ILIKE $1 OR body ILIKE $1) ORDER BY created_at DESC LIMIT $2",
        )
        .bind(&pattern)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(posts)
    }

    pub async fn find_users_batch(&self, user_ids: &[Uuid]) -> Result<HashMap<Uuid, UserPublic>, AppError> {
        if user_ids.is_empty() {
            return Ok(HashMap::new());
        }
        // sqlx doesn't support arrays directly for all PostgreSQL versions
        // Use a recursive query approach
        let rows = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, serde_json::Value, chrono::DateTime<chrono::Utc>)>(
            r#"SELECT id, username, display_name, avatar_url, COALESCE(bio, ''), verified, COALESCE(notification_prefs, '{}'::jsonb), created_at FROM users WHERE id = ANY($1)"#
        )
        .bind(user_ids)
        .fetch_all(&self.pool)
        .await?;
        let mut map = HashMap::new();
        for (id, username, display_name, avatar_url, bio, verified, notification_prefs, created_at) in rows {
            map.insert(id, UserPublic {
                id,
                username,
                display_name,
                avatar_url,
                bio,
                verified,
                notification_prefs,
                created_at,
            });
        }
        Ok(map)
    }

    // ===== File Sharing =====

    pub async fn create_file_record(&self, space_id: Uuid, uploader_id: Uuid, filename: &str, file_size: i64, mime_type: &str, storage_path: &str) -> Result<Uuid, AppError> {
        let id: (Uuid,) = sqlx::query_as(
            "INSERT INTO file_shares (space_id, uploader_id, filename, file_size, mime_type, storage_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
        ).bind(space_id).bind(uploader_id).bind(filename).bind(file_size).bind(mime_type).bind(storage_path)
        .fetch_one(&self.pool).await?;
        Ok(id.0)
    }

    pub async fn list_files_by_space(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'filename', filename, 'file_size', file_size, 'mime_type', mime_type, 'download_count', download_count, 'created_at', created_at) FROM file_shares WHERE space_id = $1 AND is_folder = FALSE ORDER BY created_at DESC LIMIT 100"
        ).bind(space_id).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn get_file_by_id(&self, file_id: Uuid) -> Result<(Uuid, String, i64, String, String), AppError> {
        sqlx::query_as(
            "SELECT id, filename, file_size, mime_type, storage_path FROM file_shares WHERE id = $1"
        ).bind(file_id).fetch_one(&self.pool).await
        .map_err(|_| AppError::NotFound("File not found".to_string()))
    }

    pub async fn create_share_link(&self, file_id: Uuid, code: &str, password: Option<&str>, expires_at: Option<chrono::DateTime<chrono::Utc>>, max_downloads: Option<i32>) -> Result<serde_json::Value, AppError> {
        let row: (serde_json::Value,) = sqlx::query_as(
            "INSERT INTO share_links (file_id, code, password, expires_at, max_downloads) VALUES ($1, $2, $3, $4, $5) RETURNING json_build_object('id', id, 'code', code, 'password', password, 'expires_at', expires_at, 'is_active', is_active)"
        ).bind(file_id).bind(code).bind(password).bind(expires_at).bind(max_downloads)
        .fetch_one(&self.pool).await?;
        Ok(row.0)
    }

    pub async fn get_share_link_by_code(&self, code: &str) -> Result<(Uuid, Uuid, Option<String>, Option<chrono::DateTime<chrono::Utc>>, Option<i32>, i32, bool), AppError> {
        sqlx::query_as(
            "SELECT id, file_id, password, expires_at, max_downloads, download_count, is_active FROM share_links WHERE code = $1"
        ).bind(code).fetch_one(&self.pool).await
        .map_err(|_| AppError::NotFound("Share link not found".to_string()))
    }


    // ===== 专栏/内容系列 =====

    // ===== 付费社区（会员等级） =====

    pub async fn list_tiers(&self, space_id: Uuid) -> Result<Vec<SpaceTier>, AppError> {
        let tiers = sqlx::query_as::<_, SpaceTier>(
            "SELECT * FROM space_tiers WHERE space_id = $1 AND is_active = TRUE ORDER BY sort_order"
        ).bind(space_id).fetch_all(&self.pool).await?;
        Ok(tiers)
    }

    pub async fn get_tier(&self, tier_id: Uuid) -> Result<SpaceTier, AppError> {
        let tier = sqlx::query_as::<_, SpaceTier>(
            "SELECT * FROM space_tiers WHERE id = $1"
        ).bind(tier_id).fetch_one(&self.pool).await?;
        Ok(tier)
    }

    pub async fn create_tier(&self, space_id: Uuid, name: &str, price_cents: i64, currency: &str, description: &str, benefits: &serde_json::Value, sort_order: i32) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO space_tiers (space_id, name, price_cents, currency, description, benefits, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id"
        ).bind(space_id).bind(name).bind(price_cents).bind(currency).bind(description).bind(benefits).bind(sort_order).fetch_one(&self.pool).await?;
        Ok(row.0)
    }

    pub async fn update_tier(&self, tier_id: Uuid, space_id: Uuid, name: Option<&str>, price_cents: Option<i64>, description: Option<&str>, benefits: Option<&serde_json::Value>, sort_order: Option<i32>, is_active: Option<bool>) -> Result<(), AppError> {
        let current = self.get_tier(tier_id).await?;
        if current.space_id != space_id {
            return Err(AppError::Forbidden("Tier does not belong to this space".to_string()));
        }
        let name = name.unwrap_or(&current.name);
        let price_cents = price_cents.unwrap_or(current.price_cents);
        let description = description.unwrap_or(&current.description);
        let benefits = benefits.unwrap_or(&current.benefits);
        let sort_order = sort_order.unwrap_or(current.sort_order);
        let is_active = is_active.unwrap_or(current.is_active);
        sqlx::query(
            "UPDATE space_tiers SET name=$1, price_cents=$2, description=$3, benefits=$4, sort_order=$5, is_active=$6, updated_at=NOW() WHERE id=$7"
        ).bind(name).bind(price_cents).bind(description).bind(benefits).bind(sort_order).bind(is_active).bind(tier_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_tier(&self, tier_id: Uuid, space_id: Uuid) -> Result<(), AppError> {
        let current = self.get_tier(tier_id).await?;
        if current.space_id != space_id {
            return Err(AppError::Forbidden("Tier does not belong to this space".to_string()));
        }
        // Check if any active subscriptions exist
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM subscriptions WHERE tier_id = $1 AND status = 'active'"
        ).bind(tier_id).fetch_one(&self.pool).await?;
        if count.0 > 0 {
            return Err(AppError::Conflict("Cannot delete tier with active subscriptions".to_string()));
        }
        sqlx::query("DELETE FROM space_tiers WHERE id = $1").bind(tier_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn subscribe(&self, space_id: Uuid, user_id: Uuid, tier_id: Uuid) -> Result<Uuid, AppError> {
        // Verify tier belongs to space
        let tier = self.get_tier(tier_id).await?;
        if tier.space_id != space_id {
            return Err(AppError::Forbidden("Tier does not belong to this space".to_string()));
        }
        // Upsert subscription
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO subscriptions (space_id, user_id, tier_id, status, started_at) VALUES ($1, $2, $3, 'active', NOW()) ON CONFLICT (space_id, user_id, tier_id) WHERE status = 'active' DO UPDATE SET status = 'active', started_at = NOW(), updated_at = NOW() RETURNING id"
        ).bind(space_id).bind(user_id).bind(tier_id).fetch_one(&self.pool).await?;
        Ok(row.0)
    }

    pub async fn cancel_subscription(&self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE space_id = $1 AND user_id = $2 AND status = 'active'"
        ).bind(space_id).bind(user_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_user_subscription(&self, space_id: Uuid, user_id: Uuid) -> Result<Option<Subscription>, AppError> {
        let sub = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE space_id = $1 AND user_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1"
        ).bind(space_id).bind(user_id).fetch_optional(&self.pool).await?;
        Ok(sub)
    }

    pub async fn create_series(&self, space_id: Uuid, author_id: Uuid, title: &str, description: &str, cover_url: Option<&str>, visibility: &str) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO series (space_id, author_id, title, description, cover_url, visibility) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
        ).bind(space_id).bind(author_id).bind(title).bind(description).bind(cover_url).bind(visibility)
        .fetch_one(&self.pool).await?;
        Ok(row.0)
    }

    pub async fn update_series(&self, series_id: Uuid, user_id: Uuid, title: Option<&str>, description: Option<&str>, cover_url: Option<&str>, visibility: Option<&str>, is_published: Option<bool>, sort_order: Option<i32>) -> Result<(), AppError> {
        let existing: (Uuid,) = sqlx::query_as("SELECT author_id FROM series WHERE id = $1")
            .bind(series_id).fetch_one(&self.pool).await
            .map_err(|_| AppError::NotFound("Series not found".to_string()))?;
        if existing.0 != user_id {
            return Err(AppError::Forbidden("Not the series owner".to_string()));
        }
        sqlx::query(
            "UPDATE series SET title = COALESCE($2, title), description = COALESCE($3, description), cover_url = COALESCE($4, cover_url), visibility = COALESCE($5, visibility), is_published = COALESCE($6, is_published), sort_order = COALESCE($7, sort_order), updated_at = NOW() WHERE id = $1"
        ).bind(series_id).bind(title).bind(description).bind(cover_url).bind(visibility).bind(is_published).bind(sort_order)
        .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_series(&self, series_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let existing: (Uuid,) = sqlx::query_as("SELECT author_id FROM series WHERE id = $1")
            .bind(series_id).fetch_one(&self.pool).await
            .map_err(|_| AppError::NotFound("Series not found".to_string()))?;
        if existing.0 != user_id {
            return Err(AppError::Forbidden("Not the series owner".to_string()));
        }
        sqlx::query("DELETE FROM series_posts WHERE series_id = $1").bind(series_id).execute(&self.pool).await?;
        sqlx::query("DELETE FROM series WHERE id = $1").bind(series_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn list_series_by_space(&self, space_id: Uuid) -> Result<Vec<Series>, AppError> {
        let series = sqlx::query_as::<_, Series>(
            "SELECT * FROM series WHERE space_id = $1 AND is_published = TRUE ORDER BY sort_order ASC, created_at DESC"
        ).bind(space_id).fetch_all(&self.pool).await?;
        Ok(series)
    }

    pub async fn get_series(&self, series_id: Uuid) -> Result<Series, AppError> {
        sqlx::query_as::<_, Series>("SELECT * FROM series WHERE id = $1")
            .bind(series_id).fetch_one(&self.pool).await
            .map_err(|_| AppError::NotFound("Series not found".to_string()))
    }

    pub async fn add_post_to_series(&self, series_id: Uuid, post_id: Uuid, sort_order: i32) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO series_posts (series_id, post_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (series_id, post_id) DO UPDATE SET sort_order = $3"
        ).bind(series_id).bind(post_id).bind(sort_order).execute(&self.pool).await?;
        sqlx::query("UPDATE series SET post_count = (SELECT COUNT(*) FROM series_posts WHERE series_id = $1), updated_at = NOW() WHERE id = $1")
            .bind(series_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn remove_post_from_series(&self, series_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM series_posts WHERE series_id = $1 AND post_id = $2")
            .bind(series_id).bind(post_id).execute(&self.pool).await?;
        sqlx::query("UPDATE series SET post_count = (SELECT COUNT(*) FROM series_posts WHERE series_id = $1), updated_at = NOW() WHERE id = $1")
            .bind(series_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn list_series_posts(&self, series_id: Uuid) -> Result<Vec<Post>, AppError> {
        let posts = sqlx::query_as::<_, Post>(
            "SELECT p.* FROM posts p INNER JOIN series_posts sp ON p.id = sp.post_id WHERE sp.series_id = $1 AND p.is_deleted = FALSE AND p.hidden_by_owner = FALSE ORDER BY sp.sort_order ASC, sp.created_at ASC"
        ).bind(series_id).fetch_all(&self.pool).await?;
        Ok(posts)
    }


    /// Get unified feed across all spaces (posts + polls + announcements)
    pub async fn get_feed(&self, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, u64), AppError> {
        // 先获取总数
        let post_total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'"
        ).fetch_one(&self.pool).await?;
        let poll_total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM polls WHERE status = 'active'"
        ).fetch_one(&self.pool).await?;
        let ann_total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM announcements"
        ).fetch_one(&self.pool).await?;
        let total = (post_total + poll_total + ann_total) as u64;

        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;
        let posts = sqlx::query_as::<_, (Uuid, Uuid, String, Uuid, String, String, String, i64, i64, i64, chrono::DateTime<chrono::Utc>,)>(
            "SELECT p.id, p.space_id, p.module_type, p.author_id, p.title, LEFT(p.body, 200), p.content_type, p.comment_count, p.like_count, p.view_count, p.created_at FROM posts p WHERE p.is_deleted = FALSE AND p.hidden_by_owner = FALSE AND p.visibility = 'public' ORDER BY p.created_at DESC LIMIT $1 OFFSET $2"
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        let polls = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, chrono::DateTime<chrono::Utc>,)>(
            "SELECT id, space_id, author_id, title, COALESCE(description, ''), created_at FROM polls WHERE status = 'active' ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        let announcements = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, chrono::DateTime<chrono::Utc>,)>(
            "SELECT id, space_id, author_id, title, LEFT(body, 200), importance, created_at FROM announcements ORDER By created_at DESC LIMIT $1 OFFSET $2"
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        let mut user_ids: Vec<Uuid> = Vec::new();
        let mut space_ids: Vec<Uuid> = Vec::new();
        for (_, sid, _, aid, _, _, _, _, _, _, _) in &posts { user_ids.push(*aid); space_ids.push(*sid); }
        for (_, sid, aid, _, _, _) in &polls { user_ids.push(*aid); space_ids.push(*sid); }
        for (_, sid, aid, _, _, _, _) in &announcements { user_ids.push(*aid); space_ids.push(*sid); }
        let users = self.find_users_batch(&user_ids).await?;
        let spaces = self.find_spaces_batch(&space_ids).await?;
        let mut items: Vec<serde_json::Value> = Vec::new();
        for (id, space_id, module_type, author_id, title, body_preview, _content_type, comment_count, like_count, view_count, created_at) in &posts {
            let author = users.get(author_id).map(|u| serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url}));
            let space_info = spaces.get(space_id);
            items.push(serde_json::json!({"id": id, "type": "post", "module_type": module_type, "title": title, "preview": body_preview, "comment_count": comment_count, "like_count": like_count, "view_count": view_count, "created_at": created_at, "author": author, "space": space_info}));
        }
        for (id, space_id, author_id, title, desc, created_at) in &polls {
            let author = users.get(author_id).map(|u| serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url}));
            let space_info = spaces.get(space_id);
            items.push(serde_json::json!({"id": id, "type": "poll", "module_type": "poll", "title": title, "preview": desc, "comment_count": 0, "like_count": 0, "view_count": 0, "created_at": created_at, "author": author, "space": space_info}));
        }
        for (id, space_id, author_id, title, body_preview, importance, created_at) in &announcements {
            let author = users.get(author_id).map(|u| serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url}));
            let space_info = spaces.get(space_id);
            items.push(serde_json::json!({"id": id, "type": "announcement", "module_type": "announcement", "title": title, "preview": body_preview, "importance": importance, "comment_count": 0, "like_count": 0, "view_count": 0, "created_at": created_at, "author": author, "space": space_info}));
        }
        items.sort_by(|a, b| {
            let ta = a["created_at"].as_str().unwrap_or("");
            let tb = b["created_at"].as_str().unwrap_or("");
            tb.cmp(ta)
        });
        let paged: Vec<serde_json::Value> = items.into_iter().take(page_size as usize).collect();
        Ok((paged, total))
    }

    /// Batch query space info by IDs
    pub async fn find_spaces_batch(&self, space_ids: &[Uuid]) -> Result<HashMap<Uuid, serde_json::Value>, AppError> {
        if space_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let mut map = HashMap::new();
        let rows = sqlx::query_as::<_, (Uuid, String, String, String)>(
            "SELECT id, namespace, title, description FROM spaces WHERE id = ANY($1)"
        ).bind(space_ids.to_vec()).fetch_all(&self.pool).await?;
        for (id, namespace, title, description) in rows {
            map.insert(id, serde_json::json!({"id": id, "namespace": namespace, "title": title, "description": description}));
        }
        Ok(map)
    }
    pub async fn increment_share_download(&self, link_id: Uuid, file_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE share_links SET download_count = download_count + 1 WHERE id = $1")
            .bind(link_id).execute(&self.pool).await?;
        sqlx::query("UPDATE file_shares SET download_count = download_count + 1 WHERE id = $1")
            .bind(file_id).execute(&self.pool).await?;
        Ok(())
    }

    // ===== 私信 (Direct Messages) =====

    pub async fn send_direct_message(&self, sender_id: Uuid, receiver_id: Uuid, content: &str) -> Result<DirectMessage, AppError> {
        let msg = sqlx::query_as::<_, DirectMessage>(
            "INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *"
        )
        .bind(sender_id)
        .bind(receiver_id)
        .bind(content)
        .fetch_one(&self.pool)
        .await?;
        Ok(msg)
    }

    pub async fn get_conversations(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, serde_json::Value, chrono::DateTime<chrono::Utc>, String, chrono::DateTime<chrono::Utc>, i64)>(
            r#"SELECT
                u.id, u.username, u.display_name, u.avatar_url, COALESCE(u.bio, ''),
                u.verified, COALESCE(u.notification_prefs, '{}'::jsonb), u.created_at,
                dm.content, dm.created_at as last_msg_at,
                COALESCE(unread.cnt, 0) as unread
            FROM (
                SELECT DISTINCT ON (
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
                )
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_id,
                    content,
                    created_at
                FROM direct_messages
                WHERE sender_id = $1 OR receiver_id = $1
                ORDER BY
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END,
                    created_at DESC
            ) dm
            JOIN users u ON u.id = dm.other_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as cnt
                FROM direct_messages dm2
                WHERE dm2.sender_id = dm.other_id
                  AND dm2.receiver_id = $1
                  AND dm2.is_read = false
            ) unread ON true
            ORDER BY dm.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to get conversations: {}", e)))?;

        Ok(rows.into_iter().map(|(id, username, display_name, avatar_url, bio, verified, notification_prefs, created_at, last_message, last_message_at, unread_count)| {
            serde_json::json!({
                "other_user": {
                    "id": id,
                    "username": username,
                    "display_name": display_name,
                    "avatar_url": avatar_url,
                    "bio": bio,
                    "verified": verified,
                    "notification_prefs": notification_prefs,
                    "created_at": created_at,
                },
                "last_message": last_message,
                "last_message_at": last_message_at,
                "unread_count": unread_count,
            })
        }).collect())
    }

    pub async fn get_conversation_messages(&self, user_id: Uuid, other_user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<DirectMessage>, AppError> {
        let msgs = sqlx::query_as::<_, DirectMessage>(
            "SELECT * FROM direct_messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        )
        .bind(user_id)
        .bind(other_user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        Ok(msgs)
    }

    pub async fn mark_messages_read(&self, user_id: Uuid, from_user_id: Uuid) -> Result<i64, AppError> {
        let result = sqlx::query_as::<_, (i64,)>(
            "WITH updated AS (UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false RETURNING 1) SELECT COUNT(*)::BIGINT FROM updated"
        )
        .bind(user_id)
        .bind(from_user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(result.0)
    }

    pub async fn get_unread_dm_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND is_read = false"
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(count.0)
    }

    pub async fn get_space_analytics(&self, space_id: Uuid) -> Result<serde_json::Value, AppError> {
        // Total visible posts (not deleted AND not hidden by owner)
        let total_posts: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE"
        ).bind(space_id).fetch_one(&self.pool).await?;

        // Total views across all posts (CAST SUM result to BIGINT)
        let total_views: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(view_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE"
        ).bind(space_id).fetch_one(&self.pool).await?;

        // Total likes across all posts
        let total_likes: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(like_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE"
        ).bind(space_id).fetch_one(&self.pool).await?;

        // Total comments across all posts
        let total_comments: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(comment_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE"
        ).bind(space_id).fetch_one(&self.pool).await?;

        // Top 5 most viewed posts (visible only)
        let top_viewed = sqlx::query_as::<_, (Uuid, String, i64, i64)>(
            "SELECT id, title, view_count, like_count FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY view_count DESC LIMIT 5"
        ).bind(space_id).fetch_all(&self.pool).await?;

        // Top 5 most liked posts (visible only)
        let top_liked = sqlx::query_as::<_, (Uuid, String, i64, i64)>(
            "SELECT id, title, like_count, view_count FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY like_count DESC LIMIT 5"
        ).bind(space_id).fetch_all(&self.pool).await?;

        // Poll and series counts
        let poll_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM polls WHERE space_id = $1"
        ).bind(space_id).fetch_one(&self.pool).await?;

        let series_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM series WHERE space_id = $1"
        ).bind(space_id).fetch_one(&self.pool).await?;

        let top_viewed_json: Vec<_> = top_viewed.iter().map(|(id, title, vc, lc)| {
            serde_json::json!({"id": id, "title": title, "view_count": vc, "like_count": lc})
        }).collect();

        let top_liked_json: Vec<_> = top_liked.iter().map(|(id, title, lc, vc)| {
            serde_json::json!({"id": id, "title": title, "like_count": lc, "view_count": vc})
        }).collect();

        Ok(serde_json::json!({
            "space_id": space_id,
            "total_posts": total_posts.0,
            "total_views": total_views.0.unwrap_or(0),
            "total_likes": total_likes.0.unwrap_or(0),
            "total_comments": total_comments.0.unwrap_or(0),
            "poll_count": poll_count.0,
            "series_count": series_count.0,
            "top_viewed_posts": top_viewed_json,
            "top_liked_posts": top_liked_json,
        }))
    }

}
