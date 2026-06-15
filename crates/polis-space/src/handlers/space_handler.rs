use std::sync::Arc;

use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{
    CreateSpaceRequest, SpacePublic, UpdateSpaceRequest,
    SpaceModulePublic, CreateModuleRequest, UpdateModuleRequest,
};
use polis_core::token_blacklist::TokenBlacklist;
use async_nats::Client as NatsClient;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::SpaceServiceConfig;
use crate::repo::SpaceRepo;

pub struct SpaceHandler {
    pub repo: SpaceRepo,
    pub config: SpaceServiceConfig,
    pub nats: Option<NatsClient>,
    pub token_blacklist: Arc<TokenBlacklist>,
}

impl SpaceHandler {
    pub fn new(pool: PgPool, config: SpaceServiceConfig, nats: Option<NatsClient>) -> Self {
        Self {
            repo: SpaceRepo::new(pool),
            config,
            nats,
            token_blacklist: Arc::new(TokenBlacklist::new()),
        }
    }

    /// 创建社区
    pub async fn create_space(
        &self,
        user_id: Uuid,
        username: &str,
        req: CreateSpaceRequest,
    ) -> Result<SpacePublic, AppError> {
        // 验证 title
        let title = req.title.trim();
        if title.is_empty() {
            return Err(AppError::validation(
                "社区名称不能为空".to_string(),
            ));
        }
        if title.chars().count() > 50 {
            return Err(AppError::validation(
                "社区名称不能超过50个字符".to_string(),
            ));
        }

        // 验证 slug
        if req.slug.len() < 2 || req.slug.len() > 100 {
            return Err(AppError::validation(
                "Slug must be between 2 and 100 characters".to_string(),
            ));
        }

        // 构建 namespace - GitHub 风格: username/slug
        let namespace = format!("{}/{}", username, req.slug);

        // 检查 namespace 唯一性
        if self.repo.find_by_namespace(&namespace).await?.is_some() {
            return Err(AppError::conflict(format!(
                "Space '{}' already exists",
                namespace
            )));
        }

        let visibility = req
            .visibility
            .unwrap_or_default()
            .to_string();
        // 所有模块由 space_modules 表管理，不再使用旧 enabled_modules
        let enabled_modules = serde_json::json!([]);

        let description = req.description.unwrap_or_default();

        // 直接创建用户社区（不再创建根社区）
        let space = self
            .repo
            .create(
                &namespace,
                &req.slug,
                Some(user_id),
                false,
                None, // 不再关联根社区
                title,
                &description,
                &visibility,
                &enabled_modules,
            )
            .await?;

        // 创建默认"交流"模块
        if let Err(e) = self.repo.create_module(space.id, &CreateModuleRequest {
            name: "交流".to_string(),
            module_key: Some("forum".to_string()),
            mode: Some("free".to_string()),
            allowed_content_types: Some(vec!["article".to_string(), "video".to_string()]),
            icon: Some("💬".to_string()),
        }).await {
            tracing::warn!("Failed to create default module for space {}: {}", space.id, e);
        }

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
        })).await;

        // 发布成员加入事件
        self.publish_event(subjects::SPACE_MEMBER_JOINED, serde_json::json!({
            "space_id": space.id.to_string(),
            "user_id": user_id.to_string(),
            "role": "owner",
        })).await;

        Ok(space.into())
    }

    /// 将 Space 转为 SpacePublic，附上等级信息
    async fn space_to_public(&self, space: polis_core::models::Space) -> SpacePublic {
        let mut pub_space: SpacePublic = space.into();
        if let Ok((xp, level)) = self.repo.compute_space_level(pub_space.id).await {
            pub_space.level = Some(level);
            pub_space.xp = Some(xp);
        }
        if let Ok(count) = self.repo.get_follower_count(pub_space.id).await {
            pub_space.follower_count = count;
        }
        if let Ok(has) = self.repo.has_password(pub_space.id).await {
            pub_space.has_password = has;
        }
        if let Ok(count) = self.repo.get_star_count(pub_space.id).await {
            pub_space.star_count = count;
        }
        pub_space
    }

    /// 获取社区详情
    pub async fn get_space(&self, namespace: &str) -> Result<SpacePublic, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        Ok(self.space_to_public(space).await)
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
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 检查权限
        let role = self
            .repo
            .get_member_role(space.id, user_id)
            .await?
            .ok_or(AppError::forbidden(
                "You are not a member of this space".to_string(),
            ))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::forbidden(
                "Only owners and admins can update space settings".to_string(),
            ));
        }

        let updated = self.repo.update(space.id, &req).await?;
        Ok(self.space_to_public(updated).await)
    }

    /// 归档社区（软删除，仅 owner 可操作）
    pub async fn archive_space(&self, namespace: &str, user_id: Uuid) -> Result<(), AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("社区不存在".to_string()))?;

        let archived = self.repo.archive(space.id, user_id).await?;
        if !archived {
            return Err(AppError::forbidden("仅社区创建者可以删除社区".to_string()));
        }
        Ok(())
    }

    /// 获取根社区的子社区列表
    pub async fn get_sub_spaces(&self, slug: &str) -> Result<Vec<SpacePublic>, AppError> {
        let root = self
            .repo
            .find_root_by_slug(slug)
            .await?
            .ok_or(AppError::not_found("Root space not found".to_string()))?;

        let subspaces = self.repo.find_sub_spaces(root.id).await?;
        let mut result = Vec::new();
        for s in subspaces { result.push(self.space_to_public(s).await); }
        Ok(result)
    }

    /// 获取用户拥有的社区
    pub async fn get_user_spaces(&self, user_id: Uuid) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.find_by_owner(user_id).await?;
        let mut result = Vec::new();
        for s in spaces { result.push(self.space_to_public(s).await); }
        Ok(result)
    }

    /// 搜索社区
    pub async fn search_spaces(&self, query: &str, limit: u32) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.search(query, limit).await?;
        let mut result = Vec::new();
        for s in spaces { result.push(self.space_to_public(s).await); }
        Ok(result)
    }

    /// 获取热门社区
    pub async fn get_trending_spaces(&self, limit: u32) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.find_trending(limit).await?;
        let mut result = Vec::new();
        for s in spaces { result.push(self.space_to_public(s).await); }
        Ok(result)
    }

    /// 分页列出所有公开社区
    pub async fn list_spaces(&self, page: u32, page_size: u32) -> Result<(Vec<SpacePublic>, i64), AppError> {
        let (spaces, total) = self.repo.find_all(page, page_size).await?;
        let mut result = Vec::new();
        for s in spaces { result.push(self.space_to_public(s).await); }
        Ok((result, total))
    }

    /// 加入社区
    pub async fn join_space(&self, namespace: &str, user_id: Uuid, message: Option<&str>) -> Result<serde_json::Value, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        if space.visibility == "private" {
            // 私有社区需要审批，通知 owner
            self.repo.create_join_request(space.id, user_id, message).await?;
            if let Some(owner_id) = space.owner_id {
                if owner_id != user_id {
                    self.create_notification(owner_id, &space.namespace, user_id, "join_request", message, None).await;
                }
            }
            return Ok(serde_json::json!({
                "status": "pending",
                "message": "已提交加入申请，等待社区管理员审批"
            }));
        }

        self.repo.add_member(space.id, user_id, "member").await?;
        self.repo.update_member_count(space.id).await?;

        // 通知 owner
        if let Some(owner_id) = space.owner_id {
            if owner_id != user_id {
                self.create_notification(owner_id, &space.namespace, user_id, "join", None, None).await;
            }
        }

        self.publish_event(subjects::SPACE_MEMBER_JOINED, serde_json::json!({
            "space_id": space.id.to_string(),
            "user_id": user_id.to_string(),
            "role": "member",
        })).await;

        Ok(serde_json::json!({
            "status": "joined",
            "message": "已加入社区"
        }))
    }

    /// 离开社区
    pub async fn leave_space(&self, namespace: &str, user_id: Uuid) -> Result<(), AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 通知 owner（有人离开了）
        if let Some(owner_id) = space.owner_id {
            if owner_id != user_id {
                self.create_notification(owner_id, &space.namespace, user_id, "leave", None, None).await;
            }
        }

        self.repo.remove_member(space.id, user_id).await?;
        self.repo.update_member_count(space.id).await?;
        Ok(())
    }

    /// 封禁成员（owner/admin 操作，支持时长和原因）
    pub async fn ban_member(&self, namespace: &str, operator_id: Uuid, target_user_id: Uuid, reason: Option<&str>, duration_hours: Option<i32>) -> Result<serde_json::Value, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 检查操作者权限
        let role = self.repo.get_member_role(space.id, operator_id).await?
            .ok_or(AppError::forbidden("你不是该社区成员".to_string()))?;
        if role != "owner" && role != "admin" {
            return Err(AppError::forbidden("只有社区创建者和管理员可以封禁成员".to_string()));
        }

        // 不能封禁自己
        if operator_id == target_user_id {
            return Err(AppError::forbidden("不能封禁自己".to_string()));
        }

        self.repo.ban_member(space.id, target_user_id, reason, duration_hours).await?;
        self.repo.update_member_count(space.id).await?;

        // 创建通知
        self.create_notification(target_user_id, &space.namespace, operator_id, "ban", reason, duration_hours).await;

        let msg = match duration_hours {
            Some(h) => format!("已封禁 {} 小时", h),
            None => "已永久封禁".to_string(),
        };
        Ok(serde_json::json!({"status": "banned", "message": msg}))
    }

    /// 解封成员
    pub async fn unban_member(&self, namespace: &str, operator_id: Uuid, target_user_id: Uuid) -> Result<serde_json::Value, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        let role = self.repo.get_member_role(space.id, operator_id).await?
            .ok_or(AppError::forbidden("你不是该社区成员".to_string()))?;
        if role != "owner" && role != "admin" {
            return Err(AppError::forbidden("只有社区创建者和管理员可以解封成员".to_string()));
        }

        self.repo.unban_member(space.id, target_user_id).await?;
        self.repo.update_member_count(space.id).await?;
        Ok(serde_json::json!({"status": "unbanned", "message": "已解封"}))
    }

    /// 设置成员角色（owner 操作）
    pub async fn set_member_role(&self, namespace: &str, operator_id: Uuid, target_user_id: Uuid, new_role: &str) -> Result<serde_json::Value, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 检查操作者权限
        let operator_role = self.repo.get_member_role(space.id, operator_id).await?
            .ok_or(AppError::forbidden("你不是该社区成员".to_string()))?;
        if operator_role != "owner" {
            return Err(AppError::forbidden("只有社区创建者可以设置管理员".to_string()));
        }

        // 验证角色
        let role_label = match new_role {
            "admin" => "管理员",
            "moderator" => "版主",
            "member" => "成员",
            _ => return Err(AppError::validation("无效的角色".to_string())),
        };

        // 不能修改自己的角色
        if operator_id == target_user_id {
            return Err(AppError::forbidden("不能修改自己的角色".to_string()));
        }

        self.repo.set_member_role(space.id, target_user_id, new_role).await?;

        // 通知被修改者
        self.create_notification(target_user_id, &space.namespace, operator_id, "role_change", Some(role_label), None).await;

        Ok(serde_json::json!({"status": "ok", "message": format!("已设为{}", role_label)}))
    }

    /// 获取加入申请列表（owner/admin 操作）
    pub async fn list_join_requests(&self, namespace: &str, operator_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 检查操作者权限
        let role = self.repo.get_member_role(space.id, operator_id).await?
            .ok_or(AppError::forbidden("你不是该社区成员".to_string()))?;
        if role != "owner" && role != "admin" {
            return Err(AppError::forbidden("只有社区创建者和管理员可以查看申请列表".to_string()));
        }

        self.repo.list_join_requests(space.id).await
    }

    /// 审批加入申请（owner/admin 操作）
    pub async fn review_join_request(&self, namespace: &str, operator_id: Uuid, target_user_id: Uuid, approved: bool) -> Result<serde_json::Value, AppError> {
        let space = self
            .repo
            .find_by_namespace(namespace)
            .await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 检查操作者权限
        let role = self.repo.get_member_role(space.id, operator_id).await?
            .ok_or(AppError::forbidden("你不是该社区成员".to_string()))?;
        if role != "owner" && role != "admin" {
            return Err(AppError::forbidden("只有社区创建者和管理员可以审批申请".to_string()));
        }

        self.repo.review_join_request(space.id, target_user_id, approved, operator_id).await?;

        if approved {
            // 通知申请人
            self.create_notification(target_user_id, &space.namespace, operator_id, "join_approved", None, None).await;

            self.publish_event(subjects::SPACE_MEMBER_JOINED, serde_json::json!({
                "space_id": space.id.to_string(),
                "user_id": target_user_id.to_string(),
                "role": "member",
            })).await;
            Ok(serde_json::json!({"status": "approved", "message": "已通过加入申请"}))
        } else {
            self.create_notification(target_user_id, &space.namespace, operator_id, "join_rejected", None, None).await;
            Ok(serde_json::json!({"status": "rejected", "message": "已拒绝加入申请"}))
        }
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
                if let Err(e) = nats.publish(subject.to_string(), data.into()).await {
                    tracing::warn!("Failed to publish event {}: {}", subject, e);
                }
            }
        }
    }

    /// 创建空间事件通知
    async fn create_notification(&self, user_id: Uuid, space_ns: &str, actor_id: Uuid, event_type: &str, extra: Option<&str>, duration_hours: Option<i32>) {
        if user_id == actor_id { return; }

        let typ = format!("space_{}", event_type);
        let content = match event_type {
            "join" => "有人加入了你的社区".to_string(),
            "leave" => "有人退出了你的社区".to_string(),
            "join_request" => {
                let msg = extra.unwrap_or("");
                if msg.is_empty() {
                    "有人申请加入你的社区".to_string()
                } else {
                    format!("有人申请加入你的社区，留言：{}", msg)
                }
            }
            "join_approved" => "你的加入申请已被通过".to_string(),
            "join_rejected" => "你的加入申请已被拒绝".to_string(),
            "ban" => {
                let reason = extra.unwrap_or("");
                let dur = match duration_hours {
                    Some(h) => format!("（{}小时）", h),
                    None => "（永久）".to_string(),
                };
                if reason.is_empty() {
                    format!("你已被封禁出社区{}", dur)
                } else {
                    format!("你已被封禁：{} {}", reason, dur)
                }
            }
            "role_change" => format!("你的社区角色已被设为：{}", extra.unwrap_or("成员")),
            _ => format!("社区事件：{}", event_type),
        };

        if let Err(e) = sqlx::query(
            "INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(user_id).bind(&typ).bind(actor_id)
        .bind("space").bind(space_ns)
        .bind(&content)
        .execute(&self.repo.pool)
        .await {
            tracing::warn!("Failed to create space notification for user {} type {}: {}", user_id, typ, e);
        }
    }

    /// 关注社区
    pub async fn follow_space(&self, namespace: &str, user_id: Uuid) -> Result<bool, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        let following = self.repo.follow_space(space.id, user_id).await?;

        // 通知社区 owner
        if let Some(owner_id) = space.owner_id {
            if owner_id != user_id {
                self.create_notification(owner_id, &space.namespace, user_id, "follow", None, None).await;
            }
        }

        Ok(following)
    }

    /// 取消关注社区
    pub async fn unfollow_space(&self, namespace: &str, user_id: Uuid) -> Result<bool, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        let following = self.repo.unfollow_space(space.id, user_id).await?;
        Ok(following)
    }

    /// 收藏社区
    pub async fn star_space(&self, namespace: &str, user_id: Uuid) -> Result<bool, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        let starred = self.repo.star_space(space.id, user_id).await?;
        Ok(starred)
    }

    /// 取消收藏社区
    pub async fn unstar_space(&self, namespace: &str, user_id: Uuid) -> Result<bool, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        let starred = self.repo.unstar_space(space.id, user_id).await?;
        Ok(starred)
    }

    /// 获取用户收藏的社区列表
    pub async fn get_starred_spaces(&self, user_id: Uuid) -> Result<Vec<SpacePublic>, AppError> {
        let ids = self.repo.get_starred_spaces(user_id).await?;
        let mut spaces = Vec::new();
        for id in ids {
            if let Ok(Some(space)) = self.repo.find_by_id(id).await {
                spaces.push(self.space_to_public(space).await);
            }
        }
        Ok(spaces)
    }

    /// 获取最多收藏的社区
    pub async fn get_most_starred(&self, limit: u32) -> Result<Vec<SpacePublic>, AppError> {
        let spaces = self.repo.find_most_starred(limit as i64).await?;
        let mut result = Vec::new();
        for space in spaces {
            result.push(self.space_to_public(space).await);
        }
        Ok(result)
    }

    // ==================== 自定义模块 CRUD ====================

    /// 列表社区所有模块
    pub async fn list_modules(&self, namespace: &str) -> Result<Vec<SpaceModulePublic>, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;
        let modules = self.repo.list_modules(space.id).await?;
        Ok(modules.into_iter().map(|m| m.into()).collect())
    }

    /// 创建模块（仅 owner）
    pub async fn create_module(&self, namespace: &str, user_id: Uuid, req: CreateModuleRequest) -> Result<SpaceModulePublic, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        // 仅 owner 可创建模块
        let role = self.repo.get_member_role(space.id, user_id).await?;
        if role != Some("owner".to_string()) {
            return Err(AppError::forbidden("仅社区创建者可管理模块".to_string()));
        }

        // 验证 name
        let name = req.name.trim();
        if name.is_empty() {
            return Err(AppError::validation("模块名称不能为空".to_string()));
        }
        if name.chars().count() > 10 {
            return Err(AppError::validation("模块名称不能超过10个字符".to_string()));
        }

        let m = self.repo.create_module(space.id, &CreateModuleRequest {
            name: name.to_string(),
            module_key: req.module_key.clone(),
            mode: req.mode.clone(),
            allowed_content_types: req.allowed_content_types.clone(),
            icon: req.icon.clone(),
        }).await?;

        Ok(m.into())
    }

    /// 更新模块（仅 owner）
    pub async fn update_module(&self, namespace: &str, module_key: &str, user_id: Uuid, req: UpdateModuleRequest) -> Result<SpaceModulePublic, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        let role = self.repo.get_member_role(space.id, user_id).await?;
        if role != Some("owner".to_string()) {
            return Err(AppError::forbidden("仅社区创建者可管理模块".to_string()));
        }

        if let Some(ref name) = req.name {
            if name.chars().count() > 10 {
                return Err(AppError::validation("模块名称不能超过10个字符".to_string()));
            }
        }

        let m = self.repo.update_module(space.id, module_key, &req).await?
            .ok_or(AppError::not_found("模块不存在".to_string()))?;

        Ok(m.into())
    }

    /// 删除模块（仅 owner）
    pub async fn delete_module(&self, namespace: &str, module_key: &str, user_id: Uuid) -> Result<bool, AppError> {
        let space = self.repo.find_by_namespace(namespace).await?
            .ok_or(AppError::not_found("Space not found".to_string()))?;

        let role = self.repo.get_member_role(space.id, user_id).await?;
        if role != Some("owner".to_string()) {
            return Err(AppError::forbidden("仅社区创建者可管理模块".to_string()));
        }

        self.repo.delete_module(space.id, module_key).await
    }
}
