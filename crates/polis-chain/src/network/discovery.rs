use std::collections::HashMap;
use std::time::{Duration, Instant};

use libp2p::PeerId;

/// 对等点发现服务
///
/// 结合 Kademlia DHT (WAN) 和 mDNS (LAN) 两种发现机制。
/// 维护已知对等点的存活性信息。
pub struct DiscoveryService {
    /// 已知对等点及其最后心跳时间
    known_peers: HashMap<PeerId, Instant>,
    /// 对等点超时 (60s 无心跳视为断开)
    peer_timeout: Duration,
}

impl DiscoveryService {
    pub fn new() -> Self {
        DiscoveryService {
            known_peers: HashMap::new(),
            peer_timeout: Duration::from_secs(60),
        }
    }

    /// 记录对等点连接
    pub fn peer_connected(&mut self, peer_id: PeerId) {
        self.known_peers.insert(peer_id, Instant::now());
    }

    /// 记录对等点断开
    pub fn peer_disconnected(&mut self, peer_id: &PeerId) {
        self.known_peers.remove(peer_id);
    }

    /// 更新对等点心跳
    pub fn heartbeat(&mut self, peer_id: &PeerId) {
        if let Some(last) = self.known_peers.get_mut(peer_id) {
            *last = Instant::now();
        }
    }

    /// 获取活跃对等点数量
    pub fn active_peers(&self) -> usize {
        self.known_peers
            .iter()
            .filter(|(_, last)| last.elapsed() < self.peer_timeout)
            .count()
    }

    /// 清理过期的对等点
    pub fn cleanup(&mut self) {
        self.known_peers
            .retain(|_, last| last.elapsed() < self.peer_timeout);
    }

    /// 获取所有活跃对等点
    pub fn get_active_peer_ids(&self) -> Vec<PeerId> {
        self.known_peers
            .iter()
            .filter(|(_, last)| last.elapsed() < self.peer_timeout)
            .map(|(id, _)| *id)
            .collect()
    }
}

impl Default for DiscoveryService {
    fn default() -> Self {
        Self::new()
    }
}
