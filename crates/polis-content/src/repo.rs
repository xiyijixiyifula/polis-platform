use polis_core::error::AppError;
use polis_core::models::{Post, Comment, Pagination, UserPublic};
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

    pub async fn find_posts_by_space(
        &self,
        space_id: Uuid,
        page: u32,
        page_size: u32,
        module_type: Option<&str>,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let (posts, total) = if let Some(mt) = module_type {
            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public'",
            )
            .bind(space_id)
            .bind(mt)
            .fetch_one(&self.pool)
            .await?;

            let posts = sqlx::query_as::<_, Post>(
                "SELECT * FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $3 OFFSET $4",
            )
            .bind(space_id)
            .bind(mt)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            (posts, total.0 as u64)
        } else {
            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public'",
            )
            .bind(space_id)
            .fetch_one(&self.pool)
            .await?;

            let posts = sqlx::query_as::<_, Post>(
                "SELECT * FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $2 OFFSET $3",
            )
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

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn find_featured_posts(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        let posts = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE space_id = $1 AND is_featured = TRUE AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $2",
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
        let offset = ((page - 1) * page_size) as i64;
        let limit_i64 = page_size as i64;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', b.id, 'target_type', b.target_type, 'target_id', b.target_id, 'created_at', b.created_at,
                'post', CASE WHEN b.target_type = 'post' THEN
                    (SELECT json_build_object('id', p.id, 'title', p.title, 'created_at', p.created_at)
                     FROM posts p WHERE p.id = b.target_id)
                ELSE NULL END
            ) FROM bookmarks b WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(user_id).bind(limit_i64).bind(offset)
        .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== 举报 =====

    pub async fn create_report(&self, reporter_id: Uuid, target_type: &str, target_id: Uuid, reason: &str) -> Result<(), AppError> {
        sqlx::query("INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4)")
            .bind(reporter_id).bind(target_type).bind(target_id).bind(reason)
            .execute(&self.pool).await?;
        Ok(())
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

    pub async fn get_poll_results(&self, poll_id: Uuid) -> Result<serde_json::Value, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'label', label, 'vote_count', vote_count)
             FROM poll_options WHERE poll_id = $1 ORDER BY sort_order"
        ).bind(poll_id).fetch_all(&self.pool).await?;
        let options: Vec<serde_json::Value> = rows.into_iter().map(|r| r.0).collect();
        let total_votes: i64 = options.iter().map(|o| o["vote_count"].as_i64().unwrap_or(0)).sum();
        Ok(serde_json::json!({ "options": options, "total_votes": total_votes }))
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
    pub async fn find_users_batch(&self, user_ids: &[Uuid]) -> Result<HashMap<Uuid, UserPublic>, AppError> {
        if user_ids.is_empty() {
            return Ok(HashMap::new());
        }
        // sqlx doesn't support arrays directly for all PostgreSQL versions
        // Use a recursive query approach
        let rows = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, chrono::DateTime<chrono::Utc>)>(
            r#"SELECT id, username, display_name, avatar_url, COALESCE(bio, ''), verified, created_at FROM users WHERE id = ANY($1)"#
        )
        .bind(user_ids)
        .fetch_all(&self.pool)
        .await?;
        let mut map = HashMap::new();
        for (id, username, display_name, avatar_url, bio, verified, created_at) in rows {
            map.insert(id, UserPublic {
                id,
                username,
                display_name,
                avatar_url,
                bio,
                verified,
                created_at,
            });
        }
        Ok(map)
    }
}
