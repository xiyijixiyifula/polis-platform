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

    /// Get leaderboard entries filtered by time period.
    ///
    /// # SQL injection safety
    /// Column names are selected via `match` on the `period` parameter so that only
    /// hard-coded, whitelisted identifiers reach the query string. No user-supplied
    /// text is ever interpolated into SQL identifiers or expressions.
    pub async fn get_tip_leaderboard(
        &self,
        period: &str,
        limit: i64,
    ) -> Result<Vec<(Uuid, i64, i32)>, AppError> {
        // Use match to produce fully static SQL — no format! column interpolation.
        let rows: Vec<(Uuid, i64, i32)> = match period {
            "weekly" => {
                sqlx::query_as(
                    "SELECT user_id, weekly_amount as amount, weekly_amount \
                     FROM tip_leaderboard ORDER BY weekly_amount DESC LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
            "monthly" => {
                sqlx::query_as(
                    "SELECT user_id, monthly_amount as amount, monthly_amount \
                     FROM tip_leaderboard ORDER BY monthly_amount DESC LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
            _ => {
                sqlx::query_as(
                    "SELECT user_id, all_time_amount as amount, all_time_amount \
                     FROM tip_leaderboard ORDER BY all_time_amount DESC LIMIT $1",
                )
                .bind(limit)
                .fetch_all(&*self.pool)
                .await?
            }
        };
        Ok(rows)
    }
}
