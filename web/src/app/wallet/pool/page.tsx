'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { pool } from '@/lib/chain';
import { getWalletAddress, truncateAddress } from '@/lib/wallet-crypto';
import type { PoolStatus, DepositResult } from '@/lib/chain';
import { Coins, Send, Wallet, Loader2, Flame, TrendingUp } from 'lucide-react';

export default function PoolPage() {
	const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [depositAmount, setDepositAmount] = useState('');
	const [depositing, setDepositing] = useState(false);
	const [depositResult, setDepositResult] = useState<DepositResult | null>(null);
	const [depositError, setDepositError] = useState('');
	const [address, setAddress] = useState<string | null>(null);

	const fetchStatus = async () => {
		try {
			const res = await pool.status();
			if (res.data) setPoolStatus(res.data);
		} catch (e: any) {
			setError(e.message || '获取奖池状态失败');
		}
	};

	useEffect(() => {
		setAddress(getWalletAddress());
		fetchStatus().finally(() => setLoading(false));
	}, []);

	const handleDeposit = async () => {
		if (!address) return;
		const amount = parseFloat(depositAmount);
		if (!amount || amount < 1) {
			setDepositError('请输入有效金额（最小 1 $POL）');
			return;
		}
		if (amount > (poolStatus?.target_amount ?? Infinity) - (poolStatus?.current_amount ?? 0)) {
			setDepositError('存款金额超过奖池剩余目标');
			return;
		}

		setDepositing(true);
		setDepositError('');

		try {
			const res = await pool.deposit(address, amount);
			if (res.data) {
				setDepositResult(res.data);
				setDepositAmount('');
				fetchStatus();
			} else {
				setDepositError(res.message || '存款失败');
			}
		} catch (e: any) {
			setDepositError(e.message || '网络错误');
		} finally {
			setDepositing(false);
		}
	};

	if (loading) {
		return (
			<div className="grid gap-4 lg:grid-cols-2">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="card animate-pulse h-40" />
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

	const progressPct = poolStatus?.progress_pct ?? 0;

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">大奖池</h1>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* 进度条 */}
				<div className="card lg:col-span-2">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
							<Flame className="w-4 h-4 inline mr-1 text-orange-500" />
							炼金进度
						</h2>
						<span className="text-xs text-gray-400">
							满 {(poolStatus?.target_amount ?? 100000).toLocaleString()} $POL 触发炼金
						</span>
					</div>

					<div className="flex items-end gap-4 mb-4">
						<div className="text-2xl font-bold text-gray-900 dark:text-white">
							{poolStatus?.current_amount?.toLocaleString() ?? 0}
						</div>
						<div className="text-lg text-gray-400 pb-0.5">
							/ {poolStatus?.target_amount?.toLocaleString() ?? '100,000'} $POL
						</div>
					</div>

					<div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
						<div
							className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
							style={{ width: `${Math.min(progressPct, 100)}%` }}
						/>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-primary-600 dark:text-primary-400 font-medium">
							{progressPct.toFixed(1)}%
						</span>
						<div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
							<Users2Icon className="w-3 h-3" />
							{poolStatus?.deposited_count ?? 0} 人次存款
						</div>
					</div>
				</div>

				{/* 存款表单 */}
				<div className="card">
					<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
						<Send className="w-4 h-4 inline mr-1" />
						投入代币
					</h2>

					{!address ? (
						<div className="text-center py-6">
							<Wallet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
							<p className="text-sm text-gray-500 mb-1">请先连接钱包</p>
							<p className="text-xs text-gray-400 mb-3">存入 $POL 参与奖池累积，满 10 万自动炼金铸造稀有币</p>
							<Link href="/wallet/create" className="btn-primary text-sm">
								创建钱包
							</Link>
						</div>
					) : (
						<>
							<div className="mb-3">
								<label className="block text-xs text-gray-500 mb-1">存款金额 ($POL)</label>
								<input
									type="number"
									min="1"
									step="1"
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
									placeholder="输入金额"
									className="input-field w-full"
									disabled={depositing}
								/>
							</div>

							{depositError && (
								<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 mb-3">
									<p className="text-red-600 dark:text-red-400 text-xs">{depositError}</p>
								</div>
							)}

							<button
								onClick={handleDeposit}
								disabled={depositing || !depositAmount}
								className="btn-primary w-full flex items-center justify-center gap-2"
							>
								{depositing ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										存款中...
									</>
								) : (
									<>投入奖池</>
								)}
							</button>

							{depositResult && (
								<div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
									<div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
										存款成功！+{depositResult.deposited} $POL
									</div>
									<div className="text-xs text-green-600 dark:text-green-500">
										奖池进度: {depositResult.progress_pct.toFixed(1)}%
									</div>
									{depositResult.alchemy_triggered && depositResult.alchemy && (
										<div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
											<div className="text-xs font-medium text-amber-700 dark:text-amber-400">
												炼金触发！铸造稀有币:
											</div>
											<ul className="text-xs text-amber-600 dark:text-amber-500 mt-1 space-y-0.5">
												{depositResult.alchemy.minted_coins.map((coin) => (
													<li key={coin.coin_id}>
														{coin.coin_type} → {truncateAddress(coin.owner)}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>
							)}
						</>
					)}
				</div>

				{/* 顶级存款者 */}
				<div className="card">
					<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
						<TrendingUp className="w-4 h-4 inline mr-1" />
						顶级存款者
					</h2>

					{poolStatus?.top_depositors && poolStatus.top_depositors.length > 0 ? (
						<div className="max-h-80 overflow-y-auto">
							{poolStatus.top_depositors.map((d, i) => (
								<div
									key={d.address}
									className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
								>
									<div
										className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
											i === 0
												? 'bg-amber-100 text-amber-700'
												: i === 1
													? 'bg-gray-100 text-gray-600'
													: i === 2
														? 'bg-orange-100 text-orange-700'
														: 'bg-gray-50 text-gray-500'
										}`}
									>
										{i + 1}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-mono text-xs truncate">
											{truncateAddress(d.address)}
										</div>
										{d.address === address && (
											<span className="text-xs text-primary-600">(我)</span>
										)}
									</div>
									<div className="text-sm font-bold text-gray-800 dark:text-gray-200 shrink-0">
										{d.amount} $POL
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-400 text-sm">
							💰 暂无存款记录。成为第一个存款者！
						</div>
					)}
				</div>
			</div>

			{/* 炼金说明 */}
			<div className="card mt-4">
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">炼金规则</h3>
				<div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
					<p>奖池满 100,000 $POL 时自动触发炼金：</p>
					<ul className="list-disc list-inside space-y-0.5 ml-2">
						<li>全部 $POL 被烧毁（永久退出流通）</li>
						<li>铸造 1 枚 🥇 金币、2 枚 🥈 银币、3 枚 🥉 铜币</li>
						<li>稀有币按存款权重分配给顶级存款者</li>
						<li>奖池重置，开始新一轮累积</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

function Users2Icon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	);
}
