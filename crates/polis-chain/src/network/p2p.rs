use std::collections::{HashMap, HashSet};
use std::time::Duration;

use libp2p::{
    core::upgrade,
    futures::StreamExt,
    gossipsub, identify, identity, kad,
    mdns, noise, ping, request_response,
    swarm::{NetworkBehaviour, Swarm, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId, Transport,
};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use crate::block::{Block, CommitSeal};
use crate::transaction::SignedTransaction;

// ============ 共识线消息 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConsensusWireMessage {
    PrePrepare {
        height: u64,
        round: u64,
        block: Block,
        proposer: String,
    },
    Prepare {
        height: u64,
        round: u64,
        block_hash: [u8; 32],
        seal: CommitSeal,
    },
    Commit {
        height: u64,
        round: u64,
        block_hash: [u8; 32],
        seal: CommitSeal,
    },
    RoundChange {
        height: u64,
        round: u64,
        validator: String,
    },
}

// ============ 区块同步协议 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSyncRequest {
    pub start: u64,
    pub end: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSyncResponse {
    pub blocks: Vec<Block>,
}

// ============ P2P 命令 ============

pub enum P2PCommand {
    BroadcastConsensusMessage(ConsensusWireMessage),
    BroadcastTransaction(SignedTransaction),
    BroadcastBlockAnnouncement {
        block_number: u64,
        block_hash: [u8; 32],
    },
    RequestBlocks {
        peer: PeerId,
        start: u64,
        end: u64,
    },
    SendBlockResponse {
        request_id: request_response::InboundRequestId,
        blocks: Vec<Block>,
    },
    Dial(Multiaddr),
    GetPeers(tokio::sync::oneshot::Sender<Vec<String>>),
}

// ============ P2P 事件 ============

pub enum P2PEvent {
    ConsensusMessage {
        from: PeerId,
        message: ConsensusWireMessage,
    },
    TransactionBroadcast {
        from: PeerId,
        transaction: SignedTransaction,
    },
    BlockRequest {
        from: PeerId,
        request_id: request_response::InboundRequestId,
        start: u64,
        end: u64,
    },
    BlockResponse {
        from: PeerId,
        request_id: request_response::OutboundRequestId,
        blocks: Vec<Block>,
    },
    BlockAnnouncement {
        from: PeerId,
        block_number: u64,
        block_hash: [u8; 32],
    },
    PeerConnected(PeerId),
    PeerDisconnected(PeerId),
}

// ============ NetworkBehaviour ============

#[derive(NetworkBehaviour)]
pub struct P2PBehaviour {
    pub gossipsub: gossipsub::Behaviour,
    pub kademlia: kad::Behaviour<kad::store::MemoryStore>,
    pub mdns: mdns::tokio::Behaviour,
    pub request_response: request_response::cbor::Behaviour<BlockSyncRequest, BlockSyncResponse>,
    pub identify: identify::Behaviour,
    pub ping: ping::Behaviour,
}

// ============ P2P 节点 ============

pub struct P2PNode {
    pub local_peer_id: PeerId,
    pub event_rx: mpsc::UnboundedReceiver<P2PEvent>,
    pub cmd_tx: mpsc::UnboundedSender<P2PCommand>,
    /// 事件循环的 JoinHandle — 调用者可 abort 以确保优雅关闭
    pub event_loop_handle: tokio::task::JoinHandle<()>,
    connected_peers: HashSet<PeerId>,
}

