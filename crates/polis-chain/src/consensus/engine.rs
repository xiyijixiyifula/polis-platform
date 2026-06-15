use std::collections::HashSet;

use crate::block::{Block, BlockHeader, CommitSeal};
use crate::consensus::validator::ValidatorSet;
use crate::crypto;
use crate::error::{ChainError, ChainResult};
use crate::state::ChainConfig;
use crate::storage::rocks::Storage;
use crate::transaction::SignedTransaction;

/// IBFT 共识阶段
#[derive(Debug, Clone, PartialEq)]
pub enum ConsensusPhase {
    /// 等待新区块提案
    Idle,
    /// 收到 PrePrepare, 等待足够的 Prepare 投票
    PrePrepared,
    /// 收集到 2/3+ Prepare, 等待 Commit
    Prepared,
    /// 收集到 2/3+ Commit, 区块已最终确定
    Committed,
    /// 超时, 请求轮次切换
    RoundChange,
}

/// IBFT 共识引擎
pub struct IbftEngine {
    /// 本节点的验证者地址
    pub validator_address: String,
    /// 当前共识阶段
    pub phase: ConsensusPhase,
    /// 当前区块高度
    pub height: u64,
    /// 当前共识轮次 (同一高度可有多轮)
    pub round: u64,
    /// 验证者集合
    pub validator_set: ValidatorSet,
    /// 当前轮次的提案区块
    pub proposed_block: Option<Block>,
    /// 已收集的 Prepare 投票 (验证者地址 → 签名)
    pub prepares: Vec<CommitSeal>,
    /// 已收集的 Commit 投票
    pub commits: Vec<CommitSeal>,
    /// 上一个锁定的区块 (防止分叉)
    pub locked_block: Option<(u64, [u8; 32])>, // (round, block_hash)
    /// 已投票的 Prepare/Commit 地址集合 (防止重复)
    prepare_voters: HashSet<String>,
    commit_voters: HashSet<String>,
}

impl IbftEngine {
    pub fn new(validator_address: String, validator_set: ValidatorSet, height: u64) -> Self {
        IbftEngine {
            validator_address,
            phase: ConsensusPhase::Idle,
            height,
            round: 0,
            validator_set,
            proposed_block: None,
            prepares: Vec::new(),
            commits: Vec::new(),
            locked_block: None,
            prepare_voters: HashSet::new(),
            commit_voters: HashSet::new(),
        }
    }

    /// 检查本节点是否为当前高度+轮次的提议者
    pub fn is_proposer(&self) -> bool {
        self.validator_set
            .get_proposer(self.height, self.round)
            .map(|v| v.address == self.validator_address)
            .unwrap_or(false)
    }

    /// 获取当前高度+轮次的提议者地址
    pub fn proposer_address(&self) -> Option<String> {
        self.validator_set
            .get_proposer(self.height, self.round)
            .map(|v| v.address.clone())
    }

    /// 提议新区块 (仅提议者调用)
    /// 从 mempool 收集待处理交易，构建候选区块
    pub fn propose_block(
        &mut self,
        storage: &Storage,
        _chain_config: &ChainConfig,
        mempool_txs: Vec<SignedTransaction>,
    ) -> ChainResult<Block> {
        if self.phase != ConsensusPhase::Idle {
            return Err(ChainError::Consensus(format!(
                "当前阶段 {:?} 不允许提议区块",
                self.phase
            )));
        }

        let prev_block = storage
            .get_block(self.height.saturating_sub(1))?
            .unwrap_or_else(|| {
                // 如果没有前区块 (创世后第一块), 使用创世哈希
                let genesis_hash = storage
                    .get_meta(b"genesis_hash")
                    .ok()
                    .flatten()
                    .unwrap_or(vec![0u8; 32]);
                let mut hash = [0u8; 32];
                hash.copy_from_slice(&genesis_hash[..32.min(genesis_hash.len())]);
                Block {
                    header: crate::block::BlockHeader {
                        number: 0,
                        timestamp: 0,
                        previous_hash: [0u8; 32],
                        merkle_root: [0u8; 32],
                        state_root: [0u8; 32],
                        validator: "genesis".into(),
                        nonce: 0,
                    },
                    transactions: vec![],
                    commits: vec![],
                    hash,
                }
            });

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system clock is set before UNIX epoch")
            .as_secs();

        let mut block = Block {
            header: BlockHeader {
                number: self.height,
                timestamp: now,
                previous_hash: prev_block.hash,
                merkle_root: [0u8; 32],
                state_root: [0u8; 32],
                validator: self.validator_address.clone(),
                nonce: 0,
            },
            transactions: mempool_txs,
            commits: Vec::new(),
            hash: [0u8; 32],
        };

        block.seal();

        self.proposed_block = Some(block.clone());
        self.phase = ConsensusPhase::PrePrepared;

        Ok(block)
    }

