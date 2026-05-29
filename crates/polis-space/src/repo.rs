use polis_core::error::AppError;
use polis_core::models::{Space, Membership, UpdateSpaceRequest, SpaceModule, CreateModuleRequest, UpdateModuleRequest};
use sqlx::PgPool;
use uuid::Uuid;
use argon2::{
    Argon2, PasswordVerifier,
    password_hash::{PasswordHash, PasswordHasher, SaltString, rand_core::OsRng},
};

/// 社区数据访问层
pub struct SpaceRepo {
    pub pool: PgPool,
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
        // Hash password if provided
        let password_hash: Option<String> = match &req.password {
            Some(pwd) if !pwd.is_empty() => {
                let salt = SaltString::generate(&mut OsRng);
                let hash = Argon2::default()
                    .hash_password(pwd.as_bytes(), &salt)
                    .map_err(|_| AppError::Validation("密码哈希失败".to_string()))?
                    .to_string();
                Some(hash)
            }
            _ => None,
        };

        let space = sqlx::query_as::<_, Space>(
            r#"
            UPDATE spaces
            SET title = COALESCE($2, title),
                description = COALESCE($3, description),
                icon_url = CASE WHEN $4 = '' THEN NULL ELSE COALESCE($4, icon_url) END,
                banner_url = CASE WHEN $5 = '' THEN NULL ELSE COALESCE($5, banner_url) END,
                visibility = COALESCE($6, visibility),
                custom_rules = COALESCE($7, custom_rules),
                enabled_modules = COALESCE($8, enabled_modules),
                password_hash = COALESCE($9, password_hash),
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
        .bind(&password_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(space)
    }

    /// 归档社区（软删除，仅 owner 可操作）
    pub async fn archive(&self, id: Uuid, owner_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(
            "UPDATE spaces SET status = 'archived', updated_at = NOW() WHERE id = $1 AND owner_id = $2 AND status = 'active'",
        )
        .bind(id)
        .bind(owner_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
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

    /// 获取热门社区 — 综合热度排序
    /// 算法: member_count(权重0.3) + post_count(权重0.5) + 近期活跃加分(7天内权重+1)
    pub async fn find_trending(&self, limit: u32) -> Result<Vec<Space>, AppError> {
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE status = 'active' AND visibility = 'public' ORDER BY (member_count * 0.3 + post_count * 0.5 + star_count * 0.4 + CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1.5 ELSE 0 END) DESC, created_at DESC LIMIT $1",
        )
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(spaces)
    }

    /// 分页列出所有公开活跃社区 — 综合热度排序
    /// 算法: member_count + post_count + 近期活跃衰减因子
    pub async fn find_all(&self, page: u32, page_size: u32) -> Result<(Vec<Space>, i64), AppError> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM spaces WHERE status = 'active' AND visibility = 'public'"
        )
        .fetch_one(&self.pool)
        .await?;
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE status = 'active' AND visibility = 'public' ORDER BY (member_count * 0.3 + post_count * 0.5 + 1.0 / GREATEST(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400.0, 1.0) * 2.0) DESC, created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;
        Ok((spaces, total.0))
    }

