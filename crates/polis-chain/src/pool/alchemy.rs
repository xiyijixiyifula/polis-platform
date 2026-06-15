use sha2::Digest;

use crate::error::{ChainError, ChainResult};
use crate::pool::premium_coin::{PremiumCoin, PremiumType};
use crate::state::{DepositorEntry, PoolAlchemyRecord, PoolState};
use crate::storage::rocks::Storage;
use crate::transaction::{AlchemyWinner, MintedPremiumCoin};

/// 默认池子目标: 100,000 $POL
pub const DEFAULT_POOL_TARGET: u64 = 100_000;
/// 金奖数量: 1
pub const GOLD_COUNT: u32 = 1;
/// 银奖数量: 2
pub const SILVER_COUNT: u32 = 2;
/// 铜奖数量: 3
pub const BRONZE_COUNT: u32 = 3;

/// 获取或创建当前池子状态
pub fn get_or_create_pool(storage: &Storage) -> ChainResult<PoolState> {
    let maybe_pool: Option<PoolState> = storage
        .get_deserialized(crate::storage::rocks::CF_POOL_STATE, b"current_pool")?;

    match maybe_pool {
        Some(pool) => Ok(pool),
        None => {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock is set before UNIX epoch")
                .as_secs();
            let pool = PoolState {
                pool_id: format!("pool-{}", now),
                current_amount: 0,
                target_amount: DEFAULT_POOL_TARGET,
                deposited_count: 0,
                top_depositors: Vec::new(),
                created_at: now,
            };
            storage.put_serialized(crate::storage::rocks::CF_POOL_STATE, b"current_pool", &pool)?;
            Ok(pool)
        }
    }
}

/// 保存池子状态
fn save_pool(storage: &Storage, pool: &PoolState) -> ChainResult<()> {
    storage.put_serialized(crate::storage::rocks::CF_POOL_STATE, b"current_pool", pool)
}

/// 投入 $POL 到池子
pub fn deposit(storage: &Storage, from_address: &str, amount: u64) -> ChainResult<()> {
    let mut pool = get_or_create_pool(storage)?;

    // 扣减用户余额
    let maybe_account = storage.get_account_state(from_address)?;
    let mut account =
        maybe_account.ok_or_else(|| ChainError::Validation("账户不存在".into()))?;

    if account.balance < amount {
        return Err(ChainError::InsufficientBalance {
            required: amount,
            available: account.balance,
        });
    }

    account.balance -= amount;
    storage.put_account_state(from_address, &account)?;

    // 更新池子
    pool.current_amount += amount;
    pool.deposited_count += 1;

    // 更新投入者排行
    if let Some(pos) = pool.top_depositors.iter().position(|d| d.address == from_address) {
        pool.top_depositors[pos].total_deposited += amount;
    } else {
        pool.top_depositors.push(DepositorEntry {
            address: from_address.to_string(),
            total_deposited: amount,
        });
    }
    pool.top_depositors.sort_by_key(|d| std::cmp::Reverse(d.total_deposited));

    save_pool(storage, &pool)?;

    tracing::info!(
        "池子投入: {} POL from {} → 进度 {}/{}",
        amount,
        &from_address[..12.min(from_address.len())],
        pool.current_amount,
        pool.target_amount
    );

    Ok(())
}

/// 检查是否应触发炼金
pub fn should_trigger_alchemy(pool: &PoolState) -> bool {
    pool.current_amount >= pool.target_amount
}