    /// 验证其他提议者发来的区块 (非提议者调用)
    pub fn verify_proposal(&mut self, block: &Block, round: u64) -> ChainResult<()> {
        // 验证提议者
        let expected_proposer = self
            .validator_set
            .get_proposer(block.header.number, round)
            .ok_or_else(|| ChainError::Consensus("无活跃验证者可提议".into()))?;

        if expected_proposer.address != block.header.validator {
            return Err(ChainError::Consensus(format!(
                "提议者不匹配: 期望 {}, 实际 {}",
                expected_proposer.address, block.header.validator
            )));
        }

        // 验证区块哈希
        let computed = block.compute_hash();
        if computed != block.hash {
            return Err(ChainError::Validation("区块哈希不匹配".into()));
        }

        // 验证 Merkle 根
        let merkle = block.compute_merkle_root();
        if merkle != block.header.merkle_root {
            return Err(ChainError::Validation("Merkle 根不匹配".into()));
        }

        // 验证高度
        if block.header.number != self.height {
            return Err(ChainError::Consensus(format!(
                "区块高度不匹配: 期望 {}, 实际 {}",
                self.height, block.header.number
            )));
        }

        // 锁定规则: 如果已锁定, 只能接受锁定高度 ≥ 当前轮的提案
        if let Some((locked_round, locked_hash)) = &self.locked_block {
            if self.round < *locked_round {
                return Err(ChainError::Consensus("已锁定更早轮次的区块".into()));
            }
            if self.round == *locked_round && block.hash != *locked_hash {
                return Err(ChainError::Consensus("提案与锁定区块冲突".into()));
            }
        }

        self.proposed_block = Some(block.clone());
        self.phase = ConsensusPhase::PrePrepared;
        Ok(())
    }

    /// 创建 Prepare 投票 (验证者对提案区块签名)
    pub fn create_seal(
        &self,
        block_hash: &[u8; 32],
        signing_key: &ed25519_dalek::SigningKey,
    ) -> CommitSeal {
        let signature = crypto::sign_data(signing_key, &block_hash[..]);
        CommitSeal {
            validator: self.validator_address.clone(),
            signature,
        }
    }

    /// 验证投票签名 (从验证者集合中查找公钥)
    pub fn verify_seal(&self, block_hash: &[u8; 32], seal: &CommitSeal) -> ChainResult<()> {
        if !self.validator_set.is_active_validator(&seal.validator) {
            return Err(ChainError::Consensus(format!(
                "{} 不是活跃验证者",
                seal.validator
            )));
        }

        // 从验证者集合中获取公钥
        let public_key_bytes = self
            .validator_set
            .get_public_key(&seal.validator)
            .ok_or_else(|| {
                ChainError::Consensus(format!("验证者 {} 公钥未找到", seal.validator))
            })?;

        let key_bytes: &[u8; 32] = public_key_bytes
            .as_slice()
            .try_into()
            .map_err(|_| ChainError::Crypto("公钥长度错误".into()))?;

        let verifying_key = crypto::verifying_key_from_bytes(key_bytes)?;
        crypto::verify_signature(&verifying_key, &block_hash[..], &seal.signature)?;

        Ok(())
    }

    /// 添加 Prepare 投票
    pub fn add_prepare(&mut self, seal: CommitSeal, block_hash: &[u8; 32]) -> ChainResult<bool> {
        if self.phase != ConsensusPhase::PrePrepared {
            return Ok(false);
        }

        // 验证投票与本节点看到的区块匹配
        if let Some(ref block) = self.proposed_block {
            if block.hash != *block_hash {
                return Ok(false);
            }
        }

        // 防止重复投票
        if self.prepare_voters.contains(&seal.validator) {
            return Ok(true); // 已投过, 不重复计算
        }

        self.prepare_voters.insert(seal.validator.clone());
        self.prepares.push(seal);

        // 检查是否达到 2/3+ Prepare
        if self.prepares.len() + 1 >= self.validator_set.quorum_threshold() {
            // +1 包含自己的隐含投票
            self.phase = ConsensusPhase::Prepared;
            // 锁定当前区块
            self.locked_block = Some((self.round, *block_hash));
            return Ok(true);
        }

        Ok(false)
    }

