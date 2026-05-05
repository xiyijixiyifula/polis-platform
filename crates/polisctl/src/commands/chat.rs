use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output};
use serde_json::json;

/// List recent chat messages in a space (public endpoint)
pub async fn list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    limit: Option<u32>,
) -> Result<(), anyhow::Error> {
    let limit = limit.unwrap_or(50);
    let resp = client
        .get(
            &format!("/api/chat/spaces/{}?limit={}", namespace, limit),
            None,
        )
        .await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

/// Send a chat message to a space (requires auth)
pub async fn send(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    message: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"content": message});
    let resp = client
        .post(
            &format!("/api/chat/spaces/{}", namespace),
            Some(&token),
            &body,
        )
        .await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}
