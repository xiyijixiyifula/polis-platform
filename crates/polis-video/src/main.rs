use std::sync::Arc;

use futures_util::StreamExt;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_core::events::subjects;
use polis_core::shutdown::shutdown_signal;
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
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    let repo = VideoRepo::new(pool);
    let handler = Arc::new(VideoHandler::new(repo, config.clone()));

    // 订阅 NATS token 黑名单事件，同步更新本地黑名单
    // 生产环境应使用 Redis 替代内存黑名单 + NATS 同步
    let sub_blacklist = handler.token_blacklist.clone();
    let sub_nats_url = config.nats_url.clone();
    tokio::spawn(async move {
        match async_nats::connect(&sub_nats_url).await {
            Ok(nc) => {
                tracing::info!("Video service subscribed to token blacklist events");
                let mut sub = match nc.subscribe(subjects::TOKEN_BLACKLISTED.to_string()).await {
                    Ok(s) => s,
                    Err(e) => {
                        tracing::warn!("Failed to subscribe to token.blacklisted: {}", e);
                        return;
                    }
                };
                while let Some(msg) = sub.next().await {
                    let jti = String::from_utf8_lossy(&msg.payload).to_string();
                    tracing::debug!("Blacklisting token jti={} from NATS", jti);
                    sub_blacklist.blacklist(&jti).await;
                }
            }
            Err(e) => {
                tracing::warn!("Video service failed to connect to NATS for blacklist sync: {}", e);
            }
        }
    });

    let app = video_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Video service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}
