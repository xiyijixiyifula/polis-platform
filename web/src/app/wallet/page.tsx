'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { wallet as chainWallet } from '@/lib/chain';
import { getWalletAddress, truncateAddress } from '@/lib/wallet-crypto';
import type { WalletInfo } from '@/lib/chain';
import { Wallet, Coins, Zap, ArrowRight, Copy, Check, ArrowUpRight } from 'lucide-react';

export default function WalletPage() {
	const [info, setInfo] = useState<WalletInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [copied, setCopied] = useState(false);

	const [address, setAddress] = useState<string | null>(null);

	useEffect(() => {
		const addr = getWalletAddress();
		setAddress(addr);
		if (!addr) {
			setLoading(false);
			return;
		}
		chainWallet
			.get(addr)
			.then((res) => {
				if (res.data) setInfo(res.data);
				else setError(res.message || '获取钱包信息失败');
			})
			.catch((e) => setError(e.message || '网络错误'))
			.finally(() => setLoading(false));
	}, []);

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const premiumCount = Array.isArray(info?.premium_coins)
		? info.premium_coins.length
		: (info?.premium_coins as number) ?? 0;

	if (loading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="card animate-pulse h-40"
					/>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
				<p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
				<button
					onClick={() => window.location.reload()}
					className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
				>
					重试
				</button>
			</div>
		);
	}

	if (!address) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
					<Wallet className="w-8 h-8 text-gray-400" />
				</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					未连接钱包
				</h2>
				<p className="text-gray-500 dark:text-gray-400 mb-6">
					创建或导入钱包以查看余额和 XP
				</p>
				<Link
					href="/wallet/create"
					className="btn-primary inline-flex items-center gap-2"
				>
					创建钱包 <ArrowRight className="w-4 h-4" />
				</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">钱包总览</h1>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* $POL 余额 */}
				<div className="card flex flex-col gap-2">
					<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						<Coins className="w-4 h-4 text-amber-500" />
						$POL 余额
					</div>
					<div className="text-3xl font-bold text-gray-900 dark:text-white">
						{info?.balance ?? 0}
					</div>
					<div className="flex items-center gap-2 mt-auto">
						<span className="text-xs text-gray-400 font-mono">
							{truncateAddress(info?.address || '')}
						</span>
						<button
							onClick={() => handleCopy(info?.address || '')}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							{copied ? (
								<Check className="w-3 h-3 text-green-500" />
							) : (
								<Copy className="w-3 h-3" />
							)}
						</button>
					</div>
				</div>

				{/* XP 总览 */}
				<div className="card flex flex-col gap-2">
					<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						<Zap className="w-4 h-4 text-yellow-500" />
						XP 总览
					</div>
					<div className="flex items-end gap-3">
						<div>
							<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">可用 XP</div>
							<div className="text-2xl font-bold text-primary-600">
								{info?.available_xp ?? 0}
							</div>
						</div>
						<div>
							<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计 XP</div>
							<div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
								{info?.total_xp ?? 0}
							</div>
						</div>
					</div>
					<div className="mt-auto text-xs text-gray-400">
						可用 XP 越多，挖矿中奖概率越高
					</div>
				</div>

				{/* 稀有币 */}
				<div className="card flex flex-col gap-2">
					<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						稀有币
					</div>
					<div className="text-3xl font-bold text-amber-500">{premiumCount}</div>
					<div className="mt-auto text-xs text-gray-400">
						投入奖池炼金获得金银铜币
					</div>
				</div>

				{/* 快捷操作 */}
				<div className="card flex flex-col gap-2">
					<div className="text-sm text-gray-500 dark:text-gray-400 mb-1">快捷操作</div>
					<Link
						href="/wallet/mining"
						className="flex items-center justify-between text-sm text-primary-600 hover:text-primary-700 py-1"
					>
						挖矿中心 <ArrowUpRight className="w-3 h-3" />
					</Link>
					<Link
						href="/wallet/pool"
						className="flex items-center justify-between text-sm text-primary-600 hover:text-primary-700 py-1"
					>
						大奖池 <ArrowUpRight className="w-3 h-3" />
					</Link>
					<Link
						href="/wallet/transactions"
						className="flex items-center justify-between text-sm text-primary-600 hover:text-primary-700 py-1"
					>
						交易记录 <ArrowUpRight className="w-3 h-3" />
					</Link>
				</div>
			</div>

			{/* 详细信息 */}
			{info && (
				<div className="card mt-6">
					<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						账户详情
					</h3>
					<div className="grid gap-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-500">地址</span>
							<span className="font-mono text-xs text-gray-700 dark:text-gray-300">
								{info.address}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">Nonce</span>
							<span className="text-gray-700 dark:text-gray-300">{info.nonce}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">创建时间</span>
							<span className="text-gray-700 dark:text-gray-300">
								{new Date(info.created_at * 1000).toLocaleString('zh-CN')}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
