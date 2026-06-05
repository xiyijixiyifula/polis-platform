//! ContentRepo — 内容服务的数据访问层
//!
//! 按领域拆分为以下子模块:
//! - `post_repo` — 帖子 CRUD、搜索、Feed、点赞、举报、草稿、公告、引用、分析、编辑精选、排行榜、活动、话题、推荐
//! - `comment_repo` — 评论 CRUD、置顶
//! - `poll_repo` — 投票/问卷、通用赞同/反对
//! - `series_repo` — 内容系列、系列帖子管理
//! - `bookmark_repo` — 用户书签
//! - `notification_repo` — 私信、对话管理、通知
//! - `file_repo` — 文件上传、分享链接
//! - `hashtag_repo` — 标签管理
//! - `tier_repo` — 会员等级、订阅
//! - `tip_repo` — 打赏

pub mod bookmark_repo;
pub mod comment_repo;
pub mod file_repo;
pub mod hashtag_repo;
pub mod notification_repo;
pub mod poll_repo;
pub mod post_repo;
pub mod series_repo;
pub mod tier_repo;
pub mod tip_repo;

use polis_core::error::AppError;
use polis_core::models::{
    Comment, CommunityEvent, DirectMessage, EditorPick, Hashtag, Pagination, Post, PostReference,
    Series, SpaceTier, Subscription, Tip, UserPublic, WeeklyTopic,
};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

pub struct ContentRepo {
    pub pool: PgPool,
    post: post_repo::PostRepo,
    comment: comment_repo::CommentRepo,
    poll: poll_repo::PollRepo,
    series: series_repo::SeriesRepo,
    bookmark: bookmark_repo::BookmarkRepo,
    notification: notification_repo::NotificationRepo,
    file: file_repo::FileRepo,
    hashtag: hashtag_repo::HashtagRepo,
    tier: tier_repo::TierRepo,
    tip: tip_repo::TipRepo,
}

impl ContentRepo {
    pub fn new(pool: PgPool) -> Self {
        let shared = Arc::new(pool.clone());
        Self {
            pool,
            post: post_repo::PostRepo::new(Arc::clone(&shared)),
            comment: comment_repo::CommentRepo::new(Arc::clone(&shared)),
            poll: poll_repo::PollRepo::new(Arc::clone(&shared)),
            series: series_repo::SeriesRepo::new(Arc::clone(&shared)),
            bookmark: bookmark_repo::BookmarkRepo::new(Arc::clone(&shared)),
            notification: notification_repo::NotificationRepo::new(Arc::clone(&shared)),
            file: file_repo::FileRepo::new(Arc::clone(&shared)),
            hashtag: hashtag_repo::HashtagRepo::new(Arc::clone(&shared)),
            tier: tier_repo::TierRepo::new(Arc::clone(&shared)),
            tip: tip_repo::TipRepo::new(Arc::clone(&shared)),
        }
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
        password_hash: Option<&str>,
    ) -> Result<Post, AppError> {
        self.post
            .create_post(
                space_id, module_type, author_id, title, body, content_type, tags, visibility,
                password_hash,
            )
            .await
    }

    pub async fn find_post_by_id(&self, id: Uuid) -> Result<Option<Post>, AppError> {
        self.post.find_post_by_id(id).await
    }

    pub async fn find_posts_by_author(
        &self,
        author_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        self.post.find_posts_by_author(author_id, page, page_size).await
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
        self.post
            .find_posts_by_space(space_id, page, page_size, module_type, sort, include_hidden)
            .await
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
        self.post
            .update_post(id, title, body, tags, visibility, password_hash)
            .await
    }

    pub async fn verify_post_password(
        &self,
        post_id: Uuid,
        password: &str,
    ) -> Result<Option<Post>, AppError> {
        self.post.verify_post_password(post_id, password).await
    }

