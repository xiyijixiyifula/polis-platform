use std::path::PathBuf;
use std::process::Stdio;
use polis_core::error::AppError;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use crate::config::VideoServiceConfig;
use crate::models::{CreateVideoCommentRequest, ReviewVideoRequest, UpdateVideoRequest, UserMini, Video, VideoComment, VideoPublic};
use crate::repo::VideoRepo;

pub struct VideoHandler {
    pub repo: VideoRepo,
    pub config: VideoServiceConfig,
}

impl VideoHandler {
    pub fn new(repo: VideoRepo, config: VideoServiceConfig) -> Self { Self { repo, config } }

    /// 上传视频（Multipart）
    pub async fn upload_video(&self, space_id: Uuid, uploader_id: Uuid, title: &str, description: &str, data: &[u8], extension: &str, visibility: &str) -> Result<serde_json::Value, AppError> {
        let max_bytes = self.config.max_file_size_mb * 1024 * 1024;
        if data.len() as u64 > max_bytes {
            return Err(AppError::Validation(format!("文件大小超过 {}MB 限制", self.config.max_file_size_mb)));
        }
        let ext = extension.trim_start_matches('.').to_lowercase();
        if !self.config.allowed_extensions.contains(&ext) {
            return Err(AppError::Validation(format!("不支持的文件格式: {}。支持: {:?}", ext, self.config.allowed_extensions)));
        }
        let file_id = Uuid::new_v4();
        let storage_path = PathBuf::from(&self.config.storage_path);
        tokio::fs::create_dir_all(&storage_path).await.map_err(|e| AppError::Internal(format!("创建存储目录失败: {}", e)))?;
        let filename = format!("{}.{}", file_id, ext);
        let filepath = storage_path.join(&filename);
        let mut file = tokio::fs::File::create(&filepath).await.map_err(|e| AppError::Internal(format!("创建文件失败: {}", e)))?;
        file.write_all(data).await.map_err(|e| AppError::Internal(format!("写入文件失败: {}", e)))?;
        let duration = self.get_video_duration(&filepath).await;
        let vis = match visibility { "private" => "private", "unlisted" => "unlisted", _ => "public" };
        let video = self.repo.create(space_id, uploader_id, title, description, filepath.to_str().unwrap_or(""), data.len() as i64, duration, vis).await?;
        if vis == "unlisted" { let _ = self.repo.generate_share_code(video.id).await; }
        // 后台转码
        let hls_output = PathBuf::from(&self.config.hls_output_path).join(file_id.to_string());
        let cfg = self.config.clone();
        let repo = self.repo.clone();
        tokio::spawn(async move {
            match transcode_video(&filepath, &hls_output, &cfg).await {
                Ok((hls_url, thumbnail_url, resolutions)) => {
                    if let Err(e) = repo.update_transcode_status(video.id, &hls_url, thumbnail_url.as_deref(), &resolutions, "ready").await {
                        tracing::error!("更新转码状态失败: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("转码失败: {}", e);
                    let _ = repo.update_transcode_status(video.id, "", None, &serde_json::json!([]), "failed").await;
                }
            }
        });
        Ok(serde_json::json!({"id": video.id, "title": video.title, "status": "processing", "review_status": video.review_status, "message": "视频上传成功，正在处理中"}))
    }

    pub async fn list_videos(&self, space_id: Uuid, user_id: Option<Uuid>, page: i64, page_size: i64) -> Result<Vec<VideoPublic>, AppError> {
        let videos = if let Some(uid) = user_id {
            self.repo.find_by_space_for_owner(space_id, uid, page, page_size).await?
        } else {
            self.repo.find_public_by_space(space_id, page, page_size).await?
        };
        let mut result = Vec::new();
        for v in videos {
            let liked = match user_id {
                Some(uid) => self.repo.has_liked(v.id, uid).await.unwrap_or(false),
                None => false,
            };
            result.push(self.to_video_public(v, user_id, Some(liked)).await);
        }
        Ok(result)
    }

    pub async fn get_video(&self, video_id: Uuid, user_id: Option<Uuid>) -> Result<VideoPublic, AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        self.check_video_access(&video, user_id)?;
        let _ = self.repo.increment_view(video_id).await;
        let liked = match user_id {
            Some(uid) => self.repo.has_liked(video_id, uid).await.unwrap_or(false),
            None => false,
        };
        Ok(self.to_video_public(video, user_id, Some(liked)).await)
    }

    pub async fn get_video_by_share_code(&self, code: &str, user_id: Option<Uuid>) -> Result<VideoPublic, AppError> {
        let video = self.repo.find_by_share_code(code).await?.ok_or(AppError::NotFound("视频不存在或链接已失效".to_string()))?;
        let _ = self.repo.increment_view(video.id).await;
        let liked = match user_id {
            Some(uid) => self.repo.has_liked(video.id, uid).await.unwrap_or(false),
            None => false,
        };
        Ok(self.to_video_public(video, user_id, Some(liked)).await)
    }

    pub async fn review_video(&self, video_id: Uuid, reviewer_id: Uuid, req: ReviewVideoRequest) -> Result<(), AppError> {
        let status = match req.status.as_str() { "approved" => "approved", "rejected" => "rejected", _ => return Err(AppError::Validation("审核状态必须是 approved 或 rejected".to_string())) };
        self.repo.review(video_id, reviewer_id, status, req.reason.as_deref()).await
    }

    pub async fn update_video(&self, video_id: Uuid, user_id: Uuid, req: UpdateVideoRequest) -> Result<(), AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        if video.uploader_id != user_id { return Err(AppError::Forbidden("只能编辑自己的视频".to_string())); }
        self.repo.update(video_id, req.title.as_deref(), req.description.as_deref(), req.visibility.as_deref()).await
    }

