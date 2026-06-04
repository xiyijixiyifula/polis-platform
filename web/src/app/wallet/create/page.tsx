'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { wallet as chainWallet } from '@/lib/chain';
import { saveWalletAddress, truncateAddress } from '@/lib/wallet-crypto';
import type { CreateWalletResponse } from '@/lib/chain';
import { Loader2, Copy, Check, Wallet, ArrowRight } from 'lucide-react';

export default function CreateWalletPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<CreateWalletResponse | null>(null);
	const [error, setError] = useState('');
	const [copied, setCopied] = useState(false);

	const handleCreate = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await chainWallet.create();
			if (res.data) {
				setResult(res.data);
				saveWalletAddress(res.data.address);
			} else {
				setError(res.message || '创建失败');
			}
		} catch (e: any) {
			setError(e.message || '网络错误，请确保链节点正在运行');
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (result) {
		return (
			<div className="max-w-md mx-auto">
				<div className="card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 text-center">
					<div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-4">
						<Check className="w-6 h-6 text-green-600" />
					</div>
					<h2 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-4">
						钱包创建成功！
					</h2>

					<div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 text-left">
						<div className="text-xs text-gray-500 mb-1">钱包地址</div>
						<div className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
							{result.address}
						</div>
						<button
							onClick={() => handleCopy(result.address)}
							className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
						>
							{copied ? (
								<><Check className="w-3 h-3" /> 已复制</>
							) : (
								<><Copy className="w-3 h-3" /> 复制地址</>
							)}
						</button>
					</div>

					<div className="grid grid-cols-3 gap-2 mb-6 text-sm">
						<div className="bg-white dark:bg-gray-800 rounded-lg p-2">
							<div className="text-xs text-gray-500">余额</div>
							<div className="font-bold text-gray-800 dark:text-gray-200">
								{result.balance} $POL
							</div>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-lg p-2">
							<div className="text-xs text-gray-500">可用 XP</div>
							<div className="font-bold text-primary-600">{result.available_xp}</div>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-lg p-2">
							<div className="text-xs text-gray-500">累计 XP</div>
							<div className="font-bold text-gray-500">{result.total_xp}</div>
						</div>
					</div>

					<button
						onClick={() => router.push('/wallet')}
						className="btn-primary inline-flex items-center gap-2"
					>
						前往钱包总览 <ArrowRight className="w-4 h-4" />
					</button>

					<div className="mt-6 grid gap-2 text-left">
						<p className="text-xs font-medium text-gray-700 dark:text-gray-300">下一步做什么：</p>
						<Link href="/wallet/mining" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
							→ 前往挖矿中心，通过 XP 竞争 $POL 奖励
						</Link>
						<Link href="/wallet/pool" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
							→ 前往大奖池，存入 $POL 参与炼金
						</Link>
						<Link href="/wallet/bind" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
							→ 绑定钱包到平台账号，统一管理身份
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto">
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">创建钱包</h1>
			<p className="text-gray-500 dark:text-gray-400 mb-6">
				Polis Chain 节点将为您生成安全的 Ed25519 密钥对
			</p>

			<div className="card">
				<div className="flex items-start gap-3 mb-4">
					<div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
						<Wallet className="w-5 h-5 text-primary-600" />
					</div>
					<div>
						<h3 className="font-medium text-gray-900 dark:text-white">快速创建</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							链上节点为您生成密钥对并创建账户。创建后即可参与挖矿和奖池。
						</p>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
						<p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
					</div>
				)}

				<button
					onClick={handleCreate}
					disabled={loading}
					className="btn-primary w-full flex items-center justify-center gap-2"
				>
					{loading ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							创建中...
						</>
					) : (
						'创建钱包'
					)}
				</button>

				<p className="mt-4 text-xs text-gray-400 text-center">
					创建钱包后将自动保存在本地浏览器中
				</p>
			</div>

			<div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
				<h3 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">安全提示</h3>
				<ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1 list-disc list-inside">
					<li>钱包仅保存在本地浏览器中，清除缓存或更换设备后将无法恢复</li>
					<li>当前版本不支持助记词恢复，请勿在创建后清除浏览器数据</li>
					<li>密钥由链节点生成，私钥不会通过网络传输</li>
				</ul>
			</div>
		</div>
	);
}
