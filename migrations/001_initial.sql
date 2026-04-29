-- ==================== 用户 ====================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(39) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    verified BOOLEAN DEFAULT FALSE,
    verified_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username_lower ON users (LOWER(username));

-- ==================== 社区 ====================
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(100) NOT NULL,
    owner_id UUID REFERENCES users(id),
    is_root BOOLEAN DEFAULT FALSE,
    root_space_id UUID REFERENCES spaces(id),
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    icon_url TEXT,
    banner_url TEXT,
    visibility VARCHAR(20) DEFAULT 'public',
    status VARCHAR(20) DEFAULT 'active',
    custom_rules JSONB DEFAULT '[]',
    enabled_modules JSONB DEFAULT '["forum"]',
    metadata JSONB DEFAULT '{}',
    member_count BIGINT DEFAULT 0,
    post_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spaces_owner ON spaces (owner_id);
CREATE INDEX idx_spaces_root ON spaces (root_space_id);
CREATE INDEX idx_spaces_slug ON spaces (slug);
CREATE INDEX idx_spaces_status ON spaces (status);
CREATE UNIQUE INDEX idx_spaces_root_slug ON spaces (slug) WHERE is_root = TRUE;

-- ==================== 内容 ====================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    module_type VARCHAR(30) NOT NULL DEFAULT 'forum',
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    body TEXT DEFAULT '',
    content_type VARCHAR(20) DEFAULT 'text',
    media_urls JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    visibility VARCHAR(20) DEFAULT 'public',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_space ON posts (space_id, created_at DESC);
CREATE INDEX idx_posts_author ON posts (author_id, created_at DESC);
CREATE INDEX idx_posts_module ON posts (module_type, created_at DESC);
CREATE INDEX idx_posts_featured ON posts (space_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_posts_search ON posts USING GIN (to_tsvector('simple', title || ' ' || body));

-- ==================== 社区成员 ====================
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (space_id, user_id)
);

CREATE INDEX idx_memberships_user ON memberships (user_id);
CREATE INDEX idx_memberships_space ON memberships (space_id);

-- ==================== 评论 ====================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES comments(id),
    body TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments (post_id, created_at ASC);

-- ==================== 点赞 ====================
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX idx_likes_target ON likes (target_type, target_id);
CREATE INDEX idx_likes_user ON likes (user_id);

-- ==================== 关注 ====================
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id),
    followee_type VARCHAR(20) NOT NULL,
    followee_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (follower_id, followee_type, followee_id)
);

CREATE INDEX idx_follows_follower ON follows (follower_id);
CREATE INDEX idx_follows_followee ON follows (followee_type, followee_id);

-- ==================== 视频 ====================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    space_id UUID NOT NULL REFERENCES spaces(id),
    uploader_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    duration_seconds INT,
    original_url TEXT NOT NULL,
    hls_url TEXT,
    thumbnail_url TEXT,
    resolutions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'processing',
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 代码仓库 ====================
CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    default_branch VARCHAR(100) DEFAULT 'main',
    is_private BOOLEAN DEFAULT FALSE,
    star_count INT DEFAULT 0,
    fork_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (space_id, name)
);

-- ==================== 商城 ====================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    price_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    stock INT DEFAULT 0,
    images JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    amount_cents BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 支付 ====================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    to_space_id UUID REFERENCES spaces(id),
    amount_cents BIGINT NOT NULL,
    tx_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    provider VARCHAR(20),
    provider_tx_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 插件 ====================
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id),
    author_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    wasm_bytes BYTEA NOT NULL,
    permissions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 数据导出 ====================
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    space_id UUID REFERENCES spaces(id),
    status VARCHAR(20) DEFAULT 'processing',
    file_url TEXT,
    file_size BIGINT,
    format VARCHAR(10) DEFAULT 'md',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ==================== 种子数据 ====================
-- 创建默认根社区（示例）
-- INSERT INTO spaces (namespace, slug, is_root, title, description)
-- VALUES ('polis', 'polis', TRUE, 'Polis 官方社区', 'Polis 平台官方社区，欢迎所有用户！');
