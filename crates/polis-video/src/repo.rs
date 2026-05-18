use polis_core::error::AppError;
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::{Video, VideoComment};

#[derive(Clone)]
pub struct VideoRepo {
    pub pool: PgPool,
}

impl VideoRepo {
    pub fn new(pool: PgPool) -> Self { Self { pool } }

    pub async fn create(
        &self, space_id: Uuid, uploader_id: Uuid, title: &str, description: &str,
        original_url: &str, file_size: i64, duration_seconds: Option<i32>, visibility: &str,
    ) -> Result<Video, AppError> {
        let video = sqlx::query_as::<_, Video>(
            r#"INSERT INTO videos (space_id, uploader_id, title, description, original_url, file_size, duration_seconds, visibility)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               RETURNING id,space_id,uploader_id,title,description,duration_seconds,original_url,hls_url,thumbnail_url,resolutions,status,review_status,visibility,file_size,view_count,like_count,comment_count,share_code,created_at,updated_at, NULL as uploader_username, NULL as uploader_display_name, NULL as uploader_avatar_url, NULL as space_namespace, NULL as space_title"#
        )
        .bind(space_id).bind(uploader_id).bind(title).bind(description)
        .bind(original_url).bind(file_size).bind(duration_seconds).bind(visibility)
        .fetch_one(&self.pool).await?;
        Ok(video)
    }

    pub async fn find_public_by_space(&self, space_id: Uuid, page: i64, page_size: i64) -> Result<Vec<Video>, AppError> {
        let offset = (page - 1) * page_size;
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.id,v.space_id,v.uploader_id,v.title,v.description,v.duration_seconds,v.original_url,v.hls_url,v.thumbnail_url,v.resolutions,v.status,v.review_status,v.visibility,v.file_size,v.view_count,v.like_count,v.comment_count,v.share_code,v.created_at,v.updated_at, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url, s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id JOIN spaces s ON v.space_id=s.id
               WHERE v.space_id=$1 AND v.review_status='approved' AND v.visibility='public' AND v.status='ready'
               ORDER BY v.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(space_id).bind(page_size).bind(offset).fetch_all(&self.pool).await?)
    }

    pub async fn find_by_space_for_owner(&self, space_id: Uuid, uploader_id: Uuid, page: i64, page_size: i64) -> Result<Vec<Video>, AppError> {
        let offset = (page - 1) * page_size;
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.id,v.space_id,v.uploader_id,v.title,v.description,v.duration_seconds,v.original_url,v.hls_url,v.thumbnail_url,v.resolutions,v.status,v.review_status,v.visibility,v.file_size,v.view_count,v.like_count,v.comment_count,v.share_code,v.created_at,v.updated_at, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url, s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id JOIN spaces s ON v.space_id=s.id
               WHERE v.space_id=$1 AND (v.review_status='approved' OR v.uploader_id=$4) AND (v.visibility!='private' OR v.uploader_id=$4)
               ORDER BY v.created_at DESC LIMIT $2 OFFSET $3"#
        ).bind(space_id).bind(page_size).bind(offset).bind(uploader_id).fetch_all(&self.pool).await?)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Video>, AppError> {
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.id,v.space_id,v.uploader_id,v.title,v.description,v.duration_seconds,v.original_url,v.hls_url,v.thumbnail_url,v.resolutions,v.status,v.review_status,v.visibility,v.file_size,v.view_count,v.like_count,v.comment_count,v.share_code,v.created_at,v.updated_at, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url, s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id JOIN spaces s ON v.space_id=s.id
               WHERE v.id=$1"#
        ).bind(id).fetch_optional(&self.pool).await?)
    }

    pub async fn update_transcode_status(&self, video_id: Uuid, hls_url: &str, thumbnail_url: Option<&str>, resolutions: &serde_json::Value, status: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET hls_url=$2,thumbnail_url=$3,resolutions=$4,status=$5,updated_at=NOW() WHERE id=$1")
            .bind(video_id).bind(hls_url).bind(thumbnail_url).bind(resolutions).bind(status).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn review(&self, video_id: Uuid, reviewer_id: Uuid, status: &str, reason: Option<&str>) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET review_status=$2,reviewed_by=$3,reviewed_at=NOW(),reject_reason=$4,updated_at=NOW() WHERE id=$1")
            .bind(video_id).bind(status).bind(reviewer_id).bind(reason).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn update(&self, video_id: Uuid, title: Option<&str>, description: Option<&str>, visibility: Option<&str>) -> Result<(), AppError> {
        sqlx::query("UPDATE videos SET title=COALESCE($2,title),description=COALESCE($3,description),visibility=COALESCE($4,visibility),updated_at=NOW() WHERE id=$1")
            .bind(video_id).bind(title).bind(description).bind(visibility).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete(&self, video_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM videos WHERE id=$1").bind(video_id).execute(&self.pool).await?;
        Ok(())
    }

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

    pub async fn find_comments(&self, video_id: Uuid) -> Result<Vec<VideoComment>, AppError> {
        Ok(sqlx::query_as::<_, VideoComment>(
            r#"SELECT vc.id,vc.video_id,vc.author_id,vc.parent_id,vc.body,vc.is_deleted,vc.like_count,vc.created_at, u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar_url
               FROM video_comments vc JOIN users u ON vc.author_id=u.id
               WHERE vc.video_id=$1 AND vc.is_deleted=FALSE ORDER BY vc.created_at ASC"#
        ).bind(video_id).fetch_all(&self.pool).await?)
    }

    pub async fn delete_comment(&self, comment_id: Uuid, author_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE video_comments SET is_deleted=TRUE WHERE id=$1 AND author_id=$2")
            .bind(comment_id).bind(author_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn generate_share_code(&self, video_id: Uuid) -> Result<String, AppError> {
        let code = format!("{:x}", md5::compute(format!("{}:{}", video_id, chrono::Utc::now().timestamp())));
        let code = &code[..12];
        sqlx::query("UPDATE videos SET share_code=$2 WHERE id=$1").bind(video_id).bind(code).execute(&self.pool).await?;
        Ok(code.to_string())
    }

    pub async fn find_by_share_code(&self, code: &str) -> Result<Option<Video>, AppError> {
        Ok(sqlx::query_as::<_, Video>(
            r#"SELECT v.id,v.space_id,v.uploader_id,v.title,v.description,v.duration_seconds,v.original_url,v.hls_url,v.thumbnail_url,v.resolutions,v.status,v.review_status,v.visibility,v.file_size,v.view_count,v.like_count,v.comment_count,v.share_code,v.created_at,v.updated_at, u.username as uploader_username, u.display_name as uploader_display_name, u.avatar_url as uploader_avatar_url, s.namespace as space_namespace, s.title as space_title
               FROM videos v JOIN users u ON v.uploader_id=u.id JOIN spaces s ON v.space_id=s.id
               WHERE v.share_code=$1 AND v.visibility='unlisted' AND v.review_status='approved'"#
        ).bind(code).fetch_optional(&self.pool).await?)
    }
}
