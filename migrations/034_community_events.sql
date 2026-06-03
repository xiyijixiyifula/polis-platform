-- ============================================
-- 034: 社区活动/挑战 + 每周话题
-- ============================================

CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(256) NOT NULL,
    description TEXT,
    cover_url TEXT,
    event_type VARCHAR(32) NOT NULL DEFAULT 'challenge',
    start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_at TIMESTAMPTZ,
    max_participants INT DEFAULT NULL,
    rules JSONB DEFAULT '{}',
    prizes JSONB DEFAULT '[]',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    participant_count INT NOT NULL DEFAULT 0,
    submission_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_space ON community_events(space_id, status);
CREATE INDEX IF NOT EXISTS idx_community_events_active ON community_events(status, start_at DESC);

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID, -- optional: link to their submission post/creation
    status VARCHAR(32) NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);

-- 每周话题
CREATE TABLE IF NOT EXISTS weekly_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_key VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(256) NOT NULL,
    description TEXT,
    cover_url TEXT,
    topic_type VARCHAR(32) NOT NULL DEFAULT 'discussion',
    start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_topics_active ON weekly_topics(is_active, start_at DESC);
