use std::env;

#[derive(Debug, Clone)]
pub struct GatewayConfig {
    pub host: String,
    pub port: u16,
    pub user_service_url: String,
    pub space_service_url: String,
    pub content_service_url: String,
    pub search_service_url: String,
    pub admin_service_url: String,
    pub rate_limit_per_minute: u32,
}

impl GatewayConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("GATEWAY_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("GATEWAY_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("GATEWAY_PORT must be a number"),
            user_service_url: env::var("USER_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3001".to_string()),
            space_service_url: env::var("SPACE_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3002".to_string()),
            content_service_url: env::var("CONTENT_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3003".to_string()),
            search_service_url: env::var("SEARCH_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3004".to_string()),
            admin_service_url: env::var("ADMIN_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:3050".to_string()),
            rate_limit_per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .expect("RATE_LIMIT_PER_MINUTE must be a number"),
        }
    }
}
