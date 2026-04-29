use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_space::config::SpaceServiceConfig;
use polis_space::handlers::space_handler::SpaceHandler;
use polis_space::routes::space_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = SpaceServiceConfig::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");
    tracing::info!("Connected to PostgreSQL");

    let nats = match async_nats::connect(&config.nats_url).await {
        Ok(client) => {
            tracing::info!("Connected to NATS");
            Some(client)
        }
        Err(e) => {
            tracing::warn!("Failed to connect to NATS: {}", e);
            None
        }
    };

    let handler = Arc::new(SpaceHandler::new(pool, config.clone(), nats));
    let app = space_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Space service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
