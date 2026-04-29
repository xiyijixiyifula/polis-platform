use std::sync::Arc;

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::ApiResponse;
use serde::Deserialize;

use crate::handler::CodeHandler;

#[derive(Deserialize)]
pub struct CreateRepoRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_private: Option<bool>,
}

pub fn code_routes(handler: Arc<CodeHandler>) -> Router {
    Router::new()
        .route("/api/spaces/:namespace/repos", post(create_repo))
        .route("/api/spaces/:namespace/repos/:id", get(get_repo))
        .route("/api/spaces/:namespace/repos/:id/readme", get(get_readme))
        .route("/api/spaces/:namespace/repos/:id/tree", get(list_files))
        .with_state(handler)
}

async fn create_repo(
    State(handler): State<Arc<CodeHandler>>,
    Path(_namespace): Path<String>,
    Json(req): Json<CreateRepoRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let space_id = Uuid::new_v4(); // TODO: resolve namespace
    let user_id = Uuid::new_v4(); // TODO: get from auth
    let repo = handler.create_repo(
        space_id, user_id, &req.name,
        &req.description.unwrap_or_default(),
        req.is_private.unwrap_or(false),
    ).await?;
    Ok(Json(ApiResponse::success(repo)))
}

async fn get_repo(
    State(handler): State<Arc<CodeHandler>>,
    Path((_namespace, id)): Path<(String, Uuid)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let repo = handler.get_repo(id).await?;
    Ok(Json(ApiResponse::success(repo)))
}

async fn get_readme(
    State(handler): State<Arc<CodeHandler>>,
    Path((_namespace, id)): Path<(String, Uuid)>,
) -> Result<Json<ApiResponse<String>>, AppError> {
    let readme = handler.get_readme(id).await?;
    Ok(Json(ApiResponse::success(readme)))
}

async fn list_files(
    State(handler): State<Arc<CodeHandler>>,
    Path((_namespace, id)): Path<(String, Uuid)>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let files = handler.list_files(id, "", "main").await?;
    Ok(Json(ApiResponse::success(files)))
}
