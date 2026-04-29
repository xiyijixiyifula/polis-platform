use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use polis_core::error::AppError;
use polis_core::models::ApiResponse;

use crate::handler::PayHandler;

#[derive(Deserialize)]
pub struct TipRequest {
    pub to_user_id: Uuid,
    pub amount_cents: i64,
    pub provider: Option<String>,
}

#[derive(Deserialize)]
pub struct ConfirmRequest {
    pub provider_tx_id: String,
}

pub fn pay_routes(handler: Arc<PayHandler>) -> Router {
    Router::new()
        .route("/api/pay/tip", post(create_tip))
        .route("/api/pay/confirm/:id", post(confirm_payment))
        .route("/api/pay/transactions", get(get_transactions))
        .with_state(handler)
}

async fn create_tip(
    State(handler): State<Arc<PayHandler>>,
    Json(req): Json<TipRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let from_user_id = Uuid::new_v4(); // TODO: from auth
    let result = handler.create_tip(
        from_user_id, req.to_user_id, req.amount_cents,
        &req.provider.unwrap_or_else(|| "balance".to_string()),
    ).await?;
    Ok(Json(ApiResponse::success(result)))
}

async fn confirm_payment(
    State(handler): State<Arc<PayHandler>>,
    Path(id): Path<Uuid>,
    Json(req): Json<ConfirmRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    handler.confirm_payment(id, &req.provider_tx_id).await?;
    Ok(Json(ApiResponse::success(())))
}

async fn get_transactions(
    State(handler): State<Arc<PayHandler>>,
    Query(params): Query<polis_core::models::PaginationParams>,
) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    let user_id = Uuid::new_v4(); // TODO: from auth
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let txs = handler.get_transactions(user_id, page, page_size).await?;
    Ok(Json(ApiResponse::success(txs)))
}
