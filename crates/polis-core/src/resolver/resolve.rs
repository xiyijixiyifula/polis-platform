//! namespace → space_id 的实时 SQL 查询解析
//! 所有服务通过此函数解析命名空间，避免 TODO 占位符

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;


/// 根据 namespace 查询 space_id
/// namespace 格式: "slug" (根社区) 或 "username/slug" (用户社区)
pub async fn resolve_space_id(pool: &PgPool, namespace: &str) -> Result<Uuid, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM spaces WHERE namespace = $1 AND status = 'active'"
    )
    .bind(namespace)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    row.map(|r| r.0)
        .ok_or_else(|| AppError::NotFound(format!("Space '{}' not found", namespace)))
}

/// 根据 namespace 查询 space_id，返回 Option
pub async fn resolve_space_id_optional(pool: &PgPool, namespace: &str) -> Result<Option<Uuid>, AppError> {
    let row: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM spaces WHERE namespace = $1 AND status = 'active'"
    )
    .bind(namespace)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    Ok(row.map(|r| r.0))
}

/// 查询空间已启用的模块列表 (JSONB → Vec<String>)
pub async fn resolve_space_enabled_modules(pool: &PgPool, space_id: Uuid) -> Result<Vec<String>, AppError> {
    let row: Option<(serde_json::Value,)> = sqlx::query_as(
        "SELECT enabled_modules FROM spaces WHERE id = $1 AND status = 'active'"
    )
    .bind(space_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    match row {
        Some((value,)) => {
            let modules: Vec<String> = serde_json::from_value(value).unwrap_or_default();
            Ok(if modules.is_empty() { vec!["forum".to_string()] } else { modules })
        }
        None => Ok(vec!["forum".to_string()]),
    }
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
