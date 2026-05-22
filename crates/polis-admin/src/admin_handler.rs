//! 管理后台业务处理器
use polis_core::admin::*;
use polis_core::error::AppError;
use sqlx::PgPool;
use std::fs;
use std::sync::RwLock;
use uuid::Uuid;

use crate::config::AdminConfig;
use crate::stats;

const ADMIN_CODE_FILE: &str = "/root/polis/admin_code.txt";

/// 启动时从文件读取 admin_code，文件不存在则用环境变量
fn load_admin_code(env_code: &str) -> String {
    fs::read_to_string(ADMIN_CODE_FILE)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| env_code.to_string())
}

pub struct AdminHandler {
    pub pool: PgPool,
    pub config: AdminConfig,
    pub admin_code: RwLock<String>,
}

impl AdminHandler {
    pub fn new(pool: PgPool, config: AdminConfig) -> Self {
        let admin_code = load_admin_code(&config.admin_code);
        // 确保文件存在
        let _ = fs::write(ADMIN_CODE_FILE, &admin_code);
        Self { pool, config, admin_code: RwLock::new(admin_code) }
    }

    /// 获取当前 admin_code
    pub fn get_admin_code(&self) -> String {
        self.admin_code.read().map(|s| s.clone()).unwrap_or_default()
    }

    /// 更新 admin_code 并持久化到文件
    pub fn update_admin_code(&self, new_code: &str) -> Result<(), AppError> {
        if new_code.len() < 8 {
            return Err(AppError::Validation("Admin code must be at least 8 characters".to_string()));
        }
        // 写入文件持久化
        fs::write(ADMIN_CODE_FILE, new_code)
            .map_err(|e| AppError::Internal(format!("Failed to save admin code: {}", e)))?;
        // 更新内存
        let mut code = self.admin_code.write().map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
        *code = new_code.to_string();
        tracing::info!("Admin code updated and persisted");
        Ok(())
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

    /// 获取举报列表
    pub async fn get_reports(&self, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM reports")
            .fetch_one(&self.pool).await?;

        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', r.id,
                'reporter_id', r.reporter_id,
                'reporter_username', ru.username,
                'target_type', r.target_type,
                'target_id', r.target_id,
                'reason', r.reason,
                'status', r.status,
                'created_at', r.created_at,
                'resolved_at', r.resolved_at
            ) FROM reports r
            LEFT JOIN users ru ON r.reporter_id = ru.id
            ORDER BY r.created_at DESC LIMIT $1 OFFSET $2"#
        )
        .bind(limit).bind(offset)
        .fetch_all(&self.pool).await?;

