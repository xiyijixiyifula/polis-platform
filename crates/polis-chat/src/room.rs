use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::{RwLock, broadcast};
use tokio::task::JoinHandle;

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
    last_active: std::sync::Mutex<Instant>,
}

impl ChatRoom {
    pub fn new(space_id: &str) -> Self {
        let (tx, _) = broadcast::channel(1024);
        Self {
            space_id: space_id.to_string(),
            tx,
            last_active: std::sync::Mutex::new(Instant::now()),
        }
    }

    pub fn sender(&self) -> broadcast::Sender<ChatMessage> {
        self.tx.clone()
    }

    pub fn subscribe(&self) -> broadcast::Receiver<ChatMessage> {
        self.tx.subscribe()
    }

    /// 更新房间最后活跃时间
    pub fn touch(&self) {
        if let Ok(mut la) = self.last_active.lock() {
            *la = Instant::now();
        }
    }

    /// 返回房间最后活跃时间
    pub fn last_active(&self) -> Instant {
        self.last_active
            .lock()
            .map(|la| *la)
            .unwrap_or_else(|_| Instant::now())
    }
}

/// 房间管理器
pub struct RoomManager {
    rooms: RwLock<HashMap<String, Arc<ChatRoom>>>,
    cleanup_handle: std::sync::Mutex<Option<JoinHandle<()>>>,
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
            cleanup_handle: std::sync::Mutex::new(None),
        }
    }

    /// 启动后台清理任务，每5分钟移除超过1小时未活动的房间
    pub fn start_cleanup(self: &Arc<Self>) {
        let manager = self.clone();
        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            interval.tick().await; // skip first immediate tick
            loop {
                interval.tick().await;
                let stale_threshold = Instant::now() - Duration::from_secs(3600); // 1 hour
                let mut rooms = manager.rooms.write().await;
                let before = rooms.len();
                rooms.retain(|_, room| room.last_active() >= stale_threshold);
                let removed = before - rooms.len();
                if removed > 0 {
                    tracing::info!("TTL eviction: removed {} stale chat room(s)", removed);
                }
            }
        });
        // Replace any existing handle (idempotent — aborts prior handle on re-call)
        if let Ok(mut guard) = self.cleanup_handle.lock() {
            if let Some(old) = guard.replace(handle) {
                old.abort();
            }
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
            room.touch();
            let _ = room.tx.send(message);
        }
    }
}
