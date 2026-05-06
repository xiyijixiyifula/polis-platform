use std::sync::Arc;
use std::collections::HashMap;
use axum::{
    response::{IntoResponse, Response},extract::{Path, Query, Request, State, Extension}, middleware, routing::{delete, get, post, put}, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use percent_encoding::percent_decode_str;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, Comment, CreateCommentRequest, CreatePostRequest, CreateSeriesRequest, UpdateSeriesRequest, AddPostToSeriesRequest, SeriesPublic, Post, PostPublic, UpdatePostRequest, PaginationParams, CreateTierRequest, UpdateTierRequest};
use polis_core::resolver::resolve::{resolve_space_id, resolve_space_enabled_modules};
use crate::handlers::content_handler::ContentHandler;
use crate::handlers::chat_handler::ChatHandler;
use crate::middleware::auth::auth_middleware;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize as SerdeDeserialize;
use sqlx::PgPool;

/// Helper to wrap a value in Json response
fn json_ok<T: serde::Serialize>(value: T) -> Json<serde_json::Value> {
    Json(serde_json::to_value(value).unwrap())
}

#[derive(serde::Deserialize)]
pub struct ListPostsQuery {
    #[serde(flatten)] pub pagination: PaginationParams,
    pub module: Option<String>,
    pub sort: Option<String>,
}

#[derive(Deserialize)]
pub struct ReportRequest { pub reason: String }

#[derive(Deserialize)]
pub struct VoteRequest { pub target_type: String, pub target_id: Uuid, pub value: i16 }

#[derive(Deserialize)]
pub struct GetVoteQuery { pub target_type: String, pub target_id: Uuid }

#[derive(Deserialize)]
pub struct CreatePollRequest { pub space_id: Uuid, pub title: String, pub description: Option<String>, pub poll_type: Option<String>, pub options: Vec<String>, pub expires_at: Option<String> }

#[derive(Deserialize)]
pub struct VotePollRequest { pub option_id: Uuid }

#[derive(Deserialize)]
pub struct SaveDraftRequest { pub space_id: Option<Uuid>, pub title: String, pub body: String, pub module_type: Option<String>, pub tags: Option<Vec<String>> }

/// 从路径中提取 namespace 和 post ID
/// 返回 (namespace, post_id, sub_action)
fn parse_content_path(path: &str) -> Result<(String, Option<Uuid>, Option<String>), AppError> {
    let remaining_raw = path.strip_prefix("/api/spaces/").unwrap_or("");
    if remaining_raw.is_empty() {
        return Err(AppError::NotFound("Invalid path".to_string()));
    }
    // URL 解码命名空间（支持中文等非 ASCII 字符）
    let remaining = percent_decode_str(remaining_raw)
        .decode_utf8()
        .map_err(|_| AppError::Validation("Invalid UTF-8 in path".to_string()))?
        .to_string();

    // 找到 /posts 或 /featured 或 /announcements
    if let Some(pos) = remaining.find("/posts") {
        let ns = &remaining[..pos];
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        let after_posts = &remaining[pos + 6..]; // skip "/posts"
        if after_posts.is_empty() {
            return Ok((ns.to_string(), None, None));
        }
        let parts: Vec<&str> = after_posts.split('/').filter(|s| !s.is_empty()).collect();
        if parts.is_empty() {
            return Ok((ns.to_string(), None, None));
        }
        let id = Uuid::parse_str(parts[0]).map_err(|_| AppError::Validation("Invalid post ID".to_string()))?;
        let sub_action = parts.get(1).map(|s| s.to_string());
        return Ok((ns.to_string(), Some(id), sub_action));
    }

    if remaining.contains("/featured") {
        let ns = remaining.strip_suffix("/featured").unwrap_or(remaining.as_str());
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("featured".to_string())));
    }

    if remaining.contains("/announcements") {
        let ns = remaining.strip_suffix("/announcements").unwrap_or(remaining.as_str());
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("announcements".to_string())));
    }

    if remaining.contains("/files") {
        let ns = remaining.strip_suffix("/files").unwrap_or(remaining.as_str());
        if ns.is_empty() { return Err(AppError::NotFound("Missing namespace".to_string())); }
        return Ok((ns.to_string(), None, Some("files".to_string())));
    }

    if remaining.contains("/polls") {
        let ns = remaining.strip_suffix("/polls").unwrap_or(remaining.as_str());
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("polls".to_string())));
    }

    if remaining.contains("/analytics") {
        let ns = remaining.strip_suffix("/analytics").unwrap_or(remaining.as_str());
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("analytics".to_string())));
    }

    Err(AppError::NotFound("Invalid content path".to_string()))
}

