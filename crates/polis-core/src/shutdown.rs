use tokio::signal;

/// Graceful shutdown signal handler — waits for SIGTERM or SIGINT.
/// Use with axum::serve(...).with_graceful_shutdown(shutdown_signal()).
pub async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.ok();
        tracing::info!("Received SIGINT, shutting down...");
    };

    #[cfg(unix)]
    let terminate = async {
        match signal::unix::signal(signal::unix::SignalKind::terminate()).ok() {
            Some(mut sig) => {
                sig.recv().await;
            }
            None => {
                std::future::pending::<()>().await;
            }
        }
        tracing::info!("Received SIGTERM, shutting down...");
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, starting graceful shutdown");
}
