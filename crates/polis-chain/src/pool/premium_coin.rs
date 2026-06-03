/// 稀有币数据结构
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PremiumType {
    Gold,
    Silver,
    Bronze,
}

impl PremiumType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PremiumType::Gold => "Gold",
            PremiumType::Silver => "Silver",
            PremiumType::Bronze => "Bronze",
        }
    }

    pub fn prefix(&self) -> &'static str {
        match self {
            PremiumType::Gold => "GOLD",
            PremiumType::Silver => "SILVER",
            PremiumType::Bronze => "BRONZE",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            PremiumType::Gold => "🥇",
            PremiumType::Silver => "🥈",
            PremiumType::Bronze => "🥉",
        }
    }
}

/// 稀有币完整信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PremiumCoin {
    pub coin_id: String,              // "GOLD-0003"
    pub coin_type: PremiumType,
    pub serial_number: u64,           // 全局序号
    pub pool_id: String,              // 产生此币的炼金池 ID
    pub winner_address: String,
    pub minted_at_block: u64,
    pub minted_at_timestamp: u64,
    pub tx_hash: [u8; 32],
    pub previous_owner: Option<String>,
}

impl PremiumCoin {
    /// 生成稀有币 ID
    pub fn generate_coin_id(coin_type: &PremiumType, serial_number: u64) -> String {
        format!("{}-{:04}", coin_type.prefix(), serial_number)
    }
}
