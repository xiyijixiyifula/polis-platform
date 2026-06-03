use serde::{Deserialize, Serialize};

/// 链上账户状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountState {
    pub address: String,
    pub balance: u64,             // $POL 余额
    pub nonce: u64,               // 交易序号 (防重放)
    pub total_xp: u64,            // 累计 XP (等级依据)
    pub available_xp: u64,        // 可用 XP (购买挖矿票)
    pub premium_coins: Vec<String>, // 持有的稀有币 ID
    pub created_at: u64,
}

impl AccountState {
    pub fn new(address: String, timestamp: u64) -> Self {
        AccountState {
            address,
            balance: 0,
            nonce: 0,
            total_xp: 0,
            available_xp: 0,
            premium_coins: Vec::new(),
            created_at: timestamp,
        }
    }
}

/// 站点信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteInfo {
    pub site_id: String,            // SHA256(domain)
    pub domain: String,
    pub site_name: String,
    pub admin_address: String,
    pub registered_at: u64,         // 注册区块高度
    pub reputation_score: u32,      // 0-100
    pub is_active: bool,
}

/// 活动记录 (用于索引)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityRecord {
    pub user_ref: String,
    pub nonce: u64,
    pub action_type: String,
    pub target_ref: String,
    pub xp_value: u32,
    pub timestamp: u64,
    pub block_number: u64,
    pub tx_hash: [u8; 32],
}

/// 挖矿轮次
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiningRound {
    pub round_id: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub total_reward: u64,          // 40 $POL
    pub ticket_count: u32,
    pub xp_pool: u64,               // 本轮消耗的总 XP
    pub status: RoundStatus,
    pub winners: Vec<crate::transaction::WinnerEntry>,
    pub random_seed: Option<[u8; 32]>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoundStatus {
    Active,
    Completed,
    Cancelled,
}

/// 大奖池状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolState {
    pub pool_id: String,            // 当前池子 ID
    pub current_amount: u64,        // 当前累积量
    pub target_amount: u64,         // 目标: 100,000
    pub deposited_count: u32,       // 投入人次
    pub top_depositors: Vec<DepositorEntry>,
    pub created_at: u64,
}

/// 投入者条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepositorEntry {
    pub address: String,
    pub total_deposited: u64,
}

/// 炼金历史记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolAlchemyRecord {
    pub pool_id: String,
    pub total_burned: u64,
    pub burn_tx_hash: [u8; 32],
    pub winners: Vec<crate::transaction::AlchemyWinner>,
    pub minted_coins: Vec<crate::transaction::MintedPremiumCoin>,
    pub completed_at: u64,
    pub completed_at_block: u64,
}

/// 验证者信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorInfo {
    pub address: String,
    pub public_key: Vec<u8>, // Ed25519 verifying key (32 bytes)
    pub site_id: Option<String>,
    pub stake_amount: u64,
    pub joined_at: u64,
    pub reputation: u32,
    pub is_active: bool,
}

/// 链配置 (存储在创世区块或 config CF 中)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainConfig {
    pub chain_id: String,
    pub block_time_secs: u64,        // 10 秒
    pub mining_round_secs: u64,      // 3600 秒 (1 小时)
    pub mining_reward: u64,          // 40 $POL
    pub ticket_xp_cost: u64,         // 1 XP = 1 ticket
    pub max_tickets_per_user: u32,   // 10
    pub winner_count: u32,           // 3
    pub pool_target: u64,            // 100,000 $POL
    pub premium_gold_count: u32,     // 1
    pub premium_silver_count: u32,   // 2
    pub premium_bronze_count: u32,   // 3
    pub min_validator_stake: u64,    // 1,000 $POL
    pub max_validators: usize,       // 21
    pub validator_epoch_secs: u64,   // 86400 秒 (24 小时)
}

impl Default for ChainConfig {
    fn default() -> Self {
        ChainConfig {
            chain_id: "polis-mainnet-1".to_string(),
            block_time_secs: 10,
            mining_round_secs: 3600,
            mining_reward: 40,
            ticket_xp_cost: 1,
            max_tickets_per_user: 10,
            winner_count: 3,
            pool_target: 100_000,
            premium_gold_count: 1,
            premium_silver_count: 2,
            premium_bronze_count: 3,
            min_validator_stake: 1_000,
            max_validators: 21,
            validator_epoch_secs: 86400,
        }
    }
}
