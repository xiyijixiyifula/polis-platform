use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Polis 站点 → 区块链节点的 HTTP 客户端
/// 用于 Polis 微服务向本地链节点提交 ActivityProof
pub struct ChainClient {
    client: Client,
    chain_api_url: String,
    site_id: String,
}

#[derive(Debug, Serialize)]
struct ActivityProofRequest {
    site_id: String,
    user_ref: String,
    action_type: String,
    target_ref: String,
    xp_value: u32,
    timestamp: u64,
    nonce: u64,
}

#[derive(Debug, Deserialize)]
struct SubmitResponse {
    tx_hash: String,
    status: String,
}

impl ChainClient {
    /// 创建新的链客户端
    /// chain_api_url: 如 "http://127.0.0.1:8545"
    /// site_id: 站点 SHA256(domain) 标识
    pub fn new(chain_api_url: String, site_id: String) -> Self {
        ChainClient {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .expect("Failed to build ChainClient HTTP client"),
            chain_api_url,
            site_id,
        }
    }

    /// 提交 ActivityProof 到链 (非阻塞, 失败不影响主流程)
    pub async fn submit_activity_proof(
        &self,
        username: &str,
        action_type: &str,
        content_body: &str,
        xp_value: u32,
    ) {
        let user_ref = crate::crypto::derive_user_ref(&self.site_id, username);
        let target_ref = hex::encode(crate::crypto::sha256(content_body.as_bytes()));

        let body = ActivityProofRequest {
            site_id: self.site_id.clone(),
            user_ref,
            action_type: action_type.to_string(),
            target_ref,
            xp_value,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            nonce: 0, // 由链节点分配实际 nonce
        };

        let url = format!("{}/api/v1/activities", self.chain_api_url);
        let result = self.client.post(&url).json(&body).send().await;
        if let Ok(resp) = result {
            if let Ok(data) = resp.json::<SubmitResponse>().await {
                tracing::info!(
                    "ActivityProof 已提交: tx={}, status={}",
                    data.tx_hash,
                    data.status
                );
            }
        }
    }

    /// 检查链节点是否可用
    pub async fn health_check(&self) -> bool {
        let url = format!("{}/api/v1/status", self.chain_api_url);
        match self.client.get(&url).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }
}
