-- ============================================
-- 033: 编辑精选 + 创作者认证 + 排行榜
-- ============================================

CREATE TABLE IF NOT EXISTS editor_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    title_override VARCHAR(256),
    description_override TEXT,
    pick_type VARCHAR(32) NOT NULL DEFAULT 'daily',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    picked_by UUID REFERENCES users(id),
    picked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editor_picks_active ON editor_picks(is_active, pick_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_editor_picks_target ON editor_picks(target_type, target_id);

-- 创作者认证
CREATE TABLE IF NOT EXISTS creator_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cert_type VARCHAR(32) NOT NULL DEFAULT 'verified',
    cert_level INT NOT NULL DEFAULT 1,
    cert_reason TEXT,
    certified_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_certifications_user ON creator_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_certifications_type ON creator_certifications(cert_type, cert_level);

-- 创作者排行榜积分
CREATE TABLE IF NOT EXISTS creator_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_posts INT NOT NULL DEFAULT 0,
    total_likes_received INT NOT NULL DEFAULT 0,
    total_comments_received INT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    total_tips_received INT NOT NULL DEFAULT 0,
    total_followers INT NOT NULL DEFAULT 0,
    weekly_score BIGINT NOT NULL DEFAULT 0,
    monthly_score BIGINT NOT NULL DEFAULT 0,
    all_time_score BIGINT NOT NULL DEFAULT 0,
    weekly_rank INT DEFAULT NULL,
    monthly_rank INT DEFAULT NULL,
    all_time_rank INT DEFAULT NULL,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_scores_weekly ON creator_scores(weekly_score DESC);
CREATE INDEX IF NOT EXISTS idx_creator_scores_monthly ON creator_scores(monthly_score DESC);
CREATE INDEX IF NOT EXISTS idx_creator_scores_alltime ON creator_scores(all_time_score DESC);
