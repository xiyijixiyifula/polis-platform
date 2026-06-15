use crate::crypto;
use crate::transaction::Transaction;

/// ActivityProof 构建器 (给 Polis 站点后端使用)
pub struct ActivityProofBuilder {
    pub site_id: String,
}

impl ActivityProofBuilder {
    pub fn new(site_id: String) -> Self {
        ActivityProofBuilder { site_id }
    }

    /// 构建 ActivityProof 交易
    pub fn build_proof(
        &self,
        username: &str,
        action_type: &str,
        content_body: &str,
        xp_value: u32,
        nonce: u64,
    ) -> Transaction {
        let user_ref = crypto::derive_user_ref(&self.site_id, username);
        let target_ref = hex::encode(crypto::sha256(content_body.as_bytes()));

        Transaction::ActivityProof {
            site_id: self.site_id.clone(),
            user_ref,
            action_type: action_type.to_string(),
            target_ref,
            xp_value,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock is set before UNIX epoch")
                .as_secs(),
            nonce,
        }
    }
}
