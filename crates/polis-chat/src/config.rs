use std::env;

#[derive(Debug, Clone)]
pub struct ChatServiceConfig {
    pub host: String,
    pub port: u16,
}

impl ChatServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("CHAT_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("CHAT_PORT")
                .unwrap_or_else(|_| "3006".to_string())
                .parse()
                .expect("CHAT_PORT must be a number"),
        }
    }
}
