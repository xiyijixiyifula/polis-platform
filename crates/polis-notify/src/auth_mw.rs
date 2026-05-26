use std::sync::Arc;
use axum::{extract::{Request, State}, middleware::Next, response::Response};
use jsonwebtoken::{decode, DecodingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use polis_core::error::AppError;
use crate::handler::NotifyHandler;

#[derive(Debug, Serialize, Deserialize)]
struct Claims { sub: String, token_type: String, exp: usize }

pub async fn auth_middleware(
    State(_handler): State<Arc<NotifyHandler>>,
    mut req: Request, next: Next,
) -> Result<Response, AppError> {
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set");
    let auth_header = req.headers().get("Authorization")
        .and_then(|v| v.to_str().ok()).ok_or(AppError::Unauthorized)?;
    let token = auth_header.strip_prefix("Bearer ").ok_or(AppError::Unauthorized)?;
    let data = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &polis_core::auth::secure_validation())
        .map_err(|_| AppError::Unauthorized)?;
    if data.claims.token_type != "access" { return Err(AppError::Unauthorized); }
    let user_id = Uuid::parse_str(&data.claims.sub).map_err(|_| AppError::Unauthorized)?;
    req.extensions_mut().insert(user_id);
    Ok(next.run(req).await)
}
