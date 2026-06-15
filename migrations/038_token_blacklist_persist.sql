-- ============================================================
-- 038: Token 黑名单持久化 — PostgreSQL 存储
-- 让 TokenBlacklist 在服务重启后仍然有效
-- 日期: 2026-06-15
-- ============================================================

CREATE TABLE IF NOT EXISTS token_blacklist (
    jti            VARCHAR(255) PRIMARY KEY,
    blacklisted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at     TIMESTAMPTZ NOT NULL
);

-- 定期清理已过期 token 记录，避免表无限增长
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires
    ON token_blacklist(expires_at);
