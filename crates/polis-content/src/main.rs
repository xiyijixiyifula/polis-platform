use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use polis_content::config::ContentServiceConfig;
use polis_content::handlers::content_handler::ContentHandler;
use polis_content::routes::content_routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = ContentServiceConfig::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");
    tracing::info!("Connected to PostgreSQL");

    // 确保 post_references 表存在（跨社区投稿引用）
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS post_references (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            space_id UUID NOT NULL REFERENCES spaces(id),
            module_type VARCHAR NOT NULL DEFAULT 'forum',
            status VARCHAR NOT NULL DEFAULT 'pending',
            submitted_by UUID NOT NULL REFERENCES users(id),
            reviewed_by UUID REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            reviewed_at TIMESTAMPTZ
        )"
    ).execute(&pool).await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_post_references_post_id ON post_references(post_id)"
    ).execute(&pool).await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_post_references_space_id ON post_references(space_id)"
    ).execute(&pool).await?;

    // 确保 notifications 表存在
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            type VARCHAR NOT NULL,
            actor_id UUID REFERENCES users(id),
            target_type VARCHAR,
            target_id UUID,
            content TEXT,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    ).execute(&pool).await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC)"
    ).execute(&pool).await?;

    // 私信增强：添加 is_pinned, is_deleted 列
    sqlx::query(
        "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE"
    ).execute(&pool).await?;
    sqlx::query(
        "ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
    ).execute(&pool).await?;

    // 私信免打扰表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS user_conversation_mutes (
            user_id UUID NOT NULL REFERENCES users(id),
            muted_user_id UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, muted_user_id)
        )"
    ).execute(&pool).await?;

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

    let handler = Arc::new(ContentHandler::new(pool, config.clone(), nats));
    let app = content_routes(handler);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Content service starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
