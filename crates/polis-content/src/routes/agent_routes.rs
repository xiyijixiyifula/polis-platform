use std::sync::Arc;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{
    ApiResponse, RegisterAgentRequest, AgentApiKeyLoginRequest, AgentLoginRequest,
    RegisterSpaceAgentRequest, UpdateAgentStatusRequest,
};
use crate::handlers::content_handler::ContentHandler;
use crate::handlers::agent_handler::AgentHandler;

type JVal = ApiResponse<serde_json::Value>;
fn ok(d: serde_json::Value) -> Json<JVal> {
    Json(JVal { code: 0, message: "ok".to_string(), data: Some(d), pagination: None })
}

fn extract_user_id(headers: &HeaderMap) -> Result<Option<Uuid>, AppError> {
    let auth = match headers.get("Authorization").and_then(|v| v.to_str().ok()) {
        Some(h) => h, None => return Ok(None),
    };
    let token = match auth.strip_prefix("Bearer ") {
        Some(t) => t, None => return Ok(None),
    };
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());
    match jsonwebtoken::decode::<Claims>(token, &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()), &jsonwebtoken::Validation::default()) {
        Ok(data) => Uuid::parse_str(&data.claims.sub).map(Some).map_err(|_| AppError::Forbidden("Invalid token".to_string())),
        Err(_) => Ok(None),
    }
}

fn require_user(headers: &HeaderMap) -> Result<Uuid, AppError> {
    extract_user_id(headers)?.ok_or(AppError::Forbidden("请先登录".to_string()))
}

#[derive(serde::Deserialize)]
struct Claims { sub: String }

pub fn agent_routes() -> Router<Arc<ContentHandler>> {
    Router::new()
        // Agent 注册 & 认证（无需登录）
        .route("/api/agents/register", post(register_agent))
        .route("/api/agents/login", post(agent_login))
        .route("/api/agents/api-key-login", post(agent_api_key_login))
        // Agent 管理（需登录）
        .route("/api/agents/mine", get(list_my_agents))
        .route("/api/agents/mine/{id}/status", post(update_agent_status))
        .route("/api/agents/{id}", get(get_agent))
        // 社区 Agent 目录
        .route("/api/spaces/{space_id}/agents", get(list_space_agents).post(register_space_agent))
}

async fn register_agent(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
    Json(req): Json<RegisterAgentRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = AgentHandler::new(h.pool.clone());
    let (result, _api_key) = handler.register(uid, req).await?;
    Ok(ok(result))
}

async fn agent_login(
    State(h): State<Arc<ContentHandler>>,
    Json(req): Json<AgentLoginRequest>,
) -> Result<Json<JVal>, AppError> {
    // Agent 密码登录（直接查 users 表 + argon2 验证）
    // 查找 agent user 并生成 token
    let user: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT id, password_hash FROM users WHERE username = $1 AND user_type = 'agent'",
    )
    .bind(&req.username)
    .fetch_optional(&h.pool)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let (user_id, password_hash) = user.ok_or(AppError::Forbidden("Agent 不存在".to_string()))?;

    use argon2::{Argon2, PasswordHash, PasswordVerifier};
    let parsed = PasswordHash::new(&password_hash).map_err(|e| AppError::Internal(e.to_string()))?;
    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed)
        .map_err(|_| AppError::Forbidden("密码错误".to_string()))?;

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "polis-dev-jwt-secret-do-not-use-in-prod".to_string());
    let claims = serde_json::json!({
        "sub": user_id.to_string(),
        "user_type": "agent",
        "exp": (chrono::Utc::now() + chrono::Duration::days(7)).timestamp(),
    });
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(ok(serde_json::json!({ "token": token, "user_type": "agent" })))
}

async fn agent_api_key_login(
    State(h): State<Arc<ContentHandler>>,
    Json(req): Json<AgentApiKeyLoginRequest>,
) -> Result<Json<JVal>, AppError> {
    let handler = AgentHandler::new(h.pool.clone());
    let token = handler.login_by_api_key(req.agent_id, &req.api_key).await?;
    Ok(ok(serde_json::json!({ "token": token, "user_type": "agent" })))
}

async fn list_my_agents(
    State(h): State<Arc<ContentHandler>>,
    headers: HeaderMap,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = AgentHandler::new(h.pool.clone());
    let agents = handler.list_mine(uid).await?;
    Ok(ok(serde_json::to_value(agents).unwrap_or_default()))
}

async fn get_agent(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
) -> Result<Json<JVal>, AppError> {
    let handler = AgentHandler::new(h.pool.clone());
    let agent = handler.get(id).await?;
    Ok(ok(serde_json::to_value(agent).unwrap_or_default()))
}

async fn update_agent_status(
    State(h): State<Arc<ContentHandler>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateAgentStatusRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = AgentHandler::new(h.pool.clone());
    handler.update_status(id, uid, req).await?;
    Ok(ok(serde_json::json!("状态已更新")))
}

async fn list_space_agents(
    State(h): State<Arc<ContentHandler>>,
    Path(space_id): Path<Uuid>,
) -> Result<Json<JVal>, AppError> {
    let handler = AgentHandler::new(h.pool.clone());
    let agents = handler.list_space_agents(space_id).await?;
    Ok(ok(serde_json::to_value(agents).unwrap_or_default()))
}

async fn register_space_agent(
    State(h): State<Arc<ContentHandler>>,
    Path(space_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<RegisterSpaceAgentRequest>,
) -> Result<Json<JVal>, AppError> {
    let uid = require_user(&headers)?;
    let handler = AgentHandler::new(h.pool.clone());
    let sa = handler.register_to_space(space_id, req.agent_id, uid, req).await?;
    Ok(ok(serde_json::to_value(sa).unwrap_or_default()))
}
