use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, print_output, print_success};
use serde_json::json;

// === Like ===
pub async fn like(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    let _resp = client.post(&format!("/api/spaces/{}/posts/{}/like", namespace, post_id), Some(&token), &body).await?;
    println!("true");
    Ok(())
}

/// Like a comment
pub async fn like_comment(
    config: &Config,
    client: &HttpClient,
    comment_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    let resp = client.post(&format!("/api/comments/{}/like", comment_id), Some(&token), &body).await?;
    let data = resp.as_object().and_then(|o| o.get("data")).and_then(|v| v.as_bool()).unwrap_or(false);
    println!("{}", data);
    Ok(())
}

// === Vote ===
pub async fn vote(
    config: &Config,
    client: &HttpClient,
    action: &str,
    target_type: &str,
    target_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    match action {
        "up" | "down" => {
            let value = if action == "up" { 1 } else { -1 };
            let body = json!({"target_type": target_type, "target_id": target_id, "value": value});
            let resp = client.post("/api/vote", Some(&token), &body).await?;
            print_output(extract_data(&resp), config.format);
        }
        "score" => {
            let resp = client.get(&format!("/api/vote?target_type={}&target_id={}", target_type, target_id), Some(&token)).await?;
            print_output(extract_data(&resp), config.format);
        }
        _ => anyhow::bail!("Unknown vote action: {}", action),
    }
    Ok(())
}

// === Bookmark ===
pub async fn bookmark_add(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    // Use the post-level bookmark endpoint
    let _resp = client.post(&format!("/api/spaces/_/posts/{}/bookmark", post_id), Some(&token), &body).await?;
    println!("true");
    Ok(())
}

pub async fn bookmark_list(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/bookmarks", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// === Report ===
pub async fn report(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    post_id: &str,
    reason: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"reason": reason});
    let _resp = client.post(&format!("/api/spaces/{}/posts/{}/report", namespace, post_id), Some(&token), &body).await?;
    print_success("Reported");
    Ok(())
}
