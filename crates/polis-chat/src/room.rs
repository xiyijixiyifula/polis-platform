use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::{RwLock, broadcast};

/// 聊天消息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub message_type: String, // "text" | "image" | "system"
    pub timestamp: i64,
}

/// 聊天房间
pub struct ChatRoom {
    pub space_id: String,
    pub tx: broadcast::Sender<ChatMessage>,
}

impl ChatRoom {
    pub fn new(space_id: &str) -> Self {
        let (tx, _) = broadcast::channel(1024);
        Self {
            space_id: space_id.to_string(),
            tx,
        }
    }

    pub fn sender(&self) -> broadcast::Sender<ChatMessage> {
        self.tx.clone()
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ChatMessage> {
        self.tx.subscribe()
    }
}

/// 房间管理器
pub struct RoomManager {
    rooms: RwLock<HashMap<String, Arc<ChatRoom>>>,
}

impl Default for RoomManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: RwLock::new(HashMap::new()),
        }
    }

    /// 获取或创建房间
    pub async fn get_or_create(&self, space_id: &str) -> Arc<ChatRoom> {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(space_id) {
            return room.clone();
        }
        drop(rooms);

        let mut rooms = self.rooms.write().await;
        let room = Arc::new(ChatRoom::new(space_id));
        rooms.insert(space_id.to_string(), room.clone());
        room
    }

    /// 向房间广播消息
    pub async fn broadcast(&self, space_id: &str, message: ChatMessage) {
        if let Some(room) = self.rooms.read().await.get(space_id) {
            let _ = room.tx.send(message);
        }
    }
}
