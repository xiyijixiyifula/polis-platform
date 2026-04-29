use std::env;

#[derive(Debug, Clone)]
pub struct AdminConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_access_expiry: i64,
    pub admin_code: String, // 管理员注册专用码
}

impl AdminConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("ADMIN_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("ADMIN_PORT")
                .unwrap_or_else(|_| "3050".to_string())
                .parse()
                .expect("ADMIN_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "polis-admin-jwt-secret".to_string()),
            jwt_access_expiry: env::var("JWT_ACCESS_EXPIRY")
                .unwrap_or_else(|_| "3600".to_string())
                .parse()
                .expect("JWT_ACCESS_EXPIRY must be a number"),
            admin_code: env::var("ADMIN_CODE")
                .unwrap_or_else(|_| "polis-admin-2026".to_string()),
        }
    }
}
