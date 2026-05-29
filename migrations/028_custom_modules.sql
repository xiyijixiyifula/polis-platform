-- =============================================================================
-- 028: 自定义模块系统 — 废弃旧的 enabled_modules JSONB 体系
-- =============================================================================
-- 核心变化:
--   1. 新建 space_modules 表，每个模块一条记录
--   2. 模块有: name(名称), mode(free/creator_only), allowed_content_types(article/video)
--   3. 旧的 17 种内置模块全部迁移到新表，后续按自定义模块统一管理
--   4. enabled_modules 列保留但不再作为主要数据源
-- =============================================================================

-- 1. 创建 space_modules 表
CREATE TABLE IF NOT EXISTS space_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(10) NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (mode IN ('free', 'creator_only')),
    allowed_content_types JSONB NOT NULL DEFAULT '["article"]',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_space_modules_space ON space_modules(space_id);
CREATE INDEX IF NOT EXISTS idx_space_modules_key ON space_modules(module_key);

-- 2. 迁移现有社区的 enabled_modules 到 space_modules
-- 旧模块类型 → 新模块 (名称, 模式, 允许内容类型) 的映射规则:
--   forum/交流     → free, article (所有人可发文章)
--   share/分享     → creator_only, article (仅创建者可发文章)
--   wiki/知识库    → free, article
--   qa/问答        → free, article
--   series/系列    → free, article
--   polls/投票     → free, article
--   announcements/公告 → creator_only, article
--   chat/聊天      → free, article
--   novel/小说     → free, article
--   game/游戏      → free, article
--   mini_app/小程序 → free, article
--   membership/会员 → creator_only, article
--   store/商城     → creator_only, article
--   course/课程    → creator_only, article
--   code_repo/代码 → free, article
--   video/视频     → free, video
--   members/成员   → 跳过 (非内容模块)

DO $$
DECLARE
    sp RECORD;
    mod_arr JSONB;
    mod_val TEXT;
    mod_name TEXT;
    mod_mode TEXT;
    mod_types JSONB;
    sort_idx INT;
    already_exists INT;
BEGIN
    FOR sp IN SELECT id, enabled_modules FROM spaces WHERE status = 'active'
    LOOP
        mod_arr := sp.enabled_modules;
        IF mod_arr IS NULL OR jsonb_array_length(mod_arr) = 0 THEN
            -- 没有任何模块的社区，给一个默认的"交流"模块
            mod_arr := '["forum"]'::JSONB;
        END IF;

        sort_idx := 0;
        FOR mod_val IN SELECT jsonb_array_elements_text(mod_arr)
        LOOP
            -- 跳过 members（不是内容模块）
            IF mod_val = 'members' THEN
                CONTINUE;
            END IF;

            -- 确定模块名称、模式和允许内容类型
            CASE mod_val
                WHEN 'forum' THEN
                    mod_name := '交流'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'share' THEN
                    mod_name := '分享'; mod_mode := 'creator_only'; mod_types := '["article"]'::JSONB;
                WHEN 'wiki' THEN
                    mod_name := '知识库'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'qa' THEN
                    mod_name := '问答'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'series' THEN
                    mod_name := '系列'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'polls' THEN
                    mod_name := '投票'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'announcements' THEN
                    mod_name := '公告'; mod_mode := 'creator_only'; mod_types := '["article"]'::JSONB;
                WHEN 'chat' THEN
                    mod_name := '聊天'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'novel' THEN
                    mod_name := '小说'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'game' THEN
                    mod_name := '游戏'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'mini_app' THEN
                    mod_name := '小程序'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'membership' THEN
                    mod_name := '会员'; mod_mode := 'creator_only'; mod_types := '["article"]'::JSONB;
                WHEN 'store' THEN
                    mod_name := '商城'; mod_mode := 'creator_only'; mod_types := '["article"]'::JSONB;
                WHEN 'course' THEN
                    mod_name := '课程'; mod_mode := 'creator_only'; mod_types := '["article"]'::JSONB;
                WHEN 'code_repo' THEN
                    mod_name := '代码仓库'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                WHEN 'video' THEN
                    mod_name := '视频'; mod_mode := 'free'; mod_types := '["video"]'::JSONB;
                WHEN 'article' THEN
                    mod_name := '文章'; mod_mode := 'free'; mod_types := '["article"]'::JSONB;
                ELSE
                    -- 未识别的模块类型，默认创建为自由文章模块
                    mod_name := left(mod_val, 10);
                    mod_mode := 'free';
                    mod_types := '["article"]'::JSONB;
            END CASE;

            -- 检查是否已存在（防止重复迁移）
            SELECT COUNT(*) INTO already_exists FROM space_modules
            WHERE space_id = sp.id AND module_key = mod_val;

            IF already_exists = 0 THEN
                INSERT INTO space_modules (space_id, name, module_key, mode, allowed_content_types, sort_order)
                VALUES (sp.id, mod_name, mod_val, mod_mode, mod_types, sort_idx);
                sort_idx := sort_idx + 1;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 3. 确保每个活跃社区至少有一个"交流"模块
DO $$
DECLARE
    sp RECORD;
    has_module INT;
BEGIN
    FOR sp IN SELECT id FROM spaces WHERE status = 'active'
    LOOP
        SELECT COUNT(*) INTO has_module FROM space_modules WHERE space_id = sp.id;
        IF has_module = 0 THEN
            INSERT INTO space_modules (space_id, name, module_key, mode, allowed_content_types, sort_order)
            VALUES (sp.id, '交流', 'forum', 'free', '["article"]'::JSONB, 0);
        END IF;
    END LOOP;
END $$;
