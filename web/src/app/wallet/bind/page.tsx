'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWalletAddress, saveWalletAddress, truncateAddress } from '@/lib/wallet-crypto';
import { Link2, Wallet, Loader2, Check, Copy, AlertCircle } from 'lucide-react';

export default function BindWalletPage() {
	const [address, setAddress] = useState<string | null>(null);
	const [addressInput, setAddressInput] = useState('');
	const [nonce, setNonce] = useState('');
	const [publicKeyHex, setPublicKeyHex] = useState('');
	const [signatureHex, setSignatureHex] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [challengeLoading, setChallengeLoading] = useState(false);
	const [challengeError, setChallengeError] = useState('');

	useEffect(() => {
		setAddress(getWalletAddress());
	}, []);

	const handleGenerateChallenge = async () => {
		setChallengeLoading(true);
		setChallengeError('');
		setNonce('');
		setPublicKeyHex('');
		setSignatureHex('');
		setError('');
		setSuccess(false);

		try {
			const addr = addressInput.trim();
			const res = await fetch('/api/users/me/bind-wallet/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ address: addr }),
			});
			const data = await res.json();
			if (res.ok && data.code === 0) {
				setNonce(data.data.nonce);
				if (!address) {
					saveWalletAddress(addr);
					setAddress(addr);
				}
			} else {
				setChallengeError(data.message || '获取挑战失败');
			}
		} catch (e: any) {
			setChallengeError(e.message || '网络错误');
		} finally {
			setChallengeLoading(false);
		}
	};

	const handleVerify = async () => {
		if (!publicKeyHex.trim() || !signatureHex.trim()) {
			setError('请填写公钥和签名');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const res = await fetch('/api/users/me/bind-wallet/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					address: addressInput.trim(),
					public_key_hex: publicKeyHex.trim(),
					nonce,
					signature_hex: signatureHex.trim(),
				}),
			});
			const data = await res.json();
			if (res.ok && data.code === 0) {
				setSuccess(true);
				if (!address) {
					saveWalletAddress(addressInput.trim());
					setAddress(addressInput.trim());
				}
			} else {
				setError(data.message || '绑定失败');
			}
		} catch (e: any) {
			setError(e.message || '网络错误');
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	if (!address && success) {
		return (
			<div className="max-w-md mx-auto">
				<div className="card text-center py-8">
					<div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
						<Check className="w-8 h-8 text-green-500" />
					</div>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
						绑定成功
					</h2>
					<p className="text-gray-500 dark:text-gray-400 mb-6">
						你的平台账号已成功绑定到链上钱包
					</p>
					<Link href="/wallet" className="btn-primary">
						前往钱包总览
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">绑定钱包</h1>

			<div className="max-w-lg mx-auto">
				<div className="card">
					<div className="flex items-center gap-2 mb-4">
						<Link2 className="w-5 h-5 text-primary-500" />
						<h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
							将链上钱包关联到你的平台账号
						</h2>
					</div>

					{/* Step 1: 输入地址并生成挑战 */}
					<div className="mb-6">
						<div className="flex items-center gap-2 mb-2">
							<span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 shrink-0">
								1
							</span>
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">输入钱包地址</span>
						</div>

						<div className="ml-8">
							{address ? (
								<div className="text-sm text-gray-500 mb-2">
									当前钱包: <span className="font-mono text-primary-600">{truncateAddress(address)}</span>
									<button onClick={() => setAddressInput(address)} className="ml-2 text-xs text-primary-500 underline">
										绑定此地址
									</button>
								</div>
							) : (
								<p className="text-xs text-gray-400 mb-2">
									尚未创建钱包？先
									<Link href="/wallet/create" className="text-primary-500 underline ml-1">创建钱包</Link>
								</p>
							)}

							<div className="flex gap-2">
								<input
									type="text"
									value={addressInput}
									onChange={(e) => setAddressInput(e.target.value)}
									placeholder="0xPOL_..."
									className="input-field flex-1 font-mono text-sm"
									disabled={challengeLoading}
								/>
								<button
									onClick={handleGenerateChallenge}
									disabled={challengeLoading || !addressInput.trim()}
									className="btn-primary text-sm whitespace-nowrap"
								>
									{challengeLoading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										'生成挑战'
									)}
								</button>
							</div>

							{challengeError && (
								<div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
									<p className="text-red-600 dark:text-red-400 text-xs">{challengeError}</p>
								</div>
							)}
						</div>
					</div>

					{/* Step 2: CLI 签名 */}
					{nonce && (
						<div className="mb-6">
							<div className="flex items-center gap-2 mb-2">
								<span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 shrink-0">
									2
								</span>
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">签名 nonce</span>
							</div>

							<div className="ml-8">
								<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-2">
									<p className="text-xs text-gray-500 mb-2">复制以下命令到终端执行：</p>
									<div className="flex items-center gap-2 mb-2">
										<code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded flex-1 break-all">
											polis-chain wallet sign --data "{nonce}"
										</code>
										<button
											onClick={() => handleCopy(`polis-chain wallet sign --data "${nonce}"`)}
											className="text-gray-400 hover:text-gray-600 shrink-0"
										>
											<Copy className="w-3 h-3" />
										</button>
									</div>
									<p className="text-xs text-gray-400">
										CLI 将输出签名地址、签名 (hex)。需要同时提交公钥和签名。
									</p>
								</div>

								<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
									<div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
										<AlertCircle className="w-3 h-3" />
										如何获取公钥？
									</div>
									<p className="text-xs text-amber-600 dark:text-amber-500">
										运行 <code className="text-xs bg-amber-100 dark:bg-amber-800 px-1 rounded">polis-chain wallet show</code> 查看钱包详情，复制 "Public Key (hex)" 字段。
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Step 3: 提交验证 */}
					{nonce && (
						<div className="mb-4">
							<div className="flex items-center gap-2 mb-2">
								<span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 shrink-0">
									3
								</span>
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">提交验证</span>
							</div>

							<div className="ml-8 space-y-3">
								<div>
									<label className="block text-xs text-gray-500 mb-1">公钥 (hex, 64 字符)</label>
									<input
										type="text"
										value={publicKeyHex}
										onChange={(e) => setPublicKeyHex(e.target.value)}
										placeholder="从 polis-chain wallet show 获取"
										className="input-field w-full font-mono text-sm"
										disabled={loading}
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">签名 (hex, 128 字符)</label>
									<input
										type="text"
										value={signatureHex}
										onChange={(e) => setSignatureHex(e.target.value)}
										placeholder="从 CLI 输出复制"
										className="input-field w-full font-mono text-sm"
										disabled={loading}
									/>
								</div>

								{error && (
									<div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
										<p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
									</div>
								)}

								<button
									onClick={handleVerify}
									disabled={loading || !publicKeyHex.trim() || !signatureHex.trim()}
									className="btn-primary w-full flex items-center justify-center gap-2"
								>
									{loading ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											验证中...
										</>
									) : (
										'验证并绑定'
									)}
								</button>
							</div>
						</div>
					)}

					{success && (
						<div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
							<div className="flex items-center gap-2">
								<Check className="w-4 h-4 text-green-500" />
								<span className="text-sm font-medium text-green-700 dark:text-green-400">
									绑定成功！
								</span>
							</div>
							<Link href="/wallet" className="mt-2 inline-block text-xs text-primary-600 underline">
								前往钱包总览 →
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
