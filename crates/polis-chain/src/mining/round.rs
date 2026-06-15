use crate::error::{ChainError, ChainResult};
use crate::state::{MiningRound, RoundStatus};
use crate::storage::rocks::Storage;

/// 创建新挖矿轮次
pub fn create_round(round_id: u64, now: u64, round_duration_secs: u64, reward: u64) -> MiningRound {
    MiningRound {
        round_id,
        start_time: now,
        end_time: now + round_duration_secs,
        total_reward: reward,
        participant_count: 0,
        xp_pool: 0,
        status: RoundStatus::Active,
        winners: Vec::new(),
        random_seed: None,
    }
}

/// 获取或创建当前活动轮次
///
/// 如果上个轮次未结算且已超时，自动结算它。
pub fn get_or_create_current_round(
    storage: &Storage,
    round_duration_secs: u64,
    reward: u64,
    winner_percentage: u32,
    min_xp: u64,
    prev_block_hash: &[u8; 32],
) -> ChainResult<MiningRound> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock is set before UNIX epoch")
        .as_secs();

    let round_id = now / round_duration_secs;
    let round_key = round_id.to_be_bytes();

    let maybe_round: Option<MiningRound> = storage
        .get_deserialized(crate::storage::rocks::CF_MINING_ROUNDS, round_key)?;

    match maybe_round {
        Some(round) => Ok(round),
        None => {
            // 检查上个轮次是否需要结算
            if round_id > 0 {
                let prev_id = round_id - 1;
                let prev_key = prev_id.to_be_bytes();
                if let Ok(Some(mut prev_round)) = storage
                    .get_deserialized::<_, MiningRound>(crate::storage::rocks::CF_MINING_ROUNDS, prev_key)
                {
                    if prev_round.status == RoundStatus::Active {
                        let reward_dist: Vec<u64> = vec![
                            reward * 50 / 100,  // 50%
                            reward * 30 / 100,  // 30%
                            reward * 20 / 100,  // 20%
                        ];
                        if let Err(e) = settle_round(
                            storage,
                            &mut prev_round,
                            prev_block_hash,
                            winner_percentage,
                            min_xp,
                            &reward_dist,
                        ) {
                            tracing::warn!("Mining: failed to settle previous round {}: {}", prev_id, e);
                        }
                    }
                }
            }

            let round_start = round_id * round_duration_secs;
            let round = create_round(round_id, round_start, round_duration_secs, reward);
            storage.put_serialized(crate::storage::rocks::CF_MINING_ROUNDS, round_key, &round)?;
            Ok(round)
        }
    }
}

/// 保存轮次状态
pub fn save_round(storage: &Storage, round: &MiningRound) -> ChainResult<()> {
    storage.put_serialized(
        crate::storage::rocks::CF_MINING_ROUNDS,
        round.round_id.to_be_bytes(),
        round,
    )
}

/// 参与者条目: (地址, XP 数量)
pub type Participant = (String, u64);

