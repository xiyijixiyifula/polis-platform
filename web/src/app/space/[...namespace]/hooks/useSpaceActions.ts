'use client';

import { useState, useCallback } from 'react';
import { spaces as apiSpaces, tiers, subscribe, getToken } from '@/lib/api';
import type { Space, Post, Series, SpaceTier, Subscription } from '@/lib/api';
import type { Member, SpaceDataState } from './useSpaceData';

interface UseSpaceActionsInput {
	cleanNamespace: string;
	isOwner: boolean;
	isMember: boolean;
	isFollowing: boolean;
	isStarred: boolean;
	joinStatus: string;
	posts: Post[];
	space: Space | null;
	postPage: number;
	postTotalPages: number;
	postSort: string;
	showHiddenPosts: boolean;
	setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
	setFeatured: React.Dispatch<React.SetStateAction<Post[]>>;
	setSpace: (s: Space | null) => void;
	setSeriesList: React.Dispatch<React.SetStateAction<Series[]>>;
	setSpaceTiers: React.Dispatch<React.SetStateAction<SpaceTier[]>>;
	setMySubscription: React.Dispatch<React.SetStateAction<Subscription | null>>;
	setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
	setIsMember: React.Dispatch<React.SetStateAction<boolean>>;
	setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
	setIsStarred: React.Dispatch<React.SetStateAction<boolean>>;
	setJoinStatus: React.Dispatch<React.SetStateAction<string>>;
	setPostPage: React.Dispatch<React.SetStateAction<number>>;
	setPostTotalPages: React.Dispatch<React.SetStateAction<number>>;
	loadingMore: boolean;
	setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSpaceActions(input: UseSpaceActionsInput) {
	const {
		cleanNamespace, isOwner, isMember, isFollowing, isStarred, joinStatus,
		posts, space, postPage, postTotalPages, postSort, showHiddenPosts,
		setPosts, setFeatured, setSpace, setSeriesList, setSpaceTiers, setMySubscription,
		setMembers, setIsMember, setIsFollowing, setIsStarred, setJoinStatus,
		setPostPage, setPostTotalPages, loadingMore, setLoadingMore,
	} = input;

	// --- Action-specific UI state ---
	const [joining, setJoining] = useState(false);
	const [joinMessage, setJoinMessage] = useState('');
	const [showJoinInput, setShowJoinInput] = useState(false);
	const [followLoading, setFollowLoading] = useState(false);
	const [starLoading, setStarLoading] = useState(false);

	// Series creation form
	const [showCreateSeries, setShowCreateSeries] = useState(false);
	const [newSeriesTitle, setNewSeriesTitle] = useState('');
	const [newSeriesDesc, setNewSeriesDesc] = useState('');
	const [seriesCreating, setSeriesCreating] = useState(false);

	// Tier form
	const [showTierForm, setShowTierForm] = useState(false);
	const [editingTier, setEditingTier] = useState<any>(null);
	const [tierForm, setTierForm] = useState({ name: '', price_cents: '0', description: '', benefits: '' });
	const [tierSaving, setTierSaving] = useState(false);
	const [subscribing, setSubscribing] = useState<string | null>(null);

	// Edit community dialog
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [editForm, setEditForm] = useState({ title: '', description: '', icon_url: '', banner_url: '' });
	const [editSaving, setEditSaving] = useState(false);
	const [uploadingIcon, setUploadingIcon] = useState(false);
	const [uploadingBanner, setUploadingBanner] = useState(false);

	// --- Post actions ---
	const togglePin = useCallback(async (postId: string, isPinned: boolean) => {
		try {
			const token = getToken();
			if (!token) { alert('请先登录'); return; }
			const res = await fetch(`/api/spaces/${cleanNamespace}/posts/${postId}/pin`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			if (data.code === 0) {
				const newPinned = data.data?.pinned;
				setPosts(prev => Array.isArray(prev) ? prev.map(p => p.id === postId ? { ...p, is_pinned: newPinned } : p) : prev);
				setFeatured(prev => Array.isArray(prev) ? prev.map(p => p.id === postId ? { ...p, is_pinned: newPinned } : p) : prev);
			}
		} catch (e) { console.error('[component] error:', e); }
	}, [cleanNamespace, setPosts, setFeatured]);

	const toggleHide = useCallback(async (postId: string) => {
		if (!confirm('确定要隐藏这篇帖子吗？隐藏后将从空间索引中移除，但内容不会删除。')) return;
		try {
			const token = getToken();
			if (!token) { alert('请先登录'); return; }
			const res = await fetch(`/api/spaces/${cleanNamespace}/posts/${postId}/hide`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			if (data.code === 0) {
				setPosts(prev => prev.filter(p => p.id !== postId));
				setFeatured(prev => prev.filter(p => p.id !== postId));
			}
		} catch (e) { console.error('[component] error:', e); }
	}, [cleanNamespace, setPosts, setFeatured]);

	const toggleUnhide = useCallback(async (postId: string) => {
		try {
			const token = getToken();
			if (!token) { alert('请先登录'); return; }
			const res = await fetch(`/api/spaces/${cleanNamespace}/posts/${postId}/unhide`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			if (data.code === 0) {
				setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_hidden: false } : p));
				setFeatured(prev => prev.map(p => p.id === postId ? { ...p, is_hidden: false } : p));
			}
		} catch (e) { console.error('[component] error:', e); }
	}, [cleanNamespace, setPosts, setFeatured]);

	const toggleFeature = useCallback(async (postId: string, isFeatured: boolean) => {
		try {
			const token = getToken();
			if (!token) { alert('请先登录'); return; }
			const res = await fetch(`/api/spaces/${cleanNamespace}/posts/${postId}/featured`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			if (data.code === 0) {
				const newFeatured = data.data?.featured;
				setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_featured: newFeatured } : p));
				if (newFeatured) {
					const post = posts.find(p => p.id === postId);
					if (post) setFeatured(prev => [...prev, post]);
				} else {
					setFeatured(prev => prev.filter(p => p.id !== postId));
				}
			}
		} catch (e) { console.error('[component] error:', e); }
	}, [cleanNamespace, posts, setPosts, setFeatured]);

	const loadMorePosts = useCallback(async (spaceModules?: any[]) => {
		if (loadingMore) return;
		setLoadingMore(true);
		try {
			const nextPage = postPage + 1;
			const res = await fetch(`/api/spaces/${cleanNamespace}/posts?page=${nextPage}&page_size=10&sort=${postSort}${showHiddenPosts ? '&include_hidden=true' : ''}`, showHiddenPosts ? { headers: { Authorization: `Bearer ${getToken()}` } } : undefined);
			const data = await res.json();
			if (data.code === 0 && Array.isArray(data.data)) {
				const morePosts = data.data;
				setPosts(prev => [...prev, ...morePosts]);
				setPostPage(nextPage);
				if (data.pagination) {
					setPostTotalPages(data.pagination.total_pages);
				}
			}
		} catch (e) { console.error('[component] error:', e); } finally {
			setLoadingMore(false);
		}
	}, [cleanNamespace, postPage, postSort, showHiddenPosts, loadingMore, setPosts, setPostPage, setPostTotalPages, setLoadingMore]);

	const goToPostPage = useCallback((p: number) => {
		if (p < 1 || p > postTotalPages) return;
		window.scrollTo({ top: 0, behavior: 'smooth' });
		setPostPage(p);
	}, [postTotalPages, setPostPage]);

	// --- Space membership actions ---
	const handleJoinSpace = useCallback(async () => {
		if (isOwner || isMember || joinStatus === 'pending') return;
		const token = getToken();
		if (!token) { alert('请先登录'); return; }
		setJoining(true);
		try {
			const res = await apiSpaces.join(
				cleanNamespace,
				showJoinInput ? joinMessage : undefined
			);
			if (res.code === 0 && res.data) {
				if (res.data.status === 'joined') {
					setIsMember(true);
					setShowJoinInput(false);
				} else if (res.data.status === 'pending') {
					setShowJoinInput(false);
					alert('已提交加入申请，等待社区管理员审批');
				}
			}
		} catch (e: any) {
			alert(e?.message || '操作失败');
		}
		setJoining(false);
	}, [isOwner, isMember, joinStatus, cleanNamespace, showJoinInput, joinMessage, setIsMember, setShowJoinInput]);

	const handleFollowSpace = useCallback(async () => {
		const token = getToken();
		if (!token) { alert('请先登录'); return; }
		setFollowLoading(true);
		try {
			if (isFollowing) {
				await apiSpaces.unfollow(cleanNamespace);
				setIsFollowing(false);
				setSpace(space ? { ...space, follower_count: Math.max(0, (space.follower_count || 0) - 1) } : null);
			} else {
				await apiSpaces.follow(cleanNamespace);
				setIsFollowing(true);
				setSpace(space ? { ...space, follower_count: (space.follower_count || 0) + 1 } : null);
			}
		} catch (e: any) {
			alert(e?.message || '操作失败');
		}
		setFollowLoading(false);
	}, [isFollowing, cleanNamespace, setIsFollowing, setSpace]);

	const handleStarSpace = useCallback(async () => {
		const token = getToken();
		if (!token) { alert('请先登录'); return; }
		setStarLoading(true);
		try {
			if (isStarred) {
				await apiSpaces.unstar(cleanNamespace);
				setIsStarred(false);
				setSpace(space ? { ...space, star_count: Math.max(0, (space.star_count || 0) - 1) } : null);
			} else {
				await apiSpaces.star(cleanNamespace);
				setIsStarred(true);
				setSpace(space ? { ...space, star_count: (space.star_count || 0) + 1 } : null);
			}
		} catch (e: any) {
			alert(e?.message || '操作失败');
		}
		setStarLoading(false);
	}, [isStarred, cleanNamespace, setIsStarred, setSpace]);

	// --- Series actions ---
	const handleCreateSeries = useCallback(async () => {
		const token = getToken();
		if (!token) { alert('请先登录'); return; }
		if (!newSeriesTitle.trim()) { alert('请输入系列标题'); return; }
		setSeriesCreating(true);
		try {
			const res = await fetch(`/api/series/space/${cleanNamespace}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ title: newSeriesTitle.trim(), description: newSeriesDesc.trim(), visibility: 'public' }),
			});
			const data = await res.json();
			if (data.code === 0) {
				setNewSeriesTitle('');
				setNewSeriesDesc('');
				setShowCreateSeries(false);
				const listRes = await fetch(`/api/series/space/${cleanNamespace}`);
				const listData = await listRes.json();
				if (listData.code === 0) setSeriesList(listData.data || []);
			} else {
				alert(data.message || '创建失败');
			}
		} catch (e) {
			alert('网络错误');
		} finally {
			setSeriesCreating(false);
		}
	}, [cleanNamespace, newSeriesTitle, newSeriesDesc, setSeriesList]);

	// --- Tier management ---
	const handleSaveTier = useCallback(async () => {
		if (!tierForm.name.trim()) { alert('请输入名称'); return; }
		const benefits = tierForm.benefits ? tierForm.benefits.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
		setTierSaving(true);
		try {
			if (editingTier) {
				await tiers.update(cleanNamespace, editingTier.id, {
					name: tierForm.name.trim(),
					price_cents: parseInt(tierForm.price_cents) || 0,
					description: tierForm.description.trim(),
					benefits,
				});
			} else {
				await tiers.create(cleanNamespace, {
					name: tierForm.name.trim(),
					price_cents: parseInt(tierForm.price_cents) || 0,
					description: tierForm.description.trim(),
					benefits,
				});
			}
			setShowTierForm(false); setEditingTier(null);
			const tRes = await tiers.list(cleanNamespace);
			if (tRes.code === 0) setSpaceTiers(tRes.data || []);
		} catch (e: any) { alert(e?.message || '保存失败'); }
		finally { setTierSaving(false); }
	}, [cleanNamespace, tierForm, editingTier, setSpaceTiers]);

	const handleDeleteTier = useCallback(async (tierId: string, tierName: string) => {
		if (!confirm('确定删除等级 "' + tierName + '" 吗？')) return;
		try {
			await tiers.delete(cleanNamespace, tierId);
			const tRes = await tiers.list(cleanNamespace);
			if (tRes.code === 0) setSpaceTiers(tRes.data || []);
		} catch (e: any) { alert(e?.message || '删除失败'); }
	}, [cleanNamespace, setSpaceTiers]);

	const handleSubscribe = useCallback(async (tierId: string, isMyTier: boolean) => {
		const token = getToken();
		if (!token) { alert('请先登录'); return; }
		if (isMyTier) {
			if (!confirm('确定要取消订阅吗？')) return;
			setSubscribing(tierId);
			try { await subscribe.cancel(cleanNamespace); setMySubscription(null); } catch (e: any) { alert(e?.message || '取消失败'); } finally { setSubscribing(null); }
		} else {
			setSubscribing(tierId);
			try {
				const res = await subscribe.join(cleanNamespace, tierId);
				if (res.code === 0) { const sRes = await subscribe.get(cleanNamespace); if (sRes.code === 0 && sRes.data) setMySubscription(sRes.data); }
				else { alert(res.message || '订阅失败'); }
			} catch (e: any) { alert(e?.message || '订阅失败'); } finally { setSubscribing(null); }
		}
	}, [cleanNamespace, setMySubscription]);

	// --- Edit space ---
	const handleSaveSpaceEdit = useCallback(async () => {
		setEditSaving(true);
		try {
			await apiSpaces.update(cleanNamespace, {
				title: editForm.title.trim() || undefined,
				description: editForm.description.trim() || undefined,
				icon_url: editForm.icon_url,
				banner_url: editForm.banner_url,
			});
			setSpace(space ? { ...space, title: editForm.title, description: editForm.description, icon_url: editForm.icon_url, banner_url: editForm.banner_url } : null);
			setShowEditDialog(false);
		} catch (e: any) { alert(e?.message || '保存失败'); }
		setEditSaving(false);
	}, [cleanNamespace, editForm, setSpace]);

	const handleDeleteSpace = useCallback(async () => {
		if (!confirm('确定要删除这个社区吗？此操作不可撤销，社区内容将被归档。')) return;
		try {
			await apiSpaces.archive(cleanNamespace);
			window.location.href = '/';
		} catch (e: any) { alert(e?.message || '删除失败'); }
	}, [cleanNamespace]);

	// --- File upload ---
	const handleUploadIcon = useCallback(async (file: File) => {
		if (file.size > 2 * 1024 * 1024) { alert('图标不能超过 2MB'); return; }
		setUploadingIcon(true);
		try {
			const dataBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve((reader.result as string).split(',')[1]);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			const result = await apiSpaces.uploadFile(cleanNamespace, file.name, dataBase64, file.type);
			if (result.data) { const url = `/api/files/${result.data.id}`; setEditForm(prev => ({ ...prev, icon_url: url })); }
		} catch (e: any) { alert(e?.message || '上传失败'); }
		setUploadingIcon(false);
	}, [cleanNamespace]);

	const handleUploadBanner = useCallback(async (file: File) => {
		if (file.size > 5 * 1024 * 1024) { alert('封面不能超过 5MB'); return; }
		setUploadingBanner(true);
		try {
			const dataBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve((reader.result as string).split(',')[1]);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			const result = await apiSpaces.uploadFile(cleanNamespace, file.name, dataBase64, file.type);
			if (result.data) { const url = `/api/files/${result.data.id}`; setEditForm(prev => ({ ...prev, banner_url: url })); }
		} catch (e: any) { alert(e?.message || '上传失败'); }
		setUploadingBanner(false);
	}, [cleanNamespace]);

	// --- Refresh members ---
	const refreshMembers = useCallback(async () => {
		fetch(`/api/spaces/${cleanNamespace}/members`)
			.then(r => r.json())
			.then(data => {
				if (data.code === 0 && Array.isArray(data.data)) {
					setMembers(data.data);
				}
			})
			.catch((e) => { console.error('[api] error:', e); });
	}, [cleanNamespace, setMembers]);

	return {
		// Action UI states
		joining, joinMessage, showJoinInput, setShowJoinInput, setJoinMessage,
		followLoading, starLoading,
		showCreateSeries, setShowCreateSeries, newSeriesTitle, setNewSeriesTitle,
		newSeriesDesc, setNewSeriesDesc, seriesCreating,
		showTierForm, setShowTierForm, editingTier, setEditingTier,
		tierForm, setTierForm, tierSaving,
		subscribing, setSubscribing,
		showEditDialog, setShowEditDialog, editForm, setEditForm,
		editSaving, uploadingIcon, uploadingBanner,

		// Post actions
		togglePin, toggleHide, toggleUnhide, toggleFeature,
		loadMorePosts, goToPostPage,

		// Space membership
		handleJoinSpace, handleFollowSpace, handleStarSpace,

		// Series
		handleCreateSeries,

		// Tiers
		handleSaveTier, handleDeleteTier, handleSubscribe,

		// Edit space
		handleSaveSpaceEdit, handleDeleteSpace,
		handleUploadIcon, handleUploadBanner,

		// Members
		refreshMembers,
	};
}
