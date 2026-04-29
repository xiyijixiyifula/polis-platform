use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::{ApiResponse, PaginationParams};

use crate::handler::StoreHandler;

#[derive(Deserialize)]
pub struct CreateProductRequest {
    pub title: String,
    pub description: Option<String>,
    pub price_cents: i64,
    pub currency: Option<String>,
    pub stock: i32,
}

pub fn store_routes(handler: Arc<StoreHandler>) -> Router {
    Router::new()
        .route("/api/spaces/:namespace/store/products", post(create_product))
        .route("/api/spaces/:namespace/store/products", get(list_products))
        .route("/api/spaces/:namespace/store/orders", post(create_order))
        .route("/api/spaces/:namespace/store/orders", get(list_orders))
        .with_state(handler)
}

async fn create_product(
    State(handler): State<Arc<StoreHandler>>,
    Path(_namespace): Path<String>,
    Json(req): Json<CreateProductRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let space_id = Uuid::new_v4(); // TODO: resolve namespace
    let seller_id = Uuid::new_v4(); // TODO: from auth
    let product = handler.create_product(
        space_id, seller_id, &req.title,
        &req.description.unwrap_or_default(),
        req.price_cents, &req.currency.unwrap_or_else(|| "CNY".to_string()),
        req.stock,
    ).await?;
    Ok(Json(ApiResponse::success(product)))
}

async fn list_products(
    State(handler): State<Arc<StoreHandler>>,
    Path(_namespace): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let space_id = Uuid::new_v4(); // TODO: resolve namespace
    let products = handler.list_products(space_id, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(products)))
}

async fn create_order(
    State(handler): State<Arc<StoreHandler>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let product_id = Uuid::parse_str(req["product_id"].as_str().ok_or(AppError::Validation("product_id required".to_string()))?)
        .map_err(|_| AppError::Validation("Invalid product_id".to_string()))?;
    let buyer_id = Uuid::new_v4(); // TODO: from auth
    let order = handler.create_order(product_id, buyer_id).await?;
    Ok(Json(ApiResponse::success(order)))
}

async fn list_orders(
    State(handler): State<Arc<StoreHandler>>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let user_id = Uuid::new_v4(); // TODO: from auth
    let orders = handler.list_orders(user_id, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await?;
    Ok(Json(ApiResponse::success(orders)))
}
