use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Duration;

use libp2p::PeerId;
use tokio::sync::{mpsc, Mutex};

use crate::block::Block;
use crate::network::p2p::{P2PCommand, P2PEvent};
use crate::storage::rocks::Storage;

/// BlockSynchronizer — 区块同步状态机
///
/// 启动时检查本地最新区块是否落后于网络，若落后则向对等点请求缺失区块。
/// 使用缓冲区处理乱序到达的区块，按序验证并写入存储。
pub struct BlockSynchronizer {
    pub storage: Storage,
    pub p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
    /// 当前同步状态
    pub sync_state: Arc<Mutex<SyncState>>,
}

#[derive(Debug, Clone)]
pub struct SyncState {
    /// 是否正在同步
    pub is_syncing: bool,
    /// 目标高度
    pub target_height: u64,
    /// 当前同步到的块高
    pub synced_height: u64,
    /// 缓冲区 (block_number → Block), 处理乱序区块
    buffer: BTreeMap<u64, Block>,
}

impl SyncState {
    pub fn new(current_height: u64) -> Self {
        SyncState {
            is_syncing: false,
            target_height: current_height,
            synced_height: current_height,
            buffer: BTreeMap::new(),
        }
    }

    pub fn progress_pct(&self) -> f64 {
        if self.target_height <= self.synced_height {
            return 100.0;
        }
        let total = self.target_height - self.synced_height;
        let done = self.synced_height;
        (done as f64 / (done + total) as f64) * 100.0
    }
}

impl BlockSynchronizer {
    pub fn new(
        storage: Storage,
        p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
    ) -> Self {
        let current = storage.latest_block_number().unwrap_or(0);
        BlockSynchronizer {
            storage,
            p2p_cmd,
            sync_state: Arc::new(Mutex::new(SyncState::new(current))),
        }
    }

    /// 处理新区块公告 — 检查是否需要同步
    pub async fn on_block_announcement(&self, from: PeerId, block_number: u64) {
        let mut state = self.sync_state.lock().await;
        let local = self.storage.latest_block_number().unwrap_or(0);

        if block_number > local && !state.is_syncing {
            state.is_syncing = true;
            state.target_height = block_number;
            state.synced_height = local;

            tracing::info!(
                "开始区块同步: local={} remote={} from={}",
                local, block_number, from
            );

            // 向对方请求缺失的区块
            if self.p2p_cmd.send(P2PCommand::RequestBlocks {
                peer: from,
                start: local + 1,
                end: block_number,
            }).is_err() {
                tracing::warn!("P2P command channel closed");
            }
        }
    }

    /// 处理收到的区块响应
    pub async fn on_block_response(&self, blocks: Vec<Block>) {
        let mut state = self.sync_state.lock().await;

        for block in blocks {
            // 验证区块
            if let Err(e) = block.verify() {
                tracing::warn!("同步区块验证失败 (height={}): {}", block.header.number, e);
                continue;
            }

            // 验证与前一个区块的连续性
            let prev = self.storage
                .get_block(block.header.number.saturating_sub(1))
                .ok()
                .flatten();
            if let Some(ref prev_block) = prev {
                if block.header.previous_hash != prev_block.hash {
                    tracing::warn!(
                        "区块 prev_hash 不匹配: height={}",
                        block.header.number
                    );
                    continue;
                }
            }

            // 放入缓冲区
            state.buffer.insert(block.header.number, block);
        }

        // 尝试按序写入
        let next = state.synced_height + 1;
        while let Some(block) = state.buffer.remove(&next) {
            if let Err(e) = self.storage.put_block(&block) {
                tracing::error!("写入同步区块失败 (height={}): {}", block.header.number, e);
                break;
            }
            for tx in &block.transactions {
                if let Err(e) = self.storage.put_transaction(tx) {
                    tracing::error!("Failed to put transaction: {}", e);
                }
            }
            state.synced_height = block.header.number;
            tracing::debug!("同步区块: height={}", block.header.number);
        }

        // 检查是否完成
        if state.synced_height >= state.target_height {
            state.is_syncing = false;
            tracing::info!("区块同步完成: height={}", state.synced_height);
        }
    }

    /// 定期检查并请求未完成的同步
    pub async fn tick(&self) {
        let state = self.sync_state.lock().await;
        if state.is_syncing && state.synced_height < state.target_height {
            // 缓冲区有缺失，重新请求
            let next = state.synced_height + 1;
            tracing::debug!("重新请求区块: start={} end={}", next, state.target_height);
            // 注意: 这里需要一个 peer_id，实际使用中应缓存
        }
    }
}

/// 启动同步事件循环，返回 JoinHandle 供调用者在 shutdown 时 abort
pub fn start_sync_loop(
    _synchronizer: Arc<BlockSynchronizer>,
    mut event_rx: mpsc::UnboundedReceiver<P2PEvent>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(30));

        loop {
            tokio::select! {
                event = event_rx.recv() => {
                    match event {
                        Some(P2PEvent::BlockAnnouncement { from, block_number, .. }) => {
                            _synchronizer.on_block_announcement(from, block_number).await;
                        }
                        Some(P2PEvent::BlockResponse { blocks, .. }) => {
                            _synchronizer.on_block_response(blocks).await;
                        }
                        Some(_) => {}
                        None => break,
                    }
                }
                _ = tick.tick() => {
                    _synchronizer.tick().await;
                }
            }
        }

        tracing::info!("同步事件循环退出");
    })
}
