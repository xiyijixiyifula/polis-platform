use polis_core::error::AppError;
use polis_core::models::Tip;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct TipRepo {
    pool: Arc<PgPool>,
}

impl TipRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn create_tip(
        &self,
        sender_id: Uuid,
        receiver_id: Uuid,
        target_type: &str,
        target_id: Uuid,
        amount: i32,
        message: Option<&str>,
        is_anonymous: bool,
    ) -> Result<Tip, AppError> {
        sqlx::query_as::<_, Tip>(
            "INSERT INTO tips (sender_id, receiver_id, target_type, target_id, amount, message, is_anonymous) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        )
        .bind(sender_id)
        .bind(receiver_id)
        .bind(target_type)
        .bind(target_id)
        .bind(amount)
        .bind(message)
        .bind(is_anonymous)
        .fetch_one(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn get_tips_received(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<Tip>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        sqlx::query_as::<_, Tip>(
            "SELECT * FROM tips WHERE receiver_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(page_size as i64)
        .bind(offset)
        .fetch_all(&*self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn get_tip_leaderboard(
        &self,
        period: &str,
        limit: i64,
    ) -> Result<Vec<(Uuid, i64, i32)>, AppError> {
        let col = match period {
            "weekly" => "weekly_amount",
            "monthly" => "monthly_amount",
            _ => "all_time_amount",
        };
        let query = format!(
            "SELECT user_id, {} as amount, {} FROM tip_leaderboard ORDER BY {} DESC LIMIT $1",
            col, col, col
        );
        let rows: Vec<(Uuid, i64, i32)> =
            sqlx::query_as(&query).bind(limit).fetch_all(&*self.pool).await?;
        Ok(rows)
    }
}
