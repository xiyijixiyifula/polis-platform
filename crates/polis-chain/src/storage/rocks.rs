/// 存储层: RocksDB 封装
use rocksdb::{ColumnFamilyDescriptor, Options, DB};
use std::sync::Arc;

use crate::error::{ChainError, ChainResult};

/// RocksDB Column Family 名称常量
pub const CF_BLOCKS: &str = "blocks";
pub const CF_TRANSACTIONS: &str = "transactions";
pub const CF_STATE: &str = "state";
pub const CF_ACTIVITY_INDEX: &str = "activity_index";
pub const CF_MINING_ROUNDS: &str = "mining_rounds";
pub const CF_POOL_STATE: &str = "pool_state";
pub const CF_POOL_HISTORY: &str = "pool_history";
pub const CF_VALIDATORS: &str = "validators";
pub const CF_SITE_REGISTRY: &str = "site_registry";
pub const CF_CONFIG: &str = "config";
pub const CF_META: &str = "meta"; // 元数据: latest_block_number, etc.

/// 所有 Column Family 名称列表
pub const ALL_CFS: &[&str] = &[
    CF_BLOCKS,
    CF_TRANSACTIONS,
    CF_STATE,
    CF_ACTIVITY_INDEX,
    CF_MINING_ROUNDS,
    CF_POOL_STATE,
    CF_POOL_HISTORY,
    CF_VALIDATORS,
    CF_SITE_REGISTRY,
    CF_CONFIG,
    CF_META,
];

/// RocksDB 存储封装
#[derive(Clone)]
pub struct Storage {
    db: Arc<DB>,
}

impl Storage {
    /// 打开或创建 RocksDB 数据库
    pub fn open(path: &str) -> ChainResult<Self> {
        std::fs::create_dir_all(path)
            .map_err(|e| ChainError::Storage(format!("创建数据目录失败: {}", e)))?;

        let mut opts = Options::default();
        opts.create_if_missing(true);
        opts.create_missing_column_families(true);
        opts.set_max_open_files(1000);
        opts.set_keep_log_file_num(10);

        let cf_descriptors: Vec<ColumnFamilyDescriptor> = ALL_CFS
            .iter()
            .map(|cf| ColumnFamilyDescriptor::new(*cf, Options::default()))
            .collect();

        let db = DB::open_cf_descriptors(&opts, path, cf_descriptors)
            .map_err(|e| ChainError::Storage(format!("打开数据库失败: {}", e)))?;

        Ok(Storage { db: Arc::new(db) })
    }

    // ========== 通用读写 ==========

    /// 写入键值对到指定 CF
    pub fn put<K: AsRef<[u8]>, V: AsRef<[u8]>>(&self, cf: &str, key: K, value: V) -> ChainResult<()> {
        let cf_handle = self
            .db
            .cf_handle(cf)
            .ok_or_else(|| ChainError::Storage(format!("CF {} 不存在", cf)))?;
        self.db
            .put_cf(&cf_handle, key, value)
            .map_err(|e| ChainError::Storage(format!("写入失败: {}", e)))
    }

    /// 从指定 CF 读取值
    pub fn get<K: AsRef<[u8]>>(&self, cf: &str, key: K) -> ChainResult<Option<Vec<u8>>> {
        let cf_handle = self
            .db
            .cf_handle(cf)
            .ok_or_else(|| ChainError::Storage(format!("CF {} 不存在", cf)))?;
        self.db
            .get_cf(&cf_handle, key)
            .map_err(|e| ChainError::Storage(format!("读取失败: {}", e)))
    }

    /// 从指定 CF 删除键
    pub fn delete<K: AsRef<[u8]>>(&self, cf: &str, key: K) -> ChainResult<()> {
        let cf_handle = self
            .db
            .cf_handle(cf)
            .ok_or_else(|| ChainError::Storage(format!("CF {} 不存在", cf)))?;
        self.db
            .delete_cf(&cf_handle, key)
            .map_err(|e| ChainError::Storage(format!("删除失败: {}", e)))
    }

    /// 检查指定 CF 中是否存在键
    pub fn exists<K: AsRef<[u8]>>(&self, cf: &str, key: K) -> ChainResult<bool> {
        self.get(cf, key).map(|v| v.is_some())
    }

