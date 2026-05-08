use std::sync::Arc;

use axum::{
    extract::{ws::WebSocketUpgrade, Path, State},
    routing::get,
    Router,
};
use futures_util::StreamExt;

use crate::handler::ChatHandler;

pub fn chat_routes(handler: Arc<ChatHandler>) -> Router {
    Router::new()
        .route("/ws/spaces/{namespace}/chat", get(ws_handler))
        .with_state(handler)
}

/// WS /ws/spaces/:namespace/chat - WebSocket 聊天连接
async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(namespace): Path<String>,
    State(handler): State<Arc<ChatHandler>>,
) -> impl axum::response::IntoResponse {
    ws.on_upgrade(move |socket| {
        let rooms = handler.rooms.clone();
        let ns = namespace.clone();
        async move {
            let room = rooms.get_or_create(&ns).await;
            let (mut sender, mut receiver) = socket.split();
            let mut rx = room.subscribe();

            let send_task = tokio::spawn(async move {
                use futures_util::SinkExt;
                while let Ok(msg) = rx.recv().await {
                    if let Ok(text) = serde_json::to_string(&msg) {
                        if sender.send(axum::extract::ws::Message::Text(text.into())).await.is_err() {
                            break;
                        }
                    }
                }
            });

            let rooms_clone = rooms.clone();
            let recv_task = tokio::spawn(async move {
                use futures_util::StreamExt;
                while let Some(Ok(msg)) = receiver.next().await {
                    if let axum::extract::ws::Message::Text(text) = msg {
                        if let Ok(chat_msg) = serde_json::from_str::<crate::room::ChatMessage>(&text) {
                            rooms_clone.broadcast(&ns, chat_msg).await;
                        }
                    }
                }
            });

            tokio::select! {
                _ = send_task => {},
                _ = recv_task => {},
            }
        }
    })
}
