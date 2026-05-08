use std::path::PathBuf;
use std::process::Stdio;

use polis_core::error::AppError;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::config::VideoServiceConfig;
use crate::repo::VideoRepo;

pub struct VideoHandler {
    pub repo: VideoRepo,
    pub config: VideoServiceConfig,
}

impl VideoHandler {
    pub fn new(repo: VideoRepo, config: VideoServiceConfig) -> Self {
        Self { repo, config }
    }

    /// 上传视频文件
    pub async fn upload_video(
        &self,
        space_id: Uuid,
        uploader_id: Uuid,
        title: &str,
        description: &str,
        data: &[u8],
        extension: &str,
    ) -> Result<serde_json::Value, AppError> {
        // 验证文件大小
        let max_bytes = self.config.max_file_size_mb * 1024 * 1024;
        if data.len() as u64 > max_bytes {
            return Err(AppError::Validation(format!(
                "File size exceeds maximum of {} MB",
                self.config.max_file_size_mb
            )));
        }

        // 验证扩展名
        let ext = extension.trim_start_matches('.');
        if !self.config.allowed_extensions.contains(&ext.to_lowercase()) {
            return Err(AppError::Validation(format!(
                "File extension '{}' is not allowed. Allowed: {:?}",
                ext, self.config.allowed_extensions
            )));
        }

        // 生成唯一文件名
        let file_id = Uuid::new_v4();
        let filename = format!("{}.{}", file_id, ext);
        let storage_path = PathBuf::from(&self.config.storage_path);
        tokio::fs::create_dir_all(&storage_path).await
            .map_err(|e| AppError::Internal(format!("Failed to create storage dir: {}", e)))?;

        let filepath = storage_path.join(&filename);

        // 写入文件
        let mut file = tokio::fs::File::create(&filepath).await
            .map_err(|e| AppError::Internal(format!("Failed to create file: {}", e)))?;
        file.write_all(data).await
            .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;

        // 获取视频时长
        let duration = self.get_video_duration(&filepath).await;

        // 创建数据库记录
        let video_id = self.repo.create(
            space_id,
            uploader_id,
            title,
            description,
            &filepath.to_string_lossy(),
            data.len() as i64,
            duration,
        ).await?;

        // 启动后台转码
        let hls_output = PathBuf::from(&self.config.hls_output_path).join(file_id.to_string());
        let config = self.config.clone();

        tokio::spawn(async move {
            if let Err(e) = transcode_video(&filepath, &hls_output, &config).await {
                tracing::error!("Video transcode failed for {}: {}", file_id, e);
            }
        });

        // 返回视频信息
        Ok(serde_json::json!({
            "id": video_id,
            "file_id": file_id,
            "filename": filename,
            "file_size": data.len(),
            "status": "processing",
            "message": "Video uploaded, transcoding in progress",
        }))
    }

    /// 获取视频时长 (秒)
    async fn get_video_duration(&self, filepath: &PathBuf) -> Option<i32> {
        let output = tokio::process::Command::new("ffprobe")
            .args([
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                filepath.to_str().unwrap_or(""),
            ])
            .output()
            .await
            .ok()?;

        let duration_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        duration_str.parse::<f64>().ok().map(|d| d.round() as i32)
    }
}

/// 使用 FFmpeg 转码为 HLS
async fn transcode_video(
    input: &PathBuf,
    output_dir: &PathBuf,
    _config: &VideoServiceConfig,
) -> Result<(), AppError> {
    tokio::fs::create_dir_all(output_dir).await
        .map_err(|e| AppError::Internal(format!("Failed to create HLS dir: {}", e)))?;

    let output_playlist = output_dir.join("index.m3u8");

    // FFmpeg 转码为多分辨率 HLS
    let status = tokio::process::Command::new("ffmpeg")
        .args([
            "-i", input.to_str().unwrap_or(""),
            "-filter_complex", concat!(
                "[0:v]split=3[v1][v2][v3];",
                "[v1]scale=w=854:h=480[v1out];",
                "[v2]scale=w=1280:h=720[v2out];",
                "[v3]scale=w=1920:h=1080[v3out]"
            ),
            "-map", "[v1out]", "-c:v:0", "libx264", "-b:v:0", "800k",
            "-map", "[v2out]", "-c:v:1", "libx264", "-b:v:1", "2800k",
            "-map", "[v3out]", "-c:v:2", "libx264", "-b:v:2", "5000k",
            "-map", "a:0", "-c:a", "aac", "-b:a", "128k",
            "-var_stream_map", "v:0,a:0 v:1,a:0 v:2,a:0",
            "-f", "hls",
            "-hls_time", "6",
            "-hls_list_size", "0",
            "-master_pl_name", "index.m3u8",
            "-hls_segment_filename", output_dir.join("segment_%v_%03d.ts").to_str().unwrap_or(""),
            output_playlist.to_str().unwrap_or(""),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
        .map_err(|e| AppError::External(format!("FFmpeg execution error: {}", e)))?;

    if !status.success() {
        return Err(AppError::External("FFmpeg transcoding failed".to_string()));
    }

    // 生成缩略图
    let thumbnail_path = output_dir.join("thumbnail.jpg");
    let _ = tokio::process::Command::new("ffmpeg")
        .args([
            "-i", input.to_str().unwrap_or(""),
            "-ss", "00:00:05",
            "-vframes", "1",
            thumbnail_path.to_str().unwrap_or(""),
        ])
        .output()
        .await;

    tracing::info!("Transcoding complete for {:?}", input);
    Ok(())
}
