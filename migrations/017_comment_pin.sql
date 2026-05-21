-- Add is_pinned to comments for creator comment management
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments (post_id, is_pinned) WHERE is_pinned = TRUE;
