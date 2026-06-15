use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_plugin_engine::handler::PluginHandler;
use polis_plugin_engine::routes::plugin_routes;
use polis_plugin_engine::runtime::PluginEngine;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://polis:polis_dev@localhost:5432/polis".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&database_url)
        .await?;

    sqlx::query("SET statement_timeout = '30s'").execute(&pool).await?;

    let engine = PluginEngine::new()
        .map_err(|e| anyhow::anyhow!("Failed to create plugin engine: {}", e))?;

    let handler = Arc::new(PluginHandler::new(pool, engine));
    let app = plugin_routes(handler);

    let port = std::env::var("PLUGIN_PORT").unwrap_or_else(|_| "3010".to_string());
    let addr = format!("0.0.0.0:{}", port);
    tracing::info!("Plugin engine starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
