'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PostCard } from '@/components/PostCard';
import { PollCard } from '@/components/PollCard';
import { SeriesCard } from '@/components/SeriesCard';
import GameCard from '@/components/GameCard';
import SpaceModulesManager from '@/components/SpaceSettings';
import SpaceCodeRepo from '@/components/SpaceCodeRepo';
import SpaceStore from '@/components/SpaceStore';
import { Users, Share2, MessageCircle, Plus, PenLine, UserCheck, BarChart3, Megaphone, Vote, Settings, Layout, Pin, ExternalLink, Video, Code, HelpCircle, MessageSquare, ShoppingBag, GraduationCap, BookOpen, Crown, Library, BookText, Gamepad2, AppWindow, TrendingUp, Star, Grid3X3, List, Filter, FileText } from 'lucide-react';
import NovelCard, { adaptPostToNovel } from '@/components/NovelCard';
import QACard from '@/components/QACard';
import { Pencil, Trash2, ImageIcon } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import { getModuleLabel, getModuleEmoji, buildPostLink } from '@/lib/module-config';
import type { Space, Post, Series, SpaceTier, Subscription, SpaceModule } from '@/lib/api';
import { spaces as apiSpaces, tiers, subscribe, getToken } from '@/lib/api';
import { SpaceAnalytics, SpaceAnalyticsMini } from '@/components/SpaceAnalytics';
import { SpaceChat } from '@/components/SpaceChat';
import { SpaceParticles } from '@/components/SpaceParticles';
import { SpaceVideoTab } from '@/components/SpaceVideoTab';
import { JoinRequestsPanel } from '@/components/JoinRequestsPanel';
import { MemberActions } from '@/components/MemberActions';

interface Announcement {
 id: string; title: string; body: string;
 importance: string; is_pinned: boolean;
 created_at: string;
}

