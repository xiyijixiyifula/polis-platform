-- ============================================================
-- Migration 020: Agent 身份系统
-- AI Agent 作为独立用户类型，拥有 API Key 认证和能力描述
-- ============================================================

-- 用户类型扩展
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'human';
-- 'human' | 'agent'

-- Agent 扩展信息
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    owner_user_id UUID NOT NULL REFERENCES users(id),
    agent_type VARCHAR(50) NOT NULL DEFAULT 'assistant',
    -- 'assistant' | 'bot' | 'guard' | 'tool'
    capabilities JSONB DEFAULT '[]',
    -- [{ "name": "code_review", "description": "..." }, ...]
    api_key_hash VARCHAR(255),
    -- API Key 的哈希值
    api_key_prefix VARCHAR(8),
    -- API Key 前缀便于识别 (如 "pk_AbCd12")
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'online',
    -- 'online' | 'offline' | 'busy'
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents (owner_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents (agent_type, is_active);

-- 社区级 Agent 注册（Agent 目录）
CREATE TABLE IF NOT EXISTS space_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    registered_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    trigger_words JSONB DEFAULT '[]',
    -- 触发词，如 ["@rust_expert", "rust问题"]
    auto_trigger JSONB DEFAULT '{}',
    -- 自动触发配置 { "module_types": ["qna"], "event_types": ["new_question"] }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (space_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_space_agents_space ON space_agents (space_id, is_active);
CREATE INDEX IF NOT EXISTS idx_space_agents_agent ON space_agents (agent_id);

-- 用户类型索引
CREATE INDEX IF NOT EXISTS idx_users_type ON users (user_type) WHERE user_type = 'agent';