    /// 添加 Commit 投票
    pub fn add_commit(&mut self, seal: CommitSeal, block_hash: &[u8; 32]) -> ChainResult<bool> {
        if self.phase != ConsensusPhase::Prepared && self.phase != ConsensusPhase::Committed {
            return Ok(false);
        }

        if let Some(ref block) = self.proposed_block {
            if block.hash != *block_hash {
                return Ok(false);
            }
        }

        if self.commit_voters.contains(&seal.validator) {
            return Ok(true);
        }

        self.commit_voters.insert(seal.validator.clone());
        self.commits.push(seal);

        // +1 包含自己的隐含投票
        if self.commits.len() + 1 >= self.validator_set.quorum_threshold() {
            self.phase = ConsensusPhase::Committed;
            return Ok(true);
        }

        Ok(false)
    }

    /// 是否已收集足够的 Prepare 投票 (进入 Prepared 阶段)
    pub fn has_quorum_prepares(&self) -> bool {
        self.phase == ConsensusPhase::Prepared || self.phase == ConsensusPhase::Committed
    }

    /// 是否已收集足够的 Commit 投票 (区块已最终确定)
    pub fn has_quorum_commits(&self) -> bool {
        self.phase == ConsensusPhase::Committed
    }

    /// 最终确定区块: 收集 commits 写入区块, 持久化到 RocksDB
    pub fn finalize_block(&mut self, storage: &Storage) -> ChainResult<Block> {
        if self.phase != ConsensusPhase::Committed {
            return Err(ChainError::Consensus("区块尚未获得足够 Commit".into()));
        }

        let mut block = self
            .proposed_block
            .take()
            .ok_or_else(|| ChainError::Consensus("无待定案区块".into()))?;

        // 附加 Commits (包含自己的)
        let self_seal = self.commits.first().cloned();
        if let Some(seal) = self_seal {
            if !block.commits.iter().any(|c| c.validator == seal.validator) {
                block.commits.push(seal);
            }
        }
        for seal in &self.commits {
            if !block.commits.iter().any(|c| c.validator == seal.validator) {
                block.commits.push(seal.clone());
            }
        }

        // 写入存储
        storage.put_block(&block)?;

        // 存储每笔交易
        for tx in &block.transactions {
            storage.put_transaction(tx)?;
        }

        // 更新状态
        self.height += 1;
        self.round = 0;
        self.phase = ConsensusPhase::Idle;
        self.proposed_block = None;
        self.prepares.clear();
        self.commits.clear();
        self.prepare_voters.clear();
        self.commit_voters.clear();
        self.locked_block = None;

        Ok(block)
    }

    /// 超时处理: 进入 RoundChange
    pub fn on_timeout(&mut self) {
        if self.phase == ConsensusPhase::Committed {
            return; // 已提交, 不处理超时
        }
        self.round += 1;
        self.phase = ConsensusPhase::RoundChange;
        // 清除当前轮投票
        self.prepares.clear();
        self.commits.clear();
        self.prepare_voters.clear();
        self.commit_voters.clear();
        self.proposed_block = None;
    }

    /// 开始新一轮 (RoundChange 后)
    pub fn start_new_round(&mut self) {
        self.phase = ConsensusPhase::Idle;
    }

    /// 添加 RoundChange 投票
    pub fn add_round_change(
        &mut self,
        height: u64,
        round: u64,
        _validator: &str,
    ) -> ChainResult<bool> {
        if height < self.height {
            return Ok(false);
        }
        // 如果收到更高轮的 RoundChange，更新本地轮次
        if height == self.height && round > self.round {
            self.round = round;
            self.phase = ConsensusPhase::RoundChange;
            return Ok(true);
        }
        Ok(false)
    }

    /// 获取当前待处理交易的数量 (从 mempool 估算)
    pub fn pending_tx_count(&self) -> usize {
        if let Some(ref block) = self.proposed_block {
            block.transactions.len()
        } else {
            0
        }
    }
}
