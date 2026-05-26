use std::sync::Arc;

use axum::{
    extract::{Path, Query, Request, State},
    middleware,
    routing::{delete, get, post},
    Json, Router,
};
use jsonwebtoken::{decode, DecodingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use percent_encoding::percent_decode_str;
use polis_core::error::AppError;

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub page_size: Option<u32>,
}

use polis_core::models::{
    ApiResponse, CreateSpaceRequest, Pagination, SpacePublic, UpdateSpaceRequest, PaginationParams,
};

use crate::handlers::space_handler::SpaceHandler;
use crate::middleware::auth::auth_middleware;

/// 从路径中提取 namespace（支持多段，如 zhangsan/rust-lab）
#[allow(dead_code)]
fn extract_namespace(path: &str, prefix: &str) -> Option<String> {
    let remaining = path.strip_prefix(prefix)?;
    let actions = ["/posts", "/members", "/join", "/leave", "/featured", "/bookmarks"];
    for action in &actions {
        if let Some(idx) = remaining.find(action) {
            let ns = &remaining[..idx];
            if !ns.is_empty() {
                return Some(ns.to_string());
            }
            return None;
        }
    }
    if !remaining.is_empty() {
        Some(remaining.to_string())
    } else {
        None
    }
}

pub fn space_routes(handler: Arc<SpaceHandler>) -> Router {
    let public = Router::new()
        .route("/health", get(health_check))
        .route("/api/search", get(search_spaces))
        .route("/api/spaces/trending", get(get_trending_spaces))
        .route("/api/spaces", get(list_spaces))
        .route("/api/spaces/{*path}", get(handle_public_path))
        .route("/api/root/{slug}", get(get_root_space))
        .route("/api/root/{slug}/subspaces", get(get_sub_spaces));

    let auth = Router::new()
        .route("/api/spaces", post(create_space))
        .route("/api/spaces/{*path}", post(handle_auth_path)
            .put(handle_auth_path)
            .delete(delete_space))
        .route_layer(middleware::from_fn_with_state(
            handler.clone(),
            auth_middleware,
        ));

    public.merge(auth).with_state(handler)
}

/// URL 解码命名空间，支持中文 slug 和 ~ 占位符（~ → /）
fn decode_namespace(raw: &str) -> Result<String, AppError> {
    percent_decode_str(raw)
        .decode_utf8()
        .map(|s| s.to_string().replace('~', "/"))
        .map_err(|_| AppError::Validation("Invalid UTF-8 in namespace".to_string()))
}

/// 处理公共 GET 路径
async fn handle_public_path(
    State(handler): State<Arc<SpaceHandler>>,
    req: Request,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = req.uri().path().to_string();
    let remaining = path.strip_prefix("/api/spaces/").unwrap_or("");
    if remaining.is_empty() || remaining == "trending" {
        return Err(AppError::NotFound("Invalid path".to_string()));
    }

    // 提取 namespace（去掉尾部动作）
    let actions_suffixes = ["/members", "/join", "/leave", "/posts", "/featured", "/bookmarks", "/join-requests"];
    let mut ns = remaining;
    for suffix in &actions_suffixes {
        if let Some(stripped) = remaining.strip_suffix(suffix) {
            ns = stripped;
            break;
        }
    }

    if remaining.ends_with("/members") {
        let decoded_ns = decode_namespace(ns)?;
        let space = handler.get_space(&decoded_ns).await?;
        let members = handler.repo.get_members_with_users(space.id).await.unwrap_or_default();
        return Ok(Json(serde_json::json!({"code": 0, "data": members})));
    }

    // 需要认证的 GET 端点：从 Authorization header 中提取 user_id
    if remaining.ends_with("/join-requests") {
        let user_id = extract_user_id_from_headers(req.headers()).await?;
        let decoded_ns = decode_namespace(ns)?;
        let requests = handler.list_join_requests(&decoded_ns, user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": requests})));
    }

    // URL 解码命名空间（支持中文等非 ASCII 字符）
    let decoded_ns = decode_namespace(ns)?;
    let space = handler.get_space(&decoded_ns).await?;
    Ok(Json(serde_json::json!({"code": 0, "data": space})))
}

/// 从 Authorization header 提取 user_id（用于需要认证的 GET 端点）
#[derive(Debug, Serialize, Deserialize)]
struct TokenClaims {
    pub sub: String,
    pub exp: usize,
    pub token_type: String,
}

async fn extract_user_id_from_headers(headers: &axum::http::HeaderMap) -> Result<Uuid, AppError> {
    let token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)?;
    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");
    let token_data = decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &polis_core::auth::secure_validation(),
    )
    .map_err(|_| AppError::Unauthorized)?;
    if token_data.claims.token_type != "access" {
        return Err(AppError::Unauthorized);
    }
    Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AppError::Unauthorized)
}

