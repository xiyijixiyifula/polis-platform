use std::collections::HashSet;
use tokio::sync::RwLock;

/// 共享的 JWT token 黑名单（内存 + PostgreSQL 持久化）。
///
/// 所有微服务（user、space、content、notify、video）共同使用此模块。
///
/// **架构：**
/// - 内存 `HashSet` 用于快速查找（O(1)）
/// - PostgreSQL `token_blacklist` 表用于持久化（重启不丢失）
/// - 启动时从 DB 加载未过期的 token
/// - DB 操作失败时降级为纯内存模式（`tracing::warn!`）
///
/// **未来可选升级：**
/// - 若使用 NATS，可订阅 token 撤销事件同步本地黑名单
/// - 可迁移为 Redis 以支持跨实例共享 + TTL 自动过期
pub struct TokenBlacklist {
    blacklisted: RwLock<HashSet<String>>,
}

impl TokenBlacklist {
    /// 创建空的纯内存黑名单（不连接数据库）。
    pub fn new() -> Self {
        Self {
            blacklisted: RwLock::new(HashSet::new()),
        }
    }

    /// 将 token 的 JTI 加入黑名单（仅内存，不持久化）。
    pub async fn blacklist(&self, jti: &str) {
        self.blacklisted.write().await.insert(jti.to_string());
    }

    /// 检查 JTI 是否在黑名单中。
    pub async fn is_blacklisted(&self, jti: &str) -> bool {
        self.blacklisted.read().await.contains(jti)
    }

    /// 将 token 的 JTI 加入黑名单，同时持久化到 PostgreSQL。
    ///
    /// 先写内存，再写数据库。数据库写入失败时仅打印 warning，不影响功能。
    pub async fn blacklist_with_persistence(
        &self,
        jti: &str,
        expires_at: chrono::DateTime<chrono::Utc>,
        pool: &sqlx::PgPool,
    ) {
        // 先更新内存（保证查找可用）
        self.blacklisted.write().await.insert(jti.to_string());

        // 再持久化到 PostgreSQL
        let result = sqlx::query(
            "INSERT INTO token_blacklist (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING",
        )
        .bind(jti)
        .bind(expires_at)
        .execute(pool)
        .await;

        if let Err(e) = result {
            tracing::warn!(
                "Failed to persist token blacklist entry for jti={}: {} — in-memory only",
                jti,
                e
            );
        }
    }

    /// 从 PostgreSQL 加载所有未过期的黑名单 token。
    ///
    /// 应在服务启动时调用一次。如果数据库不可用，返回空黑名单。
    pub async fn load_from_db(pool: &sqlx::PgPool) -> Self {
        let result: Result<Vec<(String,)>, sqlx::Error> = sqlx::query_as(
            "SELECT jti FROM token_blacklist WHERE expires_at > NOW()",
        )
        .fetch_all(pool)
        .await;

        match result {
            Ok(rows) => {
                let count = rows.len();
                let blacklisted: HashSet<String> = rows.into_iter().map(|(jti,)| jti).collect();
                tracing::info!(
                    "Loaded {} blacklisted tokens from PostgreSQL (non-expired)",
                    count
                );
                Self {
                    blacklisted: RwLock::new(blacklisted),
                }
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to load token blacklist from PostgreSQL: {} — starting with empty blacklist",
                    e
                );
                Self::new()
            }
        }
    }
}

impl Default for TokenBlacklist {
    fn default() -> Self {
        Self::new()
    }
}
