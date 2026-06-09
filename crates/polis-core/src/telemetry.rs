use crate::error::AppError;
use chrono::{DateTime, Utc};

/// 错误遥测上下文 — 用于结构化日志/追踪
#[derive(Debug, Clone)]
pub struct ErrorContext {
    /// 错误类型标签（如 "Validation", "Database"）
    pub error_type: String,
    /// 错误消息
    pub message: String,
    /// 来源服务名（如 "polis-user", "polis-content"）
    pub service: String,
    /// 请求 ID（来自 AppError 上下文）
    pub request_id: Option<String>,
    /// 用户 ID（来自 AppError 上下文）
    pub user_id: Option<String>,
    /// 发生时间
    pub timestamp: DateTime<Utc>,
}

impl ErrorContext {
    /// 从 AppError 构造遥测上下文
    pub fn new(error: &AppError, service: impl Into<String>) -> Self {
        Self {
            error_type: error.error_type().to_string(),
            message: error.to_string(),
            service: service.into(),
            request_id: error.request_id.clone(),
            user_id: error.user_id.clone(),
            timestamp: Utc::now(),
        }
    }

    /// 以 tracing::error! 级别记录遥测事件
    pub fn log(&self) {
        tracing::error!(
            error_type = %self.error_type,
            message = %self.message,
            service = %self.service,
            request_id = ?self.request_id,
            user_id = ?self.user_id,
            timestamp = %self.timestamp,
        );
    }
}
