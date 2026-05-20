-- 社区等级系统 + 成员管理增强
-- 等级: XP = 成员数×10 + 内容数×5 + 日活跃度×3 + 运行天数×1, 上限200XP/天

CREATE TABLE IF NOT EXISTS space_levels (
    space_id UUID PRIMARY KEY REFERENCES spaces(id) ON DELETE CASCADE,
    xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    daily_xp INT NOT NULL DEFAULT 0,
    daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_space_levels_level ON space_levels (level DESC);

CREATE TABLE IF NOT EXISTS space_admins (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'moderator',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (space_id, user_id)
);

CREATE TABLE IF NOT EXISTS space_join_requests (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    UNIQUE (space_id, user_id)
);

CREATE OR REPLACE FUNCTION calc_space_level(total_xp INT) RETURNS INT AS $$
BEGIN
    IF total_xp < 101 THEN RETURN 1;
    ELSIF total_xp < 501 THEN RETURN 2;
    ELSIF total_xp < 2001 THEN RETURN 3;
    ELSIF total_xp < 5001 THEN RETURN 4;
    ELSE RETURN 5;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
