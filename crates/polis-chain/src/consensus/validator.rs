use crate::error::{ChainError, ChainResult};
use crate::state::ValidatorInfo;
use crate::storage::rocks::Storage;

/// 验证者集合管理器
#[derive(Debug, Clone)]
pub struct ValidatorSet {
    pub max_validators: usize,
    pub min_stake: u64,
    pub validators: Vec<ValidatorInfo>,
}

impl ValidatorSet {
    pub fn new(max_validators: usize, min_stake: u64) -> Self {
        ValidatorSet {
            max_validators,
            min_stake,
            validators: Vec::new(),
        }
    }

    /// 从存储加载验证者集合
    pub fn load(storage: &Storage) -> ChainResult<Self> {
        let chain_config: crate::state::ChainConfig = storage
            .get_deserialized(crate::storage::rocks::CF_CONFIG, b"chain_config")?
            .unwrap_or_default();

        let mut set = ValidatorSet {
            max_validators: chain_config.max_validators,
            min_stake: chain_config.min_validator_stake,
            validators: Vec::new(),
        };

        let entries = storage.scan_prefix(crate::storage::rocks::CF_VALIDATORS, b"")?;
        for (_, value) in entries {
            if let Ok(info) = bincode::deserialize::<ValidatorInfo>(&value) {
                set.validators.push(info);
            }
        }

        Ok(set)
    }

    /// 持久化单个验证者
    fn save_one(storage: &Storage, info: &ValidatorInfo) -> ChainResult<()> {
        storage.put_serialized(
            crate::storage::rocks::CF_VALIDATORS,
            info.address.as_bytes(),
            info,
        )
    }

    fn delete_one(storage: &Storage, address: &str) -> ChainResult<()> {
        storage.delete(crate::storage::rocks::CF_VALIDATORS, address.as_bytes())
    }

    /// 添加验证者
    pub fn add_validator(&mut self, storage: &Storage, info: ValidatorInfo) -> ChainResult<()> {
        if self.validators.len() >= self.max_validators {
            return Err(ChainError::Validation("验证者数量已达上限".into()));
        }
        if info.stake_amount < self.min_stake {
            return Err(ChainError::Validation(format!(
                "质押不足: {} < {}",
                info.stake_amount, self.min_stake
            )));
        }
        if self.validators.iter().any(|v| v.address == info.address) {
            return Err(ChainError::Validation("验证者已存在".into()));
        }

        Self::save_one(storage, &info)?;
        self.validators.push(info);
        Ok(())
    }

    /// 移除验证者
    pub fn remove_validator(&mut self, storage: &Storage, address: &str) -> ChainResult<()> {
        let pos = self
            .validators
            .iter()
            .position(|v| v.address == address)
            .ok_or_else(|| ChainError::ValidatorNotFound(address.to_string()))?;

        Self::delete_one(storage, address)?;
        self.validators.remove(pos);
        Ok(())
    }

    /// 更新验证者信誉分
    pub fn update_reputation(
        &mut self,
        storage: &Storage,
        address: &str,
        score: u32,
    ) -> ChainResult<()> {
        let info = self
            .validators
            .iter_mut()
            .find(|v| v.address == address)
            .ok_or_else(|| ChainError::ValidatorNotFound(address.to_string()))?;

        info.reputation = score.min(100);
        info.is_active = score >= 30; // 低于 30 分自动停用
        Self::save_one(storage, info)?;
        Ok(())
    }

    /// 按区块高度 + 轮次轮换提议者 (round-robin)
    /// 公式: (height + round) % N, 确保同一高度不同轮次有不同提议者
    pub fn get_proposer(&self, block_number: u64, round: u64) -> Option<&ValidatorInfo> {
        let active: Vec<&ValidatorInfo> = self
            .validators
            .iter()
            .filter(|v| v.is_active)
            .collect();

        if active.is_empty() {
            return None;
        }
        let idx = ((block_number + round) as usize) % active.len();
        Some(active[idx])
    }

    /// 检查是否为活跃验证者
    pub fn is_active_validator(&self, address: &str) -> bool {
        self.validators
            .iter()
            .any(|v| v.address == address && v.is_active)
    }

    /// 获取验证者的公钥字节
    pub fn get_public_key(&self, address: &str) -> Option<Vec<u8>> {
        self.validators
            .iter()
            .find(|v| v.address == address)
            .map(|v| v.public_key.clone())
    }

    /// 获取活跃验证者列表
    pub fn active_validators(&self) -> Vec<&ValidatorInfo> {
        self.validators
            .iter()
            .filter(|v| v.is_active)
            .collect()
    }

    /// 活跃验证者数量
    pub fn count_active(&self) -> usize {
        self.validators.iter().filter(|v| v.is_active).count()
    }

    /// 获取 2/3+ 签名阈值 (IBFT 法定人数)
    pub fn quorum_threshold(&self) -> usize {
        let n = self.count_active();
        if n == 0 {
            return 1;
        }
        // 2/3 * N + 1
        (2 * n / 3) + 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_validator(addr: &str, stake: u64, active: bool, rep: u32) -> ValidatorInfo {
        ValidatorInfo {
            address: addr.to_string(),
            public_key: vec![0u8; 32],
            site_id: None,
            stake_amount: stake,
            joined_at: 1000,
            reputation: rep,
            is_active: active,
        }
    }

    #[test]
    fn test_quorum_threshold() {
        let set = ValidatorSet {
            max_validators: 21,
            min_stake: 1000,
            validators: vec![
                make_validator("a", 1000, true, 80),
                make_validator("b", 1000, true, 80),
                make_validator("c", 1000, true, 80),
                make_validator("d", 1000, true, 80),
            ],
        };
        // 4 validators: 2*4/3 + 1 = 2 + 1 = 3
        assert_eq!(set.quorum_threshold(), 3);
    }

    #[test]
    fn test_quorum_3_validators() {
        let set = ValidatorSet {
            max_validators: 21,
            min_stake: 1000,
            validators: vec![
                make_validator("a", 1000, true, 80),
                make_validator("b", 1000, true, 80),
                make_validator("c", 1000, true, 80),
            ],
        };
        // 3 validators: 2*3/3 + 1 = 2 + 1 = 3
        assert_eq!(set.quorum_threshold(), 3);
    }

    #[test]
    fn test_proposer_round_robin() {
        let set = ValidatorSet {
            max_validators: 21,
            min_stake: 1000,
            validators: vec![
                make_validator("a", 1000, true, 80),
                make_validator("b", 1000, true, 80),
                make_validator("c", 1000, false, 20), // inactive
                make_validator("d", 1000, true, 80),
            ],
        };
        // Active: a(0), b(1), d(2)
        assert_eq!(set.get_proposer(0, 0).unwrap().address, "a");
        assert_eq!(set.get_proposer(1, 0).unwrap().address, "b");
        assert_eq!(set.get_proposer(2, 0).unwrap().address, "d");
        assert_eq!(set.get_proposer(3, 0).unwrap().address, "a");
        // Round-aware: (0+1)%3 = 1 → b
        assert_eq!(set.get_proposer(0, 1).unwrap().address, "b");
    }

    #[test]
    fn test_quorum_1_validator() {
        let set = ValidatorSet {
            max_validators: 21,
            min_stake: 1000,
            validators: vec![make_validator("solo", 1000, true, 80)],
        };
        // 1 validator: 2*1/3 + 1 = 0 + 1 = 1
        assert_eq!(set.quorum_threshold(), 1);
    }
}
