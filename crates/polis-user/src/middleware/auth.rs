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

/// JWT ID (jti) 包装类型，用于 Axum 扩展注入
#[derive(Clone, Debug)]
pub struct Jti(pub String);

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

    // 将用户 ID 和 JTI 注入请求扩展
    req.extensions_mut().insert(user_id);
    if let Some(username) = claims.username.clone() {
        req.extensions_mut().insert(username);
    }
    if let Some(jti) = claims.jti {
        req.extensions_mut().insert(Jti(jti));
    }

    Ok(next.run(req).await)
}
