use std::path::PathBuf;
use polis_core::error::AppError;
use polis_core::resolver::resolve::resolve_space_id;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use crate::config::VideoServiceConfig;
use crate::models::{CreateVideoCommentRequest, PublishRequest, ReviewVideoRequest, SetPasswordRequest, UpdateVideoRequest, UserMini, Video, VideoComment, VideoPublic};
use crate::repo::VideoRepo;

pub struct VideoHandler {
    pub repo: VideoRepo,
    pub config: VideoServiceConfig,
}

impl VideoHandler {
    pub fn new(repo: VideoRepo, config: VideoServiceConfig) -> Self { Self { repo, config } }

    // ===== 上传（不绑定社区）=====

    pub async fn upload_video(&self, uploader_id: Uuid, title: &str, description: &str, data: &[u8], extension: &str, visibility: &str) -> Result<serde_json::Value, AppError> {
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
        let video = self.repo.create(uploader_id, title, description, filepath.to_str().unwrap_or(""), data.len() as i64, duration, vis).await?;
        if vis == "unlisted" { let _ = self.repo.generate_share_code(video.id).await; }
        // 立即生成缩略图
        let thumb_dir = PathBuf::from(&self.config.hls_output_path).join(file_id.to_string());
        tokio::fs::create_dir_all(&thumb_dir).await.ok();
        let thumbnail_path = thumb_dir.join("thumbnail.jpg");
        let _ = tokio::process::Command::new("ffmpeg")
            .args(["-y", "-i", filepath.to_str().unwrap_or(""), "-ss", "00:00:03", "-vframes", "1", thumbnail_path.to_str().unwrap_or("")])
            .output().await;
        if thumbnail_path.exists() {
            let thumb_url = format!("/hls/{}/thumbnail.jpg", file_id);
            let _ = self.repo.update_transcode_status(video.id, "", Some(&thumb_url), &serde_json::json!([]), "processing").await;
        }
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
        Ok(serde_json::json!({"id": video.id, "title": video.title, "status": "processing", "message": "视频上传成功，正在处理中"}))
    }

    // ===== 创作中心：我的视频 =====

    pub async fn list_my_videos(&self, user_id: Uuid, page: i64, page_size: i64) -> Result<Vec<VideoPublic>, AppError> {
        let videos = self.repo.find_by_uploader(user_id, page, page_size).await?;
        let mut result = Vec::new();
        for v in videos {
            let liked = self.repo.has_liked(v.id, user_id).await.unwrap_or(false);
            result.push(self.to_video_public(v, Some(user_id), Some(liked), Some(false)).await);
        }
        Ok(result)
    }

    // ===== 社区视频列表 =====

    pub async fn list_space_videos(&self, ns: &str, user_id: Option<Uuid>, page: i64, page_size: i64) -> Result<Vec<VideoPublic>, AppError> {
        let sid = resolve_space_id(&self.repo.pool, ns).await?;
        let _is_owner = user_id.is_some();
        let videos = self.repo.find_by_space(sid, user_id, page, page_size).await?;
        let mut result = Vec::new();
        for (v, review_status) in videos {
            let liked = match user_id {
                Some(uid) => self.repo.has_liked(v.id, uid).await.unwrap_or(false),
                None => false,
            };
            let mut vp = self.to_video_public(v, user_id, Some(liked), Some(false)).await;
            vp.space_review_status = Some(review_status);
            result.push(vp);
        }
        Ok(result)
    }

    // ===== 视频详情 =====

