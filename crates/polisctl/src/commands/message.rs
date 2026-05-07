use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output};
use serde_json::json;

/// Send a direct message to another user (requires auth)
pub async fn send(
    config: &Config,
    client: &HttpClient,
    to_user_id: &str,
    content: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"to_user_id": to_user_id, "content": content});
    let resp = client
        .post("/api/messages", Some(&token), &body)
        .await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

/// List all conversations for the current user (requires auth)
pub async fn conversations(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client
        .get("/api/messages/conversations", Some(&token))
        .await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

/// Get conversation messages with another user (requires auth)
pub async fn list(
    config: &Config,
    client: &HttpClient,
    user_id: &str,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(50);
    let resp = client
        .get(
            &format!("/api/messages/{}?page={}&page_size={}", user_id, page, page_size),
            Some(&token),
        )
        .await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

/// Mark messages from a specific user as read (requires auth)
pub async fn read(
    config: &Config,
    client: &HttpClient,
    from_user_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"from_user_id": from_user_id});
    let resp = client
        .post("/api/messages/read", Some(&token), &body)
        .await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

/// Get unread direct message count (requires auth)
pub async fn unread_count(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client
        .get("/api/messages/unread-count", Some(&token))
        .await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}
