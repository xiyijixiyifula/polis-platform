use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_user::config::UserServiceConfig;
use polis_user::handlers::user_handler::UserHandler;
use polis_core::shutdown::shutdown_signal;
use polis_user::routes::user_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 加载 .env 文件
    dotenvy::dotenv().ok();

    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    // 加载配置
    let config = UserServiceConfig::from_env();

    // 连接数据库
    let pool = PgPoolOptions::new()
        .max_connections(20).acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    tracing::info!("Connected to PostgreSQL");

    // 连接 NATS (可选)
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

    // 创建处理器
    let handler = Arc::new(UserHandler::new(
        pool,
        config.clone(),
        nats,
    ));

    // 构建路由
    let app = user_routes(handler);

    // 启动服务
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("User service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}
