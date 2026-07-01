use polis_core::error::AppError;
use polis_core::models::{
    CommunityEvent, EditorPick, Pagination, Post, PostReference, User, UserPublic, WeeklyTopic,
};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

pub struct PostRepo {
    pool: Arc<PgPool>,
}

impl PostRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    // ===== 帖子 CRUD =====

    #[allow(clippy::too_many_arguments)]
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
        password_hash: Option<&str>,
    ) -> Result<Post, AppError> {
        let post = sqlx::query_as::<_, Post>(
            r#"
            INSERT INTO posts (space_id, module_type, author_id, title, body, content_type, tags, visibility, password_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at
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
        .bind(password_hash)
        .fetch_one(&*self.pool)
        .await?;
        Ok(post)
    }

    pub async fn find_post_by_id(&self, id: Uuid) -> Result<Option<Post>, AppError> {
        let post = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE id = $1 AND is_deleted = FALSE",
        )
        .bind(id)
        .fetch_optional(&*self.pool)
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
            "SELECT COUNT(*) FROM posts WHERE author_id = $1 AND is_deleted = FALSE",
        )
        .bind(author_id)
        .fetch_one(&*self.pool)
        .await?;
        let posts = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE author_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(author_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;
        let total_pages = (total.0 as f64 / page_size as f64).ceil() as u32;
        Ok((
            posts,
            Pagination {
                page,
                page_size,
                total: total.0 as u64,
                total_pages,
            },
        ))
    }

    pub async fn find_posts_by_space(
        &self,
        space_id: Uuid,
        page: u32,
        page_size: u32,
        module_type: Option<&str>,
        sort: Option<&str>,
        include_hidden: bool,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let (posts, total): (Vec<Post>, i64) = match (module_type, sort, include_hidden) {
            (Some(mt), Some("views"), false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, view_count DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (Some(mt), Some("likes"), false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, like_count DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (Some(mt), _, false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, Some("views"), false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, view_count DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, Some("likes"), false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, like_count DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, _, false) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            // include_hidden = true variations
            (Some(mt), Some("views"), true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, view_count DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (Some(mt), Some("likes"), true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, like_count DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (Some(mt), _, true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).bind(mt).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND module_type = $2 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $3 OFFSET $4")
                    .bind(space_id).bind(mt).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, Some("views"), true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, view_count DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, Some("likes"), true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, like_count DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
            (None, _, true) => {
                let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public'")
                    .bind(space_id).fetch_one(&*self.pool).await?;
                let posts = sqlx::query_as::<_, Post>("SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND visibility = 'public' ORDER BY is_pinned DESC, created_at DESC LIMIT $2 OFFSET $3")
                    .bind(space_id).bind(limit).bind(offset).fetch_all(&*self.pool).await?;
                (posts, total.0)
            },
        };

        let total_pages = (total as f64 / page_size as f64).ceil() as u32;
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

    pub async fn update_post(
        &self,
        id: Uuid,
        title: Option<&str>,
        body: Option<&str>,
        tags: Option<&serde_json::Value>,
        visibility: Option<&str>,
        password_hash: Option<&str>,
    ) -> Result<Post, AppError> {
        let post = sqlx::query_as::<_, Post>(
            r#"
            UPDATE posts
            SET title = COALESCE($2, title),
                body = COALESCE($3, body),
                tags = COALESCE($4, tags),
                visibility = COALESCE($5, visibility),
                password_hash = COALESCE($6, password_hash),
                updated_at = NOW()
            WHERE id = $1 AND is_deleted = FALSE
            RETURNING id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(title)
        .bind(body)
        .bind(tags)
        .bind(visibility)
        .bind(password_hash)
        .fetch_one(&*self.pool)
        .await?;
        Ok(post)
    }

    /// 验证帖子分享密码（使用 Argon2 哈希验证）
    pub async fn verify_post_password(
        &self,
        post_id: Uuid,
        password: &str,
    ) -> Result<Option<Post>, AppError> {
        use argon2::{password_hash::PasswordHash, Argon2, PasswordVerifier};
        let post = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE id = $1 AND is_deleted = FALSE",
        )
        .bind(post_id)
        .fetch_optional(&*self.pool)
        .await?;

        if let Some(ref p) = post {
            if let Some(ref hash) = p.password_hash {
                let _parsed = PasswordHash::new(hash)
                    .map_err(|e| AppError::internal(format!("Password hash error: {}", e)))?;
                let pwd3 = password.to_string();
                let hash3 = hash.to_string();
                let verified3 = tokio::task::spawn_blocking(move || {
                    let parsed = PasswordHash::new(&hash3).map_err(|_| ())?;
                    Argon2::default()
                        .verify_password(pwd3.as_bytes(), &parsed)
                        .map_err(|_| ())
                })
                .await
                .is_ok();
                if !verified3 {
                    return Ok(None);
                }
            }
        }
        Ok(post)
    }

    pub async fn hide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET hidden_by_owner = TRUE WHERE id = $1")
            .bind(post_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn unhide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET hidden_by_owner = FALSE WHERE id = $1")
            .bind(post_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn toggle_pin(&self, post_id: Uuid) -> Result<bool, AppError> {
        let row: (bool,) = sqlx::query_as(
            "UPDATE posts SET is_pinned = NOT is_pinned, updated_at = NOW() WHERE id = $1 RETURNING is_pinned",
        )
        .bind(post_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn toggle_featured(&self, post_id: Uuid) -> Result<bool, AppError> {
        let row: (bool,) = sqlx::query_as(
            "UPDATE posts SET is_featured = NOT is_featured, updated_at = NOW() WHERE id = $1 RETURNING is_featured",
        )
        .bind(post_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<i64, AppError> {
        let row: (i64,) = sqlx::query_as(
            "UPDATE posts SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count",
        )
        .bind(id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn find_featured_posts(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        let posts = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE space_id = $1 AND is_featured = TRUE AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY created_at DESC LIMIT $2",
        )
        .bind(space_id)
        .bind(limit as i64)
        .fetch_all(&*self.pool)
        .await?;
        Ok(posts)
    }

    // ===== 搜索 =====

    pub async fn search_posts(
        &self,
        query: Option<&str>,
        tag: Option<&str>,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        if let Some(t) = tag {
            let tag_json = serde_json::json!([t]);
            let posts = sqlx::query_as::<_, Post>(
                "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE is_deleted = FALSE AND visibility = 'public' AND tags @> $1::jsonb ORDER BY created_at DESC LIMIT $2",
            )
            .bind(&tag_json)
            .bind(limit as i64)
            .fetch_all(&*self.pool)
            .await?;
            return Ok(posts);
        }
        let q = query.unwrap_or("");
        // SAFETY: pattern is bound as a sqlx parameter — query text is escaped by the driver.
        // The % wildcards are prepended/appended around the parameterized value, not injected into SQL text.
        let pattern = format!("%{}%", q);
        let posts = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE is_deleted = FALSE AND visibility = 'public' AND (title ILIKE $1 OR body ILIKE $1) ORDER BY created_at DESC LIMIT $2",
        )
        .bind(&pattern)
        .bind(limit as i64)
        .fetch_all(&*self.pool)
        .await?;
        Ok(posts)
    }

    // ===== 点赞 =====

    pub async fn toggle_like(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| AppError::internal(e.to_string()))?;

        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM likes WHERE target_type = $1 AND target_id = $2 AND user_id = $3",
        )
        .bind(target_type)
        .bind(target_id)
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?;

        let result = if existing.is_some() {
            sqlx::query(
                "DELETE FROM likes WHERE target_type = $1 AND target_id = $2 AND user_id = $3",
            )
            .bind(target_type)
            .bind(target_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

            match target_type {
                "post" => {
                    sqlx::query("UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1")
                        .bind(target_id)
                        .execute(&mut *tx)
                        .await?;
                }
                "comment" => {
                    sqlx::query("UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1")
                        .bind(target_id)
                        .execute(&mut *tx)
                        .await?;
                }
                "creation" => {
                    sqlx::query("UPDATE creations SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1")
                        .bind(target_id)
                        .execute(&mut *tx)
                        .await?;
                }
                _ => {}
            }
            false
        } else {
            sqlx::query(
                "INSERT INTO likes (target_type, target_id, user_id) VALUES ($1, $2, $3)",
            )
            .bind(target_type)
            .bind(target_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

            match target_type {
                "post" => {
                    sqlx::query(
                        "UPDATE posts SET like_count = like_count + 1 WHERE id = $1",
                    )
                    .bind(target_id)
                    .execute(&mut *tx)
                    .await?;
                }
                "comment" => {
                    sqlx::query(
                        "UPDATE comments SET like_count = like_count + 1 WHERE id = $1",
                    )
                    .bind(target_id)
                    .execute(&mut *tx)
                    .await?;
                }
                "creation" => {
                    sqlx::query(
                        "UPDATE creations SET like_count = like_count + 1 WHERE id = $1",
                    )
                    .bind(target_id)
                    .execute(&mut *tx)
                    .await?;
                }
                _ => {}
            }
            true
        };

        tx.commit()
            .await
            .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(result)
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
        .fetch_optional(&*self.pool)
        .await?;
        Ok(result.is_some())
    }

    /// 获取用户点赞的帖子（Feed 风格数据）
    pub async fn list_liked_posts(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
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
        .fetch_all(&*self.pool).await
        .map_err(|e| AppError::internal(format!("liked posts query: {}", e)))?;

        Ok(rows
            .into_iter()
            .map(|r| {
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
            })
            .collect())
    }

    // ===== 举报 =====

    pub async fn create_report(
        &self,
        reporter_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        reason: &str,
    ) -> Result<Uuid, AppError> {
        let (id,): (Uuid,) = sqlx::query_as(
            "INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(reporter_id)
        .bind(target_type)
        .bind(target_id)
        .bind(reason)
        .fetch_one(&*self.pool)
        .await?;
        Ok(id)
    }

    // ===== 草稿 =====

    pub async fn save_draft(
        &self,
        user_id: Uuid,
        space_id: Option<Uuid>,
        title: &str,
        body: &str,
        module_type: &str,
        tags: &serde_json::Value,
    ) -> Result<Uuid, AppError> {
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM drafts WHERE user_id = $1 AND space_id IS NOT DISTINCT FROM $2 ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(user_id)
        .bind(space_id)
        .fetch_optional(&*self.pool)
        .await?;
        if let Some((did,)) = existing {
            sqlx::query("UPDATE drafts SET title = $1, body = $2, module_type = $3, tags = $4, updated_at = NOW() WHERE id = $5")
                .bind(title).bind(body).bind(module_type).bind(tags).bind(did)
                .execute(&*self.pool).await?;
            Ok(did)
        } else {
            let id: (Uuid,) = sqlx::query_as(
                "INSERT INTO drafts (user_id, space_id, title, body, module_type, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            )
            .bind(user_id).bind(space_id).bind(title).bind(body).bind(module_type).bind(tags)
            .fetch_one(&*self.pool).await?;
            Ok(id.0)
        }
    }

    pub async fn list_drafts(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'title', title, 'body', body, 'module_type', module_type, 'tags', tags, 'updated_at', updated_at)
             FROM drafts WHERE user_id = $1 ORDER BY updated_at DESC",
        )
        .bind(user_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== 公告 =====

    pub async fn create_announcement(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        title: &str,
        body: &str,
        importance: &str,
    ) -> Result<Uuid, AppError> {
        let id: (Uuid,) = sqlx::query_as(
            "INSERT INTO announcements (space_id, author_id, title, body, importance) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        )
        .bind(space_id).bind(author_id).bind(title).bind(body).bind(importance)
        .fetch_one(&*self.pool).await?;
        Ok(id.0)
    }

    pub async fn list_announcements(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT json_build_object('id', id, 'title', title, 'body', body, 'importance', importance, 'is_pinned', is_pinned, 'created_at', created_at)
             FROM announcements WHERE space_id = $1 ORDER BY is_pinned DESC, created_at DESC LIMIT 10",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== Feed =====

    pub async fn get_feed(
        &self,
        page: u32,
        page_size: u32,
        sort: Option<&str>,
        user_id: Option<Uuid>,
    ) -> Result<(Vec<serde_json::Value>, u64), AppError> {
        let is_hot = sort == Some("hot");
        let offset = ((page.saturating_sub(1)) * page_size) as i64;
        let limit = page_size as i64;

        let following_ids: Option<Vec<Uuid>> = if sort == Some("following") {
            if let Some(uid) = user_id {
                let rows: Vec<(Uuid,)> = sqlx::query_as(
                    "SELECT following_id FROM follows WHERE follower_id = $1",
                )
                .bind(uid)
                .fetch_all(&*self.pool)
                .await?;
                if rows.is_empty() {
                    return Ok((Vec::new(), 0));
                }
                Some(rows.into_iter().map(|r| r.0).collect())
            } else {
                return Ok((Vec::new(), 0));
            }
        } else {
            None
        };

        type PostRow = (
            Uuid,
            Uuid,
            String,
            Option<String>,
            Uuid,
            String,
            String,
            String,
            i64,
            i64,
            i64,
            chrono::DateTime<chrono::Utc>,
            Option<Uuid>,
            i64,
        );

        let posts: Vec<PostRow> = match &following_ids {
            Some(ids) => {
                sqlx::query_as::<_, PostRow>(
                    "SELECT p.id, p.space_id, p.module_type, sm.name as module_name, p.author_id, p.title, LEFT(p.body, 200), p.content_type, p.comment_count, p.like_count, p.view_count, p.created_at, p.creation_id, COALESCE(cref.cnt, 1) FROM posts p LEFT JOIN LATERAL (SELECT COUNT(*) as cnt FROM community_module_refs WHERE creation_id = p.creation_id) cref ON p.creation_id IS NOT NULL LEFT JOIN space_modules sm ON sm.space_id = p.space_id AND sm.module_key = p.module_type WHERE p.is_deleted = FALSE AND p.hidden_by_owner = FALSE AND p.visibility = 'public' AND p.author_id = ANY($1::uuid[]) ORDER BY p.created_at DESC LIMIT $2 OFFSET $3",
                )
                .bind(ids)
                .bind(limit)
                .bind(offset)
                .fetch_all(&*self.pool)
                .await?
            }
            None => match sort {
                Some("hot") => {
                    sqlx::query_as::<_, PostRow>(
                        "SELECT p.id, p.space_id, p.module_type, sm.name as module_name, p.author_id, p.title, LEFT(p.body, 200), p.content_type, p.comment_count, p.like_count, p.view_count, p.created_at, p.creation_id, COALESCE(cref.cnt, 1) FROM posts p LEFT JOIN LATERAL (SELECT COUNT(*) as cnt FROM community_module_refs WHERE creation_id = p.creation_id) cref ON p.creation_id IS NOT NULL LEFT JOIN space_modules sm ON sm.space_id = p.space_id AND sm.module_key = p.module_type WHERE p.is_deleted = FALSE AND p.hidden_by_owner = FALSE AND p.visibility = 'public' ORDER BY (p.view_count * 0.5 + p.like_count * 2.0 + p.comment_count * 3.0) / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0, 1.0) DESC, p.created_at DESC LIMIT $1 OFFSET $2",
                    )
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&*self.pool)
                    .await?
                }
                _ => {
                    sqlx::query_as::<_, PostRow>(
                        "SELECT p.id, p.space_id, p.module_type, sm.name as module_name, p.author_id, p.title, LEFT(p.body, 200), p.content_type, p.comment_count, p.like_count, p.view_count, p.created_at, p.creation_id, COALESCE(cref.cnt, 1) FROM posts p LEFT JOIN LATERAL (SELECT COUNT(*) as cnt FROM community_module_refs WHERE creation_id = p.creation_id) cref ON p.creation_id IS NOT NULL LEFT JOIN space_modules sm ON sm.space_id = p.space_id AND sm.module_key = p.module_type WHERE p.is_deleted = FALSE AND p.hidden_by_owner = FALSE AND p.visibility = 'public' ORDER BY p.created_at DESC LIMIT $1 OFFSET $2",
                    )
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&*self.pool)
                    .await?
                }
            },
        };

        let polls =
            sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, chrono::DateTime<chrono::Utc>,)>(
                "SELECT id, space_id, author_id, title, COALESCE(description, ''), created_at FROM polls WHERE status = 'active' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&*self.pool)
            .await?;

        let announcements = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, String, chrono::DateTime<chrono::Utc>,)>(
            "SELECT id, space_id, author_id, title, LEFT(body, 200), importance, created_at FROM announcements ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;

        let videos = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, String, i64, i64, i64, Option<String>, Option<i32>, chrono::DateTime<chrono::Utc>,)>(
            "SELECT v.id, sv.space_id, v.uploader_id, v.title, COALESCE(v.description, ''), v.comment_count, v.like_count, v.view_count, v.thumbnail_url, v.duration_seconds, v.created_at FROM videos v INNER JOIN space_videos sv ON v.id = sv.video_id WHERE v.visibility = 'public' AND sv.review_status = 'approved' ORDER BY v.created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await?;

        let post_total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE AND hidden_by_owner = FALSE AND visibility = 'public'",
        )
        .fetch_one(&*self.pool)
        .await?;
        let poll_total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM polls WHERE status = 'active'")
                .fetch_one(&*self.pool)
                .await?;
        let ann_total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM announcements")
                .fetch_one(&*self.pool)
                .await?;
        let video_total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM videos v INNER JOIN space_videos sv ON v.id = sv.video_id WHERE v.visibility = 'public' AND sv.review_status = 'approved'",
        )
        .fetch_one(&*self.pool)
        .await?;
        let total = (post_total + poll_total + ann_total + video_total) as u64;

        // 批量查找作者和空间
        let mut user_ids: Vec<Uuid> = Vec::new();
        let mut space_ids: Vec<Uuid> = Vec::new();
        for (_, sid, _, _, aid, _, _, _, _, _, _, _, _, _) in &posts {
            user_ids.push(*aid);
            space_ids.push(*sid);
        }
        for (_, sid, aid, _, _, _) in &polls {
            user_ids.push(*aid);
            space_ids.push(*sid);
        }
        for (_, sid, aid, _, _, _, _) in &announcements {
            user_ids.push(*aid);
            space_ids.push(*sid);
        }
        for (_, sid, aid, _, _, _, _, _, _, _, _) in &videos {
            user_ids.push(*aid);
            space_ids.push(*sid);
        }
        let users = self.find_users_batch(&user_ids).await?;
        let spaces = self.find_spaces_batch(&space_ids).await?;
        // 批量查询 space_modules，用于 poll/announcement/video 的 module_name 解析
        let space_modules = self.find_space_modules_batch(&space_ids).await?;

        // 组装结果
        let mut items: Vec<serde_json::Value> = Vec::new();
        for (id, space_id, module_type, module_name, author_id, title, body_preview, _content_type, comment_count, like_count, view_count, created_at, _creation_id, submission_count) in &posts
        {
            let author = users.get(author_id).map(|u| {
                serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url})
            });
            let space_info = spaces.get(space_id);
            items.push(serde_json::json!({"id": id, "type": "post", "module_type": module_type, "module_name": module_name, "title": title, "preview": body_preview, "comment_count": comment_count, "like_count": like_count, "view_count": view_count, "created_at": created_at, "author": author, "space": space_info, "submission_count": submission_count}));
        }
        for (id, space_id, author_id, title, desc, created_at) in &polls {
            let author = users.get(author_id).map(|u| {
                serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url})
            });
            let space_info = spaces.get(space_id);
            // 查询该 space 是否真的有 polls 模块，有则返回模块名，无则不设置（前端检测缺失时跳过模块面包屑）
            let poll_module_name = space_modules.get(&(*space_id, "polls".to_string())).cloned();
            items.push(serde_json::json!({"id": id, "type": "poll", "module_type": "poll", "module_name": poll_module_name, "title": title, "preview": desc, "comment_count": 0, "like_count": 0, "view_count": 0, "created_at": created_at, "author": author, "space": space_info}));
        }
        for (id, space_id, author_id, title, body_preview, importance, created_at) in &announcements
        {
            let author = users.get(author_id).map(|u| {
                serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url})
            });
            let space_info = spaces.get(space_id);
            let ann_module_name = space_modules.get(&(*space_id, "announcements".to_string())).cloned();
            items.push(serde_json::json!({"id": id, "type": "announcement", "module_type": "announcement", "module_name": ann_module_name, "title": title, "preview": body_preview, "importance": importance, "comment_count": 0, "like_count": 0, "view_count": 0, "created_at": created_at, "author": author, "space": space_info}));
        }
        for (id, space_id, author_id, title, desc, comment_count, like_count, view_count, thumbnail_url, duration_seconds, created_at) in &videos
        {
            let author = users.get(author_id).map(|u| {
                serde_json::json!({"id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url})
            });
            let space_info = spaces.get(space_id);
            let video_module_name = space_modules.get(&(*space_id, "video".to_string())).cloned();
            items.push(serde_json::json!({"id": id, "type": "video", "module_type": "video", "module_name": video_module_name, "title": title, "preview": desc, "thumbnail_url": thumbnail_url, "comment_count": comment_count, "like_count": like_count, "view_count": view_count, "created_at": created_at, "duration_seconds": duration_seconds, "author": author, "space": space_info}));
        }

        if !is_hot {
            items.sort_by(|a, b| {
                let ta = a["created_at"].as_str().unwrap_or("");
                let tb = b["created_at"].as_str().unwrap_or("");
                tb.cmp(ta)
            });
        }
        let paged: Vec<serde_json::Value> =
            items.into_iter().take(page_size as usize).collect();
        Ok((paged, total))
    }

    // ===== 批量查询 =====

    pub async fn find_posts_by_ids(&self, ids: &[Uuid]) -> Result<Vec<Post>, AppError> {
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let posts = sqlx::query_as::<_, Post>(
            "SELECT id, space_id, module_type, author_id, title, body, content_type, media_urls, tags, visibility, is_pinned, is_featured, is_deleted, hidden_by_owner, view_count, like_count, comment_count, metadata, password_hash, hidden_until, created_at, updated_at FROM posts WHERE id = ANY($1) AND is_deleted = FALSE",
        )
        .bind(ids)
        .fetch_all(&*self.pool)
        .await?;
        Ok(posts)
    }

    pub async fn find_users_batch(
        &self,
        user_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, UserPublic>, AppError> {
        if user_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let rows = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, serde_json::Value, chrono::DateTime<chrono::Utc>)>(
            r#"SELECT id, username, display_name, avatar_url, COALESCE(bio, ''), verified, COALESCE(notification_prefs, '{}'::jsonb), created_at FROM users WHERE id = ANY($1)"#,
        )
        .bind(user_ids)
        .fetch_all(&*self.pool)
        .await?;
        let mut map = HashMap::new();
        for (id, username, display_name, avatar_url, bio, verified, notification_prefs, created_at) in rows
        {
            map.insert(
                id,
                UserPublic {
                    id,
                    username,
                    display_name,
                    avatar_url,
                    bio,
                    verified,
                    notification_prefs,
                    created_at,
                    total_likes: 0,
                    post_count: 0,
                },
            );
        }
        Ok(map)
    }

    pub async fn find_spaces_batch(
        &self,
        space_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, serde_json::Value>, AppError> {
        if space_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let mut map = HashMap::new();
        let rows = sqlx::query_as::<_, (Uuid, String, String, String)>(
            "SELECT id, namespace, title, description FROM spaces WHERE id = ANY($1)",
        )
        .bind(space_ids.to_vec())
        .fetch_all(&*self.pool)
        .await?;
        for (id, namespace, title, description) in rows {
            map.insert(
                id,
                serde_json::json!({"id": id, "namespace": namespace, "title": title, "description": description}),
            );
        }
        Ok(map)
    }

    /// Batch lookup space_modules for feed item module_name resolution.
    /// Returns a map keyed by (space_id, module_key) -> module_name.
    pub async fn find_space_modules_batch(
        &self,
        space_ids: &[Uuid],
    ) -> Result<HashMap<(Uuid, String), String>, AppError> {
        if space_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let mut map = HashMap::new();
        let rows = sqlx::query_as::<_, (Uuid, String, String)>(
            "SELECT space_id, module_key, name FROM space_modules WHERE space_id = ANY($1) AND is_active = true",
        )
        .bind(space_ids.to_vec())
        .fetch_all(&*self.pool)
        .await?;
        for (space_id, module_key, name) in rows {
            map.insert((space_id, module_key), name);
        }
        Ok(map)
    }

    pub async fn find_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<polis_core::models::User>, AppError> {
        sqlx::query_as::<_, polis_core::models::User>(
            "SELECT id, username, display_name, email, password_hash, avatar_url, bio, verified, verified_type, notification_prefs, banned, banned_at, ban_reason, chain_address, chain_bound_at, created_at, updated_at FROM users WHERE LOWER(username) = LOWER($1)",
        )
        .bind(username)
        .fetch_optional(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    /// Batch lookup users by usernames (case-insensitive).
    /// Returns a HashMap keyed by lowercase username for O(1) lookup.
    pub async fn find_users_by_usernames(
        &self,
        usernames: &[String],
    ) -> Result<HashMap<String, User>, AppError> {
        if usernames.is_empty() {
            return Ok(HashMap::new());
        }
        // Lowercase on the app side; DB does LOWER(username) = ANY($1)
        let lowercased: Vec<String> = usernames.iter().map(|n| n.to_lowercase()).collect();
        let rows: Vec<User> = sqlx::query_as::<_, User>(
            "SELECT id, username, display_name, email, password_hash, avatar_url, bio, verified, verified_type, notification_prefs, banned, banned_at, ban_reason, chain_address, chain_bound_at, created_at, updated_at FROM users WHERE LOWER(username) = ANY($1::text[])",
        )
        .bind(&lowercased)
        .fetch_all(&*self.pool)
        .await
        .map_err(AppError::from)?;
        let map: HashMap<String, User> = rows
            .into_iter()
            .map(|u| (u.username.to_lowercase(), u))
            .collect();
        Ok(map)
    }

    // ===== 跨社区投稿引用 =====

    pub async fn create_reference(
        &self,
        post_id: Uuid,
        space_id: Uuid,
        module_type: &str,
        submitted_by: Uuid,
    ) -> Result<PostReference, AppError> {
        let ref_row = sqlx::query_as::<_, PostReference>(
            "INSERT INTO post_references (post_id, space_id, module_type, status, submitted_by)
             VALUES ($1, $2, $3, 'pending', $4) RETURNING id, post_id, space_id, module_type, status, submitted_by, reviewed_by, created_at, reviewed_at",
        )
        .bind(post_id)
        .bind(space_id)
        .bind(module_type)
        .bind(submitted_by)
        .fetch_one(&*self.pool)
        .await?;
        Ok(ref_row)
    }

    pub async fn find_reference(
        &self,
        post_id: Uuid,
        space_id: Uuid,
    ) -> Result<Option<PostReference>, AppError> {
        let row = sqlx::query_as::<_, PostReference>(
            "SELECT id, post_id, space_id, module_type, status, submitted_by, reviewed_by, created_at, reviewed_at FROM post_references WHERE post_id = $1 AND space_id = $2",
        )
        .bind(post_id)
        .bind(space_id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(row)
    }

    pub async fn list_references_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<PostReference>, AppError> {
        let rows = sqlx::query_as::<_, PostReference>(
            "SELECT id, post_id, space_id, module_type, status, submitted_by, reviewed_by, created_at, reviewed_at FROM post_references WHERE post_id = $1 ORDER BY created_at DESC",
        )
        .bind(post_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn list_pending_references_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<PostReference>, AppError> {
        let rows = sqlx::query_as::<_, PostReference>(
            "SELECT id, post_id, space_id, module_type, status, submitted_by, reviewed_by, created_at, reviewed_at FROM post_references WHERE space_id = $1 AND status = 'pending' ORDER BY created_at DESC",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows)
    }

    pub async fn review_reference(
        &self,
        reference_id: Uuid,
        status: &str,
        reviewed_by: Uuid,
    ) -> Result<PostReference, AppError> {
        let row = sqlx::query_as::<_, PostReference>(
            "UPDATE post_references SET status = $1, reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $3 AND status = 'pending' RETURNING id, post_id, space_id, module_type, status, submitted_by, reviewed_by, created_at, reviewed_at",
        )
        .bind(status)
        .bind(reviewed_by)
        .bind(reference_id)
        .fetch_optional(&*self.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Reference not found or already reviewed".to_string()))?;
        Ok(row)
    }

    pub async fn delete_reference(
        &self,
        reference_id: Uuid,
        submitted_by: Uuid,
    ) -> Result<(), AppError> {
        let result = sqlx::query(
            "DELETE FROM post_references WHERE id = $1 AND submitted_by = $2",
        )
        .bind(reference_id)
        .bind(submitted_by)
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::not_found(
                "Reference not found or not yours".to_string(),
            ));
        }
        Ok(())
    }

    pub async fn find_approved_reference_post_ids(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT post_id FROM post_references WHERE space_id = $1 AND status = 'approved'",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ===== 空间分析 =====

    pub async fn get_space_analytics(
        &self,
        space_id: Uuid,
    ) -> Result<serde_json::Value, AppError> {
        let total_posts: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE",
        )
        .bind(space_id)
        .fetch_one(&*self.pool)
        .await?;

        let total_views: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(view_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE",
        )
        .bind(space_id)
        .fetch_one(&*self.pool)
        .await?;

        let total_likes: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(like_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE",
        )
        .bind(space_id)
        .fetch_one(&*self.pool)
        .await?;

        let total_comments: (Option<i64>,) = sqlx::query_as(
            "SELECT SUM(comment_count)::BIGINT FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE",
        )
        .bind(space_id)
        .fetch_one(&*self.pool)
        .await?;

        let top_viewed = sqlx::query_as::<_, (Uuid, String, i64, i64)>(
            "SELECT id, title, view_count, like_count FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY view_count DESC LIMIT 5",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;

        let top_liked = sqlx::query_as::<_, (Uuid, String, i64, i64)>(
            "SELECT id, title, like_count, view_count FROM posts WHERE space_id = $1 AND is_deleted = FALSE AND hidden_by_owner = FALSE ORDER BY like_count DESC LIMIT 5",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;

        let poll_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM polls WHERE space_id = $1")
            .bind(space_id)
            .fetch_one(&*self.pool)
            .await?;

        let series_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM series WHERE space_id = $1")
                .bind(space_id)
                .fetch_one(&*self.pool)
                .await?;

        let top_viewed_json: Vec<_> = top_viewed
            .iter()
            .map(|(id, title, vc, lc)| {
                serde_json::json!({"id": id, "title": title, "view_count": vc, "like_count": lc})
            })
            .collect();

        let top_liked_json: Vec<_> = top_liked
            .iter()
            .map(|(id, title, lc, vc)| {
                serde_json::json!({"id": id, "title": title, "like_count": lc, "view_count": vc})
            })
            .collect();

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

    // ===== Editor Picks 编辑精选 =====

    pub async fn get_active_editor_picks(
        &self,
        pick_type: &str,
    ) -> Result<Vec<EditorPick>, AppError> {
        sqlx::query_as::<_, EditorPick>(
            "SELECT id, target_type, target_id, title_override, description_override, pick_type, sort_order, is_active, picked_by, picked_at, expires_at, created_at FROM editor_picks WHERE is_active = true AND pick_type = $1 ORDER BY sort_order LIMIT 20",
        )
        .bind(pick_type)
        .fetch_all(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_editor_pick(
        &self,
        target_type: &str,
        target_id: Uuid,
        title_override: Option<&str>,
        desc_override: Option<&str>,
        pick_type: &str,
        sort_order: i32,
        picked_by: Option<Uuid>,
    ) -> Result<EditorPick, AppError> {
        sqlx::query_as::<_, EditorPick>(
            "INSERT INTO editor_picks (target_type, target_id, title_override, description_override, pick_type, sort_order, picked_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        )
        .bind(target_type)
        .bind(target_id)
        .bind(title_override)
        .bind(desc_override)
        .bind(pick_type)
        .bind(sort_order)
        .bind(picked_by)
        .fetch_one(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn delete_editor_pick(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE editor_picks SET is_active = false WHERE id = $1")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // ===== Leaderboard 排行榜 =====

    /// Get the creator leaderboard filtered by time period.
    ///
    /// # SQL injection safety
    /// The date-filter expression is selected via `match` on `period` so only
    /// hard-coded SQL snippets reach the query string. No user-supplied text
    /// is ever interpolated into SQL identifiers or expressions.
    pub async fn get_leaderboard(
        &self,
        period: &str,
        limit: i64,
    ) -> Result<Vec<(Uuid, i64, i32, i32)>, AppError> {
        // Use match to produce fully static SQL — no format! expression interpolation.
        let rows: Vec<(Uuid, i64, i32, i32)> = match period {
            "weekly" => {
                sqlx::query_as(
                    "SELECT u.id, \
                     (COALESCE(COUNT(c.id), 0) * 10 + COALESCE(SUM(c.like_count), 0)::int8 * 5 + COALESCE(SUM(c.comment_count), 0)::int8 * 2)::int8 AS score, \
                     COALESCE(SUM(c.view_count), 0)::int4 AS total_views, \
                     COALESCE(COUNT(c.id), 0)::int4 AS post_count \
                     FROM users u \
                     LEFT JOIN creations c ON c.creator_id = u.id AND c.created_at >= NOW() - INTERVAL '7 days' \
                     GROUP BY u.id \
                     ORDER BY score DESC \
                     LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
            "monthly" => {
                sqlx::query_as(
                    "SELECT u.id, \
                     (COALESCE(COUNT(c.id), 0) * 10 + COALESCE(SUM(c.like_count), 0)::int8 * 5 + COALESCE(SUM(c.comment_count), 0)::int8 * 2)::int8 AS score, \
                     COALESCE(SUM(c.view_count), 0)::int4 AS total_views, \
                     COALESCE(COUNT(c.id), 0)::int4 AS post_count \
                     FROM users u \
                     LEFT JOIN creations c ON c.creator_id = u.id AND c.created_at >= NOW() - INTERVAL '30 days' \
                     GROUP BY u.id \
                     ORDER BY score DESC \
                     LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
            _ => {
                sqlx::query_as(
                    "SELECT u.id, \
                     (COALESCE(COUNT(c.id), 0) * 10 + COALESCE(SUM(c.like_count), 0)::int8 * 5 + COALESCE(SUM(c.comment_count), 0)::int8 * 2)::int8 AS score, \
                     COALESCE(SUM(c.view_count), 0)::int4 AS total_views, \
                     COALESCE(COUNT(c.id), 0)::int4 AS post_count \
                     FROM users u \
                     LEFT JOIN creations c ON c.creator_id = u.id AND c.created_at >= '1970-01-01' \
                     GROUP BY u.id \
                     ORDER BY score DESC \
                     LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
        };
        Ok(rows)
    }

    // ===== Community Events 社区活动 =====

    pub async fn get_active_events(
        &self,
        space_id: Option<Uuid>,
    ) -> Result<Vec<CommunityEvent>, AppError> {
        if let Some(sid) = space_id {
            sqlx::query_as::<_, CommunityEvent>(
                "SELECT id, space_id, creator_id, title, description, cover_url, event_type, start_at, end_at, max_participants, rules, prizes, status, participant_count, submission_count, created_at, updated_at FROM community_events WHERE space_id = $1 AND status = 'active' ORDER BY start_at DESC",
            )
            .bind(sid)
            .fetch_all(&*self.pool)
            .await
            .map_err(AppError::from)
        } else {
            sqlx::query_as::<_, CommunityEvent>(
                "SELECT id, space_id, creator_id, title, description, cover_url, event_type, start_at, end_at, max_participants, rules, prizes, status, participant_count, submission_count, created_at, updated_at FROM community_events WHERE status = 'active' ORDER BY start_at DESC LIMIT 50",
            )
            .fetch_all(&*self.pool)
            .await
            .map_err(AppError::from)
        }
    }

    pub async fn get_event_by_id(
        &self,
        event_id: Uuid,
    ) -> Result<Option<CommunityEvent>, AppError> {
        sqlx::query_as::<_, CommunityEvent>("SELECT id, space_id, creator_id, title, description, cover_url, event_type, start_at, end_at, max_participants, rules, prizes, status, participant_count, submission_count, created_at, updated_at FROM community_events WHERE id = $1")
            .bind(event_id)
            .fetch_optional(&*self.pool)
            .await
            .map_err(AppError::from)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_event(
        &self,
        space_id: Uuid,
        creator_id: Uuid,
        title: &str,
        description: Option<&str>,
        cover_url: Option<&str>,
        event_type: &str,
        start_at: Option<chrono::DateTime<chrono::Utc>>,
        end_at: Option<chrono::DateTime<chrono::Utc>>,
        rules: serde_json::Value,
        prizes: serde_json::Value,
    ) -> Result<CommunityEvent, AppError> {
        sqlx::query_as::<_, CommunityEvent>(
            "INSERT INTO community_events (space_id, creator_id, title, description, cover_url, event_type, start_at, end_at, rules, prizes) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10) RETURNING id, space_id, creator_id, title, description, cover_url, event_type, start_at, end_at, max_participants, rules, prizes, status, participant_count, submission_count, created_at, updated_at",
        )
        .bind(space_id)
        .bind(creator_id)
        .bind(title)
        .bind(description)
        .bind(cover_url)
        .bind(event_type)
        .bind(start_at)
        .bind(end_at)
        .bind(rules)
        .bind(prizes)
        .fetch_one(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn join_event(
        &self,
        event_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let existing: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2",
        )
        .bind(event_id)
        .bind(user_id)
        .fetch_optional(&*self.pool)
        .await?;
        if existing.is_some() {
            return Ok(false);
        }
        sqlx::query("INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)")
            .bind(event_id)
            .bind(user_id)
            .execute(&*self.pool)
            .await?;
        sqlx::query(
            "UPDATE community_events SET participant_count = participant_count + 1 WHERE id = $1",
        )
        .bind(event_id)
        .execute(&*self.pool)
        .await?;
        Ok(true)
    }

    // ===== Weekly Topics 每周话题 =====

    pub async fn get_active_weekly_topic(&self) -> Result<Option<WeeklyTopic>, AppError> {
        sqlx::query_as::<_, WeeklyTopic>(
            "SELECT id, topic_key, title, description, cover_url, topic_type, start_at, end_at, is_active, created_by, created_at FROM weekly_topics WHERE is_active = true AND now() BETWEEN start_at AND end_at ORDER BY start_at DESC LIMIT 1",
        )
        .fetch_optional(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn get_weekly_topic_by_key(
        &self,
        topic_key: &str,
    ) -> Result<Option<WeeklyTopic>, AppError> {
        sqlx::query_as::<_, WeeklyTopic>("SELECT id, topic_key, title, description, cover_url, topic_type, start_at, end_at, is_active, created_by, created_at FROM weekly_topics WHERE topic_key = $1")
            .bind(topic_key)
            .fetch_optional(&*self.pool)
            .await
            .map_err(AppError::from)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_weekly_topic(
        &self,
        topic_key: &str,
        title: &str,
        description: Option<&str>,
        cover_url: Option<&str>,
        topic_type: &str,
        end_at: Option<chrono::DateTime<chrono::Utc>>,
        created_by: Option<Uuid>,
    ) -> Result<WeeklyTopic, AppError> {
        sqlx::query_as::<_, WeeklyTopic>(
            "INSERT INTO weekly_topics (topic_key, title, description, cover_url, topic_type, end_at, created_by) VALUES ($1, $2, $3, $4, $5, COALESCE($6, now() + INTERVAL '7 days'), $7) ON CONFLICT (topic_key) DO UPDATE SET title = $2, description = $3, cover_url = $4, topic_type = $5, end_at = COALESCE($6, now() + INTERVAL '7 days') RETURNING id, topic_key, title, description, cover_url, topic_type, start_at, end_at, is_active, created_by, created_at",
        )
        .bind(topic_key)
        .bind(title)
        .bind(description)
        .bind(cover_url)
        .bind(topic_type)
        .bind(end_at)
        .bind(created_by)
        .fetch_one(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    // ===== Recommendations 推荐系统 =====

    pub async fn get_recommended_posts(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<Post>, AppError> {
        sqlx::query_as::<_, Post>(
            "SELECT p.* FROM posts p JOIN memberships m ON p.space_id = m.space_id WHERE m.user_id = $1 AND p.is_deleted = false AND p.author_id != $1 ORDER BY p.like_count + p.comment_count * 2 DESC LIMIT $2",
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn get_recommended_spaces(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let rows: Vec<serde_json::Value> = sqlx::query_scalar(
            "SELECT json_build_object('id', s.id, 'namespace', s.namespace, 'title', s.title, 'icon_url', s.icon_url, 'member_count', s.member_count) FROM spaces s WHERE s.status = 'active' AND s.visibility = 'public' AND s.id NOT IN (SELECT space_id FROM memberships WHERE user_id = $1) ORDER BY s.member_count DESC LIMIT $2",
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows)
    }

    #[allow(clippy::too_many_arguments, clippy::type_complexity)]
    pub async fn get_recommended_users(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<UserPublic>, AppError> {
        let rows: Vec<(
            Uuid,
            String,
            String,
            Option<String>,
            String,
            bool,
            serde_json::Value,
            chrono::DateTime<chrono::Utc>,
            i64,
            i64,
        )> = sqlx::query_as(
            "SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.verified, u.notification_prefs, u.created_at, COALESCE(l.total_likes, 0)::int8 as total_likes, COALESCE(pc.post_count, 0)::int8 as post_count FROM users u LEFT JOIN (SELECT author_id, SUM(like_count) as total_likes FROM posts WHERE is_deleted = false GROUP BY author_id) l ON u.id = l.author_id LEFT JOIN (SELECT author_id, COUNT(*) as post_count FROM posts WHERE is_deleted = false GROUP BY author_id) pc ON u.id = pc.author_id WHERE u.id != $1 AND u.id NOT IN (SELECT followee_id FROM follows WHERE follower_id = $1 AND followee_type = 'user') ORDER BY COALESCE(pc.post_count, 0) DESC LIMIT $2",
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&*self.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(
                |(
                    id,
                    username,
                    display_name,
                    avatar_url,
                    bio,
                    verified,
                    notification_prefs,
                    created_at,
                    total_likes,
                    post_count,
                )| UserPublic {
                    id,
                    username,
                    display_name,
                    avatar_url,
                    bio,
                    verified,
                    notification_prefs,
                    created_at,
                    total_likes,
                    post_count,
                },
            )
            .collect())
    }
}