impl P2PNode {
    pub async fn new(
        keypair: identity::ed25519::Keypair,
        listen_port: u16,
        chain_id: &str,
        bootstrap_nodes: &[String],
    ) -> Result<Self, crate::error::ChainError> {
        let local_peer_id = PeerId::from(identity::PublicKey::from(keypair.public()));
        let id_keys = identity::Keypair::from(keypair);

        // --- Transport: TCP + Noise + Yamux ---
        let transport = tcp::tokio::Transport::new(tcp::Config::default().nodelay(true))
            .upgrade(upgrade::Version::V1)
            .authenticate(
                noise::Config::new(&id_keys)
                    .map_err(|e| crate::error::ChainError::P2P(format!("noise: {}", e)))?,
            )
            .multiplex(yamux::Config::default())
            .boxed();

        // --- Gossipsub ---
        let gossipsub_config = gossipsub::Config::default();
        let mut gossipsub: gossipsub::Behaviour =
            gossipsub::Behaviour::new(
                gossipsub::MessageAuthenticity::Signed(id_keys.clone()),
                gossipsub_config,
            )
            .map_err(|e| crate::error::ChainError::P2P(format!("gossipsub: {}", e)))?;

        let consensus_topic = gossipsub::IdentTopic::new(format!("{}/consensus/1.0.0", chain_id));
        let tx_topic = gossipsub::IdentTopic::new(format!("{}/transactions/1.0.0", chain_id));
        let block_topic = gossipsub::IdentTopic::new(format!("{}/blocks/1.0.0", chain_id));

        gossipsub
            .subscribe(&consensus_topic)
            .map_err(|e| crate::error::ChainError::P2P(format!("subscribe: {}", e)))?;
        gossipsub
            .subscribe(&tx_topic)
            .map_err(|e| crate::error::ChainError::P2P(format!("subscribe: {}", e)))?;
        gossipsub
            .subscribe(&block_topic)
            .map_err(|e| crate::error::ChainError::P2P(format!("subscribe: {}", e)))?;

        // --- Kademlia DHT ---
        let kademlia: kad::Behaviour<kad::store::MemoryStore> = {
            kad::Behaviour::new(
                local_peer_id,
                kad::store::MemoryStore::new(local_peer_id),
            )
        };

        // --- mDNS ---
        let mdns = mdns::tokio::Behaviour::new(
            mdns::Config::default(),
            local_peer_id,
        )
        .map_err(|e| crate::error::ChainError::P2P(format!("mdns: {}", e)))?;

        // --- Request-Response (区块同步) ---
        let sync_protocol: &'static str = Box::leak(
            format!("/polis-chain/{}/sync/1.0.0", chain_id).into_boxed_str(),
        );
        let request_response = request_response::cbor::Behaviour::<BlockSyncRequest, BlockSyncResponse>::new(
            [(
                libp2p::StreamProtocol::new(sync_protocol),
                request_response::ProtocolSupport::Full,
            )],
            request_response::Config::default(),
        );

        // --- Identify ---
        let identify = identify::Behaviour::new(
            identify::Config::new(format!("/polis-chain/{}", chain_id), id_keys.public())
                .with_agent_version(format!("polis-chain/{}", env!("CARGO_PKG_VERSION"))),
        );

        // --- Ping ---
        let ping = ping::Behaviour::new(ping::Config::default());

        let behaviour = P2PBehaviour {
            gossipsub,
            kademlia,
            mdns,
            request_response,
            identify,
            ping,
        };

        let swarm_config = libp2p::swarm::Config::with_tokio_executor();
        let mut swarm = Swarm::new(transport, behaviour, local_peer_id, swarm_config);

        // 监听
        let listen_addr: Multiaddr = format!("/ip4/0.0.0.0/tcp/{}", listen_port)
            .parse()
            .map_err(|e| crate::error::ChainError::P2P(format!("parse addr: {}", e)))?;
        swarm
            .listen_on(listen_addr)
            .map_err(|e| crate::error::ChainError::P2P(format!("listen: {}", e)))?;

        // Bootstrap
        for addr_str in bootstrap_nodes {
            if let Ok(addr) = addr_str.parse::<Multiaddr>() {
                if let Err(e) = swarm.dial(addr.clone()) {
                    tracing::warn!("P2P: failed to dial bootstrap node {}: {}", addr, e);
                }
                tracing::info!("拨号 bootstrap: {}", addr);
            }
        }

        let (event_tx, event_rx) = mpsc::unbounded_channel();
        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel();

        // 启动事件循环
        let event_loop_handle = tokio::spawn(run_event_loop(
            swarm,
            cmd_rx,
            event_tx,
            consensus_topic,
            tx_topic,
            block_topic,
            chain_id.to_string(),
        ));

        Ok(P2PNode {
            local_peer_id,
            event_rx,
            cmd_tx,
            event_loop_handle,
            connected_peers: HashSet::new(),
        })
    }

    pub fn peer_count(&self) -> usize {
        self.connected_peers.len()
    }
}

// ============ 事件循环 ============

