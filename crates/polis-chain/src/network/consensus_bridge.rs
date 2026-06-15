use std::sync::Arc;
use std::time::Duration;

use ed25519_dalek::SigningKey;
use libp2p::PeerId;
use tokio::sync::{mpsc, Mutex};

use crate::consensus::engine::{ConsensusPhase, IbftEngine};
use crate::mempool::Mempool;
use crate::network::p2p::{ConsensusWireMessage, P2PCommand, P2PEvent};
use crate::storage::rocks::Storage;

/// ConsensusBridge — P2P 事件与共识引擎之间的胶水层
///
/// 从 P2P 事件循环接收共识相关消息，转换为共识引擎的状态机调用，
/// 并将共识引擎产生的消息/投票通过 P2P 广播出去。
pub struct ConsensusBridge {
    pub consensus: Arc<Mutex<IbftEngine>>,
    pub p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
    pub signing_key: Option<SigningKey>,
    pub storage: Storage,
    pub mempool: Arc<Mutex<Mempool>>,
    pub round_timeout: Duration,
    pub node_address: String,
}

impl ConsensusBridge {
    pub fn new(
        consensus: Arc<Mutex<IbftEngine>>,
        p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
        signing_key: Option<SigningKey>,
        storage: Storage,
        mempool: Arc<Mutex<Mempool>>,
        node_address: String,
    ) -> Self {
        ConsensusBridge {
            consensus,
            p2p_cmd,
            signing_key,
            storage,
            mempool,
            round_timeout: Duration::from_secs(10),
            node_address,
        }
    }

    /// 处理收到的 P2P 共识消息
    pub async fn handle_consensus_message(
        &self,
        _from: PeerId,
        message: ConsensusWireMessage,
    ) -> Result<(), crate::error::ChainError> {
        let mut engine = self.consensus.lock().await;

        match message {
            ConsensusWireMessage::PrePrepare { height, round, block, proposer: _ } => {
                if height != engine.height || round != engine.round {
                    return Ok(());
                }
                if engine.phase != ConsensusPhase::Idle {
                    return Ok(());
                }
                // 验证并接收提案
                engine.verify_proposal(&block, round)?;

                // 创建自己的 Prepare 投票并添加到引擎
                if let Some(ref sk) = self.signing_key {
                    let seal = engine.create_seal(&block.hash, sk);
                    let _ = engine.add_prepare(seal.clone(), &block.hash);

                    // 广播 Prepare 给其他验证者
                    let prepare = ConsensusWireMessage::Prepare {
                        height,
                        round,
                        block_hash: block.hash,
                        seal,
                    };
                    let _ = self.p2p_cmd
                        .send(P2PCommand::BroadcastConsensusMessage(prepare));

                    // 检查是否已收集足够 Prepare
                    let prepared = engine.has_quorum_prepares();
                    drop(engine);

                    if prepared {
                        self.broadcast_commit(height, round).await;

                        // Self-commit 也在本地添加
                        let mut engine = self.consensus.lock().await;
                        if let Some(ref sk) = self.signing_key {
                            let commit_seal = engine.create_seal(&block.hash, sk);
                            if engine.add_commit(commit_seal, &block.hash).unwrap_or(false)
                                && engine.has_quorum_commits() {
                                    let finalized = engine.finalize_block(&self.storage)?;
                                    tracing::info!("区块已最终确定: height={}", finalized.header.number);
                                }
                        }
                    }
                } else {
                    drop(engine);
                }
            }

            ConsensusWireMessage::Prepare { height, round, block_hash, seal } => {
                if height != engine.height || round != engine.round {
                    return Ok(());
                }
                // 验证投票签名
                engine.verify_seal(&block_hash, &seal)?;
                let quorum_reached = engine.add_prepare(seal, &block_hash)?;

                if quorum_reached {
                    tracing::info!("达成 Prepare 法定人数: height={} round={}", height, round);
                    drop(engine);
                    self.broadcast_commit(height, round).await;
                }
            }

            ConsensusWireMessage::Commit { height, round, block_hash, seal } => {
                if height != engine.height || round != engine.round {
                    return Ok(());
                }
                engine.verify_seal(&block_hash, &seal)?;
                let quorum_reached = engine.add_commit(seal, &block_hash)?;

                if quorum_reached {
                    tracing::info!("达成 Commit 法定人数: height={} round={}", height, round);
                    drop(engine);
                    self.finalize_and_advance().await?;
                }
            }

            ConsensusWireMessage::RoundChange { height, round, validator } => {
                if height < engine.height {
                    return Ok(());
                }
                if height == engine.height && round <= engine.round {
                    return Ok(());
                }
                // 收到更高轮的 RoundChange → 同步到该轮
                tracing::info!(
                    "收到 RoundChange: height={} round={} from={} (当前 round={})",
                    height, round, validator, engine.round
                );
                engine.round = round;
                engine.phase = ConsensusPhase::RoundChange;
                drop(engine);
                self.start_new_round(height, round).await;
            }
        }

        Ok(())
    }