    pub async fn hide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        self.post.hide_post(post_id).await
    }

    pub async fn unhide_post(&self, post_id: Uuid) -> Result<(), AppError> {
        self.post.unhide_post(post_id).await
    }

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        self.post.delete_post(id).await
    }

    pub async fn toggle_pin(&self, post_id: Uuid) -> Result<bool, AppError> {
        self.post.toggle_pin(post_id).await
    }

    pub async fn toggle_featured(&self, post_id: Uuid) -> Result<bool, AppError> {
        self.post.toggle_featured(post_id).await
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<i64, AppError> {
        self.post.increment_view_count(id).await
    }

    pub async fn find_featured_posts(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        self.post.find_featured_posts(space_id, limit).await
    }

    pub async fn search_posts(
        &self,
        query: Option<&str>,
        tag: Option<&str>,
        limit: u32,
    ) -> Result<Vec<Post>, AppError> {
        self.post.search_posts(query, tag, limit).await
    }

    // ===== 评论 =====

    pub async fn create_comment(
        &self,
        post_id: Uuid,
        author_id: Uuid,
        body: &str,
        parent_id: Option<Uuid>,
    ) -> Result<Comment, AppError> {
        self.comment
            .create_comment(post_id, author_id, body, parent_id)
            .await
    }

    pub async fn find_comments_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<Comment>, AppError> {
        self.comment.find_comments_by_post(post_id).await
    }

    pub async fn delete_comment(&self, id: Uuid) -> Result<(), AppError> {
        self.comment.delete_comment(id).await
    }

    pub async fn toggle_comment_pin(&self, id: Uuid) -> Result<bool, AppError> {
        self.comment.toggle_comment_pin(id).await
    }

    pub async fn find_comment_by_id(&self, id: Uuid) -> Result<Option<Comment>, AppError> {
        self.comment.find_comment_by_id(id).await
    }

    pub async fn find_comments_by_post_author(
        &self,
        author_id: Uuid,
        post_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Comment>, i64), AppError> {
        self.comment
            .find_comments_by_post_author(author_id, post_id, limit, offset)
            .await
    }

    // ===== 点赞 =====

    pub async fn toggle_like(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.post.toggle_like(target_type, target_id, user_id).await
    }

    pub async fn has_liked(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.post.has_liked(target_type, target_id, user_id).await
    }

    pub async fn list_liked_posts(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.post.list_liked_posts(user_id, page, page_size).await
    }

    // ===== 举报 =====

    pub async fn create_report(
        &self,
        reporter_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        reason: &str,
    ) -> Result<Uuid, AppError> {
        self.post
            .create_report(reporter_id, target_type, target_id, reason)
            .await
    }

    // ===== 投票 =====

    pub async fn vote(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        value: i16,
    ) -> Result<i16, AppError> {
        self.poll.vote(user_id, target_type, target_id, value).await
    }

    pub async fn get_vote_score(
        &self,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<(i64, i64, i64), AppError> {
        self.poll.get_vote_score(target_type, target_id).await
    }

    // ===== 社区投票/问卷 =====

    pub async fn create_poll(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        title: &str,
        desc: &str,
        poll_type: &str,
        options: &[String],
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Uuid, AppError> {
        self.poll
            .create_poll(space_id, author_id, title, desc, poll_type, options, expires_at)
            .await
    }

    pub async fn vote_poll(
        &self,
        poll_id: Uuid,
        option_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        self.poll.vote_poll(poll_id, option_id, user_id).await
    }

    pub async fn list_polls_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.poll.list_polls_by_space(space_id).await
    }

    pub async fn list_all_polls(
        &self,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.poll.list_all_polls(page, page_size).await
    }

    pub async fn get_poll_results(
        &self,
        poll_id: Uuid,
    ) -> Result<serde_json::Value, AppError> {
        self.poll.get_poll_results(poll_id).await
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
        self.post
            .save_draft(user_id, space_id, title, body, module_type, tags)
            .await
    }

    pub async fn list_drafts(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.post.list_drafts(user_id).await
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
        self.post
            .create_announcement(space_id, author_id, title, body, importance)
            .await
    }

    pub async fn list_announcements(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.post.list_announcements(space_id).await
    }

    // ===== Feed =====

    pub async fn get_feed(
        &self,
        page: u32,
        page_size: u32,
        sort: Option<&str>,
        user_id: Option<Uuid>,
    ) -> Result<(Vec<serde_json::Value>, u64), AppError> {
        self.post.get_feed(page, page_size, sort, user_id).await
    }

    // ===== 批量查询 =====

    pub async fn find_users_batch(
        &self,
        user_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, UserPublic>, AppError> {
        self.post.find_users_batch(user_ids).await
    }

    pub async fn find_spaces_batch(
        &self,
        space_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, serde_json::Value>, AppError> {
        self.post.find_spaces_batch(space_ids).await
    }

    pub async fn find_posts_by_ids(&self, ids: &[Uuid]) -> Result<Vec<Post>, AppError> {
        self.post.find_posts_by_ids(ids).await
    }

    pub async fn find_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<polis_core::models::User>, AppError> {
        self.post.find_user_by_username(username).await
    }

    // ===== 书签 =====

    pub async fn toggle_bookmark(
        &self,
        user_id: Uuid,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<bool, AppError> {
        self.bookmark
            .toggle_bookmark(user_id, target_type, target_id)
            .await
    }

    pub async fn has_bookmarked(
        &self,
        target_type: &str,
        target_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.bookmark.has_bookmarked(target_type, target_id, user_id).await
    }

    pub async fn list_bookmarks(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.bookmark.list_bookmarks(user_id, page, page_size).await
    }

    // ===== 文件分享 =====

    pub async fn create_file_record(
        &self,
        space_id: Uuid,
        uploader_id: Uuid,
        filename: &str,
        file_size: i64,
        mime_type: &str,
        storage_path: &str,
    ) -> Result<Uuid, AppError> {
        self.file
            .create_file_record(space_id, uploader_id, filename, file_size, mime_type, storage_path)
            .await
    }

    pub async fn list_files_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.file.list_files_by_space(space_id).await
    }

    pub async fn get_file_by_id(
        &self,
        file_id: Uuid,
    ) -> Result<(Uuid, String, i64, String, String), AppError> {
        self.file.get_file_by_id(file_id).await
    }

    pub async fn create_share_link(
        &self,
        file_id: Uuid,
        code: &str,
        password: Option<&str>,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
        max_downloads: Option<i32>,
    ) -> Result<serde_json::Value, AppError> {
        self.file
            .create_share_link(file_id, code, password, expires_at, max_downloads)
            .await
    }

    pub async fn get_share_link_by_code(
        &self,
        code: &str,
    ) -> Result<
        (
            Uuid,
            Uuid,
            Option<String>,
            Option<chrono::DateTime<chrono::Utc>>,
            Option<i32>,
            i32,
            bool,
        ),
        AppError,
    > {
        self.file.get_share_link_by_code(code).await
    }

    pub async fn increment_share_download(
        &self,
        link_id: Uuid,
        file_id: Uuid,
    ) -> Result<(), AppError> {
        self.file.increment_share_download(link_id, file_id).await
    }

    // ===== 付费社区（会员等级） =====

    pub async fn list_tiers(&self, space_id: Uuid) -> Result<Vec<SpaceTier>, AppError> {
        self.tier.list_tiers(space_id).await
    }

    pub async fn get_tier(&self, tier_id: Uuid) -> Result<SpaceTier, AppError> {
        self.tier.get_tier(tier_id).await
    }

    pub async fn create_tier(
        &self,
        space_id: Uuid,
        name: &str,
        price_cents: i64,
        currency: &str,
        description: &str,
        benefits: &serde_json::Value,
        sort_order: i32,
    ) -> Result<Uuid, AppError> {
        self.tier
            .create_tier(space_id, name, price_cents, currency, description, benefits, sort_order)
            .await
    }

    pub async fn update_tier(
        &self,
        tier_id: Uuid,
        space_id: Uuid,
        name: Option<&str>,
        price_cents: Option<i64>,
        description: Option<&str>,
        benefits: Option<&serde_json::Value>,
        sort_order: Option<i32>,
        is_active: Option<bool>,
    ) -> Result<(), AppError> {
        self.tier
            .update_tier(
                tier_id, space_id, name, price_cents, description, benefits, sort_order, is_active,
            )
            .await
    }

    pub async fn delete_tier(&self, tier_id: Uuid, space_id: Uuid) -> Result<(), AppError> {
        self.tier.delete_tier(tier_id, space_id).await
    }

    pub async fn subscribe(
        &self,
        space_id: Uuid,
        user_id: Uuid,
        tier_id: Uuid,
    ) -> Result<Uuid, AppError> {
        self.tier.subscribe(space_id, user_id, tier_id).await
    }

    pub async fn cancel_subscription(
        &self,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        self.tier.cancel_subscription(space_id, user_id).await
    }

    pub async fn get_user_subscription(
        &self,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Subscription>, AppError> {
        self.tier.get_user_subscription(space_id, user_id).await
    }

    // ===== 内容系列 =====

    pub async fn create_series(
        &self,
        space_id: Uuid,
        author_id: Uuid,
        title: &str,
        description: &str,
        cover_url: Option<&str>,
        visibility: &str,
    ) -> Result<Uuid, AppError> {
        self.series
            .create_series(space_id, author_id, title, description, cover_url, visibility)
            .await
    }

    pub async fn update_series(
        &self,
        series_id: Uuid,
        user_id: Uuid,
        title: Option<&str>,
        description: Option<&str>,
        cover_url: Option<&str>,
        visibility: Option<&str>,
        is_published: Option<bool>,
        sort_order: Option<i32>,
    ) -> Result<(), AppError> {
        self.series
            .update_series(
                series_id, user_id, title, description, cover_url, visibility, is_published,
                sort_order,
            )
            .await
    }

    pub async fn delete_series(
        &self,
        series_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        self.series.delete_series(series_id, user_id).await
    }

    pub async fn list_series_by_space(&self, space_id: Uuid) -> Result<Vec<Series>, AppError> {
        self.series.list_series_by_space(space_id).await
    }

    pub async fn get_series(&self, series_id: Uuid) -> Result<Series, AppError> {
        self.series.get_series(series_id).await
    }

    pub async fn add_post_to_series(
        &self,
        series_id: Uuid,
        post_id: Uuid,
        sort_order: i32,
    ) -> Result<(), AppError> {
        self.series
            .add_post_to_series(series_id, post_id, sort_order)
            .await
    }

    pub async fn remove_post_from_series(
        &self,
        series_id: Uuid,
        post_id: Uuid,
    ) -> Result<(), AppError> {
        self.series.remove_post_from_series(series_id, post_id).await
    }

    pub async fn list_series_posts(&self, series_id: Uuid) -> Result<Vec<Post>, AppError> {
        self.series.list_series_posts(series_id).await
    }

    // ===== 私信 =====

    pub async fn send_direct_message(
        &self,
        sender_id: Uuid,
        receiver_id: Uuid,
        content: &str,
    ) -> Result<DirectMessage, AppError> {
        self.notification
            .send_direct_message(sender_id, receiver_id, content)
            .await
    }

    pub async fn get_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.notification.get_conversations(user_id).await
    }

    pub async fn get_conversation_messages(
        &self,
        user_id: Uuid,
        other_user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<DirectMessage>, AppError> {
        self.notification
            .get_conversation_messages(user_id, other_user_id, limit, offset)
            .await
    }

    pub async fn mark_messages_read(
        &self,
        user_id: Uuid,
        from_user_id: Uuid,
    ) -> Result<i64, AppError> {
        self.notification.mark_messages_read(user_id, from_user_id).await
    }

    pub async fn get_unread_dm_count(&self, user_id: Uuid) -> Result<i64, AppError> {
        self.notification.get_unread_dm_count(user_id).await
    }

    pub async fn delete_direct_message(
        &self,
        msg_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        self.notification.delete_direct_message(msg_id, user_id).await
    }

    pub async fn batch_delete_conversations(
        &self,
        user_id: Uuid,
        other_user_ids: &[Uuid],
    ) -> Result<u64, AppError> {
        self.notification
            .batch_delete_conversations(user_id, other_user_ids)
            .await
    }

    pub async fn toggle_pin_message(
        &self,
        msg_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.notification.toggle_pin_message(msg_id, user_id).await
    }

    pub async fn get_pinned_messages(
        &self,
        user_id: Uuid,
        other_user_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        self.notification.get_pinned_messages(user_id, other_user_id).await
    }

    pub async fn search_direct_messages(
        &self,
        user_id: Uuid,
        other_user_id: Option<Uuid>,
        q: &str,
        limit: i64,
    ) -> Result<Vec<DirectMessage>, AppError> {
        self.notification
            .search_direct_messages(user_id, other_user_id, q, limit)
            .await
    }

    pub async fn mute_conversation(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<(), AppError> {
        self.notification.mute_conversation(user_id, muted_user_id).await
    }

    pub async fn unmute_conversation(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<(), AppError> {
        self.notification
            .unmute_conversation(user_id, muted_user_id)
            .await
    }

    pub async fn is_conversation_muted(
        &self,
        user_id: Uuid,
        muted_user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.notification
            .is_conversation_muted(user_id, muted_user_id)
            .await
    }

    pub async fn get_muted_conversations(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        self.notification.get_muted_conversations(user_id).await
    }

    pub async fn create_notification(
        &self,
        user_id: Uuid,
        typ: &str,
        actor_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        content: &str,
    ) -> Result<(), AppError> {
        self.notification
            .create_notification(user_id, typ, actor_id, target_type, target_id, content)
            .await
    }

    // ===== 跨社区投稿引用 =====

    pub async fn create_reference(
        &self,
        post_id: Uuid,
        space_id: Uuid,
        module_type: &str,
        submitted_by: Uuid,
    ) -> Result<PostReference, AppError> {
        self.post
            .create_reference(post_id, space_id, module_type, submitted_by)
            .await
    }

    pub async fn find_reference(
        &self,
        post_id: Uuid,
        space_id: Uuid,
    ) -> Result<Option<PostReference>, AppError> {
        self.post.find_reference(post_id, space_id).await
    }

    pub async fn list_references_by_post(
        &self,
        post_id: Uuid,
    ) -> Result<Vec<PostReference>, AppError> {
        self.post.list_references_by_post(post_id).await
    }

    pub async fn list_pending_references_by_space(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<PostReference>, AppError> {
        self.post.list_pending_references_by_space(space_id).await
    }

    pub async fn review_reference(
        &self,
        reference_id: Uuid,
        status: &str,
        reviewed_by: Uuid,
    ) -> Result<PostReference, AppError> {
        self.post
            .review_reference(reference_id, status, reviewed_by)
            .await
    }

    pub async fn delete_reference(
        &self,
        reference_id: Uuid,
        submitted_by: Uuid,
    ) -> Result<(), AppError> {
        self.post.delete_reference(reference_id, submitted_by).await
    }

    pub async fn find_approved_reference_post_ids(
        &self,
        space_id: Uuid,
    ) -> Result<Vec<Uuid>, AppError> {
        self.post.find_approved_reference_post_ids(space_id).await
    }

    // ===== 空间分析 =====

    pub async fn get_space_analytics(
        &self,
        space_id: Uuid,
    ) -> Result<serde_json::Value, AppError> {
        self.post.get_space_analytics(space_id).await
    }

    // ===== 标签 =====

    pub async fn upsert_hashtag(&self, tag: &str, normalized: &str) -> Result<(), AppError> {
        self.hashtag.upsert_hashtag(tag, normalized).await
    }

    pub async fn create_hashtag_mapping(
        &self,
        normalized_tag: &str,
        target_type: &str,
        target_id: Uuid,
    ) -> Result<(), AppError> {
        self.hashtag
            .create_hashtag_mapping(normalized_tag, target_type, target_id)
            .await
    }

    pub async fn get_trending_hashtags(&self, limit: i64) -> Result<Vec<Hashtag>, AppError> {
        self.hashtag.get_trending_hashtags(limit).await
    }

    pub async fn get_posts_by_hashtag(
        &self,
        normalized_tag: &str,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<Post>, Pagination), AppError> {
        self.hashtag
            .get_posts_by_hashtag(normalized_tag, page, page_size)
            .await
    }

    // ===== 打赏 =====

    pub async fn create_tip(
        &self,
        sender_id: Uuid,
        receiver_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        amount: i32,
        message: Option<&str>,
        is_anonymous: bool,
    ) -> Result<Tip, AppError> {
        self.tip
            .create_tip(sender_id, receiver_id, target_type, target_id, amount, message, is_anonymous)
            .await
    }

    pub async fn get_tips_received(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<Tip>, AppError> {
        self.tip.get_tips_received(user_id, page, page_size).await
    }

    pub async fn get_tip_leaderboard(
        &self,
        period: &str,
        limit: i64,
    ) -> Result<Vec<(Uuid, i64, i32)>, AppError> {
        self.tip.get_tip_leaderboard(period, limit).await
    }

    // ===== Editor Picks =====

    pub async fn get_active_editor_picks(
        &self,
        pick_type: &str,
    ) -> Result<Vec<EditorPick>, AppError> {
        self.post.get_active_editor_picks(pick_type).await
    }

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
        self.post
            .create_editor_pick(
                target_type, target_id, title_override, desc_override, pick_type, sort_order,
                picked_by,
            )
            .await
    }

    pub async fn delete_editor_pick(&self, id: Uuid) -> Result<(), AppError> {
        self.post.delete_editor_pick(id).await
    }

    // ===== Leaderboard =====

    pub async fn get_leaderboard(
        &self,
        period: &str,
        limit: i64,
    ) -> Result<Vec<(Uuid, i64, i32, i32)>, AppError> {
        self.post.get_leaderboard(period, limit).await
    }

    // ===== Community Events =====

    pub async fn get_active_events(
        &self,
        space_id: Option<Uuid>,
    ) -> Result<Vec<CommunityEvent>, AppError> {
        self.post.get_active_events(space_id).await
    }

    pub async fn get_event_by_id(
        &self,
        event_id: Uuid,
    ) -> Result<Option<CommunityEvent>, AppError> {
        self.post.get_event_by_id(event_id).await
    }

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
        self.post
            .create_event(
                space_id, creator_id, title, description, cover_url, event_type, start_at, end_at,
                rules, prizes,
            )
            .await
    }

    pub async fn join_event(
        &self,
        event_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        self.post.join_event(event_id, user_id).await
    }

    // ===== Weekly Topics =====

    pub async fn get_active_weekly_topic(&self) -> Result<Option<WeeklyTopic>, AppError> {
        self.post.get_active_weekly_topic().await
    }

    pub async fn get_weekly_topic_by_key(
        &self,
        topic_key: &str,
    ) -> Result<Option<WeeklyTopic>, AppError> {
        self.post.get_weekly_topic_by_key(topic_key).await
    }

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
        self.post
            .create_weekly_topic(
                topic_key, title, description, cover_url, topic_type, end_at, created_by,
            )
            .await
    }

    // ===== Recommendations =====

    pub async fn get_recommended_posts(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<Post>, AppError> {
        self.post.get_recommended_posts(user_id, limit).await
    }

    pub async fn get_recommended_spaces(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        self.post.get_recommended_spaces(user_id, limit).await
    }

    pub async fn get_recommended_users(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<UserPublic>, AppError> {
        self.post.get_recommended_users(user_id, limit).await
    }
}
