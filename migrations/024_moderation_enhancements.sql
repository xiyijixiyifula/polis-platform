-- Migration 024: 内容审核增强 — 平台级封禁 + 时限隐藏
-- 1. users 表加 banned 字段（真实封禁，替代 verified=FALSE hack）
-- 2. posts 表加 hidden_until 字段（到期自动恢复）

-- ==================== 1. 平台级封禁 ====================
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_banned ON users (banned);

-- 迁移现有封禁数据：将 verified=false 且 bio 含 [已封禁] 标记的用户设为 banned
UPDATE users SET banned = TRUE, banned_at = updated_at
WHERE verified = FALSE AND bio LIKE '[已封禁]%';

-- ==================== 2. 帖子时限隐藏 ====================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_until TIMESTAMPTZ;

-- 自动恢复到期隐藏的帖子（定时任务调用）
CREATE OR REPLACE FUNCTION auto_restore_expired_hidden_posts() RETURNS INT AS $$
DECLARE
    restored_count INT;
BEGIN
    WITH restored AS (
        UPDATE posts
        SET visibility = 'public', hidden_until = NULL
        WHERE visibility = 'hidden'
          AND hidden_until IS NOT NULL
          AND hidden_until <= NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO restored_count FROM restored;
    RETURN restored_count;
END;
$$ LANGUAGE plpgsql;
