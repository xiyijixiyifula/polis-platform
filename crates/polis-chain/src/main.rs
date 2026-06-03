use clap::{Parser, Subcommand};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use polis_chain::block::Block;
use polis_chain::config::NodeConfig;
use polis_chain::error::ChainError;
use polis_chain::network::api::{self, AppState};
use polis_chain::network::consensus_bridge::{self, ConsensusBridge};
use polis_chain::network::event_router::EventRouter;
use polis_chain::network::p2p::P2PNode;
use polis_chain::network::sync::{self, BlockSynchronizer};
use polis_chain::state::ChainConfig as OnChainConfig;
use polis_chain::storage::rocks::Storage;
use polis_chain::wallet::keys::WalletKeys;

#[derive(Parser)]
#[command(name = "polis-chain", about = "Polis Chain — 独立区块链节点")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 启动区块链节点 (validator / full / wallet 模式)
    Run,
    /// 钱包管理
    Wallet {
        #[command(subcommand)]
        action: WalletAction,
    },
}

#[derive(Subcommand)]
enum WalletAction {
    /// 创建新钱包
    Create {
        #[arg(long)]
        password: String,
    },
    /// 显示钱包信息
    Show {
        #[arg(long)]
        password: String,
    },
    /// 导入钱包 (从 hex 编码私钥)
    Import {
        #[arg(long)]
        password: String,
        #[arg(long)]
        key_hex: String,
    },
    /// 导出钱包私钥 (hex)
    Export {
        #[arg(long)]
        password: String,
    },
    /// 查询余额
    Balance,
    /// 签名消息
    Sign {
        #[arg(long)]
        password: String,
        #[arg(long)]
        message: String,
    },
    /// 转账 $POL
    Transfer {
        #[arg(long)]
        password: String,
        #[arg(long)]
        to: String,
        #[arg(long)]
        amount: u64,
        #[arg(long)]
        memo: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let cli = Cli::parse();

    match cli.command {
        Commands::Run => run_node().await?,
        Commands::Wallet { action } => handle_wallet(action)?,
    }

    Ok(())
}

/// 处理钱包命令
fn handle_wallet(action: WalletAction) -> Result<(), Box<dyn std::error::Error>> {
    let config = NodeConfig::from_env();
    use polis_chain::wallet::cli::CliWallet;

    match action {
        WalletAction::Create { password } => {
            CliWallet::create(&config, &password)?;
        }
        WalletAction::Show { password } => {
            let rt = tokio::runtime::Runtime::new()?;
            rt.block_on(CliWallet::show(&config, &password))?;
        }
        WalletAction::Import { password, key_hex } => {
            CliWallet::import_from_hex(&config, &password, &key_hex)?;
        }
        WalletAction::Export { password } => {
            CliWallet::export(&config, &password)?;
        }
        WalletAction::Balance => {
            let rt = tokio::runtime::Runtime::new()?;
            rt.block_on(CliWallet::balance(&config))?;
        }
        WalletAction::Sign { password, message } => {
            CliWallet::sign(&config, &password, &message)?;
        }
        WalletAction::Transfer { password, to, amount, memo } => {
            let rt = tokio::runtime::Runtime::new()?;
            rt.block_on(CliWallet::transfer(&config, &password, &to, amount, memo.as_deref()))?;
        }
    }
    Ok(())
}

/// 启动区块链节点
async fn run_node() -> Result<(), Box<dyn std::error::Error>> {
    let config = NodeConfig::from_env();

    tracing_subscriber::fmt()
        .with_env_filter("polis_chain=info")
        .init();

    tracing::info!("启动 Polis Chain 节点: mode={}", config.mode);
    tracing::info!("链 ID: {}", config.chain_id);
    tracing::info!("数据目录: {}", config.data_dir);
    tracing::info!("API: {}:{}", config.api_host, config.api_port);

    // 初始化存储
    let storage = Storage::open(&config.rocksdb_path())?;

    // 初始化链 (创世区块 或 同步)
    init_chain(&config, &storage)?;

    let latest = storage.latest_block_number()?;
    tracing::info!("存储初始化完成，最新区块: {}", latest);

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    // 初始化 mempool
    let mempool = Arc::new(tokio::sync::Mutex::new(
        polis_chain::mempool::Mempool::new(10_000),
    ));

    // 初始化验证者集合和共识引擎
    let validator_set = polis_chain::consensus::validator::ValidatorSet::load(&storage)
        .unwrap_or_else(|_| {
            polis_chain::consensus::validator::ValidatorSet::new(21, 1_000)
        });

    let node_address = config
        .validator_address
        .clone()
        .unwrap_or_else(|| "node".to_string());

    let consensus = Arc::new(tokio::sync::Mutex::new(
        polis_chain::consensus::engine::IbftEngine::new(
            node_address.clone(),
            validator_set,
            latest + 1,
        ),
    ));

    // --- P2P 初始化 ---
    // 加载或生成节点钱包密钥 (用于 libp2p 身份)
    let node_signing_key = load_or_generate_node_key(&config)?;
    let libp2p_keypair = polis_chain::crypto::signing_key_to_libp2p_keypair(&node_signing_key);

    // 创建 P2P 节点
    let p2p_node = P2PNode::new(
        libp2p_keypair,
        config.p2p_port,
        &config.chain_id,
        &config.bootstrap_nodes,
    )
    .await?;

    let p2p_cmd = p2p_node.cmd_tx.clone();
    let p2p_event_rx = p2p_node.event_rx;

    tracing::info!(
        "P2P 节点已启动: peer_id={} port={}",
        p2p_node.local_peer_id,
        config.p2p_port
    );

    // 构建 AppState
    let state = AppState {
        storage: storage.clone(),
        config: Arc::new(config.clone()),
        start_time: now,
        mempool: mempool.clone(),
        consensus: consensus.clone(),
        p2p_cmd: p2p_cmd.clone(),
        node_address: node_address.clone(),
    };

    // --- 共识桥接启动 ---
    let bridge = Arc::new(ConsensusBridge::new(
        consensus.clone(),
        p2p_cmd.clone(),
        Some(node_signing_key),
        storage.clone(),
        mempool.clone(),
        node_address.clone(),
    ));

    // 创建共识/同步事件分发通道
    let (consensus_tx, consensus_rx) = tokio::sync::mpsc::unbounded_channel();
    let (sync_tx, sync_rx) = tokio::sync::mpsc::unbounded_channel();

    // 启动共识事件循环
    consensus_bridge::start_consensus_loop(bridge.clone(), consensus_rx);

    // --- 区块同步启动 ---
    let synchronizer = Arc::new(BlockSynchronizer::new(
        storage.clone(),
        p2p_cmd.clone(),
    ));
    sync::start_sync_loop(synchronizer, sync_rx);

    // --- 事件路由启动 ---
    let router = EventRouter::new(
        p2p_cmd.clone(),
        mempool.clone(),
        storage.clone(),
        consensus_tx,
        sync_tx,
    );
    router.spawn(p2p_event_rx);

    // 如果是创世节点且是 validator，主动提议第一个区块
    if config.is_genesis && config.mode == "validator" {
        tracing::info!("创世验证者节点 — 准备提议第一个区块");
        let first_proposer = consensus.lock().await.is_proposer();
        if first_proposer {
            let _ = bridge.propose_new_block().await;
        }
    }

    tracing::info!("P2P 共识网络已就绪");

    // 启动 HTTP API
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.api_host, config.api_port))
        .await?;

    let app = api::create_api_router(state);

    tracing::info!("HTTP API 监听: {}:{}", config.api_host, config.api_port);
    axum::serve(listener, app).await?;

    Ok(())
}

