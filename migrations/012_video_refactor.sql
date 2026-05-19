-- ============================================================
-- 012_video_refactor: 视频模块架构重构
-- 视频属于创作者，社区只是引用。审核按社区独立。
-- ============================================================

-- 1. 创建社区-视频关联表（审核状态按社区独立）
CREATE TABLE IF NOT EXISTS space_videos (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_space_videos_video ON space_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_space_videos_space_status ON space_videos(space_id, review_status);

-- 2. 迁移旧数据
INSERT INTO space_videos (space_id, video_id, review_status, reviewed_by, reviewed_at, reject_reason)
    SELECT space_id, id, review_status, reviewed_by, reviewed_at, reject_reason
    FROM videos WHERE space_id IS NOT NULL
ON CONFLICT (space_id, video_id) DO NOTHING;

-- 3. 分享密码
ALTER TABLE videos ADD COLUMN IF NOT EXISTS share_password TEXT;

-- 4. 清理旧字段
ALTER TABLE videos DROP COLUMN IF EXISTS review_status;
ALTER TABLE videos DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE videos DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE videos DROP COLUMN IF EXISTS reject_reason;
