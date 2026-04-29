use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use polis_chat::config::ChatServiceConfig;
use polis_chat::handler::ChatHandler;
use polis_chat::routes::chat_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = ChatServiceConfig::from_env();
    let handler = Arc::new(ChatHandler::new());
    let app = chat_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Chat service (WebSocket) starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
