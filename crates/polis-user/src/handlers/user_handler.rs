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

/// 用户业务逻辑处理器
pub struct UserHandler {
    pub repo: UserRepo,
    pub config: UserServiceConfig,
    pub nats: Option<NatsClient>,
}

impl UserHandler {
    pub fn new(
        pool: PgPool,
        config: UserServiceConfig,
        nats: Option<NatsClient>,
    ) -> Self {
        Self {
            repo: UserRepo::new(pool),
            config,
            nats,
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
        let password_hash = auth::hash_password(&req.password)
            .map_err(|e| AppError::Internal(format!("Password hash error: {}", e)))?;

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

        let valid = auth::verify_password(&req.password, &user.password_hash)
            .map_err(|e| AppError::Internal(format!("Password verify error: {}", e)))?;

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
                let _ = nats.publish(subject.to_string(), data.into()).await;
            }
        }
    }
}

impl UserHandler {
    /// 修改密码
    pub async fn change_password(&self, user_id: Uuid, old_password: &str, new_password: &str) -> Result<(), AppError> {
        let user = self.repo.find_by_id(user_id).await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;
        let valid = crate::auth::verify_password(old_password, &user.password_hash)
            .map_err(|_| AppError::Internal("Password verify error".to_string()))?;
        if !valid { return Err(AppError::Forbidden("Wrong password".to_string())); }
        if new_password.len() < 8 { return Err(AppError::Validation("Password must be at least 8 characters".to_string())); }
        let new_hash = crate::auth::hash_password(new_password)
            .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?;
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

        let new_hash = crate::auth::hash_password(new_password)
            .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?;

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
}
