use ed25519_dalek::{Signer, SigningKey, Verifier, VerifyingKey, Signature};
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};

use crate::error::{ChainError, ChainResult};

/// 生成新的 Ed25519 密钥对
pub fn generate_keypair() -> (SigningKey, VerifyingKey) {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    (signing_key, verifying_key)
}

/// 地址 = "0xPOL_" + hex(SHA256(verifying_key_bytes)[..20])
pub fn derive_address(verifying_key: &VerifyingKey) -> String {
    let key_bytes = verifying_key.as_bytes();
    let mut hasher = Sha256::new();
    hasher.update(key_bytes);
    let hash = hasher.finalize();
    format!("0xPOL_{}", hex::encode(&hash[..20]))
}

/// 签名数据 (返回 64 字节签名)
pub fn sign_data(signing_key: &SigningKey, data: &[u8]) -> Vec<u8> {
    let signature: Signature = signing_key.sign(data);
    signature.to_vec()
}

/// 验证签名
pub fn verify_signature(
    verifying_key: &VerifyingKey,
    data: &[u8],
    signature_bytes: &[u8],
) -> ChainResult<()> {
    let signature = Signature::from_slice(signature_bytes)
        .map_err(|e| ChainError::Crypto(format!("解析签名失败: {}", e)))?;
    verifying_key
        .verify(data, &signature)
        .map_err(|_| ChainError::InvalidSignature)
}

/// 从签名者的公钥字节反序列化验证密钥
pub fn verifying_key_from_bytes(bytes: &[u8; 32]) -> ChainResult<VerifyingKey> {
    VerifyingKey::from_bytes(bytes)
        .map_err(|e| ChainError::Crypto(format!("解析公钥失败: {}", e)))
}

/// 序列化交易用于签名
pub fn transaction_signing_bytes(tx: &crate::transaction::Transaction) -> Vec<u8> {
    bincode::serialize(tx).unwrap_or_default()
}

/// SHA-256 哈希
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// 站点 ID = SHA256(domain)
pub fn derive_site_id(domain: &str) -> String {
    hex::encode(sha256(domain.as_bytes()))
}

/// 用户引用 = SHA256(site_id + ":" + username)
pub fn derive_user_ref(site_id: &str, username: &str) -> String {
    let input = format!("{}:{}", site_id, username);
    hex::encode(sha256(input.as_bytes()))
}

/// 将 ed25519-dalek SigningKey 转换为 libp2p 身份密钥对
pub fn signing_key_to_libp2p_keypair(
    signing_key: &SigningKey,
) -> libp2p::identity::ed25519::Keypair {
    let seed = signing_key.to_bytes();
    let secret = libp2p::identity::ed25519::SecretKey::try_from_bytes(seed)
        .expect("valid ed25519 signing key bytes");
    libp2p::identity::ed25519::Keypair::from(secret)
}