    pub async fn get_video(&self, video_id: Uuid, user_id: Option<Uuid>) -> Result<VideoPublic, AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        self.check_access(&video, user_id, None)?;
        let _ = self.repo.increment_view(video_id).await;
        let liked = match user_id {
            Some(uid) => self.repo.has_liked(video_id, uid).await.unwrap_or(false),
            None => false,
        };
        let bookmarked = match user_id {
            Some(uid) => self.repo.has_bookmarked(video_id, uid).await.unwrap_or(false),
            None => false,
        };
        Ok(self.to_video_public(video, user_id, Some(liked), Some(bookmarked)).await)
    }

    /// 在社区上下文中查看视频
    pub async fn get_video_in_space(&self, video_id: Uuid, ns: &str, user_id: Option<Uuid>) -> Result<VideoPublic, AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        self.check_access(&video, user_id, None)?;
        let sid = resolve_space_id(&self.repo.pool, ns).await?;
        let review = self.repo.find_space_review(sid, video_id).await?;
        let _ = self.repo.increment_view(video_id).await;
        let liked = match user_id {
            Some(uid) => self.repo.has_liked(video_id, uid).await.unwrap_or(false),
            None => false,
        };
        let bookmarked = match user_id {
            Some(uid) => self.repo.has_bookmarked(video_id, uid).await.unwrap_or(false),
            None => false,
        };
        let mut vp = self.to_video_public(video, user_id, Some(liked), Some(bookmarked)).await;
        if let Some(ref r) = review {
            vp.space_id = Some(sid);
            vp.space_review_status = Some(r.review_status.clone());
        }
        Ok(vp)
    }

    // ===== 分享码访问 =====

    pub async fn get_video_by_share_code(&self, code: &str, user_id: Option<Uuid>, password: Option<&str>) -> Result<VideoPublic, AppError> {
        let video = self.repo.find_by_share_code(code).await?.ok_or(AppError::NotFound("视频不存在或链接已失效".to_string()))?;
        // 密码检查
        if let Some(ref pwd) = video.share_password {
            if !pwd.is_empty() {
                match password {
                    Some(p) if p == *pwd => {},
                    _ => return Err(AppError::Forbidden("需要密码访问".to_string())),
                }
            }
        }
        let _ = self.repo.increment_view(video.id).await;
        let liked = match user_id {
            Some(uid) => self.repo.has_liked(video.id, uid).await.unwrap_or(false),
            None => false,
        };
        let bookmarked = match user_id {
            Some(uid) => self.repo.has_bookmarked(video.id, uid).await.unwrap_or(false),
            None => false,
        };
        Ok(self.to_video_public(video, user_id, Some(liked), Some(bookmarked)).await)
    }

    // ===== 发布到社区 =====

    pub async fn publish_to_spaces(&self, video_id: Uuid, user_id: Uuid, req: PublishRequest) -> Result<(), AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        if video.uploader_id != user_id {
            return Err(AppError::Forbidden("只能投送自己的视频".to_string()));
        }
        self.repo.publish_to_spaces(video_id, &req.space_ids).await
    }

    /// 社区内审核视频
    pub async fn review_in_space(&self, ns: &str, video_id: Uuid, reviewer_id: Uuid, req: ReviewVideoRequest) -> Result<(), AppError> {
        let sid = resolve_space_id(&self.repo.pool, ns).await?;
        let status = match req.status.as_str() {
            "approved" => "approved",
            "rejected" => "rejected",
            _ => return Err(AppError::Validation("审核状态必须是 approved 或 rejected".to_string())),
        };
        self.repo.review_in_space(sid, video_id, reviewer_id, status, req.reason.as_deref()).await
    }

    // ===== 编辑 & 删除 =====

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

    // ===== 密码分享 =====

    pub async fn set_share_password(&self, video_id: Uuid, user_id: Uuid, req: SetPasswordRequest) -> Result<(), AppError> {
        let video = self.repo.find_by_id(video_id).await?.ok_or(AppError::NotFound("视频不存在".to_string()))?;
        if video.uploader_id != user_id { return Err(AppError::Forbidden("只能设置自己的视频".to_string())); }
        self.repo.set_share_password(video_id, &req.password).await
    }

    // ===== 互动 =====

    pub async fn toggle_like(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        self.repo.toggle_like(video_id, user_id).await
    }

    pub async fn create_comment(&self, video_id: Uuid, author_id: Uuid, req: CreateVideoCommentRequest) -> Result<VideoComment, AppError> {
        self.repo.create_comment(video_id, author_id, &req.body, req.parent_id).await
    }

    // ===== 收藏 =====

    pub async fn toggle_bookmark(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        self.repo.toggle_bookmark(video_id, user_id).await
    }

    pub async fn has_bookmarked(&self, video_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        self.repo.has_bookmarked(video_id, user_id).await
    }

    pub async fn get_comments(&self, video_id: Uuid) -> Result<Vec<VideoComment>, AppError> {
        self.repo.find_comments(video_id).await
    }

    // ===== 辅助 =====

    fn check_access(&self, video: &Video, user_id: Option<Uuid>, _password: Option<&str>) -> Result<(), AppError> {
        if video.visibility == "private" {
            match user_id { Some(uid) if uid == video.uploader_id => Ok(()), _ => Err(AppError::Forbidden("该视频为私有，仅上传者可查看".to_string())) }
        } else { Ok(()) }
    }

    async fn to_video_public(&self, v: Video, _current_user_id: Option<Uuid>, is_liked: Option<bool>, is_bookmarked: Option<bool>) -> VideoPublic {
        let spaces = self.repo.find_published_spaces(v.id).await.unwrap_or_default();
        VideoPublic {
            id: v.id, uploader: UserMini {
                id: v.uploader_id,
                username: v.uploader_username.clone().unwrap_or_default(),
                display_name: v.uploader_display_name.clone().unwrap_or_default(),
                avatar_url: v.uploader_avatar_url.clone(),
            },
            title: v.title, description: v.description, duration_seconds: v.duration_seconds,
            thumbnail_url: v.thumbnail_url.clone(), hls_url: v.hls_url.clone(),
            status: v.status.clone(), visibility: v.visibility.clone(),
            view_count: v.view_count, like_count: v.like_count, comment_count: v.comment_count,
            is_liked: is_liked.unwrap_or(false),
            is_bookmarked: is_bookmarked.unwrap_or(false),
            share_code: v.share_code.clone(),
            has_password: v.share_password.as_ref().map(|p| !p.is_empty()).unwrap_or(false),
            created_at: v.created_at,
            space_id: None, space_ns: None, space_review_status: None,
            published_spaces: spaces,
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

    // 简单的单码率 HLS 转码，避免 filter_complex 兼容性问题
    let result = tokio::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i", input.to_str().unwrap_or(""),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-f", "hls",
            "-hls_time", "6",
            "-hls_list_size", "0",
            "-hls_segment_filename", output_dir.join("segment_%03d.ts").to_str().unwrap_or(""),
            output_playlist.to_str().unwrap_or(""),
        ])
        .output().await.map_err(|e| AppError::External(format!("FFmpeg启动失败: {}", e)))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        tracing::error!("FFmpeg转码失败: {}", stderr);
        return Err(AppError::External(format!("FFmpeg转码失败: {}", stderr.lines().last().unwrap_or("未知错误"))));
    }

    // 生成缩略图（取第5秒）
    let thumbnail_path = output_dir.join("thumbnail.jpg");
    let _ = tokio::process::Command::new("ffmpeg")
        .args(["-y", "-i", input.to_str().unwrap_or(""), "-ss", "00:00:05", "-vframes", "1", thumbnail_path.to_str().unwrap_or("")])
        .output().await;

    let hls_url = format!("/hls/{}/index.m3u8", file_id);
    let thumbnail_url = if thumbnail_path.exists() { Some(format!("/hls/{}/thumbnail.jpg", file_id)) } else { None };
    let resolutions = serde_json::json!([{"resolution":"720p","bandwidth":2000000}]);
    Ok((hls_url, thumbnail_url, resolutions))
}
