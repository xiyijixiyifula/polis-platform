use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// 赢家条目 (挖矿奖励)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WinnerEntry {
    pub address: String,
    pub amount: u64,
    pub rank: u32, // 1=第一名, 2=第二名, 3=第三名
}

/// 炼金赢家
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlchemyWinner {
    pub address: String,
    pub coin_type: String, // "Gold", "Silver", "Bronze"
    pub serial_number: u64,
}

/// 铸造的稀有币
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintedPremiumCoin {
    pub coin_id: String,
    pub coin_type: String,
    pub serial_number: u64,
    pub owner_address: String,
}

/// 交易类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Transaction {
    /// 站点注册
    SiteRegister {
        domain: String,
        admin_address: String,
        site_name: String,
        verification_proof: String,
        nonce: u64,
    },

    /// 用户行为证明 (核心)
    ActivityProof {
        site_id: String,
        user_ref: String,
        action_type: String,
        target_ref: String,
        xp_value: u32,
        timestamp: u64,
        nonce: u64,
    },

    /// 购买挖矿票
    MiningTicket {
        user_address: String,
        round_id: u64,
        ticket_count: u32,
        xp_spent: u64,
        nonce: u64,
    },

    /// 挖矿奖励分配
    MiningReward {
        round_id: u64,
        winners: Vec<WinnerEntry>,
        total_reward: u64,
        random_seed: [u8; 32],
        nonce: u64,
    },

    /// 代币转账
    TokenTransfer {
        from: String,
        to: String,
        amount: u64,
        memo: Option<String>,
        nonce: u64,
    },

    /// 大奖池投入
    PoolDeposit {
        from_address: String,
        amount: u64,
        nonce: u64,
    },

    /// 大奖池炼金 (系统交易)
    PoolAlchemy {
        pool_id: String,
        total_burned: u64,
        burn_tx_hash: [u8; 32],
        winners: Vec<AlchemyWinner>,
        minted_coins: Vec<MintedPremiumCoin>,
        nonce: u64,
    },

    /// 验证者质押
    ValidatorStake {
        address: String,
        amount: u64,
        nonce: u64,
    },

    /// 验证者解除质押
    ValidatorUnstake {
        address: String,
        amount: u64,
        nonce: u64,
    },
}

impl Transaction {
    /// 获取交易的 nonce
    pub fn nonce(&self) -> u64 {
        match self {
            Transaction::SiteRegister { nonce, .. } => *nonce,
            Transaction::ActivityProof { nonce, .. } => *nonce,
            Transaction::MiningTicket { nonce, .. } => *nonce,
            Transaction::MiningReward { nonce, .. } => *nonce,
            Transaction::TokenTransfer { nonce, .. } => *nonce,
            Transaction::PoolDeposit { nonce, .. } => *nonce,
            Transaction::PoolAlchemy { nonce, .. } => *nonce,
            Transaction::ValidatorStake { nonce, .. } => *nonce,
            Transaction::ValidatorUnstake { nonce, .. } => *nonce,
        }
    }

    /// 获取交易的签名者地址 (对于签名交易)
    pub fn expected_signer(&self) -> Option<&str> {
        match self {
            Transaction::SiteRegister { admin_address, .. } => Some(admin_address),
            Transaction::ActivityProof { site_id, .. } => Some(site_id),
            Transaction::MiningTicket { user_address, .. } => Some(user_address),
            Transaction::TokenTransfer { from, .. } => Some(from),
            Transaction::PoolDeposit { from_address, .. } => Some(from_address),
            Transaction::ValidatorStake { address, .. } => Some(address),
            Transaction::ValidatorUnstake { address, .. } => Some(address),
            // 系统交易不需要特定签名者
            Transaction::MiningReward { .. } | Transaction::PoolAlchemy { .. } => None,
        }
    }

    /// 交易类型标签
    pub fn type_label(&self) -> &'static str {
        match self {
            Transaction::SiteRegister { .. } => "site_register",
            Transaction::ActivityProof { .. } => "activity_proof",
            Transaction::MiningTicket { .. } => "mining_ticket",
            Transaction::MiningReward { .. } => "mining_reward",
            Transaction::TokenTransfer { .. } => "token_transfer",
            Transaction::PoolDeposit { .. } => "pool_deposit",
            Transaction::PoolAlchemy { .. } => "pool_alchemy",
            Transaction::ValidatorStake { .. } => "validator_stake",
            Transaction::ValidatorUnstake { .. } => "validator_unstake",
        }
    }
}

/// 签名交易
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedTransaction {
    pub tx: Transaction,
    pub signer: String,
    pub signature: Vec<u8>, // Ed25519 signature (64 bytes)
    pub hash: [u8; 32],
}

impl SignedTransaction {
    /// 创建并签名交易
    pub fn new(tx: Transaction, signer: String, signature: Vec<u8>) -> Self {
        let hash = Self::compute_hash(&tx);
        SignedTransaction {
            tx,
            signer,
            signature,
            hash,
        }
    }

    /// 计算交易哈希 = SHA-256(bincode(Transaction) || signer)
    pub fn compute_hash(tx: &Transaction) -> [u8; 32] {
        let tx_bytes = bincode::serialize(tx).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(&tx_bytes);
        hasher.finalize().into()
    }

    /// 计算包含签名者的哈希 (用于签名验证，防止签名跨账户重放)
    pub fn compute_hash_with_signer(tx: &Transaction, signer: &str) -> [u8; 32] {
        let tx_bytes = bincode::serialize(tx).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(&tx_bytes);
        hasher.update(signer.as_bytes());
        hasher.finalize().into()
    }
}
