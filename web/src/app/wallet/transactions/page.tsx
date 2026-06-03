'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWalletAddress } from '@/lib/wallet-crypto';
import { Wallet, Search, ExternalLink } from 'lucide-react';

export default function TransactionsPage() {
	const [address, setAddress] = useState<string | null>(null);

	useEffect(() => {
		setAddress(getWalletAddress());
	}, []);

	if (!address) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
					<Wallet className="w-8 h-8 text-gray-400" />
				</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					请先连接钱包
				</h2>
				<p className="text-gray-500 dark:text-gray-400 mb-6">
					交易记录需要关联钱包地址
				</p>
				<Link href="/wallet/create" className="btn-primary">
					创建钱包
				</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">交易记录</h1>

			<div className="max-w-md mx-auto mt-12">
				<div className="card text-center py-8">
					<div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
						<Search className="w-8 h-8 text-primary-500" />
					</div>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
						即将上线
					</h2>
					<p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
						按地址查询交易记录的功能正在开发中。
						链上交易数据将通过区块索引提供快速查询。
					</p>

					<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 text-left">
						<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							当前可用方式
						</h3>
						<ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
							<li>通过 CLI 工具查询: <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">polis-chain wallet show</code></li>
							<li>链上区块浏览器即将上线</li>
							<li>API 端点开发中: GET /chain-api/transactions/{'{address}'}</li>
						</ul>
					</div>

					<Link
						href="/wallet"
						className="btn-secondary inline-flex items-center gap-2"
					>
						<ExternalLink className="w-4 h-4" />
						返回钱包总览
					</Link>
				</div>
			</div>
		</div>
	);
}
