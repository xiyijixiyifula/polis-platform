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
                .expect("STORE_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
        }
    }
}
