//! 通用认证辅助工具
//!
//! 从 HTTP 请求头中提取 JWT token 并解码，返回用户 UUID。
//! 适用于所有需要用户认证的子服务模块。

use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::AppError;

/// JWT Claims 标准结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: Option<usize>,
    pub iat: Option<usize>,
}

/// 从请求头中提取用户 ID（JWT Bearer token 解码）
///
/// # 行为
/// - 如果 Authorization 头不存在或无 Bearer token，返回 `Ok(None)`（未登录）
/// - 如果 token 存在但无效，返回 `AppError::Forbidden`
/// - 如果 token 有效，返回 `Ok(Some(user_id))`
pub fn extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth = match headers.get(http::header::AUTHORIZATION).and_then(|v| v.to_str().ok()) {
        Some(h) => h,
        None => return Ok(None),
    };
    let token = match auth.strip_prefix("Bearer ") {
        Some(t) => t,
        None => return Ok(None),
    };
    decode_jwt(token).map(Some)
}

/// 从请求头中提取用户 ID，未登录时返回 401
pub fn require_user(headers: &HeaderMap) -> Result<Uuid, AppError> {
    extract_user_id(headers)?.ok_or(AppError::Unauthorized)
}

/// 解码 JWT token，返回用户 UUID
fn decode_jwt(token: &str) -> Result<Uuid, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());

    match jsonwebtoken::decode::<Claims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    ) {
        Ok(data) => {
            Uuid::parse_str(&data.claims.sub)
                .map_err(|_| AppError::Forbidden("Invalid user ID in token".to_string()))
        }
        Err(_) => Err(AppError::Forbidden("Invalid or expired token".to_string())),
    }
}
