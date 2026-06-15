use std::sync::Arc;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;
use futures_util::StreamExt;
use polis_notify::config::NotifyConfig;
use polis_notify::handler::NotifyHandler;
use polis_notify::routes::notify_routes;
use polis_core::events::subjects;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into())).json().init();
    let config = NotifyConfig::from_env();
    let pool = PgPoolOptions::new().max_connections(5).acquire_timeout(std::time::Duration::from_secs(10)).connect(&config.database_url).await?;
    let handler = Arc::new(NotifyHandler::new(pool));

    // Connect to NATS and subscribe to events for notification generation
    let nats_handler = handler.clone();
    let nats_url = config.nats_url.clone();
    tokio::spawn(async move {
        match async_nats::connect(&nats_url).await {
            Ok(nats_client) => {
                tracing::info!("Notify service connected to NATS, subscribing to events");

                let subjects = vec![
                    subjects::CONTENT_POST_CREATED,
                    subjects::CONTENT_POST_LIKED,
                    subjects::CONTENT_COMMENT_CREATED,
                    subjects::USER_FOLLOWED,
                ];

                for subject in &subjects {
                    let mut subscriber = match nats_client.subscribe(subject.to_string()).await {
                        Ok(s) => s,
                        Err(e) => {
                            tracing::warn!("Failed to subscribe to {}: {}", subject, e);
                            continue;
                        }
                    };
                    let handler = nats_handler.clone();
                    let subject = subject.to_string();
                    tokio::spawn(async move {
                        tracing::info!("Listening on NATS subject: {}", subject);
                        while let Some(msg) = subscriber.next().await {
                            let payload: serde_json::Value = match serde_json::from_slice(&msg.payload) {
                                Ok(v) => v,
                                Err(e) => {
                                    tracing::warn!("Bad NATS msg on {}: {}", subject, e);
                                    continue;
                                }
                            };
                            handler.handle_event(&subject, &payload).await;
                        }
                    });
                }

                // 订阅 token 黑名单事件，同步更新本地黑名单
                // 生产环境应使用 Redis 替代内存黑名单 + NATS 同步
                let bl_handler = nats_handler.clone();
                match nats_client.subscribe(subjects::TOKEN_BLACKLISTED.to_string()).await {
                    Ok(mut sub) => {
                        tracing::info!("Notify service subscribed to token blacklist events");
                        tokio::spawn(async move {
                            while let Some(msg) = sub.next().await {
                                let jti = String::from_utf8_lossy(&msg.payload).to_string();
                                tracing::debug!("Blacklisting token jti={} from NATS", jti);
                                bl_handler.token_blacklist.blacklist(&jti).await;
                            }
                        });
                    }
                    Err(e) => {
                        tracing::warn!("Failed to subscribe to token.blacklisted: {}", e);
                    }
                }

                tracing::info!("NATS subscriptions active");
            }
            Err(e) => {
                tracing::warn!("Notify failed to connect NATS: {}. Event notifications disabled.", e);
            }
        }
    });

    let app = notify_routes(handler);
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Notification service starting on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
