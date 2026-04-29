use polis_core::error::AppError;
use polis_core::models::{CreateSpaceRequest, Space, SpacePublic, Membership, UpdateSpaceRequest};
use sqlx::PgPool;
use uuid::Uuid;

/// 社区数据访问层
pub struct SpaceRepo {
    pool: PgPool,
}

impl SpaceRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 创建社区
    pub async fn create(
        &self,
        namespace: &str,
        slug: &str,
        owner_id: Option<Uuid>,
        is_root: bool,
        root_space_id: Option<Uuid>,
        title: &str,
        description: &str,
        visibility: &str,
        enabled_modules: &serde_json::Value,
    ) -> Result<Space, AppError> {
        let space = sqlx::query_as::<_, Space>(
            r#"
            INSERT INTO spaces (namespace, slug, owner_id, is_root, root_space_id, title, description, visibility, enabled_modules)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(namespace)
        .bind(slug)
        .bind(owner_id)
        .bind(is_root)
        .bind(root_space_id)
        .bind(title)
        .bind(description)
        .bind(visibility)
        .bind(enabled_modules)
        .fetch_one(&self.pool)
        .await?;
        Ok(space)
    }

    /// 根据 namespace 查找社区
    pub async fn find_by_namespace(&self, namespace: &str) -> Result<Option<Space>, AppError> {
        let space = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE namespace = $1 AND status = 'active'",
        )
        .bind(namespace)
        .fetch_optional(&self.pool)
        .await?;
        Ok(space)
    }

    /// 根据 ID 查找社区
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Space>, AppError> {
        let space = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(space)
    }

    /// 更新社区
    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateSpaceRequest,
    ) -> Result<Space, AppError> {
        let space = sqlx::query_as::<_, Space>(
            r#"
            UPDATE spaces
            SET title = COALESCE($2, title),
                description = COALESCE($3, description),
                icon_url = COALESCE($4, icon_url),
                banner_url = COALESCE($5, banner_url),
                visibility = COALESCE($6, visibility),
                custom_rules = COALESCE($7, custom_rules),
                enabled_modules = COALESCE($8, enabled_modules),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.icon_url)
        .bind(&req.banner_url)
        .bind(&req.visibility.as_ref().map(|v| v.to_string()))
        .bind(&req.custom_rules)
        .bind(&req.enabled_modules.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
        .fetch_one(&self.pool)
        .await?;
        Ok(space)
    }

    /// 搜索根社区（无 owner_id）
    pub async fn find_root_by_slug(&self, slug: &str) -> Result<Option<Space>, AppError> {
        let space = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE slug = $1 AND is_root = TRUE AND status = 'active'",
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;
        Ok(space)
    }

    /// 获取根社区的关联用户社区
    pub async fn find_sub_spaces(&self, root_space_id: Uuid) -> Result<Vec<Space>, AppError> {
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE root_space_id = $1 AND status = 'active' ORDER BY member_count DESC",
        )
        .bind(root_space_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(spaces)
    }

    /// 获取用户拥有的社区
    pub async fn find_by_owner(&self, owner_id: Uuid) -> Result<Vec<Space>, AppError> {
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE owner_id = $1 AND status = 'active' ORDER BY created_at DESC",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(spaces)
    }

    /// 获取热门社区
    pub async fn find_trending(&self, limit: u32) -> Result<Vec<Space>, AppError> {
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE status = 'active' AND visibility = 'public' ORDER BY member_count DESC LIMIT $1",
        )
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(spaces)
    }

    // ===== 成员管理 =====

    /// 添加成员
    pub async fn add_member(
        &self,
        space_id: Uuid,
        user_id: Uuid,
        role: &str,
    ) -> Result<Membership, AppError> {
        let membership = sqlx::query_as::<_, Membership>(
            r#"
            INSERT INTO memberships (space_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (space_id, user_id)
            DO UPDATE SET role = $3
            RETURNING *
            "#,
        )
        .bind(space_id)
        .bind(user_id)
        .bind(role)
        .fetch_one(&self.pool)
        .await?;
        Ok(membership)
    }

    /// 移除成员
    pub async fn remove_member(&self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM memberships WHERE space_id = $1 AND user_id = $2")
            .bind(space_id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 获取社区所有成员
    pub async fn get_members(&self, space_id: Uuid) -> Result<Vec<Membership>, AppError> {
        let members = sqlx::query_as::<_, Membership>(
            "SELECT * FROM memberships WHERE space_id = $1 AND role != 'banned' ORDER BY joined_at ASC",
        )
        .bind(space_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(members)
    }

    /// 获取用户在社区的角色
    pub async fn get_member_role(
        &self,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<String>, AppError> {
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT role FROM memberships WHERE space_id = $1 AND user_id = $2",
        )
        .bind(space_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| r.0))
    }

    /// 更新成员计数
    pub async fn update_member_count(&self, space_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE spaces
            SET member_count = (SELECT COUNT(*) FROM memberships WHERE space_id = $1 AND role != 'banned')
            WHERE id = $1
            "#,
        )
        .bind(space_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
