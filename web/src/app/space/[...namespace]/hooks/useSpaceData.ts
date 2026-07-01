'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { spaces as apiSpaces, tiers, subscribe, getToken } from '@/lib/api';
import type { Space, Post, Series, SpaceTier, Subscription, SpaceModule } from '@/lib/api';

interface Announcement {
	id: string; title: string; body: string;
	importance: string; is_pinned: boolean;
	created_at: string;
}

export interface Member {
	user: { id: string; username: string; display_name: string; avatar_url: string | null; verified: boolean };
	role: string;
	joined_at: string;
}

export interface SpaceDataState {
	// Core data
	space: Space | null;
	spaceModules: SpaceModule[];
	posts: Post[];
	announcements: Announcement[];
	polls: any[];
	overviewVideos: any[];
	featured: Post[];
	seriesList: Series[];
	members: Member[];
	spaceTiers: SpaceTier[];
	mySubscription: Subscription | null;

	// Loading states
	loading: boolean;
	postLoading: boolean;
	seriesLoading: boolean;
	membersLoading: boolean;
	tiersLoading: boolean;
	loadingMore: boolean;

	// Pagination
	postPage: number;
	postTotalPages: number;

	// Filters
	postSort: string;
	showHiddenPosts: boolean;

	// Ownership & membership
	isOwner: boolean;
	isMember: boolean;
	joinStatus: string;
	isFollowing: boolean;
	isStarred: boolean;
	ownerName: string | null;

	// Namespace & routing
	namespace: string;
	cleanNamespace: string;
	urlTab: string | null;
	availableTabs: { id: string; label: string; icon: string }[];
	activeTab: string;
	moduleKeySet: Set<string>;

	// Display
	displayNs: string;
	communityName: string;
	ownerSegment: string | null;

	// Setters for data state
	setSpace: React.Dispatch<React.SetStateAction<Space | null>>;
	setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
	setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
	setPolls: React.Dispatch<React.SetStateAction<any[]>>;
	setOverviewVideos: React.Dispatch<React.SetStateAction<any[]>>;
	setFeatured: React.Dispatch<React.SetStateAction<Post[]>>;
	setSeriesList: React.Dispatch<React.SetStateAction<Series[]>>;
	setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
	setSpaceTiers: React.Dispatch<React.SetStateAction<SpaceTier[]>>;
	setMySubscription: React.Dispatch<React.SetStateAction<Subscription | null>>;

	setPostPage: React.Dispatch<React.SetStateAction<number>>;
	setPostTotalPages: React.Dispatch<React.SetStateAction<number>>;
	setPostSort: React.Dispatch<React.SetStateAction<string>>;
	setShowHiddenPosts: React.Dispatch<React.SetStateAction<boolean>>;

