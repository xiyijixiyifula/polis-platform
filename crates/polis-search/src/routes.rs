use std::sync::Arc;

use axum::{extract::{Query, State}, routing::get, Json, Router};
use polis_core::error::AppError;
use polis_core::models::ApiResponse;

use crate::handlers::{SearchHandler, SearchParams};

pub fn search_routes(handler: Arc<SearchHandler>) -> Router {
    Router::new()
        .route("/api/search", get(global_search))
        .with_state(handler)
}

/// GET /api/search?q=keyword&type=post&page=1
async fn global_search(
    State(handler): State<Arc<SearchHandler>>,
    Query(params): Query<SearchParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    if params.q.trim().is_empty() {
        return Ok(Json(ApiResponse::success(serde_json::json!({
            "hits": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
            "total_pages": 0,
        }))));
    }

    let results = handler.search(params).await?;
    Ok(Json(ApiResponse::success(results)))
}
