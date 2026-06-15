//! NATS reconnection wrapper with exponential backoff and health checks.
//!
//! This module provides [`NatsReconnect`], a thin wrapper around `async_nats::Client`
//! that adds:
//!
//! - **Exponential backoff** for the initial connection attempt (1s, 2s, 4s, 8s, max 30s)
//! - **Post-connection auto-reconnect** via `async_nats` built-in reconnect (same backoff)
//! - **Health check** background task that periodically monitors connection state
//! - **Graceful degradation** — returns `None` if NATS is unreachable after max retries,
//!   so callers can fall back to direct DB writes
//!
//! ## Backward compatibility
//!
//! [`NatsReconnect::connect`] returns `Option<async_nats::Client>`, exactly the same
//! type that services already store in their handler structs. No handler code changes
//! are needed.
//!
//! ## Usage
//!
//! ```ignore
//! // Before (no reconnection):
//! let nats = async_nats::connect(&nats_url).await.ok();
//!
//! // After (with reconnection):
//! let nats = NatsReconnect::connect(&nats_url).await;
//! ```

use std::time::Duration;

use async_nats::ConnectOptions;
use tracing;

/// Maximum number of retry attempts for the initial connection.
/// With exponential backoff starting at 1s and max 30s:
///   attempt 1 = 1s,  2 = 2s,  3 = 4s,  4 = 8s,
///   5 = 16s, 6–10 = 30s each
/// Total max wait ≈ 1+2+4+8+16+30*5 = 181s ≈ 3 minutes
const MAX_INITIAL_RETRIES: u32 = 10;

/// How often the health-check task polls the connection state.
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(30);

/// Computes the exponential backoff delay for a given retry attempt number
/// (1-indexed), capped at 30 seconds.
fn backoff_delay(attempt: u32) -> Duration {
    // attempt 1 → 1s, 2 → 2s, 3 → 4s, 4 → 8s, 5 → 16s, 6+ → 30s (capped)
    let shift = (attempt.saturating_sub(1)).min(5);
    let secs = (1u64 << shift).min(30);
    Duration::from_secs(secs)
}

/// Builds `ConnectOptions` with production-grade reconnect settings:
/// - Unlimited reconnects (`max_reconnects(None)`)
/// - Exponential backoff via [`backoff_delay`] (1s → 2s → 4s → 8s → 30s)
/// - Default ping interval (60s) for dead-connection detection
fn reconnect_options() -> ConnectOptions {
    ConnectOptions::new()
        .max_reconnects(None)
        .reconnect_delay_callback(|attempts| {
            // `attempts` starts at 1 on the first reconnect after disconnect
            let delay = backoff_delay(attempts as u32);
            tracing::debug!(
                "NATS reconnect attempt {}, waiting {:?}",
                attempts,
                delay
            );
            delay
        })
}

/// NATS reconnection wrapper.
///
/// This struct is intentionally opaque — the only public API is
/// [`NatsReconnect::connect`], which returns a plain `Option<async_nats::Client>`.
/// There is no need for callers to hold an instance of this struct.
pub struct NatsReconnect;

impl NatsReconnect {
    /// Connect to NATS with exponential-backoff retry and automatic reconnection.
    ///
    /// - Retries the initial connection up to [`MAX_INITIAL_RETRIES`] times with
    ///   exponential backoff.
    /// - Once connected, the returned `Client` will automatically reconnect on
    ///   connection loss (same exponential backoff, unlimited retries).
    /// - Spawns a background health-check task that logs connection-state changes
    ///   every [`HEALTH_CHECK_INTERVAL`].
    ///
    /// Returns `None` if all initial retries are exhausted without a successful
    /// connection. Callers should treat `None` as "NATS unavailable" and fall back
    /// to direct DB writes or skip event publishing.
    pub async fn connect(url: &str) -> Option<async_nats::Client> {
        for attempt in 1..=MAX_INITIAL_RETRIES {
            match Self::try_connect_once(url).await {
                Ok(client) => {
                    tracing::info!(
                        "NATS connected successfully on attempt {} (url: {})",
                        attempt,
                        url
                    );
                    Self::spawn_health_check(client.clone());
                    return Some(client);
                }
                Err(e) => {
                    let wait = backoff_delay(attempt);
                    tracing::warn!(
                        "NATS connection attempt {}/{} failed: {}. Retrying in {:?}...",
                        attempt,
                        MAX_INITIAL_RETRIES,
                        e,
                        wait
                    );
                    if attempt < MAX_INITIAL_RETRIES {
                        tokio::time::sleep(wait).await;
                    }
                }
            }
        }

        tracing::error!(
            "NATS connection failed after {} attempts. NATS features disabled.",
            MAX_INITIAL_RETRIES
        );
        None
    }

    /// Single connection attempt using `ConnectOptions` with reconnect settings.
    ///
    /// Uses `retry_on_initial_connect(false)` so that `connect_with_options`
    /// returns immediately with an error if NATS is down — we handle retries
    /// in [`Self::connect`] above.
    async fn try_connect_once(url: &str) -> Result<async_nats::Client, async_nats::ConnectError> {
        let options = reconnect_options();
        async_nats::connect_with_options(url, options).await
    }

    /// Spawns a background task that periodically checks the NATS connection
    /// state and logs transitions.
    fn spawn_health_check(client: async_nats::Client) {
        tokio::spawn(async move {
            let mut prev_state: Option<async_nats::connection::State> = None;

            loop {
                tokio::time::sleep(HEALTH_CHECK_INTERVAL).await;

                let current = client.connection_state();
                let changed = prev_state.as_ref() != Some(&current);

                if changed {
                    match current {
                        async_nats::connection::State::Connected => {
                            tracing::info!("NATS health: connected");
                        }
                        async_nats::connection::State::Disconnected => {
                            tracing::warn!("NATS health: disconnected (auto-reconnect in progress)");
                        }
                        async_nats::connection::State::Pending => {
                            tracing::info!("NATS health: pending connection");
                        }
                    }
                    prev_state = Some(current);
                }
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backoff_delay_bounds() {
        // attempt 1 → 1s
        assert_eq!(backoff_delay(1), Duration::from_secs(1));
        // attempt 2 → 2s
        assert_eq!(backoff_delay(2), Duration::from_secs(2));
        // attempt 3 → 4s
        assert_eq!(backoff_delay(3), Duration::from_secs(4));
        // attempt 4 → 8s
        assert_eq!(backoff_delay(4), Duration::from_secs(8));
        // attempt 5 → 16s
        assert_eq!(backoff_delay(5), Duration::from_secs(16));
        // attempt 6 → 30s (capped)
        assert_eq!(backoff_delay(6), Duration::from_secs(30));
        // attempt 100 → still 30s
        assert_eq!(backoff_delay(100), Duration::from_secs(30));
    }

    #[test]
    fn test_backoff_delay_zero_not_panicking() {
        // attempt 0 (should not happen in practice, but defensive)
        let _ = backoff_delay(0);
    }
}
