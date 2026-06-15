use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_store::config::StoreServiceConfig;
use polis_store::handler::StoreHandler;
use polis_store::routes::store_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = StoreServiceConfig::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    let handler = Arc::new(StoreHandler::new(pool));
    let app = store_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Store service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
