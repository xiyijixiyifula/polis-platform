use std::sync::Arc;
use polis_core::error::AppError;
use polis_core::models::{
    CreateWebhookRequest, UpdateWebhookRequest, Webhook, WebhookDelivery, Pagination,
};
use sqlx::PgPool;
use uuid::Uuid;

/// Webhook 事件分发器（用于在业务操作后异步触发推送）
pub struct WebhookDispatcher {
    pool: PgPool,
}

impl WebhookDispatcher {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 异步触发事件推送（不阻塞主请求）
    pub fn dispatch(&self, event_type: &str, payload: serde_json::Value, space_id: Option<Uuid>) {
        let pool = self.pool.clone();
        let event = event_type.to_string();
        let payload_str = payload;

        tokio::spawn(async move {
            // 查找匹配的 webhook 订阅
            let webhooks = match Self::find_matching(&pool, &event, space_id).await {
                Ok(w) => w,
                Err(_) => return,
            };

            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_default();

            for wh in webhooks {
                Self::deliver(&pool, &client, &wh, &event, &payload_str).await;
            }
        });
    }

    async fn find_matching(
        pool: &PgPool,
        event_type: &str,
        space_id: Option<Uuid>,
    ) -> Result<Vec<Webhook>, sqlx::Error> {
        let event_json = serde_json::json!([event_type]);
        match space_id {
            Some(sid) => {
                sqlx::query_as::<_, Webhook>(
                    "SELECT * FROM webhooks WHERE is_active = TRUE AND (space_id = $1 OR space_id IS NULL) AND events @> $2",
                )
                .bind(sid)
                .bind(&event_json)
                .fetch_all(pool)
                .await
            }
            None => {
                sqlx::query_as::<_, Webhook>(
                    "SELECT * FROM webhooks WHERE is_active = TRUE AND events @> $1",
                )
                .bind(&event_json)
                .fetch_all(pool)
                .await
            }
        }
    }

    async fn deliver(
        pool: &PgPool,
        client: &reqwest::Client,
        wh: &Webhook,
        event_type: &str,
        payload: &serde_json::Value,
    ) {
        let start = std::time::Instant::now();
        let event_payload = serde_json::json!({
            "event": event_type,
            "webhook_id": wh.id,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "data": payload,
        });

        // 构建请求
        let mut req = client.post(&wh.url).json(&event_payload);

        // 添加 HMAC 签名
        if let Some(ref secret) = wh.secret {
            use hmac::{Hmac, Mac};
            use sha2::Sha256;
            let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
            mac.update(&serde_json::to_vec(&event_payload).unwrap_or_default());
            let signature = hex::encode(mac.finalize().into_bytes());
            req = req.header("X-Polis-Signature", signature);
        }

        req = req.header("X-Polis-Event", event_type);

        let result = req.send().await;
        let duration_ms = start.elapsed().as_millis() as i32;

        let (status_code, response_body, error_message) = match result {
            Ok(resp) => {
                let code = resp.status().as_u16() as i32;
                let body = resp.text().await.unwrap_or_default();
                let err = if code >= 400 { Some(format!("HTTP {}", code)) } else { None };
                (Some(code), Some(body), err)
            }
            Err(e) => (None, None, Some(e.to_string())),
        };

        // 记录推送日志
        let _ = sqlx::query(
            "INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status_code, response_body, error_message, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(wh.id)
        .bind(event_type)
        .bind(payload)
        .bind(status_code)
        .bind(response_body.as_deref())
        .bind(error_message.as_deref())
        .bind(duration_ms)
        .execute(pool)
        .await;

        // 更新 webhook 状态
        let _ = sqlx::query(
            "UPDATE webhooks SET last_delivery_at = NOW(), last_delivery_status = $1, delivery_count = delivery_count + 1, updated_at = NOW() WHERE id = $2",
        )
        .bind(status_code)
        .bind(wh.id)
        .execute(pool)
        .await;
    }
}

/// Webhook CRUD Handler
pub struct WebhookHandler {
    pool: PgPool,
    dispatcher: Arc<WebhookDispatcher>,
}

impl WebhookHandler {
    pub fn new(pool: PgPool) -> Self {
        let dispatcher = Arc::new(WebhookDispatcher::new(pool.clone()));
        Self { pool, dispatcher }
    }

    pub fn dispatcher(&self) -> Arc<WebhookDispatcher> {
        self.dispatcher.clone()
    }

    /// 创建订阅
    pub async fn create(
        &self,
        user_id: Uuid,
        req: CreateWebhookRequest,
    ) -> Result<Webhook, AppError> {
        let events = serde_json::to_value(req.events).unwrap_or_default();
        let wh = sqlx::query_as::<_, Webhook>(
            r#"INSERT INTO webhooks (user_id, space_id, events, url, secret)
               VALUES ($1, $2, $3, $4, $5) RETURNING *"#,
        )
        .bind(user_id)
        .bind(req.space_id)
        .bind(&events)
        .bind(&req.url)
        .bind(req.secret.as_deref())
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(wh)
    }

    /// 列出我的订阅
    pub async fn list(
        &self,
        user_id: Uuid,
        space_id: Option<Uuid>,
    ) -> Result<Vec<Webhook>, AppError> {
        let webhooks = match space_id {
            Some(sid) => {
                sqlx::query_as::<_, Webhook>(
                    "SELECT * FROM webhooks WHERE user_id = $1 AND space_id = $2 ORDER BY created_at DESC",
                )
                .bind(user_id)
                .bind(sid)
                .fetch_all(&self.pool)
                .await
            }
            None => {
                sqlx::query_as::<_, Webhook>(
                    "SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC",
                )
                .bind(user_id)
                .fetch_all(&self.pool)
                .await
            }
        }
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(webhooks)
    }

    /// 更新订阅
    pub async fn update(
        &self,
        id: Uuid,
        user_id: Uuid,
        req: UpdateWebhookRequest,
    ) -> Result<Webhook, AppError> {
        // 验证所有权
        let owner: Option<(Uuid,)> = sqlx::query_as(
            "SELECT user_id FROM webhooks WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if owner.is_none() {
            return Err(AppError::Forbidden("无权操作此 Webhook".to_string()));
        }

        // 使用 COALESCE 实现部分更新
        let events = req.events.map(|e| serde_json::to_value(e).unwrap_or_default());
        let wh = sqlx::query_as::<_, Webhook>(
            r#"UPDATE webhooks SET
               events = COALESCE($1, events),
               url = COALESCE($2, url),
               secret = COALESCE($3, secret),
               is_active = COALESCE($4, is_active),
               updated_at = NOW()
               WHERE id = $5 RETURNING *"#,
        )
        .bind(events.as_ref())
        .bind(req.url.as_deref())
        .bind(req.secret.as_deref())
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(wh)
    }

    /// 删除订阅
    pub async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM webhooks WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Webhook 不存在".to_string()));
        }
        Ok(())
    }

    /// 获取推送日志
    pub async fn deliveries(
        &self,
        webhook_id: Uuid,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<WebhookDelivery>, Pagination), AppError> {
        // 验证所有权
        let _owner: (Uuid,) = sqlx::query_as(
            "SELECT user_id FROM webhooks WHERE id = $1 AND user_id = $2",
        )
        .bind(webhook_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("Webhook 不存在".to_string()))?;

        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = $1",
        )
        .bind(webhook_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let deliveries = sqlx::query_as::<_, WebhookDelivery>(
            "SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(webhook_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let total_pages = (total.0 as f64 / page_size as f64).ceil() as u32;
        Ok((deliveries, Pagination { page, page_size, total: total.0 as u64, total_pages }))
    }
}
