use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_core::nats_reconnect::NatsReconnect;
use polis_pay::config::PayServiceConfig;
use polis_pay::handler::PayHandler;
use polis_pay::routes::pay_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = PayServiceConfig::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    sqlx::query("SET statement_timeout = '30s'").execute(&pool).await?;

    let nats = NatsReconnect::connect(&config.nats_url).await;

    let handler = Arc::new(PayHandler::new(pool, config.clone(), nats));
    let app = pay_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Pay service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
