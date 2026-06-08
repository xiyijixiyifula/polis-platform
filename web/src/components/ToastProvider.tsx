'use client';

import { useToastStore } from '@/stores/toastStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
	success: CheckCircle,
	error: AlertCircle,
	info: Info,
	warning: AlertTriangle,
};

const colorMap = {
	success: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
	error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
	info: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
	warning: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
};

export function ToastProvider() {
	const { toasts, removeToast } = useToastStore();

	if (toasts.length === 0) return null;

	return (
		<div
			aria-live="polite"
			className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
		>
			{toasts.map((toast) => {
				const Icon = iconMap[toast.type];
				return (
					<div
						key={toast.id}
						className={`pointer-events-auto flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg min-w-[300px] max-w-[420px] animate-slide-in ${colorMap[toast.type]}`}
					>
						<Icon className="w-5 h-5 shrink-0" />
						<span className="flex-1 text-sm font-medium">{toast.message}</span>
						<button
							onClick={() => removeToast(toast.id)}
							className="shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
							aria-label="关闭通知"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				);
			})}
		</div>
	);
}
