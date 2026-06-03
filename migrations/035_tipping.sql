-- ============================================
-- 035: 创作者打赏系统
-- ============================================

CREATE TABLE IF NOT EXISTS tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(32) NOT NULL DEFAULT 'post',
    target_id UUID NOT NULL,
    amount INT NOT NULL DEFAULT 1,
    message TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_target ON tips(target_type, target_id);

-- 打赏排行榜缓存视图
CREATE TABLE IF NOT EXISTS tip_leaderboard (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_tips_received INT NOT NULL DEFAULT 0,
    total_amount_received BIGINT NOT NULL DEFAULT 0,
    total_tips_sent INT NOT NULL DEFAULT 0,
    weekly_amount BIGINT NOT NULL DEFAULT 0,
    monthly_amount BIGINT NOT NULL DEFAULT 0,
    all_time_amount BIGINT NOT NULL DEFAULT 0,
    weekly_rank INT DEFAULT NULL,
    monthly_rank INT DEFAULT NULL,
    all_time_rank INT DEFAULT NULL,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tip_leaderboard_monthly ON tip_leaderboard(monthly_amount DESC);
CREATE INDEX IF NOT EXISTS idx_tip_leaderboard_weekly ON tip_leaderboard(weekly_amount DESC);
