use std::sync::Arc;

use polis_core::events::Event;
use polis_core::shutdown::shutdown_signal;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_aggregate::aggregator::Aggregator;
use polis_aggregate::handler::AggregateHandler;
use polis_aggregate::routes::aggregate_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string());
    let port = std::env::var("AGGREGATE_PORT").unwrap_or_else(|_| "3011".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&database_url)
        .await?;

    let aggregator = Arc::new(Aggregator::new(pool.clone()));

    // 连接 NATS 订阅内容事件
    if let Ok(nats) = async_nats::connect(&nats_url).await {
        tracing::info!("Connected to NATS for aggregate events");

        let agg = aggregator.clone();
        let mut subscriber = nats.subscribe("content.post.created".to_string()).await?;

        tokio::spawn(async move {
            use futures_util::StreamExt;
            while let Some(msg) = subscriber.next().await {
                if let Ok(event) = serde_json::from_slice::<Event>(&msg.payload) {
                    if let Err(e) = agg.handle_post_created(&event).await {
                        tracing::error!("Aggregate handler error: {}", e);
                    }
                }
            }
        });

        let handler = Arc::new(AggregateHandler::new(Aggregator::clone(&aggregator)));
        let app = aggregate_routes(handler);

        let addr = format!("0.0.0.0:{}", port);
        tracing::info!("Aggregate service starting on {}", addr);

        let listener = tokio::net::TcpListener::bind(&addr).await?;
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await?;
    } else {
        tracing::warn!("NATS not available, aggregate service running without event processing");
        let handler = Arc::new(AggregateHandler::new(Aggregator::clone(&aggregator)));
        let app = aggregate_routes(handler);

        let addr = format!("0.0.0.0:{}", port);
        let listener = tokio::net::TcpListener::bind(&addr).await?;
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await?;
    }

    Ok(())
}
