use std::sync::Arc;

use futures_util::StreamExt;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_core::events::subjects;
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
        .max_connections(20).acquire_timeout(std::time::Duration::from_secs(10))
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

    // 订阅 NATS token 黑名单事件，同步拉黑其他服务撤销的 token
    // 生产环境应使用 Redis 替代内存黑名单 + NATS 同步
    let sub_blacklist = handler.token_blacklist.clone();
    let sub_nats_url = config.nats_url.clone();
    tokio::spawn(async move {
        match async_nats::connect(&sub_nats_url).await {
            Ok(nc) => {
                tracing::info!("Space service subscribed to token blacklist events");
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
                tracing::warn!("Space service failed to connect to NATS for blacklist sync: {}", e);
            }
        }
    });

    let app = space_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Space service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