/// 结算挖矿轮次 — 全员参与制
///
/// 流程:
/// 1. 收集所有 available_xp >= min_xp 的账户
/// 2. 计算参与人数 → 中奖人数 = max(1, 参与人数 × winner_percentage%)
/// 3. 按 XP 权重加权抽奖选出中奖者
/// 4. 分发 $POL 奖励
/// 5. 所有参与者 available_xp 归零
pub fn settle_round(
    storage: &Storage,
    round: &mut MiningRound,
    prev_block_hash: &[u8; 32],
    winner_percentage: u32,
    min_xp: u64,
    reward_distribution: &[u64],
) -> ChainResult<()> {
    if round.status != RoundStatus::Active {
        return Err(ChainError::Validation("轮次已结算".into()));
    }

    // 1. 收集所有符合条件的参与者
    let participants: Vec<Participant> = storage
        .get_all_accounts()?
        .into_iter()
        .filter(|(_, acc)| acc.available_xp >= min_xp)
        .map(|(addr, acc)| (addr, acc.available_xp))
        .collect();

    let total_participants = participants.len() as u32;
    if total_participants == 0 {
        round.status = RoundStatus::Completed;
        round.participant_count = 0;
        round.xp_pool = 0;
        save_round(storage, round)?;
        return Ok(());
    }

    let total_xp: u64 = participants.iter().map(|(_, xp)| *xp).sum();

    // 2. 计算中奖人数 = max(1, 参与人数 × percentage%)
    let winner_count = (total_participants as u64 * winner_percentage as u64 / 100)
        .max(1)
        .min(total_participants as u64) as u32;

    // 3. 生成随机种子 + 加权抽奖
    let empty_merkle = [0u8; 32];
    let seed = crate::mining::lottery::generate_seed(
        prev_block_hash,
        round.round_id,
        round.end_time,
        &empty_merkle,
    );

    let winner_indices =
        crate::mining::lottery::select_weighted_winners(&seed, &participants, winner_count);

    // 4. 分发 $POL 奖励给中奖者
    let mut winners = Vec::new();
    for (i, &idx) in winner_indices.iter().enumerate() {
        let amount = reward_distribution.get(i).copied().unwrap_or(0);
        let address = &participants[idx as usize].0;

        winners.push(crate::transaction::WinnerEntry {
            address: address.clone(),
            amount,
            rank: (i + 1) as u32,
        });

        if let Ok(Some(mut account)) = storage.get_account_state(address) {
            account.balance += amount;
            if let Err(e) = storage.put_account_state(address, &account) {
                tracing::warn!("Mining: failed to save account state for {}: {}", address, e);
            }
        }
    }

    // 5. 所有参与者 available_xp 归零
    for (address, _) in &participants {
        if let Ok(Some(mut account)) = storage.get_account_state(address) {
            account.available_xp = 0;
            if let Err(e) = storage.put_account_state(address, &account) {
                tracing::warn!("Mining: failed to save account state for {}: {}", address, e);
            }
        }
    }

    round.status = RoundStatus::Completed;
    round.participant_count = total_participants;
    round.xp_pool = total_xp;
    round.winners = winners;
    round.random_seed = Some(seed);
    save_round(storage, round)?;

    tracing::info!(
        "挖矿轮次结算: round={} participants={} xp_total={} winners={} seed={}",
        round.round_id,
        total_participants,
        total_xp,
        winner_count,
        hex::encode(seed)
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AccountState;

    fn setup_storage() -> ChainResult<Storage> {
        let dir = std::env::temp_dir().join(format!("polis-test-round-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir)?;
        Storage::open(&dir.to_string_lossy())
    }

    fn create_account(storage: &Storage, address: &str, balance: u64, xp: u64) -> ChainResult<()> {
        let mut state = AccountState::new(address.to_string(), 1);
        state.balance = balance;
        state.available_xp = xp;
        state.total_xp = xp;
        storage.put_account_state(address, &state)
    }

    #[test]
    fn test_settle_round_xp_cleared() -> ChainResult<()> {
        let storage = setup_storage()?;
        let prev_hash = [0xABu8; 32];

        create_account(&storage, "user_a", 0, 100)?;
        create_account(&storage, "user_b", 0, 50)?;
        create_account(&storage, "user_c", 0, 30)?;

        let mut round = create_round(0, 0, 3600, 40);
        let reward_dist = vec![20, 12, 8]; // 50%, 30%, 20%

        settle_round(
            &storage,
            &mut round,
            &prev_hash,
            10, // 10% winner_percentage — 3 participants -> max(1, 3*10/100) = 1 winner
            1,  // min_xp
            &reward_dist,
        )?;

        // 验证轮次状态
        assert_eq!(round.status, RoundStatus::Completed);
        assert_eq!(round.participant_count, 3);
        assert_eq!(round.xp_pool, 180);

        // 验证所有参与者 available_xp 已清空，total_xp 保留（累计）
        for (addr, orig_xp) in &[("user_a", 100u64), ("user_b", 50u64), ("user_c", 30u64)] {
            let acc = storage
                .get_account_state(addr)?
                .ok_or_else(|| ChainError::Validation(format!("{addr} 不存在")))?;
            assert_eq!(acc.available_xp, 0, "{} available_xp 未归零", addr);
            assert_eq!(acc.total_xp, *orig_xp, "{} total_xp 应保留累计值", addr);
        }

        // 验证有中奖者
        assert!(!round.winners.is_empty());
        // 验证中奖者获得了 $POL
        for w in &round.winners {
            let acc = storage
                .get_account_state(&w.address)?
                .ok_or_else(|| ChainError::Validation(format!("{} 不存在", w.address)))?;
            assert!(acc.balance > 0, "中奖者 {} 余额应为正", w.address);
        }
        Ok(())
    }

    #[test]
    fn test_settle_round_no_participants() -> ChainResult<()> {
        let storage = setup_storage()?;
        let prev_hash = [0u8; 32];
        let mut round = create_round(1, 3600, 7200, 40);
        let reward_dist = vec![20, 12, 8];

        settle_round(&storage, &mut round, &prev_hash, 10, 1, &reward_dist)?;

        assert_eq!(round.status, RoundStatus::Completed);
        assert_eq!(round.participant_count, 0);
        assert!(round.winners.is_empty());
        Ok(())
    }

    #[test]
    fn test_settle_round_already_completed() -> ChainResult<()> {
        let storage = setup_storage()?;
        let prev_hash = [0u8; 32];
        let mut round = create_round(2, 7200, 10800, 40);
        round.status = RoundStatus::Completed;
        let reward_dist = vec![20, 12, 8];

        let result = settle_round(&storage, &mut round, &prev_hash, 10, 1, &reward_dist);
        assert!(result.is_err());
        Ok(())
    }

    #[test]
    fn test_settle_round_min_xp_filter() -> ChainResult<()> {
        let storage = setup_storage()?;
        let prev_hash = [0xFFu8; 32];

        create_account(&storage, "low_xp", 0, 5)?;   // 低于门槛
        create_account(&storage, "high_xp", 0, 100)?; // 高于门槛

        let mut round = create_round(3, 10800, 14400, 40);
        let reward_dist = vec![40]; // 100% for single winner

        settle_round(&storage, &mut round, &prev_hash, 50, 10, &reward_dist)?;

        // 只有 high_xp 参与（XP >= 10）
        assert_eq!(round.participant_count, 1);

        // low_xp 不受影响（未参与）
        let low = storage
            .get_account_state("low_xp")?
            .ok_or_else(|| ChainError::Validation("low_xp 不存在".into()))?;
        assert_eq!(low.available_xp, 5);

        // high_xp 已归零
        let high = storage
            .get_account_state("high_xp")?
            .ok_or_else(|| ChainError::Validation("high_xp 不存在".into()))?;
        assert_eq!(high.available_xp, 0);
        Ok(())
    }

    #[test]
    fn test_weighted_lottery_higher_xp_wins() -> ChainResult<()> {
        // 验证高 XP 用户中奖概率更高（多次运行确认趋势）
        let storage = setup_storage()?;
        let reward_dist = vec![40];
        let mut whale_wins = 0u32;

        for seed_byte in 0..50u8 {
            let hash = [seed_byte; 32];
            create_account(&storage, "whale", 0, 900)?;
            create_account(&storage, "shrimp", 0, 100)?;

            let mut round = create_round(100 + seed_byte as u64, 0, 3600, 40);
            settle_round(&storage, &mut round, &hash, 10, 1, &reward_dist)?;

            if !round.winners.is_empty() && round.winners[0].address == "whale" {
                whale_wins += 1;
            }

            // 清理账户状态以便下次迭代
            let mut w = storage
                .get_account_state("whale")?
                .ok_or_else(|| ChainError::Validation("whale 不存在".into()))?;
            w.available_xp = 0;
            w.total_xp = 0;
            storage.put_account_state("whale", &w)?;
            let mut s = storage
                .get_account_state("shrimp")?
                .ok_or_else(|| ChainError::Validation("shrimp 不存在".into()))?;
            s.available_xp = 0;
            s.total_xp = 0;
            storage.put_account_state("shrimp", &s)?;
        }

        // whale (900 XP) 应该比 shrimp (100 XP) 赢更多次
        let rate = whale_wins as f64 / 50.0;
        assert!(rate > 0.5, "whale 中奖率应为 >50%: 实际 {:.0}%", rate * 100.0);
        Ok(())
    }
}
