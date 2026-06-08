'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { mining, wallet as chainWallet } from '@/lib/chain';
import { getWalletAddress, truncateAddress, formatCountdown, countdownSeconds } from '@/lib/wallet-crypto';
import type { MiningRound, ParticipantsResponse, RoundResult, WalletInfo } from '@/lib/chain';
import { Clock, Users, Coins, Zap, Wallet, Loader2 } from 'lucide-react';

export default function MiningPage() {
	const [round, setRound] = useState<MiningRound | null>(null);
	const [participants, setParticipants] = useState<ParticipantsResponse | null>(null);
	const [lastRound, setLastRound] = useState<RoundResult | null>(null);
	const [myInfo, setMyInfo] = useState<WalletInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [countdown, setCountdown] = useState('');
	const [address, setAddress] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			const [roundRes, participantsRes] = await Promise.all([
				mining.currentRound(),
				mining.currentParticipants(),
			]);
			if (roundRes.data) {
				setRound(roundRes.data);
				// 获取上轮结果
				if (roundRes.data.round_id > 0) {
					mining
						.roundResult(roundRes.data.round_id - 1)
						.then((res) => { if (res.data) setLastRound(res.data); })
						.catch(() => {});
				}
			}
			if (participantsRes.data) setParticipants(participantsRes.data);
		} catch (e: any) {
			setError(e.message || '获取数据失败');
		}
	}, []);

	useEffect(() => {
		const addr = getWalletAddress();
		setAddress(addr);
		if (!addr) {
			setLoading(false);
			return;
		}
		setLoading(true);
		Promise.all([
			fetchData(),
			chainWallet.get(addr).then((res) => {
				if (res.data) setMyInfo(res.data);
			}).catch(() => {}),
		]).finally(() => setLoading(false));
	}, [fetchData]);

	// 倒计时
	useEffect(() => {
		if (!round || round.status !== 'active') return;
		const update = () => setCountdown(formatCountdown(round.end_time));
		update();
		const timer = setInterval(update, 1000);
		// 每 60 秒刷新数据
		const refresh = setInterval(fetchData, 60000);
		return () => {
			clearInterval(timer);
			clearInterval(refresh);
		};
	}, [round, fetchData]);

	if (loading) {
		return (
			<div className="grid gap-4 lg:grid-cols-3">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="card animate-pulse h-48" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
				<p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
				<button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-600 underline">
					重试
				</button>
			</div>
		);
	}

	if (!address) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
				<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
					<Wallet className="w-8 h-8 text-gray-400" />
				</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">请先连接钱包</h2>
				<p className="text-gray-500 dark:text-gray-400 mb-4">需要钱包才能查看挖矿信息</p>

				<div className="grid gap-3 text-left mb-6 w-full">
					<div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-gray-800 dark:text-gray-200">什么是挖矿？</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">基于 XP 权重的抽奖竞赛，拥有 XP 即自动参与当前轮次</p>
						</div>
					</div>
					<div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<Users className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-gray-800 dark:text-gray-200">如何获取 XP？</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">参与社区活动：发帖、评论、投票、每日登录等均可获得 XP</p>
						</div>
					</div>
					<div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<Coins className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-gray-800 dark:text-gray-200">中奖机制</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">你的 XP / 总 XP 池 = 中奖权重，每轮前 3 名获得 $POL 奖励</p>
						</div>
					</div>
				</div>

				<Link href="/wallet/create" className="btn-primary">创建钱包</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">挖矿中心</h1>

			<div className="grid gap-4 lg:grid-cols-3">
				{/* 当前轮次 */}
				<div className="card lg:col-span-2">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">当前轮次</h2>
						{round && (
							<span
								className={`px-2 py-0.5 rounded-full text-xs font-medium ${
									round.status === 'active'
										? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
										: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
								}`}
							>
								{round.status === 'active' ? '进行中' : '已结束'}
							</span>
						)}
					</div>

					{round && round.status === 'active' && (
						<div className="flex items-center gap-3 mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
							<Clock className="w-6 h-6 text-primary-600 animate-pulse" />
							<div className="text-2xl font-mono font-bold text-primary-700 dark:text-primary-400">
								{countdown}
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								剩余时间
							</div>
						</div>
					)}

					<div className="grid grid-cols-3 gap-3">
						<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
							<div className="text-xs text-gray-500 mb-1">轮次 ID</div>
							<div className="font-bold text-gray-900 dark:text-white">
								#{round?.round_id ?? '-'}
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
							<div className="text-xs text-gray-500 mb-1">总奖励</div>
							<div className="font-bold text-amber-500">
								{round?.total_reward ?? 0} $POL
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
							<div className="text-xs text-gray-500 mb-1">XP 池</div>
							<div className="font-bold text-primary-600">
								{round?.xp_pool ?? 0} XP
							</div>
						</div>
					</div>
				</div>

				{/* 我的 XP */}
				<div className="card">
					<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
						<Zap className="w-4 h-4 inline mr-1 text-yellow-500" />
						我的 XP
					</h2>
					<div className="mb-3">
						<div className="text-xs text-gray-500 mb-1">可用 XP</div>
						<div className="text-3xl font-bold text-primary-600">
							{myInfo?.available_xp ?? 0}
						</div>
					</div>
					<div>
						<div className="text-xs text-gray-500 mb-1">累计 XP</div>
						<div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
							{myInfo?.total_xp ?? 0}
						</div>
					</div>
					<div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
						<div className="text-xs text-gray-400">
							中奖率 = 我的XP / 总XP池 × {round?.status === 'active' ? '10%' : '—'}
						</div>
						{round && participants && participants.total_xp_pool > 0 && myInfo && (
							<div className="mt-1 text-xs text-gray-500">
								当前权重: {((myInfo.available_xp / participants.total_xp_pool) * 100).toFixed(2)}%
							</div>
						)}
					</div>
				</div>

				{/* 参与者列表 */}
				<div className="card lg:col-span-2">
					<div className="flex items-center gap-2 mb-3">
						<Users className="w-4 h-4 text-gray-400" />
						<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
							当前参与者 ({participants?.participant_count ?? 0})
						</h2>
					</div>

					{participants && participants.participants.length > 0 ? (
						<div className="max-h-80 overflow-y-auto">
							<table className="w-full text-sm">
								<thead className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
									<tr>
										<th className="text-left py-2 font-medium">地址</th>
										<th className="text-right py-2 font-medium">可用 XP</th>
										<th className="text-right py-2 font-medium">累计 XP</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50 dark:divide-gray-800">
									{participants.participants.map((p) => (
										<tr
											key={p.address}
											className={
												p.address === address
													? 'bg-primary-50/50 dark:bg-primary-900/10'
													: ''
											}
										>
											<td className="py-2">
												<span className="font-mono text-xs">
													{truncateAddress(p.address)}
												</span>
												{p.address === address && (
													<span className="ml-1 text-xs text-primary-600 font-medium">
														(我)
													</span>
												)}
											</td>
											<td className="text-right py-2 font-medium">{p.available_xp}</td>
											<td className="text-right py-2 text-gray-500">{p.total_xp}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="text-center py-8 text-gray-400 text-sm">
							<Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
							👥 暂无参与者。通过社区活动获取 XP 即可自动参与！
						</div>
					)}
				</div>

				{/* 上轮中奖者 */}
				<div className="card">
					<div className="flex items-center gap-2 mb-3">
						<Coins className="w-4 h-4 text-amber-500" />
						<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
							上轮中奖者
						</h2>
					</div>

					{lastRound && lastRound.winners.length > 0 ? (
						<div className="space-y-2">
							<div className="text-xs text-gray-500 mb-2">轮次 #{lastRound.round_id}</div>
							{lastRound.winners.map((w) => (
								<div
									key={w.address}
									className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
											w.rank === 1
												? 'bg-amber-100 text-amber-700'
												: w.rank === 2
													? 'bg-gray-100 text-gray-600'
													: 'bg-orange-100 text-orange-700'
										}`}
									>
										#{w.rank}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-mono text-xs truncate">
											{truncateAddress(w.address)}
										</div>
										<div className="text-xs text-gray-400">
											{w.address === address ? '(我)' : ''}
										</div>
									</div>
									<div className="text-sm font-bold text-amber-500 shrink-0">
										+{w.amount} $POL
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-400 text-sm">
							✅ 暂无完成的轮次
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
