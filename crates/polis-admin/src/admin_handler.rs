//! 管理后台业务处理器
//! 支持人类管理员 + AI Agent 管理员双通道
use polis_core::admin::*;
use polis_core::error::AppError;
use polis_core::models::{AuditLogQuery, ReviewQueueQuery, BatchReviewRequest, AgentAdminLoginRequest, CreateReviewRuleRequest, AgentReviewDecision};
use sqlx::PgPool;
use std::fs;
use std::sync::RwLock;
use uuid::Uuid;

use crate::config::AdminConfig;
use crate::stats;
use crate::audit::AuditLogger;

const ADMIN_CODE_FILE: &str = "/root/polis/admin_code.txt";

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
    pub audit: AuditLogger,
}

impl AdminHandler {
    pub fn new(pool: PgPool, config: AdminConfig) -> Self {
        let admin_code = load_admin_code(&config.admin_code);
        let _ = fs::write(ADMIN_CODE_FILE, &admin_code);
        let audit = AuditLogger::new(pool.clone());
        Self { pool, config, admin_code: RwLock::new(admin_code), audit }
    }

    pub fn get_admin_code(&self) -> String {
        self.admin_code.read().map(|s| s.clone()).unwrap_or_default()
    }

    pub fn update_admin_code(&self, new_code: &str) -> Result<(), AppError> {
        if new_code.len() < 8 {
            return Err(AppError::Validation("Admin code must be at least 8 characters".to_string()));
        }
        fs::write(ADMIN_CODE_FILE, new_code)
            .map_err(|e| AppError::Internal(format!("Failed to save admin code: {}", e)))?;
        let mut code = self.admin_code.write().map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
        *code = new_code.to_string();
        tracing::info!("Admin code updated and persisted");
        Ok(())
    }

    /// 记录审计日志的快捷方法
    async fn audit_log(&self, actor_id: Uuid, actor_type: &str, target_type: &str, target_id: Uuid, action: &str, old_state: Option<&str>, new_state: Option<&str>, reason: Option<&str>) {
        self.audit.log(actor_id, actor_type, target_type, target_id, action, old_state, new_state, reason).await;
    }

    // ==================== 统计分析 ====================

    pub async fn get_stats(&self) -> Result<PlatformStats, AppError> {
        stats::get_platform_stats(&self.pool).await
    }

    // ==================== 用户管理 ====================

    pub async fn get_users(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        stats::list_users(&self.pool, page, page_size).await
    }

    pub async fn ban_user(&self, admin_id: Uuid, user_id: Uuid, reason: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET banned = TRUE, banned_at = NOW(), ban_reason = $2, verified = FALSE WHERE id = $1")
            .bind(user_id).bind(reason).execute(&self.pool).await?;
        // 同时将该用户的所有作品设为 private
        let _ = sqlx::query("UPDATE creations SET visibility = 'private' WHERE creator_id = $1 AND visibility = 'public'")
            .bind(user_id).execute(&self.pool).await;
        // 将该用户的公开帖子隐藏
        let _ = sqlx::query("UPDATE posts SET visibility = 'hidden' WHERE author_id = $1 AND visibility = 'public' AND is_deleted = FALSE")
            .bind(user_id).execute(&self.pool).await;
        self.audit_log(admin_id, "admin", "user", user_id, "ban", Some("active"), Some("banned"), Some(reason)).await;
        tracing::info!("Admin {} banned user {}: {}", admin_id, user_id, reason);
        Ok(())
    }

    pub async fn unban_user(&self, admin_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET banned = FALSE, banned_at = NULL, ban_reason = NULL, verified = TRUE WHERE id = $1")
            .bind(user_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "user", user_id, "unban", Some("banned"), Some("active"), None).await;
        Ok(())
    }

    pub async fn verify_user(&self, user_id: Uuid, vtype: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET verified = TRUE, verified_type = $2 WHERE id = $1")
            .bind(user_id).bind(vtype).execute(&self.pool).await?;
        Ok(())
    }

