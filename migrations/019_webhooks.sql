-- ============================================================
-- Migration 019: Webhooks + Agent 事件系统
-- AI Agent 可通过 Webhook 实时感知社区事件
-- ============================================================

-- Webhook 订阅
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    events JSONB NOT NULL DEFAULT '[]',
    url TEXT NOT NULL,
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_delivery_at TIMESTAMPTZ,
    last_delivery_status INT,
    delivery_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_space ON webhooks (space_id, is_active);

-- Webhook 推送日志
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status_code INT,
    response_body TEXT,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries (webhook_id, created_at DESC);
