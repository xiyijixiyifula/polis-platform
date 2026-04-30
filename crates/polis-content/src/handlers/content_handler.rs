use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{
    Comment, ContentType, CreateCommentRequest, CreatePostRequest,
    ModuleType, Pagination, Post, PostPublic, UpdatePostRequest, UserPublic, PaginationParams,
};
use async_nats::Client as NatsClient;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::ContentServiceConfig;
use crate::repo::ContentRepo;

pub struct ContentHandler {
    pub repo: ContentRepo,
    pub pool: PgPool,
    pub config: ContentServiceConfig,
    pub nats: Option<NatsClient>,
}

impl ContentHandler {
    pub fn new(pool: PgPool, config: ContentServiceConfig, nats: Option<NatsClient>) -> Self {
        Self {
            repo: ContentRepo::new(pool.clone()),
            pool,
            config,
            nats,
        }
    }

    /// 发帖
    pub async fn create_post(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        req: CreatePostRequest,
    ) -> Result<Post, AppError> {
        let module_type = req.module_type.unwrap_or_default().to_string();
        let content_type = req.content_type.unwrap_or_default().to_string();
        let tags = req
            .tags
            .as_ref()
            .map(|t| serde_json::to_value(t).unwrap_or_default())
            .unwrap_or(serde_json::Value::Array(vec![]));
        let visibility = req.visibility.unwrap_or_default().to_string();

        let post = self
            .repo
            .create_post(
                space_id,
                &module_type,
                author_id,
                &req.title,
                &req.body,
                &content_type,
                &tags,
                &visibility,
            )
            .await?;

        // 更新社区帖子计数
        sqlx::query("UPDATE spaces SET post_count = post_count + 1 WHERE id = $1")
            .bind(space_id)
            .execute(&self.pool)
            .await
            .ok();

        // 发布事件
        self.publish_event(subjects::CONTENT_POST_CREATED, serde_json::json!({
            "post_id": post.id.to_string(),
            "space_id": space_id.to_string(),
            "author_id": author_id.to_string(),
            "module_type": module_type,
            "title": req.title,
        })).await;

        Ok(post)
    }

