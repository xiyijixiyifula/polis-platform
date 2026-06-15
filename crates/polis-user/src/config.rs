use std::env;

/// 用户服务配置
#[derive(Debug, Clone)]
pub struct UserServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_access_expiry: i64,   // 秒
    pub jwt_refresh_expiry: i64,  // 秒
    pub nats_url: String,
    /// 前端域名，用于 CSRF Origin/Referer 校验（敏感操作如修改密码、绑定钱包）
    pub frontend_url: String,
    /// 内部 API 共享密钥，用于跨服务调用认证（如 polis-content → polis-user 的 XP bridge）
    pub internal_api_secret: String,
}

impl UserServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("USER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("USER_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .expect("USER_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .expect("JWT_SECRET environment variable must be set"),
            jwt_access_expiry: env::var("JWT_ACCESS_EXPIRY")
                .unwrap_or_else(|_| "900".to_string()) // 15分钟
                .parse()
                .expect("JWT_ACCESS_EXPIRY must be a number"),
            jwt_refresh_expiry: env::var("JWT_REFRESH_EXPIRY")
                .unwrap_or_else(|_| "604800".to_string()) // 7天
                .parse()
                .expect("JWT_REFRESH_EXPIRY must be a number"),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            frontend_url: env::var("FRONTEND_URL").unwrap_or_else(|_| "https://www.mzgw.com".to_string()),
            internal_api_secret: env::var("INTERNAL_API_SECRET")
                .unwrap_or_else(|_| {
                    tracing::warn!("INTERNAL_API_SECRET not set — internal API endpoints (XP bridge) will be unprotected");
                    "".to_string()
                }),
        }
    }
}
