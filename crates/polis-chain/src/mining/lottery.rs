use sha2::{Digest, Sha256};

/// 生成可验证随机种子 (VRF)
/// 依赖前区块哈希 + 轮次ID + 时间戳 + 票据 Merkle 根
pub fn generate_seed(
    prev_block_hash: &[u8; 32],
    round_id: u64,
    timestamp: u64,
    tickets_merkle_root: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(prev_block_hash);
    hasher.update(&round_id.to_be_bytes());
    hasher.update(&timestamp.to_be_bytes());
    hasher.update(tickets_merkle_root);
    hasher.finalize().into()
}

/// 从种子中确定性抽取赢家索引
/// 使用哈希链扩展种子进行 Fisher-Yates 式抽取
pub fn select_winners(seed: &[u8; 32], total_tickets: u64, winner_count: u32) -> Vec<u64> {
    if total_tickets == 0 {
        return Vec::new();
    }

    let mut rng_seed = *seed;
    let count = winner_count.min(total_tickets as u32);
    let mut winners = Vec::new();
    let mut used = std::collections::HashSet::new();

    while winners.len() < count as usize && used.len() < total_tickets as usize {
        let mut hasher = Sha256::new();
        hasher.update(&rng_seed);
        hasher.update(&(winners.len() as u64).to_be_bytes());
        rng_seed = hasher.finalize().into();

        let mut val: u64 = 0;
        for i in 0..8 {
            val = (val << 8) | (rng_seed[i] as u64);
        }
        let idx = val % total_tickets;

        if used.insert(idx) {
            winners.push(idx);
        }
    }
    winners
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lottery_deterministic() {
        let seed = [42u8; 32];
        let w1 = select_winners(&seed, 100, 3);
        let w2 = select_winners(&seed, 100, 3);
        assert_eq!(w1, w2); // 确定性: 相同种子 → 相同结果
    }

    #[test]
    fn test_lottery_no_duplicates() {
        let seed = [99u8; 32];
        let winners = select_winners(&seed, 100, 10);
        let unique: std::collections::HashSet<u64> = winners.iter().copied().collect();
        assert_eq!(winners.len(), unique.len()); // 无重复
    }

    #[test]
    fn test_lottery_empty() {
        let seed = [0u8; 32];
        let winners = select_winners(&seed, 0, 3);
        assert!(winners.is_empty());
    }
}
