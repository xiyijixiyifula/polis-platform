-- =============================================================================
-- 029: 自定义模块系统 v2 — 全动态模块过渡
-- =============================================================================
-- 变更:
--   1. 为 space_modules 添加 icon 列
--   2. 更新现有模块图标
--   3. 更新 forum 模块的 allowed_content_types
-- =============================================================================

-- 1. 添加 icon 列
ALTER TABLE space_modules ADD COLUMN IF NOT EXISTS icon VARCHAR(10) NOT NULL DEFAULT '📄';

-- 2. 为已知模块设置合适的图标
UPDATE space_modules SET icon = '💬' WHERE module_key = 'forum';
UPDATE space_modules SET icon = '📚' WHERE module_key IN ('wiki', 'knowledge', 'series');
UPDATE space_modules SET icon = '🔖' WHERE module_key = 'share';
UPDATE space_modules SET icon = '🎬' WHERE module_key = 'video';
UPDATE space_modules SET icon = '📊' WHERE module_key IN ('polls', 'poll');
UPDATE space_modules SET icon = '📢' WHERE module_key IN ('announcements', 'announcement');
UPDATE space_modules SET icon = '💭' WHERE module_key = 'chat';
UPDATE space_modules SET icon = '❓' WHERE module_key = 'qa';
UPDATE space_modules SET icon = '📖' WHERE module_key = 'novel';
UPDATE space_modules SET icon = '🎮' WHERE module_key = 'game';
UPDATE space_modules SET icon = '🧩' WHERE module_key = 'mini_app';
UPDATE space_modules SET icon = '👑' WHERE module_key = 'membership';
UPDATE space_modules SET icon = '🛒' WHERE module_key = 'store';
UPDATE space_modules SET icon = '🎓' WHERE module_key = 'course';
UPDATE space_modules SET icon = '💻' WHERE module_key = 'code_repo';
UPDATE space_modules SET icon = '👥' WHERE module_key = 'members';

-- 3. 更新 forum 模块的 allowed_content_types 为同时支持文章和视频
UPDATE space_modules
SET allowed_content_types = '["article", "video"]'::JSONB
WHERE module_key = 'forum'
  AND allowed_content_types = '["article"]'::JSONB;

-- 4. 清空旧 enabled_modules（所有空间统一）
UPDATE spaces SET enabled_modules = '[]'::JSONB WHERE enabled_modules != '[]'::JSONB;