pub fn content_routes(handler: Arc<ContentHandler>) -> Router {
    let public = Router::new()
        .route("/health", get(health_check))
        // 聊天（公开可读）- v0.3.0
        .route("/api/chat/spaces/{*ns}", get(get_chat_messages))
        .route("/api/spaces/{*path}", get(handle_public_content))
        // 公开的投票/问卷列表 + 单个投票详情
        .route("/api/polls", get(list_all_polls_route))
        .route("/api/polls/{id}", get(get_poll_public))
        // 通过 ID 获取帖子（无需知道 namespace）
        .route("/api/posts/search", get(search_posts_route))
    .route("/api/files/{id}", get(get_file_route))
    .route("/api/feed", get(feed_route))
        .route("/api/posts/{id}", get(get_post_by_id_route))
        .route("/api/posts/{id}/view", post(increment_view_route))
        .route("/api/posts/{id}/download", get(download_post_route))
        .route("/api/posts/{id}/comments", get(get_post_comments_route).post(create_comment_by_post_id))
        // 获取投票分数（赞同/反对）
        .route("/api/vote", get(get_vote_score_route))
        // 系列（专栏）公开接口
        .route("/api/tiers/space/{*ns}", get(list_tiers_route))
        .route("/api/series/{id}", get(get_series_route))
        .route("/api/series/space/{*ns}", get(list_series_route));

    // 需要认证的路由
    let auth = Router::new()
        // 聊天（发送需认证）- v0.3.0
        .route("/api/chat/spaces/{*ns}", post(post_chat_message))
        .route("/api/spaces/{*path}", post(handle_auth_content).put(handle_auth_content).delete(handle_auth_content))
        .route("/api/bookmarks", get(list_bookmarks))
        .route("/api/liked-posts", get(list_liked_posts_route))
        // 投票（赞同/反对）
        .route("/api/vote", post(handle_vote))
        // 投票/问卷管理
        .route("/api/polls", post(create_poll_route))
        .route("/api/polls/{id}/vote", post(vote_poll_route))
        .route("/api/polls/{id}/my-vote", get(get_my_vote_route))
        // 草稿
        .route("/api/drafts", get(list_drafts_route).post(save_draft_route))
        // 通知
        .route("/api/notifications", get(list_notifications_route))
        .route("/api/notifications/unread-count", get(unread_count_route))
        .route("/api/notifications/read", post(mark_read_route))
        .route("/api/notifications/read-all", post(mark_all_read_route))
        // 系列（专栏）管理接口
        .route("/api/series/space/{*ns}", post(create_series_route))
        .route("/api/series/{id}", put(update_series_route).delete(delete_series_route))
        .route("/api/series/{id}/posts", post(add_post_to_series_route))
        .route("/api/series/{id}/posts/{post_id}", delete(remove_post_from_series_route))
        .route("/api/tiers/space/{*ns}", post(create_tier_route))
        .route("/api/tiers/{id}", put(update_tier_route).delete(delete_tier_route))
        .route("/api/subscribe/space/{*ns}", post(subscribe_route).delete(unsubscribe_route))
        .route("/api/subscribe/space/{*ns}", get(get_subscription_route))
        .route("/api/files/share", post(create_file_share_route))
        .route("/api/upload", post(upload_file_route))
        .route("/api/import/markdown", post(import_markdown_route))
        // 评论点赞（仅认证用户）
        .route("/api/comments/{id}/like", post(like_comment_route))
        // 通过 ID 更新/删除帖子（需认证）
        .route("/api/posts/{id}", put(update_post_by_id_route).delete(delete_post_by_id_route))
        // 创作中心：作者查看所有自己的内容（用户Ⓚ OS: /home/user/ 目录）
        .route("/api/my/contents", get(get_my_contents_route))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware));

    let share_routes = Router::new()
        .route("/api/share/{code}", get(get_share_info_route))
        .route("/api/share/{code}/download", get(download_share_route));

    public.merge(auth).merge(share_routes).with_state(handler)
}

