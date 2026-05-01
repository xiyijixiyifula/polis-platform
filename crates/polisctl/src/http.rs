use crate::config::Config;
use anyhow::Context;
use reqwest::Client;
use serde_json::Value;

pub struct HttpClient {
    client: Client,
    base_url: String,
}

impl HttpClient {
    pub fn new(config: &Config) -> Self {
        HttpClient {
            client: Client::builder()
                .danger_accept_invalid_certs(false)
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to create HTTP client"),
            base_url: config.base_url.clone(),
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    pub async fn get(&self, path: &str, token: Option<&str>) -> Result<Value, anyhow::Error> {
        let mut req = self.client.get(&self.url(path));
        if let Some(t) = token {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
        let resp = req.send().await.context("GET request failed")?;
        let status = resp.status();
        let body: Value = resp.json().await.context("Failed to parse JSON response")?;
        if !status.is_success() {
            let msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
            anyhow::bail!("{} (HTTP {})", msg, status.as_u16());
        }
        Ok(body)
    }

    pub async fn post(&self, path: &str, token: Option<&str>, body: &Value) -> Result<Value, anyhow::Error> {
        let mut req = self.client.post(&self.url(path)).json(body);
        if let Some(t) = token {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
        let resp = req.send().await.context("POST request failed")?;
        let status = resp.status();
        let body: Value = resp.json().await.context("Failed to parse JSON response")?;
        if !status.is_success() {
            let msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
            anyhow::bail!("{} (HTTP {})", msg, status.as_u16());
        }
        Ok(body)
    }

    pub async fn put(&self, path: &str, token: Option<&str>, body: &Value) -> Result<Value, anyhow::Error> {
        let mut req = self.client.put(&self.url(path)).json(body);
        if let Some(t) = token {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
        let resp = req.send().await.context("PUT request failed")?;
        let status = resp.status();
        let body: Value = resp.json().await.context("Failed to parse JSON response")?;
        if !status.is_success() {
            let msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
            anyhow::bail!("{} (HTTP {})", msg, status.as_u16());
        }
        Ok(body)
    }

    pub async fn delete(&self, path: &str, token: Option<&str>) -> Result<Value, anyhow::Error> {
        let mut req = self.client.delete(&self.url(path));
        if let Some(t) = token {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
        let resp = req.send().await.context("DELETE request failed")?;
        let status = resp.status();
        let body: Value = resp.json().await.context("Failed to parse JSON response")?;
        if !status.is_success() {
            let msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
            anyhow::bail!("{} (HTTP {})", msg, status.as_u16());
        }
        Ok(body)
    }
}
