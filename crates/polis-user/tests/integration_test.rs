use polis_core::models::{LoginRequest, RegisterRequest};
use polis_core::token_blacklist::TokenBlacklist;
use polis_user::auth;
use polis_user::config::UserServiceConfig;
use polis_user::handlers::user_handler::UserHandler;
use sqlx::PgPool;
use uuid::Uuid;

const JWT_SECRET: &str = "test-secret-key-for-integration-tests-32bytes!";

/// Generate a unique email for test isolation.
fn unique_email(prefix: &str) -> String {
    format!("{}-{}@example.com", prefix, Uuid::new_v4())
}

/// Generate a unique username for test isolation.
fn unique_username(prefix: &str) -> String {
    let short_id = Uuid::new_v4().to_string();
    // Keep under 39 chars (max username length enforced by handler)
    format!("{}-{}", prefix, &short_id[..8])
}

/// Build a UserServiceConfig suitable for tests.
fn test_config(db_url: &str) -> UserServiceConfig {
    UserServiceConfig {
        host: "127.0.0.1".to_string(),
        port: 3001,
        database_url: db_url.to_string(),
        redis_url: "redis://localhost:6379".to_string(),
        jwt_secret: JWT_SECRET.to_string(),
        jwt_access_expiry: 900,   // 15 minutes
        jwt_refresh_expiry: 604800, // 7 days
        nats_url: "nats://localhost:4222".to_string(),
        frontend_url: "http://localhost:3000".to_string(),
        internal_api_secret: "test-internal-api-secret".to_string(),
    }
}