/// 公共 GET 请求处理器
async fn handle_public_content(
    State(h): State<Arc<ContentHandler>>,
    req: Request,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = req.uri().path().to_string();
    let (ns, post_id, sub_action) = parse_content_path(&path)?;
    let space_id = resolve_space_id(&h.pool, &ns).await?;

    match (post_id, sub_action.as_deref()) {
        (None, None) | (None, Some("posts")) => {
            // GET /api/spaces/{ns}/posts - list posts
            let query = parse_query_params::<ListPostsQuery>(req.uri().query());
            let q = query.unwrap_or(ListPostsQuery {
                pagination: PaginationParams { page: Some(1), page_size: Some(20) },
                module: None,
                sort: None,
            });
            let enabled = resolve_space_enabled_modules(&h.pool, space_id).await.unwrap_or_default();
            let (posts, pagination) = h.get_posts(space_id, q.pagination, q.module, q.sort, enabled).await?;
            Ok(json_ok(ApiResponse::success_with_pagination(posts, pagination)))
        }
        (Some(id), None) => {
            // GET /api/spaces/{ns}/posts/{id}
            let post = h.get_post_public(id).await?;
            Ok(json_ok(ApiResponse::success(post)))
        }
        (Some(id), Some("comments")) => {
            // GET /api/spaces/{ns}/posts/{id}/comments
            let comments = h.get_comments(id).await?;
            Ok(json_ok(ApiResponse::success(comments)))
        }
        (None, Some("files")) => {
            let files = h.list_files(space_id).await?;
            Ok(json_ok(ApiResponse::success(files)))
        }
        (None, Some("featured")) => {
            let posts = h.get_featured_posts(space_id, 20).await?;
            Ok(json_ok(ApiResponse::success(posts)))
        }
        (None, Some("announcements")) => {
            let announcements = h.list_announcements(space_id).await?;
            Ok(json_ok(ApiResponse::success(announcements)))
        }
        (None, Some("polls")) => {
            let polls = h.list_polls_by_space(space_id).await?;
            Ok(json_ok(ApiResponse::success(polls)))
        }
        (None, Some("analytics")) => {
            let analytics = h.get_space_analytics(space_id).await?;
            Ok(json_ok(ApiResponse::success(analytics)))
        }
        _ => Err(AppError::NotFound("Route not found".to_string())),
    }
}

