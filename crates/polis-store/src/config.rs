use std::env;

#[derive(Debug, Clone)]
pub struct StoreServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
}

impl StoreServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("STORE_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("STORE_PORT")
                .unwrap_or_else(|_| "3009".to_string())
                .parse()
                .unwrap_or_else(|e| {
                    tracing::warn!("STORE_PORT parse failed: {e}, using default 3009");
                    3009
                }),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| {
                    tracing::warn!("DATABASE_URL not set — using empty string, downstream connection will fail");
                    String::new()
                }),
        }
    }
}
