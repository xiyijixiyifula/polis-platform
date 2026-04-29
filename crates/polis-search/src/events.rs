use polis_core::events::{subjects, Event};
use tracing::info;

use crate::meili::MeiliClient;

/// 处理 NATS 事件，自动更新搜索索引
pub async fn handle_event(event: Event, meili: &MeiliClient) {
    match event.subject.as_str() {
        subjects::CONTENT_POST_CREATED => {
            info!("Indexing new post");
            // Extract post data from event payload and index
            if let Some(post_data) = event.payload.as_object() {
                let doc = serde_json::json!({
                    "id": post_data.get("post_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "space_id": post_data.get("space_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "title": post_data.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "created_at": event.timestamp,
                });
                if let Err(e) = meili.add_documents::<serde_json::Value>("posts", &[doc]).await {
                    tracing::error!("Failed to index post: {}", e);
                }
            }
        }
        subjects::SPACE_CREATED => {
            info!("Indexing new space");
            if let Some(space_data) = event.payload.as_object() {
                let doc = serde_json::json!({
                    "id": space_data.get("space_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "namespace": space_data.get("namespace").and_then(|v| v.as_str()).unwrap_or(""),
                    "is_root": space_data.get("is_root").and_then(|v| v.as_bool()).unwrap_or(false),
                });
                if let Err(e) = meili.add_documents::<serde_json::Value>("spaces", &[doc]).await {
                    tracing::error!("Failed to index space: {}", e);
                }
            }
        }
        _ => {
            tracing::debug!("Ignoring event: {}", event.subject);
        }
    }
}
