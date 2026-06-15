use std::sync::Arc;

use futures_util::StreamExt;
use polis_core::events::Event;
use polis_core::nats_reconnect::NatsReconnect;
use tracing_subscriber::EnvFilter;

use polis_search::config::SearchServiceConfig;
use polis_search::events::handle_event;
use polis_search::handlers::SearchHandler;
use polis_search::meili::MeiliClient;
use polis_search::routes::search_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = SearchServiceConfig::from_env();

    // 初始化 Meilisearch 客户端
    let meili = MeiliClient::new(&config.meili_url, &config.meili_key);

    // 创建索引
    tracing::info!("Initializing Meilisearch indexes...");
    meili.create_index("post", "id").await?;
    meili.create_index("space", "id").await?;
    meili.create_index("user", "id").await?;

    // 配置搜索设置
    let post_settings = serde_json::json!({
        "searchableAttributes": ["title", "body", "tags", "author_name"],
        "filterableAttributes": ["space_id", "created_at"],
        "sortableAttributes": ["created_at", "like_count"],
        "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    });
    meili.update_settings("post", &post_settings).await?;

    let space_settings = serde_json::json!({
        "searchableAttributes": ["title", "description", "namespace"],
        "filterableAttributes": ["is_root", "member_count"],
        "sortableAttributes": ["member_count", "post_count"],
    });
    meili.update_settings("space", &space_settings).await?;

    tracing::info!("Meilisearch indexes ready");

    // 连接 NATS 并订阅事件
    let _nats = match NatsReconnect::connect(&config.nats_url).await {
        Some(client) => {
            tracing::info!("Connected to NATS for event indexing");

            let meili_clone = meili.clone();
            let mut subscriber = client.subscribe(">".to_string()).await?;

            tokio::spawn(async move {
                while let Some(msg) = subscriber.next().await {
                    if let Ok(event) = serde_json::from_slice::<Event>(&msg.payload) {
                        handle_event(event, &meili_clone).await;
                    }
                }
            });

            Some(client)
        }
        None => {
            tracing::warn!("Failed to connect to NATS");
            None
        }
    };

    // 构建 HTTP 服务
    let handler = Arc::new(SearchHandler::new(meili));
    let app = search_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Search service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
