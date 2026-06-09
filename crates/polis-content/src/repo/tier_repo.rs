use polis_core::error::AppError;
use polis_core::models::{SpaceTier, Subscription};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct TierRepo {
    pool: Arc<PgPool>,
}

impl TierRepo {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn list_tiers(&self, space_id: Uuid) -> Result<Vec<SpaceTier>, AppError> {
        let tiers = sqlx::query_as::<_, SpaceTier>(
            "SELECT * FROM space_tiers WHERE space_id = $1 AND is_active = TRUE ORDER BY sort_order",
        )
        .bind(space_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(tiers)
    }

    pub async fn get_tier(&self, tier_id: Uuid) -> Result<SpaceTier, AppError> {
        let tier = sqlx::query_as::<_, SpaceTier>("SELECT * FROM space_tiers WHERE id = $1")
            .bind(tier_id)
            .fetch_one(&*self.pool)
            .await?;
        Ok(tier)
    }

    pub async fn create_tier(
        &self,
        space_id: Uuid,
        name: &str,
        price_cents: i64,
        currency: &str,
        description: &str,
        benefits: &serde_json::Value,
        sort_order: i32,
    ) -> Result<Uuid, AppError> {
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO space_tiers (space_id, name, price_cents, currency, description, benefits, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        )
        .bind(space_id)
        .bind(name)
        .bind(price_cents)
        .bind(currency)
        .bind(description)
        .bind(benefits)
        .bind(sort_order)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn update_tier(
        &self,
        tier_id: Uuid,
        space_id: Uuid,
        name: Option<&str>,
        price_cents: Option<i64>,
        description: Option<&str>,
        benefits: Option<&serde_json::Value>,
        sort_order: Option<i32>,
        is_active: Option<bool>,
    ) -> Result<(), AppError> {
        let current = self.get_tier(tier_id).await?;
        if current.space_id != space_id {
            return Err(AppError::forbidden(
                "Tier does not belong to this space".to_string(),
            ));
        }
        let name = name.unwrap_or(&current.name);
        let price_cents = price_cents.unwrap_or(current.price_cents);
        let description = description.unwrap_or(&current.description);
        let benefits = benefits.unwrap_or(&current.benefits);
        let sort_order = sort_order.unwrap_or(current.sort_order);
        let is_active = is_active.unwrap_or(current.is_active);
        sqlx::query(
            "UPDATE space_tiers SET name=$1, price_cents=$2, description=$3, benefits=$4, sort_order=$5, is_active=$6, updated_at=NOW() WHERE id=$7",
        )
        .bind(name)
        .bind(price_cents)
        .bind(description)
        .bind(benefits)
        .bind(sort_order)
        .bind(is_active)
        .bind(tier_id)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_tier(
        &self,
        tier_id: Uuid,
        space_id: Uuid,
    ) -> Result<(), AppError> {
        let current = self.get_tier(tier_id).await?;
        if current.space_id != space_id {
            return Err(AppError::forbidden(
                "Tier does not belong to this space".to_string(),
            ));
        }
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM subscriptions WHERE tier_id = $1 AND status = 'active'",
        )
        .bind(tier_id)
        .fetch_one(&*self.pool)
        .await?;
        if count.0 > 0 {
            return Err(AppError::conflict(
                "Cannot delete tier with active subscriptions".to_string(),
            ));
        }
        sqlx::query("DELETE FROM space_tiers WHERE id = $1")
            .bind(tier_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn subscribe(
        &self,
        space_id: Uuid,
        user_id: Uuid,
        tier_id: Uuid,
    ) -> Result<Uuid, AppError> {
        let tier = self.get_tier(tier_id).await?;
        if tier.space_id != space_id {
            return Err(AppError::forbidden(
                "Tier does not belong to this space".to_string(),
            ));
        }
        let row: (Uuid,) = sqlx::query_as(
            "INSERT INTO subscriptions (space_id, user_id, tier_id, status, started_at) VALUES ($1, $2, $3, 'active', NOW()) ON CONFLICT (space_id, user_id, tier_id) WHERE status = 'active' DO UPDATE SET status = 'active', started_at = NOW(), updated_at = NOW() RETURNING id",
        )
        .bind(space_id)
        .bind(user_id)
        .bind(tier_id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn cancel_subscription(
        &self,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE space_id = $1 AND user_id = $2 AND status = 'active'",
        )
        .bind(space_id)
        .bind(user_id)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_user_subscription(
        &self,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Subscription>, AppError> {
        let sub = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE space_id = $1 AND user_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        )
        .bind(space_id)
        .bind(user_id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(sub)
    }
}
