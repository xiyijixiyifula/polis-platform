//! 管理员认证
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::AdminConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminClaims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

/// 验证管理员身份
pub async fn verify_admin(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<String>, sqlx::Error> {
    // 检查用户是否是管理员 (在生产中应有 admin 表)
    // 这里简化为: verified=true 的用户可以通过 admin_code 验证
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT username FROM users WHERE id = $1 AND verified = TRUE"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.0))
}

/// 生成管理员 JWT
pub fn generate_admin_token(
    user_id: Uuid,
    role: &str,
    config: &AdminConfig,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let claims = AdminClaims {
        sub: user_id.to_string(),
        role: role.to_string(),
        exp: now + config.jwt_access_expiry as usize,
        iat: now,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
}

/// 验证管理员 JWT
pub fn verify_admin_token(
    token: &str,
    config: &AdminConfig,
) -> Result<AdminClaims, jsonwebtoken::errors::Error> {
    let token_data = decode::<AdminClaims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}
