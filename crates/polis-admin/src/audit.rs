//! 审核审计日志辅助 — 所有管理操作自动记录
use sqlx::PgPool;
use uuid::Uuid;

pub struct AuditLogger {
    pool: PgPool,
}

impl AuditLogger {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 记录一条审计日志
    #[allow(clippy::too_many_arguments)]
    pub async fn log(
        &self,
        actor_id: Uuid,
        actor_type: &str,     // 'human' | 'agent' | 'system'
        target_type: &str,     // 'post' | 'ref' | 'user' | 'space' | 'comment' | 'report'
        target_id: Uuid,
        action: &str,          // 'approve' | 'reject' | 'hide' | etc.
        old_state: Option<&str>,
        new_state: Option<&str>,
        reason: Option<&str>,
    ) {
        let metadata = serde_json::json!({
            "actor_type": actor_type,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });
        if let Err(e) = sqlx::query(
            "INSERT INTO audit_logs (actor_id, actor_type, target_type, target_id, action, old_state, new_state, reason, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(actor_id)
        .bind(actor_type)
        .bind(target_type)
        .bind(target_id)
        .bind(action)
        .bind(old_state)
        .bind(new_state)
        .bind(reason)
        .bind(&metadata)
        .execute(&self.pool)
        .await {
            tracing::warn!("Failed to write audit log {} {} {}: {}", actor_type, action, target_id, e);
        }
    }

    /// 查询审计日志
    pub async fn query(
        &self,
        actor_id: Option<Uuid>,
        target_type: Option<&str>,
        action: Option<&str>,
        actor_type: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<serde_json::Value>, i64), sqlx::Error> {
        use sqlx::Row;
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        // 简单实现：使用固定查询条件
        let rows = sqlx::query(
            r#"SELECT json_build_object(
                'id', a.id, 'actor_id', a.actor_id, 'actor_type', a.actor_type,
                'actor_username', COALESCE(u.username, 'system'),
                'target_type', a.target_type, 'target_id', a.target_id,
                'action', a.action, 'old_state', a.old_state, 'new_state', a.new_state,
                'reason', a.reason, 'created_at', a.created_at
            ) FROM audit_logs a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE (a.actor_type = $5 OR $5 IS NULL)
            AND (a.target_type = $4 OR $4 IS NULL)
            AND (a.action = $3 OR $3 IS NULL)
            AND (a.actor_id = $1 OR $1 IS NULL)
            ORDER BY a.created_at DESC LIMIT $2 OFFSET $6"#
        )
        .bind(actor_id)
        .bind(limit)
        .bind(action)
        .bind(target_type)
        .bind(actor_type)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM audit_logs WHERE (actor_type = $4 OR $4 IS NULL) AND (target_type = $3 OR $3 IS NULL) AND (action = $2 OR $2 IS NULL) AND (actor_id = $1 OR $1 IS NULL)"
        )
        .bind(actor_id)
        .bind(action)
        .bind(target_type)
        .bind(actor_type)
        .fetch_one(&self.pool)
        .await?;

        Ok((rows.into_iter().map(|r| r.get::<serde_json::Value, _>(0)).collect(), total.0))
    }

    /// 查询审核队列（聚合所有待审核内容）
    pub async fn review_queue(
        &self,
        status: Option<&str>,
        _queue_type: Option<&str>,  // reserved for future filtering
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<serde_json::Value>, i64), sqlx::Error> {
        use sqlx::Row;
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        // 构建 UNION 查询：refs pending + reports pending
        // posts 表没有 status 列，帖子审核通过 is_deleted/visibility 列控制
        let sql = r#"
            SELECT json_build_object(
                'target_type', t, 'target_id', id, 'status', s, 'title', title,
                'author', author, 'created_at', c, 'extra', extra
            ) FROM (
                -- 待审核社区模块引用
                SELECT 'ref' as t, r.id, r.display_status as s, cr.title,
                    COALESCE(u.display_name, u.username, 'unknown') as author,
                    r.created_at as c,
                    json_build_object('creation_id', r.creation_id, 'space_id', r.space_id, 'module_type', r.module_type) as extra
                FROM community_module_refs r
                JOIN creations cr ON cr.id = r.creation_id
                LEFT JOIN users u ON r.creator_id = u.id
                WHERE (r.display_status = 'pending_review' OR $1 IS NULL OR $1 = 'all')
            UNION ALL
                -- 待处理举报
                SELECT 'report' as t, rp.id, rp.status as s, rp.reason as title,
                    COALESCE(u.username, 'unknown') as author,
                    rp.created_at as c,
                    json_build_object('target_type', rp.target_type, 'target_id', rp.target_id, 'reporter_id', rp.reporter_id) as extra
                FROM reports rp LEFT JOIN users u ON rp.reporter_id = u.id
                WHERE (rp.status = 'pending' OR $1 IS NULL OR $1 = 'all')
            ) q
            ORDER BY c DESC LIMIT $2 OFFSET $3
        "#;

        let rows = sqlx::query(sql)
            .bind(status)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

        let count_sql = r#"
            SELECT COUNT(*) FROM (
                SELECT id FROM community_module_refs WHERE (display_status = 'pending_review' OR $1 IS NULL OR $1 = 'all')
                UNION ALL
                SELECT id FROM reports WHERE (status = 'pending' OR $1 IS NULL OR $1 = 'all')
            ) q
        "#;

        let total: (Option<i64>,) = sqlx::query_as(count_sql)
            .bind(status)
            .fetch_one(&self.pool)
            .await?;

        Ok((rows.into_iter().map(|r| r.get::<serde_json::Value, _>(0)).collect(), total.0.unwrap_or(0)))
    }
}
