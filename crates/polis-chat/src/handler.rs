use std::sync::Arc;

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::Path,
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use uuid::Uuid;

use crate::room::{ChatMessage, RoomManager};

/// WebSocket 连接处理器
pub struct ChatHandler {
    pub rooms: Arc<RoomManager>,
}

impl ChatHandler {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RoomManager::new()),
        }
    }

    /// 处理 WebSocket 升级请求
    pub async fn handle_ws(
        self: Arc<Self>,
        ws: WebSocketUpgrade,
        namespace: Path<String>,
    ) -> impl IntoResponse {
        let rooms = self.rooms.clone();
        ws.on_upgrade(move |socket| handle_socket(socket, namespace.0.clone(), rooms))
    }
}

/// 处理单个 WebSocket 连接
async fn handle_socket(
    socket: WebSocket,
    space_id: String,
    rooms: Arc<RoomManager>,
) {
    let (mut sender, mut receiver) = socket.split();

    // 获取房间和接收者
    let room = rooms.get_or_create(&space_id).await;
    let mut rx = room.subscribe();

    // 广播接收任务：从房间接收消息并发送给此客户端
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if let Ok(text) = serde_json::to_string(&msg) {
                if sender.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // 接收任务：从此客户端接收消息并广播到房间
    let rooms_clone = rooms.clone();
    let space_id_clone = space_id.clone();
    let mut recv_handle = {
        tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(chat_msg) = serde_json::from_str::<ChatMessage>(&text) {
                        rooms_clone.broadcast(&space_id_clone, chat_msg).await;
                    }
                }
            }
        })
    };

    // 等待任意一个任务完成（连接断开）
    tokio::select! {
        _ = &mut send_task => {},
        _ = &mut recv_handle => {},
    }
}

/// 发送聊天消息（HTTP API）
pub async fn send_message(
    rooms: Arc<RoomManager>,
    space_id: &str,
    user_id: &str,
    username: &str,
    content: &str,
) -> ChatMessage {
    let msg = ChatMessage {
        id: Uuid::new_v4().to_string(),
        user_id: user_id.to_string(),
        username: username.to_string(),
        content: content.to_string(),
        message_type: "text".to_string(),
        timestamp: chrono::Utc::now().timestamp(),
    };

    rooms.broadcast(space_id, msg.clone()).await;
    msg
}
