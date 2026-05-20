-- Migration 016: 不公开密码保护 + 封禁增强 + 社区关注统计
-- 1. spaces 表加 password_hash（不公开社区密码保护）
-- 2. spaces 表加 follower_count（社区被关注数）
-- 3. memberships 表加封禁时间相关字段
-- 4. 封禁自动解封函数

-- ==================== 1. 社区密码 ====================
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- ==================== 2. 社区关注数 ====================
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS follower_count BIGINT DEFAULT 0;

-- ==================== 3. 封禁增强 ====================
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;

-- 封禁到期自动解封函数（定时任务调用）
CREATE OR REPLACE FUNCTION auto_unban_expired_members() RETURNS INT AS $$
DECLARE
    unbanned_count INT;
BEGIN
    WITH unbanned AS (
        UPDATE memberships
        SET role = 'member',
            ban_reason = NULL,
            banned_at = NULL,
            ban_expires_at = NULL
        WHERE role = 'banned'
          AND ban_expires_at IS NOT NULL
          AND ban_expires_at <= NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO unbanned_count FROM unbanned;
    RETURN unbanned_count;
END;
$$ LANGUAGE plpgsql;
