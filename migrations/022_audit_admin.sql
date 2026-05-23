-- ============================================================
-- Migration 022: 审核审计日志 + 管理员 Agent 支持
-- AI Agent 可通过 admin API 进行审核操作的完整基础设施
-- ============================================================

-- 审核审计日志
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_type VARCHAR(20) NOT NULL DEFAULT 'human',
    -- 'human' | 'agent' | 'admin' | 'system'
    target_type VARCHAR(50) NOT NULL,
    -- 'post' | 'ref' | 'user' | 'space' | 'comment' | 'report'
    target_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    -- 'approve' | 'reject' | 'hide' | 'unhide' | 'delete' | 'ban' | 'unban' | etc.
    old_state VARCHAR(50),
    new_state VARCHAR(50),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_type ON audit_logs (actor_type, created_at DESC);

-- 管理员用户标识（哪些用户是平台管理员）
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    -- 'super_admin' | 'admin' | 'moderator'
    granted_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users ON admin_users (user_id, is_active);

-- Agent 管理员关联（Agent 获得 admin 权限）
CREATE TABLE IF NOT EXISTS admin_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    -- 关联到 agents 的所有者
    role VARCHAR(20) NOT NULL DEFAULT 'moderator',
    -- 'admin' | 'moderator'  — Agent 的管理角色
    permissions JSONB DEFAULT '[]',
    -- ["approve_posts", "reject_posts", "hide_posts", "ban_users", "manage_spaces"]
    is_active BOOLEAN DEFAULT TRUE,
    granted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_agents ON admin_agents (agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_agents_user ON admin_agents (user_id, is_active);

-- 审核规则配置（AI 可配置的自动审核策略）
CREATE TABLE IF NOT EXISTS review_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    -- 'keyword_filter' | 'sensitivity_score' | 'frequency_limit' | 'agent_auto'
    config JSONB NOT NULL DEFAULT '{}',
    -- { "keywords": ["spam", "广告"], "action": "hide", "score_threshold": 0.7 }
    target_types JSONB NOT NULL DEFAULT '["post", "comment"]',
    -- 规则应用的目标类型
    priority INT DEFAULT 0,
    -- 规则优先级，数字越大优先级越高
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_rules_active ON review_rules (is_active, priority DESC);