    /// 搜索社区（按标题和描述模糊匹配）
    pub async fn search(&self, query: &str, limit: u32) -> Result<Vec<Space>, AppError> {
        let pattern = format!("%{}%", query);
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE status = 'active' AND visibility = 'public' AND (title ILIKE $1 OR description ILIKE $1 OR namespace ILIKE $1) ORDER BY member_count DESC LIMIT $2",
        )
        .bind(&pattern)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;
        Ok(spaces)
    }

    // ===== 成员管理 =====

    /// 添加成员（如果被封禁且未过期则拒绝）
    pub async fn add_member(
        &self,
        space_id: Uuid,
        user_id: Uuid,
        role: &str,
    ) -> Result<Membership, AppError> {
        // 检查是否在封禁期
        if self.is_banned(space_id, user_id).await? {
            return Err(AppError::Forbidden("你已被该社区封禁，无法加入".to_string()));
        }

        let membership = sqlx::query_as::<_, Membership>(
            r#"
            INSERT INTO memberships (space_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (space_id, user_id)
            DO UPDATE SET role = $3, ban_reason = NULL, banned_at = NULL, ban_expires_at = NULL
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

    /// 获取社区所有成员（含用户信息）
    pub async fn get_members_with_users(&self, space_id: Uuid) -> Result<Vec<polis_core::models::MemberInfo>, AppError> {
        use polis_core::models::{MemberInfo, UserPublic};
        use sqlx::Row;

        let rows = sqlx::query(
            r#"
            SELECT
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                u.verified,
                COALESCE(u.notification_prefs, '{}'::jsonb) as notification_prefs,
                u.created_at,
                0::bigint as total_likes,
                0::bigint as post_count,
                m.role,
                m.joined_at
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE m.space_id = $1 AND m.role != 'banned'
            ORDER BY
                CASE m.role
                    WHEN 'owner' THEN 0
                    WHEN 'moderator' THEN 1
                    ELSE 2
                END,
                m.joined_at ASC
            "#,
        )
        .bind(space_id)
        .fetch_all(&self.pool)
        .await?;

        let members: Vec<MemberInfo> = rows.iter().map(|r| {
            let role_str: String = r.get("role");
            MemberInfo {
                user: UserPublic {
                    id: r.get("id"),
                    username: r.get("username"),
                    display_name: r.get("display_name"),
                    avatar_url: r.get("avatar_url"),
                    bio: r.get("bio"),
                    verified: r.get("verified"),
                    notification_prefs: r.get("notification_prefs"),
                    created_at: r.get("created_at"),
                    total_likes: r.get("total_likes"),
                    post_count: r.get("post_count"),
                },
                role: serde_json::from_value(serde_json::Value::String(role_str)).unwrap_or_default(),
                joined_at: r.get("joined_at"),
            }
        }).collect();

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

    /// 封禁成员（支持定时封禁）
    pub async fn ban_member(&self, space_id: Uuid, user_id: Uuid, reason: Option<&str>, duration_hours: Option<i32>) -> Result<(), AppError> {
        let expires_at = duration_hours.map(|h| {
            let now = chrono::Utc::now();
            now + chrono::Duration::hours(h as i64)
        });
        sqlx::query(
            "UPDATE memberships SET role='banned', ban_reason=$3, banned_at=NOW(), ban_expires_at=$4 WHERE space_id=$1 AND user_id=$2 AND role!='owner'"
        )
        .bind(space_id).bind(user_id).bind(reason).bind(expires_at).execute(&self.pool).await?;
        Ok(())
    }

    /// 解封成员
    pub async fn unban_member(&self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE memberships SET role='member', ban_reason=NULL, banned_at=NULL, ban_expires_at=NULL WHERE space_id=$1 AND user_id=$2 AND role='banned'"
        )
        .bind(space_id).bind(user_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 检查是否被封禁（含过期检查）
    pub async fn is_banned(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let row: Option<(bool,)> = sqlx::query_as(
            "SELECT (role='banned' AND (ban_expires_at IS NULL OR ban_expires_at > NOW())) FROM memberships WHERE space_id=$1 AND user_id=$2"
        )
        .bind(space_id).bind(user_id).fetch_optional(&self.pool).await?;
        Ok(row.map(|r| r.0).unwrap_or(false))
    }

    /// 设置成员角色 (admin/moderator)
    pub async fn set_member_role(&self, space_id: Uuid, user_id: Uuid, role: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE memberships SET role=$1 WHERE space_id=$2 AND user_id=$3 AND role!='owner'")
            .bind(role).bind(space_id).bind(user_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 加入审批请求
    pub async fn create_join_request(&self, space_id: Uuid, user_id: Uuid, message: Option<&str>) -> Result<(), AppError> {
        sqlx::query("INSERT INTO space_join_requests (space_id, user_id, message) VALUES ($1,$2,$3) ON CONFLICT (space_id, user_id) DO UPDATE SET status='pending', message=$3, created_at=NOW()")
            .bind(space_id).bind(user_id).bind(message).execute(&self.pool).await?;
        Ok(())
    }

    /// 检查用户对某空间的加入申请状态
    pub async fn get_join_request_status(&self, space_id: Uuid, user_id: Uuid) -> Result<Option<String>, AppError> {
        let status: Option<String> = sqlx::query_scalar(
            "SELECT status FROM space_join_requests WHERE space_id = $1 AND user_id = $2"
        )
        .bind(space_id).bind(user_id)
        .fetch_optional(&self.pool).await?
        .flatten();
        Ok(status)
    }

    /// 获取审批列表
    pub async fn list_join_requests(&self, space_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (Uuid, Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>,)>(
            "SELECT space_id, user_id, status, message, created_at FROM space_join_requests WHERE space_id=$1 AND status='pending' ORDER BY created_at DESC"
        ).bind(space_id).fetch_all(&self.pool).await?;
        let mut result = Vec::new();
        for (_, uid, status, msg, created) in rows {
            // Fetch user info
            let user: Option<(String, String)> = sqlx::query_as(
                "SELECT username, display_name FROM users WHERE id=$1"
            ).bind(uid).fetch_optional(&self.pool).await?;
            result.push(serde_json::json!({
                "user_id": uid.to_string(),
                "username": user.as_ref().map(|u| &u.0).unwrap_or(&"unknown".to_string()),
                "display_name": user.as_ref().map(|u| &u.1).unwrap_or(&"unknown".to_string()),
                "status": status,
                "message": msg,
                "created_at": created.to_rfc3339(),
            }));
        }
        Ok(result)
    }

    /// 审批加入申请
    pub async fn review_join_request(&self, space_id: Uuid, user_id: Uuid, approved: bool, reviewer_id: Uuid) -> Result<(), AppError> {
        let status = if approved { "approved" } else { "rejected" };
        sqlx::query("UPDATE space_join_requests SET status=$1, reviewed_at=NOW(), reviewed_by=$2 WHERE space_id=$3 AND user_id=$4")
            .bind(status).bind(reviewer_id).bind(space_id).bind(user_id).execute(&self.pool).await?;
        if approved {
            self.add_member(space_id, user_id, "member").await?;
            self.update_member_count(space_id).await?;
        }
        Ok(())
    }

    /// 计算并返回社区 XP 和等级
    /// XP = 成员数×10 + 文章数×5 + 每日活跃×3 + 运行天数×1 (上限 200/天)
    pub async fn compute_space_level(&self, space_id: Uuid) -> Result<(i32, i32), AppError> {
        // 先尝试从 space_levels 表读取已有值
        if let Some((xp, level, daily_reset)) = sqlx::query_as::<_, (i32, i32, chrono::DateTime<chrono::Utc>)>(
            "SELECT xp, level, daily_reset_at FROM space_levels WHERE space_id = $1"
        ).bind(space_id).fetch_optional(&self.pool).await? {
            let now = chrono::Utc::now();
            // 如果今天还没重置，直接返回
            if daily_reset.date_naive() >= now.date_naive() {
                return Ok((xp, level));
            }
            // 否则重新计算
        }

        // 计算基础 XP
        let space = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE id = $1"
        ).bind(space_id).fetch_optional(&self.pool).await?
            .ok_or(AppError::NotFound("Space not found".to_string()))?;

        let days_running = (chrono::Utc::now() - space.created_at).num_days().max(0) as i32;
        let base_xp = space.member_count as i32 * 10
            + space.post_count as i32 * 5
            + days_running * 1;

        // 每日限制 200 XP
        let today_xp = base_xp.min(200);
        let level: i32 = sqlx::query_scalar("SELECT calc_space_level($1)").bind(today_xp).fetch_one(&self.pool).await?;

        // Upsert
        sqlx::query(
            "INSERT INTO space_levels (space_id, xp, level, daily_xp, daily_reset_at) VALUES ($1,$2,$3,$4,NOW() + INTERVAL '1 day')
             ON CONFLICT (space_id) DO UPDATE SET xp=$2, level=$3, daily_xp=$4, daily_reset_at=NOW() + INTERVAL '1 day', updated_at=NOW()"
        ).bind(space_id).bind(today_xp).bind(level).bind(today_xp).execute(&self.pool).await?;

        Ok((today_xp as i32, level))
    }

    /// 批量获取空间等级
    pub async fn compute_space_levels_batch(&self, space_ids: &[Uuid]) -> Result<Vec<(Uuid, i32, i32)>, AppError> {
        let mut results = Vec::new();
        for &id in space_ids {
            if let Ok((xp, level)) = self.compute_space_level(id).await {
                results.push((id, xp, level));
            }
        }
        Ok(results)
    }

    // ===== 关注统计 =====

    /// 更新社区关注数
    pub async fn update_follower_count(&self, space_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE spaces SET follower_count = (SELECT COUNT(*) FROM follows WHERE followee_type='space' AND followee_id=$1) WHERE id=$1"
        )
        .bind(space_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 获取社区关注数
    pub async fn get_follower_count(&self, space_id: Uuid) -> Result<i64, AppError> {
        let count: Option<i64> = sqlx::query_scalar(
            "SELECT follower_count FROM spaces WHERE id = $1"
        )
        .bind(space_id).fetch_optional(&self.pool).await?
        .flatten();
        Ok(count.unwrap_or(0))
    }

    /// 关注社区
    pub async fn follow_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM follows WHERE follower_id = $1 AND followee_type = 'space' AND followee_id = $2"
        )
        .bind(user_id).bind(space_id)
        .fetch_optional(&self.pool).await?
        .flatten();

        if existing.is_some() {
            return Ok(true); // 已关注
        }

        sqlx::query("INSERT INTO follows (follower_id, followee_type, followee_id) VALUES ($1, 'space', $2)")
            .bind(user_id).bind(space_id)
            .execute(&self.pool).await?;

        self.update_follower_count(space_id).await?;
        Ok(true)
    }

    /// 取消关注社区
    pub async fn unfollow_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(
            "DELETE FROM follows WHERE follower_id = $1 AND followee_type = 'space' AND followee_id = $2"
        )
        .bind(user_id).bind(space_id)
        .execute(&self.pool).await?;

        if result.rows_affected() > 0 {
            self.update_follower_count(space_id).await?;
        }
        Ok(false)
    }

    /// 检查是否已关注社区
    pub async fn is_following_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let exists = sqlx::query_scalar::<_, Option<i32>>(
            "SELECT 1 FROM follows WHERE follower_id = $1 AND followee_type = 'space' AND followee_id = $2"
        )
        .bind(user_id).bind(space_id)
        .fetch_optional(&self.pool).await?
        .is_some();
        Ok(exists)
    }

    // ===== 收藏统计 =====

    /// 更新社区收藏数
    pub async fn update_star_count(&self, space_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE spaces SET star_count = (SELECT COUNT(*) FROM space_stars WHERE space_id=$1) WHERE id=$1"
        )
        .bind(space_id).execute(&self.pool).await?;
        Ok(())
    }

    /// 获取社区收藏数
    pub async fn get_star_count(&self, space_id: Uuid) -> Result<i64, AppError> {
        let count: Option<i64> = sqlx::query_scalar(
            "SELECT star_count FROM spaces WHERE id = $1"
        )
        .bind(space_id).fetch_optional(&self.pool).await?
        .flatten();
        Ok(count.unwrap_or(0))
    }

    /// 收藏社区
    pub async fn star_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM space_stars WHERE user_id = $1 AND space_id = $2"
        )
        .bind(user_id).bind(space_id)
        .fetch_optional(&self.pool).await?
        .flatten();

        if existing.is_some() {
            return Ok(true);
        }

        sqlx::query("INSERT INTO space_stars (user_id, space_id) VALUES ($1, $2)")
            .bind(user_id).bind(space_id)
            .execute(&self.pool).await?;

        self.update_star_count(space_id).await?;
        Ok(true)
    }

    /// 取消收藏社区
    pub async fn unstar_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(
            "DELETE FROM space_stars WHERE user_id = $1 AND space_id = $2"
        )
        .bind(user_id).bind(space_id)
        .execute(&self.pool).await?;

        if result.rows_affected() > 0 {
            self.update_star_count(space_id).await?;
        }
        Ok(false)
    }

    /// 检查是否已收藏社区
    pub async fn is_starred_space(&self, space_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let exists = sqlx::query_scalar::<_, Option<i32>>(
            "SELECT 1 FROM space_stars WHERE user_id = $1 AND space_id = $2"
        )
        .bind(user_id).bind(space_id)
        .fetch_optional(&self.pool).await?
        .is_some();
        Ok(exists)
    }

    /// 获取用户收藏的社区 ID 列表
    pub async fn get_starred_spaces(&self, user_id: Uuid) -> Result<Vec<Uuid>, AppError> {
        let ids = sqlx::query_scalar(
            "SELECT space_id FROM space_stars WHERE user_id = $1 ORDER BY created_at DESC"
        )
        .bind(user_id)
        .fetch_all(&self.pool).await?;
        Ok(ids)
    }

    /// 获取最多收藏的社区 (Top N)
    pub async fn find_most_starred(&self, limit: i64) -> Result<Vec<Space>, AppError> {
        let spaces = sqlx::query_as::<_, Space>(
            "SELECT * FROM spaces WHERE status = 'active' AND visibility = 'public' ORDER BY star_count DESC LIMIT $1"
        )
        .bind(limit)
        .fetch_all(&self.pool).await?;
        Ok(spaces)
    }

    /// 获取社区是否有密码
    pub async fn has_password(&self, space_id: Uuid) -> Result<bool, AppError> {
        let hash: Option<String> = sqlx::query_scalar(
            "SELECT password_hash FROM spaces WHERE id = $1"
        )
        .bind(space_id).fetch_optional(&self.pool).await?
        .flatten();
        Ok(hash.is_some())
    }

    /// 验证社区访问密码
    pub async fn verify_password(&self, space_id: Uuid, password: &str) -> Result<bool, AppError> {
        let hash: Option<String> = sqlx::query_scalar(
            "SELECT password_hash FROM spaces WHERE id = $1"
        )
        .bind(space_id).fetch_optional(&self.pool).await?
        .flatten();
        match hash {
            Some(h) => {
                let parsed = PasswordHash::new(&h)
                    .map_err(|_| AppError::Internal("密码验证失败".to_string()))?;
                Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
            }
            None => Ok(false),
        }
    }

    // ==================== 自定义模块 CRUD ====================

    /// 列表社区的所有模块
    pub async fn list_modules(&self, space_id: Uuid) -> Result<Vec<SpaceModule>, AppError> {
        let modules = sqlx::query_as::<_, SpaceModule>(
            "SELECT * FROM space_modules WHERE space_id = $1 AND is_active = true ORDER BY sort_order"
        )
        .bind(space_id)
        .fetch_all(&self.pool).await?;
        Ok(modules)
    }

    /// 获取单个模块
    pub async fn get_module(&self, space_id: Uuid, module_key: &str) -> Result<Option<SpaceModule>, AppError> {
        let m = sqlx::query_as::<_, SpaceModule>(
            "SELECT * FROM space_modules WHERE space_id = $1 AND module_key = $2"
        )
        .bind(space_id).bind(module_key)
        .fetch_optional(&self.pool).await?;
        Ok(m)
    }

    /// 创建模块
    pub async fn create_module(&self, space_id: Uuid, req: &CreateModuleRequest) -> Result<SpaceModule, AppError> {
        let module_key = req.module_key.clone().unwrap_or_else(|| {
            format!("mod_{:x}", uuid::Uuid::new_v4().as_fields().0)
        });
        let mode = req.mode.clone().unwrap_or_else(|| "free".to_string());
        let types = serde_json::to_value(req.allowed_content_types.clone().unwrap_or_else(|| vec!["article".to_string()]))
            .unwrap_or_default();

        // 获取下一个 sort_order
        let max_order: Option<i32> = sqlx::query_scalar(
            "SELECT COALESCE(MAX(sort_order), -1) FROM space_modules WHERE space_id = $1"
        )
        .bind(space_id)
        .fetch_optional(&self.pool).await?
        .flatten();

        let sort_order = max_order.unwrap_or(-1) + 1;

        let m = sqlx::query_as::<_, SpaceModule>(
            r#"INSERT INTO space_modules (space_id, name, module_key, mode, allowed_content_types, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"#
        )
        .bind(space_id)
        .bind(&req.name)
        .bind(&module_key)
        .bind(&mode)
        .bind(&types)
        .bind(sort_order)
        .fetch_one(&self.pool).await?;

        Ok(m)
    }

    /// 更新模块
    pub async fn update_module(&self, space_id: Uuid, module_key: &str, req: &UpdateModuleRequest) -> Result<Option<SpaceModule>, AppError> {
        let existing = self.get_module(space_id, module_key).await?;
        let existing = match existing {
            Some(m) => m,
            None => return Ok(None),
        };

        let name = req.name.clone().unwrap_or(existing.name);
        let mode = req.mode.clone().unwrap_or(existing.mode);
        let types = req.allowed_content_types.as_ref()
            .map(|t| serde_json::to_value(t).unwrap_or(existing.allowed_content_types.clone()))
            .unwrap_or(existing.allowed_content_types);
        let is_active = req.is_active.unwrap_or(existing.is_active);

        let m = sqlx::query_as::<_, SpaceModule>(
            r#"UPDATE space_modules SET name=$1, mode=$2, allowed_content_types=$3, is_active=$4
               WHERE space_id=$5 AND module_key=$6 RETURNING *"#
        )
        .bind(&name).bind(&mode).bind(&types).bind(is_active)
        .bind(space_id).bind(module_key)
        .fetch_optional(&self.pool).await?;

        Ok(m)
    }

    /// 删除模块
    pub async fn delete_module(&self, space_id: Uuid, module_key: &str) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM space_modules WHERE space_id=$1 AND module_key=$2")
            .bind(space_id).bind(module_key)
            .execute(&self.pool).await?;
        Ok(result.rows_affected() > 0)
    }
}
