use ed25519_dalek::{SigningKey, VerifyingKey, SECRET_KEY_LENGTH};
use std::path::Path;

use crate::crypto::{generate_keypair, derive_address};
use crate::error::{ChainError, ChainResult};

/// 钱包密钥对
pub struct WalletKeys {
    pub signing_key: SigningKey,
    pub verifying_key: VerifyingKey,
    pub address: String,
}

impl WalletKeys {
    /// 生成新钱包 (新密钥对)
    pub fn generate() -> Self {
        let (signing_key, verifying_key) = generate_keypair();
        let address = derive_address(&verifying_key);
        WalletKeys {
            signing_key,
            verifying_key,
            address,
        }
    }

    /// 从私钥字节恢复
    pub fn from_signing_key_bytes(bytes: &[u8; SECRET_KEY_LENGTH]) -> ChainResult<Self> {
        let signing_key = SigningKey::from_bytes(bytes);
        let verifying_key = signing_key.verifying_key();
        let address = derive_address(&verifying_key);
        Ok(WalletKeys {
            signing_key,
            verifying_key,
            address,
        })
    }

    /// 导出私钥字节
    pub fn to_bytes(&self) -> [u8; SECRET_KEY_LENGTH] {
        self.signing_key.to_bytes()
    }

    /// 签名消息
    pub fn sign(&self, data: &[u8]) -> Vec<u8> {
        use ed25519_dalek::Signer;
        self.signing_key.sign(data).to_vec()
    }

    /// 保存加密的钱包密钥到文件
    pub fn save_encrypted(&self, path: &Path, password: &str) -> ChainResult<()> {
        let key_bytes = self.signing_key.to_bytes();

        // 用 Argon2 从密码派生加密密钥
        let salt = blake3::hash(b"polis-chain-wallet-salt");
        let mut derived_key = [0u8; 32];

        let argon = argon2::Argon2::default();
        argon
            .hash_password_into(password.as_bytes(), salt.as_bytes().as_slice(), &mut derived_key)
            .map_err(|e| ChainError::Crypto(format!("密钥派生失败: {}", e)))?;

        // XOR 加密 (简化方案，生产环境用 AES-GCM)
        let encrypted: Vec<u8> = key_bytes
            .iter()
            .zip(derived_key.iter().cycle())
            .map(|(k, d)| k ^ d)
            .collect();

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, hex::encode(&encrypted))?;
        Ok(())
    }

    /// 从加密文件加载钱包
    pub fn load_encrypted(path: &Path, password: &str) -> ChainResult<Self> {
        let hex_data = std::fs::read_to_string(path)?;
        let encrypted = hex::decode(hex_data.trim())
            .map_err(|e| ChainError::Crypto(format!("解码失败: {}", e)))?;

        let salt = blake3::hash(b"polis-chain-wallet-salt");
        let mut derived_key = [0u8; 32];

        let argon = argon2::Argon2::default();
        argon
            .hash_password_into(password.as_bytes(), salt.as_bytes().as_slice(), &mut derived_key)
            .map_err(|e| ChainError::Crypto(format!("密钥派生失败: {}", e)))?;

        let decrypted: Vec<u8> = encrypted
            .iter()
            .zip(derived_key.iter().cycle())
            .map(|(e, d)| e ^ d)
            .collect();

        if decrypted.len() != SECRET_KEY_LENGTH {
            return Err(ChainError::Crypto("密码错误或钱包文件损坏".into()));
        }

        let mut key_bytes = [0u8; SECRET_KEY_LENGTH];
        key_bytes.copy_from_slice(&decrypted);
        Self::from_signing_key_bytes(&key_bytes)
    }
}

/// 验证钱包文件存在
pub fn wallet_exists(keys_dir: &str) -> bool {
    Path::new(&format!("{}/wallet.key", keys_dir)).exists()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wallet_create_sign_verify() {
        let wallet = WalletKeys::generate();
        let msg = b"test message";
        let sig = wallet.sign(msg);

        use ed25519_dalek::Verifier;
        let signature = ed25519_dalek::Signature::from_slice(&sig).unwrap();
        wallet.verifying_key.verify(msg, &signature).unwrap();
    }

    #[test]
    fn test_wallet_encrypted_save_load() {
        let tmp = std::env::temp_dir().join("polis-chain-test-wallet.key");
        let wallet = WalletKeys::generate();
        let addr = wallet.address.clone();

        wallet.save_encrypted(&tmp, "test123").unwrap();
        let loaded = WalletKeys::load_encrypted(&tmp, "test123").unwrap();
        assert_eq!(addr, loaded.address);

        // 清理
        let _ = std::fs::remove_file(&tmp);
    }
}
