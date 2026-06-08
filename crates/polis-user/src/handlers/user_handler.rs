use polis_core::error::AppError;
use polis_core::events::{subjects, Event};
use polis_core::models::{
    LoginRequest, LoginResponse, RegisterRequest, UpdateUserRequest, UserPublic,
};
use async_nats::Client as NatsClient;
use sqlx::PgPool;
use uuid::Uuid;

use sha2::{Sha256, Digest};

use crate::auth;
use crate::config::UserServiceConfig;
use crate::repo::UserRepo;
use crate::handlers::bind_wallet::BindWalletHandler;
use polis_core::token_blacklist::TokenBlacklist;

/// 用户业务逻辑处理器
pub struct UserHandler {
    pub repo: UserRepo,
    pub config: UserServiceConfig,
    pub nats: Option<NatsClient>,
    pub bind_wallet: BindWalletHandler,
    pub token_blacklist: TokenBlacklist,
}

impl UserHandler {
    pub fn new(
        pool: PgPool,
        config: UserServiceConfig,
        nats: Option<NatsClient>,
    ) -> Self {
        let repo = UserRepo::new(pool);
        let bind_wallet = BindWalletHandler::new(repo.clone());
        Self {
            repo,
            config,
            nats,
            bind_wallet,
            token_blacklist: TokenBlacklist::new(),
        }
    }