/// Run the minimal schema migrations required by UserHandler.
async fn run_migrations(pool: &PgPool) {
    // users table — matches 001_initial.sql + subsequent migrations (notification_prefs, banned, chain_address)
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(39) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar_url TEXT,
            bio TEXT DEFAULT '',
            verified BOOLEAN DEFAULT FALSE,
            verified_type VARCHAR(20),
            notification_prefs JSONB DEFAULT '{}',
            banned BOOLEAN DEFAULT FALSE,
            banned_at TIMESTAMPTZ,
            ban_reason TEXT,
            chain_address VARCHAR(255),
            chain_bound_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .expect("failed to create users table");

    // token_blacklist table — matches 038_token_blacklist_persist.sql
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS token_blacklist (
            jti VARCHAR(255) PRIMARY KEY,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .expect("failed to create token_blacklist table");
}

/// Check whether Docker is available on this machine.
fn docker_available() -> bool {
    std::process::Command::new("docker")
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Spin up a postgres:16-alpine container via testcontainers, run migrations, return pool + container.
///
/// The container handle MUST be kept alive for the duration of the tests — dropping it stops the container.
///
/// **Method ordering matters**: `GenericImage` methods (`with_exposed_port`, `with_wait_for`) return
/// `Self` and must be called before `ImageExt` methods (`with_env_var`) which convert to `ContainerRequest`.
async fn setup_test_db()
    -> Result<(testcontainers::ContainerAsync<testcontainers::GenericImage>, PgPool), Box<dyn std::error::Error>>
{
    use testcontainers::{
        core::{IntoContainerPort, WaitFor},
        runners::AsyncRunner,
        ContainerAsync, GenericImage, ImageExt,
    };

    let image = GenericImage::new("postgres", "16-alpine")
        .with_exposed_port(5432.tcp())
        .with_wait_for(WaitFor::message_on_stdout(
            "database system is ready to accept connections",
        ))
        // ImageExt methods below — they convert to ContainerRequest<GenericImage>
        .with_env_var("POSTGRES_PASSWORD", "testpassword")
        .with_env_var("POSTGRES_DB", "polis_test");

    let container: ContainerAsync<GenericImage> = image.start().await?;
    let port = container.get_host_port_ipv4(5432).await?;
    let db_url = format!("postgres://postgres:testpassword@127.0.0.1:{port}/polis_test");

    let pool = PgPool::connect(&db_url).await?;
    run_migrations(&pool).await;

    Ok((container, pool))
}

// ── Helpers for building a fresh handler per test ──

fn build_handler(pool: &PgPool) -> UserHandler {
    let config = test_config("test-db"); // db_url not read after construction for handler operations
    UserHandler::new(pool.clone(), config, None, TokenBlacklist::new())
}

// ═══════════════════════════════════════════════════════════════════
// Test 1: Register a new user successfully
// ═══════════════════════════════════════════════════════════════════
async fn test_register_user_success(handler: &UserHandler) {
    let email = unique_email("reg");
    let username = unique_username("reguser");

    let req = RegisterRequest {
        username: username.clone(),
        display_name: Some("Registration Test User".to_string()),
        email: email.clone(),
        password: "securepassword123".to_string(),
    };

    let response = handler
        .register(req)
        .await
        .expect("register should succeed");

    // Token pair must be non-empty
    assert!(!response.access_token.is_empty(), "access_token should not be empty");
    assert!(!response.refresh_token.is_empty(), "refresh_token should not be empty");

    // UserPublic fields should match registration data
    assert_eq!(response.user.username, username);
    assert_eq!(response.user.display_name, "Registration Test User");

    // Verify the access token is a valid JWT issued by us
    let claims =
        auth::verify_token(&response.access_token, JWT_SECRET).expect("access token should be valid");
    assert_eq!(claims.token_type.as_deref(), Some("access"));
    assert_eq!(claims.username.as_deref(), Some(username.as_str()));
}

// ═══════════════════════════════════════════════════════════════════
// Test 2: Register with duplicate email must return an error
// ═══════════════════════════════════════════════════════════════════
async fn test_register_duplicate_email(handler: &UserHandler) {
    let email = unique_email("dup");
    let password = "password123".to_string();

    // First registration — succeeds
    handler
        .register(RegisterRequest {
            username: unique_username("dupuser1"),
            display_name: None,
            email: email.clone(),
            password: password.clone(),
        })
        .await
        .expect("first registration should succeed");

    // Second registration with the same email — must fail
    let result = handler
        .register(RegisterRequest {
            username: unique_username("dupuser2"),
            display_name: None,
            email,
            password,
        })
        .await;

    assert!(result.is_err(), "duplicate email registration must return an error");
}

// ═══════════════════════════════════════════════════════════════════
// Test 3: Login with correct credentials returns token pair
// ═══════════════════════════════════════════════════════════════════
async fn test_login_success(handler: &UserHandler) {
    let email = unique_email("loginok");
    let password = "loginpassword123".to_string();
    let username = unique_username("loginuser");

    // Register
    handler
        .register(RegisterRequest {
            username: username.clone(),
            display_name: Some("Login Test User".to_string()),
            email: email.clone(),
            password: password.clone(),
        })
        .await
        .expect("register should succeed");

    // Login
    let response = handler
        .login(LoginRequest {
            email: email.clone(),
            password: password.clone(),
            remember_me: None,
        })
        .await
        .expect("login should succeed");

    assert!(!response.access_token.is_empty());
    assert!(!response.refresh_token.is_empty());

    // Token should be valid
    let claims =
        auth::verify_token(&response.access_token, JWT_SECRET).expect("access token should be valid");
    assert_eq!(claims.token_type.as_deref(), Some("access"));
    assert_eq!(claims.username.as_deref(), Some(username.as_str()));
}

// ═══════════════════════════════════════════════════════════════════
// Test 4: Login with wrong password must return an error
// ═══════════════════════════════════════════════════════════════════
async fn test_login_wrong_password(handler: &UserHandler) {
    let email = unique_email("wrongpw");

    handler
        .register(RegisterRequest {
            username: unique_username("wrongpwuser"),
            display_name: None,
            email: email.clone(),
            password: "correctpassword123".to_string(),
        })
        .await
        .expect("register should succeed");

    let result = handler
        .login(LoginRequest {
            email,
            password: "wrongpassword456".to_string(),
            remember_me: None,
        })
        .await;

    assert!(result.is_err(), "login with wrong password must return an error");
}

// ═══════════════════════════════════════════════════════════════════
// Test 5: Refresh token flow — rotate and invalidate old token
// ═══════════════════════════════════════════════════════════════════
async fn test_refresh_token(handler: &UserHandler) {
    let email = unique_email("refresh");

    // Register to get initial token pair
    let register_resp = handler
        .register(RegisterRequest {
            username: unique_username("refreshuser"),
            display_name: None,
            email: email.clone(),
            password: "refreshpass123".to_string(),
        })
        .await
        .expect("register should succeed");

    // Use the refresh token to get a new token pair
    let new_tokens = handler
        .refresh_token(&register_resp.refresh_token)
        .await
        .expect("refresh token should produce a new pair");

    assert!(!new_tokens.access_token.is_empty());
    assert!(!new_tokens.refresh_token.is_empty());

    // The new tokens must differ from the original ones (rotation)
    assert_ne!(
        new_tokens.access_token, register_resp.access_token,
        "access token must rotate on refresh"
    );
    assert_ne!(
        new_tokens.refresh_token, register_resp.refresh_token,
        "refresh token must rotate on refresh"
    );

    // The old refresh token must now be revoked (replay protection)
    let replay = handler.refresh_token(&register_resp.refresh_token).await;
    assert!(replay.is_err(), "old refresh token must be rejected after rotation");
}

// ═══════════════════════════════════════════════════════════════════
// Test 6: Logout blacklists tokens — subsequent refresh must fail
// ═══════════════════════════════════════════════════════════════════
async fn test_logout_blacklist(handler: &UserHandler) {
    let email = unique_email("logout");

    let resp = handler
        .register(RegisterRequest {
            username: unique_username("logoutuser"),
            display_name: None,
            email: email.clone(),
            password: "logoutpass123".to_string(),
        })
        .await
        .expect("register should succeed");

    // Extract JTI from the access token
    let claims =
        auth::verify_token(&resp.access_token, JWT_SECRET).expect("access token should be valid");
    let jti = claims
        .jti
        .as_ref()
        .expect("access token must have jti claim");

    // Logout — blacklist both tokens
    handler
        .logout(jti, Some(&resp.refresh_token))
        .await
        .expect("logout should succeed");

    // Verify the access token JTI is in the blacklist
    assert!(
        handler.token_blacklist.is_blacklisted(jti).await,
        "access token JTI must be blacklisted after logout"
    );

    // Using the refresh token after logout must fail
    let refresh_after_logout = handler.refresh_token(&resp.refresh_token).await;
    assert!(
        refresh_after_logout.is_err(),
        "refresh after logout must fail"
    );
}

// ═══════════════════════════════════════════════════════════════════
// Entry point — runs all integration tests against a real PostgreSQL
// ═══════════════════════════════════════════════════════════════════
#[tokio::test]
async fn polis_user_integration_tests() -> Result<(), Box<dyn std::error::Error>> {
    // Skip integration tests if no Docker or DATABASE_URL is available
    if std::env::var("CI").is_ok() && std::env::var("DATABASE_URL").is_err() {
        eprintln!("Skipping integration tests: CI environment without DATABASE_URL");
        return Ok(());
    }
    // When Docker is unavailable (e.g. local dev without Docker Desktop),
    // skip the integration tests gracefully instead of failing.
    if !docker_available() {
        eprintln!(
            "[SKIP] Docker is not available — integration tests require a PostgreSQL container.\n\
             Install Docker or set DATABASE_URL to run these tests against an existing database."
        );
        return Ok(());
    }

    // Start a fresh PostgreSQL container and run schema migrations
    let (_container, pool) = setup_test_db().await?;
    let handler = build_handler(&pool);

    // Execute each test sequentially (shared handler, isolated data via UUIDs)
    test_register_user_success(&handler).await;
    test_register_duplicate_email(&handler).await;
    test_login_success(&handler).await;
    test_login_wrong_password(&handler).await;
    test_refresh_token(&handler).await;
    test_logout_blacklist(&handler).await;

    eprintln!("All 6 polis-user integration tests passed.");
    Ok(())
}