/// 触发炼金: 烧币 + 铸稀有币 + 分配赢家
pub fn trigger_alchemy(
    storage: &Storage,
    pool: &PoolState,
    prev_block_hash: &[u8; 32],
) -> ChainResult<PoolAlchemyRecord> {
    if !should_trigger_alchemy(pool) {
        return Err(ChainError::Validation("池子未满".into()));
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock is set before UNIX epoch")
        .as_secs();

    let burned = pool.current_amount;

    // 烧币交易哈希
    let burn_tx_hash: [u8; 32] = crate::crypto::sha256(
        format!("burn:{}:{}", pool.pool_id, now).as_bytes(),
    );

    // 获取当前全局稀有币序号
    let last_coins_key = b"premium_coin_counter";
    let base_counter: u64 = storage
        .get_meta(last_coins_key)
        .ok()
        .flatten()
        .and_then(|v| {
            let mut bytes = [0u8; 8];
            if v.len() == 8 {
                bytes.copy_from_slice(&v);
                Some(u64::from_be_bytes(bytes))
            } else {
                None
            }
        })
        .unwrap_or(0);

    // 按投入比例加权抽奖
    let winners = select_alchemy_winners(&pool.top_depositors, prev_block_hash);

    // 铸造稀有币
    let mut minted = Vec::new();
    let mut counter = base_counter;
    let latest_block = storage.latest_block_number().unwrap_or(0);

    for winner in &winners {
        counter += 1;
        let coin_type = match winner.coin_type.as_str() {
            "Silver" => PremiumType::Silver,
            "Bronze" => PremiumType::Bronze,
            _ => PremiumType::Gold,
        };
        let coin_id = PremiumCoin::generate_coin_id(&coin_type, counter);

        let coin = PremiumCoin {
            coin_id: coin_id.clone(),
            coin_type,
            serial_number: counter,
            pool_id: pool.pool_id.clone(),
            winner_address: winner.address.clone(),
            minted_at_block: latest_block,
            minted_at_timestamp: now,
            tx_hash: burn_tx_hash,
            previous_owner: None,
        };

        // 存储稀有币
        storage.put_serialized(
            crate::storage::rocks::CF_META,
            format!("premium_coin_{}", coin_id).as_bytes(),
            &coin,
        )?;

        // 更新用户账户的稀有币列表
        if let Ok(Some(mut account)) = storage.get_account_state(&winner.address) {
            account.premium_coins.push(coin_id.clone());
            if let Err(e) = storage.put_account_state(&winner.address, &account) {
                tracing::warn!("Alchemy: failed to save premium coin for {}: {}", winner.address, e);
            }
        }

        minted.push(MintedPremiumCoin {
            coin_id,
            coin_type: winner.coin_type.clone(),
            serial_number: counter,
            owner_address: winner.address.clone(),
        });
    }

    // 更新计数器
    storage.put_meta(last_coins_key, &counter.to_be_bytes())?;

    // 重置池子
    let new_pool_id = format!("pool-{}", now);
    let new_pool = PoolState {
        pool_id: new_pool_id,
        current_amount: 0,
        target_amount: DEFAULT_POOL_TARGET,
        deposited_count: 0,
        top_depositors: Vec::new(),
        created_at: now,
    };
    save_pool(storage, &new_pool)?;

    // 记录炼金历史
    let record = PoolAlchemyRecord {
        pool_id: pool.pool_id.clone(),
        total_burned: burned,
        burn_tx_hash,
        winners: winners.clone(),
        minted_coins: minted.clone(),
        completed_at: now,
        completed_at_block: latest_block,
    };

    let history_key = format!("alchemy_{}", pool.pool_id);
    storage.put_serialized(
        crate::storage::rocks::CF_POOL_HISTORY,
        history_key.as_bytes(),
        &record,
    )?;

    tracing::info!(
        "炼金完成: {} POL 烧毁 → {} 枚稀有币铸成 (池子 #{})",
        burned,
        minted.len(),
        pool.pool_id
    );

    Ok(record)
}

/// 按投入比例加权抽奖选赢家
fn select_alchemy_winners(
    depositors: &[DepositorEntry],
    seed: &[u8; 32],
) -> Vec<AlchemyWinner> {
    if depositors.is_empty() {
        return Vec::new();
    }

    let total: u64 = depositors.iter().map(|d| d.total_deposited).sum();
    let mut rng_seed = *seed;
    let mut used = std::collections::HashSet::new();

    // 奖品类型列表 (按顺序抽取)
    let prizes = vec![
        ("Gold", GOLD_COUNT),
        ("Silver", SILVER_COUNT),
        ("Bronze", BRONZE_COUNT),
    ];

    let mut winners: Vec<AlchemyWinner> = Vec::new();
    let mut serial = 0u64;

    for (coin_type, count) in &prizes {
        for _ in 0..*count {
            if winners.len() >= depositors.len() {
                break;
            }

            // 哈希链扩展种子
            let mut hasher = sha2::Sha256::new();
            hasher.update(rng_seed);
            hasher.update(serial.to_be_bytes());
            rng_seed = hasher.finalize().into();

            // 生成随机值
            let mut rand_val: u64 = 0;
            for &byte in rng_seed.iter().take(8) {
                rand_val = (rand_val << 8) | (byte as u64);
            }
            let target = rand_val % total;

            // 按投入比例选择
            let mut cumulative = 0u64;
            let mut selected_idx = 0;
            for (i, d) in depositors.iter().enumerate() {
                cumulative += d.total_deposited;
                if cumulative > target && !used.contains(&i) {
                    selected_idx = i;
                    break;
                }
            }

            // 如果所有都已使用, 选第一个未使用的
            if used.contains(&selected_idx) {
                selected_idx = depositors
                    .iter()
                    .enumerate()
                    .find(|(i, _)| !used.contains(i))
                    .map(|(i, _)| i)
                    .unwrap_or(0);
            }

            used.insert(selected_idx);
            serial += 1;

            winners.push(AlchemyWinner {
                address: depositors[selected_idx].address.clone(),
                coin_type: coin_type.to_string(),
                serial_number: 0, // 由 trigger_alchemy 分配实际序号
            });
        }
    }

    winners
}
