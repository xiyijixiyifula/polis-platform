use polis_core::error::AppError;
use polis_core::models::{
    Agent, AgentPublic, RegisterAgentRequest, SpaceAgent, SpaceAgentPublic,
    RegisterSpaceAgentRequest, UpdateAgentStatusRequest,
};
use sqlx::PgPool;
use uuid::Uuid;

pub struct AgentHandler {
    pool: PgPool,
}

impl AgentHandler {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 注册 Agent 用户
    pub async fn register(
        &self,
        owner_user_id: Uuid,
        req: RegisterAgentRequest,
    ) -> Result<(serde_json::Value, String), AppError> {
        // 检查用户名是否已被使用
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM users WHERE username = $1",
        )
        .bind(&req.username)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::Conflict("用户名已被使用".to_string()));
        }

        // 生成 API Key
        let api_key = format!("pk_{}", Uuid::new_v4().to_string().replace('-', ""));
        let api_key_prefix = &api_key[..8];

        // 哈希密码
        use argon2::{
            password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
            Argon2,
        };
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(req.password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(e.to_string()))?
            .to_string();

        let api_key_hash = argon2
            .hash_password(api_key.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(e.to_string()))?
            .to_string();

        // 创建 user 记录
        let user: (Uuid,) = sqlx::query_as(
            r#"INSERT INTO users (username, display_name, email, password_hash, user_type)
               VALUES ($1, $2, $3, $4, 'agent') RETURNING id"#,
        )
        .bind(&req.username)
        .bind(&req.display_name)
        .bind(format!("agent_{}@polis.internal", &req.username))
        .bind(&password_hash)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        // 创建 agent 记录
        let capabilities = serde_json::to_value(&req.capabilities).unwrap_or_default();
        sqlx::query(
            r#"INSERT INTO agents (user_id, owner_user_id, agent_type, capabilities, api_key_hash, api_key_prefix)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(user.0)
        .bind(owner_user_id)
        .bind(&req.agent_type)
        .bind(&capabilities)
        .bind(&api_key_hash)
        .bind(api_key_prefix)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let result = serde_json::json!({
            "agent_id": user.0,
            "username": req.username,
            "display_name": req.display_name,
            "api_key": api_key,
            "message": "请妥善保存 API Key，此后不会再次显示"
        });

        Ok((result, api_key))
    }

    /// API Key 登录（返回 JWT）
    pub async fn login_by_api_key(
        &self,
        agent_id: Uuid,
        api_key: &str,
    ) -> Result<String, AppError> {
        let agent: Option<Agent> = sqlx::query_as(
            r#"SELECT a.* FROM agents a
               JOIN users u ON u.id = a.user_id
               WHERE a.id = $1 AND u.user_type = 'agent' AND a.is_active = TRUE"#,
        )
        .bind(agent_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let agent = agent.ok_or(AppError::Forbidden("Agent 不存在或已禁用".to_string()))?;

        // 验证 API Key
        use argon2::{Argon2, PasswordHash, PasswordVerifier};
        let api_key_hash = agent.api_key_hash.ok_or(AppError::Forbidden("Agent 未设置 API Key".to_string()))?;
        let parsed_hash = PasswordHash::new(&api_key_hash)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Argon2::default()
            .verify_password(api_key.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Forbidden("API Key 无效".to_string()))?;

        // 更新最后活跃时间
        let _ = sqlx::query("UPDATE agents SET last_active_at = NOW() WHERE id = $1")
            .bind(agent.id)
            .execute(&self.pool)
            .await;

        // 生成 JWT
        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());
        let claims = serde_json::json!({
            "sub": agent.user_id.to_string(),
            "agent_id": agent.id.to_string(),
            "user_type": "agent",
            "exp": (chrono::Utc::now() + chrono::Duration::days(7)).timestamp(),
        });
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(token)
    }

    /// 获取 Agent 详情
    pub async fn get(&self, agent_id: Uuid) -> Result<AgentPublic, AppError> {
        let row: Option<(Uuid, Uuid, String, String, String, serde_json::Value, bool, String, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            r#"SELECT a.id, u.id, u.username, u.display_name, a.agent_type, a.capabilities,
                      a.is_active, a.status, a.last_active_at, a.created_at
               FROM agents a JOIN users u ON u.id = a.user_id
               WHERE a.id = $1"#,
        )
        .bind(agent_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        let (id, user_id, username, display_name, agent_type, capabilities, is_active, status, last_active_at, created_at) =
            row.ok_or(AppError::NotFound("Agent 不存在".to_string()))?;

        let cap_list: Vec<String> = serde_json::from_value(capabilities).unwrap_or_default();

        Ok(AgentPublic {
            id,
            user_id,
            username,
            display_name,
            agent_type,
            capabilities: cap_list,
            is_active,
            status,
            last_active_at,
            created_at,
        })
    }

    /// 列出我的 Agent
    pub async fn list_mine(&self, owner_user_id: Uuid) -> Result<Vec<AgentPublic>, AppError> {
        let rows: Vec<(Uuid, Uuid, String, String, String, serde_json::Value, bool, String, Option<chrono::DateTime<chrono::Utc>>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            r#"SELECT a.id, u.id, u.username, u.display_name, a.agent_type, a.capabilities,
                      a.is_active, a.status, a.last_active_at, a.created_at
               FROM agents a JOIN users u ON u.id = a.user_id
               WHERE a.owner_user_id = $1 ORDER BY a.created_at DESC"#,
        )
        .bind(owner_user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(rows.into_iter().map(|(id, user_id, username, display_name, agent_type, capabilities, is_active, status, last_active_at, created_at)| {
            let cap_list: Vec<String> = serde_json::from_value(capabilities).unwrap_or_default();
            AgentPublic { id, user_id, username, display_name, agent_type, capabilities: cap_list, is_active, status, last_active_at, created_at }
        }).collect())
    }

    /// 更新 Agent 状态
    pub async fn update_status(&self, agent_id: Uuid, owner_id: Uuid, req: UpdateAgentStatusRequest) -> Result<(), AppError> {
        let result = sqlx::query(
            "UPDATE agents SET status = $1, last_active_at = NOW() WHERE id = $2 AND owner_user_id = $3",
        )
        .bind(&req.status)
        .bind(agent_id)
        .bind(owner_id)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Agent 不存在".to_string()));
        }
        Ok(())
    }

    /// 将 Agent 注册到社区
    pub async fn register_to_space(
        &self,
        space_id: Uuid,
        agent_id: Uuid,
        registered_by: Uuid,
        req: RegisterSpaceAgentRequest,
    ) -> Result<SpaceAgent, AppError> {
        // 验证社区权限（需要是社区管理员）
        let is_admin: Option<(Uuid,)> = sqlx::query_as(
            "SELECT owner_id FROM spaces WHERE id = $1 AND owner_id = $2",
        )
        .bind(space_id)
        .bind(registered_by)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        if is_admin.is_none() {
            return Err(AppError::Forbidden("仅社区管理员可注册 Agent".to_string()));
        }

        let trigger_words = serde_json::to_value(req.trigger_words.unwrap_or_default()).unwrap_or_default();
        let auto_trigger = req.auto_trigger.unwrap_or(serde_json::json!({}));

        let sa = sqlx::query_as::<_, SpaceAgent>(
            r#"INSERT INTO space_agents (space_id, agent_id, registered_by, trigger_words, auto_trigger)
               VALUES ($1, $2, $3, $4, $5) RETURNING *"#,
        )
        .bind(space_id)
        .bind(agent_id)
        .bind(registered_by)
        .bind(&trigger_words)
        .bind(&auto_trigger)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(sa)
    }

    /// 列出社区的 Agent
    pub async fn list_space_agents(&self, space_id: Uuid) -> Result<Vec<SpaceAgentPublic>, AppError> {
        let rows: Vec<(Uuid, Uuid, serde_json::Value, serde_json::Value, chrono::DateTime<chrono::Utc>, Uuid, Uuid, String, String, String, serde_json::Value, bool, String)> = sqlx::query_as(
            r#"SELECT sa.id, sa.space_id, sa.trigger_words, sa.auto_trigger, sa.created_at,
                      a.id, u.id, u.username, u.display_name, a.agent_type, a.capabilities, a.is_active, a.status
               FROM space_agents sa
               JOIN agents a ON a.id = sa.agent_id
               JOIN users u ON u.id = a.user_id
               WHERE sa.space_id = $1 AND sa.is_active = TRUE
               ORDER BY sa.created_at DESC"#,
        )
        .bind(space_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(rows.into_iter().map(|(sa_id, sa_space_id, trigger_words, auto_trigger, sa_created_at, a_id, u_id, username, display_name, agent_type, capabilities, is_active, status)| {
            let cap_list: Vec<String> = serde_json::from_value(capabilities).unwrap_or_default();
            let tw_list: Vec<String> = serde_json::from_value(trigger_words).unwrap_or_default();
            SpaceAgentPublic {
                id: sa_id,
                space_id: sa_space_id,
                agent: AgentPublic {
                    id: a_id, user_id: u_id, username, display_name, agent_type,
                    capabilities: cap_list, is_active, status,
                    last_active_at: None, created_at: sa_created_at,
                },
                trigger_words: tw_list,
                auto_trigger,
                created_at: sa_created_at,
            }
        }).collect())
    }
}
