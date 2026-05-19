-- ============================================================
-- 014_video_spaceid_nullable: 视频不再绑定单一社区
-- video 属于创作者，可通过 space_videos 发布到多个社区
-- space_id 改为可空，社区关系由 space_videos 维护
-- ============================================================

ALTER TABLE videos ALTER COLUMN space_id DROP NOT NULL;
