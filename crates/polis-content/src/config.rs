use std::env;

#[derive(Debug, Clone)]
pub struct ContentServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
    pub max_upload_size_mb: u64,
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
        }
    }
}
