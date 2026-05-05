use sqlx::PgPool;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use polis_core::error::AppError;
use polis_core::resolver::resolve::resolve_space_id;

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChatMessage {
    pub id: Uuid,
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub message_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 聊天消息 + 用户信息（API 返回）
#[derive(Debug, Clone, Serialize)]
pub struct ChatMessagePublic {
    pub id: Uuid,
    pub space_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub display_name: String,
    pub avatar_letter: String,
    pub content: String,
    pub message_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct ChatHandler {
    pub pool: PgPool,
}

impl ChatHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 发送聊天消息
    pub async fn send_message(
        &self,
        space_id: Uuid,
        user_id: Uuid,
        content: &str,
    ) -> Result<ChatMessagePublic, AppError> {
        let msg = sqlx::query_as::<_, ChatMessage>(
            "INSERT INTO chat_messages (space_id, user_id, content, message_type) VALUES ($1, $2, $3, 'text') RETURNING *"
        )
        .bind(space_id)
        .bind(user_id)
        .bind(content)
        .fetch_one(&self.pool)
        .await?;

        self.enrich_message(msg).await
    }

    /// 获取聊天消息列表（时间倒序取最新 N 条，再反转为正序）
    pub async fn list_messages(
        &self,
        space_id: Uuid,
        limit: u32,
    ) -> Result<Vec<ChatMessagePublic>, AppError> {
        let msgs = sqlx::query_as::<_, ChatMessage>(
            "SELECT * FROM chat_messages WHERE space_id = $1 ORDER BY created_at DESC LIMIT $2"
        )
        .bind(space_id)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::with_capacity(msgs.len());
        for msg in msgs {
            result.push(self.enrich_message(msg).await?);
        }
        result.reverse();
        Ok(result)
    }

    /// 为消息附加作者信息
    async fn enrich_message(&self, msg: ChatMessage) -> Result<ChatMessagePublic, AppError> {
        let user: (String, String) = sqlx::query_as(
            "SELECT username, display_name FROM users WHERE id = $1"
        )
        .bind(msg.user_id)
        .fetch_optional(&self.pool)
        .await?
        .unwrap_or_else(|| ("unknown".to_string(), "Unknown".to_string()));

        let avatar_letter = user.1.chars().next().unwrap_or('?').to_string();

        Ok(ChatMessagePublic {
            id: msg.id,
            space_id: msg.space_id,
            user_id: msg.user_id,
            username: user.0,
            display_name: user.1,
            avatar_letter,
            content: msg.content,
            message_type: msg.message_type,
            created_at: msg.created_at,
        })
    }
}

fn json_ok(data: serde_json::Value) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "code": 0, "data": data, "message": "success" }))
}

/// POST /api/spaces/{ns}/chat — 发送聊天消息
pub async fn send_chat_message_route(
    axum::extract::State(handler): axum::extract::State<std::sync::Arc<ChatHandler>>,
    axum::extract::Extension(uid): axum::extract::Extension<Uuid>,
    axum::extract::Path(ns): axum::extract::Path<String>,
    axum::Json(body): axum::Json<SendMessageBody>,
) -> Result<axum::Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&handler.pool, &ns).await?;
    let msg = handler.send_message(space_id, uid, &body.content).await?;
    Ok(json_ok(serde_json::to_value(&msg).unwrap_or_default()))
}

/// GET /api/spaces/{ns}/chat — 获取聊天消息列表
pub async fn list_chat_messages_route(
    axum::extract::State(handler): axum::extract::State<std::sync::Arc<ChatHandler>>,
    axum::extract::Path(ns): axum::extract::Path<String>,
    axum::extract::Query(params): axum::extract::Query<ChatQueryParams>,
) -> Result<axum::Json<serde_json::Value>, AppError> {
    let space_id = resolve_space_id(&handler.pool, &ns).await?;
    let msgs = handler.list_messages(space_id, params.limit.unwrap_or(50)).await?;
    Ok(json_ok(serde_json::to_value(&msgs).unwrap_or_default()))
}

#[derive(Deserialize)]
pub struct SendMessageBody {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ChatQueryParams {
    pub limit: Option<u32>,
}
