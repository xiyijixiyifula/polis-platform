use std::{env, path::PathBuf};

#[derive(Debug, Clone)]
pub struct CodeServiceConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub repos_root: PathBuf,
}

impl CodeServiceConfig {
    pub fn from_env() -> Self {
        Self {
            host: env::var("CODE_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("CODE_PORT")
                .unwrap_or_else(|_| "3007".to_string())
                .parse()
                .expect("CODE_PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            repos_root: env::var("CODE_REPOS_ROOT")
                .unwrap_or_else(|_| "./data/repos".to_string())
                .into(),
        }
    }
}
