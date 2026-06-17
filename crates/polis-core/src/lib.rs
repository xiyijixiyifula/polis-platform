pub mod models;
pub mod error;
pub mod events;
pub mod types;
pub mod resolver;
pub mod admin;
pub mod auth;
pub mod mention;
pub mod hashtag;
pub mod token_blacklist;
pub mod shutdown;
pub mod nats_reconnect;
pub mod mail;

/// Serialize a value to JSON with error logging.
/// Prefer this over `serde_json::to_value(x).unwrap_or_default()` which silently discards errors.
pub fn to_json_value<T: serde::Serialize>(val: &T) -> serde_json::Value {
    serde_json::to_value(val).unwrap_or_else(|e| {
        tracing::warn!("Serialization failed: {}", e);
        serde_json::json!({})
    })
}
