-- ==================== 专栏/内容系列 ====================

-- 系列（专栏）表
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    cover_url TEXT,
    visibility VARCHAR(20) DEFAULT 'public',
    is_published BOOLEAN DEFAULT TRUE,
    post_count INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_series_space ON series (space_id, sort_order);
CREATE INDEX idx_series_author ON series (author_id);

-- 系列-帖子关联表
CREATE TABLE series_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (series_id, post_id)
);

CREATE INDEX idx_series_posts_series ON series_posts (series_id, sort_order);
CREATE INDEX idx_series_posts_post ON series_posts (post_id);
