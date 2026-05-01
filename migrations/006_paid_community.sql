-- ============================================================
-- 006_paid_community.sql
-- 付费社区 Phase 1: 会员等级 + 付费订阅
-- ============================================================

-- 社区会员等级定义
CREATE TABLE IF NOT EXISTS space_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,               -- 等级名称，如基础会员/高级会员
    price_cents BIGINT NOT NULL DEFAULT 0,    -- 价格（分），0 表示免费
    currency VARCHAR(3) DEFAULT 'CNY',         -- 货币
    description TEXT DEFAULT '',               -- 等级描述
    benefits JSONB DEFAULT '[]'::jsonb,       -- 权益列表
    sort_order INT DEFAULT 0,                  -- 排序
    is_active BOOLEAN DEFAULT TRUE,            -- 是否启用
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_tiers_space ON space_tiers(space_id);

-- 用户付费订阅记录
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    tier_id UUID NOT NULL REFERENCES space_tiers(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',       -- active/expired/cancelled
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                    -- NULL 表示永久
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_space ON subscriptions(space_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_unique ON subscriptions(space_id, user_id, tier_id) WHERE status = 'active';