/// 需要认证的请求处理器（空间相关）
async fn handle_auth_content(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    req: Request,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = req.uri().path().to_string();
    let method = req.method().clone();

    // 读取请求体
    let body_bytes = axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await
        .map_err(|_| AppError::Validation("Failed to read body".to_string()))?;

    let (ns, post_id, sub_action) = parse_content_path(&path)?;

    match method {
        axum::http::Method::POST => {
            match (post_id, sub_action.as_deref()) {
                (None, Some("files")) => {
                    let r: UploadFileRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    use base64::Engine;
                    let data = base64::engine::general_purpose::STANDARD.decode(&r.data_base64)
                        .map_err(|e| AppError::Validation(format!("Invalid base64: {}", e)))?;
                    let mime_type = r.mime_type.unwrap_or_else(|| "application/octet-stream".to_string());
                    let space_id = resolve_space_id(&h.pool, &ns).await?;
                    let result = h.upload_file(space_id, uid, &r.filename, &data, &mime_type).await?;
                    Ok(json_ok(ApiResponse::success(result)))
                }
                (None, None) | (None, Some("posts")) => {
                    // POST /api/spaces/{ns}/posts - create
                    let r: CreatePostRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    let space_id = resolve_space_id(&h.pool, &ns).await?;

                    // 分享模块权限校验：仅创建者可发布
                    if let Some(ref mt) = r.module_type {
                        if mt.to_string() == "share" {
                            let owner_id: Option<Uuid> = sqlx::query_scalar(
                                "SELECT owner_id FROM spaces WHERE id = $1"
                            )
                            .bind(space_id)
                            .fetch_optional(&h.pool)
                            .await?
                            .flatten();
                            if owner_id != Some(uid) {
                                return Err(AppError::Forbidden("仅社区创建者可发布分享内容".to_string()));
                            }
                        }
                    }

                    let post = h.create_post(space_id, uid, r).await?;
                    Ok(json_ok(ApiResponse::success(post)))
                }
                (Some(id), Some("like")) => {
                    let liked = h.toggle_like("post", id, uid).await?;
                    Ok(json_ok(ApiResponse::success(liked)))
                }
                (Some(id), Some("comments")) => {
                    let r: CreateCommentRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    let comment = h.create_comment(id, uid, r).await?;
                    Ok(json_ok(ApiResponse::success(comment)))
                }
                (Some(id), Some("bookmark")) => {
                    let bookmarked = h.repo.toggle_bookmark(uid, "post", id).await?;
                    Ok(json_ok(ApiResponse::success(bookmarked)))
                }
                (Some(id), Some("report")) => {
                    let r: ReportRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    h.repo.create_report(uid, "post", id, &r.reason).await?;
                    Ok(json_ok(ApiResponse::success(())))
                }
                (Some(id), Some("pin")) => {
                    let pinned = h.toggle_pin_post(id, uid).await?;
                    Ok(json_ok(ApiResponse::success(serde_json::json!({"pinned": pinned}))))
                }
                (Some(id), Some("featured")) => {
                    let featured = h.toggle_featured_post(id, uid).await?;
                    Ok(json_ok(ApiResponse::success(serde_json::json!({"featured": featured}))))
                }
                (Some(id), Some("hide")) | (Some(id), Some("unhide")) => {
                    let hidden = h.hide_post_from_space(id, uid).await?;
                    Ok(json_ok(ApiResponse::success(serde_json::json!({"hidden": hidden}))))
                }
                _ => Err(AppError::NotFound("Route not found".to_string())),
            }
        }
        axum::http::Method::PUT => {
            match (post_id, sub_action.as_deref()) {
                (Some(id), None) => {
                    let r: UpdatePostRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    let post = h.update_post(id, uid, r).await?;
                    Ok(json_ok(ApiResponse::success(post)))
                }
                _ => Err(AppError::NotFound("Route not found".to_string())),
            }
        }
        axum::http::Method::DELETE => {
            match (post_id, sub_action.as_deref()) {
                (Some(id), None) => {
                    h.delete_post(id, uid).await?;
                    Ok(json_ok(ApiResponse::success(())))
                }
                _ => Err(AppError::NotFound("Route not found".to_string())),
            }
        }
        _ => Err(AppError::NotFound("Method not allowed".to_string())),
    }
}

// ===== 投票（赞同/反对） =====

/// 获取投票分数（公开接口）
async fn get_vote_score_route(
    State(h): State<Arc<ContentHandler>>,
    Query(q): Query<GetVoteQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (upvotes, downvotes, score) = h.get_vote_score(&q.target_type, q.target_id).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({
        "target_type": q.target_type,
        "target_id": q.target_id.to_string(),
        "upvotes": upvotes,
        "downvotes": downvotes,
        "score": score,
    }))))
}

async fn handle_vote(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Json(req): Json<VoteRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = h.vote(uid, &req.target_type, req.target_id, req.value).await?;
    // 返回完整分数信息，方便前端更新
    let (upvotes, downvotes, score) = h.get_vote_score(&req.target_type, req.target_id).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({
        "user_vote": result,
        "upvotes": upvotes,
        "downvotes": downvotes,
        "score": score,
    }))))
}

// ===== 投票/问卷 =====

async fn create_poll_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Json(req): Json<CreatePollRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let expires_at = req.expires_at
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));
    let poll_type = req.poll_type.unwrap_or_else(|| "single".to_string());
    let desc = req.description.unwrap_or_default();
    let poll_id = h.create_poll(req.space_id, uid, &req.title, &desc, &poll_type, &req.options, expires_at).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({"id": poll_id}))))
}

/// 创作中心：获取当前用户所有内容
/// 用户Ⓚ OS: 相当于 /home/user/ 目录下的所有文件
async fn get_my_contents_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page: u32 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: u32 = params.get("page_size").and_then(|s| s.parse().ok()).unwrap_or(50);
    let contents = h.get_user_contents(uid, page, page_size).await?;
    Ok(json_ok(ApiResponse::success(contents)))
}

async fn list_all_polls_route(
    State(h): State<Arc<ContentHandler>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page: u32 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: u32 = params.get("page_size").and_then(|s| s.parse().ok()).unwrap_or(20);
    let polls = h.list_all_polls(page, page_size).await?;
    Ok(json_ok(ApiResponse::success(polls)))
}

