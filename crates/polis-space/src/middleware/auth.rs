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
    State(handler): State<Arc<crate::handlers::space_handler::SpaceHandler>>,
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
            std::env::var("JWT_SECRET")
                .expect("JWT_SECRET environment variable must be set")
                .as_bytes(),
        ),
        &polis_core::auth::secure_validation(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    let claims = token_data.claims;

    if claims.token_type.as_deref() != Some("access") {
        return Err(AppError::Unauthorized);
    }

    // 检查 token 是否在黑名单中（已登出）
    if let Some(ref jti) = claims.jti {
        if handler.token_blacklist.is_blacklisted(jti).await {
            return Err(AppError::Unauthorized);
        }
    }

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized)?;

    req.extensions_mut().insert(user_id);
    if let Some(username) = claims.username {
        req.extensions_mut().insert(username);
    }

    Ok(next.run(req).await)
}
