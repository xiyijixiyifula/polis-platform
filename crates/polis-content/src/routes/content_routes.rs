use std::sync::Arc;
use axum::{extract::{Path, Query, Request, State}, middleware, routing::{delete, get, post, put}, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, Comment, CreateCommentRequest, CreatePostRequest, Post, PostPublic, UpdatePostRequest, PaginationParams};
use polis_core::resolver::resolve::resolve_space_id;
use crate::handlers::content_handler::ContentHandler;
use crate::middleware::auth::auth_middleware;

/// Helper to wrap a value in Json response
fn json_ok<T: serde::Serialize>(value: T) -> Json<serde_json::Value> {
    Json(serde_json::to_value(value).unwrap())
}

#[derive(serde::Deserialize)]
pub struct ListPostsQuery {
    #[serde(flatten)] pub pagination: PaginationParams,
    pub module: Option<String>,
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
    let remaining = path.strip_prefix("/api/spaces/").unwrap_or("");
    if remaining.is_empty() {
        return Err(AppError::NotFound("Invalid path".to_string()));
    }

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
        let ns = remaining.strip_suffix("/featured").unwrap_or(remaining);
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("featured".to_string())));
    }

    if remaining.contains("/announcements") {
        let ns = remaining.strip_suffix("/announcements").unwrap_or(remaining);
        if ns.is_empty() {
            return Err(AppError::NotFound("Missing namespace".to_string()));
        }
        return Ok((ns.to_string(), None, Some("announcements".to_string())));
    }

    Err(AppError::NotFound("Invalid content path".to_string()))
}

pub fn content_routes(handler: Arc<ContentHandler>) -> Router {
    let public = Router::new()
        .route("/api/spaces/{*path}", get(handle_public_content))
        // 公开的投票/问卷结果
        .route("/api/polls/{id}", get(get_poll_public))
        // 获取投票分数（赞同/反对）
        .route("/api/vote", get(get_vote_score_route));

    // 需要认证的路由
    let auth = Router::new()
        .route("/api/spaces/{*path}", post(handle_auth_content).put(handle_auth_content).delete(handle_auth_content))
        .route("/api/bookmarks", get(list_bookmarks))
        // 投票（赞同/反对）
        .route("/api/vote", post(handle_vote))
        // 投票/问卷管理
        .route("/api/polls", post(create_poll_route))
        .route("/api/polls/{id}/vote", post(vote_poll_route))
        // 草稿
        .route("/api/drafts", get(list_drafts_route).post(save_draft_route))
        // 通知
        .route("/api/notifications", get(list_notifications_route))
        .route("/api/notifications/unread-count", get(unread_count_route))
        .route("/api/notifications/read-all", post(mark_all_read_route))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware));

    public.merge(auth).with_state(handler)
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
            });
            let (posts, pagination) = h.get_posts(space_id, q.pagination, q.module).await?;
            Ok(json_ok(ApiResponse::success_with_pagination(posts, pagination)))
        }
        (Some(id), None) => {
            // GET /api/spaces/{ns}/posts/{id}
            let post = h.get_post(id).await?;
            Ok(json_ok(ApiResponse::success(post)))
        }
        (Some(id), Some("comments")) => {
            // GET /api/spaces/{ns}/posts/{id}/comments
            let comments = h.get_comments(id).await?;
            Ok(json_ok(ApiResponse::success(comments)))
        }
        (None, Some("featured")) => {
            let posts = h.get_featured_posts(space_id, 20).await?;
            Ok(json_ok(ApiResponse::success(posts)))
        }
        (None, Some("announcements")) => {
            let announcements = h.list_announcements(space_id).await?;
            Ok(json_ok(ApiResponse::success(announcements)))
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
                (None, None) | (None, Some("posts")) => {
                    // POST /api/spaces/{ns}/posts - create
                    let r: CreatePostRequest = serde_json::from_slice(&body_bytes)
                        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
                    let space_id = resolve_space_id(&h.pool, &ns).await?;
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