    /// 获取帖子列表
    pub async fn get_posts(
        &self,
        space_id: Uuid,
        params: PaginationParams,
        module_type: Option<String>,
    ) -> Result<(Vec<PostPublic>, Pagination), AppError> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20).min(100);

        let (posts, pagination) = self
            .repo
            .find_posts_by_space(space_id, page, page_size, module_type.as_deref())
            .await?;

        // 批量查询作者信息
        let author_ids: Vec<Uuid> = posts.iter().map(|p| p.author_id).collect();
        let authors = self.repo.find_users_batch(&author_ids).await?;

        let post_publics = posts
            .into_iter()
            .map(|p| {
                let author = authors.get(&p.author_id).cloned().unwrap_or(UserPublic {
                    id: p.author_id,
                    username: String::new(),
                    display_name: String::new(),
                    avatar_url: None,
                    bio: String::new(),
                    verified: false,
                    created_at: p.created_at,
                });
                PostPublic {
                    id: p.id,
                    space_id: p.space_id,
                    module_type: serde_json::from_str(&format!("\"{}\"", p.module_type)).unwrap_or_default(),
                    author,
                    title: p.title,
                    body: p.body,
                    content_type: serde_json::from_str(&format!("\"{}\"", p.content_type)).unwrap_or_default(),
                    media_urls: serde_json::from_value(p.media_urls).unwrap_or_default(),
                    tags: serde_json::from_value(p.tags).unwrap_or_default(),
                    is_pinned: p.is_pinned,
                    is_featured: p.is_featured,
                    view_count: p.view_count,
                    like_count: p.like_count,
                    comment_count: p.comment_count,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                }
            })
            .collect();

        Ok((post_publics, pagination))
    }

    /// 获取帖子详情
    pub async fn get_post(&self, post_id: Uuid) -> Result<Post, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        self.repo.increment_view_count(post_id).await.ok();
        Ok(post)
    }

    /// 获取帖子公开信息（含作者详情）
    pub async fn get_post_public(&self, post_id: Uuid) -> Result<PostPublic, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        self.repo.increment_view_count(post_id).await.ok();

        let author_ids = vec![post.author_id];
        let authors = self.repo.find_users_batch(&author_ids).await?;
        let author = authors.get(&post.author_id).cloned().unwrap_or(UserPublic {
            id: post.author_id,
            username: String::new(),
            display_name: String::new(),
            avatar_url: None,
            bio: String::new(),
            verified: false,
            created_at: post.created_at,
        });

        Ok(PostPublic {
            id: post.id,
            space_id: post.space_id,
            module_type: serde_json::from_str(&format!("\"{}\"", post.module_type)).unwrap_or_default(),
            author,
            title: post.title,
            body: post.body,
            content_type: serde_json::from_str(&format!("\"{}\"", post.content_type)).unwrap_or_default(),
            media_urls: serde_json::from_value(post.media_urls).unwrap_or_default(),
            tags: serde_json::from_value(post.tags).unwrap_or_default(),
            is_pinned: post.is_pinned,
            is_featured: post.is_featured,
            view_count: post.view_count,
            like_count: post.like_count,
            comment_count: post.comment_count,
            created_at: post.created_at,
            updated_at: post.updated_at,
        })
    }

    /// 更新帖子
    pub async fn update_post(
        &self,
        post_id: Uuid,
        user_id: Uuid,
        req: UpdatePostRequest,
    ) -> Result<Post, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        if post.author_id != user_id {
            return Err(AppError::Forbidden(
                "You can only edit your own posts".to_string(),
            ));
        }

        let tags = req.tags.as_ref().map(|t| serde_json::to_value(t).unwrap_or_default());
        let visibility = req.visibility.as_ref().map(|v| v.to_string());

        let updated = self.repo.update_post(
            post_id,
            req.title.as_deref(),
            req.body.as_deref(),
            tags.as_ref(),
            visibility.as_deref(),
        ).await?;
        Ok(updated)
    }

    /// 删除帖子
    pub async fn delete_post(
        &self,
        post_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        if post.author_id != user_id {
            return Err(AppError::Forbidden(
                "You can only delete your own posts".to_string(),
            ));
        }

        self.repo.delete_post(post_id).await
    }

    /// 点赞/取消点赞
    pub async fn toggle_like(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let liked = self.repo.toggle_like(target_type, target_id, user_id).await?;

        if liked {
            self.publish_event(subjects::CONTENT_POST_LIKED, serde_json::json!({
                "target_type": target_type,
                "target_id": target_id.to_string(),
                "user_id": user_id.to_string(),
            })).await;
        }

        Ok(liked)
    }

    /// 添加评论
    pub async fn create_comment(
        &self,
        post_id: Uuid,
        author_id: Uuid,
        req: CreateCommentRequest,
    ) -> Result<Comment, AppError> {
        self.repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        if let Some(pid) = req.parent_id {
            let exists = sqlx::query_scalar::<_, Option<i32>>(
                "SELECT 1 FROM comments WHERE id = $1 AND is_deleted = FALSE",
            )
            .bind(pid)
            .fetch_optional(&self.pool)
            .await?;
            if exists.is_none() {
                return Err(AppError::NotFound("Parent comment not found".to_string()));
            }
        }

        let comment = self
            .repo
            .create_comment(post_id, author_id, &req.body, req.parent_id)
            .await?;

        self.publish_event(subjects::CONTENT_COMMENT_CREATED, serde_json::json!({
            "comment_id": comment.id.to_string(),
            "post_id": post_id.to_string(),
            "author_id": author_id.to_string(),
        })).await;

        Ok(comment)
    }

    /// 获取帖子评论
    pub async fn get_comments(&self, post_id: Uuid) -> Result<Vec<Comment>, AppError> {
        self.repo.find_comments_by_post(post_id).await
    }

    /// 获取精选帖子
    pub async fn get_featured_posts(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        self.repo.find_featured_posts(space_id, limit).await
    }

    // ===== 投票（赞同/反对） =====

    pub async fn vote(&self, user_id: Uuid, target_type: &str, target_id: Uuid, value: i16) -> Result<i16, AppError> {
        self.repo.vote(user_id, target_type, target_id, value).await
    }

    pub async fn get_vote_score(&self, target_type: &str, target_id: Uuid) -> Result<(i64, i64, i64), AppError> {
        self.repo.get_vote_score(target_type, target_id).await
    }

    // ===== 投票/问卷 =====

    pub async fn create_poll(&self, space_id: Uuid, author_id: Uuid, title: &str, desc: &str,
        poll_type: &str, options: &[String], expires_at: Option<chrono::DateTime<chrono::Utc>>) -> Result<Uuid, AppError> {
        self.repo.create_poll(space_id, author_id, title, desc, poll_type, options, expires_at).await
    }

    pub async fn vote_poll(&self, poll_id: Uuid, option_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        self.repo.vote_poll(poll_id, option_id, user_id).await
    }

    pub async fn list_polls_by_space(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.list_polls_by_space(space_id).await
    }

    pub async fn get_poll_results(&self, poll_id: Uuid) -> Result<serde_json::Value, AppError> {
        self.repo.get_poll_results(poll_id).await
    }

    // ===== 草稿 =====

    pub async fn save_draft(&self, user_id: Uuid, space_id: Option<Uuid>, title: &str, body: &str, module_type: &str, tags: &serde_json::Value) -> Result<Uuid, AppError> {
        self.repo.save_draft(user_id, space_id, title, body, module_type, tags).await
    }

    pub async fn list_drafts(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.list_drafts(user_id).await
    }

    // ===== 公告 =====

    pub async fn create_announcement(&self, space_id: Uuid, author_id: Uuid, title: &str, body: &str, importance: &str) -> Result<Uuid, AppError> {
        self.repo.create_announcement(space_id, author_id, title, body, importance).await
    }

    pub async fn list_announcements(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.list_announcements(space_id).await
    }

    async fn publish_event(&self, subject: &str, payload: serde_json::Value) {
        if let Some(ref nats) = self.nats {
            let event = Event {
                id: Uuid::new_v4().to_string(),
                subject: subject.to_string(),
                source: "content-service".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
                payload,
            };
            if let Ok(data) = serde_json::to_vec(&event) {
                let _ = nats.publish(subject.to_string(), data.into()).await;
            }
        }
    }
}
