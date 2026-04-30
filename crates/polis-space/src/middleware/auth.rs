use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use polis_core::error::AppError;

use crate::handlers::space_handler::SpaceHandler;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: usize,
    pub token_type: String,
}

/// JWT 认证中间件
pub async fn auth_middleware(
    State(handler): State<Arc<SpaceHandler>>,
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

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(
            // We need a shared JWT secret across services
            // In production, use a config/env var shared across services
            std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string())
                .as_bytes(),
        ),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    let claims = token_data.claims;

    if claims.token_type != "access" {
        return Err(AppError::Unauthorized);
    }

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized)?;

    req.extensions_mut().insert(user_id);
    req.extensions_mut().insert(claims.username);

    Ok(next.run(req).await)
}