async fn run_event_loop(
    mut swarm: Swarm<P2PBehaviour>,
    mut cmd_rx: mpsc::UnboundedReceiver<P2PCommand>,
    event_tx: mpsc::UnboundedSender<P2PEvent>,
    consensus_topic: gossipsub::IdentTopic,
    tx_topic: gossipsub::IdentTopic,
    block_topic: gossipsub::IdentTopic,
    _chain_id: String,
) {
    let mut bootstrap_timer = tokio::time::interval(Duration::from_secs(30));
    let mut connected_peers = HashSet::new();
    let mut pending_requests: HashMap<request_response::InboundRequestId, request_response::ResponseChannel<BlockSyncResponse>> = HashMap::new();

    loop {
        tokio::select! {
            event = swarm.select_next_some() => {
                match event {
                    SwarmEvent::Behaviour(P2PBehaviourEvent::Gossipsub(ge)) => {
                        handle_gossipsub_event(ge, &event_tx);
                    }
                    SwarmEvent::Behaviour(P2PBehaviourEvent::Mdns(me)) => {
                        handle_mdns_event(me, &mut swarm);
                    }
                    SwarmEvent::Behaviour(P2PBehaviourEvent::Kademlia(
                        kad::Event::OutboundQueryProgressed { result: kad::QueryResult::Bootstrap(Ok(_)), .. },
                    )) => {
                        tracing::debug!("Kademlia bootstrap 完成");
                    }
                    SwarmEvent::Behaviour(P2PBehaviourEvent::RequestResponse(rre)) => {
                        handle_request_response_event(rre, &event_tx, &mut pending_requests);
                    }
                    SwarmEvent::Behaviour(P2PBehaviourEvent::Identify(
                        identify::Event::Received { peer_id, info, .. },
                    )) => {
                        tracing::debug!("识别到节点: {} ({})", peer_id, info.agent_version);
                        for addr in info.listen_addrs {
                            swarm.behaviour_mut().kademlia.add_address(&peer_id, addr);
                        }
                    }
                    SwarmEvent::Behaviour(_) => {}
                    SwarmEvent::NewListenAddr { address, .. } => {
                        tracing::info!("P2P 监听地址: {}", address);
                    }
                    SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                        tracing::info!("节点已连接: {}", peer_id);
                        connected_peers.insert(peer_id);
                        if let Err(e) = event_tx.send(P2PEvent::PeerConnected(peer_id)) {
                            tracing::warn!("P2P: failed to send PeerConnected event: {}", e);
                        }
                    }
                    SwarmEvent::ConnectionClosed { peer_id, .. } => {
                        tracing::info!("节点已断开: {}", peer_id);
                        connected_peers.remove(&peer_id);
                        if let Err(e) = event_tx.send(P2PEvent::PeerDisconnected(peer_id)) {
                            tracing::warn!("P2P: failed to send PeerDisconnected event: {}", e);
                        }
                    }
                    SwarmEvent::IncomingConnectionError { send_back_addr, error, .. } => {
                        tracing::warn!("入站连接错误 {}: {}", send_back_addr, error);
                    }
                    SwarmEvent::Dialing { peer_id, .. } => {
                        tracing::debug!("正在拨号: {:?}", peer_id);
                    }
                    _ => {}
                }
            }
            cmd = cmd_rx.recv() => {
                match cmd {
                    Some(P2PCommand::BroadcastConsensusMessage(msg)) => {
                        let data = bincode::serialize(&msg).unwrap_or_default();
                        if let Err(e) = swarm.behaviour_mut().gossipsub.publish(consensus_topic.clone(), data) {
                            tracing::debug!("广播共识消息跳过 (无对等节点): {}", e);
                        }
                    }
                    Some(P2PCommand::BroadcastTransaction(tx)) => {
                        let data = bincode::serialize(&tx).unwrap_or_default();
                        if let Err(e) = swarm.behaviour_mut().gossipsub.publish(tx_topic.clone(), data) {
                            tracing::debug!("广播交易跳过 (无对等节点): {}", e);
                        }
                    }
                    Some(P2PCommand::BroadcastBlockAnnouncement { block_number, block_hash }) => {
                        let ann = BlockAnnouncementWire { block_number, block_hash };
                        let data = bincode::serialize(&ann).unwrap_or_default();
                        if let Err(e) = swarm.behaviour_mut().gossipsub.publish(block_topic.clone(), data) {
                            tracing::debug!("广播区块公告跳过 (无对等节点): {}", e);
                        }
                    }
                    Some(P2PCommand::RequestBlocks { peer, start, end }) => {
                        let req = BlockSyncRequest { start, end };
                        swarm.behaviour_mut().request_response.send_request(&peer, req);
                    }
                    Some(P2PCommand::SendBlockResponse { request_id, blocks }) => {
                        if let Some(channel) = pending_requests.remove(&request_id) {
                            if let Err(e) = swarm.behaviour_mut().request_response.send_response(
                                channel,
                                BlockSyncResponse { blocks },
                            ) {
                                tracing::warn!("P2P: failed to send BlockSyncResponse: {:?}", e);
                            }
                        }
                    }
                    Some(P2PCommand::Dial(addr)) => {
                        if let Err(e) = swarm.dial(addr) {
                            tracing::warn!("P2P: failed to dial peer: {}", e);
                        }
                    }
                    Some(P2PCommand::GetPeers(tx)) => {
                        let peers: Vec<String> = connected_peers.iter().map(|p| p.to_string()).collect();
                        if tx.send(peers).is_err() {
                            tracing::warn!("P2P: GetPeers requester dropped channel before receiving response");
                        }
                    }
                    None => break,
                }
            }
            _ = bootstrap_timer.tick() => {
                if let Err(e) = swarm.behaviour_mut().kademlia.bootstrap() {
                    tracing::debug!("Kademlia bootstrap 失败: {}", e);
                }
            }
        }
    }

    tracing::info!("P2P 事件循环退出");
}

