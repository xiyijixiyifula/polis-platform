// 钱包工具函数

// 截断地址显示: 0xPOL_ab12...ef89
export function truncateAddress(address: string, chars = 6): string {
	if (!address) return '';
	if (address.length <= chars * 2 + 7) return address; // 0xPOL_ + chars*2
	return `${address.slice(0, chars + 6)}...${address.slice(-4)}`;
}

// 格式化 Unix 时间戳
export function formatDate(ts: number): string {
	if (!ts) return '';
	const d = new Date(ts * 1000);
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

// 格式化倒计时: endTime (unix seconds) → HH:MM:SS
export function formatCountdown(endTime: number): string {
	const remain = Math.max(0, endTime * 1000 - Date.now());
	const h = Math.floor(remain / 3600000);
	const m = Math.floor((remain % 3600000) / 60000);
	const s = Math.floor((remain % 60000) / 1000);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 计算倒计时剩余秒数
export function countdownSeconds(endTime: number): number {
	return Math.max(0, endTime - Math.floor(Date.now() / 1000));
}

// 获取当前钱包地址
export function getWalletAddress(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('polis_wallet_address');
}

// 保存钱包地址
export function saveWalletAddress(address: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('polis_wallet_address', address);
}
