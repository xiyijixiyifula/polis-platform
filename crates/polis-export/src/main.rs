use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    tracing::info!("polis-export starting...");

    // TODO(#export-service): Implement full export service logic (Phase 1+)
    // The export service should:
    // - Accept creation IDs and export format (JSON, Markdown, HTML) via CLI or gRPC
    // - Fetch creations + their module references from the database
    // - Generate export bundles with metadata (author, community, timestamps)
    // - Stream large exports to avoid memory pressure
    // - Support incremental/delta exports for large communities
    // Tracked in: docs/progress/MASTER.md — Export Service milestone

    Ok(())
}
