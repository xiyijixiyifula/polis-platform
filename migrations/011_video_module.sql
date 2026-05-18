-- ==================== 视频模块增强 ====================

-- 1. 增强 videos 表：添加审核、隐私、互动字段
ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS like_count BIGINT DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS comment_count BIGINT DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS share_code VARCHAR(32) UNIQUE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_videos_space_review ON videos (space_id, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_space_visibility ON videos (space_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_uploader ON videos (uploader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_share_code ON videos (share_code) WHERE share_code IS NOT NULL;

-- 2. 视频点赞表
CREATE TABLE IF NOT EXISTS video_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (video_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_video_likes_video ON video_likes (video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes (user_id);

-- 3. 视频评论表
CREATE TABLE IF NOT EXISTS video_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES video_comments(id),
    body TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments (video_id, created_at ASC);

-- 4. 视频浏览记录
CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (video_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views (video_id);
