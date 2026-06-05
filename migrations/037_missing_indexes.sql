-- ============================================================
-- 037: 补齐缺失的数据库索引
-- 基于 crates/*/src/ 全量 WHERE/JOIN/ORDER BY 查询模式分析
-- 日期: 2026-06-05
-- ============================================================

-- 用户列表的索引已由 001_initial.sql 覆盖：
--   posts(space_id)           → idx_posts_space (space_id, created_at DESC)
--   posts(author_id)          → idx_posts_author (author_id, created_at DESC)
--   comments(post_id)         → idx_comments_post (post_id, created_at ASC)
--   likes(user_id, ...)       → UNIQUE(target_type, target_id, user_id) + idx_likes_user
--   follows(follower_id)      → idx_follows_follower
--   follows(followee_id)      → idx_follows_followee (followee_type, followee_id)
--   bookmarks(user_id)        → idx_bookmarks_user (user_id, created_at DESC)
--   notifications(user_id, ..)→ idx_notifications_user_id (user_id, is_read, created_at DESC)
--   direct_messages(sender_id)→ idx_dm_sender
--   direct_messages(receiver) → idx_dm_receiver + idx_dm_conversation
--   creations(creator_id)     → idx_creations_creator (creator_id, created_at DESC)
--   posts(creation_id)        → idx_posts_creation (creation_id)
--   hashtags(normalized_tag)  → UNIQUE(normalized_tag) + idx_hashtags_normalized
--   spaces(owner_id)          → idx_spaces_owner
--   spaces(namespace)         → UNIQUE(namespace)
--   spaces(root_space_id)     → idx_spaces_root
--   thread_messages(thread_id)→ idx_thread_msgs_thread (thread_id, message_order)

-- ============================================================
-- 以下为查询分析后确认缺失的索引
-- ============================================================

-- 1. 评论作者索引 — 用于查询「用户发表的评论」
-- 查询: SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.author_id = $1
-- 文件: crates/polis-content/src/repo/comment_repo.rs:97-130
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id, created_at DESC);

-- 2. 评论树形结构 — 用于查询子评论（嵌套回复）
-- 场景: 获取某评论的所有回复 parent_id = ?
-- FK: comments.parent_id REFERENCES comments(id)
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;

-- 3. 商城订单买家 — 用于「我的订单」列表
-- 查询: WHERE o.buyer_id = $1 OR o.seller_id = $1 ORDER BY created_at DESC
-- 文件: crates/polis-store/src/handler.rs:139
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders (seller_id, created_at DESC);

-- 4. 支付交易流水 — 用于「我的钱包」交易记录
-- 查询: WHERE t.from_user_id = $1 OR t.to_user_id = $1 ORDER BY created_at DESC
-- 文件: crates/polis-pay/src/handler.rs:131
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions (to_user_id, created_at DESC);

-- 5. 商城商品 — 用于社区商店商品列表
-- 查询: WHERE p.space_id = $1 AND p.status = 'active' ORDER BY created_at DESC
-- 文件: crates/polis-store/src/handler.rs:117
CREATE INDEX IF NOT EXISTS idx_products_space ON products (space_id, status, created_at DESC);

-- 6. 社区投票 — 用于社区投票/问卷列表
-- 查询: WHERE p.space_id = $1 ORDER BY p.created_at DESC
-- 文件: crates/polis-content/src/repo.rs:827-833
CREATE INDEX IF NOT EXISTS idx_polls_space ON polls (space_id, created_at DESC);

-- 7. 视频上传者 — 用于视频发现/搜索结果 JOIN
-- 查询: LEFT JOIN users u ON u.id = v.uploader_id
--      WHERE v.visibility = 'public' AND sv.review_status = 'approved' ORDER BY v.created_at DESC
-- 文件: crates/polis-content/src/repo.rs:1244
CREATE INDEX IF NOT EXISTS idx_videos_uploader ON videos (uploader_id, created_at DESC);

-- 8. 视频帖子关联 — 用于通过 post_id 查找关联视频
-- 场景: 发布到视频模块时关联帖子
CREATE INDEX IF NOT EXISTS idx_videos_post ON videos (post_id) WHERE post_id IS NOT NULL;

-- 9. 视频可见性 + 审核状态 — 用于视频发现列表
-- 查询: WHERE v.visibility = 'public' AND sv.review_status = 'approved'
-- 用于评分排序的热门视频发现
CREATE INDEX IF NOT EXISTS idx_videos_discovery ON videos (visibility, created_at DESC) WHERE visibility = 'public';

-- 10. 代码仓库社区 — 用于社区仓库列表
-- 场景: 按 space_id 列出仓库
CREATE INDEX IF NOT EXISTS idx_repos_space ON repos (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repos_owner ON repos (owner_id, created_at DESC);

-- 11. 公告置顶排序 — 用于社区公告列表的 is_pinned 排序
-- 查询: WHERE space_id = $1 ORDER BY is_pinned DESC, created_at DESC LIMIT 10
-- 文件: crates/polis-content/src/repo.rs:921
CREATE INDEX IF NOT EXISTS idx_announcements_space_pinned ON announcements (space_id, is_pinned DESC, created_at DESC);

-- 12. 空间加入请求 — 用于待审批列表的快速筛选
-- 查询: WHERE space_id = $1 AND status = 'pending' ORDER BY created_at DESC
-- 文件: crates/polis-space/src/repo.rs:417
CREATE INDEX IF NOT EXISTS idx_join_requests_space_status ON space_join_requests (space_id, status, created_at DESC);

-- 13. 空间模块查询 — 用于按 module_key 快速定位模块配置
-- 查询: WHERE space_id = $1 AND module_key = $2
-- 文件: crates/polis-space/src/repo.rs:699
CREATE INDEX IF NOT EXISTS idx_space_modules_key ON space_modules (space_id, module_key);
