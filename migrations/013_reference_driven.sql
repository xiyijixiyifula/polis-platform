-- ============================================================
-- Migration 013: Reference-Driven Architecture
-- 创作者数据本体 + 社区模块引用分离
-- ============================================================

-- ==================== 创作者数据本体 ====================
CREATE TABLE IF NOT EXISTS creations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),

    -- 内容类型决定渲染方式
    content_type VARCHAR(50) NOT NULL,
    -- 'article' | 'video' | 'image' | 'document' | 'poll'

    -- 内容核心
    title VARCHAR(500) NOT NULL,
    body TEXT DEFAULT '',
    body_json JSONB,

    -- 媒体资源
    cover_url TEXT,
    media_urls JSONB DEFAULT '[]',

    -- 创作者控制的权限
    visibility VARCHAR(20) DEFAULT 'public',
    -- 'public' | 'private' | 'password' | 'unlisted'
    password_hash VARCHAR(255),

    -- 统计数据（跟着作者走，所有地方看到的一样）
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    bookmark_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,

    -- 元数据
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',

    -- 状态
    status VARCHAR(20) DEFAULT 'published',
    -- 'published' | 'draft' | 'archived'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creations_creator ON creations (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creations_type ON creations (content_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creations_search ON creations USING GIN (to_tsvector('simple', title || ' ' || COALESCE(body, '')));

-- ==================== 关联 posts 到 creations（向后兼容） ====================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS creation_id UUID REFERENCES creations(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ref_status VARCHAR(20) DEFAULT 'visible';
-- 'visible' | 'hidden' | 'pending_review'

CREATE INDEX IF NOT EXISTS idx_posts_creation ON posts (creation_id);
CREATE INDEX IF NOT EXISTS idx_posts_ref_status ON posts (space_id, module_type, ref_status) WHERE ref_status = 'visible';

-- ==================== 社区模块引用表 ====================
CREATE TABLE IF NOT EXISTS community_module_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 指向真实数据
    creation_id UUID NOT NULL REFERENCES creations(id),
    creator_id UUID NOT NULL REFERENCES users(id),

    -- 引用所在位置
    space_id UUID NOT NULL REFERENCES spaces(id),
    module_type VARCHAR(50) NOT NULL,

    -- 模块管理者对本引用的控制
    display_status VARCHAR(20) DEFAULT 'visible',
    -- 'visible' | 'hidden' | 'pending_review' | 'rejected'
    is_pinned BOOLEAN DEFAULT FALSE,
    pin_order INT DEFAULT 0,

    -- 引用层面的统计
    module_views INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 同一创作不能重复投到同社区的同模块
    UNIQUE (creation_id, space_id, module_type)
);

CREATE INDEX IF NOT EXISTS idx_refs_space_module ON community_module_refs (space_id, module_type, display_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refs_creator ON community_module_refs (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refs_creation ON community_module_refs (creation_id);

-- ==================== 模块管理者 ====================
CREATE TABLE IF NOT EXISTS module_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    module_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),

    can_review BOOLEAN DEFAULT TRUE,
    can_hide BOOLEAN DEFAULT TRUE,
    can_pin BOOLEAN DEFAULT TRUE,
    can_manage_members BOOLEAN DEFAULT FALSE,
    can_edit_settings BOOLEAN DEFAULT FALSE,

    granted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (space_id, module_type, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mod_moderators ON module_moderators (space_id, module_type);

-- ==================== 模块封禁 ====================
CREATE TABLE IF NOT EXISTS module_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    module_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (space_id, module_type, user_id)
);

CREATE INDEX IF NOT EXISTS idx_module_bans ON module_bans (space_id, module_type, user_id);

-- ==================== 社区等级系统 ====================
CREATE TABLE IF NOT EXISTS community_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    level INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    required_score INT NOT NULL DEFAULT 0,
    perks JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (space_id, level)
);

-- ==================== 社区经验日志 ====================
CREATE TABLE IF NOT EXISTS community_exp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    -- 'post_submitted' | 'comment_received' | 'like_received' | 'member_joined' | 'daily_active'
    exp_gained INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (space_id, user_id, action_type, DATE(created_at))
);

CREATE INDEX IF NOT EXISTS idx_exp_logs_space ON community_exp_logs (space_id, created_at DESC);

-- ==================== 投稿申请记录 ====================
CREATE TABLE IF NOT EXISTS submission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES creations(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    target_space_id UUID NOT NULL REFERENCES spaces(id),
    target_module_type VARCHAR(50) NOT NULL,
    message TEXT,

    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected'
    reviewed_by UUID REFERENCES users(id),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (creation_id, target_space_id, target_module_type)
);

CREATE INDEX IF NOT EXISTS idx_submission_requests_target ON submission_requests (target_space_id, target_module_type, status);
CREATE INDEX IF NOT EXISTS idx_submission_requests_creator ON submission_requests (creator_id, created_at DESC);

-- ============================================================
-- 数据迁移：将现有 posts 数据映射到 creations
-- ============================================================

-- 为每个未删除的 post 创建对应的 creation
INSERT INTO creations (
    id, creator_id, content_type, title, body, body_json,
    cover_url, media_urls, visibility, password_hash,
    view_count, like_count, comment_count, bookmark_count, share_count,
    tags, metadata, status, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    author_id,
    COALESCE(NULLIF(content_type, ''), 'article'),
    title,
    body,
    NULL,
    NULL,
    media_urls,
    COALESCE(visibility, 'public'),
    password_hash,
    view_count,
    like_count,
    comment_count,
    0,
    0,
    tags,
    metadata,
    CASE WHEN is_deleted THEN 'archived' ELSE 'published' END,
    created_at,
    updated_at
FROM posts
WHERE (is_deleted = FALSE OR is_deleted IS NULL)
ON CONFLICT DO NOTHING;

-- 关联 posts 到 creations（通过作者+标题+时间匹配）
UPDATE posts p
SET creation_id = c.id
FROM creations c
WHERE p.author_id = c.creator_id
  AND p.title = c.title
  AND p.created_at = c.created_at
  AND p.creation_id IS NULL;

-- ============================================================
-- 为所有现有社区插入默认等级配置
-- ============================================================

INSERT INTO community_levels (space_id, level, title, required_score, perks)
SELECT
    s.id,
    gs.level,
    gs.title,
    gs.required_score,
    gs.perks
FROM spaces s
CROSS JOIN (
    VALUES
        (1, '萌芽社区', 0,     '{"max_modules": 2}'::jsonb),
        (2, '新星社区', 100,   '{"max_modules": 3}'::jsonb),
        (3, '活跃社区', 500,   '{"max_modules": 4, "password_access": true}'::jsonb),
        (4, '热门社区', 2000,  '{"max_modules": 6, "analytics": true}'::jsonb),
        (5, '知名社区', 5000,  '{"max_modules": 99, "custom_theme": true, "extra_moderator": 1}'::jsonb),
        (6, '旗舰社区', 15000, '{"max_modules": 99, "api_access": true, "priority_featured": true}'::jsonb)
) AS gs(level, title, required_score, perks)
ON CONFLICT (space_id, level) DO NOTHING;

-- ============================================================
-- 触发器：保持 creations 统计同步
-- ============================================================

-- 评论数同步
CREATE OR REPLACE FUNCTION sync_creation_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE creations SET comment_count = comment_count + 1 WHERE id = (
            SELECT creation_id FROM posts WHERE id = NEW.post_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE creations SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = (
            SELECT creation_id FROM posts WHERE id = OLD.post_id
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_creation_comments') THEN
        CREATE TRIGGER trg_sync_creation_comments
        AFTER INSERT OR DELETE ON comments
        FOR EACH ROW
        EXECUTE FUNCTION sync_creation_comment_count();
    END IF;
END $$;

-- 点赞数同步
CREATE OR REPLACE FUNCTION sync_creation_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.target_type = 'post' THEN
        UPDATE creations SET like_count = like_count + 1 WHERE id = (
            SELECT creation_id FROM posts WHERE id = NEW.target_id::uuid
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'post' THEN
        UPDATE creations SET like_count = GREATEST(like_count - 1, 0) WHERE id = (
            SELECT creation_id FROM posts WHERE id = OLD.target_id::uuid
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_creation_likes') THEN
        CREATE TRIGGER trg_sync_creation_likes
        AFTER INSERT OR DELETE ON likes
        FOR EACH ROW
        EXECUTE FUNCTION sync_creation_like_count();
    END IF;
END $$;
