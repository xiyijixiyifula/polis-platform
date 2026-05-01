use std::sync::Arc;
use axum::{extract::{Path, State}, middleware, routing::{get, post, put}, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use polis_core::error::AppError;
use polis_core::models::{ApiResponse, LoginRequest, LoginResponse, RegisterRequest, UpdateUserRequest, UserPublic};
use crate::handlers::user_handler::UserHandler;
use crate::middleware::auth::auth_middleware;

#[derive(Deserialize)]
pub struct ChangePasswordRequest { pub old_password: String, pub new_password: String }
#[derive(Deserialize)]
pub struct ForgotPasswordRequest { pub email: String }
#[derive(Deserialize)]
pub struct FollowRequest { pub followee_type: String, pub followee_id: Uuid }

pub fn user_routes(handler: Arc<UserHandler>) -> Router {
    let public = Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/forgot-password", post(forgot_password))
        .route("/api/users/{username}", get(get_user_profile))
        .route("/api/users/{username}/spaces", get(get_user_spaces))
        .route("/api/users/{username}/followers", get(get_followers))
        .route("/api/users/{username}/following", get(get_following));
    let auth = Router::new()
        .route("/api/users/me", get(get_my_profile).put(update_profile))
        .route("/api/users/me/password", put(change_password))
        .route("/api/users/me/settings", put(update_settings))
        .route("/api/follow", post(toggle_follow))
        .route_layer(middleware::from_fn_with_state(handler.clone(), auth_middleware));
    public.merge(auth).with_state(handler)
}

async fn register(State(h): State<Arc<UserHandler>>, Json(r): Json<RegisterRequest>) -> Result<Json<ApiResponse<LoginResponse>>, AppError> {
    Ok(Json(ApiResponse::success(h.register(r).await?)))
}
async fn login(State(h): State<Arc<UserHandler>>, Json(r): Json<LoginRequest>) -> Result<Json<ApiResponse<LoginResponse>>, AppError> {
    Ok(Json(ApiResponse::success(h.login(r).await?)))
}
async fn get_user_profile(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_user_profile(&u).await?)))
}
async fn get_user_spaces(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_user_spaces(&u).await?)))
}
async fn update_profile(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<UpdateUserRequest>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.update_profile(uid, r).await?)))
}
async fn get_my_profile(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>) -> Result<Json<ApiResponse<UserPublic>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_my_profile(uid).await?)))
}
async fn change_password(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<ChangePasswordRequest>) -> Result<Json<ApiResponse<()>>, AppError> {
    h.change_password(uid, &r.old_password, &r.new_password).await?;
    Ok(Json(ApiResponse::success(())))
}
async fn forgot_password(State(h): State<Arc<UserHandler>>, Json(r): Json<ForgotPasswordRequest>) -> Result<Json<ApiResponse<String>>, AppError> {
    let token = h.generate_reset_token(&r.email).await?;
    Ok(Json(ApiResponse::success(token)))
}
async fn update_settings(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<serde_json::Value>) -> Result<Json<ApiResponse<()>>, AppError> {
    // Settings stored as JSON in user metadata (for future)
    Ok(Json(ApiResponse::success(())))
}
async fn toggle_follow(State(h): State<Arc<UserHandler>>, axum::Extension(uid): axum::Extension<Uuid>, Json(r): Json<FollowRequest>) -> Result<Json<ApiResponse<bool>>, AppError> {
    Ok(Json(ApiResponse::success(h.toggle_follow(uid, &r.followee_type, r.followee_id).await?)))
}
async fn get_followers(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_followers(&u).await?)))
}
async fn get_following(State(h): State<Arc<UserHandler>>, Path(u): Path<String>) -> Result<Json<ApiResponse<Vec<serde_json::Value>>>, AppError> {
    Ok(Json(ApiResponse::success(h.get_following(&u).await?)))
}
