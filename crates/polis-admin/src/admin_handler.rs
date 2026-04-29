//! 管理后台业务处理器
use polis_core::admin::*;
use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::AdminConfig;
use crate::stats;

pub struct AdminHandler {
    pub pool: PgPool,
    pub config: AdminConfig,
}

impl AdminHandler {
    pub fn new(pool: PgPool, config: AdminConfig) -> Self {
        Self { pool, config }
    }

    /// 获取平台统计
    pub async fn get_stats(&self) -> Result<PlatformStats, AppError> {
        stats::get_platform_stats(&self.pool).await
    }

    /// 获取用户列表
    pub async fn get_users(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        stats::list_users(&self.pool, page, page_size).await
    }

    /// 封禁用户
    pub async fn ban_user(&self, user_id: Uuid, reason: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET verified = FALSE, bio = CONCAT('[已封禁] ', $2) WHERE id = $1")
            .bind(user_id)
            .bind(reason)
            .execute(&self.pool)
            .await?;
        tracing::info!("Admin banned user {}: {}", user_id, reason);
        Ok(())
    }

    /// 解封用户
    pub async fn unban_user(&self, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET verified = TRUE WHERE id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 认证用户 (企业/个人)
    pub async fn verify_user(&self, user_id: Uuid, vtype: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET verified = TRUE, verified_type = $2 WHERE id = $1")
            .bind(user_id)
            .bind(vtype)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 获取社区列表
    pub async fn get_spaces(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        stats::list_spaces(&self.pool, page, page_size).await
    }

    /// 归档社区
    pub async fn archive_space(&self, space_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE spaces SET status = 'archived' WHERE id = $1")
            .bind(space_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 删除帖子
    pub async fn delete_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 标记精选
    pub async fn feature_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_featured = TRUE WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 取消精选
    pub async fn unfeature_post(&self, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_featured = FALSE WHERE id = $1")
            .bind(post_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
