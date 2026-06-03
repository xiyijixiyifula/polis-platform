/// Gossip 消息广播服务
///
/// 使用 libp2p Gossipsub 协议，定义 3 个 Topic:
/// - `{chain_id}/consensus/1.0.0` — 共识消息 (IBFT PrePrepare/Prepare/Commit/RoundChange)
/// - `{chain_id}/transactions/1.0.0` — 交易广播
/// - `{chain_id}/blocks/1.0.0` — 区块公告 (高度+哈希)
pub struct GossipService {
    pub chain_id: String,
}

impl GossipService {
    pub fn new(chain_id: String) -> Self {
        GossipService { chain_id }
    }

    pub fn consensus_topic(&self) -> String {
        format!("{}/consensus/1.0.0", self.chain_id)
    }

    pub fn transactions_topic(&self) -> String {
        format!("{}/transactions/1.0.0", self.chain_id)
    }

    pub fn blocks_topic(&self) -> String {
        format!("{}/blocks/1.0.0", self.chain_id)
    }

    pub fn topics(&self) -> Vec<String> {
        vec![
            self.consensus_topic(),
            self.transactions_topic(),
            self.blocks_topic(),
        ]
    }
}