/// 加载或生成节点身份密钥 (用于 P2P libp2p)
fn load_or_generate_node_key(
    config: &NodeConfig,
) -> Result<ed25519_dalek::SigningKey, Box<dyn std::error::Error>> {
    use ed25519_dalek::SigningKey;
    use std::path::PathBuf;

    let key_path = config
        .node_key_path
        .clone()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(config.keys_dir()).join("node.key"));

    if key_path.exists() {
        let hex_data = std::fs::read_to_string(&key_path)?;
        let key_bytes = hex::decode(hex_data.trim())
            .map_err(|e| ChainError::Crypto(format!("解码节点密钥失败: {}", e)))?;
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&key_bytes[..32.min(key_bytes.len())]);
        Ok(SigningKey::from_bytes(&arr))
    } else {
        let signing_key = WalletKeys::generate().signing_key;
        // 保存密钥
        if let Some(parent) = key_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&key_path, hex::encode(signing_key.to_bytes()))?;
        tracing::info!("生成新节点密钥: {}", key_path.display());
        Ok(signing_key)
    }
}

/// 初始化链: 如果是创世节点且链为空, 创建创世区块
fn init_chain(config: &NodeConfig, storage: &Storage) -> Result<(), ChainError> {
    let latest = storage.latest_block_number()?;

    if latest == 0 && config.is_genesis {
        create_genesis_block(config, storage)?;
        tracing::info!("创世区块已生成!");
    } else if latest == 0 {
        tracing::info!("等待从对等节点同步区块...");
    }

    Ok(())
}

/// 创建创世区块
fn create_genesis_block(config: &NodeConfig, storage: &Storage) -> Result<(), ChainError> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    // 链配置 (存到 config CF)
    let chain_config = OnChainConfig::default();
    let config_bytes = bincode::serialize(&chain_config)
        .map_err(|e| ChainError::Serialization(format!("序列化链配置失败: {}", e)))?;
    storage.put(polis_chain::storage::rocks::CF_CONFIG, b"chain_config", &config_bytes)?;

    // 创世区块
    let mut genesis = Block {
        header: polis_chain::block::BlockHeader {
            number: 0,
            timestamp: now,
            previous_hash: [0u8; 32], // 创世区块前哈希全零
            merkle_root: [0u8; 32],
            state_root: [0u8; 32],
            validator: "genesis".to_string(),
            nonce: 0,
        },
        transactions: Vec::new(),
        commits: Vec::new(),
        hash: [0u8; 32],
    };

    // 生成验证者钱包 (如果配置了 validator 模式)
    if config.mode == "validator" {
        let wallet = WalletKeys::generate();
        let key_path = std::path::PathBuf::from(config.keys_dir()).join("validator.key");
        wallet.save_encrypted(&key_path, "genesis")?; // 初始验证者密钥

        tracing::info!("创世验证者地址: {}", wallet.address);
    }

    genesis.seal();

    // 存储创世区块
    storage.put_block(&genesis)?;
    storage.put_meta(b"genesis_hash", &genesis.hash)?;
    storage.put_meta(b"chain_id", config.chain_id.as_bytes())?;

    tracing::info!("创世区块哈希: {}", hex::encode(genesis.hash));

    Ok(())
}
