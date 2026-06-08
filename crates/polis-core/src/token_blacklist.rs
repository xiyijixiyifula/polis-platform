use std::collections::HashSet;
use tokio::sync::RwLock;

/// 共享的 JWT token 黑名单（内存实现）。
///
/// 所有微服务（user、space、content、notify、video）共同使用此模块。
///
/// **生产环境注意事项：**
/// - 当前为进程内内存存储，service 重启即失效
/// - 内存存储无法跨 service 实例共享
/// - **应迁移为 Redis**：跨实例共享、持久化、自动过期
/// - 若使用 NATS，可订阅 token 撤销事件同步本地黑名单
pub struct TokenBlacklist {
    blacklisted: RwLock<HashSet<String>>,
}

impl TokenBlacklist {
    pub fn new() -> Self {
        Self {
            blacklisted: RwLock::new(HashSet::new()),
        }
    }

    /// 将 token 的 JTI 加入黑名单
    pub async fn blacklist(&self, jti: &str) {
        self.blacklisted.write().await.insert(jti.to_string());
    }

    /// 检查 JTI 是否在黑名单中
    pub async fn is_blacklisted(&self, jti: &str) -> bool {
        self.blacklisted.read().await.contains(jti)
    }
}

impl Default for TokenBlacklist {
    fn default() -> Self {
        Self::new()
    }
}