export default function SpacePage({ rawNamespace }: { rawNamespace: string | string[] }) {

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

 // Handle sub-routes — base set covers all legacy + common module keys
 const SYSTEM_SUB_ROUTES = new Set(['overview', 'members', 'analytics']);
 const knownSubRoutes = useMemo(() => {
 const routes = new Set(SYSTEM_SUB_ROUTES);
 spaceModules.forEach(m => routes.add(m.module_key));
 return routes;
 }, [spaceModules]);

 // 从原始命名空间中剥离子路由后缀，得到纯社区命名空间
 const cleanNamespace = useMemo(() => {
 const parts = namespace.split('/');
 if (parts.length > 1 && knownSubRoutes.has(parts[parts.length - 1])) {
 return parts.slice(0, -1).join('/');
 }
 return namespace;
 }, [namespace]);

 const urlTab: string | null = useMemo(() => {
 const parts = namespace.split('/');
 if (parts.length > 1 && knownSubRoutes.has(parts[parts.length - 1])) {
 return parts[parts.length - 1];
 }
 return null;
 }, [namespace]);

 // Fetch space modules from API
 useEffect(() => {
 if (!cleanNamespace) return;
 apiSpaces.listModules(cleanNamespace).then(res => {
 if (res.code === 0 && res.data) setSpaceModules(res.data);
 }).catch(() => {});
 }, [cleanNamespace]);

 const moduleKeySet = useMemo(() => new Set(spaceModules.map(m => m.module_key)), [spaceModules]);

 // Space ownership (must be declared before availableTabs — analytics tab depends on it)
 const [isOwner, setIsOwner] = useState(false);
 const [isMember, setIsMember] = useState(false);
 const [joining, setJoining] = useState(false);
 const [joinMessage, setJoinMessage] = useState('');
 const [showJoinInput, setShowJoinInput] = useState(false);
 const [joinStatus, setJoinStatus] = useState<string>('none');
 const [isFollowing, setIsFollowing] = useState(false);
 const [followLoading, setFollowLoading] = useState(false);
 const [isStarred, setIsStarred] = useState(false);
 const [starLoading, setStarLoading] = useState(false);

 // Active tab - dynamic from space modules (tab id = module_key)
 const availableTabs = useMemo(() => {
 const tabs: { id: string; label: string; icon: string }[] = [
 { id: 'overview', label: '概览', icon: '🏠' },
 ];
 spaceModules.forEach(m => {
 tabs.push({
 id: m.module_key,
 label: m.name,
 icon: (m as any).icon || '📄',
 });
 });
 tabs.push({ id: 'members', label: '成员', icon: '👥' });
 if (isOwner) tabs.push({ id: 'analytics', label: '分析', icon: '📊' });
 return tabs;
 }, [spaceModules, isOwner]);

 const [activeTab, setActiveTab] = useState(urlTab || 'overview');
 useEffect(() => {
 if (spaceModules.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
 setActiveTab(availableTabs[0]?.id || 'overview');
 }
 }, [spaceModules]);

 const [space, setSpace] = useState<Space | null>(null);
 const [posts, setPosts] = useState<Post[]>([]);
 const [announcements, setAnnouncements] = useState<Announcement[]>([]);
 const [polls, setPolls] = useState<any[]>([]);
 const [overviewVideos, setOverviewVideos] = useState<any[]>([]);
 const [featured, setFeatured] = useState<Post[]>([]);
 const [subSpaces, setSubSpaces] = useState<Space[]>([]);
 const [loading, setLoading] = useState(true);
 const [postLoading, setPostLoading] = useState(true);
 const [postPage, setPostPage] = useState(1);
 const [postTotalPages, setPostTotalPages] = useState(1);
 const [loadingMore, setLoadingMore] = useState(false);
 const [ownerName, setOwnerName] = useState<string | null>(null);
 const [postSort, setPostSort] = useState<string>('newest');
 const [showHiddenPosts, setShowHiddenPosts] = useState(false);

 // Series state
 const [seriesList, setSeriesList] = useState<Series[]>([]);
 const [seriesLoading, setSeriesLoading] = useState(false);
 const [showCreateSeries, setShowCreateSeries] = useState(false);
 const [newSeriesTitle, setNewSeriesTitle] = useState('');
 const [newSeriesDesc, setNewSeriesDesc] = useState('');
 const [seriesCreating, setSeriesCreating] = useState(false);

 // Membership state
 const [spaceTiers, setSpaceTiers] = useState<SpaceTier[]>([]);
 const [mySubscription, setMySubscription] = useState<Subscription | null>(null);
 const [tiersLoading, setTiersLoading] = useState(false);
 const [subscribing, setSubscribing] = useState<string | null>(null);

 // Members state
 const [members, setMembers] = useState<Array<{ user: { id: string; username: string; display_name: string; avatar_url: string | null; verified: boolean }; role: string; joined_at: string }>>([]);
 const [membersLoading, setMembersLoading] = useState(false);

 // Fetch members when tab changes to 'members'
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
 .catch(() => {})
 .finally(() => setMembersLoading(false));
 }
 }, [activeTab, cleanNamespace]);

 // Space ownership + tier management
 const [showTierForm, setShowTierForm] = useState(false);
 const [editingTier, setEditingTier] = useState<any>(null);
 const [tierForm, setTierForm] = useState({ name: '', price_cents: '0', description: '', benefits: '' });
 const [tierSaving, setTierSaving] = useState(false);

 // Edit community state
 const [showEditDialog, setShowEditDialog] = useState(false);
 const [editForm, setEditForm] = useState({ title: '', description: '', icon_url: '', banner_url: '' });
 const [editSaving, setEditSaving] = useState(false);
 const [uploadingIcon, setUploadingIcon] = useState(false);
 const [uploadingBanner, setUploadingBanner] = useState(false);

 useEffect(() => {
 try {
 const stored = localStorage.getItem('polis_user');
 if (stored && space) {
 const me = JSON.parse(stored);
 setIsOwner(me.id === space.owner_id);
 // 检查当前用户是否已是成员 + 加入申请状态
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
 .catch(() => {});
 }
 }
 } catch (_) {}
 }, [space?.owner_id, space?.id, cleanNamespace]);

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
 } catch {}
 }, [cleanNamespace]);

 const toggleHide = useCallback(async (postId: string) => {
 if (!confirm('确定要隐藏这篇帖子吗？隐藏后将从空间索引中移除，但内容不会删除。')) return;
 try {
 const token = getToken();
 if (!token) { alert('请先登录'); return; }
 const res = await fetch(`/api/spaces/${cleanNamespace}/posts/${postId}/hide`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
 const data = await res.json();
 if (data.code === 0) {
 // Remove from all local lists (posts, featured, module-filtered lists)
 setPosts(prev => prev.filter(p => p.id !== postId));
 setFeatured(prev => prev.filter(p => p.id !== postId));
 }
 } catch {}
 }, [cleanNamespace]);

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
 } catch {}
 }, [cleanNamespace]);

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
 // Add to featured list
 const post = posts.find(p => p.id === postId);
 if (post) setFeatured(prev => [...prev, post]);
 } else {
 setFeatured(prev => prev.filter(p => p.id !== postId));
 }
 }
 } catch {}
 }, [cleanNamespace, posts]);

 const loadMorePosts = useCallback(async () => {
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
 } catch {} finally {
 setLoadingMore(false);
 }
 }, [cleanNamespace, postPage, postSort, loadingMore, spaceModules, showHiddenPosts]);

 const goToPostPage = (p: number) => {
 if (p < 1 || p > postTotalPages) return;
 window.scrollTo({ top: 0, behavior: 'smooth' });
 setPostPage(p);
 };

 // Parse namespace for GitHub-style display: username/community-name
 const ghParts = cleanNamespace.split('/');
 const hasOwnerPrefix = ghParts.length >= 2;
 const displayNs = cleanNamespace;
 const communityName = hasOwnerPrefix ? ghParts[ghParts.length - 1] : ghParts[0];
 const ownerSegment = hasOwnerPrefix ? ghParts[0] : null;

 useEffect(() => {
 if (!cleanNamespace) return;
 setLoading(true);
 fetch(`/api/spaces/${cleanNamespace}`)
 .then(r => r.json())
 .then(data => {
 if (data.code === 0) {
 setSpace(data.data);
 // Try to resolve owner info
 if (data.data.owner_id) {
 fetch(`/api/users/${data.data.owner_id}`)
 .then(r => r.json())
 .then(ud => {
 if (ud.code === 0 && ud.data?.username) {
 setOwnerName(ud.data.username);
 }
 })
 .catch(() => {});
 }
 }
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [cleanNamespace]);

 useEffect(() => {
 if (!cleanNamespace) return;
 setPostLoading(true);

 const fetchers: Promise<any>[] = [
 fetch(`/api/spaces/${cleanNamespace}/posts?page=${postPage}&page_size=10&sort=${postSort}${showHiddenPosts ? '&include_hidden=true' : ''}`, showHiddenPosts ? { headers: { Authorization: `Bearer ${getToken()}` } } : undefined).then(r => r.json()),
 fetch(`/api/spaces/${cleanNamespace}/featured`).then(r => r.json()).catch(() => ({ code: 0, data: [] })),
 ];

 // Only fetch polls if the module is enabled
 if (moduleKeySet.has('polls')) {
 fetchers.push(fetch(`/api/spaces/${cleanNamespace}/polls`).then(r => r.json()));
 }

 // Always fetch announcements for banners
 fetchers.push(fetch(`/api/spaces/${cleanNamespace}/announcements`).then(r => r.json()));

 // Fetch videos for overview if module enabled
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
	 // Include all module types for client-side tab filtering
	 const mtFilter = new Set<string>(spaceModules.map(m => m.module_key));
	 setPosts(allPosts.filter((p: any) => mtFilter.has(p.module_type || '')));
	 }
 if (featuredData.code === 0) setFeatured(featuredData.data || []);
 if (pollsIdx > 0 && results[pollsIdx]?.code === 0) setPolls(results[pollsIdx].data || []);
 if (results[annIdx]?.code === 0) setAnnouncements(results[annIdx].data || []);
 if (vidIdx >= 0 && results[vidIdx]?.code === 0) {
 setOverviewVideos(Array.isArray(results[vidIdx].data) ? results[vidIdx].data : []);
 } else { setOverviewVideos([]); }
 })
 .catch(() => {})
 .finally(() => setPostLoading(false));
 }, [cleanNamespace, spaceModules, postSort, postPage, showHiddenPosts]);

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
 .catch(() => {})
 .finally(() => setSeriesLoading(false));
 }
 }, [cleanNamespace, activeTab, spaceModules]);

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
 }).catch(() => {}).finally(() => setTiersLoading(false));
 }
 }, [cleanNamespace, activeTab, spaceModules]);

 const handleCreateSeries = async () => {
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
 // Refresh series list
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
 };

 if (loading) {
 return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-400 dark:text-gray-500 animate-pulse">加载社区信息...</div>;
 }

 if (!space) {
 return (
 <div className="mx-auto max-w-7xl px-4 py-16 text-center">
 <div className="text-5xl mb-4">🔍</div>
 <h2 className="text-xl font-semibold text-gray-900 dark:text-white">社区不存在</h2>
 <p className="mt-2 text-gray-500 dark:text-gray-400">未找到社区 "{cleanNamespace}"</p>
 <Link href="/explore" className="btn-primary mt-4 inline-block px-6 py-2">浏览其他社区</Link>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-7xl px-4 py-6">
 {/* Community Header - GitHub Style with Particles */}
 <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-800 mb-6">
 {space.banner_url && (
 <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${space.banner_url})` }} />
 )}
 <div className="p-6">
 <SpaceParticles color="16, 185, 129" />
 <div className="relative z-10 flex items-start gap-4">
 <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
 {space.icon_url ? (
 <img src={space.icon_url} className="h-full w-full object-cover" alt="" />
 ) : (
 space.title.charAt(0)
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 flex-wrap">
 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{space.title}</h1>
 {/* 社区等级徽章 */}
 {space.level && space.level > 0 && (
 <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
 space.level >= 5 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
 space.level >= 4 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
 space.level >= 3 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
 space.level >= 2 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
 }`}>
 Lv.{space.level}
 </span>
 )}
 {/* Edit button for owner */}
 {isOwner && (<>
 <button
 onClick={() => {
 setEditForm({ title: space.title, description: space.description || '', icon_url: space.icon_url || '', banner_url: space.banner_url || '' });
 setShowEditDialog(true);
 }}
 className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
 title="编辑社区"
 >
 <Pencil className="h-4 w-4" />
 </button>
 <button
 onClick={async () => {
 if (!confirm('确定要删除这个社区吗？此操作不可撤销，社区内容将被归档。')) return;
 try {
 await apiSpaces.archive(cleanNamespace);
 window.location.href = '/';
 } catch (e: any) { alert(e?.message || '删除失败'); }
 }}
 className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
 title="删除社区"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 <Link
 href={`/space/manage/${cleanNamespace}`}
 className="px-3 py-1 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
 >
 管理
 </Link>
 </>)}
 </div>
 {/* GitHub-style namespace breadcrumb */}
 <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
 {ownerSegment || ownerName ? (
 <>
 <Link
 href={`/profile/${ownerSegment || ownerName}`}
 className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
 >
 @{ownerSegment || ownerName}
 </Link>
 <span className="text-gray-300 dark:text-gray-600">/</span>
 </>
 ) : null}
 <span className="font-mono text-gray-700 dark:text-gray-300">{communityName}</span>
 </div>
 <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{space.description}</p>
 <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
 <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {formatCount(space.member_count)} 成员</span>
 <span>{formatCount(space.post_count)} 帖子</span>
 <span>{formatCount(space.follower_count || 0)} 关注</span>
