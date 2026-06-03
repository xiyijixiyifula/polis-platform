use std::env;

/// 区块链节点配置
#[derive(Debug, Clone)]
pub struct NodeConfig {
    /// 节点模式: "validator" | "full" | "wallet"
    pub mode: String,

    /// HTTP API 监听地址
    pub api_host: String,
    pub api_port: u16,

    /// 数据目录 (~/.polis-chain)
    pub data_dir: String,

    /// 链 ID
    pub chain_id: String,

    /// P2P 监听端口
    pub p2p_port: u16,

    /// Bootstrap 节点地址 (逗号分隔)
    pub bootstrap_nodes: Vec<String>,

    /// 是否为创世节点 (第一个启动的节点)
    pub is_genesis: bool,

    /// 验证者地址 (validator 模式需要)
    pub validator_address: Option<String>,

    /// 站点 ID (full 节点模式, 关联 Polis 站点)
    pub site_id: Option<String>,

    /// 站点签名密钥路径 (用于签名 ActivityProof)
    pub site_key_path: Option<String>,

    /// 节点身份密钥路径 (用于 P2P libp2p 身份)
    pub node_key_path: Option<String>,
}

impl NodeConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        NodeConfig {
            mode: env::var("CHAIN_MODE").unwrap_or_else(|_| "full".to_string()),
            api_host: env::var("CHAIN_API_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            api_port: env::var("CHAIN_API_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8545),
            data_dir: env::var("CHAIN_DATA_DIR")
                .unwrap_or_else(|_| shelldir().unwrap_or_else(|| ".polis-chain".into())),
            chain_id: env::var("CHAIN_ID").unwrap_or_else(|_| "polis-mainnet-1".to_string()),
            p2p_port: env::var("CHAIN_P2P_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(9732),
            bootstrap_nodes: env::var("CHAIN_BOOTSTRAP_NODES")
                .unwrap_or_default()
                .split(',')
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect(),
            is_genesis: env::var("CHAIN_IS_GENESIS")
                .map(|v| v == "1" || v == "true")
                .unwrap_or(false),
            validator_address: env::var("CHAIN_VALIDATOR_ADDRESS").ok(),
            site_id: env::var("CHAIN_SITE_ID").ok(),
            site_key_path: env::var("CHAIN_SITE_KEY_PATH").ok(),
            node_key_path: env::var("CHAIN_NODE_KEY_PATH").ok(),
        }
    }

    /// RocksDB 数据路径
    pub fn rocksdb_path(&self) -> String {
        format!("{}/data/rocksdb", self.data_dir)
    }

    /// 密钥文件路径
    pub fn keys_dir(&self) -> String {
        format!("{}/keys", self.data_dir)
    }

    /// 出块间隔 (秒), 默认 10s
    pub fn block_time_secs(&self) -> Option<u64> {
        std::env::var("CHAIN_BLOCK_TIME")
            .ok()
            .and_then(|v| v.parse().ok())
            .or(Some(10))
    }
}

/// 获取用户 home 目录下的默认数据目录
fn shelldir() -> Option<String> {
    dirs_fallback().map(|d| format!("{}/.polis-chain", d))
}

fn dirs_fallback() -> Option<String> {
    if let Ok(home) = std::env::var("HOME") {
        return Some(home);
    }
    if let Ok(home) = std::env::var("USERPROFILE") {
        return Some(home);
    }
    None
}
