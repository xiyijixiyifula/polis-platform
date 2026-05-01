use crate::config::Config;
use crate::http::HttpClient;
use crate::output::print_success;
use serde_json::json;

pub async fn follow_user(
    config: &Config,
    client: &HttpClient,
    username: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    let _resp = client.post(&format!("/api/users/{}/follow", username), Some(&token), &body).await?;
    print_success(&format!("Following @{}", username));
    Ok(())
}

pub async fn follow_space(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    let _resp = client.post(&format!("/api/spaces/{}/follow", namespace), Some(&token), &body).await?;
    print_success(&format!("Following space {}", namespace));
    Ok(())
}
