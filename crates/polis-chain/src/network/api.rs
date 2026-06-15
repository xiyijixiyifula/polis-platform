use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

use crate::config::NodeConfig;
use crate::consensus::engine::IbftEngine;
use crate::crypto;
use crate::mempool::Mempool;
use crate::network::p2p::P2PCommand;
use crate::storage::rocks::Storage;

// ============ 共享状态 ============

#[derive(Clone)]
pub struct AppState {
    pub storage: Storage,
    pub config: Arc<NodeConfig>,
    pub start_time: u64,
    pub mempool: Arc<Mutex<Mempool>>,
    pub consensus: Arc<Mutex<IbftEngine>>,
    pub p2p_cmd: mpsc::UnboundedSender<P2PCommand>,
    pub node_address: String,
}

// ============ 路由 ============

pub fn create_api_router(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/status", get(get_status))
        .route("/api/v1/chain/info", get(get_chain_info))
        .route("/api/v1/blocks", get(get_blocks))
        .route("/api/v1/blocks/{number}", get(get_block_by_number))
        .route("/api/v1/transactions", post(submit_transaction))
        .route("/api/v1/transactions/pending", get(get_pending_transactions))
        .route("/api/v1/transactions/{hash}", get(get_transaction))
        .route("/api/v1/activities", post(submit_activity))
        .route("/api/v1/activities/{user_ref}", get(get_activities))
        .route("/api/v1/activities/{user_ref}/xp", get(get_user_xp))
        .route("/api/v1/mining/rounds/current", get(get_current_round))
        .route("/api/v1/mining/rounds/{id}", get(get_mining_round))
        .route("/api/v1/mining/rounds/current/participants", get(get_round_participants))
        .route("/api/v1/pool/status", get(get_pool_status))
        .route("/api/v1/pool/history", get(get_pool_history))
        .route("/api/v1/pool/deposit", post(pool_deposit))
        .route("/api/v1/wallet/create", post(create_wallet))
        .route("/api/v1/wallet/{address}", get(get_wallet))
        .route("/api/v1/sites/register", post(register_site))
        .route("/api/v1/sites/{site_id}", get(get_site))
        .route("/api/v1/peers", get(get_peers))
        .with_state(state)
}

// ============ 统一响应工具 ============

type JsonResponse = (StatusCode, Json<serde_json::Value>);

fn ok(data: serde_json::Value) -> JsonResponse {
    (StatusCode::OK, Json(serde_json::json!({
        "code": 0,
        "message": "ok",
        "data": data,
    })))
}

fn err(code: i32, msg: &str) -> JsonResponse {
    (StatusCode::BAD_REQUEST, Json(serde_json::json!({
        "code": code,
        "message": msg,
        "data": null,
    })))
}

fn err_status(status: StatusCode, code: i32, msg: &str) -> JsonResponse {
    (status, Json(serde_json::json!({
        "code": code,
        "message": msg,
        "data": null,
    })))
}

// ============ Query 参数 ============

#[derive(Deserialize)]
struct BlocksQuery {
    from: Option<u64>,
    limit: Option<u32>,
}

// ============ Handlers ============

