use polis_core::error::AppError;
use polis_core::models::{User, UserPublic};
use sqlx::PgPool;
use uuid::Uuid;

/// 用户数据访问层
pub struct UserRepo {
    pub pool: PgPool,
}

impl UserRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 根据邮箱查找用户
    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 根据用户名查找用户
    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 根据 ID 查找用户
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    /// 创建用户
    pub async fn create(
        &self,
        username: &str,
        display_name: &str,
        email: &str,
        password_hash: &str,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (username, display_name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(username)
        .bind(display_name)
        .bind(email)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    /// 更新用户资料
    pub async fn update_profile(
        &self,
        user_id: Uuid,
        display_name: Option<&str>,
        avatar_url: Option<&str>,
        bio: Option<&str>,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET display_name = COALESCE($2, display_name),
                avatar_url = COALESCE($3, avatar_url),
                bio = COALESCE($4, bio),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(display_name)
        .bind(avatar_url)
        .bind(bio)
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    /// 获取用户的社区列表
    pub async fn find_user_spaces(&self, user_id: Uuid) -> Result<Vec<Uuid>, AppError> {
        let rows: Vec<(Uuid,)> = sqlx::query_as(
            "SELECT space_id FROM memberships WHERE user_id = $1 AND role != 'banned'",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
}
