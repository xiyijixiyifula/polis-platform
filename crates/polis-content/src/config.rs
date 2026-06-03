use std::env;

#[derive(Debug, Clone)]
pub struct ContentServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
    pub max_upload_size_mb: u64,
    pub user_service_url: String,
    /// Polis Chain 节点 API URL (可选, 用于链上存证)
    pub chain_api_url: Option<String>,
    /// 站点 ID (SHA256(domain)), 用于链上存证
    pub chain_site_id: Option<String>,
}

impl ContentServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("CONTENT_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("CONTENT_PORT")
                .unwrap_or_else(|_| "3003".to_string())
                .parse()
                .expect("CONTENT_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            max_upload_size_mb: env::var("UPLOAD_MAX_SIZE_MB")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .unwrap_or(60),
            user_service_url: env::var("USER_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
            chain_api_url: env::var("CHAIN_API_URL").ok(),
            chain_site_id: env::var("CHAIN_SITE_ID").ok(),
        }
    }
}
