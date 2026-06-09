use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::PayServiceConfig;

/// 交易类型
pub enum TxType {
    Tip,          // 打赏
    Subscription, // 订阅
    Purchase,     // 购买
    Course,       // 课程
    Withdrawal,   // 提现
}

impl TxType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Tip => "tip",
            Self::Subscription => "subscription",
            Self::Purchase => "purchase",
            Self::Course => "course",
            Self::Withdrawal => "withdrawal",
        }
    }
}

/// 支付处理器
pub struct PayHandler {
    pool: PgPool,
    config: PayServiceConfig,
    nats: Option<async_nats::Client>,
}

impl PayHandler {
    pub fn new(pool: PgPool, config: PayServiceConfig, nats: Option<async_nats::Client>) -> Self {
        Self { pool, config, nats }
    }

    /// 创建打赏交易
    pub async fn create_tip(
        &self,
        from_user_id: Uuid,
        to_user_id: Uuid,
        amount_cents: i64,
        provider: &str,
    ) -> Result<serde_json::Value, AppError> {
        if amount_cents <= 0 {
            return Err(AppError::validation("Amount must be positive".to_string()));
        }

        let tx_id: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO transactions (from_user_id, to_user_id, amount_cents, tx_type, status, provider)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            "#,
        )
        .bind(from_user_id)
        .bind(to_user_id)
        .bind(amount_cents)
        .bind(TxType::Tip.as_str())
        .bind("pending")
        .bind(provider)
        .fetch_one(&self.pool)
        .await?;

        // 计算平台抽成和用户实际收款
        let platform_fee = (amount_cents as f64 * self.config.platform_fee_percent / 100.0).round() as i64;
        let user_amount = amount_cents - platform_fee;

        let result = serde_json::json!({
            "id": tx_id.0,
            "amount_cents": amount_cents,
            "platform_fee_cents": platform_fee,
            "user_amount_cents": user_amount,
            "status": "pending",
            "tx_type": "tip",
        });

        // 发布支付事件
        self.publish_event(subjects::STORE_ORDER_CREATED, serde_json::json!({
            "transaction_id": tx_id.0,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "amount_cents": amount_cents,
            "tx_type": "tip",
        })).await;

        Ok(result)
    }

    /// 确认支付
    pub async fn confirm_payment(
        &self,
        tx_id: Uuid,
        provider_tx_id: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE transactions
            SET status = 'completed', provider_tx_id = $2
            WHERE id = $1 AND status = 'pending'
            "#,
        )
        .bind(tx_id)
        .bind(provider_tx_id)
        .execute(&self.pool)
        .await?;

        self.publish_event(subjects::PAYMENT_COMPLETED, serde_json::json!({
            "transaction_id": tx_id.to_string(),
            "provider_tx_id": provider_tx_id,
        })).await;

        Ok(())
    }

    /// 获取用户交易历史
    pub async fn get_transactions(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(t.*) FROM transactions t WHERE t.from_user_id = $1 OR t.to_user_id = $1 ORDER BY t.created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    async fn publish_event(&self, subject: &str, payload: serde_json::Value) {
        if let Some(ref nats) = self.nats {
            let event = Event {
                id: Uuid::new_v4().to_string(),
                subject: subject.to_string(),
                source: "pay-service".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
                payload,
            };
            if let Ok(data) = serde_json::to_vec(&event) {
                if let Err(e) = nats.publish(subject.to_string(), data.into()).await {
                    tracing::warn!("Failed to publish event {}: {}", subject, e);
                }
            }
        }
    }
}
