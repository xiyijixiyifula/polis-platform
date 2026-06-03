use std::sync::atomic::{AtomicU64, Ordering};
use ed25519_dalek::Signer;
use uuid::Uuid;

/// XP Bridge: 在内容操作时通过 HTTP 调用 user 服务发放经验值，
/// 同时向本地 Polis Chain 节点提交 ActivityProof 链上存证。
pub struct XpBridge {
    client: reqwest::Client,
    user_service_url: String,
    /// 链节点 API URL (如 http://127.0.0.1:8545)
    chain_api_url: Option<String>,
    /// 站点 ID (SHA256(domain)), 用于链上存证
    site_id: Option<String>,
    /// 站点 Ed25519 签名密钥 (hex 编码的 32 字节种子)
    signing_key: Option<ed25519_dalek::SigningKey>,
    /// 签名 nonce 计数器
    nonce: AtomicU64,
}

impl XpBridge {
    pub fn new(user_service_url: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            user_service_url,
            chain_api_url: None,
            site_id: None,
            signing_key: None,
            nonce: AtomicU64::new(0),
        }
    }

    /// 启用链上存证 (配置后自动将 XP 记录上链)
    pub fn with_chain(mut self, chain_api_url: String, site_id: String) -> Self {
        self.chain_api_url = Some(chain_api_url);
        self.site_id = Some(site_id);
        self
    }

    /// 设置站点签名密钥 (hex 编码的 32 字节 Ed25519 种子)
    pub fn with_signing_key(mut self, private_key_hex: &str) -> Result<Self, String> {
        let seed = hex::decode(private_key_hex)
            .map_err(|e| format!("无效的私钥 hex: {}", e))?;
        if seed.len() != 32 {
            return Err("Ed25519 私钥必须为 32 字节".to_string());
        }
        let signing_key = ed25519_dalek::SigningKey::from_bytes(
            &seed[..32].try_into().map_err(|_| "invalid key bytes")?
        );
        self.signing_key = Some(signing_key);
        Ok(self)
    }

    /// 通过内部 API 发放 XP（非阻塞，忽略错误）
    pub async fn award_xp(
        &self,
        user_id: Uuid,
        action_type: &str,
        description: &str,
        target_type: Option<&str>,
        target_id: Option<Uuid>,
    ) {
        // 1. 发 XP 到 user 服务
        let url = format!("{}/api/internal/xp/award", self.user_service_url);
        let body = serde_json::json!({
            "user_id": user_id.to_string(),
            "action_type": action_type,
            "description": description,
            "target_type": target_type,
            "target_id": target_id.map(|id| id.to_string()),
        });
        let _ = self.client.post(&url).json(&body).send().await;

        // 2. 提交 ActivityProof 到链节点 (链上存证)
        self.submit_to_chain(user_id, action_type, description).await;
    }

    /// 提交 ActivityProof 到本地链节点 (带 Ed25519 签名)
    async fn submit_to_chain(&self, user_id: Uuid, action_type: &str, content_hint: &str) {
        let (Some(chain_url), Some(site_id)) = (&self.chain_api_url, &self.site_id) else {
            return;
        };

        // user_ref = SHA256(site_id + ":" + username)
        let username = user_id.to_string().replace('-', "");
        let user_ref = {
            use sha2::{Digest, Sha256};
            let input = format!("{}:{}", site_id, username);
            hex::encode(Sha256::digest(input.as_bytes()))
        };

        let target_ref = {
            use sha2::{Digest, Sha256};
            hex::encode(Sha256::digest(content_hint.as_bytes()))
        };

        let xp_value = xp_for_action(action_type);
        let nonce = self.nonce.fetch_add(1, Ordering::SeqCst);

        let mut body = serde_json::json!({
            "site_id": site_id,
            "user_ref": user_ref,
            "action_type": action_type,
            "target_ref": target_ref,
            "xp_value": xp_value,
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            "nonce": nonce,
        });

        // 如果配置了签名密钥，生成签名
        if let Some(ref signing_key) = self.signing_key {
            let msg = format!(
                "POLIS_ACTIVITY:{}:{}:{}:{}",
                site_id, user_ref, xp_value, nonce
            );
            let signature = signing_key.sign(msg.as_bytes());
            body["signature"] = serde_json::json!(hex::encode(signature.to_bytes()));
        }

        let url = format!("{}/api/v1/activities", chain_url);
        let _ = self.client.post(&url).json(&body).send().await;
    }

    /// 发帖 XP
    pub async fn on_post_created(&self, user_id: Uuid) {
        self.award_xp(user_id, "post_created", "发布作品", None, None).await;
    }

    /// 评论 XP
    pub async fn on_comment_created(&self, user_id: Uuid) {
        self.award_xp(user_id, "comment_created", "发表评论", None, None).await;
    }

    /// 收到赞 XP
    pub async fn on_like_received(&self, user_id: Uuid, target_type: Option<&str>, target_id: Option<Uuid>) {
        self.award_xp(user_id, "like_received", "收到点赞", target_type, target_id).await;
    }

    /// 关注用户 XP
    pub async fn on_follow_user(&self, user_id: Uuid) {
        self.award_xp(user_id, "follow_user", "关注用户", None, None).await;
    }

    /// 分享内容 XP
    pub async fn on_share_content(&self, user_id: Uuid) {
        self.award_xp(user_id, "share_content", "分享内容", None, None).await;
    }

    /// 加入社区 XP
    pub async fn on_join_space(&self, user_id: Uuid, space_id: Uuid) {
        self.award_xp(user_id, "join_space", "加入社区", Some("space"), Some(space_id)).await;
    }

    /// 完成新手任务 XP
    pub async fn on_quest_completed(&self, user_id: Uuid, quest_key: &str) {
        self.award_xp(user_id, "quest_completed", &format!("完成任务: {}", quest_key), None, None).await;
    }

    /// 打赏 XP
    pub async fn on_first_tip(&self, user_id: Uuid) {
        self.award_xp(user_id, "first_tip", "首次打赏", None, None).await;
    }
}

/// 行为类型 → XP 值映射
fn xp_for_action(action_type: &str) -> u32 {
    match action_type {
        "post_created" => 10,
        "comment_created" => 5,
        "like_received" => 2,
        "follow_user" => 3,
        "share_content" => 5,
        "join_space" => 8,
        "quest_completed" => 15,
        "first_tip" => 20,
        _ => 1,
    }
}
