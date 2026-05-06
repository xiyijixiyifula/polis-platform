use std::env;

#[derive(Debug, Clone)]
pub struct NotifyConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub nats_url: String,
    pub jwt_secret: String,
}

impl NotifyConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("NOTIFY_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("NOTIFY_PORT").unwrap_or_else(|_| "3020".to_string())
                .parse().expect("NOTIFY_PORT must be a number"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string()),
        }
    }
}
