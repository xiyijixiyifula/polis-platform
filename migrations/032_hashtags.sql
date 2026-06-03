-- ============================================
-- 032: #话题标签系统
-- ============================================

CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(128) NOT NULL UNIQUE,
    normalized_tag VARCHAR(128) NOT NULL UNIQUE,
    post_count BIGINT NOT NULL DEFAULT 0,
    creation_count BIGINT NOT NULL DEFAULT 0,
    total_use_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hashtags_normalized ON hashtags(normalized_tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_total_use ON hashtags(total_use_count DESC);

CREATE TABLE IF NOT EXISTS hashtag_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(hashtag_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_hashtag_mappings_target ON hashtag_mappings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_hashtag_mappings_hashtag ON hashtag_mappings(hashtag_id, created_at DESC);