    /// 提议新区块 (当前节点是 proposer 时调用)
    pub async fn propose_new_block(&self) -> Result<(), crate::error::ChainError> {
        let txs = {
            let mempool = self.mempool.lock().await;
            mempool.get_batch(200)
        };

        let mut engine = self.consensus.lock().await;
        let chain_config = crate::state::ChainConfig::default();
        let block = engine.propose_block(&self.storage, &chain_config, txs)?;
        let block_hash = block.hash;
        let height = engine.height;
        let round = engine.round;

        // 广播 PrePrepare 给其他验证者
        let msg = ConsensusWireMessage::PrePrepare {
            height,
            round,
            block: block.clone(),
            proposer: self.node_address.clone(),
        };
        let _ = self.p2p_cmd
            .send(P2PCommand::BroadcastConsensusMessage(msg));

        tracing::info!(
            "提议区块: height={} round={} hash={} txs={}",
            height,
            round,
            hex::encode(block_hash),
            block.transactions.len()
        );

        // Proposer 自我投票: Prepare + Commit
        // 单节点模式下直接达到 quorum; 多节点模式下贡献自己的票
        if let Some(ref sk) = self.signing_key {
            let seal = engine.create_seal(&block_hash, sk);
            if engine.add_prepare(seal, &block_hash).unwrap_or(false) {
                tracing::debug!("自我 Prepare 投票: height={}", height);
            }

            if engine.has_quorum_prepares() {
                let seal = engine.create_seal(&block_hash, sk);
                if engine.add_commit(seal, &block_hash).unwrap_or(false) {
                    tracing::debug!("自我 Commit 投票: height={}", height);
                }
            }
        }

        // 达到 quorum → 最终确定
        if engine.has_quorum_commits() {
            let finalized = engine.finalize_block(&self.storage)?;
            tracing::info!(
                "区块已最终确定: height={} hash={}",
                finalized.header.number,
                hex::encode(finalized.hash)
            );
        }

        Ok(())
    }

    /// 启动新一轮共识 (RoundChange 后)
    async fn start_new_round(&self, height: u64, round: u64) {
        // 广播 RoundChange
        let msg = ConsensusWireMessage::RoundChange {
            height,
            round,
            validator: self.node_address.clone(),
        };
        let _ = self.p2p_cmd.send(P2PCommand::BroadcastConsensusMessage(msg));

        let mut engine = self.consensus.lock().await;
        engine.start_new_round();

        // 检查本节点是否是新一轮的 proposer
        let is_proposer = engine.is_proposer();
        drop(engine);

        if is_proposer {
            let _ = self.propose_new_block().await;
        }
    }

