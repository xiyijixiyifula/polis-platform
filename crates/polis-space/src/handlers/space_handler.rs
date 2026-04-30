use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{
    CreateSpaceRequest, Space, SpacePublic, Membership, UpdateSpaceRequest, ApiResponse,
};
use async_nats::Client as NatsClient;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::SpaceServiceConfig;
use crate::repo::SpaceRepo;

pub struct SpaceHandler {
    pub repo: SpaceRepo,
    pub config: SpaceServiceConfig,
    pub nats: Option<NatsClient>,
}

impl SpaceHandler {
    pub fn new(pool: PgPool, config: SpaceServiceConfig, nats: Option<NatsClient>) -> Self {
        Self {
            repo: SpaceRepo::new(pool),
            config,
            nats,
        }
    }

    /// 创建社区
    pub async fn create_space(
        &self,
        user_id: Uuid,
        username: &str,
        req: CreateSpaceRequest,
    ) -> Result<SpacePublic, AppError> {
        // 验证 slug
        if req.slug.len() < 2 || req.slug.len() > 100 {
            return Err(AppError::Validation(
                "Slug must be between 2 and 100 characters".to_string(),
            ));
        }

        // 检查是否存在根社区
        let root_space = self.repo.find_root_by_slug(&req.slug).await?;
        let (is_root, root_space_id) = if let Some(ref root) = root_space {
            // 已有根社区，创建用户子社区
            (false, Some(root.id))
        } else {
            // 没有根社区，同时创建根社区和用户社区
            (true, None)
        };

        // 构建 namespace - GitHub 风格: username/slug
        let namespace = format!("{}/{}", username, req.slug);

        // 检查 namespace 唯一性
        if let Some(_) = self.repo.find_by_namespace(&namespace).await? {
            return Err(AppError::Conflict(format!(
                "Space '{}' already exists",
                namespace
            )));
        }

        let visibility = req
            .visibility
            .unwrap_or_default()
            .to_string();
        let enabled_modules = req
            .enabled_modules
            .as_ref()
            .map(|m| serde_json::to_value(m).unwrap_or_else(|_| serde_json::json!(["forum"])))
            .unwrap_or_else(|| serde_json::json!(["forum"]));

        let description = req.description.unwrap_or_default();

        // 如果是根社区，先创建根社区
        let root_id = if is_root {
            let root = self
                .repo
                .create(
                    &req.slug,
                    &req.slug,
                    None, // 根社区没有 owner
                    true,
                    None,
                    &req.title,
                    &description,
                    &visibility,
                    &enabled_modules,
                )
                .await?;

            // 发布根社区创建事件
            self.publish_event(subjects::SPACE_CREATED, serde_json::json!({
                "space_id": root.id.to_string(),
                "namespace": root.namespace,
                "is_root": true,
            })).await;

            Some(root.id)
        } else {
            root_space_id
        };

        // 创建用户社区
        let space = self
            .repo
            .create(
                &namespace,
                &req.slug,
                Some(user_id),
                false,
                root_id,
                &req.title,
                &description,
                &visibility,
                &enabled_modules,
            )
            .await?;

        // 将创建者添加为 Owner
        self.repo
            .add_member(space.id, user_id, "owner")
            .await?;
        self.repo.update_member_count(space.id).await?;

        // 发布事件
        self.publish_event(subjects::SPACE_CREATED, serde_json::json!({
            "space_id": space.id.to_string(),
            "namespace": space.namespace,
            "owner_id": user_id.to_string(),
            "is_root": false,
            "root_space_id": root_id.map(|id: Uuid| id.to_string()),
        })).await;

        // 发布成员加入事件
        self.publish_event(subjects::SPACE_MEMBER_JOINED, serde_json::json!({
            "space_id": space.id.to_string(),
            "user_id": user_id.to_string(),
            "role": "owner",
        })).await;

        Ok(space.into())
    }

    /// 获取社区详情
    pub async fn get_space(&self, namespace: &str) -> Result<SpacePublic, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::NotFound("Space not found".to_string()))?;
        Ok(space.into())
    }

    /// 更新社区
    pub async fn update_space(
        &self,
        namespace: &str,
        user_id: Uuid,
        req: UpdateSpaceRequest,
    ) -> Result<SpacePublic, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::NotFound("Space not found".to_string()))?;

        // 检查权限
        let role = self
            .repo
            .get_member_role(space.id, user_id)
            .await?
            .ok_or(AppError::Forbidden(
                "You are not a member of this space".to_string(),
            ))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden(
                "Only owners and admins can update space settings".to_string(),
            ));
        }

        let updated = self.repo.update(space.id, &req).await?;
        Ok(updated.into())
    }

    /// 获取根社区的子社区列表
    pub async fn get_sub_spaces(&self, slug: &str) -> Result<Vec<SpacePublic>, AppError> {
        let root = self
            .repo
            .find_root_by_slug(slug)
            .await?
            .ok_or(AppError::NotFound("Root space not found".to_string()))?;

        let subspaces = self.repo.find_sub_spaces(root.id).await?;
        Ok(subspaces.into_iter().map(|s| s.into()).collect())
    }

    /// 获取用户拥有的社区
    pub async fn get_user_spaces(&self, user_id: Uuid) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.find_by_owner(user_id).await?;
        Ok(spaces.into_iter().map(|s| s.into()).collect())
    }

    /// 获取热门社区
    pub async fn get_trending_spaces(&self, limit: u32) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.find_trending(limit).await?;
        Ok(spaces.into_iter().map(|s| s.into()).collect())
    }

    /// 加入社区
    pub async fn join_space(&self, namespace: &str, user_id: Uuid) -> Result<(), AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::NotFound("Space not found".to_string()))?;

        if space.visibility == "private" {
            // 私有社区需要邀请
            return Err(AppError::Forbidden(
                "This is a private space. You need an invitation to join.".to_string(),
            ));
        }

        self.repo.add_member(space.id, user_id, "member").await?;
        self.repo.update_member_count(space.id).await?;

        self.publish_event(subjects::SPACE_MEMBER_JOINED, serde_json::json!({
            "space_id": space.id.to_string(),
            "user_id": user_id.to_string(),
            "role": "member",
        })).await;

        Ok(())
    }

    /// 离开社区
    pub async fn leave_space(&self, namespace: &str, user_id: Uuid) -> Result<(), AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::NotFound("Space not found".to_string()))?;

        self.repo.remove_member(space.id, user_id).await?;
        self.repo.update_member_count(space.id).await?;
        Ok(())
    }

    /// 发布事件
    async fn publish_event(&self, subject: &str, payload: serde_json::Value) {
        if let Some(ref nats) = self.nats {
            let event = Event {
                id: Uuid::new_v4().to_string(),
                subject: subject.to_string(),
                source: "space-service".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
                payload,
            };
            if let Ok(data) = serde_json::to_vec(&event) {
                let _ = nats.publish(subject.to_string(), data.into()).await;
            }
        }
    }
}
