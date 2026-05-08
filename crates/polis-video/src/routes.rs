use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use tower_http::services::ServeDir;
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::{ApiResponse, PaginationParams};

use crate::handler::VideoHandler;

pub fn video_routes(handler: Arc<VideoHandler>) -> Router {
    Router::new()
        .route("/api/spaces/:namespace/videos", post(upload_video))
        .route("/api/spaces/:namespace/videos", get(list_videos))
        .route("/api/spaces/:namespace/videos/:id", get(get_video))
        // HLS 流媒体文件服务
        .nest_service("/hls", ServeDir::new(&handler.config.hls_output_path))
        .with_state(handler)
}

/// POST /api/spaces/:namespace/videos/upload - 上传视频
async fn upload_video(
    State(_handler): State<Arc<VideoHandler>>,
    Path(namespace): Path<String>,
    // In production, use multipart form data
    _body: String,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    // TODO: parse multipart form data with actual file bytes
    // For now, return a stub structure
    Ok(Json(ApiResponse::success(serde_json::json!({
        "message": "Upload endpoint ready. Use multipart/form-data with 'file' field.",
        "namespace": namespace,
    }))))
}

/// GET /api/spaces/:namespace/videos - 视频列表
async fn list_videos(
    State(_handler): State<Arc<VideoHandler>>,
    Path(_namespace): Path<String>,
    Query(_params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    // TODO: resolve namespace to space_id, then query videos
    Ok(Json(ApiResponse::success(Vec::new())))
}

/// GET /api/spaces/:namespace/videos/:id - 视频详情
async fn get_video(
    State(handler): State<Arc<VideoHandler>>,
    Path((_namespace, id)): Path<(String, Uuid)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let video = handler.repo.find_by_id(id).await?
        .ok_or(AppError::NotFound("Video not found".to_string()))?;
    Ok(Json(ApiResponse::success(video)))
}
