use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::transaction::SignedTransaction;

/// 验证者提交的密封 (Ed25519 签名确认)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitSeal {
    pub validator: String,
    pub signature: Vec<u8>, // Ed25519 signature (64 bytes)
}

/// 区块头
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    pub number: u64,
    pub timestamp: u64,
    pub previous_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub state_root: [u8; 32],
    pub validator: String,
    pub nonce: u64,
}

/// 区块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub header: BlockHeader,
    pub transactions: Vec<SignedTransaction>,
    pub commits: Vec<CommitSeal>,
    #[serde(skip)]
    pub hash: [u8; 32],
}

impl Block {
    /// 计算区块哈希 = SHA-256(header)
    pub fn compute_hash(&self) -> [u8; 32] {
        let header_bytes = bincode::serialize(&self.header).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(&header_bytes);
        hasher.finalize().into()
    }

    /// 计算交易 Merkle 树根
    pub fn compute_merkle_root(&self) -> [u8; 32] {
        if self.transactions.is_empty() {
            return [0u8; 32];
        }
        let leaves: Vec<[u8; 32]> = self
            .transactions
            .iter()
            .map(|tx| tx.hash)
            .collect();
        compute_merkle_root_from_leaves(&leaves)
    }

    /// 计算并设置缓存的哈希值
    pub fn seal(&mut self) {
        self.header.merkle_root = self.compute_merkle_root();
        self.hash = self.compute_hash();
    }

    /// 验证区块完整性: hash/merkle_root
    pub fn verify(&self) -> Result<(), crate::error::ChainError> {
        let computed_hash = self.compute_hash();
        if computed_hash != self.hash {
            return Err(crate::error::ChainError::Validation("区块哈希不匹配".into()));
        }
        let merkle = self.compute_merkle_root();
        if merkle != self.header.merkle_root {
            return Err(crate::error::ChainError::Validation("Merkle 根不匹配".into()));
        }
        Ok(())
    }
}

/// 从叶子节点计算 Merkle 根
fn compute_merkle_root_from_leaves(leaves: &[[u8; 32]]) -> [u8; 32] {
    if leaves.is_empty() {
        return [0u8; 32];
    }
    let tree = rs_merkle::MerkleTree::<rs_merkle::algorithms::Sha256>::from_leaves(leaves);
    tree.root().unwrap_or([0u8; 32])
}
