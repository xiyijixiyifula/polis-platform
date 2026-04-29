use std::env;

#[derive(Debug, Clone)]
pub struct SearchServiceConfig {
    pub host: String,
    pub port: u16,
    pub meili_url: String,
    pub meili_key: String,
    pub nats_url: String,
}

impl SearchServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("SEARCH_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("SEARCH_PORT")
                .unwrap_or_else(|_| "3004".to_string())
                .parse()
                .expect("SEARCH_PORT must be a number"),
            meili_url: env::var("MEILI_URL").unwrap_or_else(|_| "http://localhost:7700".to_string()),
            meili_key: env::var("MEILI_MASTER_KEY").unwrap_or_else(|_| "polis_dev_key".to_string()),
            nats_url: env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
        }
    }
}