	setIsOwner: React.Dispatch<React.SetStateAction<boolean>>;
	setIsMember: React.Dispatch<React.SetStateAction<boolean>>;
	setJoinStatus: React.Dispatch<React.SetStateAction<string>>;
	setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
	setIsStarred: React.Dispatch<React.SetStateAction<boolean>>;
	setOwnerName: React.Dispatch<React.SetStateAction<string | null>>;
	setActiveTab: React.Dispatch<React.SetStateAction<string>>;
	setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSpaceData(rawNamespace: string | string[]): SpaceDataState {
	// --- Namespace parsing ---
	const namespace = useMemo(() => {
		if (!rawNamespace) return '';
		if (Array.isArray(rawNamespace)) {
			return (rawNamespace as string[]).map(s => {
				try { return decodeURIComponent(s); } catch { return s; }
			}).join('/');
		}
		try { return decodeURIComponent(rawNamespace as string); } catch { return rawNamespace as string; }
	}, [rawNamespace]);

	const [spaceModules, setSpaceModules] = useState<SpaceModule[]>([]);

	// 将常见模块 key 预设为系统子路由，防止 API 未响应时 namespace 解析错误导致 404
	const SYSTEM_SUB_ROUTES = new Set(['overview', 'members', 'analytics',
		'forum', 'polls', 'announcements', 'video', 'share', 'wiki', 'series',
		'chat', 'store', 'course', 'novel', 'game', 'mini_app', 'code_repo', 'qa',
	]);
	const knownSubRoutes = useMemo(() => {
		const routes = new Set(SYSTEM_SUB_ROUTES);
		spaceModules.forEach(m => routes.add(m.module_key));
		return routes;
	}, [spaceModules]);

	const cleanNamespace = useMemo(() => {
		const parts = namespace.split('/');
		if (parts.length > 1 && knownSubRoutes.has(parts[parts.length - 1])) {
			return parts.slice(0, -1).join('/');
		}
		return namespace;
	}, [namespace, knownSubRoutes]);

	const urlTab: string | null = useMemo(() => {
		const parts = namespace.split('/');
		if (parts.length > 1 && knownSubRoutes.has(parts[parts.length - 1])) {
			return parts[parts.length - 1];
		}
		return null;
	}, [namespace, knownSubRoutes]);

	const moduleKeySet = useMemo(() => new Set(spaceModules.map(m => m.module_key)), [spaceModules]);

	// --- State variables ---
	const [isOwner, setIsOwner] = useState(false);
	const [isMember, setIsMember] = useState(false);
	const [isFollowing, setIsFollowing] = useState(false);
	const [isStarred, setIsStarred] = useState(false);
	const [joinStatus, setJoinStatus] = useState<string>('none');
	const [activeTab, setActiveTab] = useState(urlTab || 'overview');

	const [space, setSpace] = useState<Space | null>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [polls, setPolls] = useState<any[]>([]);
	const [overviewVideos, setOverviewVideos] = useState<any[]>([]);
	const [featured, setFeatured] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [postLoading, setPostLoading] = useState(true);
	const [postPage, setPostPage] = useState(1);
	const [postTotalPages, setPostTotalPages] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);
	const [ownerName, setOwnerName] = useState<string | null>(null);
	const [postSort, setPostSort] = useState<string>('newest');
	const [showHiddenPosts, setShowHiddenPosts] = useState(false);

	const [seriesList, setSeriesList] = useState<Series[]>([]);
	const [seriesLoading, setSeriesLoading] = useState(false);

	const [spaceTiers, setSpaceTiers] = useState<SpaceTier[]>([]);
	const [mySubscription, setMySubscription] = useState<Subscription | null>(null);
	const [tiersLoading, setTiersLoading] = useState(false);

	const [members, setMembers] = useState<Member[]>([]);
	const [membersLoading, setMembersLoading] = useState(false);

	// --- Computed values ---
	const availableTabs = useMemo(() => {
		const tabs: { id: string; label: string; icon: string }[] = [
			{ id: 'overview', label: '概览', icon: '🏠' },
		];
		spaceModules.forEach(m => {
			tabs.push({
				id: m.module_key,
				label: m.name,
				icon: m.icon || '📄',
			});
		});
		tabs.push({ id: 'members', label: '成员', icon: '👥' });
		if (isOwner) tabs.push({ id: 'analytics', label: '分析', icon: '📊' });
		return tabs;
	}, [spaceModules, isOwner]);

	const ghParts = cleanNamespace.split('/');
	const hasOwnerPrefix = ghParts.length >= 2;
	const displayNs = cleanNamespace;
	const communityName = hasOwnerPrefix ? ghParts[ghParts.length - 1] : ghParts[0];
	const ownerSegment = hasOwnerPrefix ? ghParts[0] : null;

	// --- Effects ---

	// Validate activeTab when modules load
	useEffect(() => {
		if (spaceModules.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
			setActiveTab(availableTabs[0]?.id || 'overview');
		}
	}, [spaceModules]);

