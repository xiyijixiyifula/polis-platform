use polis_core::error::AppError;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;
use crate::models::{SpaceRef, SpaceVideo, Video, VideoComment};

#[derive(Clone)]
pub struct VideoRepo {
    pub pool: PgPool,
}

impl VideoRepo {
    pub fn new(pool: PgPool) -> Self { Self { pool } }

    // ===== 视频 CRUD =====

    /// 创建视频（不绑定社区）
    pub async fn create(
        &self, uploader_id: Uuid, title: &str, description: &str,
        original_url: &str, file_size: i64, duration_seconds: Option<i32>, visibility: &str,
    ) -> Result<Video, AppError> {
        let video = sqlx::query_as::<_, Video>(
            r#"INSERT INTO videos (uploader_id, title, description, original_url, file_size, duration_seconds, visibility)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               RETURNING id,space_id,uploader_id,title,description,duration_seconds,original_url,hls_url,thumbnail_url,resolutions,status,visibility,file_size,view_count,like_count,comment_count,share_code,share_password,created_at,updated_at, NULL as uploader_username, NULL as uploader_display_name, NULL as uploader_avatar_url, NULL as space_namespace, NULL as space_title"#
        )
        .bind(uploader_id).bind(title).bind(description)
        .bind(original_url).bind(file_size).bind(duration_seconds).bind(visibility)
        .fetch_one(&self.pool).await?;
        Ok(video)
    }

