-- 平台全局设置表
-- 支持运行时通过管理后台动态调整平台参数（上传大小限制等）
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 默认值：附件 50MB，视频 500MB（服务器资源有限，保守默认值）
INSERT INTO platform_settings (key, value) VALUES
    ('max_upload_size_mb', '50'),
    ('max_video_size_mb', '500')
ON CONFLICT (key) DO NOTHING;
