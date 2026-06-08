use ed25519_dalek::{SigningKey, VerifyingKey, SECRET_KEY_LENGTH};
use std::path::Path;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;
use rand::Rng;

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

        // AES-256-GCM 加密: 随机12字节 nonce + 密文(含16字节认证标签)
        let cipher = Aes256Gcm::new_from_slice(&derived_key)
            .map_err(|e| ChainError::Crypto(format!("AES 初始化失败: {}", e)))?;
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher
            .encrypt(nonce, key_bytes.as_ref())
            .map_err(|e| ChainError::Crypto(format!("加密失败: {}", e)))?;

        // 格式: [nonce (12 bytes)] [ciphertext (32 + 16 tag)]
        let mut output = nonce_bytes.to_vec();
        output.extend_from_slice(&ciphertext);

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, hex::encode(&output))?;
        Ok(())
    }

    /// 从加密文件加载钱包
    pub fn load_encrypted(path: &Path, password: &str) -> ChainResult<Self> {
        let hex_data = std::fs::read_to_string(path)?;
        let data = hex::decode(hex_data.trim())
            .map_err(|e| ChainError::Crypto(format!("解码失败: {}", e)))?;

        if data.len() < 12 + SECRET_KEY_LENGTH + 16 {
            return Err(ChainError::Crypto("密码错误或钱包文件损坏".into()));
        }

        // 提取 nonce  (前12字节) 和密文
        let (nonce_bytes, ciphertext) = data.split_at(12);

        let salt = blake3::hash(b"polis-chain-wallet-salt");
        let mut derived_key = [0u8; 32];

        let argon = argon2::Argon2::default();
        argon
            .hash_password_into(password.as_bytes(), salt.as_bytes().as_slice(), &mut derived_key)
            .map_err(|e| ChainError::Crypto(format!("密钥派生失败: {}", e)))?;

        let cipher = Aes256Gcm::new_from_slice(&derived_key)
            .map_err(|e| ChainError::Crypto(format!("AES 初始化失败: {}", e)))?;
        let nonce = Nonce::from_slice(nonce_bytes);
        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| ChainError::Crypto("密码错误或钱包文件损坏".into()))?;

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
    fn test_wallet_create_sign_verify() -> Result<(), Box<dyn std::error::Error>> {
        let wallet = WalletKeys::generate();
        let msg = b"test message";
        let sig = wallet.sign(msg);

        use ed25519_dalek::Verifier;
        let signature = ed25519_dalek::Signature::from_slice(&sig)?;
        wallet.verifying_key.verify(msg, &signature)?;
        Ok(())
    }

    #[test]
    fn test_wallet_encrypted_save_load() -> Result<(), Box<dyn std::error::Error>> {
        let tmp = std::env::temp_dir().join("polis-chain-test-wallet.key");
        let wallet = WalletKeys::generate();
        let addr = wallet.address.clone();

        wallet.save_encrypted(&tmp, "test123")?;
        let loaded = WalletKeys::load_encrypted(&tmp, "test123")?;
        assert_eq!(addr, loaded.address);

        // 清理
        let _ = std::fs::remove_file(&tmp);
        Ok(())
    }
}