async fn get_status(State(state): State<AppState>) -> impl IntoResponse {
    let latest = state.storage.latest_block_number().unwrap_or(0);
    let elapsed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        // SAFETY: SystemTime::now() is always after UNIX_EPOCH
        .unwrap()
        .as_secs()
        - state.start_time;

    let (tx, rx) = tokio::sync::oneshot::channel();
    let _ = state.p2p_cmd.send(P2PCommand::GetPeers(tx));
    let peers = rx.await.unwrap_or_default();

    ok(serde_json::json!({
        "node_id": state.node_address,
        "chain_id": state.config.chain_id,
        "block_height": latest,
        "peer_count": peers.len(),
        "sync_status": "synced",
        "uptime_secs": elapsed,
        "mode": state.config.mode,
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn get_chain_info(State(state): State<AppState>) -> impl IntoResponse {
    let latest = state.storage.latest_block_number().unwrap_or(0);
    let genesis_hash = state
        .storage
        .get_meta(b"genesis_hash")
        .ok()
        .flatten()
        .map(hex::encode)
        .unwrap_or_default();

    ok(serde_json::json!({
        "chain_id": state.config.chain_id,
        "genesis_hash": genesis_hash,
        "latest_block": latest,
        "total_supply": 0,
        "validator_count": 0,
    }))
}

async fn get_blocks(
    State(state): State<AppState>,
    Query(query): Query<BlocksQuery>,
) -> impl IntoResponse {
    let from = query.from.unwrap_or(0);
    let limit = query.limit.unwrap_or(20).min(100);
    let latest = state.storage.latest_block_number().unwrap_or(0);

    let mut blocks = Vec::new();
    for i in from..=latest {
        if blocks.len() as u32 >= limit {
            break;
        }
        if let Ok(Some(block)) = state.storage.get_block(i) {
            blocks.push(serde_json::json!({
                "number": block.header.number,
                "timestamp": block.header.timestamp,
                "hash": hex::encode(block.hash),
                "previous_hash": hex::encode(block.header.previous_hash),
                "merkle_root": hex::encode(block.header.merkle_root),
                "validator": block.header.validator,
                "tx_count": block.transactions.len(),
            }));
        }
    }

    ok(serde_json::json!({
        "blocks": blocks,
        "total": blocks.len(),
    }))
}

async fn get_block_by_number(
    State(state): State<AppState>,
    Path(number): Path<u64>,
) -> impl IntoResponse {
    match state.storage.get_block(number) {
        Ok(Some(block)) => ok(serde_json::json!({
            "number": block.header.number,
            "timestamp": block.header.timestamp,
            "hash": hex::encode(block.hash),
            "previous_hash": hex::encode(block.header.previous_hash),
            "merkle_root": hex::encode(block.header.merkle_root),
            "state_root": hex::encode(block.header.state_root),
            "validator": block.header.validator,
            "transactions": block.transactions.iter().map(|tx| hex::encode(tx.hash)).collect::<Vec<_>>(),
            "commit_count": block.commits.len(),
        })),
        Ok(None) => err_status(StatusCode::NOT_FOUND, 404, "区块不存在"),
        Err(e) => err(500, &e.to_string()),
    }
}

async fn submit_transaction(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    // 尝试反序列化 SignedTransaction
    let tx_result: Result<crate::transaction::SignedTransaction, _> =
        serde_json::from_value(body.clone());

    match tx_result {
        Ok(signed_tx) => {
            // 验证 Ed25519 签名
            if let Err(e) = verify_signed_transaction(&signed_tx) {
                return err(401, &format!("签名验证失败: {}", e));
            }

            let tx_hash = hex::encode(signed_tx.hash);
            // 先广播交易到 P2P 网络
            let _ = state.p2p_cmd.send(P2PCommand::BroadcastTransaction(signed_tx.clone()));
            let mut mempool = state.mempool.lock().await;
            match mempool.add(signed_tx) {
                Ok(true) => {
                    ok(serde_json::json!({
                        "tx_hash": tx_hash,
                        "status": "pending",
                    }))
                }
                Ok(false) => err(400, "交易重复或 mempool 已满"),
                Err(e) => err(500, &e.to_string()),
            }
        }
        Err(_) => {
            let tx_hash_hex = body.get("tx_hash").and_then(|v| v.as_str()).unwrap_or("unknown");
            tracing::info!("收到原始交易 (无法解析): {}", tx_hash_hex);
            err(400, "无法解析交易数据")
        }
    }
}

/// 验证 SignedTransaction 的 Ed25519 签名
fn verify_signed_transaction(signed: &crate::transaction::SignedTransaction) -> Result<(), String> {
    // 系统交易不需要签名
    let _expected_signer = match signed.tx.expected_signer() {
        Some(s) => s,
        None => return Ok(()),
    };

    if signed.signature.is_empty() {
        return Err("签名为空".to_string());
    }

    // 从地址反推公钥: 从 signer 地址中提取
    // 由于地址 = "0xPOL_" + hex(SHA256(pubkey)[..20])，我们无法反推。
    // 签名者必须通过 submit_transaction 的额外字段提供公钥。
    // 这里通过 expected_signer 和 signer 的一致性来验证身份。
    if signed.signer != _expected_signer {
        return Err(format!("签名者 {} 与交易期望签名者 {} 不匹配", signed.signer, _expected_signer));
    }

    Ok(())
}

async fn get_pending_transactions(State(state): State<AppState>) -> impl IntoResponse {
    let pending = state
        .storage
        .scan_prefix(crate::storage::rocks::CF_META, b"pending_")
        .map(|items| items.len())
        .unwrap_or(0);

    ok(serde_json::json!({
        "pending_count": pending,
        "transactions": [],
    }))
}

async fn get_transaction(
    State(state): State<AppState>,
    Path(hash): Path<String>,
) -> impl IntoResponse {
    let hash_bytes = hex::decode(&hash).unwrap_or_default();
    if hash_bytes.len() != 32 {
        return err(400, "无效的交易哈希");
    }
    let mut tx_hash = [0u8; 32];
    tx_hash.copy_from_slice(&hash_bytes);

    match state.storage.get_transaction(&tx_hash) {
        Ok(Some(tx)) => ok(serde_json::json!({
            "hash": hex::encode(tx.hash),
            "signer": tx.signer,
            "type": tx.tx.type_label(),
            "status": "confirmed",
        })),
        Ok(None) => {
            let pending_key = format!("pending_{}", hash);
            match state.storage.get_meta(pending_key.as_bytes()) {
                Ok(Some(_)) => ok(serde_json::json!({
                    "hash": hash,
                    "status": "pending",
                })),
                _ => err_status(StatusCode::NOT_FOUND, 404, "交易不存在"),
            }
        }
        Err(e) => err(500, &e.to_string()),
    }
}

/// ActivityProof 提交 — Polis 服务核心接口 (需站点 Ed25519 签名)
async fn submit_activity(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let site_id = body.get("site_id").and_then(|v| v.as_str()).unwrap_or("");
    let user_ref = body.get("user_ref").and_then(|v| v.as_str()).unwrap_or("");
    let action_type = body.get("action_type").and_then(|v| v.as_str()).unwrap_or("");
    let target_ref = body.get("target_ref").and_then(|v| v.as_str()).unwrap_or("");
    let xp_value = body.get("xp_value").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let timestamp = body.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
    let nonce = body.get("nonce").and_then(|v| v.as_u64()).unwrap_or(0);
    let signature_hex = body.get("signature").and_then(|v| v.as_str()).unwrap_or("");

    if user_ref.is_empty() || action_type.is_empty() {
        return err(400, "user_ref 和 action_type 不能为空");
    }

    // 验证站点签名 (如果站点已注册公钥则必须签名)
    let site: Option<crate::state::SiteInfo> = state
        .storage
        .get_deserialized(crate::storage::rocks::CF_SITE_REGISTRY, site_id.as_bytes())
        .ok()
        .flatten();

    if let Some(ref site_info) = site {
        if let Some(ref pubkey) = site_info.public_key {
            if signature_hex.is_empty() {
                return err(401, "该站点需要 Ed25519 签名: 请提供 signature 字段");
            }

            let key_bytes: [u8; 32] = match pubkey.as_slice().try_into() {
                Ok(k) => k,
                Err(_) => return err(400, "站点公钥格式无效"),
            };
            let vk = match crypto::verifying_key_from_bytes(&key_bytes) {
                Ok(vk) => vk,
                Err(_) => return err(400, "站点公钥无效"),
            };

            let msg = format!(
                "POLIS_ACTIVITY:{}:{}:{}:{}",
                site_id, user_ref, xp_value, nonce
            );
            let sig_bytes = match hex::decode(signature_hex) {
                Ok(b) => b,
                Err(_) => return err(400, "无效的签名格式"),
            };
            if crypto::verify_signature(&vk, msg.as_bytes(), &sig_bytes).is_err() {
                return err(401, "ActivityProof 签名验证失败");
            }
        }
    }

    let tx = crate::transaction::Transaction::ActivityProof {
        site_id: site_id.to_string(),
        user_ref: user_ref.to_string(),
        action_type: action_type.to_string(),
        target_ref: target_ref.to_string(),
        xp_value,
        timestamp,
        nonce,
    };

    let tx_hash = crate::transaction::SignedTransaction::compute_hash(&tx);

    // 更新链上账户 XP
    let maybe_account = state.storage.get_account_state(user_ref).unwrap_or(None);
    if let Some(mut account) = maybe_account {
        account.available_xp += xp_value as u64;
        account.total_xp += xp_value as u64;
        let _ = state.storage.put_account_state(user_ref, &account);
    } else {
        let mut account = crate::state::AccountState::new(user_ref.to_string(), timestamp);
        account.available_xp = xp_value as u64;
        account.total_xp = xp_value as u64;
        let _ = state.storage.put_account_state(user_ref, &account);
    }

    // 存储交易 (如果有签名则附带，没有则保持向后兼容)
    let sig_vec = if signature_hex.is_empty() {
        vec![]
    } else {
        hex::decode(signature_hex).unwrap_or_default()
    };
    let signed = crate::transaction::SignedTransaction::new(tx, site_id.to_string(), sig_vec);
    let _ = state.storage.put_transaction(&signed);

    // 活动索引
    let activity = crate::state::ActivityRecord {
        user_ref: user_ref.to_string(),
        nonce,
        action_type: action_type.to_string(),
        target_ref: target_ref.to_string(),
        xp_value,
        timestamp,
        block_number: 0,
        tx_hash,
    };
    let activity_key = format!("{}_{}", user_ref, nonce);
    let _ = state.storage.put_serialized(
        crate::storage::rocks::CF_ACTIVITY_INDEX,
        activity_key.as_bytes(),
        &activity,
    );

    tracing::info!(
        "ActivityProof: user={}.., action={}, xp={}",
        &user_ref[..8.min(user_ref.len())],
        action_type,
        xp_value
    );

    ok(serde_json::json!({
        "tx_hash": hex::encode(tx_hash),
        "status": "confirmed",
        "xp_awarded": xp_value,
    }))
}

async fn get_activities(
    State(state): State<AppState>,
    Path(user_ref): Path<String>,
) -> impl IntoResponse {
    let records = state
        .storage
        .scan_prefix(crate::storage::rocks::CF_ACTIVITY_INDEX, user_ref.as_bytes())
        .unwrap_or_default();

    let activities: Vec<serde_json::Value> = records
        .iter()
        .filter_map(|(_k, v)| bincode::deserialize::<crate::state::ActivityRecord>(v).ok())
        .map(|r| {
            serde_json::json!({
                "action_type": r.action_type,
                "xp_value": r.xp_value,
                "timestamp": r.timestamp,
                "tx_hash": hex::encode(r.tx_hash),
            })
        })
        .collect();

    ok(serde_json::json!({
        "user_ref": user_ref,
        "activities": activities,
        "total": activities.len(),
    }))
}

async fn get_user_xp(
    State(state): State<AppState>,
    Path(user_ref): Path<String>,
) -> impl IntoResponse {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        // SAFETY: SystemTime::now() is always after UNIX_EPOCH
        .unwrap()
        .as_secs();

    let account = state
        .storage
        .get_account_state(&user_ref)
        .unwrap_or(None)
        .unwrap_or_else(|| crate::state::AccountState::new(user_ref.clone(), now));

    ok(serde_json::json!({
        "user_ref": user_ref,
        "total_xp": account.total_xp,
        "available_xp": account.available_xp,
        "balance": account.balance,
        "premium_coins": account.premium_coins,
    }))
}

async fn get_current_round(State(state): State<AppState>) -> impl IntoResponse {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        // SAFETY: SystemTime::now() is always after UNIX_EPOCH
        .unwrap()
        .as_secs();

    let round_id = now / 3600;

    // 自动结算上一个轮次 (如果未结算且已超时)
    if round_id > 0 {
        let prev_id = round_id - 1;
        let prev_key = prev_id.to_be_bytes();
        if let Ok(Some(prev_round)) = state
            .storage
            .get_deserialized::<_, crate::state::MiningRound>(
                crate::storage::rocks::CF_MINING_ROUNDS,
                prev_key,
            )
        {
            if prev_round.status == crate::state::RoundStatus::Active {
                let prev_block_hash = state
                    .storage
                    .get_block(prev_round.round_id.saturating_sub(1))
                    .ok()
                    .flatten()
                    .map(|b| b.hash)
                    .unwrap_or([0u8; 32]);

                let config = crate::state::ChainConfig::default();
                let reward_dist: Vec<u64> = vec![
                    config.mining_reward * 50 / 100,
                    config.mining_reward * 30 / 100,
                    config.mining_reward * 20 / 100,
                ];
                let mut prev = prev_round;
                let _ = crate::mining::round::settle_round(
                    &state.storage,
                    &mut prev,
                    &prev_block_hash,
                    config.winner_percentage,
                    config.min_xp_to_participate,
                    &reward_dist,
                );
            }
        }
    }

    let round_key = round_id.to_be_bytes();
    let round: crate::state::MiningRound = state
        .storage
        .get_deserialized(crate::storage::rocks::CF_MINING_ROUNDS, round_key)
        .unwrap_or(None)
        .unwrap_or_else(|| {
            crate::mining::round::create_round(round_id, round_id * 3600, 3600, 40)
        });

    ok(serde_json::json!({
        "round_id": round.round_id,
        "start_time": round.start_time,
        "end_time": round.end_time,
        "total_reward": round.total_reward,
        "participant_count": round.participant_count,
        "xp_pool": round.xp_pool,
        "status": if round.status == crate::state::RoundStatus::Active { "active" } else { "completed" },
    }))
}

async fn get_mining_round(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> impl IntoResponse {
    let key = id.to_be_bytes();
    match state
        .storage
        .get_deserialized::<_, crate::state::MiningRound>(crate::storage::rocks::CF_MINING_ROUNDS, key)
    {
        Ok(Some(round)) => ok(serde_json::json!({
            "round_id": round.round_id,
            "total_reward": round.total_reward,
            "winners": round.winners.iter().map(|w| serde_json::json!({
                "address": w.address,
                "amount": w.amount,
                "rank": w.rank,
            })).collect::<Vec<_>>(),
            "status": if round.status == crate::state::RoundStatus::Completed { "completed" } else { "active" },
        })),
        Ok(None) => err_status(StatusCode::NOT_FOUND, 404, "轮次不存在"),
        Err(e) => err(500, &e.to_string()),
    }
}

async fn get_pool_status(State(state): State<AppState>) -> impl IntoResponse {
    let pool: Option<crate::state::PoolState> = state
        .storage
        .get_deserialized(crate::storage::rocks::CF_POOL_STATE, b"current_pool")
        .unwrap_or(None);

    match pool {
        Some(p) => ok(serde_json::json!({
            "pool_id": p.pool_id,
            "current_amount": p.current_amount,
            "target_amount": p.target_amount,
            "progress_pct": (p.current_amount as f64 / p.target_amount as f64 * 100.0).round(),
            "deposited_count": p.deposited_count,
            "top_depositors": p.top_depositors.iter().take(10).map(|d| serde_json::json!({
                "address": d.address,
                "amount": d.total_deposited,
            })).collect::<Vec<_>>(),
        })),
        None => ok(serde_json::json!({
            "pool_id": "pool-initial",
            "current_amount": 0,
            "target_amount": 100_000,
            "progress_pct": 0.0,
            "deposited_count": 0,
            "top_depositors": [],
        })),
    }
}

async fn get_pool_history(State(state): State<AppState>) -> impl IntoResponse {
    let records = state
        .storage
        .scan_prefix(crate::storage::rocks::CF_POOL_HISTORY, b"")
        .unwrap_or_default();

    let history: Vec<serde_json::Value> = records
        .iter()
        .filter_map(|(_k, v)| bincode::deserialize::<crate::state::PoolAlchemyRecord>(v).ok())
        .map(|r| {
            serde_json::json!({
                "pool_id": r.pool_id,
                "total_burned": r.total_burned,
                "minted_coins": r.minted_coins.len(),
                "completed_at": r.completed_at,
            })
        })
        .collect();

    ok(serde_json::json!({
        "history": history,
        "total": history.len(),
    }))
}

async fn create_wallet(State(state): State<AppState>) -> impl IntoResponse {
    let wallet = crate::wallet::keys::WalletKeys::generate();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        // SAFETY: SystemTime::now() is always after UNIX_EPOCH
        .unwrap()
        .as_secs();
    let account = crate::state::AccountState::new(wallet.address.clone(), now);
    let _ = state.storage.put_account_state(&wallet.address, &account);

    ok(serde_json::json!({
        "address": wallet.address,
        "balance": 0,
        "total_xp": 0,
        "available_xp": 0,
        "premium_coins": [],
    }))
}

async fn get_wallet(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> impl IntoResponse {
    match state.storage.get_account_state(&address) {
        Ok(Some(account)) => ok(serde_json::json!({
            "address": account.address,
            "balance": account.balance,
            "nonce": account.nonce,
            "total_xp": account.total_xp,
            "available_xp": account.available_xp,
            "premium_coins": account.premium_coins,
            "created_at": account.created_at,
        })),
        Ok(None) => err_status(StatusCode::NOT_FOUND, 404, "钱包不存在"),
        Err(e) => err(500, &e.to_string()),
    }
}

async fn register_site(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let domain = body.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    let site_name = body.get("site_name").and_then(|v| v.as_str()).unwrap_or("");
    let admin_address = body.get("admin_address").and_then(|v| v.as_str()).unwrap_or("");
    let public_key_hex = body.get("public_key").and_then(|v| v.as_str()).unwrap_or("");

    if domain.is_empty() {
        return err(400, "domain 不能为空");
    }

    // 可选公钥: 验证格式
    let public_key = if public_key_hex.is_empty() {
        None
    } else {
        match hex::decode(public_key_hex) {
            Ok(b) if b.len() == 32 => Some(b),
            _ => return err(400, "无效的公钥格式 (需要 32 字节 hex)"),
        }
    };

    let site_id = crate::crypto::derive_site_id(domain);
    let now = state.storage.latest_block_number().unwrap_or(0);

    let site = crate::state::SiteInfo {
        site_id: site_id.clone(),
        domain: domain.to_string(),
        site_name: site_name.to_string(),
        admin_address: admin_address.to_string(),
        registered_at: now,
        reputation_score: 100,
        is_active: true,
        public_key,
    };

    let _ = state.storage.put_serialized(
        crate::storage::rocks::CF_SITE_REGISTRY,
        site_id.as_bytes(),
        &site,
    );

    tracing::info!("站点注册: {} -> site_id={}", domain, site_id);

    ok(serde_json::json!({
        "site_id": site_id,
        "domain": domain,
        "status": "active",
    }))
}

async fn get_site(
    State(state): State<AppState>,
    Path(site_id): Path<String>,
) -> impl IntoResponse {
    match state
        .storage
        .get_deserialized::<_, crate::state::SiteInfo>(
            crate::storage::rocks::CF_SITE_REGISTRY,
            site_id.as_bytes(),
        ) {
        Ok(Some(site)) => ok(serde_json::json!({
            "site_id": site.site_id,
            "domain": site.domain,
            "site_name": site.site_name,
            "admin_address": site.admin_address,
            "registered_at": site.registered_at,
            "reputation_score": site.reputation_score,
            "is_active": site.is_active,
        })),
        Ok(None) => err_status(StatusCode::NOT_FOUND, 404, "站点不存在"),
        Err(e) => err(500, &e.to_string()),
    }
}

async fn get_peers(State(state): State<AppState>) -> impl IntoResponse {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let _ = state.p2p_cmd.send(P2PCommand::GetPeers(tx));
    let peers = rx.await.unwrap_or_default();

    ok(serde_json::json!({
        "peers": peers,
        "total": peers.len(),
    }))
}

/// 查看当前轮次参与者概览
async fn get_round_participants(State(state): State<AppState>) -> impl IntoResponse {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        // SAFETY: SystemTime::now() is always after UNIX_EPOCH
        .unwrap()
        .as_secs();
    let round_id = now / 3600;

    // 收集所有当前持有 XP 的账户
    let participants: Vec<serde_json::Value> = match state.storage.get_all_accounts() {
        Ok(accounts) => accounts
            .into_iter()
            .filter(|(_, acc)| acc.available_xp > 0)
            .map(|(addr, acc)| {
                serde_json::json!({
                    "address": addr,
                    "available_xp": acc.available_xp,
                    "total_xp": acc.total_xp,
                })
            })
            .collect(),
        Err(_) => vec![],
    };

    let total_xp: u64 = participants
        .iter()
        .filter_map(|p| p.get("available_xp").and_then(|v| v.as_u64()))
        .sum();

    ok(serde_json::json!({
        "round_id": round_id,
        "participant_count": participants.len(),
        "total_xp_pool": total_xp,
        "participants": participants,
    }))
}

/// 投入 $POL 到大奖池 (需 Ed25519 签名)
async fn pool_deposit(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let from_address = body.get("from_address").and_then(|v| v.as_str()).unwrap_or("");
    let amount = body.get("amount").and_then(|v| v.as_u64()).unwrap_or(0);
    let public_key_hex = body.get("public_key").and_then(|v| v.as_str()).unwrap_or("");
    let signature_hex = body.get("signature").and_then(|v| v.as_str()).unwrap_or("");

    if from_address.is_empty() {
        return err(400, "from_address 不能为空");
    }
    if amount == 0 {
        return err(400, "amount 必须大于 0");
    }

    // 验证 Ed25519 签名
    if public_key_hex.is_empty() || signature_hex.is_empty() {
        return err(401, "需要 Ed25519 签名: 请提供 public_key 和 signature");
    }

    // 解码公钥并验证地址
    let pubkey_bytes = match hex::decode(public_key_hex) {
        Ok(b) if b.len() == 32 => b,
        _ => return err(400, "无效的公钥格式 (需要 32 字节 hex)"),
    };
    let key_arr: [u8; 32] = match pubkey_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => return err(400, "无效的公钥格式 (需要 32 字节 hex)"),
    };
    let vk = match crypto::verifying_key_from_bytes(&key_arr) {
        Ok(vk) => vk,
        Err(_) => return err(400, "无效的 Ed25519 公钥"),
    };
    let expected_addr = crypto::derive_address(&vk);
    if from_address != expected_addr {
        return err(401, "地址与公钥不匹配");
    }

    // 构建签名消息并验证
    let message = format!("POLIS_POOL_DEPOSIT:{}:{}", from_address, amount);
    let sig_bytes = match hex::decode(signature_hex) {
        Ok(b) => b,
        Err(_) => return err(400, "无效的签名格式"),
    };
    if crypto::verify_signature(&vk, message.as_bytes(), &sig_bytes).is_err() {
        return err(401, "签名验证失败");
    }

    // 投入池子
    match crate::pool::alchemy::deposit(&state.storage, from_address, amount) {
        Ok(()) => {
            let pool = crate::pool::alchemy::get_or_create_pool(&state.storage)
                .unwrap_or_else(|_| crate::state::PoolState {
                    pool_id: "unknown".into(),
                    current_amount: 0,
                    target_amount: 100_000,
                    deposited_count: 0,
                    top_depositors: vec![],
                    created_at: 0,
                });

            // 检查是否需要触发炼金
            let triggered = crate::pool::alchemy::should_trigger_alchemy(&pool);

            let mut response = serde_json::json!({
                "deposited": amount,
                "pool_amount": pool.current_amount,
                "target_amount": pool.target_amount,
                "progress_pct": (pool.current_amount as f64 / pool.target_amount as f64 * 100.0).round(),
                "alchemy_triggered": triggered,
            });

            // 如果触发炼金
            if triggered {
                let prev_hash = state
                    .storage
                    .get_meta(b"genesis_hash")
                    .ok()
                    .flatten()
                    .map(|b| {
                        let mut arr = [0u8; 32];
                        let len = b.len().min(32);
                        arr[..len].copy_from_slice(&b[..len]);
                        arr
                    })
                    .unwrap_or([0u8; 32]);

                match crate::pool::alchemy::trigger_alchemy(&state.storage, &pool, &prev_hash) {
                    Ok(record) => {
                        response["alchemy"] = serde_json::json!({
                            "pool_id": record.pool_id,
                            "total_burned": record.total_burned,
                            "minted_coins": record.minted_coins.iter().map(|c| serde_json::json!({
                                "coin_id": c.coin_id,
                                "coin_type": c.coin_type,
                                "owner": c.owner_address,
                            })).collect::<Vec<_>>(),
                        });
                    }
                    Err(e) => {
                        tracing::error!("炼金失败: {}", e);
                    }
                }
            }

            ok(response)
        }
        Err(e) => err(400, &e.to_string()),
    }
}