async fn get_poll_public(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let results = h.get_poll_results(id).await?;
    Ok(json_ok(ApiResponse::success(results)))
}

async fn vote_poll_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(id): Path<Uuid>,
    Json(req): Json<VotePollRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    h.vote_poll(id, req.option_id, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

/// 获取当前用户是否已投票及投的选项
async fn get_my_vote_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT po.id::text FROM poll_votes pv JOIN poll_options po ON po.id = pv.option_id WHERE pv.poll_id = $1 AND pv.user_id = $2"
    )
    .bind(id).bind(uid)
    .fetch_optional(&h.pool).await?;

    if let Some((option_id,)) = row {
        Ok(json_ok(ApiResponse::success(serde_json::json!({
            "voted": true,
            "option_id": option_id,
        }))))
    } else {
        Ok(json_ok(ApiResponse::success(serde_json::json!({
            "voted": false,
            "option_id": null,
        }))))
    }
}

// ===== 草稿 =====

async fn list_drafts_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let drafts = h.list_drafts(uid).await?;
    Ok(json_ok(ApiResponse::success(drafts)))
}

async fn save_draft_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Json(req): Json<SaveDraftRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tags = req.tags.as_ref()
        .map(|t| serde_json::to_value(t).unwrap_or_default())
        .unwrap_or(serde_json::Value::Array(vec![]));
    let module_type = req.module_type.unwrap_or_else(|| "forum".to_string());
    let draft_id = h.save_draft(uid, req.space_id, &req.title, &req.body, &module_type, &tags).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({"id": draft_id}))))
}

// ===== 通知 =====

async fn list_notifications_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let rows = sqlx::query_as::<_, (serde_json::Value,)>(
        "SELECT json_build_object('id', id, 'type', type, 'actor_id', actor_id, 'target_type', target_type, 'target_id', target_id, 'content', content, 'is_read', is_read, 'created_at', created_at) FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50"
    ).bind(uid).fetch_all(&h.pool).await?;
    let notifs: Vec<serde_json::Value> = rows.into_iter().map(|r| r.0).collect();
    Ok(json_ok(ApiResponse::success(notifs)))
}

async fn unread_count_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE"
    ).bind(uid).fetch_one(&h.pool).await?;
    Ok(json_ok(ApiResponse::success(count.0)))
}

async fn mark_all_read_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE")
        .bind(uid).execute(&h.pool).await?;
    Ok(json_ok(ApiResponse::success(())))
}

#[derive(Deserialize)]
struct MarkReadBody { notification_id: Uuid }

async fn mark_read_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Json(body): Json<MarkReadBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 AND is_read = FALSE")
        .bind(body.notification_id).bind(uid).execute(&h.pool).await?;
    Ok(json_ok(ApiResponse::success(())))
}

#[derive(Deserialize)]
pub struct SearchPostsQuery {
    pub q: Option<String>,
    pub tag: Option<String>,
    pub page_size: Option<u32>,
}

/// 搜索帖子（公开接口，支持关键词和标签）
async fn search_posts_route(
    State(h): State<Arc<ContentHandler>>,
    Query(q): Query<SearchPostsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let limit = q.page_size.unwrap_or(20).min(50);
    let posts = h.search_posts(q.q.as_deref(), q.tag.as_deref(), limit).await?;
    Ok(json_ok(ApiResponse::success(posts)))
}

// ===== 通过 ID 获取帖子（无需 namespace） =====

/// 通过帖子 ID 直接获取帖子详情（公开接口）
async fn get_post_by_id_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let post = h.get_post_public(id).await?;
    Ok(json_ok(ApiResponse::success(post)))
}

/// 递增帖子浏览量（公开接口，v0.3.6）
async fn increment_view_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let view_count = h.repo.increment_view_count(id).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({
        "post_id": id,
        "view_count": view_count,
    }))))
}

