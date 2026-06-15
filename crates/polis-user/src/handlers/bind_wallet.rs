use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use ed25519_dalek::{Verifier, VerifyingKey, Signature};
use polis_core::error::AppError;
use polis_core::models::UserPublic;
use rand::Rng;
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::repo::UserRepo;

#[derive(Clone)]
pub struct BindWalletHandler {
    pub repo: UserRepo,
    pub(crate) challenges: Arc<Mutex<HashMap<String, ChallengeEntry>>>,
}

#[derive(Clone)]
pub(crate) struct ChallengeEntry {
    user_id: Uuid,
    address: String,
    expires_at: Instant,
}

impl BindWalletHandler {
    pub fn new(repo: UserRepo) -> Self {
        Self {
            repo,
            challenges: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 生成绑定挑战 nonce
    pub async fn generate_challenge(
        &self,
        user_id: Uuid,
        address: &str,
    ) -> Result<String, AppError> {
        // 验证地址格式: "0xPOL_" + 40 hex chars
        if !address.starts_with("0xPOL_") || address.len() != 46 {
            return Err(AppError::validation("无效的钱包地址格式".to_string()));
        }

        // 检查是否已被其他用户绑定
        if let Some(existing) = self.repo.find_by_chain_address(address).await? {
            if existing.id != user_id {
                return Err(AppError::validation("该钱包地址已被其他用户绑定".to_string()));
            }
        }

        let random_bytes: [u8; 16] = rand::thread_rng().gen();
        let nonce_prefix = hex::encode(random_bytes);
        let nonce = format!(
            "Bind {} to Polis user {}: {}",
            address, user_id, nonce_prefix
        );

        let mut challenges = self.challenges.lock().await;
        // 清理过期挑战
        challenges.retain(|_, v| v.expires_at > Instant::now());
        challenges.insert(
            nonce_prefix.clone(),
            ChallengeEntry {
                user_id,
                address: address.to_string(),
                expires_at: Instant::now() + Duration::from_secs(300),
            },
        );

        Ok(nonce)
    }

    /// 验证签名并绑定钱包
    pub async fn verify_and_bind(
        &self,
        user_id: Uuid,
        address: &str,
        public_key_hex: &str,
        nonce: &str,
        signature_hex: &str,
    ) -> Result<UserPublic, AppError> {
        // 1. 解码公钥并验证地址
        let pubkey_bytes = hex::decode(public_key_hex)
            .map_err(|_| AppError::validation("无效的公钥格式".to_string()))?;
        if pubkey_bytes.len() != 32 {
            return Err(AppError::validation("公钥必须为 32 字节".to_string()));
        }

        let verifying_key = VerifyingKey::from_bytes(
            &pubkey_bytes[..32].try_into()
                .map_err(|_| AppError::internal("公钥切片转换失败".to_string()))?
        ).map_err(|e| AppError::validation(format!("无效的 Ed25519 公钥: {}", e)))?;

        // 验证地址 = "0xPOL_" + hex(SHA256(pubkey)[..20])
        let mut hasher = Sha256::new();
        hasher.update(&pubkey_bytes);
        let hash = hasher.finalize();
        let expected_address = format!("0xPOL_{}", hex::encode(&hash[..20]));
        if address != expected_address {
            return Err(AppError::validation("钱包地址与公钥不匹配".to_string()));
        }

        // 2. 验证 nonce 有效性
        let mut challenges = self.challenges.lock().await;
        challenges.retain(|_, v| v.expires_at > Instant::now());

        // 从 nonce 中提取前缀 (最后一段 hex 随机数)
        let nonce_prefix = nonce.split(": ").last()
            .ok_or(AppError::validation("无效的 nonce 格式".to_string()))?;

        let entry = challenges.remove(nonce_prefix)
            .ok_or(AppError::validation("nonce 无效或已过期，请重新发起绑定".to_string()))?;

        if entry.user_id != user_id {
            return Err(AppError::validation("nonce 与当前用户不匹配".to_string()));
        }
        if entry.address != address {
            return Err(AppError::validation("nonce 与目标地址不匹配".to_string()));
        }

        // 3. 验证 Ed25519 签名
        let sig_bytes = hex::decode(signature_hex)
            .map_err(|_| AppError::validation("无效的签名格式".to_string()))?;
        let signature = Signature::from_slice(&sig_bytes)
            .map_err(|_| AppError::validation("签名长度无效 (需要 64 字节)".to_string()))?;

        verifying_key.verify(nonce.as_bytes(), &signature)
            .map_err(|_| AppError::validation("签名验证失败，请检查签名是否正确".to_string()))?;

        // 4. 更新数据库
        self.repo.bind_chain_address(user_id, address).await?;

        // 5. 返回更新后的用户信息
        let user = self.repo.find_by_id(user_id).await?
            .ok_or(AppError::not_found("用户不存在".to_string()))?;

        Ok(UserPublic {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            verified: user.verified,
            notification_prefs: user.notification_prefs,
            created_at: user.created_at,
            total_likes: 0,
            post_count: 0,
        })
    }
}
