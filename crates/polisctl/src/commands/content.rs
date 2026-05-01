use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

// === Poll ===
pub async fn poll_list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/{}/polls", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn poll_get(
    config: &Config,
    client: &HttpClient,
    poll_id: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/polls/{}", poll_id), None).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn poll_vote(
    config: &Config,
    client: &HttpClient,
    poll_id: &str,
    option_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"option_id": option_id});
    let _resp = client.post(&format!("/api/polls/{}/vote", poll_id), Some(&token), &body).await?;
    print_success("Voted");
    Ok(())
}

pub async fn poll_create(
    config: &Config,
    client: &HttpClient,
    space_id: &str,
    title: &str,
    options: Vec<String>,
    poll_type: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({
        "space_id": space_id,
        "title": title,
        "poll_type": poll_type.unwrap_or("single"),
        "options": options
    });
    let resp = client.post("/api/polls", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// === Series ===
pub async fn series_list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/series/space/{}", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn series_get(
    config: &Config,
    client: &HttpClient,
    series_id: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/series/{}", series_id), None).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn series_create(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    title: &str,
    description: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({
        "title": title,
        "description": description.unwrap_or("")
    });
    let resp = client.post(&format!("/api/series/space/{}", namespace), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// === Tier ===
pub async fn tier_list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/tiers/space/{}", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn tier_create(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    name: &str,
    price_cents: i64,
    description: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({
        "name": name,
        "price_cents": price_cents,
        "description": description.unwrap_or("")
    });
    let resp = client.post(&format!("/api/tiers/space/{}", namespace), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// === Subscribe ===
pub async fn subscribe_join(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    tier_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body = json!({"tier_id": tier_id});
    let resp = client.post(&format!("/api/subscribe/space/{}", namespace), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    print_success("Subscribed");
    Ok(())
}

pub async fn subscribe_cancel(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let _resp = client.delete(&format!("/api/subscribe/space/{}", namespace), Some(&token)).await?;
    print_success("Unsubscribed");
    Ok(())
}

pub async fn subscribe_status(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get(&format!("/api/subscribe/space/{}", namespace), Some(&token)).await?;
    let data = extract_data(&resp);
    if data.is_null() {
        eprintln!("\x1b[32mNo active subscription\x1b[0m");
        println!("null");
    } else {
        print_output(data, config.format);
    }
    Ok(())
}

// === File ===
pub async fn file_list(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
) -> Result<(), anyhow::Error> {
    let resp = client.get(&format!("/api/spaces/{}/files", namespace), None).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn file_upload(
    config: &Config,
    client: &HttpClient,
    namespace: &str,
    filepath: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let data = std::fs::read(filepath)?;
    let filename = std::path::Path::new(filepath)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");
    let mime = mime_guess::from_path(filepath)
        .first_or_octet_stream()
        .to_string();
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    let body = json!({
        "filename": filename,
        "data_base64": b64,
        "mime_type": mime
    });
    let resp = client.post(&format!("/api/spaces/{}/files", namespace), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// === Draft ===
pub async fn draft_save(
    config: &Config,
    client: &HttpClient,
    space_id: Option<&str>,
    title: &str,
    body: &str,
    module: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let body_json = json!({
        "space_id": space_id,
        "title": title,
        "body": body,
        "module_type": module.unwrap_or("forum")
    });
    let resp = client.post("/api/drafts", Some(&token), &body_json).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn draft_list(
    config: &Config,
    client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_auth()?;
    let resp = client.get("/api/drafts", Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}