/// 处理需要认证的路径
async fn handle_auth_path(
    State(handler): State<Arc<SpaceHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    req: Request,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = req.uri().path().to_string();
    let method = req.method().clone();

    let remaining = path.strip_prefix("/api/spaces/").unwrap_or("");
    if remaining.is_empty() {
        return Err(AppError::NotFound("Invalid path".to_string()));
    }

    // 提取 namespace (去掉尾部动作)
    let actions = [
        "/join", "/leave", "/posts",
        "/members/ban", "/members/role", "/members/unban",
        "/join-requests", "/join-requests/review",
        "/verify-password",
    ];
    let mut ns = remaining;
    for action in &actions {
        if let Some(stripped) = remaining.strip_suffix(action) {
            ns = stripped;
            break;
        }
    }

    if ns.is_empty() {
        return Err(AppError::NotFound("Invalid namespace".to_string()));
    }

    // URL 解码命名空间（支持中文等非 ASCII 字符）
    let decoded_ns = decode_namespace(ns)?;

    // 辅助：从 body 中反序列化 JSON
    async fn read_json_body<T: serde::de::DeserializeOwned>(req: Request) -> Result<T, AppError> {
        let body_bytes = axum::body::to_bytes(req.into_body(), 1024 * 1024).await
            .map_err(|_| AppError::Validation("Failed to read body".to_string()))?;
        serde_json::from_slice(&body_bytes)
            .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))
    }

    if remaining.ends_with("/join") && method == axum::http::Method::POST {
        let message: Option<String> = {
            let body_bytes = axum::body::to_bytes(req.into_body(), 1024 * 1024).await
                .map_err(|_| AppError::Validation("Failed to read body".to_string()))?;
            if body_bytes.is_empty() {
                None
            } else {
                #[derive(Deserialize)]
                struct JoinBody { message: Option<String> }
                let body: JoinBody = serde_json::from_slice(&body_bytes)
                    .unwrap_or(JoinBody { message: None });
                body.message
            }
        };
        let result = handler.join_space(&decoded_ns, user_id, message.as_deref()).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": result, "message": "ok"})));
    }

    if remaining.ends_with("/leave") && method == axum::http::Method::POST {
        handler.leave_space(&decoded_ns, user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": null, "message": "ok"})));
    }

    if remaining.ends_with("/members/ban") && method == axum::http::Method::POST {
        #[derive(Deserialize)]
        struct BanBody { user_id: Uuid, reason: Option<String>, duration_hours: Option<i32> }
        let body: BanBody = read_json_body(req).await?;
        let result = handler.ban_member(&decoded_ns, user_id, body.user_id, body.reason.as_deref(), body.duration_hours).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": result, "message": "ok"})));
    }

    if remaining.ends_with("/members/unban") && method == axum::http::Method::POST {
        #[derive(Deserialize)]
        struct UnbanBody { user_id: Uuid }
        let body: UnbanBody = read_json_body(req).await?;
        let result = handler.unban_member(&decoded_ns, user_id, body.user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": result, "message": "ok"})));
    }

    if remaining.ends_with("/members/role") && method == axum::http::Method::POST {
        #[derive(Deserialize)]
        struct RoleBody { user_id: Uuid, role: String }
        let body: RoleBody = read_json_body(req).await?;
        handler.set_member_role(&decoded_ns, user_id, body.user_id, &body.role).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": null, "message": "ok"})));
    }

    if remaining.ends_with("/join-requests/review") && method == axum::http::Method::POST {
        #[derive(Deserialize)]
        struct ReviewBody { user_id: Uuid, approved: bool }
        let body: ReviewBody = read_json_body(req).await?;
        let result = handler.review_join_request(&decoded_ns, user_id, body.user_id, body.approved).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": result, "message": "ok"})));
    }

    if remaining.ends_with("/join-requests") && method == axum::http::Method::GET {
        let requests = handler.list_join_requests(&decoded_ns, user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": requests})));
    }

    if remaining.ends_with("/verify-password") && method == axum::http::Method::POST {
        #[derive(Deserialize)]
        struct PwdBody { password: String }
        let body: PwdBody = read_json_body(req).await?;
        let valid = handler.repo.verify_password(
            handler.get_space(&decoded_ns).await?.id,
            &body.password,
        ).await.unwrap_or(false);
        return Ok(Json(serde_json::json!({"code": 0, "data": {"valid": valid}, "message": "ok"})));
    }

    if method == axum::http::Method::PUT {
        let update_req: UpdateSpaceRequest = read_json_body(req).await?;
        let space = handler.update_space(&decoded_ns, user_id, update_req).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": space})));
    }

    Err(AppError::NotFound("Route not found".to_string()))
}

/// DELETE /api/spaces/{namespace} — 归档社区（仅 owner）
async fn delete_space(
    State(handler): State<Arc<SpaceHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    req: Request,
) -> Result<Json<serde_json::Value>, AppError> {
    let path = req.uri().path().to_string();
    let remaining = path.strip_prefix("/api/spaces/").unwrap_or("");

    // 去掉尾部动作（如 /members）
    let actions = ["/members", "/join", "/leave", "/posts", "/featured", "/bookmarks", "/join-requests"];
    let mut ns = remaining;
    for suffix in &actions {
        if let Some(stripped) = remaining.strip_suffix(suffix) {
            ns = stripped;
            break;
        }
    }
    let decoded_ns = decode_namespace(ns)?;

    handler.archive_space(&decoded_ns, user_id).await?;
    Ok(Json(serde_json::json!({"code": 0, "message": "社区已归档"})))
}

/// POST /api/spaces - 创建社区
async fn create_space(
    State(handler): State<Arc<SpaceHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    axum::Extension(username): axum::Extension<String>,
    Json(req): Json<CreateSpaceRequest>,
) -> Result<Json<ApiResponse<SpacePublic>>, AppError> {
    let space = handler.create_space(user_id, &username, req).await?;
    Ok(Json(ApiResponse::success(space)))
}

/// GET /api/spaces/trending - 热门社区
async fn search_spaces(
    State(handler): State<Arc<SpaceHandler>>,
    Query(params): Query<SearchParams>,
) -> Result<Json<ApiResponse<Vec<SpacePublic>>>, AppError> {
    let limit = params.page_size.unwrap_or(20);
    let spaces = handler.search_spaces(&params.q, limit).await?;
    Ok(Json(ApiResponse::success(spaces)))
}

async fn get_trending_spaces(
    State(handler): State<Arc<SpaceHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<SpacePublic>>>, AppError> {
    let limit = params.page_size.unwrap_or(20);
    let spaces = handler.get_trending_spaces(limit).await?;
    Ok(Json(ApiResponse::success(spaces)))
}

/// GET /api/spaces - 公共空间列表 (分页)
async fn list_spaces(
    State(handler): State<Arc<SpaceHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let (spaces, total) = handler.list_spaces(page, page_size).await?;
    Ok(Json(ApiResponse::success_with_pagination(
        serde_json::json!({ "items": spaces, "total": total }),
        Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        },
    )))
}

/// GET /api/root/:slug - 根社区首页
async fn get_root_space(
    State(handler): State<Arc<SpaceHandler>>,
    Path(slug): Path<String>,
) -> Result<Json<ApiResponse<SpacePublic>>, AppError> {
    let space = handler.get_space(&slug).await?;
    Ok(Json(ApiResponse::success(space)))
}

/// GET /api/root/:slug/subspaces - 子社区列表
async fn get_sub_spaces(
    State(handler): State<Arc<SpaceHandler>>,
    Path(slug): Path<String>,
) -> Result<Json<ApiResponse<Vec<SpacePublic>>>, AppError> {
    let spaces = handler.get_sub_spaces(&slug).await?;
    Ok(Json(ApiResponse::success(spaces)))
}


async fn health_check(State(h): State<Arc<SpaceHandler>>) -> Json<ApiResponse<serde_json::Value>> {
    let db_ok = sqlx::query("SELECT 1").fetch_one(&h.repo.pool).await.is_ok();
    Json(ApiResponse::success(serde_json::json!({
        "service": "polis-space",
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "version": env!("CARGO_PKG_VERSION"),
    })))
}
