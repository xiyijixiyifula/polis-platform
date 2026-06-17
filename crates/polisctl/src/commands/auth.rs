use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, print_output, print_success};
use serde_json::json;

pub async fn register(
    config: &Config,
    client: &HttpClient,
    username: &str,
    email: &str,
    password: &str,
    display_name: Option<&str>,
) -> Result<(), anyhow::Error> {
    let display = display_name.unwrap_or(username);
    let body = json!({
        "username": username,
        "email": email,
        "password": password,
        "display_name": display
    });
    let resp = client.post("/api/auth/register", None, &body).await?;
    let data = extract_data(&resp);
    
    if let Some(token) = data.get("access_token").and_then(|t| t.as_str()) {
        if let Some(user) = data.get("user").and_then(|u| u.get("username")).and_then(|u| u.as_str()) {
            config.save_session(token, user);
            print_success(&format!("Registered and logged in as @{}", user));
        }
    }
    
    print_output(data, config.format);
    Ok(())
}

pub async fn login(
    config: &Config,
    client: &HttpClient,
    email: &str,
    password: &str,
) -> Result<(), anyhow::Error> {
    let body = json!({"email": email, "password": password});
    let resp = client.post("/api/auth/login", None, &body).await?;
    let data = extract_data(&resp);
    
    if let Some(token) = data.get("access_token").and_then(|t| t.as_str()) {
        if let Some(user) = data.get("user").and_then(|u| u.get("username")).and_then(|u| u.as_str()) {
            config.save_session(token, user);
            print_success(&format!("Logged in as @{}", user));
        }
    }
    
    print_output(data, config.format);
    Ok(())
}

pub async fn whoami(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/users/me", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn logout(config: &Config) -> Result<(), anyhow::Error> {
    let token_file = &config.token_file;
    let user_file = &config.user_file;
    std::fs::write(token_file, "").ok();
    std::fs::write(user_file, "").ok();
    print_success("Logged out");
    Ok(())
}

pub async fn show_token(config: &Config) -> Result<(), anyhow::Error> {
    match config.get_token() {
        Some(t) => println!("{}", t),
        None => anyhow::bail!("Not logged in"),
    }
    Ok(())
}

pub async fn forgot_password(
    config: &Config,
    client: &HttpClient,
    email: &str,
) -> Result<(), anyhow::Error> {
    let body = json!({"email": email});
    let resp = client.post("/api/auth/forgot-password", None, &body).await?;
    let data = extract_data(&resp);
    print_output(data, config.format);
    print_success("If the email is registered, a reset link has been sent");
    Ok(())
}

pub async fn reset_password(
    config: &Config,
    client: &HttpClient,
    token: &str,
    new_password: &str,
) -> Result<(), anyhow::Error> {
    let body = json!({"token": token, "new_password": new_password});
    let resp = client.post("/api/auth/reset-password", None, &body).await?;
    let data = extract_data(&resp);
    print_output(data, config.format);
    print_success("Password reset successfully");
    Ok(())
}

pub async fn export_data(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/users/me/export", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}
