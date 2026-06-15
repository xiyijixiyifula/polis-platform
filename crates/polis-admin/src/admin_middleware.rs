//! 管理员认证中间件
use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use polis_core::error::AppError;

use crate::admin_handler::AdminHandler;
use crate::auth::verify_admin_token;

pub async fn admin_auth(
    State(handler): State<Arc<AdminHandler>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::unauthorized())?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::unauthorized())?;

    let claims = verify_admin_token(token, &handler.config)
        .map_err(|_| AppError::unauthorized())?;

    // Check if this token's jti has been revoked (logout).
    if handler.token_blacklist.is_blacklisted(&claims.jti).await {
        return Err(AppError::unauthorized());
    }

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::unauthorized())?;

    req.extensions_mut().insert(user_id);
    req.extensions_mut().insert(claims.role);

    Ok(next.run(req).await)
}