    /// 用户注册
    pub async fn register(&self, req: RegisterRequest) -> Result<LoginResponse, AppError> {
        // 验证输入
        if req.username.len() < 3 || req.username.len() > 39 {
            return Err(AppError::Validation(
                "Username must be between 3 and 39 characters".to_string(),
            ));
        }
        // 用户名不允许空白字符和路径危险字符
        if req.username.chars().any(|c| c.is_whitespace() || c == '/' || c == '\\' || c == '@') {
            return Err(AppError::Validation(
                "用户名不能包含空格、/、\\、@ 字符".to_string(),
            ));
        }
        if req.password.len() < 8 {
            return Err(AppError::Validation(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        // 检查邮箱是否已注册
        if let Some(_) = self.repo.find_by_email(&req.email).await? {
            return Err(AppError::Conflict("Email already registered".to_string()));
        }

        // 检查用户名是否已存在
        if let Some(_) = self.repo.find_by_username(&req.username).await? {
            return Err(AppError::Conflict("Username already taken".to_string()));
        }

        // 哈希密码
        let password_hash = auth::hash_password_async(req.password.clone()).await?;

        // 创建用户
        let display_name = req.display_name.unwrap_or_else(|| req.username.clone());
        let user = self
            .repo
            .create(&req.username, &display_name, &req.email, &password_hash)
            .await?;

        // 生成 Token
        let access_token = auth::generate_access_token(
            user.id,
            &user.username,
            &user.display_name,
            &self.config.jwt_secret,
            self.config.jwt_access_expiry,
        )
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

        let refresh_token = auth::generate_refresh_token(
            user.id,
            &user.username,
            &user.display_name,
            &self.config.jwt_secret,
            self.config.jwt_refresh_expiry,
        )
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

        // 发布注册事件
        self.publish_event(subjects::USER_REGISTERED, serde_json::json!({
            "user_id": user.id.to_string(),
            "username": user.username,
            "email": user.email,
        })).await;

        Ok(LoginResponse {
            access_token,
            refresh_token,
            user: user.into(),
        })
    }

    /// 用户登录
    pub async fn login(&self, req: LoginRequest) -> Result<LoginResponse, AppError> {
        let user = self
            .repo
            .find_by_email(&req.email)
            .await?
            .ok_or(AppError::Unauthorized)?;

        if user.banned {
            return Err(AppError::Forbidden(
                user.ban_reason
                    .unwrap_or_else(|| "账号已被冻结，如有疑问请联系管理员".to_string()),
            ));
        }

        let valid = auth::verify_password_async(req.password.clone(), user.password_hash.clone()).await?;

        if !valid {
            return Err(AppError::Unauthorized);
        }

        let access_expiry = if req.remember_me.unwrap_or(false) {
            30 * 24 * 3600  // 30天
        } else {
            self.config.jwt_access_expiry
        };
        let access_token = auth::generate_access_token(
            user.id,
            &user.username,
            &user.display_name,
            &self.config.jwt_secret,
            access_expiry,
        )
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

        let refresh_token = auth::generate_refresh_token(
            user.id,
            &user.username,
            &user.display_name,
            &self.config.jwt_secret,
            self.config.jwt_refresh_expiry,
        )
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

        Ok(LoginResponse {
            access_token,
            refresh_token,
            user: user.into(),
        })
    }

    /// 获取用户公开信息（含获赞数、发帖数）
    pub async fn get_user_profile(&self, username: &str) -> Result<UserPublic, AppError> {
        let user = self
            .repo
            .find_by_username(username)
            .await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;

        let user_id = user.id;
        let mut pub_user: UserPublic = user.into();

        // 统计用户所有帖子的获赞总数
        if let Ok(total_likes) = self.repo.get_user_total_likes(user_id).await {
            pub_user.total_likes = total_likes;
        }
        // 统计用户发帖数量
        if let Ok(post_count) = self.repo.get_user_post_count(user_id).await {
            pub_user.post_count = post_count;
        }

        Ok(pub_user)
    }

    /// 获取用户的社区列表（拥有的 + 加入的）
    pub async fn get_user_spaces(&self, username: &str) -> Result<Vec<serde_json::Value>, AppError> {
        let user = self
            .repo
            .find_by_username(username)
            .await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;

        // 查询用户拥有的社区（owner）
        let owned = self.repo.find_spaces_by_owner(user.id).await?;

        // 查询用户加入的社区（membership）
        let member_space_ids = self.repo.find_user_spaces(user.id).await?;
        let mut all_spaces = owned;

        // 排除已拥有的社区，避免重复
        for space_id in member_space_ids {
            let already_owned = all_spaces.iter().any(|s| {
                s.get("id").and_then(|v| v.as_str()).map(|id| id == space_id.to_string()).unwrap_or(false)
            });
            if !already_owned {
                // 查询具体社区信息
                let rows = sqlx::query_as::<_, (serde_json::Value,)>(
                    r#"SELECT json_build_object(
                        'id', s.id,
                        'namespace', s.namespace,
                        'slug', s.slug,
                        'owner_id', s.owner_id,
                        'title', s.title,
                        'description', s.description,
                        'icon_url', s.icon_url,
                        'visibility', s.visibility,
                        'status', s.status,
                        'member_count', s.member_count,
                        'post_count', s.post_count,
                        'is_root', s.is_root,
                        'created_at', s.created_at
                    ) FROM spaces s WHERE s.id = $1"#
                )
                .bind(space_id)
                .fetch_all(&self.repo.pool)
                .await?;
                for row in rows {
                    all_spaces.push(row.0);
                }
            }
        }

        Ok(all_spaces)
    }

    /// 搜索用户 (模糊匹配 username 和 display_name)
    pub async fn search_users(&self, query: &str, limit: u32) -> Result<Vec<UserPublic>, AppError> {
        let users = self.repo.search_users(query, limit).await?;
        Ok(users.into_iter().map(|u| u.into()).collect())
    }

    /// 获取当前用户资料（通过 JWT）
    pub async fn get_my_profile(&self, user_id: Uuid) -> Result<UserPublic, AppError> {
        let user = self.repo.find_by_id(user_id).await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;
        Ok(user.into())
    }

    /// 更新用户资料
    pub async fn update_profile(
        &self,
        user_id: Uuid,
        req: UpdateUserRequest,
    ) -> Result<UserPublic, AppError> {
        let user = self
            .repo
            .update_profile(
                user_id,
                req.display_name.as_deref(),
                req.avatar_url.as_deref(),
                req.bio.as_deref(),
                req.notification_prefs.as_ref(),
            )
            .await?;
        Ok(user.into())
    }

    /// 发布 NATS 事件
    async fn publish_event(&self, subject: &str, payload: serde_json::Value) {
        if let Some(ref nats) = self.nats {
            let event = Event {
                id: Uuid::new_v4().to_string(),
                subject: subject.to_string(),
                source: "user-service".to_string(),
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

    /// 通过 NATS 广播 token 撤销事件，让其他服务同步更新本地黑名单
    async fn nats_publish_blacklisted(&self, jti: &str) {
        if let Some(ref nats) = self.nats {
            let jti_str = jti.to_string();
            if let Err(e) = nats.publish(
                subjects::TOKEN_BLACKLISTED.to_string(),
                jti_str.into_bytes().into(),
            ).await {
                tracing::warn!("Failed to publish token blacklist event for jti={}: {}", jti, e);
            } else {
                tracing::debug!("Published token blacklist event for jti={}", jti);
            }
        }
    }
}

impl UserHandler {
    /// 修改密码
    pub async fn change_password(&self, user_id: Uuid, old_password: &str, new_password: &str) -> Result<(), AppError> {
        let user = self.repo.find_by_id(user_id).await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;
        let valid = crate::auth::verify_password_async(old_password.to_string(), user.password_hash.clone()).await?;
        if !valid { return Err(AppError::Forbidden("Wrong password".to_string())); }
        if new_password.len() < 8 { return Err(AppError::Validation("Password must be at least 8 characters".to_string())); }
        let new_hash = crate::auth::hash_password_async(new_password.to_string()).await?;
        sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
            .bind(&new_hash).bind(user_id)
            .execute(&self.repo.pool).await?;
        Ok(())
    }

    /// 生成密码重置令牌（随机令牌 + 数据库存储，不直接返回 JWT）
    pub async fn generate_reset_token(&self, email: &str) -> Result<String, AppError> {
        let user = self.repo.find_by_email(email).await?
            .ok_or(AppError::NotFound("Email not found".to_string()))?;

        // 使旧的未使用令牌失效
        sqlx::query("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE")
            .bind(user.id).execute(&self.repo.pool).await?;

        // 生成随机令牌
        let token = Uuid::new_v4().to_string();
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        let token_hash = hex::encode(hasher.finalize());
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

        sqlx::query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)")
            .bind(user.id).bind(&token_hash).bind(expires_at)
            .execute(&self.repo.pool).await?;

        Ok(token)
    }

    /// 使用重置令牌修改密码
    pub async fn reset_password(&self, token: &str, new_password: &str) -> Result<(), AppError> {
        if new_password.len() < 8 {
            return Err(AppError::Validation("Password must be at least 8 characters".to_string()));
        }

        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        let token_hash = hex::encode(hasher.finalize());

        let record = sqlx::query_as::<_, (Uuid, Uuid, chrono::DateTime<chrono::Utc>, bool)>(
            "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = $1"
        ).bind(&token_hash).fetch_optional(&self.repo.pool).await?
            .ok_or(AppError::Forbidden("无效或已过期的重置令牌".to_string()))?;

        if record.3 || record.2 < chrono::Utc::now() {
            return Err(AppError::Forbidden("重置令牌已过期或已使用".to_string()));
        }

        let new_hash = crate::auth::hash_password_async(new_password.to_string()).await?;

        sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
            .bind(&new_hash).bind(record.1)
            .execute(&self.repo.pool).await?;

        sqlx::query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1")
            .bind(record.0).execute(&self.repo.pool).await?;

        Ok(())
    }

    /// 关注/取消关注
    pub async fn toggle_follow(&self, follower_id: Uuid, followee_type: &str, followee_id: Uuid) -> Result<bool, AppError> {
        let existing = sqlx::query_scalar::<_, Option<Uuid>>(
            "SELECT id FROM follows WHERE follower_id = $1 AND followee_type = $2 AND followee_id = $3"
        ).bind(follower_id).bind(followee_type).bind(followee_id)
        .fetch_optional(&self.repo.pool).await?;
        if let Some(_) = existing {
            sqlx::query("DELETE FROM follows WHERE follower_id = $1 AND followee_type = $2 AND followee_id = $3")
                .bind(follower_id).bind(followee_type).bind(followee_id)
                .execute(&self.repo.pool).await?;
            Ok(false)
        } else {
            sqlx::query("INSERT INTO follows (follower_id, followee_type, followee_id) VALUES ($1, $2, $3)")
                .bind(follower_id).bind(followee_type).bind(followee_id)
                .execute(&self.repo.pool).await?;
            // 发布关注事件 + 直接创建通知（NATS 可能未部署）
            if followee_type == "user" {
                self.publish_event(subjects::USER_FOLLOWED, serde_json::json!({
                    "follower_id": follower_id.to_string(),
                    "followed_id": followee_id.to_string(),
                })).await;
                // 直接创建通知（不走 NATS，确保在没有 NATS 的环境也能工作）
                let follower_name = sqlx::query_scalar::<_, String>(
                    "SELECT display_name FROM users WHERE id = $1"
                ).bind(follower_id).fetch_optional(&self.repo.pool).await.ok().flatten().unwrap_or_else(|| "有人".to_string());
                let content = format!("{} 关注了你", follower_name);
                if let Err(e) = sqlx::query(
                    "INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content) VALUES ($1, $2, $3, $4, $5, $6)"
                )
                .bind(followee_id).bind("follow").bind(follower_id).bind("user").bind(follower_id).bind(&content)
                .execute(&self.repo.pool).await {
                    tracing::warn!("Failed to create follow notification for user {}: {}", followee_id, e);
                }
            }
            Ok(true)
        }
    }

    /// 获取关注者
    pub async fn get_followers(&self, username: &str) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name)
               FROM follows f JOIN users u ON f.follower_id = u.id
               WHERE f.followee_type = 'user' AND f.followee_id = (SELECT id FROM users WHERE username = $1)"#
        ).bind(username).fetch_all(&self.repo.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 获取正在关注
    pub async fn get_following(&self, username: &str) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object('id', u.id, 'username', u.username, 'display_name', u.display_name)
               FROM follows f JOIN users u ON f.followee_id = u.id
               WHERE f.followee_type = 'user' AND f.follower_id = (SELECT id FROM users WHERE username = $1)"#
        ).bind(username).fetch_all(&self.repo.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    /// 查询用户封禁状态
    pub async fn get_ban_status(&self, email: &str) -> Result<serde_json::Value, AppError> {
        let user = self.repo.find_by_email(email).await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;
        Ok(serde_json::json!({
            "banned": user.banned,
            "ban_reason": user.ban_reason,
            "banned_at": user.banned_at.map(|t| t.to_rfc3339()),
        }))
    }

    /// 提交账号申诉 — 创建一条 target_type='appeal' 的举报记录
    pub async fn submit_appeal(&self, email: &str, reason: &str) -> Result<(), AppError> {
        let user = self.repo.find_by_email(email).await?
            .ok_or(AppError::NotFound("该邮箱未注册".to_string()))?;
        if !user.banned {
            return Err(AppError::Validation("该账号未被封禁，无需申诉".to_string()));
        }
        if reason.trim().len() < 10 {
            return Err(AppError::Validation("申诉理由至少需要10个字符".to_string()));
        }
        sqlx::query(
            "INSERT INTO reports (reporter_id, target_type, target_id, reason, status) VALUES ($1, 'appeal', $2, $3, 'pending')"
        ).bind(user.id).bind(user.id).bind(reason.trim())
        .execute(&self.repo.pool).await?;
        Ok(())
    }

    /// 获取互相关注的联系人（WeChat-style contacts: 我关注了TA 且 TA关注了我）
    pub async fn get_mutual_contacts(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let rows = sqlx::query_as::<_, (serde_json::Value,)>(
            r#"SELECT json_build_object(
                'id', u.id,
                'username', u.username,
                'display_name', u.display_name,
                'is_mutual', true
               )
               FROM follows f1
               JOIN follows f2 ON f1.followee_id = f2.follower_id AND f1.follower_id = f2.followee_id
               JOIN users u ON f1.followee_id = u.id
               WHERE f1.follower_id = $1
                 AND f1.followee_type = 'user'
                 AND f2.followee_type = 'user'
               ORDER BY u.display_name"#
        ).bind(user_id).fetch_all(&self.repo.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    // ==================== XP 系统 ====================

    pub async fn get_user_xp(&self, user_id: Uuid) -> Result<serde_json::Value, AppError> {
        use polis_core::models::{UserLevel, UserXpPublic};
        let xp = self.repo.get_or_create_user_xp(user_id).await?;
        let levels: Vec<UserLevel> = sqlx::query_as::<_, UserLevel>("SELECT * FROM user_levels ORDER BY level")
            .fetch_all(&self.repo.pool).await?;
        let current_level = levels.iter().find(|l| l.level == xp.current_level);
        let next_level = levels.iter().find(|l| l.level == xp.current_level + 1);
        let xp_to_next = next_level.map(|l| l.required_xp - xp.total_xp).unwrap_or(0);
        let public = UserXpPublic {
            user_id: xp.user_id,
            total_xp: xp.total_xp,
            current_level: xp.current_level,
            level_title: current_level.map(|l| l.title.clone()).unwrap_or_default(),
            level_icon: current_level.map(|l| l.icon.clone()).unwrap_or_default(),
            xp_to_next_level: xp_to_next,
            daily_xp: xp.daily_xp,
            daily_xp_limit: 100,
        };
        Ok(serde_json::to_value(public).map_err(|e| AppError::Internal(e.to_string()))?)
    }

    pub async fn get_xp_logs(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let logs = self.repo.get_user_xp_logs(user_id, 50).await?;
        Ok(logs.iter().map(|l| serde_json::json!({
            "id": l.id,
            "action_type": l.action_type,
            "xp_gained": l.xp_gained,
            "description": l.description,
            "created_at": l.created_at,
        })).collect())
    }

    pub async fn daily_login(&self, user_id: Uuid) -> Result<serde_json::Value, AppError> {
        use polis_core::models::DailyLoginResponse;
        let (daily, date) = self.repo.get_daily_xp(user_id).await?;
        let today = chrono::Utc::now().date_naive();
        if date == Some(today) {
            return Err(AppError::Validation("今日已签到".to_string()));
        }
        let xp_gained = 5;
        let new_total = self.repo.award_xp(user_id, "daily_login", xp_gained, "每日签到", None, None).await?;
        self.repo.set_daily_xp(user_id, daily + xp_gained).await?;
        let xp = self.repo.get_or_create_user_xp(user_id).await?;
        let resp = DailyLoginResponse {
            xp_gained,
            streak_days: 1,
            total_xp: new_total,
            current_level: xp.current_level,
        };
        Ok(serde_json::to_value(resp).map_err(|e| AppError::Internal(e.to_string()))?)
    }

    pub async fn award_xp_bridge(&self, user_id: Uuid, action_type: &str, description: &str, target_type: Option<&str>, target_id: Option<Uuid>) -> Result<(), AppError> {
        let xp_amount = match action_type {
            "post_created" => 50,
            "comment_created" => 5,
            "like_received" => 10,
            "follow_user" => 3,
            "share_content" => 2,
            "join_space" => 5,
            "first_tip" => 20,
            _ => 1,
        };
        self.repo.award_xp(user_id, action_type, xp_amount, description, target_type, target_id).await?;
        Ok(())
    }

    // ==================== 新手任务 ====================

    pub async fn get_onboarding_status(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        use polis_core::models::UserQuestPublic;
        let quests = self.repo.get_onboarding_quests().await?;
        let user_quests = self.repo.get_user_quests(user_id).await?;
        Ok(quests.iter().map(|q| {
            let uq = user_quests.iter().find(|uq| uq.quest_key == q.quest_key);
            let pq = UserQuestPublic {
                quest_key: q.quest_key.clone(),
                title: q.title.clone(),
                description: q.description.clone(),
                icon: q.icon.clone(),
                xp_reward: q.xp_reward,
                is_completed: uq.map(|u| u.is_completed).unwrap_or(false),
                is_claimed: uq.map(|u| u.is_claimed).unwrap_or(false),
            };
            serde_json::to_value(pq).unwrap_or_default()
        }).collect())
    }

    pub async fn complete_onboarding_quest(&self, user_id: Uuid, quest_key: &str) -> Result<bool, AppError> {
        self.repo.complete_quest(user_id, quest_key).await
    }

    pub async fn claim_quest_reward(&self, user_id: Uuid, quest_key: &str) -> Result<serde_json::Value, AppError> {
        let xp = self.repo.claim_quest(user_id, quest_key).await?;
        match xp {
            Some(amount) => {
                self.repo.award_xp(user_id, "quest_completed", amount, &format!("完成任务: {}", quest_key), None, None).await?;
                Ok(serde_json::json!({"claimed": true, "xp_gained": amount}))
            }
            None => Err(AppError::Validation("任务未完成或已领取".to_string())),
        }
    }

    // ==================== 徽章 ====================

    pub async fn get_badges(&self, user_id: Uuid) -> Result<Vec<serde_json::Value>, AppError> {
        let badges = self.repo.get_user_badges(user_id).await?;
        Ok(badges.iter().map(|b| serde_json::json!({
            "badge_key": b.badge_key,
            "badge_name": b.badge_name,
            "badge_icon": b.badge_icon,
            "badge_description": b.badge_description,
            "earned_at": b.earned_at,
        })).collect())
    }

    // ==================== 邀请系统 ====================

    pub async fn create_invite(&self, user_id: Uuid) -> Result<serde_json::Value, AppError> {

        let code = self.repo.create_invite_code(user_id).await?;
        let count = self.repo.count_invitees(user_id).await?;
        let rewards = self.repo.get_invite_rewards(user_id).await?;
        let total_xp: i64 = rewards.iter().map(|r| r.xp_amount as i64).sum();
        Ok(serde_json::json!({
            "code": code.code,
            "invite_url": format!("https://mzgw.com/invite?code={}", code.code),
            "total_invited": count,
            "total_rewards_xp": total_xp,
        }))
    }

    pub async fn redeem_invite(&self, invitee_id: Uuid, code: &str) -> Result<serde_json::Value, AppError> {
        let inviter_id = self.repo.redeem_invite(code, invitee_id).await?
            .ok_or(AppError::NotFound("邀请码无效或已被使用".to_string()))?;
        if inviter_id == invitee_id {
            return Err(AppError::Validation("不能使用自己的邀请码".to_string()));
        }
        self.repo.create_invite_reward(inviter_id, invitee_id, 100).await?;
        self.repo.award_xp(inviter_id, "invite_accepted", 100, "邀请好友加入", None, None).await?;
        self.repo.award_xp(invitee_id, "invite_joined", 50, "通过邀请码加入", None, None).await?;
        Ok(serde_json::json!({"redeemed": true, "xp_gained": 50}))
    }

    // ==================== Push 订阅 ====================

    pub async fn subscribe_push(&self, user_id: Uuid, req: polis_core::models::PushSubscribeRequest) -> Result<(), AppError> {
        self.repo.save_push_subscription(user_id, &req.endpoint, &req.p256dh_key, &req.auth_key, req.user_agent.as_deref()).await
    }

    pub async fn unsubscribe_push(&self, user_id: Uuid, endpoint: &str) -> Result<(), AppError> {
        self.repo.delete_push_subscription(user_id, endpoint).await
    }

    /// 用 refresh token 换取新的 access + refresh token 对 (token rotation)
    pub async fn refresh_token(&self, refresh_token: &str) -> Result<LoginResponse, AppError> {
        let claims = auth::verify_token(refresh_token, &self.config.jwt_secret)
            .map_err(|_| AppError::Unauthorized)?;

        if claims.token_type.as_deref() != Some("refresh") {
            return Err(AppError::Unauthorized);
        }

        // 检查 refresh token 是否被撤销
        if let Some(ref jti) = claims.jti {
            if self.token_blacklist.is_blacklisted(jti).await {
                return Err(AppError::Unauthorized);
            }
            // 撤销旧 refresh token，并通知其他服务
            self.token_blacklist.blacklist(jti).await;
            self.nats_publish_blacklisted(jti).await;
        }

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized)?;

        let user = self.repo.find_by_id(user_id).await?
            .ok_or(AppError::Unauthorized)?;

        let access_expiry = self.config.jwt_access_expiry;
        let refresh_expiry = self.config.jwt_refresh_expiry;

        let access_token = auth::generate_access_token(
            user_id, &user.username, &user.display_name,
            &self.config.jwt_secret, access_expiry,
        ).map_err(|e| AppError::Internal(e.to_string()))?;

        let new_refresh_token = auth::generate_refresh_token(
            user_id, &user.username, &user.display_name,
            &self.config.jwt_secret, refresh_expiry,
        ).map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(LoginResponse {
            access_token,
            refresh_token: new_refresh_token,
            user: user.into(),
        })
    }

    /// 登出 — 撤销 access token（和可选的 refresh token）
    pub async fn logout(&self, jti: &str, refresh_token: Option<&str>) -> Result<(), AppError> {
        // 撤销 access token
        self.token_blacklist.blacklist(jti).await;
        self.nats_publish_blacklisted(jti).await;

        // 如果提供了 refresh token，也撤销它
        if let Some(rt) = refresh_token {
            if let Ok(claims) = auth::verify_token(rt, &self.config.jwt_secret) {
                if let Some(ref rt_jti) = claims.jti {
                    self.token_blacklist.blacklist(rt_jti).await;
                    self.nats_publish_blacklisted(rt_jti).await;
                }
            }
        }

        Ok(())
    }
}
