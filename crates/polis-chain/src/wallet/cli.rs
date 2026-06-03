//! CLI 钱包命令实现
//!
//! 支持: create, show, import, export, balance, transfer, sign, assets

use std::path::PathBuf;

use crate::config::NodeConfig;
use crate::error::{ChainError, ChainResult};
use crate::wallet::keys::WalletKeys;

pub struct CliWallet;

impl CliWallet {
    /// 创建新钱包
    pub fn create(config: &NodeConfig, password: &str) -> ChainResult<()> {
        let wallet = WalletKeys::generate();
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        wallet.save_encrypted(&key_path, password)?;

        println!("钱包已创建!");
        println!("  地址: {}", wallet.address);
        println!("  密钥文件: {}", key_path.display());
        println!();
        println!("⚠️  请妥善保管你的密码。丢失密码将无法恢复钱包。");

        Ok(())
    }

    /// 显示钱包信息 (本地密钥信息 + 链上余额)
    pub async fn show(config: &NodeConfig, password: &str) -> ChainResult<()> {
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        if !key_path.exists() {
            println!("钱包不存在，请先创建: polis-chain wallet create --password <pwd>");
            return Ok(());
        }

        let wallet = WalletKeys::load_encrypted(&key_path, password)?;
        let public_key_hex = hex::encode(wallet.verifying_key.as_bytes());

        println!("钱包信息:");
        println!("  地址: {}", wallet.address);
        println!("  公钥: {}", public_key_hex);
        println!("  密钥文件: {}", key_path.display());

        // 查询链上余额
        let api_url = format!("http://{}:{}/api/v1/wallet/{}", config.api_host, config.api_port, wallet.address);
        if let Ok(resp) = reqwest::get(&api_url).await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(data) = json.get("data") {
                    println!();
                    println!("链上资产:");
                    if let Some(b) = data.get("balance").and_then(|v| v.as_u64()) {
                        println!("  $POL 余额: {}", b);
                    }
                    if let Some(xp) = data.get("total_xp").and_then(|v| v.as_u64()) {
                        println!("  总 XP:     {}", xp);
                    }
                    if let Some(axp) = data.get("available_xp").and_then(|v| v.as_u64()) {
                        println!("  可用 XP:   {}", axp);
                    }
                    if let Some(n) = data.get("nonce").and_then(|v| v.as_u64()) {
                        println!("  交易计数:  {}", n);
                    }
                    if let Some(coins) = data.get("premium_coins").and_then(|v| v.as_array()) {
                        if !coins.is_empty() {
                            println!("  稀有币:    {} 枚", coins.len());
                            for coin in coins {
                                println!("    • {}", coin.as_str().unwrap_or("-"));
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// 导入钱包 (从 hex 编码的私钥)
    pub fn import_from_hex(config: &NodeConfig, password: &str, key_hex: &str) -> ChainResult<()> {
        let key_bytes = hex::decode(key_hex.trim())
            .map_err(|e| crate::error::ChainError::Crypto(format!("解码私钥失败: {}", e)))?;

        if key_bytes.len() != ed25519_dalek::SECRET_KEY_LENGTH {
            return Err(crate::error::ChainError::Crypto(format!(
                "私钥长度不正确: 期望 {} 字节, 实际 {} 字节",
                ed25519_dalek::SECRET_KEY_LENGTH,
                key_bytes.len()
            )));
        }

        let mut arr = [0u8; ed25519_dalek::SECRET_KEY_LENGTH];
        arr.copy_from_slice(&key_bytes);
        let wallet = WalletKeys::from_signing_key_bytes(&arr)?;

        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        wallet.save_encrypted(&key_path, password)?;

        println!("钱包已导入!");
        println!("  地址: {}", wallet.address);

        Ok(())
    }

    /// 导出钱包私钥 (hex 编码)
    pub fn export(config: &NodeConfig, password: &str) -> ChainResult<()> {
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        if !key_path.exists() {
            println!("钱包不存在");
            return Ok(());
        }

        let wallet = WalletKeys::load_encrypted(&key_path, password)?;
        let key_hex = hex::encode(wallet.to_bytes());

        println!("⚠️  私钥敏感信息，请勿分享给任何人!");
        println!("私钥 (hex): {}", key_hex);

        Ok(())
    }

    /// 查询余额 (从本地节点 API)
    pub async fn balance(config: &NodeConfig) -> ChainResult<()> {
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        if !key_path.exists() {
            println!("钱包不存在，请先创建: polis-chain wallet create --password <pwd>");
            return Ok(());
        }

        // 查询所有账户 (扫描 RocksDB)
        let api_url = format!("http://{}:{}/api/v1/status", config.api_host, config.api_port);
        match reqwest::get(&api_url).await {
            Ok(resp) => {
                let json: serde_json::Value = resp.json().await.unwrap_or_default();
                let height = json.get("data").and_then(|d| d.get("block_height")).and_then(|v| v.as_u64()).unwrap_or(0);
                let peer_count = json.get("data").and_then(|d| d.get("peer_count")).and_then(|v| v.as_u64()).unwrap_or(0);
                println!("节点状态:");
                println!("  区块高度:   {}", height);
                println!("  对等节点:   {}", peer_count);
            }
            Err(_) => {
                println!("无法连接到节点 API ({}:{})", config.api_host, config.api_port);
                println!("请确保节点正在运行: polis-chain run");
            }
        }

        Ok(())
    }

    /// 转账 $POL 代币
    pub async fn transfer(
        config: &NodeConfig,
        password: &str,
        to: &str,
        amount: u64,
        memo: Option<&str>,
    ) -> ChainResult<()> {
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        if !key_path.exists() {
            println!("钱包不存在，请先创建: polis-chain wallet create --password <pwd>");
            return Ok(());
        }

        let wallet = WalletKeys::load_encrypted(&key_path, password)?;

        // 先查询当前 nonce
        let api_url = format!("http://{}:{}", config.api_host, config.api_port);
        let wallet_url = format!("{}/api/v1/wallet/{}", api_url, wallet.address);
        let current_nonce = match reqwest::get(&wallet_url).await {
            Ok(resp) => {
                let json: serde_json::Value = resp.json().await.unwrap_or_default();
                json.get("data")
                    .and_then(|d| d.get("nonce"))
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0)
            }
            Err(_) => 0,
        };

        let tx = crate::transaction::Transaction::TokenTransfer {
            from: wallet.address.clone(),
            to: to.to_string(),
            amount,
            memo: memo.map(|s| s.to_string()),
            nonce: current_nonce,
        };

        let hash = crate::transaction::SignedTransaction::compute_hash(&tx);
        let signature = wallet.sign(&hash);
        let signed = crate::transaction::SignedTransaction::new(tx, wallet.address.clone(), signature);

        // 提交到节点
        let client = reqwest::Client::new();
        let tx_json = serde_json::to_value(&signed).map_err(|e| ChainError::Serialization(e.to_string()))?;

        let resp = client
            .post(format!("{}/api/v1/transactions", api_url))
            .json(&tx_json)
            .send()
            .await
            .map_err(|e| ChainError::Network(format!("提交交易失败: {}", e)))?;

        let result: serde_json::Value = resp.json().await.unwrap_or_default();
        let code = result.get("code").and_then(|v| v.as_i64()).unwrap_or(-1);

        if code == 0 {
            println!("转账成功!");
            println!("  交易哈希: {}", hex::encode(hash));
            println!("  发送方:   {}", wallet.address);
            println!("  接收方:   {}", to);
            println!("  金额:     {} $POL", amount);
            println!("  nonce:   {}", current_nonce);
        } else {
            let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or("未知错误");
            println!("转账失败: {}", msg);
        }

        Ok(())
    }

    /// 签名消息
    pub fn sign(config: &NodeConfig, password: &str, message: &str) -> ChainResult<()> {
        let key_path = PathBuf::from(config.keys_dir()).join("wallet.key");
        if !key_path.exists() {
            println!("钱包不存在");
            return Ok(());
        }

        let wallet = WalletKeys::load_encrypted(&key_path, password)?;
        let signature = wallet.sign(message.as_bytes());

        println!("消息签名:");
        println!("  消息: {}", message);
        println!("  签名地址: {}", wallet.address);
        println!("  签名 (hex): {}", hex::encode(&signature));

        Ok(())
    }
}