    /// 广播 Commit 投票
    async fn broadcast_commit(&self, height: u64, round: u64) {
        let (hash_opt, _) = {
            let engine = self.consensus.lock().await;
            (
                engine.proposed_block.as_ref().map(|b| b.hash),
                engine.validator_address.clone(),
            )
        };

        if let (Some(block_hash), Some(ref sk)) = (hash_opt, &self.signing_key) {
            let engine = self.consensus.lock().await;
            let seal = engine.create_seal(&block_hash, sk);
            let commit = ConsensusWireMessage::Commit {
                height,
                round,
                block_hash,
                seal,
            };
            let _ = self.p2p_cmd
                .send(P2PCommand::BroadcastConsensusMessage(commit));
        }
    }

    /// 最终确定区块并推进到下一个高度
    async fn finalize_and_advance(&self) -> Result<(), crate::error::ChainError> {
        let block = {
            let mut engine = self.consensus.lock().await;
            engine.finalize_block(&self.storage)?
        };

        // 从 mempool 移除已打包的交易
        {
            let tx_hashes: Vec<[u8; 32]> = block.transactions.iter().map(|tx| tx.hash).collect();
            let mut mempool = self.mempool.lock().await;
            mempool.remove_batch(&tx_hashes);
        }

        // 广播区块公告
        let _ = self.p2p_cmd.send(P2PCommand::BroadcastBlockAnnouncement {
            block_number: block.header.number,
            block_hash: block.hash,
        });

        tracing::info!(
            "区块已最终确定: height={} hash={} txs={}",
            block.header.number,
            hex::encode(block.hash),
            block.transactions.len()
        );

        // 检查本节点是否是下一轮的 proposer，如果是则提议
        let engine = self.consensus.lock().await;
        let is_proposer = engine.is_proposer();
        drop(engine);

        if is_proposer {
            let _ = self.propose_new_block().await;
        }

        Ok(())
    }
}

/// 启动共识事件循环 (run in tokio::spawn)
pub fn start_consensus_loop(
    bridge: Arc<ConsensusBridge>,
    mut event_rx: mpsc::UnboundedReceiver<P2PEvent>,
) {
    tokio::spawn(async move {
        let mut round_timer = tokio::time::interval(bridge.round_timeout);

        loop {
            tokio::select! {
                event = event_rx.recv() => {
                    match event {
                        Some(P2PEvent::ConsensusMessage { from, message }) => {
                            if let Err(e) = bridge.handle_consensus_message(from, message).await {
                                tracing::warn!("处理共识消息失败: {}", e);
                            }
                        }
                        Some(_) => {} // 其他事件由 EventRouter 处理
                        None => break,
                    }
                }
                _ = round_timer.tick() => {
                    // 超时检查
                    let engine = bridge.consensus.lock().await;
                    let phase = engine.phase.clone();
                    let height = engine.height;
                    let round = engine.round;
                    let is_proposer = engine.is_proposer();
                    drop(engine);

                    match phase {
                        ConsensusPhase::Idle => {
                            // 如果是 proposer 且还在 Idle，尝试提议
                            if is_proposer {
                                let _ = bridge.propose_new_block().await;
                            }
                        }
                        ConsensusPhase::Committed => {
                            // 已提交，不超时
                        }
                        _ => {
                            // 超时 → RoundChange → 新一轮
                            tracing::warn!(
                                "共识超时: height={} round={} phase={:?}",
                                height, round, phase
                            );
                            let mut engine = bridge.consensus.lock().await;
                            engine.on_timeout();
                            let new_round = engine.round;
                            engine.start_new_round(); // 重置为 Idle, 准备新一轮
                            drop(engine);

                            // 广播 RoundChange
                            let msg = ConsensusWireMessage::RoundChange {
                                height,
                                round: new_round,
                                validator: bridge.node_address.clone(),
                            };
                            let _ = bridge.p2p_cmd
                                .send(P2PCommand::BroadcastConsensusMessage(msg));

                            // 检查是否是新一轮的 proposer
                            let engine = bridge.consensus.lock().await;
                            let is_proposer = engine.is_proposer();
                            drop(engine);

                            if is_proposer {
                                let _ = bridge.propose_new_block().await;
                            }
                        }
                    }
                }
            }
        }

        tracing::info!("共识事件循环退出");
    });
}
