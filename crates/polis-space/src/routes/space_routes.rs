use std::sync::Arc;

use axum::{
    extract::{Path, Query, Request, State},
    middleware,
    routing::{delete, get, post, put},
    Json, Router,
};
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::{
    ApiResponse, CreateSpaceRequest, SpacePublic, UpdateSpaceRequest, PaginationParams,
};

use crate::handlers::space_handler::SpaceHandler;
use crate::middleware::auth::auth_middleware;

/// 从路径中提取 namespace（支持多段，如 zhangsan/rust-lab）
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
        .route("/api/spaces/trending", get(get_trending_spaces))
        .route("/api/spaces/{*path}", get(handle_public_path))
        .route("/api/root/{slug}", get(get_root_space))
        .route("/api/root/{slug}/subspaces", get(get_sub_spaces));

    let auth = Router::new()
        .route("/api/spaces", post(create_space))
        .route("/api/spaces/{*path}", post(handle_auth_path).put(handle_auth_path))
        .route_layer(middleware::from_fn_with_state(
            handler.clone(),
            auth_middleware,
        ));

    public.merge(auth).with_state(handler)
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
    let ns = remaining
        .strip_suffix("/members")
        .or_else(|| remaining.strip_suffix("/join"))
        .or_else(|| remaining.strip_suffix("/leave"))
        .or_else(|| remaining.strip_suffix("/posts"))
        .or_else(|| remaining.strip_suffix("/featured"))
        .or_else(|| remaining.strip_suffix("/bookmarks"))
        .unwrap_or(remaining);

    if remaining.ends_with("/members") {
        return Ok(Json(serde_json::json!({"code": 0, "data": []})));
    }

    let space = handler.get_space(ns).await?;
    Ok(Json(serde_json::json!({"code": 0, "data": space})))
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

    let ns = remaining
        .strip_suffix("/join")
        .or_else(|| remaining.strip_suffix("/leave"))
        .or_else(|| remaining.strip_suffix("/posts"))
        .unwrap_or(remaining);

    if ns.is_empty() {
        return Err(AppError::NotFound("Invalid namespace".to_string()));
    }

    if remaining.ends_with("/join") {
        handler.join_space(ns, user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": null, "message": "ok"})));
    }

    if remaining.ends_with("/leave") {
        handler.leave_space(ns, user_id).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": null, "message": "ok"})));
    }

    if method == axum::http::Method::PUT {
        let body_bytes = axum::body::to_bytes(req.into_body(), 1024 * 1024).await
            .map_err(|_| AppError::Validation("Failed to read body".to_string()))?;
        let update_req: UpdateSpaceRequest = serde_json::from_slice(&body_bytes)
            .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;
        let space = handler.update_space(ns, user_id, update_req).await?;
        return Ok(Json(serde_json::json!({"code": 0, "data": space})));
    }

    Err(AppError::NotFound("Route not found".to_string()))
}

/// POST /api/spaces - 创建社区
async fn create_space(
    State(handler): State<Arc<SpaceHandler>>,
    axum::Extension(user_id): axum::Extension<Uuid>,
    Json(req): Json<CreateSpaceRequest>,
) -> Result<Json<ApiResponse<SpacePublic>>, AppError> {
    let space = handler.create_space(user_id, req).await?;
    Ok(Json(ApiResponse::success(space)))
}

/// GET /api/spaces/trending - 热门社区
async fn get_trending_spaces(
    State(handler): State<Arc<SpaceHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<SpacePublic>>>, AppError> {
    let limit = params.page_size.unwrap_or(20);
    let spaces = handler.get_trending_spaces(limit).await?;
    Ok(Json(ApiResponse::success(spaces)))
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
