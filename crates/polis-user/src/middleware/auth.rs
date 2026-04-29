use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use polis_core::error::AppError;

use crate::handlers::user_handler::UserHandler;
use crate::auth::verify_token;

/// JWT 认证中间件
pub async fn auth_middleware(
    State(handler): State<Arc<UserHandler>>,
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

    let claims = verify_token(token, &handler.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized)?;

    // 验证是 access token
    if claims.token_type != "access" {
        return Err(AppError::Unauthorized);
    }

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized)?;

    // 将用户 ID 注入请求扩展
    req.extensions_mut().insert(user_id);
    req.extensions_mut().insert(claims.username);

    Ok(next.run(req).await)
}