/// 下载帖子为 Markdown 文件（公开接口，v0.3.9）
async fn download_post_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let post = h.repo.find_post_by_id(id).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;
    let filename = sanitize_filename(&post.title);
    let tags_str = if let Some(arr) = post.tags.as_array() {
        arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", ")
    } else { String::new() };
    let frontmatter = format!(
        "---\ntitle: \"{}\"\nauthor_id: {}\nspace_id: {}\nmodule: {}\ntags: [{}]\ndate: {}\n---\n\n",
        post.title, post.author_id, post.space_id, post.module_type, tags_str,
        post.created_at.format("%Y-%m-%d %H:%M:%S")
    );
    let markdown = format!("{}{}", frontmatter, post.body);
    let disp = format!("attachment; filename=\"{}.md\"", filename);
    let mut resp = Response::new(axum::body::Body::from(markdown));
    resp.headers_mut().insert("content-type", axum::http::HeaderValue::from_static("text/markdown; charset=utf-8"));
    resp.headers_mut().insert("content-disposition", axum::http::HeaderValue::from_str(&disp).unwrap());
    Ok(resp)
}

/// 清理文件名中的不安全字符
fn sanitize_filename(title: &str) -> String {
    title.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ' ' || ('\u{4e00}'..='\u{9fff}').contains(&c) { c } else { '_' })
        .collect::<String>()
        .trim()
        .replace(' ', "-")
        .chars()
        .take(80)
        .collect()
}


/// 通过帖子 ID 创建评论（无需知道 namespace，自动解析）
async fn create_comment_by_post_id(
    State(h): State<Arc<ContentHandler>>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateCommentRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());
    let token_data = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map_err(|_| AppError::Unauthorized)?;
    let uid = Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AppError::Unauthorized)?;
    let comment = h.create_comment(id, uid, req).await?;
    Ok(json_ok(ApiResponse::success(comment)))
}

#[derive(Debug, SerdeDeserialize)]
struct Claims {
    pub sub: String,
    #[allow(dead_code)]
    pub token_type: String,
    #[allow(dead_code)]
    pub exp: usize,
}

/// 通过帖子 ID 获取评论列表（公开接口）
async fn get_post_comments_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let comments = h.get_comments(id).await?;
    Ok(json_ok(ApiResponse::success(comments)))
}

/// 点赞/取消点赞评论
async fn like_comment_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let liked = h.toggle_like("comment", id, uid).await?;
    Ok(json_ok(ApiResponse::success(liked)))
}

/// 解析查询参数（手动解析，避免额外依赖）
fn parse_query_params<T: serde::de::DeserializeOwned>(query: Option<&str>) -> Option<T> {
    let query = query?;
    // 将 URL 查询参数转换为 JSON 对象再反序列化
    let mut map = serde_json::Map::new();
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next()?;
        let value = parts.next().unwrap_or("");
        let decoded = urlencoding_decode(value).unwrap_or_else(|| value.to_string());
        map.insert(key.to_string(), serde_json::Value::String(decoded.to_string()));
    }
    serde_json::from_value(serde_json::Value::Object(map)).ok()
}

/// 简单的 URL 解码（处理 %XX 编码）
fn urlencoding_decode(s: &str) -> Option<String> {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                let byte = u8::from_str_radix(&hex, 16).ok()?;
                result.push(byte as char);
            } else {
                return None;
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    Some(result)
}

/// 书签列表（需要认证）
async fn list_bookmarks(State(h): State<Arc<ContentHandler>>, axum::Extension(uid): axum::Extension<Uuid>,
    Query(p): Query<PaginationParams>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.repo.list_bookmarks(uid, p.page.unwrap_or(1), p.page_size.unwrap_or(20)).await?)))
}

/// 点赞的帖子列表（需要认证）
async fn list_liked_posts_route(State(h): State<Arc<ContentHandler>>, axum::Extension(uid): axum::Extension<Uuid>,
    Query(p): Query<PaginationParams>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.repo.list_liked_posts(uid, p.page.unwrap_or(1), p.page_size.unwrap_or(20)).await?)))
}


// ===== Series Route Handlers =====

#[derive(Deserialize)]
pub struct CreateSeriesRouteRequest {
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: Option<String>,
}

async fn create_series_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(ns): Path<String>,
    Json(req): Json<CreateSeriesRouteRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let ns_clean = ns.trim_start_matches('/');
    let space_id = resolve_space_id(&h.pool, ns_clean).await?;
    let series_req = CreateSeriesRequest {
        title: req.title,
        description: req.description,
        cover_url: req.cover_url,
        visibility: req.visibility,
    };
    let id = h.create_series(space_id, uid, series_req).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({"id": id}))))
}

