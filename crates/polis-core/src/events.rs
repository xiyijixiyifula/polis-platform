use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// NATS 消息主题定义
pub mod subjects {
    // 内容事件
    pub const CONTENT_POST_CREATED: &str = "content.post.created";
    pub const CONTENT_POST_LIKED: &str = "content.post.liked";
    pub const CONTENT_COMMENT_CREATED: &str = "content.comment.created";

    // 社区事件
    pub const SPACE_CREATED: &str = "space.created";
    pub const SPACE_MEMBER_JOINED: &str = "space.member.joined";
    pub const SPACE_MODULE_ENABLED: &str = "space.module.enabled";
    pub const SPACE_MODULE_DISABLED: &str = "space.module.disabled";

    // 视频事件
    pub const VIDEO_UPLOAD_COMPLETED: &str = "video.upload.completed";
    pub const VIDEO_TRANSCODE_COMPLETED: &str = "video.transcode.completed";

    // 订单事件
    pub const STORE_ORDER_CREATED: &str = "store.order.created";
    pub const STORE_ORDER_PAID: &str = "store.order.paid";

    // 用户事件
    pub const USER_FOLLOWED: &str = "user.followed";
    pub const USER_REGISTERED: &str = "user.registered";

    // 支付事件
    pub const PAYMENT_COMPLETED: &str = "payment.completed";
}

/// 基础事件结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub subject: String,
    pub source: String,
    pub timestamp: i64,
    pub payload: serde_json::Value,
}

/// 内容创建事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostCreatedEvent {
    pub post_id: Uuid,
    pub space_id: Uuid,
    pub author_id: Uuid,
    pub module_type: String,
    pub title: String,
    pub created_at: i64,
}

/// 社区创建事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceCreatedEvent {
    pub space_id: Uuid,
    pub namespace: String,
    pub owner_id: Uuid,
    pub is_root: bool,
    pub root_space_id: Option<Uuid>,
    pub created_at: i64,
}

/// 成员加入事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberJoinedEvent {
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: i64,
}

/// 支付完成事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentCompletedEvent {
    pub transaction_id: Uuid,
    pub from_user_id: Uuid,
    pub to_user_id: Option<Uuid>,
    pub to_space_id: Option<Uuid>,
    pub amount_cents: i64,
    pub tx_type: String,
    pub provider: String,
    pub provider_tx_id: String,
}
