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

/// 按 XP 权重加权抽取赢家索引
///
/// 与 select_winners (基于 ticket index) 不同，此函数直接按参与者权重抽选。
/// 使用累积分布 + 哈希链种子扩展，保证确定性和可验证性。
pub fn select_weighted_winners(
    seed: &[u8; 32],
    participants: &[(String, u64)], // (address, xp_amount)
    winner_count: u32,
) -> Vec<u64> {
    if participants.is_empty() || winner_count == 0 {
        return Vec::new();
    }

    let total_xp: u64 = participants.iter().map(|(_, xp)| *xp).sum();
    if total_xp == 0 {
        return Vec::new();
    }

    let count = winner_count.min(participants.len() as u32);
    let mut rng_seed = *seed;
    let mut winners = Vec::new();
    let mut used = std::collections::HashSet::new();

    while winners.len() < count as usize && used.len() < participants.len() {
        // 哈希链扩展种子
        let mut hasher = Sha256::new();
        hasher.update(&rng_seed);
        hasher.update(&(winners.len() as u64).to_be_bytes());
        rng_seed = hasher.finalize().into();

        // 随机值 → 累积分布选取
        let mut rand_val: u64 = 0;
        for i in 0..8 {
            rand_val = (rand_val << 8) | (rng_seed[i] as u64);
        }
        let target = rand_val % total_xp;

        let mut cumulative = 0u64;
        let mut selected_idx = 0usize;
        for (i, (_, xp)) in participants.iter().enumerate() {
            cumulative += *xp;
            if cumulative > target && !used.contains(&i) {
                selected_idx = i;
                break;
            }
        }

        // fallback: 如果所有可选都被 used, 选第一个未使用的
        if used.contains(&selected_idx) {
            selected_idx = participants
                .iter()
                .enumerate()
                .find(|(i, _)| !used.contains(i))
                .map(|(i, _)| i)
                .unwrap_or(0);
        }

        used.insert(selected_idx);
        winners.push(selected_idx as u64);
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