<span className="flex items-center gap-1"><Star className="h-4 w-4" /> {formatCount(space.star_count || 0)} 收藏</span>
 {announcements.length > 0 && (
 <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
 <Megaphone className="h-4 w-4" /> {announcements.length} 条公告
 </span>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <div className="flex flex-col items-end gap-1">
 <button
 className={`text-sm px-5 py-2 rounded-lg transition-colors ${
 isOwner || isMember
 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
 : joinStatus === 'pending'
 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 cursor-default'
 : 'btn-primary'
 }`}
 disabled={isOwner || isMember || joining || joinStatus === 'pending'}
 onClick={async () => {
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
 }}
 >
 {isOwner ? '我的社区' : isMember ? '✓ 已加入' : joinStatus === 'pending' ? '审批中...' : joining ? '加入中...' : '加入社区'}
 </button>
 {!isOwner && (
 <button
 className={`text-sm px-4 py-2 rounded-lg transition-colors ${
 isFollowing
 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
 : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40'
 }`}
 disabled={followLoading}
 onClick={async () => {
 const token = getToken();
 if (!token) { alert('请先登录'); return; }
 setFollowLoading(true);
 try {
 if (isFollowing) {
 await apiSpaces.unfollow(cleanNamespace);
 setIsFollowing(false);
 setSpace(prev => prev ? { ...prev, follower_count: Math.max(0, (prev.follower_count || 0) - 1) } : prev);
 } else {
 await apiSpaces.follow(cleanNamespace);
 setIsFollowing(true);
 setSpace(prev => prev ? { ...prev, follower_count: (prev.follower_count || 0) + 1 } : prev);
 }
 } catch (e: any) {
 alert(e?.message || '操作失败');
 }
 setFollowLoading(false);
 }}
 >
 {isFollowing ? '已关注' : followLoading ? '...' : '关注'}
 </button>
 )}
 {!isOwner && (
 <button
 className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
 isStarred
 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
 : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400'
 }`}
 disabled={starLoading}
 onClick={async () => {
 const token = getToken();
 if (!token) { alert('请先登录'); return; }
 setStarLoading(true);
 try {
 if (isStarred) {
 await apiSpaces.unstar(cleanNamespace);
 setIsStarred(false);
 setSpace(prev => prev ? { ...prev, star_count: Math.max(0, (prev.star_count || 0) - 1) } : prev);
 } else {
 await apiSpaces.star(cleanNamespace);
 setIsStarred(true);
 setSpace(prev => prev ? { ...prev, star_count: (prev.star_count || 0) + 1 } : prev);
 }
 } catch (e: any) {
 alert(e?.message || '操作失败');
 }
 setStarLoading(false);
 }}
 >
 <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-500' : ''}`} />
 {isStarred ? '已收藏' : starLoading ? '...' : '收藏'}
 </button>
 )}
 {!isOwner && !isMember && showJoinInput && (
 <div className="flex items-center gap-1">
 <input
 type="text"
 value={joinMessage}
 onChange={e => setJoinMessage(e.target.value)}
 placeholder="申请留言（选填）"
 className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-36"
 />
 <button
 onClick={() => setShowJoinInput(false)}
 className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
 >
 取消
 </button>
 </div>
 )}
 {!isOwner && !isMember && !showJoinInput && space?.visibility === 'private' && (
 <button
 onClick={() => setShowJoinInput(true)}
 className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
 >
 附言申请
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Announcements Banner (always shows) */}
 {announcements.filter(a => a.importance === 'urgent' || a.importance === 'important').length > 0 && (
 <div className="mb-4 space-y-2">
 {announcements.filter(a => a.importance === 'urgent' || a.importance === 'important').map(ann => (
 <div key={ann.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
 ann.importance === 'urgent'
 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
 : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
 }`}>
 <Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${
 ann.importance === 'urgent' ? 'text-red-500' : 'text-amber-500'
 }`} />
 <div>
 <p className={`text-sm font-medium ${
 ann.importance === 'urgent' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
 }`}>{ann.title}</p>
 <p className={`text-xs mt-0.5 ${
 ann.importance === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
 }`}>{ann.body}</p>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Tab Bar: Modules + Settings in same row */}
 <div className="mb-4 flex items-center border-b border-gray-200 dark:border-gray-700 gap-0.5">
 <div className="flex-1 flex items-center gap-0.5 overflow-x-auto">
 {availableTabs.map((tab) => {
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
 activeTab === tab.id
 ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
 : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
 }`}
 >
 <span className="text-base">{tab.icon}</span>
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* Edit Community Dialog */}
 {showEditDialog && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditDialog(false)}>
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">编辑社区</h3>
 <div className="space-y-3">
 <div>
 <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名称</label>
 <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
 </div>
 <div>
 <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">描述</label>
 <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
 </div>
 <div>
 <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">图标</label>
 <div className="flex items-center gap-3">
 {editForm.icon_url ? (
 <img src={editForm.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
 ) : (
 <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
 <ImageIcon className="h-5 w-5" />
 </div>
 )}
 <label className="flex-1">
 <input type="file" accept="image/*" className="hidden" disabled={uploadingIcon}
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
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
 }}
 />
 <span className="px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 text-gray-500 hover:text-primary-600 transition-colors block text-center">
 {uploadingIcon ? '上传中...' : editForm.icon_url ? '更换图标' : '选择图标'}
 </span>
 </label>
 {editForm.icon_url && (
 <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => setEditForm(prev => ({ ...prev, icon_url: '' }))}>移除</button>
 )}
 </div>
 </div>
 <div>
 <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">封面</label>
 <div className="space-y-2">
 {editForm.banner_url && (
 <img src={editForm.banner_url} alt="" className="w-full h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
 )}
 <label>
 <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
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
 }}
 />
 <span className="px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 text-gray-500 hover:text-primary-600 transition-colors block text-center">
 {uploadingBanner ? '上传中...' : editForm.banner_url ? '更换封面' : '选择封面 (推荐 1200×400)'}
 </span>
 </label>
 {editForm.banner_url && (
 <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => setEditForm(prev => ({ ...prev, banner_url: '' }))}>移除封面</button>
 )}
 </div>
 </div>
 </div>
 <div className="flex items-center justify-end gap-2 mt-4">
 <button onClick={() => setShowEditDialog(false)}
 className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">取消</button>
 <button onClick={async () => {
 setEditSaving(true);
 try {
 await apiSpaces.update(cleanNamespace, {
 title: editForm.title.trim() || undefined,
 description: editForm.description.trim() || undefined,
 icon_url: editForm.icon_url,
 banner_url: editForm.banner_url,
 });
 setSpace((prev: any) => prev ? { ...prev, title: editForm.title, description: editForm.description, icon_url: editForm.icon_url, banner_url: editForm.banner_url } : prev);
 setShowEditDialog(false);
 } catch (e: any) { alert(e?.message || '保存失败'); }
 setEditSaving(false);
 }}
 disabled={editSaving}
 className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
 {editSaving ? '保存中...' : '保存'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="flex gap-6">
 <main className="flex-1 max-w-3xl">
 {/* === Overview Tab — 各模块动态聚合 === */}
 {activeTab === 'overview' && (
 <div className="space-y-5">
 {/* Community Description */}
 {space.description && (
 <div className="glass-card p-6">
 <div className="flex items-center gap-2 mb-3">
 <Layout className="h-4 w-4 text-gray-400" />
 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">关于</h3>
 </div>
 <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
 {space.description}
 </div>
 <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
 <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {formatCount(space.member_count)} 成员</span>
 <span>·</span>
 <span>{formatCount(space.post_count)} 帖子</span>
 <span>·</span>
 <span>{polls.length} 投票</span>
 <span>·</span>
 <span>{overviewVideos.length} 视频</span>
 <span>·</span>
 <span>{announcements.length} 公告</span>
 <span>·</span>
 <span className="capitalize">{{public:'公开', private:'私有', unlisted:'不公开'}[space.visibility]}</span>
 </div>
 </div>
 )}

 {/* Featured/Pinned Posts */}
 {featured.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-3">
 <Pin className="h-4 w-4 text-amber-500" />
 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">精选内容</h3>
 </div>
 <div className="space-y-2">
 {featured.slice(0, 4).map((post) => (
 <Link key={post.id} href={buildPostLink(post.id, cleanNamespace)}
 className="glass-card block hover:border-primary-400 dark:hover:border-primary-600 transition-colors group py-3 px-4">
 <div className="flex items-center gap-2">
 <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
 <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
 {post.title}
 </h4>
 </div>
 <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 ml-6">
 {post.body?.replace(/<[^>]+>/g, '').slice(0, 150)}
 </p>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* 社区动态 — 各模块内容聚合 */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <MessageCircle className="h-4 w-4 text-gray-400" />
 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">社区动态</h3>
 </div>
 {postLoading ? (
 <div className="glass-card py-6 text-center text-gray-400 animate-pulse">加载中...</div>
 ) : posts.length > 0 ? (
 <div className="space-y-1">
 {posts.slice(0, 20).map((post) => {
 const moduleIcon = getModuleEmoji(post.module_type);
 const moduleLabel = spaceModules.find(m => m.module_key === post.module_type)?.name || post.module_type || '交流';
 const author = (post.author || {}) as any;
 const authorUsername = author.username || '';
 const bodyPreview = post.body?.replace(/<[^>]+>/g, '').slice(0, 120) || '';
 return (
 <Link key={post.id} href={`/post/${post.id}?space=${encodeURIComponent(cleanNamespace)}`
 } className="block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors rounded-lg border-b border-gray-100 dark:border-gray-800 last:border-0">
 {/* Module / Title line */}
 <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex-wrap">
 <span>{moduleIcon}</span>
 <span className="font-medium text-primary-600 dark:text-primary-400">{moduleLabel}</span>
 <span className="text-gray-300 dark:text-gray-600">/</span>
 <span className="text-gray-900 dark:text-white font-semibold truncate">
 {post.title || '无标题'}
 </span>
 </div>
 {/* Preview */}
 {bodyPreview && (
 <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5 ml-5">
 {bodyPreview}
 </p>
 )}
 {/* Author + Social stats */}
 <div className="flex items-center gap-3 ml-5 text-xs text-gray-400">
 <Link href={`/profile/${authorUsername}`} onClick={e => e.stopPropagation()} className="hover:text-primary-600 dark:hover:text-primary-400">
 @{authorUsername}
 </Link>
 <span>·</span>
 <span>{new Date(post.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
 <span className="flex items-center gap-1">👍 {post.like_count || 0}</span>
 <span className="flex items-center gap-1">💬 {post.comment_count || 0}</span>
 <span className="flex items-center gap-1">👁 {post.view_count || 0}</span>
 </div>
 </Link>
 );
 })}
 </div>
 ) : (
 <div className="glass-card py-8 text-center text-gray-400 dark:text-gray-500">
 <PenLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm">还没有内容</p>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
 发布第一篇帖子
 </Link>
 </div>
 )}
 </div>

 {/* 最新视频 */}
 {overviewVideos.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-3">
 <Video className="h-4 w-4 text-gray-400" />
 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最新视频</h3>
 <Link href={`/space/${encodeURIComponent(cleanNamespace)}/video`} className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline">
 查看全部 →
 </Link>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {overviewVideos.slice(0, 6).map((v: any) => (
 <Link key={v.id} href={`/video/${v.id}?space=${encodeURIComponent(cleanNamespace)}`}
 className="group block">
 <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
 {v.thumbnail_url ? (
 <Image src={v.thumbnail_url!} alt={v.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
 <Video className="h-8 w-8 text-gray-400" />
 </div>
 )}
 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
 <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
 </div>
 </div>
 {v.duration_seconds && (
 <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
 {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, '0')}
 </div>
 )}
 </div>
 <h3 className="mt-1.5 text-xs font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">{v.title}</h3>
 <span className="text-xs text-gray-400">{v.view_count || 0} 次播放</span>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 )}


 {/* === Series Tab === */}
 {activeTab === 'series' && (
 <>
 {/* Create series button */}
 <div className="mb-4">
 {!showCreateSeries ? (
 <button
 onClick={() => setShowCreateSeries(true)}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group w-full text-left"
 >
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <BookOpen className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">创建系列</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">将文章组织成系列/专栏合集</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 新建
 </div>
 </button>
 ) : (
 <div className="glass-card p-6">
 <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">创建新系列</h3>
 <input
 type="text"
 placeholder="系列标题（如：游戏开发入门）"
 value={newSeriesTitle}
 onChange={e => setNewSeriesTitle(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
 />
 <textarea
 placeholder="系列简介（可选）"
 value={newSeriesDesc}
 onChange={e => setNewSeriesDesc(e.target.value)}
 rows={2}
 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3"
 />
 <div className="flex items-center gap-2">
 <button
 onClick={handleCreateSeries}
 disabled={seriesCreating}
 className="btn-primary text-xs px-4 py-1.5"
 >
 {seriesCreating ? '创建中...' : '创建系列'}
 </button>
 <button
 onClick={() => { setShowCreateSeries(false); setNewSeriesTitle(''); setNewSeriesDesc(''); }}
 className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5"
 >
 取消
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Series list */}
 {seriesLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载系列...</div>
 ) : seriesList.length > 0 ? (
 <div className="space-y-3">
 {seriesList.map((s) => (
 <SeriesCard key={s.id} series={s} namespace={cleanNamespace} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无系列</p>
 <p className="text-sm mt-1">创建系列来组织你的文章合集</p>
 </div>
 )}
 </>
 )}

 {/* === Membership Tab === */}
 {activeTab === 'membership' && (
 <>
 <div className="mb-4">
 <div className="glass-card p-6">
 <div className="flex items-center gap-2 mb-3">
 <Crown className="h-4 w-4 text-amber-500" />
 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">会员等级</h3>
 {isOwner && (
 <button onClick={() => { setShowTierForm(!showTierForm); setEditingTier(null); setTierForm({ name: '', price_cents: '0', description: '', benefits: '' }); }} className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
 <Plus className="h-3 w-3" />{showTierForm ? '收起' : '管理等级'}
 </button>
 )}
 </div>
 {isOwner && showTierForm && (
 <div className="mb-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10 p-4">
 <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{editingTier ? '编辑等级' : '创建等级'}</h4>
 <div className="space-y-2">
 <input type="text" placeholder="等级名称" value={tierForm.name}
 onChange={e => setTierForm({ ...tierForm, name: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
 <div className="flex gap-2">
 <input type="number" placeholder="价格（分）" value={tierForm.price_cents}
 onChange={e => setTierForm({ ...tierForm, price_cents: e.target.value })}
 className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
 </div>
 <textarea placeholder="等级描述（可选）" value={tierForm.description}
 onChange={e => setTierForm({ ...tierForm, description: e.target.value })}
 rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
 <input type="text" placeholder="权益（逗号分隔，如：全部文章,评论权限）" value={tierForm.benefits}
 onChange={e => setTierForm({ ...tierForm, benefits: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
 <div className="flex gap-2 pt-1">
 <button onClick={async () => {
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
 // Refresh
 const tRes = await tiers.list(cleanNamespace);
 if (tRes.code === 0) setSpaceTiers(tRes.data || []);
 } catch (e: any) { alert(e?.message || '保存失败'); }
 finally { setTierSaving(false); }
 }} disabled={tierSaving} className="btn-primary text-xs px-4 py-2">
 {tierSaving ? '保存中...' : editingTier ? '更新' : '创建'}
 </button>
 <button onClick={() => { setShowTierForm(false); setEditingTier(null); }} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2">取消</button>
 </div>
 </div>
 </div>
 )}
 {mySubscription && (
 <div className="mb-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
 <p className="text-sm font-medium text-green-700 dark:text-green-400">你已是付费会员</p>
 <p className="text-xs text-green-600 dark:text-green-500 mt-1">订阅生效中</p>
 </div>
 )}
 {tiersLoading ? (
 <div className="text-center py-6 text-gray-400 animate-pulse">加载会员等级...</div>
 ) : spaceTiers.length > 0 ? (
 <div className="space-y-3">
 {spaceTiers.map((tier: any) => {
 const benefits: string[] = Array.isArray(tier.benefits) ? tier.benefits : [];
 const isMyTier = mySubscription?.tier_id === tier.id;
 const price = (tier.price_cents / 100).toFixed(0);
 return (
 <div key={tier.id} className={'rounded-lg border p-4 ' + (isMyTier ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700')}>
 {isOwner && (<div className="flex gap-1 shrink-0 mb-3">
 <button onClick={(e) => { e.preventDefault(); e.stopPropagation();
 setEditingTier({ id: tier.id, name: tier.name, price_cents: tier.price_cents, description: tier.description, benefits: tier.benefits });
 setTierForm({ name: tier.name, price_cents: String(tier.price_cents), description: tier.description, benefits: Array.isArray(tier.benefits) ? tier.benefits.join(', ') : '' });
 setShowTierForm(true);
 }} title="编辑" className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
 <Pencil className="h-3.5 w-3.5" />
 </button>
 <button onClick={async (e) => { e.preventDefault(); e.stopPropagation();
 if (!confirm('确定删除等级 "' + tier.name + '" 吗？')) return;
 try {
 await tiers.delete(cleanNamespace, tier.id);
 const tRes = await tiers.list(cleanNamespace);
 if (tRes.code === 0) setSpaceTiers(tRes.data || []);
 } catch (e: any) { alert(e?.message || '删除失败'); }
 }} title="删除" className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>)}
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <h4 className="text-base font-bold text-gray-900 dark:text-white">{tier.name}</h4>
 {isMyTier && <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">当前订阅</span>}
 </div>
 {tier.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>}
 <div className="mt-2"><span className="text-2xl font-bold text-gray-900 dark:text-white">{price}</span><span className="text-sm text-gray-500 dark:text-gray-400"> {tier.currency === 'CNY' ? '元' : tier.currency}/月</span></div>
 {benefits.length > 0 && (
 <ul className="mt-3 space-y-1">
 {benefits.map((b: string, i: number) => (<li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"><span className="text-green-500">&#x2713;</span> {b}</li>))}
 </ul>
 )}
 </div>
 <button
 onClick={async () => {
 const token = getToken();
 if (!token) { alert('请先登录'); return; }
 if (isMyTier) {
 if (!confirm('确定要取消订阅吗？')) return;
 setSubscribing(tier.id);
 try { await subscribe.cancel(cleanNamespace); setMySubscription(null); } catch (e: any) { alert(e?.message || '取消失败'); } finally { setSubscribing(null); }
 } else {
 setSubscribing(tier.id);
 try {
 const res = await subscribe.join(cleanNamespace, tier.id);
 if (res.code === 0) { const sRes = await subscribe.get(cleanNamespace); if (sRes.code === 0 && sRes.data) setMySubscription(sRes.data); }
 else { alert(res.message || '订阅失败'); }
 } catch (e: any) { alert(e?.message || '订阅失败'); } finally { setSubscribing(null); }
 }
 }}
 disabled={subscribing === tier.id}
 className={'shrink-0 ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (isMyTier ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600' : 'bg-amber-500 hover:bg-amber-600 text-white')}
 >
 {subscribing === tier.id ? '处理中...' : isMyTier ? '取消订阅' : tier.price_cents > 0 ? '订阅' : '免费加入'}
 </button>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-400 dark:text-gray-500">
 <Crown className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无会员等级</p>
 <p className="text-sm mt-1">社区尚未设置付费会员等级</p>
 </div>
 )}
 </div>
 </div>
 </>
 )}

 {/* === Wiki Tab（知识库 — 所有成员可编辑）=== */}
 {activeTab === 'wiki' && (
 <>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=wiki`}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <Library className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">编写知识库页面</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，所有成员可编辑</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 创建
 </div>
 </Link>

 {postLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
 ) : posts.filter(p => p.module_type === 'wiki').length > 0 ? (
 <div className="space-y-3">
 {posts.filter(p => p.module_type === 'wiki').map((post) => (
 <PostCard key={post.id} post={{
 id: post.id,
 title: post.title,
 body: post.body,
 author: post.author,
 space_id: post.space_id,
 space_ns: cleanNamespace,
 space_name: space.title,
 like_count: post.like_count,
 comment_count: post.comment_count,
 view_count: post.view_count,
 created_at: post.created_at,
 tags: post.tags,
 is_pinned: post.is_pinned,
 module_type: post.module_type,
 }} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <Library className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无知识库页面</p>
 <p className="text-sm mt-1">创建第一篇知识库文档吧！</p>
 </div>
 )}
 </>
 )}

 {/* === Share Tab（分享 — 仅创建者可发布）=== */}
 {activeTab === 'share' && (
 <>
 {isOwner ? (
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=share`}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <PenLine className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">发布分享</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，仅创建者可发布</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 发布
 </div>
 </Link>
 ) : (
 <div className="glass-card mb-4 py-4 px-4 text-center">
 <Share2 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
 <p className="text-sm text-gray-500 dark:text-gray-400">此模块仅社区创建者可发布内容</p>
 </div>
 )}

 {postLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载帖子...</div>
 ) : posts.filter(p => p.module_type === 'share').length > 0 ? (
 <div className="space-y-3">
 {posts.filter(p => p.module_type === 'share').map((post) => (
 <PostCard key={post.id} post={{
 id: post.id,
 title: post.title,
 body: post.body,
 author: post.author,
 space_id: post.space_id,
 space_ns: cleanNamespace,
 space_name: space.title,
 like_count: post.like_count,
 comment_count: post.comment_count,
 view_count: post.view_count,
 created_at: post.created_at,
 tags: post.tags,
 is_pinned: post.is_pinned,
 module_type: post.module_type,
 }} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <Share2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无分享内容</p>
 {isOwner && <p className="text-sm mt-1">发布你的第一篇分享吧！</p>}
 </div>
 )}
 </>
 )}

 {/* === Polls Tab === */}
 {activeTab === 'polls' && (
 <>
 <Link href={`/polls/new?space=${encodeURIComponent(cleanNamespace)}`}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <Vote className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">发起投票</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">创建单选/多选投票问卷</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 创建
 </div>
 </Link>

 {polls.length > 0 ? (
 <div className="space-y-3">
 {polls.map((poll) => (
 <PollCard key={poll.id} poll={poll} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无投票</p>
 <p className="text-sm mt-1">发起第一个投票吧！</p>
 </div>
 )}
 </>
 )}

 {/* === Announcements Tab === */}
 {activeTab === 'announcements' && (
 <div className="space-y-3">
 {announcements.length > 0 ? (
 announcements.map(ann => (
 <div key={ann.id} className={`card ${
 ann.importance === 'urgent' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
 ann.importance === 'important' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : ''
 }`}>
 <div className="flex items-center gap-2 mb-1">
 <Megaphone className={`h-4 w-4 ${
 ann.importance === 'urgent' ? 'text-red-500' :
 ann.importance === 'important' ? 'text-amber-500' : 'text-gray-400'
 }`} />
 <h3 className="font-medium text-gray-900 dark:text-white">{ann.title}</h3>
 {ann.importance !== 'normal' && (
 <span className={`text-xs px-1.5 py-0.5 rounded ${
 ann.importance === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
 }`}>
 {{'urgent':'紧急','important':'重要'}[ann.importance] || ann.importance}
 </span>
 )}
 </div>
 <p className="text-sm text-gray-600 dark:text-gray-400">{ann.body}</p>
 </div>
 ))
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无公告</p>
 </div>
 )}
 </div>
 )}

 {/* === Members Tab === */}
 {activeTab === 'members' && (
 <>
 {/* Join Requests Section (owner/admin only) */}
 {isOwner && <JoinRequestsPanel namespace={cleanNamespace} />}

 {membersLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
 ) : members.length > 0 ? (
 <div className="space-y-2">
 {members.map((m) => (
 <div
 key={m.user.id}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group overflow-visible"
 >
 <Link href={`/profile/${m.user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
 {(m.user.display_name || m.user.username).charAt(0).toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
 {m.user.display_name || m.user.username}
 </span>
 {m.user.verified && (
 <span className="text-blue-500 text-xs">✓</span>
 )}
 </div>
 <p className="text-xs text-gray-400 dark:text-gray-500">
 @{m.user.username}
 </p>
 </div>
 </Link>
 {/* Role badge + management: inline for owner, static for others */}
 {isOwner && m.role !== 'owner' ? (
 <MemberActions
 namespace={cleanNamespace}
 userId={m.user.id}
 username={m.user.username}
 currentRole={m.role}
 onAction={() => {
 fetch(`/api/spaces/${cleanNamespace}/members`)
 .then(r => r.json())
 .then(data => {
 if (data.code === 0 && Array.isArray(data.data)) {
 setMembers(data.data);
 }
 })
 .catch(() => {});
 }}
 />
 ) : (
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
 m.role === 'owner' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' :
 m.role === 'moderator' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
 m.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
 }`}>
 {{'owner': '创建者', 'moderator': '管理员', 'admin': '管理员', 'member': '成员'}[m.role] || m.role}
 </span>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无成员</p>
 <p className="text-sm mt-1">成为第一个加入的成员吧！</p>
 </div>
 )}
 </>
 )}

 {/* === Chat Tab（v0.3.0 — 实时聊天）=== */}
 {activeTab === 'chat' && (
 <div className="glass-card overflow-hidden">
 <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
 <MessageSquare className="h-4 w-4 text-primary-600" />
 <span className="font-medium text-sm text-gray-900 dark:text-white">社区聊天室</span>
 </div>
 <SpaceChat namespace={cleanNamespace} />
 </div>
 )}

 {activeTab === 'video' && (
 <SpaceVideoTab namespace={cleanNamespace} spaceId={space?.id || null} isOwner={isOwner} />
 )}

 {activeTab === 'code_repo' && (
 <SpaceCodeRepo namespace={cleanNamespace} />
 )}

 {/* === QA Tab（问答 — 提问与回答）=== */}
 {activeTab === 'qa' && (
 <>
 {/* 顶部操作栏 */}
 <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=qa`}
 className="btn-primary text-xs px-4 py-1.5 gap-1.5 flex items-center">
 <Plus className="h-3.5 w-3.5" /> 提出问题
 </Link>
 {/* 状态筛选 */}
 <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
 {[
 { value: 'all', label: '全部' },
 { value: 'unsolved', label: '待回答' },
 { value: 'solved', label: '已解决' },
 ].map((btn) => (
 <button key={btn.value}
 onClick={() => {/* 后续：状态筛选 */}}
 className={`text-xs px-3 py-1 rounded-md transition-colors ${
 btn.value === 'all'
 ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
 : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
 }`}>
 {btn.label}
 </button>
 ))}
 </div>
 </div>

 {/* 排序 */}
 <div className="flex items-center gap-2 mb-4 text-xs">
 <span className="text-gray-400">排序:</span>
 <select className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500">
 <option value="newest">最新提问</option>
 <option value="votes">最多投票</option>
 <option value="answers">最多回答</option>
 <option value="unanswered">尚未回答</option>
 </select>
 </div>

 {postLoading ? (
 <div className="space-y-3">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="glass-card p-4 animate-pulse">
 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3" />
 <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
 <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
 </div>
 ))}
 </div>
 ) : posts.filter(p => p.module_type === 'qa').length > 0 ? (
 <div className="space-y-2">
 {posts.filter(p => p.module_type === 'qa').map((post) => (
 <QACard
 key={post.id}
 post={{
 id: post.id,
 title: post.title,
 body: post.body,
 author: post.author,
 tags: post.tags,
 like_count: post.like_count,
 comment_count: post.comment_count,
 view_count: post.view_count,
 created_at: post.created_at,
 is_pinned: post.is_pinned,
 }}
 spaceNs={cleanNamespace}
 spaceName={space.title}
 />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
 <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p className="text-base font-medium text-gray-500 dark:text-gray-400">暂无问答</p>
 <p className="text-sm mt-1">提出第一个问题，开启社区讨论</p>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=qa`}
 className="btn-primary inline-flex items-center gap-1.5 mt-4 px-5 py-2 text-sm">
 <Plus className="h-4 w-4" /> 提出问题
 </Link>
 </div>
 )}
 </>
 )}

 {/* === Novel Tab（小说/阅读 — 书架展示）=== */}
 {activeTab === 'novel' && (
 <>
 {/* 顶部操作栏 */}
 <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=novel`}
 className="btn-primary text-xs px-4 py-1.5 gap-1.5 flex items-center">
 <Plus className="h-3.5 w-3.5" /> 发布小说
 </Link>
 <div className="flex items-center gap-1.5">
 <button onClick={() => {/* 后续: 列表模式切换 */}}
 className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-colors" title="书架视图">
 <Grid3X3 className="h-4 w-4" />
 </button>
 <button onClick={() => {/* 后续: 列表模式切换 */}}
 className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="列表视图">
 <List className="h-4 w-4" />
 </button>
 </div>
 </div>

 {/* 排序 + 筛选 */}
 <div className="flex items-center gap-2 mb-4 text-xs">
 <span className="text-gray-400">排序:</span>
 <select className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500">
 <option value="updated">最近更新</option>
 <option value="views">最多阅读</option>
 <option value="likes">最多点赞</option>
 <option value="newest">最新发布</option>
 </select>
 </div>

 {postLoading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
 <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700" />
 <div className="p-3 space-y-2">
 <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
 </div>
 </div>
 ))}
 </div>
 ) : posts.filter(p => p.module_type === 'novel').length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
 {posts.filter(p => p.module_type === 'novel').map((post) => (
 <NovelCard
 key={post.id}
 novel={adaptPostToNovel(post, cleanNamespace, space.title)}
 />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
 <BookText className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p className="text-base font-medium text-gray-500 dark:text-gray-400">暂无小说内容</p>
 <p className="text-sm mt-1">发布你的第一篇作品，开启创作之旅</p>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=novel`}
 className="btn-primary inline-flex items-center gap-1.5 mt-4 px-5 py-2 text-sm">
 <Plus className="h-4 w-4" /> 开始创作
 </Link>
 </div>
 )}
 </>
 )}

 {/* === Game Tab（游戏 — 游戏内容讨论与分享）=== */}
 {activeTab === 'game' && (
 <>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=game`}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <Gamepad2 className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">发布游戏内容</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，分享游戏攻略、评测、资讯</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 发布
 </div>
 </Link>

 {postLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
 ) : posts.filter(p => p.module_type === 'game').length > 0 ? (
 <div className="space-y-3">
 {posts.filter(p => p.module_type === 'game').map((post) => (
 <GameCard key={post.id} post={{
 id: post.id,
 title: post.title,
 body: post.body,
 author: post.author,
 like_count: post.like_count,
 comment_count: post.comment_count,
 view_count: post.view_count,
 created_at: post.created_at,
 tags: post.tags,
 is_pinned: post.is_pinned,
 }} spaceNs={cleanNamespace} spaceName={space.title} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <Gamepad2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无游戏内容</p>
 <p className="text-sm mt-1">发布你的第一篇游戏攻略吧！</p>
 </div>
 )}
 </>
 )}

 {/* === MiniApp Tab（小程序 — 嵌入式小应用）=== */}
 {activeTab === 'mini_app' && (
 <>
 <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=mini_app`}
 className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
 <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
 <AppWindow className="h-5 w-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900 dark:text-white">发布小程序</p>
 <p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，发布小程序介绍与使用说明</p>
 </div>
 <div className="btn-primary text-xs px-4 py-1.5 gap-1">
 <Plus className="h-3.5 w-3.5" /> 发布
 </div>
 </Link>

 {postLoading ? (
 <div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
 ) : posts.filter(p => p.module_type === 'mini_app').length > 0 ? (
 <div className="space-y-3">
 {posts.filter(p => p.module_type === 'mini_app').map((post) => (
 <PostCard key={post.id} post={{
 id: post.id,
 title: post.title,
 body: post.body,
 author: post.author,
 space_id: post.space_id,
 space_ns: cleanNamespace,
 space_name: space.title,
 like_count: post.like_count,
 comment_count: post.comment_count,
 view_count: post.view_count,
 created_at: post.created_at,
 tags: post.tags,
 is_pinned: post.is_pinned,
 module_type: post.module_type,
 }} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
 ))}
 </div>
 ) : (
 <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
 <AppWindow className="h-10 w-10 mx-auto mb-3 opacity-30" />
 <p>暂无小程序内容</p>
 <p className="text-sm mt-1">发布你的第一个小程序吧！</p>
 </div>
 )}
 </>
 )}

 {activeTab === 'store' && (
 <SpaceStore namespace={cleanNamespace} isOwner={isOwner} />
 )}

 {activeTab === 'course' && (
 <div className="glass-card py-10 text-center rounded-2xl">
 <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
 <GraduationCap className="h-8 w-8 text-white" />
 </div>
 <p className="text-base font-semibold text-gray-700 dark:text-gray-300">课程模块</p>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">在线课程功能即将上线</p>
 <div className="mt-5 grid grid-cols-3 gap-2 max-w-xs mx-auto">
 {['视频课程', '图文教程', '互动测验'].map(f => (
 <span key={f} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{f}</span>
 ))}
 </div>
 </div>
 )}

	 {/* === 动态模块通用渲染 (所有模块统一走此路径 — 包括 forum) === */}
	 {(() => {
	   const KNOWN_TABS = new Set(['overview','wiki','share','polls','announcements','members','chat','video','code_repo','qa','novel','game','mini_app','store','course','analytics','series','membership']);
	   const currentMod = spaceModules.find(m => m.module_key === activeTab);
	   if (!currentMod || KNOWN_TABS.has(activeTab)) return null;
	   const hasArticle = !currentMod.allowed_content_types || currentMod.allowed_content_types.includes('article');
	   const hasVideo = !currentMod.allowed_content_types || currentMod.allowed_content_types.includes('video');
	   const filteredPosts = posts.filter((p: any) => p.module_type === currentMod.module_key);
	   return (
	     <div>
	       <div className="flex items-center justify-between mb-4">
	         <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{currentMod.name}</h3>{hasArticle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">文章</span>}{hasVideo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">视频</span>}</div>
	         <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=${encodeURIComponent(currentMod.module_key)}`}
	           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors">
	           <Plus size={14} />发布
	         </Link>
	       </div>

	       {/* 排序 + 显示已隐藏 */}
	       <div className="flex items-center gap-2 mb-4 flex-wrap">
	         <span className="text-xs text-gray-500 dark:text-gray-400">排序:</span>
	         <select
	           value={postSort}
	           onChange={(e) => setPostSort(e.target.value)}
	           className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
	         >
	           <option value="newest">最新</option>
	           <option value="views">最多浏览</option>
	           <option value="likes">最多点赞</option>
	         </select>
	         {isOwner && (
	           <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ml-2">
	             <input
	               type="checkbox"
	               checked={showHiddenPosts}
	               onChange={(e) => setShowHiddenPosts(e.target.checked)}
	               className="h-3.5 w-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
	             />
	             显示已隐藏
	           </label>
	         )}
	       </div>

	       {/* Normal announcements */}
	       {announcements.filter(a => a.importance === 'normal').length > 0 && (
	         <div className="mb-4 space-y-2">
	           <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
	             <Megaphone className="h-3 w-3" /> 公告
	           </h4>
	           {announcements.filter(a => a.importance === 'normal').map(ann => (
	             <div key={ann.id} className="glass-card py-2.5 px-4">
	               <p className="text-sm font-medium text-gray-900 dark:text-white">{ann.title}</p>
	               <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ann.body}</p>
	             </div>
	           ))}
	         </div>
	       )}

	       {postLoading ? (
	         <div className="glass-card py-8 text-center text-gray-400">加载中...</div>
	       ) : filteredPosts.length > 0 ? (
	         <div className="space-y-2">
	           {filteredPosts.map((p: any) => (
	             <PostCard key={p.id} post={{
	               id: p.id,
	               title: p.title,
	               body: p.body,
	               author: p.author,
	               space_id: p.space_id,
	               space_ns: cleanNamespace,
	               space_name: space?.title,
	               like_count: p.like_count,
	               comment_count: p.comment_count,
	               view_count: p.view_count,
	               created_at: p.created_at,
	               tags: p.tags,
	               is_pinned: p.is_pinned,
	               is_hidden: p.is_hidden,
	               module_type: p.module_type,
	               module_label: currentMod.name,
	               }} canPin={isOwner && !p.is_hidden} onTogglePin={() => togglePin(p.id, p.is_pinned)} canHide={isOwner} onToggleHide={() => toggleHide(p.id)} isFeatured={p.is_featured} canFeature={isOwner && !p.is_hidden} onToggleFeature={() => toggleFeature(p.id, p.is_featured)} canUnhide={isOwner && p.is_hidden} onToggleUnhide={() => toggleUnhide(p.id)} />
	           ))}
	         </div>
	       ) : (
	         <div className="glass-card py-8 text-center text-gray-400 dark:text-gray-500">
	           <PenLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
	           <p className="text-sm">还没有内容</p>
	           <Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=${encodeURIComponent(currentMod.module_key)}`}
	             className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
	             发布第一篇帖子
	           </Link>
	         </div>
	       )}

	       {/* 分页 */}
	       {postTotalPages > 1 && (
	         <div className="mt-4 flex items-center justify-center gap-2">
	           <button onClick={() => goToPostPage(postPage - 1)} disabled={postPage <= 1}
	             className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
	             ← 上一页
	           </button>
	           {(() => {
	             const pages: (number | string)[] = [];
	             const maxShow = 7;
	             const p = postPage;
	             const t = postTotalPages;
	             if (t <= maxShow) {
	               for (let i = 1; i <= t; i++) pages.push(i);
	             } else {
	               pages.push(1);
	               if (p > 3) pages.push('...');
	               const start = Math.max(2, p - 1);
	               const end = Math.min(t - 1, p + 1);
	               for (let i = start; i <= end; i++) pages.push(i);
	               if (p < t - 2) pages.push('...');
	               pages.push(t);
	             }
	             return pages.map((pg, i) =>
	               typeof pg === 'number' ? (
	                 <button key={i} onClick={() => goToPostPage(pg)}
	                   className={'w-9 h-9 rounded-full text-sm font-medium transition-colors ' +
	                     (pg === postPage ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800')}>
	                   {pg}
	                 </button>
	               ) : (
	                 <span key={i} className="px-1 text-gray-400 select-none">…</span>
	               )
	             );
	           })()}
	           <button onClick={() => goToPostPage(postPage + 1)} disabled={postPage >= postTotalPages}
	             className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
	             下一页 →
	           </button>
	         </div>
	       )}
	       {postTotalPages > 0 && filteredPosts.length > 0 && (
	         <div className="mt-2 pb-8 text-center text-xs text-gray-400">
	           第 {postPage}/{postTotalPages} 页
	         </div>
	       )}
	     </div>
	   );
	 })()}

 {/* === Analytics Tab (空间创建者专属) === */}
 {activeTab === 'analytics' && isOwner && (
 <SpaceAnalytics namespace={cleanNamespace} spaceTitle={space?.title} />
 )}
 </main>

 {/* Right sidebar */}
 <aside className="w-72 shrink-0 hidden xl:block">
 <div className="sticky top-20 space-y-4">
 <div className="glass-card p-6">
 <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">关于社区</h3>
 <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
 <div className="flex justify-between">
 <span>命名空间</span>
 <span className="text-gray-700 dark:text-gray-300 font-mono">/{displayNs}</span>
 </div>
 {ownerName && (
 <div className="flex justify-between">
 <span>创建者</span>
 <Link href={`/profile/${ownerName}`} className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
 @{ownerName}
 </Link>
 </div>
 )}
 <div className="flex justify-between">
 <span>可见性</span>
 <span className="text-gray-700 dark:text-gray-300">
 {{'public':'公开','private':'私有','unlisted':'不公开'}[space.visibility] || space.visibility}
 </span>
 </div>
 <div className="flex justify-between">
 <span>状态</span>
 <span className="text-green-600 dark:text-green-400">活跃</span>
 </div>
 <div className="flex justify-between">
 <span>启用模块</span>
 <span className="text-gray-700 dark:text-gray-300">
 {availableTabs.map(t => t.label).join(' · ')}
 </span>
 </div>
 </div>
 </div>

 {/* Analytics mini card (owner only) */}
 {isOwner && (
 <SpaceAnalyticsMini namespace={cleanNamespace} />
 )}

 {/* Clustered communities info */}
 {/* 同名社区集群面板已移除（不再使用根社区模型） */}
 </div>
 </aside>
 </div>
 </div>
 );
}
