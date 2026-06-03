-- ============================================
-- 030: 用户经验值与等级系统
-- ============================================

-- 用户经验值等级配置
CREATE TABLE IF NOT EXISTS user_xp (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp BIGINT NOT NULL DEFAULT 0,
    current_level INT NOT NULL DEFAULT 1,
    daily_xp INTEGER NOT NULL DEFAULT 0,
    daily_xp_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 经验变更日志
CREATE TABLE IF NOT EXISTS user_xp_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL,
    xp_gained INT NOT NULL,
    description TEXT,
    target_type VARCHAR(32),
    target_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_log_user_date ON user_xp_log(user_id, created_at DESC);

-- 等级阶梯种子数据 (Lv.1-Lv.20)
CREATE TABLE IF NOT EXISTS user_levels (
    level INT PRIMARY KEY,
    title VARCHAR(64) NOT NULL,
    required_xp BIGINT NOT NULL,
    perks JSONB NOT NULL DEFAULT '[]',
    icon VARCHAR(32) DEFAULT NULL
);

INSERT INTO user_levels (level, title, required_xp, perks, icon) VALUES
(1, '新手', 0, '[]', '🌱'),
(2, '探索者', 50, '[]', '🔍'),
(3, '活跃成员', 150, '[]', '⭐'),
(4, '贡献者', 350, '["自定义个人主页背景"]', '🌟'),
(5, '高级贡献者', 700, '["自定义个人主页背景"]', '💫'),
(6, '资深成员', 1200, '["内容置顶权重+1","自定义个人主页背景"]', '🔥'),
(7, '创作者', 2000, '["内容置顶权重+1","自定义个人主页背景"]', '✨'),
(8, '高级创作者', 3200, '["内容置顶权重+2","自定义个人主页背景","动态流曝光加成"]', '🏆'),
(9, '精英', 5000, '["内容置顶权重+2","自定义个人主页背景","动态流曝光加成"]', '👑'),
(10, '传奇', 7500, '["内容置顶权重+3","自定义个人主页背景","动态流曝光加成","创作者认证资格"]', '💎'),
(11, '大师', 11000, '["内容置顶权重+3","自定义个人主页背景","动态流曝光加成","创作者认证资格"]', '🎯'),
(12, '宗师', 16000, '["内容置顶权重+4","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣"]', '🌟'),
(13, '泰斗', 23000, '["内容置顶权重+4","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣"]', '🚀'),
(14, '至尊', 33000, '["内容置顶权重+5","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣","专属标识"]', '👑'),
(15, '不朽', 50000, '["内容置顶权重+6","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣","专属标识","打赏免手续费"]', '💎'),
(16, '觉醒', 75000, '["内容置顶权重+7","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣","专属标识","打赏免手续费"]', '⚡'),
(17, '永恒', 100000, '["内容置顶权重+8","自定义个人主页背景","动态流曝光加成","创作者认证资格","社区创建折扣","专属标识","打赏免手续费","自定义首页推荐"]', '🌌')
ON CONFLICT (level) DO NOTHING;

-- 经验值配置
CREATE TABLE IF NOT EXISTS xp_config (
    action_type VARCHAR(64) PRIMARY KEY,
    xp_amount INT NOT NULL,
    daily_limit INT NOT NULL DEFAULT 0,
    description TEXT
);

INSERT INTO xp_config (action_type, xp_amount, daily_limit, description) VALUES
('post_created', 50, 500, '发布帖子'),
('comment_created', 5, 100, '发表评论'),
('like_received', 10, 200, '收到点赞'),
('daily_login', 5, 5, '每日登录'),
('follow_user', 3, 30, '关注用户'),
('join_space', 10, 50, '加入社区'),
('create_space', 100, 500, '创建社区'),
('receive_tip', 20, 200, '收到打赏'),
('onboarding_complete', 200, 200, '完成新手任务'),
('invite_accepted', 100, 500, '邀请好友注册'),
('share_content', 5, 30, '分享内容'),
('content_featured', 50, 250, '内容被精选')
ON CONFLICT (action_type) DO NOTHING;

-- 新手引导任务
CREATE TABLE IF NOT EXISTS onboarding_quests (
    quest_key VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(32) DEFAULT '📋',
    xp_reward INT NOT NULL DEFAULT 20,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO onboarding_quests (quest_key, title, description, icon, xp_reward, sort_order) VALUES
('complete_profile', '完善个人资料', '上传头像并填写个人简介', '👤', 20, 1),
('first_post', '发布第一篇作品', '在任意社区发布你的第一篇内容', '✍️', 30, 2),
('first_comment', '发表第一条评论', '对其他人的内容发表评论', '💬', 15, 3),
('join_space', '加入一个社区', '找到感兴趣的社区并加入', '🏘️', 15, 4),
('first_like', '第一次点赞', '给你喜欢的内容点赞', '❤️', 10, 5),
('follow_user', '关注一位创作者', '关注一位你喜欢的创作者', '👥', 10, 6),
('share_content', '分享一篇内容', '把好内容分享给其他人', '📤', 15, 7),
('daily_login_3', '连续登录3天', '坚持每天回来看看', '🔥', 50, 99),
('first_tip', '第一次打赏', '给喜欢的创作者打赏', '🎁', 20, 8),
('create_space', '创建一个社区', '创建属于你自己的社区', '🏗️', 40, 9)
ON CONFLICT (quest_key) DO NOTHING;

-- 用户任务进度
CREATE TABLE IF NOT EXISTS user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_key VARCHAR(64) NOT NULL REFERENCES onboarding_quests(quest_key) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, quest_key)
);

-- 徽章系统
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key VARCHAR(64) NOT NULL,
    badge_name VARCHAR(128) NOT NULL,
    badge_icon VARCHAR(32) DEFAULT '🏅',
    description TEXT,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_key)
);

-- 邀请码
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    invitee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    redeemed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_inviter ON invite_codes(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- 邀请奖励日志
CREATE TABLE IF NOT EXISTS invite_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inviter_xp_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