async fn update_series_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(series_id): Path<Uuid>,
    Json(req): Json<UpdateSeriesRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    h.update_series(series_id, uid, req).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn delete_series_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(series_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    h.delete_series(series_id, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn list_series_route(
    State(h): State<Arc<ContentHandler>>,
    Path(ns): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let ns_clean = ns.trim_start_matches('/');
    let space_id = resolve_space_id(&h.pool, ns_clean).await?;
    let series_list: Vec<SeriesPublic> = h.list_series_by_space(space_id).await?;
    Ok(json_ok(ApiResponse::success(series_list)))
}

async fn get_series_route(
    State(h): State<Arc<ContentHandler>>,
    Path(series_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (series, posts) = h.get_series_public(series_id).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({
        "series": series,
        "posts": posts,
    }))))
}

async fn add_post_to_series_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(series_id): Path<Uuid>,
    Json(req): Json<AddPostToSeriesRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let sort_order = req.sort_order.unwrap_or(0);
    h.add_post_to_series(series_id, req.post_id, sort_order, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn remove_post_from_series_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path((series_id, post_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>, AppError> {
    h.remove_post_from_series(series_id, post_id, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

// ===== File Sharing Route Handlers =====

#[derive(Deserialize)]
pub struct CreateShareRequest { pub file_id: Uuid, pub expires_hours: Option<i64>, pub password: Option<String> }

#[derive(Deserialize)]
pub struct DownloadShareQuery { pub password: Option<String> }

#[derive(Deserialize)]
pub struct UploadFileRequest { pub filename: String, pub data_base64: String, pub mime_type: Option<String> }

async fn create_file_share_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Json(req): Json<CreateShareRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = h.create_file_share(req.file_id, uid, req.expires_hours, req.password).await?;
    Ok(json_ok(ApiResponse::success(result)))
}

async fn get_share_info_route(
    State(h): State<Arc<ContentHandler>>,
    Path(code): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let info = h.get_share_info(&code).await?;
    Ok(json_ok(ApiResponse::success(info)))
}

async fn download_share_route(
    State(h): State<Arc<ContentHandler>>,
    Path(code): Path<String>,
    Query(q): Query<DownloadShareQuery>,
) -> Result<impl IntoResponse, AppError> {
    let (data, filename, mime_type) = h.download_shared_file(&code, q.password.as_deref()).await?;
    let disp = format!("attachment; filename={}", filename);
    let mut resp = Response::new(axum::body::Body::from(data));
    resp.headers_mut().insert("content-type", axum::http::HeaderValue::from_str(&mime_type).unwrap());
    resp.headers_mut().insert("content-disposition", axum::http::HeaderValue::from_str(&disp).unwrap());
    Ok(resp)
}

async fn get_file_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let (data, _filename, mime_type) = h.get_file(id).await?;
    let content_type = mime_type.parse::<axum::http::HeaderValue>()
        .unwrap_or_else(|_| axum::http::HeaderValue::from_static("application/octet-stream"));
    Ok(Response::builder()
        .header(axum::http::header::CONTENT_TYPE, content_type)
        .body(axum::body::Body::from(data))
        .unwrap())
}
// ===== 付费社区（会员等级）路由处理函数 =====

#[derive(serde::Deserialize)]
struct TierNsPath { ns: String }

#[derive(serde::Deserialize)]
struct UpdateTierBody { space_ns: Option<String>, name: Option<String>, price_cents: Option<i64>, description: Option<String>, benefits: Option<Vec<String>>, sort_order: Option<i32>, is_active: Option<bool> }

#[derive(serde::Deserialize)]
struct DeleteTierBody { space_ns: Option<String> }

#[derive(serde::Deserialize)]
struct SubscribeBody { tier_id: Uuid }

async fn list_tiers_route(
    State(h): State<Arc<ContentHandler>>,
    Path(p): Path<TierNsPath>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &p.ns).await?;
    let tiers = h.list_tiers(space_id).await?;
    Ok(json_ok(ApiResponse::success(tiers)))
}

async fn create_tier_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(_uid): axum::Extension<Uuid>,
    Path(p): Path<TierNsPath>,
    Json(req): Json<CreateTierRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &p.ns).await?;
    let id = h.create_tier(space_id, req).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({"id": id}))))
}

