use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use polis_core::auth;
use polis_core::error::AppError;
use polis_core::models::ApiResponse;
use polis_core::resolver::resolve::resolve_space_id;

use crate::handler::PluginHandler;

#[derive(Deserialize)]
pub struct InstallPluginRequest {
    pub name: String,
    pub description: Option<String>,
    pub wasm_base64: String,
}

pub fn plugin_routes(handler: Arc<PluginHandler>) -> Router {
    Router::new()
        .route("/api/spaces/:namespace/plugins", post(install_plugin))
        .route("/api/spaces/:namespace/plugins", get(list_plugins))
        .route("/api/spaces/:namespace/plugins/:id", delete(uninstall_plugin))
        .with_state(handler)
}

async fn install_plugin(
    State(handler): State<Arc<PluginHandler>>,
    headers: HeaderMap,
    Path(namespace): Path<String>,
    Json(req): Json<InstallPluginRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let space_id = resolve_space_id(&handler.pool, &namespace).await?;
    let author_id = auth::require_user(&headers)?;

    // Decode base64 WASM bytes
    use base64::Engine as _;
    let wasm_bytes = base64::engine::general_purpose::STANDARD
        .decode(&req.wasm_base64)
        .map_err(|e| AppError::validation(format!("Invalid base64 WASM: {}", e)))?;

    let result = handler.install_plugin(
        space_id, author_id, &req.name,
        &req.description.unwrap_or_default(),
        &wasm_bytes,
    ).await?;

    Ok(Json(ApiResponse::success(result)))
}

async fn list_plugins(
    State(handler): State<Arc<PluginHandler>>,
    Path(namespace): Path<String>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let space_id = resolve_space_id(&handler.pool, &namespace).await?;
    let plugins = handler.list_plugins(space_id).await?;
    Ok(Json(ApiResponse::success(plugins)))
}

async fn uninstall_plugin(
    State(handler): State<Arc<PluginHandler>>,
    Path((_namespace, id)): Path<(String, Uuid)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.uninstall_plugin(id).await?;
    Ok(Json(ApiResponse::success(())))
}
