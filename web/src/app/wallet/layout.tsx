'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
	Home,
	PlusCircle,
	Pickaxe,
	Trophy,
	ListOrdered,
	Wallet as WalletIcon,
	Copy,
	Check,
} from 'lucide-react';
import { getWalletAddress, truncateAddress } from '@/lib/wallet-crypto';

const navItems = [
	{ href: '/wallet', label: '总览', icon: Home },
	{ href: '/wallet/create', label: '创建', icon: PlusCircle },
	{ href: '/wallet/mining', label: '挖矿', icon: Pickaxe },
	{ href: '/wallet/pool', label: '奖池', icon: Trophy },
	{ href: '/wallet/transactions', label: '交易', icon: ListOrdered },
];

export default function WalletLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [address, setAddress] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		setAddress(getWalletAddress());
	}, [pathname]);

	const handleCopy = () => {
		if (!address) return;
		navigator.clipboard.writeText(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex flex-1 min-h-0">
			{/* 侧边栏 */}
			<aside className="hidden md:flex flex-col w-56 border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/30 backdrop-blur-sm p-4 gap-2 shrink-0">
				<div className="mb-4">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
						<WalletIcon className="w-5 h-5 text-primary-600" />
						钱包
					</h2>
				</div>

				<nav className="flex flex-col gap-1 flex-1">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
									active
										? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
								}`}
							>
								<Icon className="w-4 h-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* 钱包地址 */}
				<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
					{address ? (
						<div className="text-xs">
							<div className="text-gray-500 dark:text-gray-400 mb-1">当前钱包</div>
							<div className="font-mono text-gray-700 dark:text-gray-300 break-all">
								{truncateAddress(address)}
							</div>
							<button
								onClick={handleCopy}
								className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
							>
								{copied ? (
									<>
										<Check className="w-3 h-3" /> 已复制
									</>
								) : (
									<>
										<Copy className="w-3 h-3" /> 复制地址
									</>
								)}
							</button>
						</div>
					) : (
						<div className="text-xs text-gray-500 dark:text-gray-400">
							未连接钱包
							<Link
								href="/wallet/create"
								className="block mt-1 text-primary-600 hover:text-primary-700"
							>
								创建钱包 →
							</Link>
						</div>
					)}
				</div>
			</aside>

			{/* 移动端底部导航 */}
			<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
				<div className="flex justify-around py-2">
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
									active
										? 'text-primary-600 dark:text-primary-400'
										: 'text-gray-500 dark:text-gray-400'
								}`}
							>
								<Icon className="w-5 h-5" />
								{item.label}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* 主内容 */}
			<main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0 px-4 py-6 md:px-8">
				{children}
			</main>
		</div>
	);
}
