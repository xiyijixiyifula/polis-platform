use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

pub async fn view(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/users/me", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn update(
    config: &Config,
    client: &HttpClient,
    display_name: Option<&str>,
    bio: Option<&str>,
    avatar_url: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let mut body = json!({});
    if let Some(d) = display_name { body["display_name"] = json!(d); }
    if let Some(b) = bio { body["bio"] = json!(b); }
    if let Some(a) = avatar_url { body["avatar_url"] = json!(a); }
    let resp = client.put("/api/users/me", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    print_success("Profile updated");
    Ok(())
}

pub async fn password(
    config: &Config,
    client: &HttpClient,
    old_password: &str,
    new_password: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"old_password": old_password, "new_password": new_password});
    let resp = client.put("/api/users/me/password", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    print_success("Password changed");
    Ok(())
}

pub async fn spaces(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let username = config.get_user().unwrap_or_default();
    let resp = client.get(&format!("/api/users/{}/spaces", username), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn followers(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let username = config.get_user().unwrap_or_default();
    let resp = client.get(&format!("/api/users/{}/followers", username), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn following(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let username = config.get_user().unwrap_or_default();
    let resp = client.get(&format!("/api/users/{}/following", username), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}
