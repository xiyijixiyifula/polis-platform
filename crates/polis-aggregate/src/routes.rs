use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};

use polis_core::error::AppError;
use polis_core::models::{ApiResponse, PaginationParams};

use crate::handler::AggregateHandler;

pub fn aggregate_routes(handler: Arc<AggregateHandler>) -> Router {
    Router::new()
        .route("/api/aggregate/root/{slug}/featured", get(get_featured))
        .route("/api/aggregate/root/{slug}/trending", get(get_trending))
        .route("/api/aggregate/root/{slug}/subspaces", get(get_sub_spaces))
        .with_state(handler)
}

async fn get_featured(
    State(handler): State<Arc<AggregateHandler>>,
    Path(slug): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.get_featured(&slug, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(result)))
}

async fn get_trending(
    State(handler): State<Arc<AggregateHandler>>,
    Path(slug): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.get_trending(&slug, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(result)))
}

async fn get_sub_spaces(
    State(handler): State<Arc<AggregateHandler>>,
    Path(slug): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let result = handler.get_sub_spaces(&slug, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(result)))
}
