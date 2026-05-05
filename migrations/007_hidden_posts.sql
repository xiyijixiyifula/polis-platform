-- 空间创建者可以隐藏他人帖子（移除索引，不删内容）
-- 用户Ⓚ OS: 磁盘所有者可以删除目录中的快捷方式，不能删文件本身
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by_owner BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_visible ON posts (space_id, hidden_by_owner, module_type, created_at DESC) WHERE is_deleted = FALSE;
