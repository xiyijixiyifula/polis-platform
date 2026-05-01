use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

pub async fn search(
    config: &Config,
    client: &HttpClient,
    query: &str,
    page: u32,
    size: u32,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/search?q={}&page={}&page_size={}", query, page, size), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn trending(
    config: &Config,
    client: &HttpClient,
    page: u32,
    size: u32,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/trending?page={}&page_size={}", page, size), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn get(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/{}", namespace), None).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn join(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({});
    let _resp = client.post(&format!("/api/spaces/{}/join", namespace), Some(&token), &body).await?;
    print_success(&format!("Joined space {}", namespace));
    Ok(())
}

pub async fn leave(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let _resp = client.delete(&format!("/api/spaces/{}/leave", namespace), Some(&token)).await?;
    print_success(&format!("Left space {}", namespace));
    Ok(())
}

pub async fn create(
    config: &Config,
    client: &HttpClient,
    slug: &str,
    title: &str,
    description: Option<&str>,
    visibility: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({
        "slug": slug,
        "title": title,
        "description": description.unwrap_or(""),
        "visibility": visibility.unwrap_or("public")
    });
    let resp = client.post("/api/spaces", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    print_success(&format!("Space created: {}", slug));
    Ok(())
}

pub async fn update(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    title: Option<&str>,
    description: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let mut body = json!({});
    if let Some(t) = title { body["title"] = json!(t); }
    if let Some(d) = description { body["description"] = json!(d); }
    let resp = client.put(&format!("/api/spaces/{}", namespace), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    print_success("Space updated");
    Ok(())
}

pub async fn root(
    config: &Config,
    client: &HttpClient,
    slug: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/root/{}", slug), None).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn subspaces(
    config: &Config,
    client: &HttpClient,
    slug: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/root/{}/subspaces", slug), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}