    /// 迭代指定 CF 的所有键值对 (key_prefix 为可选前缀)
    pub fn scan_prefix(&self, cf: &str, prefix: &[u8]) -> ChainResult<Vec<(Vec<u8>, Vec<u8>)>> {
        let cf_handle = self
            .db
            .cf_handle(cf)
            .ok_or_else(|| ChainError::Storage(format!("CF {} 不存在", cf)))?;

        let mut results = Vec::new();
        let iter = self.db.prefix_iterator_cf(&cf_handle, prefix);
        for item in iter {
            match item {
                Ok((key, value)) => {
                    let k: Vec<u8> = key.to_vec();
                    let v: Vec<u8> = value.to_vec();
                    results.push((k, v));
                }
                Err(e) => {
                    return Err(ChainError::Storage(format!("迭代失败: {}", e)));
                }
            }
        }
        Ok(results)
    }

    // ========== 类型化读写 ==========

    /// 写入序列化后的值
    pub fn put_serialized<K: AsRef<[u8]>, V: serde::Serialize>(
        &self,
        cf: &str,
        key: K,
        value: &V,
    ) -> ChainResult<()> {
        let bytes = bincode::serialize(value)
            .map_err(|e| ChainError::Serialization(format!("序列化失败: {}", e)))?;
        self.put(cf, key, &bytes)
    }

    /// 读取并反序列化值
    pub fn get_deserialized<K: AsRef<[u8]>, V: serde::de::DeserializeOwned>(
        &self,
        cf: &str,
        key: K,
    ) -> ChainResult<Option<V>> {
        match self.get(cf, key)? {
            Some(bytes) => {
                let value = bincode::deserialize(&bytes)
                    .map_err(|e| ChainError::Serialization(format!("反序列化失败: {}", e)))?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    // ========== 区块专用 ==========

    /// 存区块
    pub fn put_block(&self, block: &crate::block::Block) -> ChainResult<()> {
        let key = block.header.number.to_be_bytes();
        self.put_serialized(CF_BLOCKS, key, block)?;
        // 更新最新区块高度
        self.put(CF_META, b"latest_block_number", key)?;
        Ok(())
    }

    /// 取区块
    pub fn get_block(&self, number: u64) -> ChainResult<Option<crate::block::Block>> {
        self.get_deserialized(CF_BLOCKS, number.to_be_bytes())
    }

    /// 获取最新区块高度
    pub fn latest_block_number(&self) -> ChainResult<u64> {
        match self.get(CF_META, b"latest_block_number")? {
            Some(bytes) if bytes.len() == 8 => {
                Ok(u64::from_be_bytes(bytes.try_into().expect("length already verified as 8")))
            }
            _ => Ok(0),
        }
    }

    // ========== 交易专用 ==========

    /// 存交易
    pub fn put_transaction(&self, tx: &crate::transaction::SignedTransaction) -> ChainResult<()> {
        self.put_serialized(CF_TRANSACTIONS, tx.hash, tx)
    }

    /// 取交易
    pub fn get_transaction(
        &self,
        tx_hash: &[u8; 32],
    ) -> ChainResult<Option<crate::transaction::SignedTransaction>> {
        self.get_deserialized(CF_TRANSACTIONS, tx_hash)
    }

    // ========== 状态专用 ==========

    /// 写入账户状态
    pub fn put_account_state(&self, address: &str, state: &crate::state::AccountState) -> ChainResult<()> {
        self.put_serialized(CF_STATE, address.as_bytes(), state)
    }

    /// 读取账户状态
    pub fn get_account_state(&self, address: &str) -> ChainResult<Option<crate::state::AccountState>> {
        self.get_deserialized(CF_STATE, address.as_bytes())
    }

    /// 获取所有账户 (地址 → AccountState)
    pub fn get_all_accounts(&self) -> ChainResult<Vec<(String, crate::state::AccountState)>> {
        let entries = self.scan_prefix(CF_STATE, &[])?;
        let mut accounts = Vec::new();
        for (key, value) in entries {
            let address = String::from_utf8(key).unwrap_or_default();
            if let Ok(account) = bincode::deserialize::<crate::state::AccountState>(&value) {
                accounts.push((address, account));
            }
        }
        Ok(accounts)
    }

    // ========== 元数据 ==========

    /// 写入元数据
    pub fn put_meta(&self, key: &[u8], value: &[u8]) -> ChainResult<()> {
        self.put(CF_META, key, value)
    }

    /// 读取元数据
    pub fn get_meta(&self, key: &[u8]) -> ChainResult<Option<Vec<u8>>> {
        self.get(CF_META, key)
    }
}