	// Fetch space modules from API
	useEffect(() => {
		if (!cleanNamespace) return;
		apiSpaces.listModules(cleanNamespace).then(res => {
			if (res.code === 0 && res.data) setSpaceModules(res.data);
		}).catch((e) => { console.error('[api] error:', e); });
	}, [cleanNamespace]);

	// Fetch space info + owner name
	useEffect(() => {
		if (!cleanNamespace) return;
		setLoading(true);
		fetch(`/api/spaces/${cleanNamespace}`)
			.then(r => r.json())
			.then(data => {
				if (data.code === 0) {
					setSpace(data.data);
					if (data.data.owner_id) {
						fetch(`/api/users/${data.data.owner_id}`)
							.then(r => r.json())
							.then(ud => {
								if (ud.code === 0 && ud.data?.username) {
									setOwnerName(ud.data.username);
								}
							})
							.catch((e) => { console.error('[api] error:', e); });
					}
				}
			})
			.catch((e) => { console.error('[api] error:', e); })
			.finally(() => setLoading(false));
	}, [cleanNamespace]);

	// Fetch owner/member/join status
	useEffect(() => {
		try {
			const stored = localStorage.getItem('polis_user');
			if (stored && space) {
				const me = JSON.parse(stored);
				setIsOwner(me.id === space.owner_id);
				const token = getToken();
				if (token && cleanNamespace) {
					fetch(`/api/spaces/${cleanNamespace}/my-join-status`, {
						headers: { Authorization: `Bearer ${token}` },
					})
						.then(r => r.json())
						.then(data => {
							if (data.code === 0 && data.data) {
								setIsMember(data.data.is_member ?? false);
								setJoinStatus(data.data.join_status ?? 'none');
								setIsFollowing(data.data.is_following ?? false);
								setIsStarred(data.data.is_starred ?? false);
							}
						})
						.catch((e) => { console.error('[api] error:', e); });
				}
			}
		} catch (e) { console.error('Failed to load space meta:', e); }
	}, [space?.owner_id, space?.id, cleanNamespace]);

		const fetchingRef = useRef(false);

	// Fetch posts, featured, polls, videos, announcements
	useEffect(() => {
		if (!cleanNamespace) return;
			if (fetchingRef.current) return;
			fetchingRef.current = true;
		setPostLoading(true);

		const fetchers: Promise<any>[] = [
			fetch(`/api/spaces/${cleanNamespace}/posts?page=${postPage}&page_size=10&sort=${postSort}${showHiddenPosts ? '&include_hidden=true' : ''}`, showHiddenPosts ? { headers: { Authorization: `Bearer ${getToken()}` } } : undefined).then(r => r.json()),
			fetch(`/api/spaces/${cleanNamespace}/featured`).then(r => r.json()).catch(() => ({ code: 0, data: [] })),
		];

		if (moduleKeySet.has('polls')) {
			fetchers.push(fetch(`/api/spaces/${cleanNamespace}/polls`).then(r => r.json()));
		}

		fetchers.push(fetch(`/api/spaces/${cleanNamespace}/announcements`).then(r => r.json()));

		if (moduleKeySet.has('video')) {
			fetchers.push(fetch(`/api/spaces/${cleanNamespace}/videos?page=1&page_size=10`).then(r => r.json()));
		}

		Promise.all(fetchers)
			.then((results) => {
				const [postsData, featuredData] = results;
				const vidIdx = moduleKeySet.has('video') ? (results.length - 1) : -1;
				const pollsIdx = moduleKeySet.has('polls') ? 2 : -1;
				const annIdx = moduleKeySet.has('polls') ? 3 : 2;

				if (postsData.code === 0) {
					const allPosts = postsData.data || [];
					if (postsData.pagination) {
						setPostTotalPages(postsData.pagination.total_pages);
					}
					// 仅在模块列表已加载后才过滤，避免竞态条件导致所有帖子被错误过滤
					if (spaceModules.length > 0) {
						const mtFilter = new Set<string>(spaceModules.map(m => m.module_key));
						setPosts(allPosts.filter((p: any) => mtFilter.has(p.module_type || '')));
					} else {
						setPosts(allPosts);
					}
				}
				if (featuredData.code === 0) setFeatured(featuredData.data || []);
				if (pollsIdx > 0 && results[pollsIdx]?.code === 0) setPolls(results[pollsIdx].data || []);
				if (results[annIdx]?.code === 0) setAnnouncements(results[annIdx].data || []);
				if (vidIdx >= 0 && results[vidIdx]?.code === 0) {
					setOverviewVideos(Array.isArray(results[vidIdx].data) ? results[vidIdx].data : []);
				} else { setOverviewVideos([]); }
			})
			.catch((e) => { console.error('[api] error:', e); })
			.finally(() => {
					setPostLoading(false);
					fetchingRef.current = false;
				});
	}, [cleanNamespace, postSort, postPage, showHiddenPosts]);

