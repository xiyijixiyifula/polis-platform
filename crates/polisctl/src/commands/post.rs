use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

pub async fn list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    page: u32,
    size: u32,
    module: Option<&str>,
) -> Result<(), anyhow::Error> {
    let mut url = format!("/api/spaces/{}/posts?page={}&page_size={}", namespace, page, size);
    if let Some(m) = module { url.push_str(&format!("&module={}", m)); }
    let resp = client.get(&url, None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn get(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/posts/{}", post_id), None).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn create(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    title: &str,
    body: &str,
    tags: Option<&str>,
    module: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let tags_json: Vec<&str> = tags.map(|t| t.split(',').map(|s| s.trim()).collect()).unwrap_or_default();
    let body_json = json!({
        "title": title,
        "body": body,
        "tags": tags_json,
        "module_type": module.unwrap_or("forum"),
        "content_type": "text"
    });
    let resp = client.post(&format!("/api/spaces/{}/posts", namespace), Some(&token), &body_json).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn update(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
    title: Option<&str>,
    body: Option<&str>,
    tags: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let mut body_json = json!({});
    if let Some(t) = title { body_json["title"] = json!(t); }
    if let Some(b) = body { body_json["body"] = json!(b); }
    if let Some(t) = tags {
        let tags_json: Vec<&str> = t.split(',').map(|s| s.trim()).collect();
        body_json["tags"] = json!(tags_json);
    }
    let resp = client.put(&format!("/api/spaces/_/posts/{}", post_id), Some(&token), &body_json).await?;
    print_output(extract_data(&resp), config.format);
    print_success("Post updated");
    Ok(())
}

pub async fn delete(
    config: &Config,
    client: &HttpClient,
    post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let _resp = client.delete(&format!("/api/spaces/_/posts/{}", post_id), Some(&token)).await?;
    print_success("Post deleted");
    Ok(())
}

pub async fn search_posts(
    config: &Config,
    client: &HttpClient,
    query: &str,
    limit: u32,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/posts/search?q={}&page_size={}", query, limit), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn featured(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/{}/featured", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}
