-- 社区收藏系统 (Star)
-- 类似 GitHub Star，用户可以收藏社区

CREATE TABLE IF NOT EXISTS space_stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_space_stars_user ON space_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_space_stars_space ON space_stars(space_id);

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS star_count BIGINT NOT NULL DEFAULT 0;
