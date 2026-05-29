-- 025: Agent 审查规则种子数据
-- 预置默认审查规则，Agent 开箱即用

-- 1. 中文敏感词过滤
INSERT INTO review_rules (name, description, rule_type, config, target_types, priority, is_active, created_by)
SELECT '中文敏感词过滤', '过滤常见中文违规词汇', 'keyword_filter',
    jsonb_build_object(
        'keywords', jsonb_build_array(
            '色情', '裸体', '性交', '卖淫', '嫖娼', '成人影片', '黄色',
            '暴力', '杀人', '爆炸', '恐怖', '武器',
            '骗子', '诈骗', '赌博', '赌场', '毒品', '吸毒', '大麻',
            '人肉', '网暴', '骂人', '傻逼', '操你', '去死',
            '广告推广', '加微信', '加V', '看片', '资源群'
        ),
        'action', 'hide',
        'duration_hours', 168,
        'match_mode', 'contains'
    ),
    '["post", "comment"]'::jsonb, 10, TRUE,
    (SELECT id FROM users WHERE email = 'admin@polis.app' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@polis.app');

-- 2. 英文敏感词过滤
INSERT INTO review_rules (name, description, rule_type, config, target_types, priority, is_active, created_by)
SELECT '英文敏感词过滤', '过滤常见英文违规词汇', 'keyword_filter',
    jsonb_build_object(
        'keywords', jsonb_build_array(
            'porn', 'xxx', 'sex', 'nude', 'escort',
            'kill', 'terrorist', 'bomb', 'massacre',
            'scam', 'casino', 'gambling', 'cocaine', 'heroin', 'meth',
            'dox', 'doxxing', 'swatting'
        ),
        'action', 'hide',
        'duration_hours', 168,
        'match_mode', 'case_insensitive'
    ),
    '["post", "comment"]'::jsonb, 9, TRUE,
    (SELECT id FROM users WHERE email = 'admin@polis.app' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@polis.app');

-- 3. 发布频率限制
INSERT INTO review_rules (name, description, rule_type, config, target_types, priority, is_active, created_by)
SELECT '发布频率限制', '限制单用户每小时内最大发帖/评论数，防止刷屏', 'frequency_limit',
    jsonb_build_object(
        'max_posts_per_hour', 20,
        'max_comments_per_hour', 50,
        'action', 'hide',
        'duration_hours', 24,
        'auto_review_window_hours', 1
    ),
    '["post", "comment"]'::jsonb, 5, TRUE,
    (SELECT id FROM users WHERE email = 'admin@polis.app' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@polis.app');

-- 4. Agent 自动审核策略
INSERT INTO review_rules (name, description, rule_type, config, target_types, priority, is_active, created_by)
SELECT 'Agent 自动审核', 'Agent 自动扫描和处置的全局策略配置', 'agent_auto',
    jsonb_build_object(
        'scan_interval_minutes', 60,
        'lookback_hours', 24,
        'confidence_auto_execute', 0.9,
        'confidence_flag_review', 0.6,
        'max_batch_size', 100,
        'violation_severity_map', jsonb_build_object(
            'nsfw', jsonb_build_object('first_level', 'L1', 'severe_level', 'L4'),
            'violence', jsonb_build_object('first_level', 'L2', 'severe_level', 'L4'),
            'hate_speech', jsonb_build_object('first_level', 'L2', 'severe_level', 'L3'),
            'spam', jsonb_build_object('first_level', 'L1', 'severe_level', 'L3'),
            'illegal', jsonb_build_object('first_level', 'L3', 'severe_level', 'L4'),
            'harassment', jsonb_build_object('first_level', 'L1', 'severe_level', 'L3')
        )
    ),
    '["post", "comment"]'::jsonb, 1, TRUE,
    (SELECT id FROM users WHERE email = 'admin@polis.app' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@polis.app');
