use std::net::SocketAddr;
use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_admin::admin_handler::AdminHandler;
use polis_admin::config::AdminConfig;
use polis_core::shutdown::shutdown_signal;
use polis_admin::routes::admin_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = AdminConfig::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    sqlx::query("SET statement_timeout = '30s'").execute(&pool).await?;

    let handler = Arc::new(AdminHandler::new(pool, config.clone()));
    let app = admin_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Admin service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}
