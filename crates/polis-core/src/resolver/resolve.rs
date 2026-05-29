//! namespace → space_id 的实时 SQL 查询解析
//! 所有服务通过此函数解析命名空间，避免 TODO 占位符

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;


/// 根据 namespace 查询 space_id
/// namespace 格式: "slug" (根社区) 或 "username/slug" (用户社区)
/// 支持 URL 安全编码：`~` 会被还原为 `/`（避免 Next.js 拦截 `%2F`）
pub async fn resolve_space_id(pool: &PgPool, namespace: &str) -> Result<Uuid, AppError> {
    let namespace = namespace.replace('~', "/");
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM spaces WHERE namespace = $1 AND status = 'active'"
    )
    .bind(&namespace)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    row.map(|r| r.0)
        .ok_or_else(|| AppError::NotFound(format!("Space '{}' not found", namespace)))
}

/// 根据 namespace 查询 space_id，返回 Option
pub async fn resolve_space_id_optional(pool: &PgPool, namespace: &str) -> Result<Option<Uuid>, AppError> {
    let namespace = namespace.replace('~', "/");
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM spaces WHERE namespace = $1 AND status = 'active'"
    )
    .bind(&namespace)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(row.map(|r| r.0))
}

/// 查询空间已启用的模块列表（从 space_modules 表读取）
pub async fn resolve_space_enabled_modules(pool: &PgPool, space_id: Uuid) -> Result<Vec<String>, AppError> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT module_key FROM space_modules WHERE space_id = $1 AND is_active = true ORDER BY sort_order"
    )
    .bind(space_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    if rows.is_empty() {
        return Ok(vec!["forum".to_string()]);
    }

    let mut modules: Vec<String> = rows.into_iter().map(|(k,)| k).collect();

    // forum/article 别名兼容
    if modules.contains(&"forum".to_string()) && !modules.contains(&"article".to_string()) {
        modules.push("article".to_string());
    }
    if modules.contains(&"article".to_string()) && !modules.contains(&"forum".to_string()) {
        modules.push("forum".to_string());
    }
    Ok(modules)
}

/// 根据 slug 查询根社区 space_id
pub async fn resolve_root_space_id(pool: &PgPool, slug: &str) -> Result<Uuid, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM spaces WHERE slug = $1 AND is_root = TRUE AND status = 'active'"
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    row.map(|r| r.0)
        .ok_or_else(|| AppError::NotFound(format!("Root space '{}' not found", slug)))
}
