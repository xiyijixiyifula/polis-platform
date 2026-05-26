use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT 声明
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // 用户 ID
    pub username: String,   // 用户名
    pub display_name: String, // 显示名称
    pub exp: usize,         // 过期时间
    pub iat: usize,         // 签发时间
    pub token_type: String, // "access" | "refresh"
}

/// 密码哈希
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

/// 验证密码
pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    let argon2 = Argon2::default();
    Ok(argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// 生成 JWT Access Token
pub fn generate_access_token(
    user_id: Uuid,
    username: &str,
    display_name: &str,
    secret: &str,
    expiry_seconds: i64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        display_name: display_name.to_string(),
        exp: now + expiry_seconds as usize,
        iat: now,
        token_type: "access".to_string(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// 生成 JWT Refresh Token
pub fn generate_refresh_token(
    user_id: Uuid,
    username: &str,
    display_name: &str,
    secret: &str,
    expiry_seconds: i64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        display_name: display_name.to_string(),
        exp: now + expiry_seconds as usize,
        iat: now,
        token_type: "refresh".to_string(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// 验证 JWT Token
pub fn verify_token(
    token: &str,
    secret: &str,
) -> Result<Claims, jsonwebtoken::errors::Error> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &polis_core::auth::secure_validation(),
    )?;
    Ok(token_data.claims)
}
