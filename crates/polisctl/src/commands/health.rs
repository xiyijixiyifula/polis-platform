use crate::config::Config;
use crate::http::HttpClient;
use crate::output::{extract_data, print_output};
use serde_json::json;

/// Check health of gateway and all microservices
pub async fn check(config: &Config, client: &HttpClient) -> Result<(), anyhow::Error> {
    let resp = client.get("/api/health/all", None).await?;
    let data = crate::output::extract_data(&resp);

    if config.format == crate::config::OutputFormat::Json {
        print_output(data, config.format);
    } else {
        // Table format: human-readable health summary
        let all_healthy = data.get("all_healthy").and_then(|v| v.as_bool()).unwrap_or(false);
        let services = data.get("services");

        println!("\n🏥 Polis 服务健康检查");
        println!("{}", "─".repeat(50));

        if let Some(svc) = services {
            if let Some(obj) = svc.as_object() {
                for (name, info) in obj {
                    let status = info.get("status").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let db = info.get("database").and_then(|v| v.as_bool()).unwrap_or(false);
                    let icon = match status {
                        "healthy" => "✅",
                        "degraded" => "⚠️",
                        _ => "❌",
                    };
                    let db_str = if db { "DB✅" } else { "DB❌" };
                    println!("  {} {:12} | {:10} | {}", icon, name, status, db_str);
                }
            }
        }

        println!("{}", "─".repeat(50));
        let gateway = data.get("gateway").and_then(|v| v.as_str()).unwrap_or("unknown");
        let g_icon = if gateway == "healthy" { "✅" } else { "❌" };
        println!("  {} Gateway: {}", g_icon, gateway);
        let total_icon = if all_healthy { "✅" } else { "❌" };
        println!("  整体状态: {} {}", total_icon, if all_healthy { "全部健康" } else { "部分异常" });
        println!();
    }

    if data.get("all_healthy").and_then(|v| v.as_bool()).unwrap_or(false) {
        Ok(())
    } else {
        Err(anyhow::anyhow!("部分服务不健康"))
    }
}
