-- ==================== 文件分享（百度网盘风格） ====================
CREATE TABLE file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,              -- bytes
    mime_type VARCHAR(100),
    storage_path TEXT NOT NULL,              -- MinIO/S3 路径
    download_count BIGINT DEFAULT 0,
    is_folder BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES file_shares(id),  -- 文件夹嵌套
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_shares_space ON file_shares (space_id, created_at DESC);
CREATE INDEX idx_file_shares_parent ON file_shares (parent_id);

-- 分享链接（类似百度网盘链接）
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES file_shares(id) ON DELETE CASCADE,
    code VARCHAR(16) UNIQUE NOT NULL,       -- 分享码，如 "v8Kp3m"
    password VARCHAR(32),                    -- 提取码（可选）
    expires_at TIMESTAMPTZ,                  -- 过期时间（可选）
    max_downloads INT,                       -- 最大下载次数（可选）
    download_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_code ON share_links (code);
CREATE INDEX idx_share_links_file ON share_links (file_id);

-- ==================== 投票（知乎风格） ====================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL,        -- 'post' | 'comment'
    target_id UUID NOT NULL,
    vote_value SMALLINT NOT NULL,            -- 1 = 赞同, -1 = 反对
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX idx_votes_target ON votes (target_type, target_id);
CREATE INDEX idx_votes_user ON votes (user_id);

-- ==================== 社区投票/问卷 ====================
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    poll_type VARCHAR(20) DEFAULT 'single',   -- 'single' | 'multiple'
    status VARCHAR(20) DEFAULT 'active',      -- 'active' | 'closed'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label VARCHAR(500) NOT NULL,
    vote_count INT DEFAULT 0,
    sort_order INT DEFAULT 0
);

CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (poll_id, user_id)  -- 每人每票一次（single 模式）
);

-- ==================== 草稿箱 ====================
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    space_id UUID REFERENCES spaces(id),
    title VARCHAR(500) DEFAULT '',
    body TEXT DEFAULT '',
    module_type VARCHAR(30) DEFAULT 'forum',
    tags JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drafts_user ON drafts (user_id, updated_at DESC);

-- ==================== 公告 ====================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    importance VARCHAR(20) DEFAULT 'normal',  -- 'normal' | 'important' | 'urgent'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_space ON announcements (space_id, created_at DESC);

-- ==================== 阅读历史 ====================
CREATE TABLE reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

CREATE INDEX idx_reading_history_user ON reading_history (user_id, read_at DESC);
