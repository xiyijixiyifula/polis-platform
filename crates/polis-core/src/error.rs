use thiserror::Error;

/// 错误类型枚举（内部使用）
#[derive(Debug, Error)]
pub enum AppErrorKind {
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

    #[error("Too many requests: {0}")]
    TooManyRequests(String),
}

/// 统一的错误类型（带请求上下文）
#[derive(Debug)]
pub struct AppError {
    pub kind: AppErrorKind,
    pub request_id: Option<String>,
    pub user_id: Option<String>,
}

impl AppError {
    /// 创建无上下文的错误
    fn from_kind(kind: AppErrorKind) -> Self {
        Self {
            kind,
            request_id: None,
            user_id: None,
        }
    }

    // ── 便捷构造器（替代原枚举变体） ──

    pub fn unauthorized() -> Self {
        Self::from_kind(AppErrorKind::Unauthorized)
    }

    pub fn forbidden(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::Forbidden(msg.into()))
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::NotFound(msg.into()))
    }

    pub fn conflict(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::Conflict(msg.into()))
    }

    pub fn validation(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::Validation(msg.into()))
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::Internal(msg.into()))
    }

    pub fn database(e: sqlx::Error) -> Self {
        Self::from_kind(AppErrorKind::Database(e))
    }

    pub fn cache(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::Cache(msg.into()))
    }

    pub fn external(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::External(msg.into()))
    }

    pub fn too_many_requests(msg: impl Into<String>) -> Self {
        Self::from_kind(AppErrorKind::TooManyRequests(msg.into()))
    }

    // ── Builder 方法 ──

    pub fn with_request_id(mut self, id: impl Into<String>) -> Self {
        self.request_id = Some(id.into());
        self
    }

    pub fn with_user_id(mut self, id: impl Into<String>) -> Self {
        self.user_id = Some(id.into());
        self
    }

    // ── 查询方法 ──

    /// 错误类型名称（用于遥测标签）
    pub fn error_type(&self) -> &'static str {
        match &self.kind {
            AppErrorKind::Unauthorized => "Unauthorized",
            AppErrorKind::Forbidden(_) => "Forbidden",
            AppErrorKind::NotFound(_) => "NotFound",
            AppErrorKind::Conflict(_) => "Conflict",
            AppErrorKind::Validation(_) => "Validation",
            AppErrorKind::Internal(_) => "Internal",
            AppErrorKind::Database(_) => "Database",
            AppErrorKind::Cache(_) => "Cache",
            AppErrorKind::External(_) => "External",
            AppErrorKind::TooManyRequests(_) => "TooManyRequests",
        }
    }

    /// HTTP 状态码映射
    pub fn status_code(&self) -> u16 {
        match &self.kind {
            AppErrorKind::Unauthorized => 401,
            AppErrorKind::Forbidden(_) => 403,
            AppErrorKind::NotFound(_) => 404,
            AppErrorKind::Conflict(_) => 409,
            AppErrorKind::Validation(_) => 400,
            AppErrorKind::Internal(_)
            | AppErrorKind::Database(_)
            | AppErrorKind::Cache(_)
            | AppErrorKind::External(_) => 500,
            AppErrorKind::TooManyRequests(_) => 429,
        }
    }

    /// 错误码
    pub fn error_code(&self) -> i32 {
        match &self.kind {
            AppErrorKind::Unauthorized => 1001,
            AppErrorKind::Forbidden(_) => 1003,
            AppErrorKind::NotFound(_) => 1004,
            AppErrorKind::Conflict(_) => 1009,
            AppErrorKind::Validation(_) => 1400,
            AppErrorKind::Internal(_) => 1500,
            AppErrorKind::Database(_) => 1501,
            AppErrorKind::Cache(_) => 1502,
            AppErrorKind::External(_) => 1503,
            AppErrorKind::TooManyRequests(_) => 1429,
        }
    }
}

// ── 标准 trait 实现（委托给 kind） ──

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.kind, f)
    }
}

impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.kind.source()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        Self::database(e)
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self::internal(e.to_string())
    }
}

impl From<AppErrorKind> for AppError {
    fn from(kind: AppErrorKind) -> Self {
        Self::from_kind(kind)
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
