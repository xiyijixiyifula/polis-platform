use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

pub async fn list(
    config: &Config,
    client: &HttpClient,
    page: u32,
    size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get(&format!("/api/notifications?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn unread(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/notifications/unread-count", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn read_all(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let _resp = client.post("/api/notifications/read-all", Some(&token), &json!({})).await?;
    print_success("All notifications marked as read");
    Ok(())
}

pub async fn announce(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/{}/announcements", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}
