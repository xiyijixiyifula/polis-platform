use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, extract_data_array, print_output, print_success};
use serde_json::json;

pub async fn login(
    config: &Config,
    client: &HttpClient,
    email: &str,
    admin_code: &str,
) -> Result<(), anyhow::Error> {
    let body = json!({
        "email": email,
        "password": "admin123",
        "admin_code": admin_code
    });
    let resp = client.post("/api/admin/login", None, &body).await?;
    if let Some(token) = extract_data(&resp).get("access_token").and_then(|t| t.as_str()) {
        config.save_admin_token(token);
        print_success("Admin logged in");
    } else {
        anyhow::bail!("Admin login failed");
    }
    Ok(())
}

pub async fn dashboard(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get("/api/admin/dashboard", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn stats(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get("/api/admin/stats", Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn users_list(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/users?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn users_get(
    config: &Config, client: &HttpClient, user_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/users/{}", user_id), Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn users_ban(
    config: &Config, client: &HttpClient, user_id: &str, reason: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"reason": reason});
    let _resp = client.post(&format!("/api/admin/users/{}/ban", user_id), Some(&token), &body).await?;
    print_success(&format!("User {} banned", user_id));
    Ok(())
}

pub async fn users_unban(
    config: &Config, client: &HttpClient, user_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/users/{}/unban", user_id), Some(&token), &json!({})).await?;
    print_success(&format!("User {} unbanned", user_id));
    Ok(())
}

pub async fn spaces_list(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/spaces?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn spaces_get(
    config: &Config, client: &HttpClient, space_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/spaces/{}", space_id), Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn spaces_status(
    config: &Config, client: &HttpClient, space_id: &str, status: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"status": status});
    let _resp = client.put(&format!("/api/admin/spaces/{}/status", space_id), Some(&token), &body).await?;
    print_success(&format!("Space {} status set to {}", space_id, status));
    Ok(())
}

pub async fn posts_list(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/posts?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn posts_get(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/posts/{}", post_id), Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn posts_delete(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.delete(&format!("/api/admin/posts/{}", post_id), Some(&token)).await?;
    print_success(&format!("Post {} deleted", post_id));
    Ok(())
}

pub async fn comments_list(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/comments?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn comments_delete(
    config: &Config, client: &HttpClient, comment_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.delete(&format!("/api/admin/comments/{}", comment_id), Some(&token)).await?;
    print_success(&format!("Comment {} deleted", comment_id));
    Ok(())
}

pub async fn reports_list(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/reports?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn reports_resolve(
    config: &Config, client: &HttpClient, report_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/reports/{}/resolve", report_id), Some(&token), &json!({})).await?;
    print_success(&format!("Report {} resolved", report_id));
    Ok(())
}

pub async fn reports_dismiss(
    config: &Config, client: &HttpClient, report_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/reports/{}/dismiss", report_id), Some(&token), &json!({})).await?;
    print_success(&format!("Report {} dismissed", report_id));
    Ok(())
}

pub async fn transactions(
    config: &Config, client: &HttpClient, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(&format!("/api/admin/transactions?page={}&page_size={}", page, size), Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn analytics(
    config: &Config, client: &HttpClient, analytics_type: &str, days: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get(
        &format!("/api/admin/analytics/{}?days={}", analytics_type, days),
        Some(&token),
    ).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}
