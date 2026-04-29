-- 通知表
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,          -- 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'invite'
    actor_id UUID REFERENCES users(id), -- 触发通知的用户
    target_type VARCHAR(20),            -- 'post' | 'comment' | 'space' | 'user'
    target_id UUID,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- 书签/收藏表
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,   -- 'post' | 'comment'
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks (user_id, created_at DESC);

-- 举报表
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL,   -- 'post' | 'comment' | 'space' | 'user'
    target_id UUID NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'resolved' | 'dismissed'
    handled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_status ON reports (status);

-- 邀请码表
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255),
    invitee_id UUID REFERENCES users(id),
    code VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_code ON invitations (code);
CREATE INDEX idx_invitations_space ON invitations (space_id);