    /// 按 ID 查视频（不再 JOIN spaces，视频可属于多个社区）
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Video>, AppError> {
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.*, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url,
                      s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id LEFT JOIN spaces s ON v.space_id=s.id
               WHERE v.id=$1"#
        ).bind(id).fetch_optional(&self.pool).await?)
    }

    /// 用户的视频列表（创作中心）
    pub async fn find_by_uploader(&self, uploader_id: Uuid, page: i64, page_size: i64) -> Result<Vec<Video>, AppError> {
        let offset = (page - 1) * page_size;
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.*, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url,
                      s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id LEFT JOIN spaces s ON v.space_id=s.id
               WHERE v.uploader_id=$1
               ORDER BY v.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(uploader_id).bind(page_size).bind(offset).fetch_all(&self.pool).await?)
    }

    /// 社区视频列表 — 游客看到审核通过的，owner 看到所有
    pub async fn find_by_space(&self, space_id: Uuid, user_id: Option<Uuid>, page: i64, page_size: i64) -> Result<Vec<(Video, String)>, AppError> {
        let offset = (page - 1) * page_size;
        let rows = sqlx::query(
            r#"SELECT v.*, COALESCE(u.username,'') as uploader_username, COALESCE(u.display_name,'') as uploader_display_name,
                      u.avatar_url as uploader_avatar_url,
                      COALESCE(s.namespace,'') as space_namespace, COALESCE(s.title,'') as space_title,
                      sv.review_status
               FROM space_videos sv
               JOIN videos v ON sv.video_id=v.id
               JOIN users u ON v.uploader_id=u.id
               LEFT JOIN spaces s ON v.space_id=s.id
               WHERE sv.space_id=$1
                 AND (sv.review_status='approved' OR v.uploader_id=$3)
                 AND (v.visibility!='private' OR v.uploader_id=$3)
               ORDER BY sv.submitted_at DESC LIMIT $2 OFFSET $4"#
        ).bind(space_id).bind(page_size).bind(user_id.unwrap_or(Uuid::nil())).bind(offset).fetch_all(&self.pool).await?;
        use sqlx::Row;
        let mut results = Vec::new();
        for row in rows {
            let video = Video::from_row(&row)?;
            let review_status: String = row.try_get("review_status")?;
            results.push((video, review_status));
        }
        Ok(results)
    }

    /// 获取视频在所有社区的审核状态
    pub async fn find_published_spaces(&self, video_id: Uuid) -> Result<Vec<SpaceRef>, AppError> {
        sqlx::query_as::<_, SpaceRef>(
            r#"SELECT sv.space_id, s.namespace, s.title, sv.review_status
               FROM space_videos sv JOIN spaces s ON sv.space_id=s.id
               WHERE sv.video_id=$1 ORDER BY sv.submitted_at DESC"#
        ).bind(video_id).fetch_all(&self.pool).await.map_err(|e| AppError::Database(e))
    }

    /// 获取视频在特定社区的审核状态
    pub async fn find_space_review(&self, space_id: Uuid, video_id: Uuid) -> Result<Option<SpaceVideo>, AppError> {
        Ok(sqlx::query_as::<_, SpaceVideo>(
            "SELECT * FROM space_videos WHERE space_id=$1 AND video_id=$2"
        ).bind(space_id).bind(video_id).fetch_optional(&self.pool).await?)
    }

    // ===== 社区操作 =====

    /// 验证社区是否允许视频投稿
    /// 条件: 1) 社区存在 2) 开启了视频模块 3) 用户是成员或社区是公开的
    pub async fn validate_space_for_video_submission(&self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        // 检查社区是否存在且开启了视频模块
        let space = sqlx::query_as::<_, (serde_json::Value, String)>(
            "SELECT enabled_modules, visibility FROM spaces WHERE id = $1 AND status = 'active'"
        ).bind(space_id).fetch_optional(&self.pool).await?
            .ok_or(AppError::NotFound("目标社区不存在或已关闭".to_string()))?;

        let (enabled_modules, visibility) = space;

        // 检查视频模块是否开启
        let has_video = enabled_modules.as_array()
            .map(|m| m.iter().any(|v| v.as_str() == Some("video")))
            .unwrap_or(false);
        if !has_video {
            return Err(AppError::Forbidden("目标社区未开启视频模块".to_string()));
        }

        // 公开社区任何人可投稿，私有社区需要是成员
        if visibility != "public" {
            let is_member = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM memberships WHERE space_id = $1 AND user_id = $2 AND role != 'banned')"
            ).bind(space_id).bind(user_id).fetch_one(&self.pool).await?;
            if !is_member {
                return Err(AppError::Forbidden("私有社区需要先加入才能投稿".to_string()));
            }
        }

        Ok(())
    }

    /// 提交视频到社区（发布即审核通过，社区管理员可后续驳回）
    pub async fn submit_to_space(&self, space_id: Uuid, video_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO space_videos (space_id, video_id, review_status) VALUES ($1,$2,'approved') ON CONFLICT (space_id, video_id) DO UPDATE SET review_status='approved'"
        ).bind(space_id).bind(video_id).execute(&self.pool).await?;
        // 更新 space_id 引用（指向首次发布的社区）
        sqlx::query("UPDATE videos SET space_id=$1 WHERE id=$2 AND space_id IS NULL")
            .bind(space_id).bind(video_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 社区内审核视频
    pub async fn review_in_space(&self, space_id: Uuid, video_id: Uuid, reviewer_id: Uuid, status: &str, reason: Option<&str>) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE space_videos SET review_status=$1, reviewed_by=$2, reviewed_at=NOW(), reject_reason=$3 WHERE space_id=$4 AND video_id=$5"
        ).bind(status).bind(reviewer_id).bind(reason).bind(space_id).bind(video_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 视频发布到多个社区
    pub async fn publish_to_spaces(&self, video_id: Uuid, space_ids: &[Uuid]) -> Result<(), AppError> {
        for &sid in space_ids {
            self.submit_to_space(sid, video_id).await?;
        }
        Ok(())
    }

    // ===== 更新 & 删除 =====

    pub async fn update(&self, video_id: Uuid, title: Option<&str>, description: Option<&str>, visibility: Option<&str>) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET title=COALESCE($2,title),description=COALESCE($3,description),visibility=COALESCE($4,visibility),updated_at=NOW() WHERE id=$1")
            .bind(video_id).bind(title).bind(description).bind(visibility).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete(&self, video_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM videos WHERE id=$1").bind(video_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn update_transcode_status(&self, video_id: Uuid, hls_url: &str, thumbnail_url: Option<&str>, resolutions: &serde_json::Value, status: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET hls_url=$2,thumbnail_url=$3,resolutions=$4,status=$5,updated_at=NOW() WHERE id=$1")
            .bind(video_id).bind(hls_url).bind(thumbnail_url).bind(resolutions).bind(status).execute(&self.pool).await?;
        Ok(())
    }

    // ===== 分享 & 密码 =====

    pub async fn generate_share_code(&self, video_id: Uuid) -> Result<String, AppError> {
        let code = format!("{:x}", md5::compute(format!("{}:{}", video_id, chrono::Utc::now().timestamp())));
        let code = &code[..12];
        sqlx::query("UPDATE videos SET share_code=$2 WHERE id=$1").bind(video_id).bind(code).execute(&self.pool).await?;
        Ok(code.to_string())
    }

    pub async fn set_share_password(&self, video_id: Uuid, password: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET share_password=$2 WHERE id=$1")
            .bind(video_id).bind(password).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn find_by_share_code(&self, code: &str) -> Result<Option<Video>, AppError> {
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.*, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url,
                      s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id LEFT JOIN spaces s ON v.space_id=s.id
               WHERE v.share_code=$1 AND v.visibility='unlisted'"#
        ).bind(code).fetch_optional(&self.pool).await?)
    }

    // ===== 统计 & 互动 =====

    pub async fn increment_view(&self, video_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET view_count=view_count+1 WHERE id=$1").bind(video_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn toggle_like(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM video_likes WHERE video_id=$1 AND user_id=$2)")
            .bind(video_id).bind(user_id).fetch_one(&self.pool).await?;
        if exists {
            sqlx::query("DELETE FROM video_likes WHERE video_id=$1 AND user_id=$2").bind(video_id).bind(user_id).execute(&self.pool).await?;
            sqlx::query("UPDATE videos SET like_count=like_count-1 WHERE id=$1").bind(video_id).execute(&self.pool).await?;
            Ok(false)
        } else {
            sqlx::query("INSERT INTO video_likes (video_id,user_id) VALUES ($1,$2)").bind(video_id).bind(user_id).execute(&self.pool).await?;
            sqlx::query("UPDATE videos SET like_count=like_count+1 WHERE id=$1").bind(video_id).execute(&self.pool).await?;
            Ok(true)
        }
    }

    pub async fn has_liked(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM video_likes WHERE video_id=$1 AND user_id=$2)")
            .bind(video_id).bind(user_id).fetch_one(&self.pool).await?)
    }

    pub async fn create_comment(&self, video_id: Uuid, author_id: Uuid, body: &str, parent_id: Option<Uuid>) -> Result<VideoComment, AppError> {
        let comment = sqlx::query_as::<_, VideoComment>(
            r#"INSERT INTO video_comments (video_id,author_id,body,parent_id) VALUES ($1,$2,$3,$4)
               RETURNING id,video_id,author_id,parent_id,body,is_deleted,like_count,created_at, NULL as author_username, NULL as author_display_name, NULL as author_avatar_url"#
        ).bind(video_id).bind(author_id).bind(body).bind(parent_id).fetch_one(&self.pool).await?;
        sqlx::query("UPDATE videos SET comment_count=comment_count+1 WHERE id=$1").bind(video_id).execute(&self.pool).await?;
        Ok(comment)
    }

    // ===== 收藏 =====

    pub async fn toggle_bookmark(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM bookmarks WHERE user_id = $1 AND target_type = 'video' AND target_id = $2"
        ).bind(user_id).bind(video_id).fetch_optional(&self.pool).await?;
        if let Some(_) = existing {
            sqlx::query("DELETE FROM bookmarks WHERE user_id = $1 AND target_type = 'video' AND target_id = $2")
                .bind(user_id).bind(video_id).execute(&self.pool).await?;
            Ok(false)
        } else {
            sqlx::query("INSERT INTO bookmarks (user_id, target_type, target_id) VALUES ($1, 'video', $2)")
                .bind(user_id).bind(video_id).execute(&self.pool).await?;
            Ok(true)
        }
    }

    pub async fn has_bookmarked(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query_scalar::<_, Option<i32>>(
            "SELECT 1 FROM bookmarks WHERE user_id = $1 AND target_type = 'video' AND target_id = $2",
        ).bind(user_id).bind(video_id).fetch_optional(&self.pool).await?;
        Ok(result.is_some())
    }

    pub async fn find_comments(&self, video_id: Uuid) -> Result<Vec<VideoComment>, AppError> {
        Ok(sqlx::query_as::<_, VideoComment>(
            r#"SELECT vc.id,vc.video_id,vc.author_id,vc.parent_id,vc.body,vc.is_deleted,vc.like_count,vc.created_at, u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar_url
               FROM video_comments vc JOIN users u ON vc.author_id=u.id
               WHERE vc.video_id=$1 AND vc.is_deleted=FALSE ORDER BY vc.created_at ASC"#
        ).bind(video_id).fetch_all(&self.pool).await?)
    }
}
