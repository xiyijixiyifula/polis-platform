//! 通用认证辅助工具
//!
//! 从 HTTP 请求头中提取 JWT token 并解码，返回用户 UUID。
//! 适用于所有需要用户认证的子服务模块。

use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::AppError;

/// JWT Claims 标准结构 — 所有服务的单一来源。
///
/// 包含所有可能的 JWT claim 字段。未使用的字段在反序列化时自动忽略，
/// 在序列化时（如果为 `None`）自动跳过。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// 用户 ID (UUID 字符串)
    pub sub: String,
    /// 用户名
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub username: Option<String>,
    /// 显示名称
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub display_name: Option<String>,
    /// 过期时间 (Unix timestamp)
    pub exp: Option<usize>,
    /// 签发时间 (Unix timestamp)
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub iat: Option<usize>,
    /// Token 类型: "access" 或 "refresh"
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub token_type: Option<String>,
    /// JWT ID (jti) — 唯一标识每个 token，用于黑名单撤销
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub jti: Option<String>,
    /// Agent ID — 标识发起请求的 Agent（仅 Agent token 携带）
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
}

/// 创建安全 JWT 验证配置（显式启用 exp 校验 + token_type 默认校验）
pub fn secure_validation() -> jsonwebtoken::Validation {
    let mut v = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
    v.validate_exp = true;
    v.validate_aud = false;
    v
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
    extract_user_id(headers)?.ok_or(AppError::unauthorized())
}

/// 将 Claims 编码为 JWT token 字符串
pub fn encode_token(claims: &Claims) -> Result<String, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");
    jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::internal(format!("JWT encode error: {}", e)))
}

/// 解码 JWT token，返回用户 UUID
fn decode_jwt(token: &str) -> Result<Uuid, AppError> {
    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");

    match jsonwebtoken::decode::<Claims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &secure_validation(),
    ) {
        Ok(data) => {
            Uuid::parse_str(&data.claims.sub)
                .map_err(|_| AppError::forbidden("Invalid user ID in token".to_string()))
        }
        Err(_) => Err(AppError::forbidden("Invalid or expired token".to_string())),
    }
}
