'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

interface ToastState {
	toasts: Toast[];
	addToast: (type: ToastType, message: string) => void;
	removeToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	addToast: (type, message) => {
		const id = `toast-${++counter}-${Date.now()}`;
		set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
		setTimeout(() => {
			set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
		}, 4000);
	},
	removeToast: (id) => {
		set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
	},
}));

/** Convenience functions — callable outside React components */
export function toastSuccess(message: string) {
	useToastStore.getState().addToast('success', message);
}

export function toastError(message: string) {
	useToastStore.getState().addToast('error', message);
}

export function toastInfo(message: string) {
	useToastStore.getState().addToast('info', message);
}

export function toastWarning(message: string) {
	useToastStore.getState().addToast('warning', message);
}