        Ok((rows.into_iter().map(|r| r.0).collect(), total.0))
    }

    /// 处理举报
    pub async fn resolve_report(&self, report_id: Uuid, action: &str, handled_by: Uuid) -> Result<(), AppError> {
        let new_status = match action {
            "resolve" => "resolved",
            "dismiss" => "dismissed",
            _ => return Err(AppError::Validation("Invalid action".to_string())),
        };
        sqlx::query("UPDATE reports SET status = $1, handled_by = $2, resolved_at = NOW() WHERE id = $3")
            .bind(new_status).bind(handled_by).bind(report_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    /// 获取仪表盘数据
    pub async fn get_dashboard(&self) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let row = sqlx::query(
            r#"SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM spaces WHERE status = 'active') as total_spaces,
                (SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE) as total_posts,
                (SELECT COUNT(*) FROM comments WHERE is_deleted = FALSE) as total_comments,
                (SELECT COUNT(*) FROM transactions) as total_transactions,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day') as new_users_today,
                (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '1 day') as new_posts_today,
                (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '1 day') as active_users_today,
                (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
                (SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE AND created_at > NOW() - INTERVAL '7 days') as recent_posts_7d,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d"#
        ).fetch_one(&self.pool).await?;

        Ok(serde_json::json!({
            "total_users": row.get::<i64, _>("total_users"),
            "total_spaces": row.get::<i64, _>("total_spaces"),
            "total_posts": row.get::<i64, _>("total_posts"),
            "total_comments": row.get::<i64, _>("total_comments"),
            "total_transactions": row.get::<i64, _>("total_transactions"),
            "new_users_today": row.get::<i64, _>("new_users_today"),
            "new_posts_today": row.get::<i64, _>("new_posts_today"),
            "active_users_today": row.get::<i64, _>("active_users_today"),
            "pending_reports": row.get::<i64, _>("pending_reports"),
            "recent_posts_7d": row.get::<i64, _>("recent_posts_7d"),
            "new_users_7d": row.get::<i64, _>("new_users_7d"),
        }))
    }


    /// 获取单个用户详情
    pub async fn get_user_detail(&self, user_id: Uuid) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let row = sqlx::query(
            "SELECT id, username, display_name, CONCAT(LEFT(email, 3), '***', SUBSTRING(email FROM POSITION('@' IN email))) as email, bio, verified, verified_type, created_at, updated_at FROM users WHERE id = $1"
        ).bind(user_id).fetch_optional(&self.pool).await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;

        Ok(serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "username": row.get::<String, _>("username"),
            "display_name": row.get::<String, _>("display_name"),
            "email": row.get::<String, _>("email"),
            "bio": row.get::<String, _>("bio"),
            "verified": row.get::<bool, _>("verified"),
            "verified_type": row.get::<Option<String>, _>("verified_type"),
            "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
        }))
    }

    /// 获取单个社区详情
    pub async fn get_space_detail(&self, space_id: Uuid) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let row = sqlx::query(
            "SELECT s.id, s.namespace, s.slug, s.owner_id, u.username as owner_username, u.display_name as owner_display_name, s.is_root, s.root_space_id, s.title, s.description, s.icon_url, s.banner_url, s.visibility, s.status, s.enabled_modules, s.member_count, s.post_count, s.created_at, s.updated_at FROM spaces s LEFT JOIN users u ON s.owner_id = u.id WHERE s.id = $1"
        ).bind(space_id).fetch_optional(&self.pool).await?
        .ok_or(AppError::NotFound("Space not found".to_string()))?;

        Ok(serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "namespace": row.get::<String, _>("namespace"),
            "slug": row.get::<String, _>("slug"),
            "owner_id": row.get::<Option<Uuid>, _>("owner_id"),
            "owner_username": row.get::<Option<String>, _>("owner_username"),
            "owner_display_name": row.get::<Option<String>, _>("owner_display_name"),
            "is_root": row.get::<bool, _>("is_root"),
            "root_space_id": row.get::<Option<Uuid>, _>("root_space_id"),
            "title": row.get::<String, _>("title"),
            "description": row.get::<Option<String>, _>("description"),
            "icon_url": row.get::<Option<String>, _>("icon_url"),
            "banner_url": row.get::<Option<String>, _>("banner_url"),
            "visibility": row.get::<Option<String>, _>("visibility"),
            "status": row.get::<Option<String>, _>("status"),
            "enabled_modules": row.get::<Option<serde_json::Value>, _>("enabled_modules"),
            "member_count": row.get::<i64, _>("member_count"),
            "post_count": row.get::<i64, _>("post_count"),
            "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
        }))
    }

    /// 获取单个帖子详情
    pub async fn get_post_detail(&self, post_id: Uuid) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let row = sqlx::query(
            "SELECT p.id, p.space_id, s.title as space_title, p.module_type, p.author_id, u.username as author_username, u.display_name as author_display_name, p.title, p.body, p.content_type, p.tags, p.visibility, p.is_pinned, p.is_featured, p.is_deleted, p.view_count, p.like_count, p.comment_count, p.created_at, p.updated_at FROM posts p LEFT JOIN spaces s ON p.space_id = s.id LEFT JOIN users u ON p.author_id = u.id WHERE p.id = $1"
        ).bind(post_id).fetch_optional(&self.pool).await?
        .ok_or(AppError::NotFound("Post not found".to_string()))?;

        Ok(serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "space_id": row.get::<Uuid, _>("space_id"),
            "space_title": row.get::<Option<String>, _>("space_title"),
            "module_type": row.get::<String, _>("module_type"),
            "author_id": row.get::<Uuid, _>("author_id"),
            "author_username": row.get::<Option<String>, _>("author_username"),
            "author_display_name": row.get::<Option<String>, _>("author_display_name"),
            "title": row.get::<String, _>("title"),
            "body": row.get::<Option<String>, _>("body"),
            "content_type": row.get::<Option<String>, _>("content_type"),
            "tags": row.get::<Option<serde_json::Value>, _>("tags"),
            "visibility": row.get::<Option<String>, _>("visibility"),
            "is_pinned": row.get::<bool, _>("is_pinned"),
            "is_featured": row.get::<bool, _>("is_featured"),
            "is_deleted": row.get::<bool, _>("is_deleted"),
            "view_count": row.get::<i64, _>("view_count"),
            "like_count": row.get::<i64, _>("like_count"),
            "comment_count": row.get::<i64, _>("comment_count"),
            "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
        }))
    }

    /// 修改社区状态
    pub async fn update_space_status(&self, space_id: Uuid, status: &str) -> Result<(), AppError> {
        let valid = matches!(status, "active" | "archived" | "hidden" | "closed");
        if !valid {
            return Err(AppError::Validation("Invalid status. Use: active, archived, hidden, closed".to_string()));
        }
        sqlx::query("UPDATE spaces SET status = $1, updated_at = NOW() WHERE id = $2")
            .bind(status).bind(space_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    /// 获取交易列表
    pub async fn get_transactions(&self, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM transactions").fetch_one(&self.pool).await?;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', t.id, 'from_user_id', t.from_user_id, 'from_username', fu.username,
                'to_user_id', t.to_user_id, 'to_username', tu.username,
                'to_space_id', t.to_space_id, 'space_title', s.title,
                'amount_cents', t.amount_cents, 'tx_type', t.tx_type,
                'status', t.status, 'provider', t.provider, 'created_at', t.created_at
            ) FROM transactions t
            LEFT JOIN users fu ON t.from_user_id = fu.id
            LEFT JOIN users tu ON t.to_user_id = tu.id
            LEFT JOIN spaces s ON t.to_space_id = s.id
            ORDER BY t.created_at DESC LIMIT $1 OFFSET $2"#
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        Ok((rows.into_iter().map(|r| r.0).collect(), total.0))
    }

    /// 获取评论列表
    pub async fn get_comments(&self, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM comments WHERE is_deleted = FALSE").fetch_one(&self.pool).await?;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', c.id, 'post_id', c.post_id, 'author_id', c.author_id,
                'author_username', u.username, 'body', c.body,
                'parent_id', c.parent_id, 'like_count', c.like_count,
                'is_deleted', c.is_deleted, 'created_at', c.created_at
            ) FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.is_deleted = FALSE
            ORDER BY c.created_at DESC LIMIT $1 OFFSET $2"#
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        Ok((rows.into_iter().map(|r| r.0).collect(), total.0))
    }

    /// 删除评论
    pub async fn delete_comment(&self, comment_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE comments SET is_deleted = TRUE WHERE id = $1")
            .bind(comment_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 用户增长趋势
    pub async fn get_user_analytics(&self, days: i32) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'date', d::date, 'count', COALESCE(cnt, 0)
            ) FROM generate_series(
                CURRENT_DATE - $1::int + 1, CURRENT_DATE, '1 day'::interval
            ) d
            LEFT JOIN (
                SELECT DATE(created_at) as dt, COUNT(*) as cnt
                FROM users WHERE created_at > CURRENT_DATE - $1
                GROUP BY DATE(created_at)
            ) u ON d::date = u.dt
            ORDER BY d"#
        ).bind(days).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 帖子增长趋势
    pub async fn get_post_analytics(&self, days: i32) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'date', d::date, 'count', COALESCE(cnt, 0)
            ) FROM generate_series(
                CURRENT_DATE - $1::int + 1, CURRENT_DATE, '1 day'::interval
            ) d
            LEFT JOIN (
                SELECT DATE(created_at) as dt, COUNT(*) as cnt
                FROM posts WHERE is_deleted = FALSE AND created_at > CURRENT_DATE - $1
                GROUP BY DATE(created_at)
            ) p ON d::date = p.dt
            ORDER BY d"#
        ).bind(days).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

}