async fn update_tier_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(_uid): axum::Extension<Uuid>,
    Path(tier_id): Path<Uuid>,
    Json(req): Json<UpdateTierRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch tier to get space_id for authorization
    let tier = h.repo.get_tier(tier_id).await?;
    h.update_tier(tier_id, tier.space_id, req).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn delete_tier_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(_uid): axum::Extension<Uuid>,
    Path(tier_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tier = h.repo.get_tier(tier_id).await?;
    h.delete_tier(tier_id, tier.space_id).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn subscribe_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(p): Path<TierNsPath>,
    Json(body): Json<SubscribeBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &p.ns).await?;
    let id = h.subscribe_to_tier(space_id, uid, body.tier_id).await?;
    Ok(json_ok(ApiResponse::success(serde_json::json!({"id": id}))))
}

async fn unsubscribe_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(p): Path<TierNsPath>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &p.ns).await?;
    h.cancel_subscription(space_id, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn import_markdown_route(
    State(h): State<Arc<ContentHandler>>,
    Extension(uid): Extension<Uuid>,
    Json(r): Json<UploadFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let data = base64_decode(&r.data_base64)?;
    let content = h.import_markdown(uid, &r.filename, &data).await?;
    Ok(Json(serde_json::json!({"code": 0, "data": {"content": content}})))
}

async fn upload_file_route(
    State(h): State<Arc<ContentHandler>>,
    Extension(uid): Extension<Uuid>,
    Json(r): Json<UploadFileRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let data = base64_decode(&r.data_base64)?;
    let mime = r.mime_type.clone().unwrap_or_else(|| "application/octet-stream".to_string());
    let result = h.upload_file_generic(uid, &r.filename, &data, &mime).await?;
    Ok(Json(serde_json::json!({"code": 0, "data": result})))
}

fn base64_decode(input: &str) -> Result<Vec<u8>, AppError> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.decode(input)
        .map_err(|e| AppError::Validation(format!("Invalid base64: {}", e)))
}

async fn update_post_by_id_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    Extension(uid): Extension<Uuid>,
    Json(r): Json<UpdatePostRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let post = h.update_post(id, uid, r).await?;
    Ok(json_ok(ApiResponse::success(post)))
}

async fn delete_post_by_id_route(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    Extension(uid): Extension<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    h.delete_post(id, uid).await?;
    Ok(json_ok(ApiResponse::success(())))
}

async fn feed_route(
    State(h): State<Arc<ContentHandler>>,
    Query(q): Query<PaginationParams>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = q.page.unwrap_or(1);
    let page_size = q.page_size.unwrap_or(20).min(50);
    let items = h.get_feed(page, page_size).await?;
    Ok(Json(serde_json::json!({"code": 0, "data": items, "pagination": {"page": page, "page_size": page_size}})))
}

async fn get_subscription_route(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(p): Path<TierNsPath>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &p.ns).await?;
    let sub = h.get_user_subscription(space_id, uid).await?;
    Ok(json_ok(ApiResponse::success(sub)))
}


async fn health_check(State(h): State<Arc<ContentHandler>>) -> Json<ApiResponse<serde_json::Value>> {
    let db_ok = sqlx::query("SELECT 1").fetch_one(&h.pool).await.is_ok();
    Json(ApiResponse::success(serde_json::json!({
        "service": "polis-content",
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "version": env!("CARGO_PKG_VERSION"),
    })))
}

// ===== 聊天（v0.3.0） =====

#[derive(Deserialize)]
struct ChatQueryParams { limit: Option<u32> }

#[derive(Deserialize)]
struct SendChatBody { content: String }

/// GET /api/spaces/{ns}/chat — 获取聊天消息列表（公开）
async fn get_chat_messages(
    State(h): State<Arc<ContentHandler>>,
    Path(ns): Path<String>,
    Query(q): Query<ChatQueryParams>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &ns).await?;
    let chat = ChatHandler::new(h.pool.clone());
    let msgs = chat.list_messages(space_id, q.limit.unwrap_or(50)).await?;
    Ok(json_ok(ApiResponse::success(msgs)))
}

/// POST /api/spaces/{ns}/chat — 发送聊天消息（需认证）
async fn post_chat_message(
    State(h): State<Arc<ContentHandler>>,
    axum::Extension(uid): axum::Extension<Uuid>,
    Path(ns): Path<String>,
    Json(body): Json<SendChatBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&h.pool, &ns).await?;
    let chat = ChatHandler::new(h.pool.clone());
    let msg = chat.send_message(space_id, uid, &body.content).await?;
    Ok(json_ok(ApiResponse::success(msg)))
}
