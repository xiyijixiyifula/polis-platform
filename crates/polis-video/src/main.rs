use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_video::config::VideoServiceConfig;
use polis_video::handler::VideoHandler;
use polis_video::repo::VideoRepo;
use polis_video::routes::video_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = VideoServiceConfig::from_env();

    // 确保存储目录存在
    tokio::fs::create_dir_all(&config.storage_path).await.ok();
    tokio::fs::create_dir_all(&config.hls_output_path).await.ok();

    let pool = PgPoolOptions::new()
        .max_connections(10).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    let repo = VideoRepo::new(pool);
    let handler = Arc::new(VideoHandler::new(repo, config.clone()));
    let app = video_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Video service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
