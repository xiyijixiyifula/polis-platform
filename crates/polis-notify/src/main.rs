use std::sync::Arc;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;
use polis_notify::config::NotifyConfig;
use polis_notify::handler::NotifyHandler;
use polis_notify::routes::notify_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into())).json().init();
    let config = NotifyConfig::from_env();
    let pool = PgPoolOptions::new().max_connections(10).connect(&config.database_url).await?;
    let handler = Arc::new(NotifyHandler::new(pool));
    let app = notify_routes(handler);
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Notification service starting on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
