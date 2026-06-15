use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey};
use uuid::Uuid;

use polis_core::{auth::Claims, error::AppError};

/// JWT 认证中间件 —— 从 Authorization header 提取 Bearer token，
/// 解码验证后注入用户 UUID 到请求扩展中。
///
/// 同时检查 token 是否在黑名单中（已登出撤销）。
pub async fn auth_middleware(
    State(handler): State<Arc<crate::handler::VideoHandler>>,
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

    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &polis_core::auth::secure_validation(),
    )
    .map_err(|_| AppError::unauthorized())?;

    if token_data.claims.token_type.as_deref() != Some("access") {
        return Err(AppError::unauthorized());
    }

    // 检查 token 是否在黑名单中（已登出）
    if let Some(ref jti) = token_data.claims.jti {
        if handler.token_blacklist.is_blacklisted(jti).await {
            return Err(AppError::unauthorized());
        }
    }

    let user_id = Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AppError::unauthorized())?;

    req.extensions_mut().insert(user_id);
    Ok(next.run(req).await)
}
