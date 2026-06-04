// Polis Chain API 客户端
// 通过 Next.js rewrites 代理到链节点 :8545
const CHAIN_API = '/chain-api';

export interface ApiResponse<T> {
	code: number;
	message: string;
	data: T | null;
}

// --- Wallet ---
export interface WalletInfo {
	address: string;
	balance: number;
	nonce: number;
	available_xp: number;
	total_xp: number;
	premium_coins: number | string[];
	created_at: number;
}

export interface CreateWalletResponse {
	address: string;
	balance: number;
	available_xp: number;
	total_xp: number;
	premium_coins: number | string[];
}

// --- Mining ---
export interface MiningRound {
	round_id: number;
	start_time: number;
	end_time: number;
	total_reward: number;
	participant_count: number;
	xp_pool: number;
	status: 'active' | 'completed';
}

export interface MiningParticipant {
	address: string;
	available_xp: number;
	total_xp: number;
}

export interface ParticipantsResponse {
	round_id: number;
	participant_count: number;
	total_xp_pool: number;
	participants: MiningParticipant[];
}

export interface RoundWinner {
	address: string;
	amount: number;
	rank: number;
}

export interface RoundResult {
	round_id: number;
	total_reward: number;
	winners: RoundWinner[];
}

// --- Pool ---
export interface PoolStatus {
	pool_id: string;
	current_amount: number;
	target_amount: number;
	progress_pct: number;
	deposited_count: number;
	top_depositors: Array<{ address: string; amount: number }>;
}

export interface DepositResult {
	deposited: number;
	pool_amount: number;
	target_amount: number;
	progress_pct: number;
	alchemy_triggered: boolean;
	alchemy?: {
		pool_id: string;
		total_burned: number;
		minted_coins: Array<{
			coin_id: string;
			coin_type: string;
			owner: string;
		}>;
	};
}

async function chainGet<T>(path: string): Promise<ApiResponse<T>> {
	const res = await fetch(`${CHAIN_API}${path}`);
	const text = await res.text();
	let data: ApiResponse<T>;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(`链节点未响应 (${res.status}): 区块链节点可能未部署或未启动`);
	}
	if (!res.ok) {
		const err: any = new Error(data.message || `链 API 错误 (${res.status})`);
		err.status = res.status;
		throw err;
	}
	return data;
}

async function chainPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
	const res = await fetch(`${CHAIN_API}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let data: ApiResponse<T>;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(`链节点未响应 (${res.status}): 区块链节点可能未部署或未启动`);
	}
	if (!res.ok) {
		const err: any = new Error(data.message || `链 API 错误 (${res.status})`);
		err.status = res.status;
		throw err;
	}
	return data;
}

export const wallet = {
	create: () => chainPost<CreateWalletResponse>('/wallet/create'),
	get: (address: string) => chainGet<WalletInfo>(`/wallet/${address}`),
};

export const mining = {
	currentRound: () => chainGet<MiningRound>('/mining/rounds/current'),
	currentParticipants: () =>
		chainGet<ParticipantsResponse>('/mining/rounds/current/participants'),
	roundResult: (id: number) => chainGet<RoundResult>(`/mining/rounds/${id}`),
};

export const pool = {
	status: () => chainGet<PoolStatus>('/pool/status'),
	deposit: (fromAddress: string, amount: number) =>
		chainPost<DepositResult>('/pool/deposit', {
			from_address: fromAddress,
			amount,
		}),
};

export const node = {
	status: () =>
		chainGet<{
			node_id: string;
			chain_id: string;
			block_height: number;
			peer_count: number;
			sync_status: string;
			uptime_secs: number;
			version: string;
		}>('/status'),
};
