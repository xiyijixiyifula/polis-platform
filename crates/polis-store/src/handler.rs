use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

pub struct StoreHandler {
    pub(crate) pool: PgPool,
}

impl StoreHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 上架商品
    pub async fn create_product(
        &self,
        space_id: Uuid,
        seller_id: Uuid,
        title: &str,
        description: &str,
        price_cents: i64,
        currency: &str,
        stock: i32,
    ) -> Result<serde_json::Value, AppError> {
        if price_cents <= 0 {
            return Err(AppError::Validation("Price must be positive".to_string()));
        }

        let product_id: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO products (space_id, seller_id, title, description, price_cents, currency, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#,
        )
        .bind(space_id)
        .bind(seller_id)
        .bind(title)
        .bind(description)
        .bind(price_cents)
        .bind(currency)
        .bind(stock)
        .fetch_one(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "id": product_id.0,
            "title": title,
            "price_cents": price_cents,
            "currency": currency,
            "stock": stock,
            "status": "active",
        }))
    }

    /// 创建订单（买家购买）
    pub async fn create_order(
        &self,
        product_id: Uuid,
        buyer_id: Uuid,
    ) -> Result<serde_json::Value, AppError> {
        // 获取商品信息
        let product: Option<(Uuid, i64, i32)> = sqlx::query_as(
            "SELECT seller_id, price_cents, stock FROM products WHERE id = $1 AND status = 'active'",
        )
        .bind(product_id)
        .fetch_optional(&self.pool)
        .await?;

        let (seller_id, amount_cents, stock) = product
            .ok_or(AppError::NotFound("Product not found or inactive".to_string()))?;

        if stock <= 0 {
            return Err(AppError::Validation("Product out of stock".to_string()));
        }

        // 扣减库存
        sqlx::query("UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0")
            .bind(product_id)
            .execute(&self.pool)
            .await?;

        // 创建订单
        let order_id: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO orders (product_id, buyer_id, seller_id, amount_cents, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id
            "#,
        )
        .bind(product_id)
        .bind(buyer_id)
        .bind(seller_id)
        .bind(amount_cents)
        .fetch_one(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "id": order_id.0,
            "product_id": product_id,
            "amount_cents": amount_cents,
            "status": "pending",
        }))
    }

    /// 获取社区商品列表
    pub async fn list_products(
        &self,
        space_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(p.*) FROM products p WHERE p.space_id = $1 AND p.status = 'active' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(space_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取用户订单
    pub async fn list_orders(
        &self,
        user_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            "SELECT row_to_json(o.*) FROM orders o WHERE o.buyer_id = $1 OR o.seller_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
