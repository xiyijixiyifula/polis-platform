use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output};
use serde_json::json;

pub async fn list(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/posts/{}/comments", post_id), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn create(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
    body: &str,
    parent_id: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let mut body_json = json!({"body": body});
    if let Some(p) = parent_id { body_json["parent_id"] = json!(p); }
    let resp = client.post(&format!("/api/posts/{}/comments", post_id), Some(&token), &body_json).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}
