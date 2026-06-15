use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header};
use polis_core::{auth::Claims, error::AppError};
use uuid::Uuid;

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

/// 异步密码哈希（spawn_blocking 避免阻塞 async runtime）
pub async fn hash_password_async(password: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || {
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(hash.to_string())
    })
    .await
    .map_err(|e| AppError::internal(e.to_string()))?
}

/// 异步密码验证（spawn_blocking 避免阻塞 async runtime）
pub async fn verify_password_async(password: String, hash: String) -> Result<bool, AppError> {
    tokio::task::spawn_blocking(move || {
        let parsed = PasswordHash::new(&hash)
            .map_err(|e| AppError::internal(e.to_string()))?;
        Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
    })
    .await
    .map_err(|e| AppError::internal(e.to_string()))?
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
    let jti = Uuid::new_v4().to_string();
    let claims = Claims {
        sub: user_id.to_string(),
        username: Some(username.to_string()),
        display_name: Some(display_name.to_string()),
        exp: Some(now + expiry_seconds as usize),
        iat: Some(now),
        token_type: Some("access".to_string()),
        jti: Some(jti),
        agent_id: None,
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
    let jti = Uuid::new_v4().to_string();
    let claims = Claims {
        sub: user_id.to_string(),
        username: Some(username.to_string()),
        display_name: Some(display_name.to_string()),
        exp: Some(now + expiry_seconds as usize),
        iat: Some(now),
        token_type: Some("refresh".to_string()),
        jti: Some(jti),
        agent_id: None,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_password_roundtrip() {
        let password = "my_secret_password_123";
        let hash = hash_password(password).expect("hashing should succeed");

        // 正确的密码应该验证通过
        assert!(
            verify_password(password, &hash).expect("verification should succeed"),
            "correct password should verify to true"
        );

        // 错误的密码应该验证失败
        assert!(
            !verify_password("wrong_password", &hash).expect("verification should succeed"),
            "wrong password should verify to false"
        );
    }

    #[test]
    fn test_hash_password_empty() {
        // 空密码也能正常哈希和验证
        let hash = hash_password("").expect("hashing empty password should succeed");
        assert!(verify_password("", &hash).expect("verification should succeed"));
    }

    #[test]
    fn test_hash_password_unicode() {
        let password = "密码测试🔐日本語パスワード";
        let hash = hash_password(password).expect("hashing unicode password should succeed");
        assert!(
            verify_password(password, &hash).expect("verification should succeed"),
            "unicode password should verify to true"
        );
        assert!(
            !verify_password("不同的密码", &hash).expect("verification should succeed"),
            "different unicode password should verify to false"
        );
    }
}
