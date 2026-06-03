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
        ticket_count: 0,
        xp_pool: 0,
        status: RoundStatus::Active,
        winners: Vec::new(),
        random_seed: None,
    }
}

/// 获取或创建当前活动轮次
pub fn get_or_create_current_round(storage: &Storage, round_duration_secs: u64, reward: u64) -> ChainResult<MiningRound> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let round_id = now / round_duration_secs;
    let round_key = round_id.to_be_bytes();

    let maybe_round: Option<MiningRound> = storage
        .get_deserialized(crate::storage::rocks::CF_MINING_ROUNDS, round_key)?;

    match maybe_round {
        Some(round) => Ok(round),
        None => {
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

/// 用户购买挖矿票
pub fn buy_tickets(
    storage: &Storage,
    user_address: &str,
    round: &mut MiningRound,
    ticket_count: u32,
    xp_cost_per_ticket: u64,
) -> ChainResult<()> {
    if round.status != RoundStatus::Active {
        return Err(ChainError::Validation("本轮次已结束".into()));
    }

    let total_xp_cost = ticket_count as u64 * xp_cost_per_ticket;

    // 检查并扣减用户可用 XP
    let maybe_account = storage.get_account_state(user_address)?;
    let mut account = maybe_account.ok_or_else(|| ChainError::Validation("账户不存在".into()))?;

    if account.available_xp < total_xp_cost {
        return Err(ChainError::InsufficientXp {
            required: total_xp_cost,
            available: account.available_xp,
        });
    }

    account.available_xp -= total_xp_cost;
    storage.put_account_state(user_address, &account)?;

    // 更新轮次统计
    round.ticket_count += ticket_count;
    round.xp_pool += total_xp_cost;
    save_round(storage, round)?;

    Ok(())
}

/// 结算挖矿轮次: 选赢家 + 分发奖励
pub fn settle_round(
    storage: &Storage,
    round: &mut MiningRound,
    prev_block_hash: &[u8; 32],
    winner_count: u32,
    reward_distribution: &[u64], // [50%, 30%, 20%] → [20, 12, 8]
) -> ChainResult<()> {
    if round.status != RoundStatus::Active {
        return Err(ChainError::Validation("轮次已结算".into()));
    }

    // 生成随机种子
    let empty_merkle = [0u8; 32];
    let seed = crate::mining::lottery::generate_seed(
        prev_block_hash,
        round.round_id,
        round.end_time,
        &empty_merkle,
    );

    // 选择赢家索引
    let total_tickets = round.ticket_count as u64;
    let winner_indices = crate::mining::lottery::select_winners(&seed, total_tickets.max(1), winner_count);

    // 构建赢家列表 (简化: 直接用索引作为中奖票号)
    let mut winners = Vec::new();
    for (i, &_idx) in winner_indices.iter().enumerate() {
        let amount = reward_distribution.get(i).copied().unwrap_or(0);
        winners.push(crate::transaction::WinnerEntry {
            address: format!("winner_{}", _idx), // Phase 6: 从票务记录中查找实际地址
            amount,
            rank: (i + 1) as u32,
        });
    }

    // 发放奖励到账户
    for winner in &winners {
        if let Ok(Some(mut account)) = storage.get_account_state(&winner.address) {
            account.balance += winner.amount;
            let _ = storage.put_account_state(&winner.address, &account);
        }
    }

    round.status = RoundStatus::Completed;
    round.winners = winners;
    round.random_seed = Some(seed);
    save_round(storage, round)?;

    Ok(())
}
