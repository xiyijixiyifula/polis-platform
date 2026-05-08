
use thiserror::Error;
use axum::response::IntoResponse;

/// 统一的错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Authentication required")]
    Unauthorized,

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis error: {0}")]
    Cache(String),

    #[error("External service error: {0}")]
    External(String),
}

impl AppError {
    /// HTTP 状态码映射
    pub fn status_code(&self) -> u16 {
        match self {
            Self::Unauthorized => 401,
            Self::Forbidden(_) => 403,
            Self::NotFound(_) => 404,
            Self::Conflict(_) => 409,
            Self::Validation(_) => 400,
            Self::Internal(_) | Self::Database(_) | Self::Cache(_) | Self::External(_) => 500,
        }
    }

    /// 错误码
    pub fn error_code(&self) -> i32 {
        match self {
            Self::Unauthorized => 1001,
            Self::Forbidden(_) => 1003,
            Self::NotFound(_) => 1004,
            Self::Conflict(_) => 1009,
            Self::Validation(_) => 1400,
            Self::Internal(_) => 1500,
            Self::Database(_) => 1501,
            Self::Cache(_) => 1502,
            Self::External(_) => 1503,
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self::Internal(e.to_string())
    }
}

/// 将 AppError 转换为 axum 响应
impl axum::response::IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let body = serde_json::json!({
            "code": self.error_code(),
            "message": self.to_string(),
            "data": null
        });

        let status = axum::http::StatusCode::from_u16(self.status_code())
            .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
        (status, axum::Json(body)).into_response()
    }
}
