use polis_core::error::AppError;
use polis_core::models::{
    CommunityModuleRef, Creation, CreationPublic, CreateCreationRequest,
    ListCreationsQuery, ListModuleRefsQuery, ModuleRefPublic, Pagination,
    ReviewRefRequest, SpaceMini, SubmissionInfo, SubmitToCommunityRequest,
    UpdateCreationRequest, UserPublic,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::repo::ContentRepo;

pub struct CreationHandler {
    pub repo: ContentRepo,
    pub pool: PgPool,
}

impl CreationHandler {
    pub fn new(pool: PgPool) -> Self {
        Self {
            repo: ContentRepo::new(pool.clone()),
            pool,
        }
    }

    // ==================== 创作数据 CRUD ====================

    /// 创建创作数据
    pub async fn create_creation(
        &self,
        user_id: Uuid,
        req: CreateCreationRequest,
    ) -> Result<Creation, AppError> {
        let creation = sqlx::query_as::<_, Creation>(
            r#"
            INSERT INTO creations (
                creator_id, content_type, title, body, cover_url,
                media_urls, tags, visibility, password_hash, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published')
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(&req.content_type)
        .bind(&req.title)
        .bind(&req.body)
        .bind(&req.cover_url)
        .bind(serde_json::to_value(req.media_urls.unwrap_or_default()).unwrap_or_default())
        .bind(serde_json::to_value(req.tags.unwrap_or_default()).unwrap_or_default())
        .bind(req.visibility.map(|v| v.to_string()).unwrap_or_else(|| "public".to_string()))
        .bind(req.password)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(creation)
    }

    /// 获取我的创作列表
    pub async fn list_my_creations(
        &self,
        user_id: Uuid,
        query: ListCreationsQuery,
    ) -> Result<(Vec<CreationPublic>, Pagination), AppError> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let offset = ((page as i64) - 1) * (page_size as i64);

        let creations = sqlx::query_as::<_, Creation>(
            r#"
            SELECT * FROM creations
            WHERE creator_id = $1
              AND ($2::text IS NULL OR content_type = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::text IS NULL OR visibility = $4)
            ORDER BY created_at DESC
            LIMIT $5 OFFSET $6
            "#,
        )
        .bind(user_id)
        .bind(&query.content_type)
        .bind(&query.status)
        .bind(&query.visibility)
        .bind(page_size as i64)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM creations
            WHERE creator_id = $1
              AND ($2::text IS NULL OR content_type = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::text IS NULL OR visibility = $4)
            "#,
        )
        .bind(user_id)
        .bind(&query.content_type)
        .bind(&query.status)
        .bind(&query.visibility)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        let mut public_list = Vec::new();
        for creation in creations {
            let public = creation_to_public(&self.pool, creation, user_id).await?;
            public_list.push(public);
        }

        let pagination = Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        };

        Ok((public_list, pagination))
    }

    /// 公开获取某用户的创作列表（无需登录，仅返回公开作品）
    pub async fn list_user_public_creations(
        &self,
        username: &str,
        query: ListCreationsQuery,
        current_user_id: Option<Uuid>,
    ) -> Result<(Vec<CreationPublic>, Pagination), AppError> {
        // 先查用户
        let user: polis_core::models::User = sqlx::query_as(
            "SELECT * FROM users WHERE username = $1",
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::NotFound("用户不存在".to_string()))?;

        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let offset = ((page as i64) - 1) * (page_size as i64);

        let creations = sqlx::query_as::<_, Creation>(
            r#"
            SELECT * FROM creations
            WHERE creator_id = $1
              AND visibility != 'private'
              AND ($2::text IS NULL OR content_type = $2)
              AND ($3::text IS NULL OR status = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(user.id)
        .bind(&query.content_type)
        .bind(&query.status)
        .bind(page_size as i64)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM creations
            WHERE creator_id = $1
              AND visibility != 'private'
              AND ($2::text IS NULL OR content_type = $2)
              AND ($3::text IS NULL OR status = $3)
            "#,
        )
        .bind(user.id)
        .bind(&query.content_type)
        .bind(&query.status)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        let uid = current_user_id.unwrap_or_default();
        let mut public_list = Vec::new();
        for creation in creations {
            let public = creation_to_public(&self.pool, creation, uid).await?;
            public_list.push(public);
        }

        let pagination = Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        };

        Ok((public_list, pagination))
    }

    /// 获取创作详情
    pub async fn get_creation(
        &self,
        id: Uuid,
        current_user_id: Option<Uuid>,
    ) -> Result<CreationPublic, AppError> {
        let creation = sqlx::query_as::<_, Creation>("SELECT * FROM creations WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or(AppError::NotFound("创作不存在".to_string()))?;

        // 私有的只能作者自己看
        if creation.visibility == "private" {
            if current_user_id.map_or(true, |uid| uid != creation.creator_id) {
                return Err(AppError::Forbidden("无权查看此创作".to_string()));
            }
        }

        let user_id = current_user_id.unwrap_or_default();
        let public = creation_to_public(&self.pool, creation, user_id).await?;

        Ok(public)
    }

    /// 更新创作
    pub async fn update_creation(
        &self,
        id: Uuid,
        user_id: Uuid,
        req: UpdateCreationRequest,
    ) -> Result<Creation, AppError> {
        // 验证所有权
        let existing: Option<(Uuid,)> = sqlx::query_as("SELECT creator_id FROM creations WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        match existing {
            Some((creator_id,)) if creator_id == user_id => {}
            Some(_) => return Err(AppError::Forbidden("无权修改此创作".to_string())),
            None => return Err(AppError::NotFound("创作不存在".to_string())),
        }

        let creation = sqlx::query_as::<_, Creation>(
            r#"
            UPDATE creations
            SET
                title = COALESCE($2, title),
                body = COALESCE($3, body),
                cover_url = COALESCE($4, cover_url),
                media_urls = COALESCE($5, media_urls),
                tags = COALESCE($6, tags),
                visibility = COALESCE($7, visibility),
                password_hash = COALESCE($8, password_hash),
                status = COALESCE($9, status),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.title)
        .bind(&req.body)
        .bind(&req.cover_url)
        .bind(req.media_urls.map(|m| serde_json::to_value(m).unwrap_or_default()))
        .bind(req.tags.map(|t| serde_json::to_value(t).unwrap_or_default()))
        .bind(req.visibility.map(|v| v.to_string()))
        .bind(&req.password)
        .bind(&req.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(creation)
    }

    /// 删除创作
    pub async fn delete_creation(&self, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM creations WHERE id = $1 AND creator_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("创作不存在".to_string()));
        }

        Ok(())
    }

    // ==================== 投稿管理 ====================

    /// 投稿到社区
    pub async fn submit_to_community(
        &self,
        creation_id: Uuid,
        user_id: Uuid,
        req: SubmitToCommunityRequest,
    ) -> Result<CommunityModuleRef, AppError> {
        // 验证创作所有权
        let creation = sqlx::query_as::<_, Creation>(
            "SELECT * FROM creations WHERE id = $1 AND creator_id = $2",
        )
        .bind(creation_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or(AppError::Forbidden("无权操作此创作".to_string()))?;

        // 获取社区 ID
        let space_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM spaces WHERE namespace = $1",
        )
        .bind(&req.space_ns)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let space_id = space_id.ok_or(AppError::NotFound("社区不存在".to_string()))?;

        // 检查是否已存在
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM community_module_refs WHERE creation_id = $1 AND space_id = $2 AND module_type = $3",
        )
        .bind(creation_id)
        .bind(space_id)
        .bind(&req.module_type)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::Conflict("已经投稿到该社区".to_string()));
        }

        // 检查社区审核策略
        let space_vis: Option<String> = sqlx::query_scalar("SELECT visibility FROM spaces WHERE id = $1")
            .bind(space_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let initial_status = match space_vis.as_deref() {
            Some("private") => "pending_review",
            _ => "visible",
        };

        let module_ref = sqlx::query_as::<_, CommunityModuleRef>(
            r#"
            INSERT INTO community_module_refs (
                creation_id, creator_id, space_id, module_type, display_status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(creation_id)
        .bind(user_id)
        .bind(space_id)
        .bind(&req.module_type)
        .bind(initial_status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        // 同步创建 posts 记录，让社区动态可直接展示该作品
        sqlx::query(
            r#"INSERT INTO posts (space_id, module_type, author_id, title, body, content_type, tags, visibility, creation_id)
               SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
               WHERE NOT EXISTS (SELECT 1 FROM posts WHERE creation_id = $9 AND space_id = $1 AND module_type = $2)"#,
        )
        .bind(space_id)
        .bind(&req.module_type)
        .bind(user_id)
        .bind(&creation.title)
        .bind(&creation.body)
        .bind(&creation.content_type)
        .bind(&creation.tags)
        .bind(&creation.visibility)
        .bind(creation_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(module_ref)
    }

    /// 撤稿（删除引用）
    pub async fn withdraw_submission(&self, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        // 先查出引用信息用于清理 posts
        let ref_info: Option<(Uuid, Uuid, String)> = sqlx::query_as(
            "SELECT creation_id, space_id, module_type FROM community_module_refs WHERE id = $1 AND creator_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let (creation_id, space_id, module_type) = ref_info.ok_or(AppError::NotFound("引用不存在".to_string()))?;

        // 删除引用
        sqlx::query("DELETE FROM community_module_refs WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // 同步软删除对应的 posts 记录
        let _ = sqlx::query(
            "UPDATE posts SET is_deleted = TRUE WHERE creation_id = $1 AND space_id = $2 AND module_type = $3",
        )
        .bind(creation_id)
        .bind(space_id)
        .bind(&module_type)
        .execute(&self.pool)
        .await;

        Ok(())
    }

    /// 获取创作的投稿列表
    pub async fn list_creation_submissions(
        &self,
        creation_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<SubmissionInfo>, AppError> {
        // 验证所有权
        let _owner: Option<(Uuid,)> = sqlx::query_as(
            "SELECT creator_id FROM creations WHERE id = $1 AND creator_id = $2",
        )
        .bind(creation_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if _owner.is_none() {
            return Err(AppError::Forbidden("无权查看".to_string()));
        }

        let rows = sqlx::query_as::<_, (Uuid, String, String, bool, i32, chrono::DateTime<chrono::Utc>, Uuid, String, String, i64, i64)>(
            r#"
            SELECT
                r.id, r.module_type, r.display_status, r.is_pinned,
                r.module_views, r.created_at, s.id, s.namespace, s.title,
                COALESCE(s.member_count, 0), COALESCE(s.post_count, 0)
            FROM community_module_refs r
            JOIN spaces s ON s.id = r.space_id
            WHERE r.creation_id = $1
            ORDER BY r.created_at DESC
            "#,
        )
        .bind(creation_id)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        let list: Vec<SubmissionInfo> = rows
            .into_iter()
            .map(|(ref_id, module_type, display_status, is_pinned, module_views, submitted_at, space_id, ns, title, member_count, post_count)| {
                SubmissionInfo {
                    ref_id,
                    space: SpaceMini { id: space_id, namespace: ns, title },
                    module_type,
                    display_status,
                    is_pinned,
                    module_views,
                    submitted_at,
                    community_member_count: member_count,
                    community_post_count: post_count,
                    community_level: None,
                    community_xp: None,
                    community_like_count: 0,
                    community_comment_count: 0,
                }
            })
            .collect();

        Ok(list)
    }

    // ==================== 社区模块引用（模块管理者） ====================

    /// 获取社区模块引用列表
    pub async fn list_module_refs(
        &self,
        ns: &str,
        module_type: &str,
        query: ListModuleRefsQuery,
        current_user_id: Option<Uuid>,
    ) -> Result<(Vec<ModuleRefPublic>, Pagination), AppError> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let offset = ((page as i64) - 1) * (page_size as i64);
        let status_filter = query.status.unwrap_or_else(|| "visible".to_string());

        let space_id: Uuid = sqlx::query_scalar("SELECT id FROM spaces WHERE namespace = $1")
            .bind(ns)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or(AppError::NotFound("社区不存在".to_string()))?;

        let refs = sqlx::query_as::<_, CommunityModuleRef>(
            r#"
            SELECT * FROM community_module_refs
            WHERE space_id = $1
              AND module_type = $2
              AND ($3 = 'all' OR display_status = $3)
            ORDER BY
                is_pinned DESC,
                pin_order ASC,
                created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(space_id)
        .bind(module_type)
        .bind(&status_filter)
        .bind(page_size as i64)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM community_module_refs
            WHERE space_id = $1
              AND module_type = $2
              AND ($3 = 'all' OR display_status = $3)
            "#,
        )
        .bind(space_id)
        .bind(module_type)
        .bind(&status_filter)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        let (sid, sns, stitle): (Uuid, String, String) = sqlx::query_as(
            "SELECT id, namespace, title FROM spaces WHERE id = $1",
        )
            .bind(space_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let space = SpaceMini { id: sid, namespace: sns, title: stitle };

        let user_id = current_user_id.unwrap_or_default();
        let mut public_list = Vec::new();
        for module_ref in refs {
            let creation: Creation = sqlx::query_as("SELECT * FROM creations WHERE id = $1")
                .bind(module_ref.creation_id)
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
                .ok_or(AppError::NotFound("创作数据不存在".to_string()))?;

            let creation_public = creation_to_public(&self.pool, creation, user_id).await?;

            public_list.push(ModuleRefPublic {
                id: module_ref.id,
                creation: creation_public,
                space: space.clone(),
                module_type: module_ref.module_type,
                display_status: module_ref.display_status,
                is_pinned: module_ref.is_pinned,
                module_views: module_ref.module_views,
                created_at: module_ref.created_at,
            });
        }

        let pagination = Pagination {
            page,
            page_size,
            total: total as u64,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as u32,
        };

        Ok((public_list, pagination))
    }

    /// 引用地图：查看某个创作被哪些社区引用（公开接口）
    pub async fn get_creation_refs(
        &self,
        creation_id: Uuid,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let refs: Vec<(String, String, Uuid, String, String, i64, i64, String)> = sqlx::query_as(
            r#"
            SELECT r.module_type, r.display_status, s.id, s.namespace, s.title,
                   COALESCE(s.member_count, 0), COALESCE(s.post_count, 0), s.visibility
            FROM community_module_refs r
            JOIN spaces s ON s.id = r.space_id
            WHERE r.creation_id = $1 AND r.display_status = 'visible'
            ORDER BY r.created_at DESC
            "#,
        )
        .bind(creation_id)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        Ok(refs.into_iter().map(|(module_type, _status, space_id, namespace, title, member_count, post_count, visibility)| {
            serde_json::json!({
                "space_id": space_id,
                "namespace": namespace,
                "title": title,
                "module_type": module_type,
                "visibility": visibility,
                "member_count": member_count,
                "post_count": post_count
            })
        }).collect())
    }

    /// 审核/管理引用（模块管理者）
    pub async fn manage_ref(
        &self,
        id: Uuid,
        user_id: Uuid,
        req: ReviewRefRequest,
    ) -> Result<CommunityModuleRef, AppError> {
        // 检查权限：模块管理者或社区所有者
        let is_moderator: bool = sqlx::query_scalar(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM module_moderators
                WHERE space_id = (SELECT space_id FROM community_module_refs WHERE id = $1)
                AND module_type = (SELECT module_type FROM community_module_refs WHERE id = $1)
                AND user_id = $2
            )
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(false);

        let is_owner: bool = sqlx::query_scalar(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM spaces s
                JOIN community_module_refs r ON r.space_id = s.id
                WHERE r.id = $1 AND s.owner_id = $2
            )
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(false);

        if !is_moderator && !is_owner {
            return Err(AppError::Forbidden("无权管理此引用".to_string()));
        }

        let module_ref = match req.action.as_str() {
            "hide" | "reject" => {
                let status = if req.action == "reject" { "rejected" } else { "hidden" };
                sqlx::query_as::<_, CommunityModuleRef>(
                    "UPDATE community_module_refs SET display_status = $2 WHERE id = $1 RETURNING *",
                )
                .bind(id)
                .bind(status)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            }
            "show" | "approve" => {
                sqlx::query_as::<_, CommunityModuleRef>(
                    "UPDATE community_module_refs SET display_status = 'visible' WHERE id = $1 RETURNING *",
                )
                .bind(id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            }
            "pin" => {
                sqlx::query_as::<_, CommunityModuleRef>(
                    "UPDATE community_module_refs SET is_pinned = TRUE, pin_order = 1 WHERE id = $1 RETURNING *",
                )
                .bind(id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            }
            "unpin" => {
                sqlx::query_as::<_, CommunityModuleRef>(
                    "UPDATE community_module_refs SET is_pinned = FALSE, pin_order = 0 WHERE id = $1 RETURNING *",
                )
                .bind(id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
            }
            _ => return Err(AppError::Validation("无效的操作".to_string())),
        };

        Ok(module_ref)
    }
}

// ==================== 辅助函数 ====================

async fn creation_to_public(
    pool: &PgPool,
    creation: Creation,
    current_user_id: Uuid,
) -> Result<CreationPublic, AppError> {
    let creator: UserPublic = sqlx::query_as::<_, polis_core::models::User>(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(creation.creator_id)
    .fetch_one(pool)
    .await
    .map(|u| UserPublic::from(u))
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let is_liked: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM likes WHERE target_type = 'creation' AND target_id = $1 AND user_id = $2)",
    )
    .bind(creation.id)
    .bind(current_user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    let is_bookmarked: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM bookmarks WHERE target_type = 'creation' AND target_id = $1 AND user_id = $2)",
    )
    .bind(creation.id)
    .bind(current_user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    let submissions = if current_user_id == creation.creator_id {
        let subs: Vec<(Uuid, String, String, bool, i32, chrono::DateTime<chrono::Utc>, Uuid, String, String, i64, i64)> =
            sqlx::query_as(
                r#"
                SELECT
                    r.id, r.module_type, r.display_status, r.is_pinned,
                    r.module_views, r.created_at, s.id, s.namespace, s.title,
                    COALESCE(s.member_count, 0), COALESCE(s.post_count, 0)
                FROM community_module_refs r
                JOIN spaces s ON s.id = r.space_id
                WHERE r.creation_id = $1
                ORDER BY r.created_at DESC
                "#,
            )
            .bind(creation.id)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

        subs.into_iter()
            .map(|(ref_id, module_type, display_status, is_pinned, module_views, submitted_at, space_id, ns, title, member_count, post_count)| {
                SubmissionInfo {
                    ref_id,
                    space: SpaceMini { id: space_id, namespace: ns, title },
                    module_type,
                    display_status,
                    is_pinned,
                    module_views,
                    submitted_at,
                    community_member_count: member_count,
                    community_post_count: post_count,
                    community_level: None,
                    community_xp: None,
                    community_like_count: 0,
                    community_comment_count: 0,
                }
            })
            .collect()
    } else {
        vec![]
    };

    Ok(CreationPublic {
        id: creation.id,
        creator,
        content_type: creation.content_type,
        title: creation.title,
        body: creation.body,
        cover_url: creation.cover_url,
        media_urls: serde_json::from_value(creation.media_urls).unwrap_or_default(),
        visibility: serde_json::from_str(&format!("\"{}\"", creation.visibility)).unwrap_or_default(),
        view_count: creation.view_count,
        like_count: creation.like_count,
        comment_count: creation.comment_count,
        bookmark_count: creation.bookmark_count,
        share_count: creation.share_count,
        is_liked,
        is_bookmarked,
        has_password: creation.password_hash.is_some(),
        tags: serde_json::from_value(creation.tags).unwrap_or_default(),
        status: creation.status,
        created_at: creation.created_at,
        updated_at: creation.updated_at,
        submissions,
    })
}
