use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

/// PolisAi community namespace (based on logged-in user's username)
/// Default fallback if user resolution fails
const DEFAULT_QA_NAMESPACE: &str = "原来这是一个大西瓜/PolisAi";
const QA_SPACE_SLUG: &str = "PolisAi";

/// Resolve the PolisAi community namespace dynamically
async fn resolve_qa_namespace(config: &Config, client: &HttpClient) -> Result<String, anyhow::Error> {
    // Try to get current user's profile to build the namespace
    if let Ok(token) = config.require_auth() {
        match client.get("/api/users/me", Some(&token)).await {
            Ok(resp) => {
                if let Some(username) = extract_data(&resp).get("username").and_then(|v| v.as_str()) {
                    return Ok(format!("{}/{}", username, QA_SPACE_SLUG));
                }
            }
            _ => {}
        }
    }
    // Fallback: try saved username from config
    if let Some(username) = config.get_user() {
        return Ok(format!("{}/{}", username, QA_SPACE_SLUG));
    }
    // Last resort
    Ok(DEFAULT_QA_NAMESPACE.to_string())
}

/// Initialize the PolisAi community (idempotent)
/// Creates the space if it doesn't exist with enabled_modules: ["qa"]
pub async fn init(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let namespace = resolve_qa_namespace(config, client).await?;
    let slug = QA_SPACE_SLUG;

    // Check if space already exists
    let check_url = format!("/api/spaces/{}", urlencoding::encode(&namespace));
    match client.get(&check_url, None).await {
        Ok(resp) => {
            if let Some(data) = resp.get("data") {
                if !data.is_null() {
                    print_success(&format!(
                        "PolisAi community already exists: {}",
                        data.get("namespace")
                            .and_then(|n| n.as_str())
                            .unwrap_or(&namespace)
                    ));
                    return Ok(());
                }
            }
        }
        _ => {} // Space not found, proceed to create
    }

    // Create the PolisAi community
    let body = json!({
        "slug": slug,
        "title": "PolisAi",
        "description": "Claude Agent 问答同步社区 — AI对话自动沉淀为问答内容",
        "visibility": "public",
        "enabled_modules": ["qa"]
    });

    match client.post("/api/spaces", Some(&token), &body).await {
        Ok(resp) => {
            let data = extract_data(&resp);
            let ns = data
                .get("namespace")
                .and_then(|n| n.as_str())
                .unwrap_or(&namespace);
            print_success(&format!("PolisAi community created: {}", ns));

            // Auto-join the community
            let join_url = format!("/api/spaces/{}/join", urlencoding::encode(ns));
            let _ = client.post(&join_url, Some(&token), &json!({})).await;
        }
        Err(e) => {
            // Check if conflict (space already exists)
            let msg = e.to_string();
            if msg.contains("already exists") || msg.contains("Conflict") {
                print_success("PolisAi community already exists (concurrent creation)");
            } else {
                anyhow::bail!("Failed to create PolisAi community: {}", msg);
            }
        }
    }

    Ok(())
}

/// Sync a single Q&A: question → post title, answer → post body (qa module)
pub async fn post(
    config: &Config,
    client: &HttpClient,
    question: &str,
    answer: &str,
    body: Option<&str>,
    tags: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let namespace = resolve_qa_namespace(config, client).await?;

    // Ensure the community exists first
    let check_url = format!("/api/spaces/{}", urlencoding::encode(&namespace));
    let space_exists = client.get(&check_url, None).await
        .map(|r| r.get("data").map(|d| !d.is_null()).unwrap_or(false))
        .unwrap_or(false);

    if !space_exists {
        print_success("PolisAi community not found, initializing...");
        init(config, client).await?;
    }

    // Parse tags
    let tags_list: Vec<&str> = tags
        .map(|t| t.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect())
        .unwrap_or_default();

    // body: answer content goes into post body (not as a separate comment)
    let post_body_content = body.unwrap_or(answer);

    // Create the Q&A post: title = question, body = answer
    let post_url = format!(
        "/api/spaces/{}/posts",
        urlencoding::encode(&namespace)
    );

    let post_body = json!({
        "title": question,
        "body": post_body_content,
        "module_type": "qa",
        "content_type": "text",
        "tags": tags_list
    });

    let post_resp = client.post(&post_url, Some(&token), &post_body).await?;
    let post_data = extract_data(&post_resp);
    let post_id = post_data
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Failed to get post ID from response"))?;

    print_success(&format!(
        "Q&A posted: {} → https://www.mzgw.com/post/{}?space={}",
        question.chars().take(50).collect::<String>(),
        post_id,
        urlencoding::encode(&namespace),
    ));

    // Output full result in JSON mode
    print_output(
        &json!({
            "post_id": post_id,
            "title": question,
            "url": format!("https://www.mzgw.com/post/{}?space={}", post_id, urlencoding::encode(&namespace)),
            "tags": tags_list,
        }),
        config.format,
    );

    Ok(())
}

/// List recent Q&A posts in the PolisAi community
pub async fn list(
    config: &Config,
    client: &HttpClient,
    page: u32,
    size: u32,
) -> Result<(), anyhow::Error> {
    let namespace = resolve_qa_namespace(config, client).await?;

    let url = format!(
        "/api/spaces/{}/posts?module=qa&page={}&page_size={}",
        urlencoding::encode(&namespace),
        page,
        size
    );

    let resp = client.get(&url, None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();

    if items.is_empty() {
        print_success("No Q&A posts yet. Use 'polisctl qa post' to sync your first one!");
    } else {
        println!("📋 Q&A Posts (page {}):\n", page);
    }

    print_output(&json!(items), config.format);
    Ok(())
}