// ============ 事件处理器 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BlockAnnouncementWire {
    block_number: u64,
    block_hash: [u8; 32],
}

fn handle_gossipsub_event(
    event: gossipsub::Event,
    event_tx: &mpsc::UnboundedSender<P2PEvent>,
) {
    if let gossipsub::Event::Message { propagation_source, message, .. } = event {
        // 尝试反序列化共识消息
        if let Ok(consensus_msg) = bincode::deserialize::<ConsensusWireMessage>(&message.data) {
            if let Err(e) = event_tx.send(P2PEvent::ConsensusMessage {
                from: propagation_source,
                message: consensus_msg,
            }) {
                tracing::warn!("P2P: failed to send ConsensusMessage event: {}", e);
            }
            return;
        }
        // 尝试反序列化交易
        if let Ok(tx) = bincode::deserialize::<SignedTransaction>(&message.data) {
            if let Err(e) = event_tx.send(P2PEvent::TransactionBroadcast {
                from: propagation_source,
                transaction: tx,
            }) {
                tracing::warn!("P2P: failed to send TransactionBroadcast event: {}", e);
            }
            return;
        }
        // 尝试反序列化区块公告
        if let Ok(ann) = bincode::deserialize::<BlockAnnouncementWire>(&message.data) {
            if let Err(e) = event_tx.send(P2PEvent::BlockAnnouncement {
                from: propagation_source,
                block_number: ann.block_number,
                block_hash: ann.block_hash,
            }) {
                tracing::warn!("P2P: failed to send BlockAnnouncement event: {}", e);
            }
        }
    }
}

fn handle_mdns_event(
    event: mdns::Event,
    swarm: &mut Swarm<P2PBehaviour>,
) {
    if let mdns::Event::Discovered(list) = event {
        for (peer_id, addr) in list {
            tracing::debug!("mDNS 发现节点: {} @ {}", peer_id, addr);
            swarm.behaviour_mut().kademlia.add_address(&peer_id, addr.clone());
            if let Err(e) = swarm.dial(addr) {
                tracing::warn!("P2P: failed to dial mDNS discovered peer: {}", e);
            }
        }
    }
}

fn handle_request_response_event(
    event: request_response::Event<BlockSyncRequest, BlockSyncResponse>,
    event_tx: &mpsc::UnboundedSender<P2PEvent>,
    pending_requests: &mut HashMap<request_response::InboundRequestId, request_response::ResponseChannel<BlockSyncResponse>>,
) {
    match event {
        request_response::Event::Message { peer, message } => match message {
            request_response::Message::Request { request_id, request, channel } => {
                pending_requests.insert(request_id, channel);
                if let Err(e) = event_tx.send(P2PEvent::BlockRequest {
                    from: peer,
                    request_id,
                    start: request.start,
                    end: request.end,
                }) {
                    tracing::warn!("P2P: failed to send BlockRequest event: {}", e);
                }
            }
            request_response::Message::Response { request_id, response } => {
                if let Err(e) = event_tx.send(P2PEvent::BlockResponse {
                    from: peer,
                    request_id,
                    blocks: response.blocks,
                }) {
                    tracing::warn!("P2P: failed to send BlockResponse event: {}", e);
                }
            }
        },
        request_response::Event::OutboundFailure { peer, request_id: _, error } => {
            tracing::warn!("请求失败 ({}): {:?}", peer, error);
        }
        request_response::Event::ResponseSent { peer, request_id } => {
            tracing::debug!("响应已发送: {} req={}", peer, request_id);
        }
        _ => {}
    }
}
