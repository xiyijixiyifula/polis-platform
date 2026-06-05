use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey};
use uuid::Uuid;

use polis_core::{auth::Claims, error::AppError};

/// JWT 认证中间件
pub async fn auth_middleware(
    _: State<Arc<crate::handlers::content_handler::ContentHandler>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &polis_core::auth::secure_validation(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    if token_data.claims.token_type.as_deref() != Some("access") {
        return Err(AppError::Unauthorized);
    }

    let user_id = Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AppError::Unauthorized)?;

    req.extensions_mut().insert(user_id);
    Ok(next.run(req).await)
}