	// Fetch series list when series tab is active or module is enabled
	useEffect(() => {
		if (!cleanNamespace || !moduleKeySet.has('series')) return;
		if (activeTab === 'series') {
			setSeriesLoading(true);
			fetch(`/api/series/space/${cleanNamespace}`)
				.then(r => r.json())
				.then(data => {
					if (data.code === 0) {
						setSeriesList(data.data || []);
					}
				})
				.catch((e) => { console.error('[api] error:', e); })
				.finally(() => setSeriesLoading(false));
		}
	}, [cleanNamespace, activeTab, spaceModules]);

	// Fetch tiers + subscription
	useEffect(() => {
		if (!cleanNamespace || !moduleKeySet.has('membership')) return;
		if (activeTab === 'membership') {
			setTiersLoading(true);
			Promise.all([
				tiers.list(cleanNamespace),
				subscribe.get(cleanNamespace).catch(() => ({ code: 0, data: null })),
			]).then(([tRes, sRes]) => {
				if (tRes.code === 0) setSpaceTiers(tRes.data || []);
				if (sRes.code === 0 && sRes.data) setMySubscription(sRes.data);
			}).catch((e) => { console.error('[api] error:', e); }).finally(() => setTiersLoading(false));
		}
	}, [cleanNamespace, activeTab, spaceModules]);

	// Fetch members when tab changes
	useEffect(() => {
		if (activeTab === 'members' && cleanNamespace && members.length === 0) {
			setMembersLoading(true);
			fetch(`/api/spaces/${cleanNamespace}/members`)
				.then(r => r.json())
				.then(data => {
					if (data.code === 0 && Array.isArray(data.data)) {
						setMembers(data.data);
					}
				})
				.catch((e) => { console.error('[api] error:', e); })
				.finally(() => setMembersLoading(false));
		}
	}, [activeTab, cleanNamespace]);

	return {
		space, spaceModules, posts, announcements, polls, overviewVideos, featured,
		seriesList, members, spaceTiers, mySubscription,
		loading, postLoading, seriesLoading, membersLoading, tiersLoading, loadingMore,
		postPage, postTotalPages, postSort, showHiddenPosts,
		isOwner, isMember, joinStatus, isFollowing, isStarred, ownerName,
		namespace, cleanNamespace, urlTab, availableTabs, activeTab, moduleKeySet,
		displayNs, communityName, ownerSegment,
		setSpace, setPosts, setAnnouncements, setPolls,
		setOverviewVideos, setFeatured, setSeriesList, setMembers,
		setSpaceTiers, setMySubscription,
		setPostPage, setPostTotalPages, setPostSort, setShowHiddenPosts,
		setIsOwner, setIsMember, setJoinStatus, setIsFollowing, setIsStarred,
		setOwnerName, setActiveTab, setLoadingMore,
	};
}
