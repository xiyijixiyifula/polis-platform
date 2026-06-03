use std::sync::Arc;

use tokio::sync::{mpsc, Mutex};

use crate::mempool::Mempool;
use crate::network::p2p::{P2PCommand, P2PEvent};
use crate::storage::rocks::Storage;

/// EventRouter — 将 P2PEvent 分发到各个子系统
///
/// - ConsensusMessage → 转发到 consensus_bridge 的事件通道
/// - TransactionBroadcast → 验证后加入 Mempool
/// - BlockRequest → 从存储读取 → SendBlockResponse
/// - BlockResponse → 转发到 BlockSynchronizer
/// - BlockAnnouncement → 转发到 BlockSynchronizer 检查落后
/// - PeerConnected/Disconnected → 更新 DiscoveryService
pub struct EventRouter {
    pub p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
    pub mempool: Arc<Mutex<Mempool>>,
    pub storage: Storage,
    /// 共识事件转发通道
    pub consensus_tx: mpsc::UnboundedSender<P2PEvent>,
    /// 同步事件转发通道
    pub sync_tx: mpsc::UnboundedSender<P2PEvent>,
}

impl EventRouter {
    pub fn new(
        p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
        mempool: Arc<Mutex<Mempool>>,
        storage: Storage,
        consensus_tx: mpsc::UnboundedSender<P2PEvent>,
        sync_tx: mpsc::UnboundedSender<P2PEvent>,
    ) -> Self {
        EventRouter {
            p2p_cmd,
            mempool,
            storage,
            consensus_tx,
            sync_tx,
        }
    }

    /// 处理一个 P2P 事件
    pub async fn handle_event(&self, event: P2PEvent) {
        match event {
            P2PEvent::ConsensusMessage { .. } => {
                let _ = self.consensus_tx.send(event);
            }

            P2PEvent::TransactionBroadcast { transaction, .. } => {
                let mut mempool = self.mempool.lock().await;
                match mempool.add(transaction) {
                    Ok(true) => {
                        tracing::debug!("从 P2P 接收到交易并加入 mempool");
                    }
                    Ok(false) => {
                        tracing::debug!("交易重复或 mempool 已满，跳过");
                    }
                    Err(e) => {
                        tracing::warn!("交易验证失败: {}", e);
                    }
                }
            }

            P2PEvent::BlockRequest { from: _from, request_id, start, end } => {
                let mut blocks = Vec::new();
                for i in start..=end {
                    if let Ok(Some(block)) = self.storage.get_block(i) {
                        blocks.push(block);
                    } else {
                        break;
                    }
                }
                let _ = self.p2p_cmd.send(P2PCommand::SendBlockResponse {
                    request_id,
                    blocks,
                });
            }

            P2PEvent::BlockResponse { .. }
            | P2PEvent::BlockAnnouncement { .. } => {
                let _ = self.sync_tx.send(event);
            }

            P2PEvent::PeerConnected(_) | P2PEvent::PeerDisconnected(_) => {
                // Discovery 事件 — 暂时只记日志
                tracing::debug!("对等点事件");
            }
        }
    }

    /// 启动事件路由循环
    pub fn spawn(self, mut event_rx: mpsc::UnboundedReceiver<P2PEvent>) {
        tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                self.handle_event(event).await;
            }
            tracing::info!("事件路由循环退出");
        });
    }
}
