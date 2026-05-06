use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{CreateTierRequest, UpdateTierRequest, JoinPaidSpaceRequest, SpaceTier, Subscription,
    Comment, ContentType, CreateCommentRequest, CreatePostRequest, CreateSeriesRequest, UpdateSeriesRequest,
    ModuleType, Pagination, Post, PostPublic, Series, SeriesPublic, UpdatePostRequest, UserPublic, PaginationParams,
};
use polis_core::resolver::resolve::resolve_space_enabled_modules;
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

    /// 获取作者的所有内容（创作中心）
    /// 用户Ⓚ OS: 用户在/home/下的所有原创文件
    pub async fn get_user_contents(
        &self,
        author_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<serde_json::Value, AppError> {
        let (posts, pagination) = self.repo.find_posts_by_author(author_id, page, page_size).await?;

        // Enrich with space info (namespace, title)
        let space_ids: Vec<Uuid> = posts.iter().map(|p| p.space_id).collect();
        let spaces = self.repo.find_spaces_batch(&space_ids).await?;

        let items: Vec<serde_json::Value> = posts.into_iter().map(|p| {
            let space_info = spaces.get(&p.space_id).cloned().unwrap_or(serde_json::json!({"namespace": "?", "title": "?"}));
            serde_json::json!({
                "id": p.id,
                "title": p.title,
                "body": p.body,
                "module_type": p.module_type,
                "visibility": p.visibility,
                "is_pinned": p.is_pinned,
                "is_featured": p.is_featured,
                "is_deleted": p.is_deleted,
                "hidden_by_owner": p.hidden_by_owner,
                "view_count": p.view_count,
                "like_count": p.like_count,
                "comment_count": p.comment_count,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "space": space_info,
            })
        }).collect();

        Ok(serde_json::json!({
            "items": items,
            "pagination": pagination,
        }))
    }

    /// 获取帖子列表 (按 enabled_modules 过滤)
    pub async fn get_posts(
        &self,
        space_id: Uuid,
        params: PaginationParams,
        module_type: Option<String>,
        sort: Option<String>,
        enabled_modules: Vec<String>,
    ) -> Result<(Vec<PostPublic>, Pagination), AppError> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20).min(100);

        let (posts, pagination) = self
            .repo
            .find_posts_by_space(space_id, page, page_size, module_type.as_deref(), sort.as_deref())
            .await?;

        // 按 enabled_modules 过滤：模块关闭 = 内容隐藏（用户Ⓚ OS: 关闭文件夹 = 隐藏所有文件）
        let enabled_set: std::collections::HashSet<String> = enabled_modules.into_iter().collect();
        let posts: Vec<Post> = if module_type.is_some() {
            posts  // 如果前端指定了模块筛选，表示用户主动进入该模块，不过滤
        } else {
            posts.into_iter().filter(|p| enabled_set.contains(&p.module_type)).collect()
        };
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
                    visibility: serde_json::from_str(&format!("\"{}\"", p.visibility)).unwrap_or_default(),
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

    /// 搜索帖子（按标题和正文模糊匹配，或按标签搜索）
    pub async fn search_posts(&self, query: Option<&str>, tag: Option<&str>, limit: u32) -> Result<Vec<PostPublic>, AppError> {
        let posts = self.repo.search_posts(query, tag, limit).await?;
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
                let vis = format!("\"{}\"", p.visibility);
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
                    visibility: serde_json::from_str(&vis).unwrap_or_default(),
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
            let vis = serde_json::json!(p.visibility).to_string();
            PostPublic {
                id: p.id, space_id: p.space_id,
                module_type: serde_json::from_str(&mt).unwrap_or_default(),
                author, title: p.title, body: p.body,
                content_type: serde_json::from_str(&ct).unwrap_or_default(),
                media_urls: serde_json::from_value(p.media_urls).unwrap_or_default(),
                tags: serde_json::from_value(p.tags).unwrap_or_default(),
                visibility: serde_json::from_str(&vis).unwrap_or_default(),
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
            visibility: serde_json::from_str(&format!("\"{}\"", post.visibility)).unwrap_or_default(),
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

    /// 置顶/取消置顶帖子（仅空间创建者或帖子作者可操作）
    pub async fn toggle_pin_post(
        &self,
        post_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        // 检查权限：空间创建者或帖子作者
        let owner_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT owner_id FROM spaces WHERE id = $1"
        )
        .bind(post.space_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten();

        let is_owner = owner_id == Some(user_id);
        let is_author = post.author_id == user_id;

        if !is_owner && !is_author {
            return Err(AppError::Forbidden(
                "Only space owner or post author can pin posts".to_string(),
            ));
        }

        let pinned = self.repo.toggle_pin(post_id).await?;
        Ok(pinned)
    }

    /// 精选/取消精选帖子（仅空间创建者可操作）
    pub async fn toggle_featured_post(
        &self,
        post_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        let owner_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT owner_id FROM spaces WHERE id = $1"
        )
        .bind(post.space_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten();

        if owner_id != Some(user_id) {
            return Err(AppError::Forbidden(
                "Only space owner can feature posts".to_string(),
            ));
        }

        let featured = self.repo.toggle_featured(post_id).await?;
        Ok(featured)
    }

    /// 隐藏/取消隐藏帖子（仅空间创建者可操作，移除索引而非删除内容）
    /// 用户Ⓚ OS: 磁盘所有者可删除目录中的快捷方式，不能删除文件本身
    pub async fn hide_post_from_space(
        &self,
        post_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let post = self
            .repo
            .find_post_by_id(post_id)
            .await?
            .ok_or(AppError::NotFound("Post not found".to_string()))?;

        let owner_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT owner_id FROM spaces WHERE id = $1"
        )
        .bind(post.space_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten();

        if owner_id != Some(user_id) {
            return Err(AppError::Forbidden(
                "Only space owner can hide posts from this space".to_string(),
            ));
        }

        // Toggle hidden state
        if post.hidden_by_owner {
            self.repo.unhide_post(post_id).await?;
            Ok(false) // now visible
        } else {
            self.repo.hide_post(post_id).await?;
            Ok(true) // now hidden
        }
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

            // Create notification for post author (if post is liked by someone else)
            if target_type == "post" {
                if let Ok(Some(post)) = self.repo.find_post_by_id(target_id).await {
                    if post.author_id != user_id {
                        let actor_name = self.find_user_name(user_id).await.unwrap_or_else(|| "有人".to_string());
                        let content = format!("{} 赞了你的帖子", actor_name);
                        self.create_notification(
                            post.author_id, "like",
                            Some(user_id), Some("post"), Some(target_id),
                            &content,
                        ).await;
                    }
                }
            }
        }

        Ok(liked)
    }

    /// 添加评论
    pub async fn create_comment(
        &self,
        post_id: Uuid,
        author_id: Uuid,
        req: CreateCommentRequest,
    ) -> Result<serde_json::Value, AppError> {
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

        // Create notification for post author (if comment is by someone else)
        if let Ok(Some(post)) = self.repo.find_post_by_id(post_id).await {
            if post.author_id != author_id {
                let actor_name = self.find_user_name(author_id).await.unwrap_or_else(|| "有人".to_string());
                let content = format!("{} 评论了你的帖子", actor_name);
                self.create_notification(
                    post.author_id, "comment",
                    Some(author_id), Some("post"), Some(post_id),
                    &content,
                ).await;
            }
        }

        // 获取作者信息并添加到响应中，防止前端显示"匿名"
        let users = self.repo.find_users_batch(&[author_id]).await?;
        let author = users.get(&author_id).map(|u| serde_json::json!({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
        }));

        Ok(serde_json::json!({
            "id": comment.id,
            "post_id": comment.post_id,
            "author": author,
            "parent_id": comment.parent_id,
            "body": comment.body,
            "like_count": comment.like_count,
            "created_at": comment.created_at,
        }))
    }

    /// 获取帖子评论
    pub async fn get_comments(&self, post_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let comments = self.repo.find_comments_by_post(post_id).await?;
        let mut result: Vec<serde_json::Value> = Vec::new();
        let mut user_ids: Vec<Uuid> = Vec::new();
        for c in &comments {
            if !user_ids.contains(&c.author_id) {
                user_ids.push(c.author_id);
            }
        }
        let users = self.repo.find_users_batch(&user_ids).await?;
        for c in comments {
            let author = users.get(&c.author_id).map(|u| serde_json::json!({
                "id": u.id, "username": u.username, "display_name": u.display_name, "avatar_url": u.avatar_url
            }));
            result.push(serde_json::json!({
                "id": c.id,
                "post_id": c.post_id,
                "author": author,
                "parent_id": c.parent_id,
                "body": c.body,
                "like_count": c.like_count,
                "created_at": c.created_at,
            }));
        }
        Ok(result)
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

    /// List all polls across all spaces
    pub async fn list_all_polls(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        self.repo.list_all_polls(page, page_size).await
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

    /// 创建通知记录（供事件消费者使用）
    pub async fn create_notification(
        &self, user_id: Uuid, notif_type: &str,
        actor_id: Option<Uuid>, target_type: Option<&str>,
        target_id: Option<Uuid>, content: &str,
    ) {
        let result = sqlx::query(
            r#"INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content)
               VALUES ($1, $2, $3, $4, $5, $6)"#
        )
        .bind(user_id).bind(notif_type).bind(actor_id)
        .bind(target_type).bind(target_id).bind(content)
        .execute(&self.pool).await;
        if let Err(e) = result {
            tracing::warn!("Failed to create notification: {}", e);
        }
    }

    /// 获取用户显示名称
    async fn find_user_name(&self, user_id: Uuid) -> Option<String> {
        sqlx::query_scalar::<_, String>(
            "SELECT COALESCE(display_name, username) FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()
    }


    // ===== File Sharing =====

    pub async fn import_markdown(&self, user_id: Uuid, filename: &str, data: &[u8]) -> Result<String, AppError> {
        use std::process::Command;
        let tmp_dir = format!("/tmp/polis_import_{}", Uuid::new_v4());
        let tmp_file = format!("{}/input.zip", tmp_dir);
        tokio::fs::create_dir_all(&tmp_dir).await.map_err(|e| AppError::External(format!("Failed to create tmp dir: {}", e)))?;
        tokio::fs::write(&tmp_file, data).await.map_err(|e| AppError::External(format!("Failed to write tmp file: {}", e)))?;

        if filename.ends_with(".zip") {
            // Unzip first
            let output = Command::new("unzip").arg("-o").arg(&tmp_file).arg("-d").arg(&tmp_dir).output()
                .map_err(|e| AppError::External(format!("Failed to run unzip: {}", e)))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                return Err(AppError::External(format!("Unzip failed: stderr={} stdout={}", stderr, stdout)));
            }
            // Find README.md (case-insensitive)
            let find_output = Command::new("find").arg(&tmp_dir).arg("-iname").arg("readme.md").output()
                .map_err(|e| AppError::External(format!("Failed to find README: {}", e)))?;
            let readme_path = String::from_utf8_lossy(&find_output.stdout).trim().to_string();
            if readme_path.is_empty() {
                let ls = Command::new("ls").arg("-R").arg(&tmp_dir).output().map_err(|_| AppError::External("".to_string())).unwrap().stdout;
                let listing = String::from_utf8_lossy(&ls);
                return Err(AppError::NotFound(format!("No README.md found in zip. Files: {}", listing)));
            }
            let content = tokio::fs::read_to_string(&readme_path).await
                .map_err(|e| AppError::External(format!("Failed to read README: {}", e)))?;
            // Find and upload referenced images
            let base_dir = std::path::Path::new(&readme_path).parent().unwrap_or(std::path::Path::new(&tmp_dir));
            let mut processed = content.clone();
            // Match ![alt](path) and <img src="path">
            // Simple string-based image reference replacement
            let mut remaining = content.as_str();
            let mut processed = String::new();
            while let Some(pos) = remaining.find("![") {
                processed.push_str(&remaining[..pos]);
                remaining = &remaining[pos..];
                if let Some(cp) = remaining.find(')') {
                    let seg = &remaining[..=cp];
                    if let Some(op) = seg.find('(') {
                        let alt = &seg[2..op];
                        let path = &seg[op+1..seg.len()-1];
                        if path.starts_with("http") {
                            processed.push_str(seg);
                        } else {
                            let absp = base_dir.join(path);
                            if absp.exists() {
                                if let Ok(img_data) = tokio::fs::read(&absp).await {
                                    let ext = absp.extension().and_then(|e| e.to_str()).unwrap_or("png");
                                    let mime = match ext { "jpg"|"jpeg" => "image/jpeg", "png" => "image/png", "gif" => "image/gif", "svg" => "image/svg+xml", "webp" => "image/webp", _ => "application/octet-stream" };
                                    let fname = absp.file_name().and_then(|n| n.to_str()).unwrap_or("img.png");
                                    if let Ok(result) = self.upload_file_generic(user_id, fname, &img_data, mime).await {
                                        if let Some(url) = result.get("url").and_then(|u| u.as_str()) {
                                            processed.push_str(&format!("![{}]({})", alt, url));
                                            remaining = &remaining[seg.len()..];
                                            continue;
                                        }
                                    }
                                }
                            }
                            processed.push_str(seg);
                        }
                        remaining = &remaining[seg.len()..];
                    } else {
                        processed.push_str(&remaining[..=cp]);
                        remaining = &remaining[cp+1..];
                    }
                } else {
                    processed.push_str(remaining);
                    break;
                }
            }
            processed.push_str(remaining);
            let _ = tokio::fs::remove_dir_all(&tmp_dir).await;
            Ok(processed)
        } else {
            // Direct .md file
            let content = String::from_utf8(data.to_vec())
                .map_err(|_| AppError::Validation("Invalid UTF-8 in markdown file".to_string()))?;
            let _ = tokio::fs::remove_dir_all(&tmp_dir).await;
            Ok(content)
        }
    }

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

    /// Get space analytics: aggregated post stats for space owners
    pub async fn get_space_analytics(&self, space_id: Uuid) -> Result<serde_json::Value, AppError> {
        let stats = self.repo.get_space_analytics(space_id).await?;
        Ok(stats)
    }

}