    pub async fn delete_video(&self, video_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        if video.uploader_id != user_id { return Err(AppError::Forbidden("只能删除自己的视频".to_string())); }
        let _ = tokio::fs::remove_file(&video.original_url).await;
        if let Some(hls) = &video.hls_url {
            if let Some(parent) = PathBuf::from(hls).parent() { let _ = tokio::fs::remove_dir_all(parent).await; }
        }
        self.repo.delete(video_id).await
    }

    pub async fn toggle_like(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        self.repo.toggle_like(video_id, user_id).await
    }

    pub async fn create_comment(&self, video_id: Uuid, author_id: Uuid, req: CreateVideoCommentRequest) -> Result<VideoComment, AppError> {
        self.repo.create_comment(video_id, author_id, &req.body, req.parent_id).await
    }

    pub async fn get_comments(&self, video_id: Uuid) -> Result<Vec<VideoComment>, AppError> {
        self.repo.find_comments(video_id).await
    }

    fn check_video_access(&self, video: &Video, user_id: Option<Uuid>) -> Result<(), AppError> {
        if video.visibility == "private" {
            match user_id { Some(uid) if uid == video.uploader_id => Ok(()), _ => Err(AppError::Forbidden("该视频为私有，仅上传者可查看".to_string())) }
        } else { Ok(()) }
    }

    async fn to_video_public(&self, v: Video, _current_user_id: Option<Uuid>, is_liked: Option<bool>) -> VideoPublic {
        VideoPublic {
            id: v.id, space_id: v.space_id,
            space_ns: v.space_namespace.clone().unwrap_or_default(),
            uploader: UserMini {
                id: v.uploader_id,
                username: v.uploader_username.clone().unwrap_or_default(),
                display_name: v.uploader_display_name.clone().unwrap_or_default(),
                avatar_url: v.uploader_avatar_url.clone(),
            },
            title: v.title, description: v.description, duration_seconds: v.duration_seconds,
            thumbnail_url: v.thumbnail_url.clone(), hls_url: v.hls_url.clone(),
            status: v.status.clone(), review_status: v.review_status.clone(),
            visibility: v.visibility.clone(), view_count: v.view_count, like_count: v.like_count,
            comment_count: v.comment_count, is_liked: is_liked.unwrap_or(false),
            share_code: v.share_code.clone(), created_at: v.created_at,
        }
    }

    async fn get_video_duration(&self, filepath: &PathBuf) -> Option<i32> {
        let output = tokio::process::Command::new("ffprobe")
            .args(["-v","error","-show_entries","format=duration","-of","csv=p=0", filepath.to_str().unwrap_or("")])
            .output().await.ok()?;
        String::from_utf8_lossy(&output.stdout).trim().parse::<f64>().ok().map(|d| d.round() as i32)
    }
}

async fn transcode_video(input: &PathBuf, output_dir: &PathBuf, _config: &VideoServiceConfig) -> Result<(String, Option<String>, serde_json::Value), AppError> {
    tokio::fs::create_dir_all(output_dir).await.map_err(|e| AppError::Internal(format!("创建HLS目录失败: {}", e)))?;
    let output_playlist = output_dir.join("index.m3u8");
    let file_id = output_dir.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let status = tokio::process::Command::new("ffmpeg")
        .args([
            "-i", input.to_str().unwrap_or(""),
            "-filter_complex", "[0:v]split=3[v1][v2][v3];[v1]scale=w=854:h=480[v1out];[v2]scale=w=1280:h=720[v2out];[v3]scale=w=1920:h=1080[v3out]",
            "-map","[v1out]","-c:v:0","libx264","-b:v:0","800k",
            "-map","[v2out]","-c:v:1","libx264","-b:v:1","2800k",
            "-map","[v3out]","-c:v:2","libx264","-b:v:2","5000k",
            "-map","a:0","-c:a","aac","-b:a","128k",
            "-var_stream_map","v:0,a:0 v:1,a:0 v:2,a:0",
            "-f","hls","-hls_time","6","-hls_list_size","0",
            "-master_pl_name","index.m3u8",
            "-hls_segment_filename", output_dir.join("segment_%v_%03d.ts").to_str().unwrap_or(""),
            output_playlist.to_str().unwrap_or(""),
        ])
        .stdout(Stdio::null()).stderr(Stdio::null())
        .status().await.map_err(|e| AppError::External(format!("FFmpeg错误: {}", e)))?;
    if !status.success() { return Err(AppError::External("FFmpeg转码失败".to_string())); }
    let thumbnail_path = output_dir.join("thumbnail.jpg");
    let _ = tokio::process::Command::new("ffmpeg")
        .args(["-i", input.to_str().unwrap_or(""), "-ss", "00:00:05", "-vframes", "1", thumbnail_path.to_str().unwrap_or("")])
        .output().await;
    let hls_url = format!("/hls/{}/index.m3u8", file_id);
    let thumbnail_url = if thumbnail_path.exists() { Some(format!("/hls/{}/thumbnail.jpg", file_id)) } else { None };
    let resolutions = serde_json::json!([{"resolution":"480p","bandwidth":800000},{"resolution":"720p","bandwidth":2800000},{"resolution":"1080p","bandwidth":5000000}]);
    Ok((hls_url, thumbnail_url, resolutions))
}
