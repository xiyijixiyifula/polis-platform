use std::collections::HashSet;
use tokio::sync::RwLock;

/// 内存中的 JWT token 黑名单。
/// 用于在 logout 时撤销 access/refresh token。
///
/// 生产环境应替换为 Redis，以支持跨实例共享和多实例 deployment。
pub struct TokenBlacklist {
    blacklisted: RwLock<HashSet<String>>,
}

impl TokenBlacklist {
    pub fn new() -> Self {
        Self {
            blacklisted: RwLock::new(HashSet::new()),
        }
    }

    /// 将 token 加入黑名单（通过其 JTI）
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
