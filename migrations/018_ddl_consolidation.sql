-- =============================================
-- Migration 018: DDL 整合 (从 polis-content main.rs 迁移)
-- 原位置: crates/polis-content/src/main.rs
-- 迁移原因：服务代码中不应包含 DDL 操作
-- 日期: 2026-05-22
-- =============================================

-- 跨社区投稿引用表
CREATE TABLE IF NOT EXISTS post_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id),
    module_type VARCHAR NOT NULL DEFAULT 'forum',
    status VARCHAR NOT NULL DEFAULT 'pending',
    submitted_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_post_references_post_id ON post_references(post_id);
CREATE INDEX IF NOT EXISTS idx_post_references_space_id ON post_references(space_id);

-- 通知表 (如尚未由 migration 003 创建)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR NOT NULL,
    actor_id UUID REFERENCES users(id),
    target_type VARCHAR,
    target_id UUID,
    content TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);

-- 私信增强：置顶和删除标记
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 私信免打扰表
CREATE TABLE IF NOT EXISTS user_conversation_mutes (
    user_id UUID NOT NULL REFERENCES users(id),
    muted_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, muted_user_id)
);
