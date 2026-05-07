-- 009: Notification preferences for users
-- Adds JSONB column to store per-user notification channel preferences

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.notification_prefs IS '用户通知偏好设置 { liked, commented, followed, invited, system } -> true/false';
