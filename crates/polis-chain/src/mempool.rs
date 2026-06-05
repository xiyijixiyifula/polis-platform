use std::collections::{HashMap, VecDeque};

use crate::error::ChainResult;
use crate::transaction::SignedTransaction;

/// 交易池 (mempool) — 存放待打包的已签名交易
pub struct Mempool {
    /// 交易存储 (hash → tx)，用 VecDeque 维护插入顺序
    pending: HashMap<[u8; 32], SignedTransaction>,
    order: VecDeque<[u8; 32]>,
    /// 最大容量
    max_size: usize,
    /// 每个发送者的 nonce 追踪 (防乱序)
    sender_nonces: HashMap<String, u64>,
}

impl Mempool {
    pub fn new(max_size: usize) -> Self {
        Mempool {
            pending: HashMap::new(),
            order: VecDeque::new(),
            max_size,
            sender_nonces: HashMap::new(),
        }
    }

    /// 添加一笔交易到 mempool
    /// 返回是否成功添加 (重复或满则 false)
    pub fn add(&mut self, tx: SignedTransaction) -> ChainResult<bool> {
        let tx_hash = tx.hash;
        let tx_signer = tx.signer.clone();
        let tx_nonce = tx.tx.nonce();

        // 去重
        if self.pending.contains_key(&tx_hash) {
            return Ok(false);
        }

        // 容量检查
        if self.pending.len() >= self.max_size {
            return Ok(false);
        }

        // nonce 检查: 只接受 >= 当前已知 nonce 的交易
        let expected_nonce = self.sender_nonces.get(&tx_signer).copied().unwrap_or(0);
        if tx_nonce < expected_nonce {
            return Ok(false);
        }

        self.pending.insert(tx_hash, tx);
        self.order.push_back(tx_hash);
        self.sender_nonces.insert(tx_signer, tx_nonce);

        Ok(true)
    }

    /// 从 mempool 取出一批交易用于打包进区块
    /// max_count: 单区块最大交易数
    pub fn get_batch(&self, max_count: usize) -> Vec<SignedTransaction> {
        self.order
            .iter()
            .filter_map(|hash| self.pending.get(hash))
            .take(max_count)
            .cloned()
            .collect()
    }

    /// 移除已打包进区块的交易
    pub fn remove_batch(&mut self, tx_hashes: &[[u8; 32]]) {
        for hash in tx_hashes {
            self.pending.remove(hash);
        }
        self.order.retain(|h| self.pending.contains_key(h));
    }

    /// 移除单笔交易
    pub fn remove(&mut self, hash: &[u8; 32]) {
        self.pending.remove(hash);
        self.order.retain(|h| h != hash);
    }

    /// 当前交易数
    pub fn len(&self) -> usize {
        self.pending.len()
    }

    /// 是否为空
    pub fn is_empty(&self) -> bool {
        self.pending.is_empty()
    }

    /// 清空
    pub fn clear(&mut self) {
        self.pending.clear();
        self.order.clear();
    }

    /// 获取所有待处理交易
    pub fn all(&self) -> Vec<&SignedTransaction> {
        self.pending.values().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::transaction::Transaction;

    fn make_tx(nonce: u64, signer: &str) -> SignedTransaction {
        let tx = Transaction::TokenTransfer {
            from: signer.to_string(),
            to: "receiver".to_string(),
            amount: 100,
            memo: None,
            nonce,
        };
        let hash = SignedTransaction::compute_hash(&tx);
        SignedTransaction {
            tx,
            signer: signer.to_string(),
            signature: vec![0u8; 64],
            hash,
        }
    }

    #[test]
    fn test_add_and_retrieve() -> ChainResult<()> {
        let mut pool = Mempool::new(1000);
        let tx = make_tx(0, "alice");
        let hash = tx.hash;

        assert!(pool.add(tx)?);
        assert_eq!(pool.len(), 1);
        assert!(!pool.is_empty());

        let batch = pool.get_batch(10);
        assert_eq!(batch.len(), 1);
        assert_eq!(batch[0].hash, hash);

        Ok(())
    }

    #[test]
    fn test_dedup() -> ChainResult<()> {
        let mut pool = Mempool::new(1000);
        let tx = make_tx(0, "alice");
        assert!(pool.add(tx.clone())?);
        assert!(!pool.add(tx)?); // 重复
        assert_eq!(pool.len(), 1);
        Ok(())
    }

    #[test]
    fn test_remove_batch() -> ChainResult<()> {
        let mut pool = Mempool::new(1000);
        let tx1 = make_tx(0, "alice");
        let tx2 = make_tx(1, "alice");
        let h1 = tx1.hash;

        pool.add(tx1)?;
        pool.add(tx2)?;
        assert_eq!(pool.len(), 2);

        pool.remove_batch(&[h1]);
        assert_eq!(pool.len(), 1);

        Ok(())
    }

    #[test]
    fn test_nonce_ordering() -> ChainResult<()> {
        let mut pool = Mempool::new(1000);
        // 先提交 nonce=1 再 nonce=0 — nonce=0 应该被拒绝
        assert!(pool.add(make_tx(1, "alice"))?);
        assert!(!pool.add(make_tx(0, "alice"))?); // 过时 nonce
        Ok(())
    }

    #[test]
    fn test_max_capacity() -> ChainResult<()> {
        let mut pool = Mempool::new(2);
        assert!(pool.add(make_tx(0, "a"))?);
        assert!(pool.add(make_tx(0, "b"))?);
        assert!(!pool.add(make_tx(0, "c"))?); // 满了
        assert_eq!(pool.len(), 2);
        Ok(())
    }
}
