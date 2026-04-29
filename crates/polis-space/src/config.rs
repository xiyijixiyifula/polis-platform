use std::env;

#[derive(Debug, Clone)]
pub struct SpaceServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
}

impl SpaceServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("SPACE_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("SPACE_PORT")
                .unwrap_or_else(|_| "3002".to_string())
                .parse()
                .expect("SPACE_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
        }
    }
}
