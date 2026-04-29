use std::env;

#[derive(Debug, Clone)]
pub struct VideoServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
    pub storage_path: String,
    pub hls_output_path: String,
    pub max_file_size_mb: u64,
    pub allowed_extensions: Vec<String>,
}

impl Default for VideoServiceConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 3005,
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://polis:polis_dev@localhost:5432/polis".to_string()),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            storage_path: env::var("VIDEO_STORAGE_PATH")
                .unwrap_or_else(|_| "./data/videos".to_string()),
            hls_output_path: env::var("VIDEO_HLS_PATH")
                .unwrap_or_else(|_| "./data/hls".to_string()),
            max_file_size_mb: env::var("VIDEO_MAX_SIZE_MB")
                .unwrap_or_else(|_| "500".to_string())
                .parse()
                .unwrap_or(500),
            allowed_extensions: vec![
                "mp4".to_string(), "mov".to_string(), "avi".to_string(),
                "mkv".to_string(), "webm".to_string(), "flv".to_string(),
            ],
        }
    }
}

impl VideoServiceConfig {
    pub fn from_env() -> Self {
        Self::default()
    }
}
