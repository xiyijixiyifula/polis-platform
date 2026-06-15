use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_code::config::CodeServiceConfig;
use polis_code::handler::CodeHandler;
use polis_code::routes::code_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = CodeServiceConfig::from_env();
    tokio::fs::create_dir_all(&config.repos_root).await.ok();

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    sqlx::query("SET statement_timeout = '30s'").execute(&pool).await?;

    let handler = Arc::new(CodeHandler::new(pool, config.clone()));
    let app = code_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Code service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
