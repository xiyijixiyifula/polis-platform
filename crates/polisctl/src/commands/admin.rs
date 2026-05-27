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

pub async fn users_hide_works(
    config: &Config, client: &HttpClient, user_id: &str, reason: &str, duration_hours: Option<i32>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"reason": reason, "duration_hours": duration_hours});
    let resp = client.post(&format!("/api/admin/users/{}/hide-works", user_id), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn users_hide_spaces(
    config: &Config, client: &HttpClient, user_id: &str, reason: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"reason": reason});
    let resp = client.post(&format!("/api/admin/users/{}/hide-spaces", user_id), Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
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
    target_action: Option<&str>, target_reason: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"action": "resolve", "target_action": target_action, "target_action_reason": target_reason});
    let _resp = client.post(&format!("/api/admin/reports/{}/resolve", report_id), Some(&token), &body).await?;
    print_success(&format!("Report {} resolved", report_id));
    Ok(())
}

pub async fn reports_dismiss(
    config: &Config, client: &HttpClient, report_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/reports/{}/resolve", report_id), Some(&token), &json!({"action": "dismiss"})).await?;
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

pub async fn posts_approve(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/posts/{}/approve", post_id), Some(&token), &json!({})).await?;
    print_success(&format!("Post {} approved", post_id));
    Ok(())
}

pub async fn posts_reject(
    config: &Config, client: &HttpClient, post_id: &str, reason: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"reason": reason.unwrap_or("violation")});
    let _resp = client.post(&format!("/api/admin/posts/{}/reject", post_id), Some(&token), &body).await?;
    print_success(&format!("Post {} rejected", post_id));
    Ok(())
}

pub async fn posts_hide(
    config: &Config, client: &HttpClient, post_id: &str, duration_hours: Option<i32>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"duration_hours": duration_hours});
    let _resp = client.post(&format!("/api/admin/posts/{}/hide", post_id), Some(&token), &body).await?;
    if let Some(h) = duration_hours {
        print_success(&format!("Post {} hidden (auto-restore in {}h)", post_id, h));
    } else {
        print_success(&format!("Post {} hidden", post_id));
    }
    Ok(())
}

pub async fn posts_unhide(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/posts/{}/unhide", post_id), Some(&token), &json!({})).await?;
    print_success(&format!("Post {} unhidden", post_id));
    Ok(())
}

pub async fn posts_feature(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/posts/{}/feature", post_id), Some(&token), &json!({})).await?;
    print_success(&format!("Post {} featured", post_id));
    Ok(())
}

pub async fn posts_unfeature(
    config: &Config, client: &HttpClient, post_id: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let _resp = client.post(&format!("/api/admin/posts/{}/unfeature", post_id), Some(&token), &json!({})).await?;
    print_success(&format!("Post {} unfeatured", post_id));
    Ok(())
}

pub async fn analytics(
    config: &Config, client: &HttpClient, analytics_type: &str, days: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let path = match analytics_type {
        "posts" => format!("/api/admin/analytics/posts?days={}", days),
        _ => format!("/api/admin/analytics/users?days={}", days),
    };
    let resp = client.get(&path, Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// ==================== 审核队列 ====================

pub async fn review_queue(
    config: &Config, client: &HttpClient,
    status: Option<&str>, queue_type: Option<&str>,
    page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let mut path = format!("/api/admin/review-queue?page={}&page_size={}", page, size);
    if let Some(s) = status { path.push_str(&format!("&status={}", s)); }
    if let Some(t) = queue_type { path.push_str(&format!("&type={}", t)); }
    let resp = client.get(&path, Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn batch_review(
    config: &Config, client: &HttpClient,
    action: &str, targets: &str, reason: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let items: Vec<_> = targets.split(',')
        .map(|pair| {
            let parts: Vec<&str> = pair.splitn(2, ':').collect();
            json!({"target_type": parts[0], "target_id": parts[1]})
        })
        .collect();
    let body = json!({"items": items, "action": action, "reason": reason});
    let resp = client.post("/api/admin/review-queue/batch", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// ==================== 审核规则 ====================

pub async fn rules_list(
    config: &Config, client: &HttpClient,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let resp = client.get("/api/admin/review-rules", Some(&token)).await?;
    let items: Vec<_> = extract_data_array(&resp).into_iter().cloned().collect();
    print_output(&json!(items), config.format);
    Ok(())
}

pub async fn rules_create(
    config: &Config, client: &HttpClient,
    name: &str, rule_type: &str, config_str: &str,
    target_types: &str, priority: i32, description: Option<&str>,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let config_val: serde_json::Value = serde_json::from_str(config_str)
        .unwrap_or(json!({}));
    let target_list: Vec<&str> = target_types.split(',').map(|s| s.trim()).collect();
    let body = json!({
        "name": name,
        "description": description,
        "rule_type": rule_type,
        "config": config_val,
        "target_types": target_list,
        "priority": priority,
    });
    let resp = client.post("/api/admin/review-rules", Some(&token), &body).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn rules_toggle(
    config: &Config, client: &HttpClient,
    rule_id: &str, is_active: bool,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"is_active": is_active});
    let _resp = client.post(&format!("/api/admin/review-rules/{}/toggle", rule_id), Some(&token), &body).await?;
    print_success(&format!("Rule {} {}", rule_id, if is_active { "enabled" } else { "disabled" }));
    Ok(())
}

// ==================== 审计日志 ====================

pub async fn audit_logs(
    config: &Config, client: &HttpClient,
    actor_type: Option<&str>, target_type: Option<&str>,
    action: Option<&str>, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let mut path = format!("/api/admin/audit-logs?page={}&page_size={}", page, size);
    if let Some(a) = actor_type { path.push_str(&format!("&actor_type={}", a)); }
    if let Some(t) = target_type { path.push_str(&format!("&target_type={}", t)); }
    if let Some(a) = action { path.push_str(&format!("&action={}", a)); }
    let resp = client.get(&path, Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

// ==================== 跨社区引用管理 ====================

pub async fn refs_list(
    config: &Config, client: &HttpClient,
    status: Option<&str>, page: u32, size: u32,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let mut path = format!("/api/admin/refs?page={}&page_size={}", page, size);
    if let Some(s) = status { path.push_str(&format!("&status={}", s)); }
    let resp = client.get(&path, Some(&token)).await?;
    print_output(extract_data(&resp), config.format);
    Ok(())
}

pub async fn refs_review(
    config: &Config, client: &HttpClient,
    ref_id: &str, action: &str,
) -> Result<(), anyhow::Error> {
    let token = config.require_admin()?;
    let body = json!({"action": action});
    let _resp = client.post(&format!("/api/admin/refs/{}/review", ref_id), Some(&token), &body).await?;
    print_success(&format!("Ref {} {}", ref_id, action));
    Ok(())
}
