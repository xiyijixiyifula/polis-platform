//! 平台统计数据查询
use polis_core::admin::PlatformStats;
use polis_core::error::AppError;
use sqlx::PgPool;

pub async fn get_platform_stats(pool: &PgPool) -> Result<PlatformStats, AppError> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM spaces WHERE status = 'active') as total_spaces,
            (SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE) as total_posts,
            (SELECT COUNT(*) FROM comments WHERE is_deleted = FALSE) as total_comments,
            (SELECT COUNT(*) FROM transactions) as total_transactions,
            (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day') as new_users_today,
            (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '1 day') as new_posts_today,
            (SELECT COUNT(*) FROM reports WHERE status = 'pending') as reported_content,
            (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '1 day') as active_users_today"
    ).fetch_one(pool).await?;

    Ok(PlatformStats {
        total_users: row.get("total_users"),
        total_spaces: row.get("total_spaces"),
        total_posts: row.get("total_posts"),
        total_comments: row.get("total_comments"),
        total_transactions: row.get("total_transactions"),
        active_users_today: row.get("active_users_today"),
        new_users_today: row.get("new_users_today"),
        new_posts_today: row.get("new_posts_today"),
        storage_used_mb: 0.0,
        reported_content: row.get("reported_content"),
    })
}

/// 获取用户列表 (分页)
pub async fn list_users(
    pool: &PgPool,
    page: u32,
    page_size: u32,
) -> Result<Vec<serde_json::Value>, AppError> {
    let offset = ((page - 1) * page_size) as i64;
    let limit = page_size as i64;
    let rows = sqlx::query_as::<_, (serde_json::Value,)>(
        "SELECT json_build_object('id', id, 'username', username, 'display_name', display_name, 'email', CONCAT(LEFT(email, 3), '***', SUBSTRING(email FROM POSITION('@' IN email))), 'verified', verified, 'bio', bio, 'created_at', created_at, 'updated_at', updated_at) FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| r.0).collect())
}

/// 获取社区列表 (分页)
pub async fn list_spaces(
    pool: &PgPool,
    page: u32,
    page_size: u32,
) -> Result<Vec<serde_json::Value>, AppError> {
    let offset = ((page - 1) * page_size) as i64;
    let limit = page_size as i64;
    let rows = sqlx::query_as::<_, (serde_json::Value,)>(
        "SELECT json_build_object('id', id, 'namespace', namespace, 'title', title, 'owner_id', owner_id, 'is_root', is_root, 'visibility', visibility, 'status', status, 'member_count', member_count, 'post_count', post_count, 'created_at', created_at) FROM spaces ORDER BY member_count DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| r.0).collect())
}

/// 获取帖子列表 (分页)
pub async fn list_all_posts(
    pool: &PgPool,
    page: u32,
    page_size: u32,
) -> Result<Vec<serde_json::Value>, AppError> {
    let offset = ((page - 1) * page_size) as i64;
    let limit = page_size as i64;
    let rows = sqlx::query_as::<_, (serde_json::Value,)>(
        "SELECT json_build_object('id', id, 'space_id', space_id, 'module_type', module_type, 'author_id', author_id, 'title', title, 'is_featured', is_featured, 'is_deleted', is_deleted, 'view_count', view_count, 'like_count', like_count, 'created_at', created_at) FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| r.0).collect())
}