    // ==================== 社区管理 ====================

    pub async fn get_spaces(&self, page: u32, page_size: u32) -> Result<Vec<serde_json::Value>, AppError> {
        stats::list_spaces(&self.pool, page, page_size).await
    }

    pub async fn archive_space(&self, admin_id: Uuid, space_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE spaces SET status = 'archived' WHERE id = $1")
            .bind(space_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "space", space_id, "archive", Some("active"), Some("archived"), None).await;
        Ok(())
    }

    // ==================== 帖子管理 ====================

    pub async fn delete_post(&self, admin_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "delete", Some("visible"), Some("deleted"), None).await;
        Ok(())
    }

    pub async fn feature_post(&self, admin_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_featured = TRUE WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "feature", Some("normal"), Some("featured"), None).await;
        Ok(())
    }

    pub async fn unfeature_post(&self, admin_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_featured = FALSE WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "unfeature", Some("featured"), Some("normal"), None).await;
        Ok(())
    }

    pub async fn approve_post(&self, admin_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = FALSE, visibility = 'public' WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "approve", Some("hidden"), Some("visible"), None).await;
        Ok(())
    }

    pub async fn reject_post(&self, admin_id: Uuid, post_id: Uuid, reason: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET is_deleted = TRUE, visibility = 'hidden' WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "reject", Some("visible"), Some("rejected"), Some(reason)).await;
        Ok(())
    }

    pub async fn hide_post(&self, admin_id: Uuid, post_id: Uuid, duration_hours: Option<i32>) -> Result<(), AppError> {
        if let Some(hours) = duration_hours {
            sqlx::query("UPDATE posts SET visibility = 'hidden', hidden_until = NOW() + ($1 || ' hours')::interval WHERE id = $2")
                .bind(hours).bind(post_id).execute(&self.pool).await?;
        } else {
            sqlx::query("UPDATE posts SET visibility = 'hidden' WHERE id = $1")
                .bind(post_id).execute(&self.pool).await?;
        }
        self.audit_log(admin_id, "admin", "post", post_id, "hide", Some("public"), Some("hidden"), None).await;
        Ok(())
    }

    pub async fn unhide_post(&self, admin_id: Uuid, post_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE posts SET visibility = 'public', hidden_until = NULL WHERE id = $1")
            .bind(post_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "post", post_id, "unhide", Some("hidden"), Some("public"), None).await;
        Ok(())
    }

    /// 隐藏用户所有公开作品和帖子（不解封，仅隐藏内容）
    pub async fn hide_user_works(&self, admin_id: Uuid, user_id: Uuid, reason: &str, duration_hours: Option<i32>) -> Result<serde_json::Value, AppError> {
        let creations_count = sqlx::query(
            "UPDATE creations SET visibility = 'private' WHERE creator_id = $1 AND visibility = 'public'"
        ).bind(user_id).execute(&self.pool).await?.rows_affected();

        let posts_count = if let Some(hours) = duration_hours {
            sqlx::query(
                "UPDATE posts SET visibility = 'hidden', hidden_until = NOW() + ($2 || ' hours')::interval WHERE author_id = $1 AND visibility = 'public' AND is_deleted = FALSE"
            ).bind(user_id).bind(hours).execute(&self.pool).await?.rows_affected()
        } else {
            sqlx::query(
                "UPDATE posts SET visibility = 'hidden' WHERE author_id = $1 AND visibility = 'public' AND is_deleted = FALSE"
            ).bind(user_id).execute(&self.pool).await?.rows_affected()
        };

        self.audit_log(admin_id, "admin", "user", user_id, "hide_works", Some("public"), Some("hidden"), Some(reason)).await;
        tracing::info!("Admin {} hid {} creations + {} posts of user {}: {}", admin_id, creations_count, posts_count, user_id, reason);

        Ok(serde_json::json!({
            "creations_hidden": creations_count,
            "posts_hidden": posts_count,
        }))
    }

    /// 将用户所有社区设为不公开
    pub async fn hide_user_spaces(&self, admin_id: Uuid, user_id: Uuid, reason: &str) -> Result<i64, AppError> {
        let count = sqlx::query(
            "UPDATE spaces SET visibility = 'private' WHERE owner_id = $1 AND visibility = 'public'"
        ).bind(user_id).execute(&self.pool).await?.rows_affected() as i64;

        self.audit_log(admin_id, "admin", "user", user_id, "hide_spaces", Some("public"), Some("private"), Some(reason)).await;
        tracing::info!("Admin {} hid {} spaces of user {}: {}", admin_id, count, user_id, reason);
        Ok(count)
    }

    // ==================== 举报管理 (增强版：联动审核) ====================

    pub async fn get_reports(&self, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM reports").fetch_one(&self.pool).await?;
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', r.id, 'reporter_id', r.reporter_id, 'reporter_username', ru.username,
                'target_type', r.target_type, 'target_id', r.target_id,
                'reason', r.reason, 'status', r.status,
                'created_at', r.created_at, 'resolved_at', r.resolved_at
            ) FROM reports r
            LEFT JOIN users ru ON r.reporter_id = ru.id
            ORDER BY r.created_at DESC LIMIT $1 OFFSET $2"#
        ).bind(limit).bind(offset).fetch_all(&self.pool).await?;
        Ok((rows.into_iter().map(|r| r.0).collect(), total.0))
    }

    /// 处理举报 — 增强版：支持联动审核目标
    pub async fn resolve_report_with_action(
        &self,
        report_id: Uuid,
        action: &str,
        target_action: Option<&str>,
        target_action_reason: Option<&str>,
        handled_by: Uuid,
        actor_type: &str,
    ) -> Result<serde_json::Value, AppError> {
        let new_status = match action {
            "resolve" => "resolved",
            "dismiss" => "dismissed",
            _ => return Err(AppError::Validation("Invalid action".to_string())),
        };
        sqlx::query("UPDATE reports SET status = $1, handled_by = $2, resolved_at = NOW() WHERE id = $3")
            .bind(new_status).bind(handled_by).bind(report_id)
            .execute(&self.pool).await?;

        self.audit_log(handled_by, actor_type, "report", report_id, action, Some("pending"), Some(new_status), None).await;

        // 举报联动审核：自动对被举报目标执行操作
        let mut linked_actions: Vec<String> = Vec::new();
        if let Some(ta) = target_action {
            // 获取被举报目标的类型和 ID
            let report_target: Option<(String, Uuid)> = sqlx::query_as(
                "SELECT target_type, target_id FROM reports WHERE id = $1"
            ).bind(report_id).fetch_optional(&self.pool).await?;

            if let Some((target_type, target_id)) = report_target {
                let reason = target_action_reason.unwrap_or("举报联动处理");
                match (target_type.as_str(), ta) {
                    ("post", "hide") => {
                        self.hide_post(handled_by, target_id, None).await?;
                        linked_actions.push("post.hide".to_string());
                    }
                    ("post", "delete") => {
                        self.delete_post(handled_by, target_id).await?;
                        linked_actions.push("post.delete".to_string());
                    }
                    ("post", "approve") => {
                        self.approve_post(handled_by, target_id).await?;
                        linked_actions.push("post.approve".to_string());
                    }
                    ("post", "reject") => {
                        self.reject_post(handled_by, target_id, reason).await?;
                        linked_actions.push("post.reject".to_string());
                    }
                    ("user", "ban") => {
                        self.ban_user(handled_by, target_id, reason).await?;
                        linked_actions.push("user.ban".to_string());
                    }
                    ("user", "unban") => {
                        self.unban_user(handled_by, target_id).await?;
                        linked_actions.push("user.unban".to_string());
                    }
                    ("appeal", "unban") => {
                        self.unban_user(handled_by, target_id).await?;
                        linked_actions.push("user.unban".to_string());
                    }
                    ("comment", "delete") => {
                        sqlx::query("UPDATE comments SET is_deleted = TRUE WHERE id = $1")
                            .bind(target_id).execute(&self.pool).await?;
                        self.audit_log(handled_by, actor_type, "comment", target_id, "delete", Some("visible"), Some("deleted"), Some(reason)).await;
                        linked_actions.push("comment.delete".to_string());
                    }
                    _ => {
                        linked_actions.push(format!("{}._noop", target_type));
                    }
                }
            }
        }

        Ok(serde_json::json!({
            "report_id": report_id,
            "status": new_status,
            "linked_actions": linked_actions,
        }))
    }

    // ==================== 审核队列 ====================

    pub async fn get_review_queue(&self, query: ReviewQueueQuery) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let (items, total) = self.audit.review_queue(
            query.status.as_deref(),
            query.r#type.as_deref(),
            query.page.unwrap_or(1),
            query.page_size.unwrap_or(50),
        ).await?;
        Ok((items, total))
    }

    // ==================== 批量审核 ====================

    pub async fn batch_review(&self, admin_id: Uuid, actor_type: &str, req: BatchReviewRequest) -> Result<serde_json::Value, AppError> {
        let mut results = Vec::new();
        for item in &req.items {
            let result = match (item.target_type.as_str(), req.action.as_str()) {
                ("post", "approve") => {
                    self.approve_post(admin_id, item.target_id).await.map(|_| "approved").unwrap_or("error").to_string()
                }
                ("post", "reject") => {
                    self.reject_post(admin_id, item.target_id, req.reason.as_deref().unwrap_or("批量审核")).await.map(|_| "rejected").unwrap_or("error").to_string()
                }
                ("post", "hide") => {
                    self.hide_post(admin_id, item.target_id, None).await.map(|_| "hidden").unwrap_or("error").to_string()
                }
                ("post", "delete") => {
                    self.delete_post(admin_id, item.target_id).await.map(|_| "deleted").unwrap_or("error").to_string()
                }
                ("comment", "delete") => {
                    sqlx::query("UPDATE comments SET is_deleted = TRUE WHERE id = $1")
                        .bind(item.target_id).execute(&self.pool).await
                        .map(|_| "deleted").unwrap_or("error").to_string()
                }
                _ => "unknown_target_type".to_string(),
            };
            results.push(serde_json::json!({
                "target_type": item.target_type,
                "target_id": item.target_id,
                "result": result,
            }));
        }

        self.audit_log(admin_id, actor_type, "system", Uuid::nil(), "batch_review", None, None, Some(&format!("{} items, action={}", req.items.len(), req.action))).await;

        Ok(serde_json::json!({
            "total": req.items.len(),
            "action": req.action,
            "results": results,
        }))
    }

    // ==================== Agent 管理员登录 ====================

    pub async fn agent_admin_login(&self, req: AgentAdminLoginRequest) -> Result<String, AppError> {
        // 验证 agent 的 admin_agents 权限
        let perm: Option<(Uuid, String, serde_json::Value)> = sqlx::query_as(
            r#"SELECT aa.agent_id, aa.role, aa.permissions FROM admin_agents aa
               WHERE aa.agent_id = $1 AND aa.is_active = TRUE"#
        ).bind(req.agent_id).fetch_optional(&self.pool).await?;

        let (agent_id, role, _permissions) = perm.ok_or(AppError::Forbidden("Agent 无管理员权限".to_string()))?;

        // 验证 API Key
        let agent: Option<(Uuid, String)> = sqlx::query_as(
            "SELECT user_id, api_key_hash FROM agents WHERE id = $1 AND is_active = TRUE"
        ).bind(agent_id).fetch_optional(&self.pool).await?;

        let (user_id, api_key_hash) = agent.ok_or(AppError::Forbidden("Agent 不存在".to_string()))?;

        let ak = req.api_key.clone();
        let hash = api_key_hash.clone();
        tokio::task::spawn_blocking(move || {
            use argon2::{Argon2, PasswordHash, PasswordVerifier};
            let parsed = PasswordHash::new(&hash).map_err(|_| AppError::Forbidden("认证失败".to_string()))?;
            Argon2::default().verify_password(ak.as_bytes(), &parsed)
                .map_err(|_| AppError::Forbidden("API Key 无效".to_string()))
        }).await.map_err(|e| AppError::Internal(e.to_string()))??;

        // 更新最后活跃
        let _ = sqlx::query("UPDATE agents SET last_active_at = NOW() WHERE id = $1")
            .bind(agent_id).execute(&self.pool).await;

        // 生成 admin JWT
        let token = crate::auth::generate_admin_token(user_id, &role, &self.config)
            .map_err(|e| AppError::Internal(format!("JWT: {}", e)))?;

        self.audit_log(user_id, "agent", "system", Uuid::nil(), "agent_admin_login", None, Some("logged_in"), None).await;

        Ok(token)
    }

    // ==================== 审核规则配置 ====================

    pub async fn create_review_rule(&self, admin_id: Uuid, req: CreateReviewRuleRequest) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let target_types = serde_json::to_value(req.target_types).unwrap_or_default();
        let row = sqlx::query(
            r#"INSERT INTO review_rules (name, description, rule_type, config, target_types, priority, is_active, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
               RETURNING id, name, rule_type, priority, created_at"#
        ).bind(&req.name).bind(req.description.as_deref()).bind(&req.rule_type)
         .bind(&req.config).bind(&target_types).bind(req.priority.unwrap_or(0)).bind(admin_id)
         .fetch_one(&self.pool).await?;

        let rule_id: Uuid = row.get("id");
        self.audit_log(admin_id, "admin", "system", rule_id, "create_review_rule", None, None, Some(&req.name)).await;

        Ok(serde_json::json!({
            "id": rule_id,
            "name": req.name,
            "rule_type": req.rule_type,
            "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        }))
    }

    pub async fn list_review_rules(&self) -> Result<Vec<serde_json::Value>, AppError> {
        use sqlx::Row;
        let rows = sqlx::query(
            "SELECT json_build_object('id', id, 'name', name, 'description', description, 'rule_type', rule_type, 'config', config, 'target_types', target_types, 'priority', priority, 'is_active', is_active, 'created_at', created_at) FROM review_rules ORDER BY priority DESC, created_at DESC"
        ).fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.get(0)).collect())
    }

    pub async fn toggle_review_rule(&self, rule_id: Uuid, is_active: bool) -> Result<(), AppError> {
        sqlx::query("UPDATE review_rules SET is_active = $1, updated_at = NOW() WHERE id = $2")
            .bind(is_active).bind(rule_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn update_review_rule(&self, admin_id: Uuid, rule_id: Uuid, req: CreateReviewRuleRequest) -> Result<(), AppError> {
        let target_types = serde_json::to_value(req.target_types).unwrap_or_default();
        sqlx::query(
            "UPDATE review_rules SET name=$1, description=$2, rule_type=$3, config=$4, target_types=$5, priority=$6, updated_at=NOW() WHERE id=$7"
        ).bind(&req.name).bind(req.description.as_deref()).bind(&req.rule_type)
         .bind(&req.config).bind(&target_types).bind(req.priority.unwrap_or(0)).bind(rule_id)
         .execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "system", rule_id, "update_review_rule", None, None, Some(&req.name)).await;
        Ok(())
    }

    pub async fn delete_review_rule(&self, admin_id: Uuid, rule_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM review_rules WHERE id = $1")
            .bind(rule_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "system", rule_id, "delete_review_rule", None, None, None).await;
        Ok(())
    }

    // ==================== 审计日志查询 ====================

    pub async fn get_audit_logs(&self, query: AuditLogQuery) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        let (items, total) = self.audit.query(
            query.actor_id, query.target_type.as_deref(), query.action.as_deref(),
            query.actor_type.as_deref(),
            query.page.unwrap_or(1), query.page_size.unwrap_or(50),
        ).await?;
        Ok((items, total))
    }

    // ==================== 社区引用全局审核（管理员直接管理跨社区引用） ====================

    pub async fn list_refs(&self, status: Option<&str>, page: u32, page_size: u32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        use sqlx::Row;
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let rows = sqlx::query(
            r#"SELECT json_build_object(
                'id', r.id, 'creation_id', r.creation_id, 'creator_id', r.creator_id,
                'creator_username', u.username,
                'space_id', r.space_id, 'space_title', s.title, 'space_namespace', s.namespace,
                'module_type', r.module_type, 'display_status', r.display_status,
                'is_pinned', r.is_pinned, 'created_at', r.created_at
            ) FROM community_module_refs r
            LEFT JOIN users u ON r.creator_id = u.id
            LEFT JOIN spaces s ON r.space_id = s.id
            WHERE (r.display_status = $1 OR $1 IS NULL)
            ORDER BY r.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(status).bind(limit).bind(offset).fetch_all(&self.pool).await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM community_module_refs WHERE (display_status = $1 OR $1 IS NULL)"
        ).bind(status).fetch_one(&self.pool).await?;

        Ok((rows.into_iter().map(|r| r.get(0)).collect(), total.0))
    }

    pub async fn review_ref(&self, admin_id: Uuid, ref_id: Uuid, action: &str) -> Result<(), AppError> {
        let new_status = match action {
            "approve" | "show" => "visible",
            "reject" => "rejected",
            "hide" => "hidden",
            _ => return Err(AppError::Validation("Invalid action for ref review".to_string())),
        };
        sqlx::query("UPDATE community_module_refs SET display_status = $1 WHERE id = $2")
            .bind(new_status).bind(ref_id).execute(&self.pool).await?;
        self.audit_log(admin_id, "admin", "ref", ref_id, action, None, Some(new_status), None).await;
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
            "SELECT id, username, display_name, CONCAT(LEFT(email, 3), '***', SUBSTRING(email FROM POSITION('@' IN email))) as email, bio, verified, verified_type, COALESCE(banned, FALSE) as banned, banned_at, ban_reason, created_at, updated_at FROM users WHERE id = $1"
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
            "banned": row.get::<Option<bool>, _>("banned").unwrap_or(false),
            "banned_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("banned_at"),
            "ban_reason": row.get::<Option<String>, _>("ban_reason"),
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

    // ==================== Agent 审查 API ====================

    /// 获取审查策略（供 Agent 读取）
    pub async fn get_agent_policy(&self) -> Result<serde_json::Value, AppError> {
        let rules = self.list_review_rules().await?;
        let active_rules: Vec<_> = rules.into_iter().filter(|r| {
            r.get("is_active").and_then(|v| v.as_bool()).unwrap_or(false)
        }).collect();

        Ok(serde_json::json!({
            "rules": active_rules,
            "violation_categories": {
                "nsfw": { "label": "色情/低俗内容", "first_level": "L1", "severe_level": "L4", "keywords": ["色情", "裸露", "性暗示"] },
                "violence": { "label": "暴力/恐怖内容", "first_level": "L2", "severe_level": "L4", "keywords": ["暴力", "恐怖", "威胁"] },
                "hate_speech": { "label": "仇恨言论", "first_level": "L2", "severe_level": "L3", "keywords": ["歧视", "种族", "仇恨"] },
                "spam": { "label": "垃圾信息", "first_level": "L1", "severe_level": "L3", "keywords": ["广告", "灌水", "刷屏"] },
                "illegal": { "label": "违法违规", "first_level": "L3", "severe_level": "L4", "keywords": ["诈骗", "赌博", "毒品", "侵权"] },
                "harassment": { "label": "骚扰/网络暴力", "first_level": "L1", "severe_level": "L3", "keywords": ["人肉", "网暴", "攻击"] }
            },
            "action_levels": {
                "L1": { "action": "hide", "duration_hours": 24, "ban": false, "description": "隐藏24小时" },
                "L2": { "action": "hide", "duration_hours": 168, "ban": false, "description": "隐藏7天" },
                "L3": { "action": "hide", "duration_hours": 720, "ban": true, "ban_days": 7, "description": "隐藏30天+封禁7天" },
                "L4": { "action": "hide", "duration_hours": null, "ban": true, "ban_days": null, "description": "永久隐藏+永久封禁" }
            },
            "confidence_thresholds": {
                "auto_execute": 0.9,
                "flag_for_review": 0.6
            }
        }))
    }

    /// 获取最近 N 小时的新内容（供 Agent 扫描）
    pub async fn get_agent_new_content(&self, hours: i32, space_id: Option<Uuid>, limit: i32, offset: i32) -> Result<(Vec<serde_json::Value>, i64), AppError> {
        use sqlx::Row;
        let rows = sqlx::query(
            r#"SELECT json_build_object(
                'id', p.id, 'title', p.title,
                'content', CASE WHEN length(p.body) > 5000 THEN left(p.body, 5000) || '...' ELSE p.body END,
                'content_truncated', length(p.body) > 5000,
                'author_id', p.author_id,
                'author_username', u.username,
                'author_display_name', u.display_name,
                'space_id', p.space_id,
                'space_title', s.title,
                'module_type', p.module_type,
                'visibility', p.visibility,
                'created_at', p.created_at
            ) FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN spaces s ON p.space_id = s.id
            WHERE p.created_at > NOW() - ($1 || ' hours')::interval
            AND p.is_deleted = FALSE
            AND (p.space_id = $2 OR $2 IS NULL)
            AND NOT EXISTS (
                SELECT 1 FROM audit_logs a WHERE a.target_id = p.id AND a.target_type = 'post'
                AND a.actor_type = 'agent' AND a.created_at > NOW() - ($1 || ' hours')::interval
            )
            ORDER BY p.created_at DESC LIMIT $3 OFFSET $4"#
        ).bind(hours.to_string()).bind(space_id).bind(limit as i64).bind(offset as i64)
         .fetch_all(&self.pool).await?;

        let total: (i64,) = sqlx::query_as(
            r#"SELECT COUNT(*) FROM posts p
            WHERE p.created_at > NOW() - ($1 || ' hours')::interval
            AND p.is_deleted = FALSE
            AND (p.space_id = $2 OR $2 IS NULL)
            AND NOT EXISTS (
                SELECT 1 FROM audit_logs a WHERE a.target_id = p.id AND a.target_type = 'post'
                AND a.actor_type = 'agent' AND a.created_at > NOW() - ($1 || ' hours')::interval
            )"#
        ).bind(hours.to_string()).bind(space_id).fetch_one(&self.pool).await?;

        Ok((rows.into_iter().map(|r| r.get(0)).collect(), total.0))
    }

    /// Agent 提交审查决策
    pub async fn agent_review(&self, agent_user_id: Uuid, decisions: Vec<AgentReviewDecision>) -> Result<serde_json::Value, AppError> {
        let mut total = 0i32;
        let mut auto_executed = 0i32;
        let mut flagged_for_review = 0i32;
        let mut skipped = 0i32;

        for d in &decisions {
            total += 1;
            if d.confidence >= 0.9 {
                match d.action.as_str() {
                    "hide" => {
                        let _ = self.hide_post(agent_user_id, d.target_id, d.duration_hours).await;
                        self.audit_log(agent_user_id, "agent", "post", d.target_id, "hide", None, Some("hidden"), Some(&d.reason)).await;
                    }
                    "ban_user" => {
                        let _ = self.ban_user(agent_user_id, d.target_id, &d.reason).await;
                        self.audit_log(agent_user_id, "agent", "user", d.target_id, "ban", None, Some("banned"), Some(&d.reason)).await;
                    }
                    "approve" => {
                        self.audit_log(agent_user_id, "agent", &d.target_type, d.target_id, "approve", None, Some("approved"), None).await;
                    }
                    _ => {}
                }
                auto_executed += 1;
            } else if d.confidence >= 0.6 {
                let _ = sqlx::query(
                    "INSERT INTO reports (reporter_id, target_type, target_id, reason, status, created_at) VALUES ($1, $2, $3, $4, 'pending', NOW())"
                ).bind(agent_user_id).bind(&d.target_type).bind(d.target_id).bind(format!("[Agent:{}] {}", d.violation_type.as_deref().unwrap_or("unknown"), d.reason))
                 .execute(&self.pool).await;
                self.audit_log(agent_user_id, "agent", &d.target_type, d.target_id, "flag_for_review", None, Some("pending"), Some(&d.reason)).await;
                flagged_for_review += 1;
            } else {
                self.audit_log(agent_user_id, "agent", &d.target_type, d.target_id, "skipped", None, None, Some("low confidence")).await;
                skipped += 1;
            }
        }

        Ok(serde_json::json!({
            "total": total,
            "auto_executed": auto_executed,
            "flagged_for_review": flagged_for_review,
            "skipped": skipped,
        }))
    }

    /// Agent 审查统计
    pub async fn get_agent_stats(&self, agent_user_id: Uuid) -> Result<serde_json::Value, AppError> {
        use sqlx::Row;
        let today = sqlx::query(
            r#"SELECT COUNT(*) as cnt, action FROM audit_logs
               WHERE actor_type = 'agent' AND actor_id = $1
               AND created_at > CURRENT_DATE
               GROUP BY action"#
        ).bind(agent_user_id).fetch_all(&self.pool).await?;

        let week = sqlx::query(
            r#"SELECT COUNT(*) as cnt FROM audit_logs
               WHERE actor_type = 'agent' AND actor_id = $1
               AND created_at > CURRENT_DATE - INTERVAL '7 days'"#
        ).bind(agent_user_id).fetch_one(&self.pool).await?;

        let today_actions: Vec<serde_json::Value> = today.iter().map(|r| {
            serde_json::json!({
                "action": r.get::<String, _>("action"),
                "count": r.get::<i64, _>("cnt"),
            })
        }).collect();

        Ok(serde_json::json!({
            "today_total": today.iter().map(|r| r.get::<i64, _>("cnt")).sum::<i64>(),
            "today_actions": today_actions,
            "week_total": week.get::<i64, _>("cnt"),
        }))
    }

    pub async fn get_platform_settings(&self) -> Result<serde_json::Value, AppError> {
        let rows: Vec<(String, serde_json::Value)> = sqlx::query_as(
            "SELECT key, value FROM platform_settings ORDER BY key"
        ).fetch_all(&self.pool).await.map_err(|e| AppError::Internal(format!("读取平台设置失败: {}", e)))?;
        let mut map = serde_json::Map::new();
        for (k, v) in rows {
            map.insert(k, v);
        }
        Ok(serde_json::Value::Object(map))
    }

    pub async fn update_platform_settings(&self, settings: serde_json::Map<String, serde_json::Value>) -> Result<(), AppError> {
        for (key, value) in &settings {
            sqlx::query(
                "INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()"
            ).bind(key).bind(value).execute(&self.pool).await.map_err(|e| AppError::Internal(format!("保存平台设置失败: {}", e)))?;
        }
        Ok(())
    }

}