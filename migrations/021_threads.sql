-- ============================================================
-- Migration 021: 对话流 Thread 模块
-- Agent 和人类的对话记录，可一键发布为作品
-- ============================================================

-- 对话流
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    community_id UUID REFERENCES spaces(id),
    -- 参与者列表 { "human_ids": [...], "agent_ids": [...] }
    participants JSONB DEFAULT '{}',
    -- 对话状态
    status VARCHAR(20) DEFAULT 'active',
    -- 'active' | 'archived' | 'published'
    -- 关联的作品（发布后）
    creation_id UUID REFERENCES creations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_creator ON threads (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_community ON threads (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_creation ON threads (creation_id);

-- 对话消息
CREATE TABLE IF NOT EXISTS thread_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    -- 发言者
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    -- 角色
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    -- 'text' | 'markdown' | 'json'
    message_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_msgs_thread ON thread_messages (thread_id, message_order);
CREATE INDEX IF NOT EXISTS idx_thread_msgs_user ON thread_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_msgs_agent ON thread_messages (agent_id, created_at DESC);
