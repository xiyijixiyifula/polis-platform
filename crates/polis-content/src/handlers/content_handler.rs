use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{CreateTierRequest, UpdateTierRequest, JoinPaidSpaceRequest, SpaceTier, Subscription, 
    Comment, ContentType, CreateCommentRequest, CreatePostRequest, CreateSeriesRequest, UpdateSeriesRequest,
    ModuleType, Pagination, Post, PostPublic, Series, SeriesPublic, UpdatePostRequest, UserPublic, PaginationParams,
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

    /// 搜索帖子（按标题和正文模糊匹配）
    pub async fn search_posts(&self, query: &str, limit: u32) -> Result<Vec<PostPublic>, AppError> {
        let posts = self.repo.search_posts(query, limit).await?;
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
                let mt = format!("\"{}\"", p.module_type);
                let ct = format!("\"{}\"", p.content_type);
                PostPublic {
                    id: p.id,
                    space_id: p.space_id,
                    module_type: serde_json::from_str(&mt).unwrap_or_default(),
                    author,
                    title: p.title,
                    body: p.body,
                    content_type: serde_json::from_str(&ct).unwrap_or_default(),
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
        Ok(post_publics)
    }

    // ===== 专栏/内容系列 =====

    // ===== 付费社区（会员等级） =====

    pub async fn list_tiers(&self, space_id: Uuid) -> Result<Vec<SpaceTier>, AppError> {
        self.repo.list_tiers(space_id).await
    }

    pub async fn create_tier(&self, space_id: Uuid, req: CreateTierRequest) -> Result<Uuid, AppError> {
        let currency = req.currency.as_deref().unwrap_or("CNY");
        let description = req.description.as_deref().unwrap_or("");
        let benefits = req.benefits.as_ref().map(|b| serde_json::to_value(b).unwrap_or_default()).unwrap_or(serde_json::json!([]));
        let sort_order = req.sort_order.unwrap_or(0);
        self.repo.create_tier(space_id, &req.name, req.price_cents, currency, description, &benefits, sort_order).await
    }

    pub async fn update_tier(&self, tier_id: Uuid, space_id: Uuid, req: UpdateTierRequest) -> Result<(), AppError> {
        let desc_str = req.description.as_deref();
        let b_val = req.benefits.as_ref().map(|b| serde_json::to_value(b).unwrap_or_default());
        self.repo.update_tier(tier_id, space_id, req.name.as_deref(), req.price_cents, desc_str, b_val.as_ref(), req.sort_order, req.is_active).await
    }

    pub async fn delete_tier(&self, tier_id: Uuid, space_id: Uuid) -> Result<(), AppError> {
        self.repo.delete_tier(tier_id, space_id).await
    }

    pub async fn subscribe_to_tier(&self, space_id: Uuid, user_id: Uuid, tier_id: Uuid) -> Result<Uuid, AppError> {
        self.repo.subscribe(space_id, user_id, tier_id).await
    }

    pub async fn cancel_subscription(&self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        self.repo.cancel_subscription(space_id, user_id).await
    }

    pub async fn get_user_subscription(&self, space_id: Uuid, user_id: Uuid) -> Result<Option<Subscription>, AppError> {
        self.repo.get_user_subscription(space_id, user_id).await
    }

    pub async fn create_series(&self, space_id: Uuid, author_id: Uuid, req: CreateSeriesRequest) -> Result<Uuid, AppError> {
        let desc = req.description.unwrap_or_default();
        let visibility = req.visibility.unwrap_or_else(|| "public".to_string());
        self.repo.create_series(space_id, author_id, &req.title, &desc, req.cover_url.as_deref(), &visibility).await
    }

    pub async fn update_series(&self, series_id: Uuid, user_id: Uuid, req: UpdateSeriesRequest) -> Result<(), AppError> {
        self.repo.update_series(series_id, user_id, req.title.as_deref(), req.description.as_deref(), req.cover_url.as_deref(), req.visibility.as_deref(), req.is_published, req.sort_order).await
    }

    pub async fn delete_series(&self, series_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        self.repo.delete_series(series_id, user_id).await
    }

    pub async fn list_series_by_space(&self, space_id: Uuid) -> Result<Vec<SeriesPublic>, AppError> {
        let series_list = self.repo.list_series_by_space(space_id).await?;
        let author_ids: Vec<Uuid> = series_list.iter().map(|s| s.author_id).collect();
        let authors = self.repo.find_users_batch(&author_ids).await?;
        let result = series_list.into_iter().map(|s| {
            let author = authors.get(&s.author_id).cloned().unwrap_or(UserPublic {
                id: s.author_id, username: String::new(), display_name: String::new(),
                avatar_url: None, bio: String::new(), verified: false, created_at: s.created_at,
            });
            SeriesPublic {
                id: s.id, space_id: s.space_id, author, title: s.title,
                description: s.description, cover_url: s.cover_url, visibility: s.visibility,
                is_published: s.is_published, post_count: s.post_count, sort_order: s.sort_order,
                created_at: s.created_at, updated_at: s.updated_at,
            }
        }).collect();
        Ok(result)
    }

    pub async fn get_series_public(&self, series_id: Uuid) -> Result<(SeriesPublic, Vec<PostPublic>), AppError> {
        let series = self.repo.get_series(series_id).await?;
        let posts = self.repo.list_series_posts(series_id).await?;
        let author_ids: Vec<Uuid> = {
            let mut ids: Vec<Uuid> = posts.iter().map(|p| p.author_id).collect();
            ids.push(series.author_id);
            ids
        };
        let authors = self.repo.find_users_batch(&author_ids).await?;
        let series_author = authors.get(&series.author_id).cloned().unwrap_or(UserPublic {
            id: series.author_id, username: String::new(), display_name: String::new(),
            avatar_url: None, bio: String::new(), verified: false, created_at: series.created_at,
        });
        let series_public = SeriesPublic {
            id: series.id, space_id: series.space_id, author: series_author,
            title: series.title, description: series.description, cover_url: series.cover_url,
            visibility: series.visibility, is_published: series.is_published,
            post_count: series.post_count, sort_order: series.sort_order,
            created_at: series.created_at, updated_at: series.updated_at,
        };
        let post_publics: Vec<PostPublic> = posts.into_iter().map(|p| {
            let author = authors.get(&p.author_id).cloned().unwrap_or(UserPublic {
                id: p.author_id, username: String::new(), display_name: String::new(),
                avatar_url: None, bio: String::new(), verified: false, created_at: p.created_at,
            });
            let mt = serde_json::json!(p.module_type).to_string();
            let ct = serde_json::json!(p.content_type).to_string();
            PostPublic {
                id: p.id, space_id: p.space_id,
                module_type: serde_json::from_str(&mt).unwrap_or_default(),
                author, title: p.title, body: p.body,
                content_type: serde_json::from_str(&ct).unwrap_or_default(),
                media_urls: serde_json::from_value(p.media_urls).unwrap_or_default(),
                tags: serde_json::from_value(p.tags).unwrap_or_default(),
                is_pinned: p.is_pinned, is_featured: p.is_featured,
                view_count: p.view_count, like_count: p.like_count,
                comment_count: p.comment_count, created_at: p.created_at,
                updated_at: p.updated_at,
            }
        }).collect();
        Ok((series_public, post_publics))
    }

    pub async fn add_post_to_series(&self, series_id: Uuid, post_id: Uuid, sort_order: i32, user_id: Uuid) -> Result<(), AppError> {
        let series = self.repo.get_series(series_id).await?;
        if series.author_id != user_id {
            return Err(AppError::Forbidden("Not the series owner".to_string()));
        }
        self.repo.add_post_to_series(series_id, post_id, sort_order).await
    }

    pub async fn remove_post_from_series(&self, series_id: Uuid, post_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let series = self.repo.get_series(series_id).await?;
        if series.author_id != user_id {
            return Err(AppError::Forbidden("Not the series owner".to_string()));
        }
        self.repo.remove_post_from_series(series_id, post_id).await
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


    // ===== File Sharing =====

    pub async fn upload_file_generic(&self, user_id: Uuid, filename: &str, data: &[u8], mime_type: &str) -> Result<serde_json::Value, AppError> {
        let file_id = Uuid::new_v4();
        let storage_dir = "/root/polis/uploads/general";
        tokio::fs::create_dir_all(storage_dir).await.map_err(|e| AppError::External(format!("Failed to create upload dir: {}", e)))?;
        let storage_path = format!("{}/{}", storage_dir, file_id);
        tokio::fs::write(&storage_path, data).await.map_err(|e| AppError::External(format!("Failed to write file: {}", e)))?;
        let file_size = data.len() as i64;
        // Use an existing space_id for generic uploads (games space)
        let space_id = sqlx::query_scalar::<_, Uuid>("SELECT id FROM spaces ORDER BY created_at ASC LIMIT 1")
            .fetch_one(&self.pool).await
            .map_err(|_| AppError::Internal("No space found for upload".to_string()))?;
        let id = self.repo.create_file_record(space_id, user_id, filename, file_size, mime_type, &storage_path).await?;
        Ok(serde_json::json!({ "id": id.to_string(), "filename": filename, "file_size": file_size, "mime_type": mime_type, "url": format!("/api/files/{}", id) }))
    }

    pub async fn upload_file(&self, space_id: Uuid, user_id: Uuid, filename: &str, data: &[u8], mime_type: &str) -> Result<serde_json::Value, AppError> {
        let file_id = Uuid::new_v4();
        let storage_dir = format!("/root/polis/uploads/{}", space_id);
        tokio::fs::create_dir_all(&storage_dir).await.map_err(|e| AppError::External(format!("Failed to create upload dir: {}", e)))?;
        let storage_path = format!("{}/{}", storage_dir, file_id);
        tokio::fs::write(&storage_path, data).await.map_err(|e| AppError::External(format!("Failed to write file: {}", e)))?;
        let file_size = data.len() as i64;
        let id = self.repo.create_file_record(space_id, user_id, filename, file_size, mime_type, &storage_path).await?;
        Ok(serde_json::json!({ "id": id.to_string(), "filename": filename, "file_size": file_size, "mime_type": mime_type }))
    }


    pub async fn get_file(&self, file_id: Uuid) -> Result<(Vec<u8>, String, String), AppError> {
        let (_fid, _filename, _file_size, mime_type, storage_path) = self.repo.get_file_by_id(file_id).await?;
        let data = tokio::fs::read(&storage_path).await
            .map_err(|e| AppError::External(format!("Failed to read file: {}", e)))?;
        Ok((data, _filename, mime_type))
    }

    pub async fn list_files(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.list_files_by_space(space_id).await
    }

    pub async fn create_file_share(&self, file_id: Uuid, _user_id: Uuid, expires_hours: Option<i64>, password: Option<String>) -> Result<serde_json::Value, AppError> {
        let (fid, _filename, _fs, _mt, _sp) = self.repo.get_file_by_id(file_id).await?;
        let code: String = Uuid::new_v4().to_string().chars().take(8).collect();
        let expires_at = expires_hours.map(|h| chrono::Utc::now() + chrono::Duration::hours(h));
        let share = self.repo.create_share_link(fid, &code, password.as_deref(), expires_at, None).await?;
        Ok(serde_json::json!({ "code": code, "file_id": fid.to_string(), "expires_at": expires_at.map(|t| t.to_rfc3339()), "password": password }))
    }

    pub async fn get_share_info(&self, code: &str) -> Result<serde_json::Value, AppError> {
        let (_link_id, file_id, password, expires_at, max_downloads, download_count, is_active) = self.repo.get_share_link_by_code(code).await?;
        if !is_active { return Err(AppError::Validation("Share link has been deactivated".to_string())); }
        if let Some(exp) = expires_at { if chrono::Utc::now() > exp { return Err(AppError::Validation("Share link has expired".to_string())); } }
        if let Some(max) = max_downloads { if download_count >= max { return Err(AppError::Validation("Download limit reached".to_string())); } }
        let (_fid, filename, file_size, mime_type, _sp) = self.repo.get_file_by_id(file_id).await?;
        Ok(serde_json::json!({
            "file_id": file_id.to_string(), "filename": filename, "file_size": file_size, "mime_type": mime_type,
            "has_password": password.is_some(), "expires_at": expires_at.map(|t| t.to_rfc3339()), "download_count": download_count
        }))
    }

    /// 获取全站信息流
    pub async fn get_feed(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.get_feed(page, page_size).await
    }

    pub async fn download_shared_file(&self, code: &str, password: Option<&str>) -> Result<(Vec<u8>, String, String), AppError> {
        let (link_id, file_id, stored_password, expires_at, max_downloads, download_count, is_active) = self.repo.get_share_link_by_code(code).await?;
        if !is_active { return Err(AppError::Validation("Share link has been deactivated".to_string())); }
        if let Some(exp) = expires_at { if chrono::Utc::now() > exp { return Err(AppError::Validation("Share link has expired".to_string())); } }
        if let Some(max) = max_downloads { if download_count >= max { return Err(AppError::Validation("Download limit reached".to_string())); } }
        if let Some(ref pw) = stored_password {
            if password != Some(pw.as_str()) { return Err(AppError::Forbidden("Invalid password".to_string())); }
        }
        let (_fid, filename, _fs, mime_type, storage_path) = self.repo.get_file_by_id(file_id).await?;
        let data = tokio::fs::read(&storage_path).await.map_err(|e| AppError::External(format!("Failed to read file: {}", e)))?;
        self.repo.increment_share_download(link_id, file_id).await?;
        Ok((data, filename, mime_type))
    }

}
