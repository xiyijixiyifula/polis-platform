'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { PollCard } from '@/components/PollCard';
import { SeriesCard } from '@/components/SeriesCard';
import { SpaceSettings, loadModules, saveModules, type SpaceModules } from '@/components/SpaceSettings';
import { Users, Share2, MessageCircle, Plus, PenLine, UserCheck, BarChart3, Megaphone, Vote, Settings, Layout, Pin, ExternalLink, Video, Code, HelpCircle, MessageSquare, ShoppingBag, GraduationCap, BookOpen, Crown } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import type { Space, Post, Series, SpaceTier, Subscription } from '@/lib/api';
import { tiers, subscribe } from '@/lib/api';

interface Announcement {
  id: string; title: string; body: string;
  importance: string; is_pinned: boolean;
  created_at: string;
}

export default function SpacePage() {
  const params = useParams();
  let namespace = '';
  // Decode namespace from browser URL (most reliable for Chinese characters)
  if (typeof window !== 'undefined') {
    const p = window.location.pathname;
    namespace = decodeURIComponent(p.replace(/^\/space\//, ''));
  } else {
    // SSR fallback: use params
    const rawNs = params.namespace;
    namespace = Array.isArray(rawNs)
      ? (rawNs as string[]).map(s => decodeURIComponent(s)).join('/')
      : decodeURIComponent((rawNs as string) || '');
  }

  // Handle sub-routes like /space/tech/posts -> namespace=tech, tab=posts
  const knownSubRoutes = new Set(['posts', 'polls', 'announcements', 'overview',
    'members', 'settings', 'video', 'code_repo', 'qa', 'files', 'series', 'membership']);
  const nsParts = namespace.split('/');
  let urlTab: string | null = null;
  if (nsParts.length > 1 && knownSubRoutes.has(nsParts[nsParts.length - 1])) {
    urlTab = nsParts.pop()!;
    namespace = nsParts.join('/');
  }

  // Module settings (persisted in localStorage)
  const [modules, setModules] = useState<SpaceModules>(() => loadModules(namespace));
  const [showSettings, setShowSettings] = useState(false);

  // Sync modules when namespace changes
  useEffect(() => {
    setModules(loadModules(namespace));
    setShowSettings(false);
  }, [namespace]);

  // Active tab - default to overview (GitHub style)
  const availableTabs = [
    { id: 'overview', label: '概览', icon: Layout, enabled: true },
    { id: 'posts', label: '交流', icon: MessageCircle, enabled: modules.posts },
    { id: 'share', label: '分享', icon: Share2, enabled: modules.share },
    { id: 'series', label: '系列', icon: BookOpen, enabled: modules.series },
    { id: 'membership', label: '会员', icon: Crown, enabled: modules.membership },
    { id: 'video', label: '视频', icon: Video, enabled: modules.video },
    { id: 'code_repo', label: '代码', icon: Code, enabled: modules.code_repo },
    { id: 'qa', label: '问答', icon: HelpCircle, enabled: modules.qa },
    { id: 'polls', label: '投票', icon: BarChart3, enabled: modules.polls },
    { id: 'announcements', label: '公告', icon: Megaphone, enabled: modules.announcements },
    { id: 'chat', label: '聊天', icon: MessageSquare, enabled: modules.chat },
    { id: 'store', label: '商城', icon: ShoppingBag, enabled: modules.store },
    { id: 'course', label: '课程', icon: GraduationCap, enabled: modules.course },
    { id: 'members', label: '成员', icon: UserCheck, enabled: modules.members },
  ].filter(t => t.enabled);

  const [activeTab, setActiveTab] = useState(urlTab || 'overview');
  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'overview');
    }
  }, [modules]);

  const [space, setSpace] = useState<Space | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [featured, setFeatured] = useState<Post[]>([]);
  const [subSpaces, setSubSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(null);

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

  // Space ownership + tier management
  const [isOwner, setIsOwner] = useState(false);
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [tierForm, setTierForm] = useState({ name: '', price_cents: '0', description: '', benefits: '' });
  const [tierSaving, setTierSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('polis_user');
      if (stored && space?.owner_id) {
        const me = JSON.parse(stored);
        setIsOwner(me.id === space.owner_id);
      }
    } catch {}
  }, [space?.owner_id]);

  // Parse namespace for GitHub-style display: username/community-name
  const ghParts = namespace.split('/');
  const hasOwnerPrefix = nsParts.length >= 2;
  const displayNs = namespace;
  const communityName = hasOwnerPrefix ? ghParts[ghParts.length - 1] : ghParts[0];
  const ownerSegment = hasOwnerPrefix ? ghParts[0] : null;

  useEffect(() => {
    if (!namespace) return;
    setLoading(true);
    fetch(`/api/spaces/${namespace}`)
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
  }, [namespace]);

  useEffect(() => {
    if (!namespace) return;
    setPostLoading(true);

    const fetchers: Promise<any>[] = [
      fetch(`/api/spaces/${namespace}/posts?page_size=20`).then(r => r.json()),
      fetch(`/api/spaces/${namespace}/featured`).then(r => r.json()).catch(() => ({ code: 0, data: [] })),
    ];

    // Only fetch polls if the module is enabled
    if (modules.polls) {
      fetchers.push(fetch(`/api/spaces/${namespace}/polls`).then(r => r.json()));
    }

    // Always fetch announcements for banners
    fetchers.push(fetch(`/api/spaces/${namespace}/announcements`).then(r => r.json()));

    Promise.all(fetchers)
      .then((results) => {
        const [postsData, featuredData] = results;
        const pollsIdx = modules.polls ? 2 : -1;
        const annIdx = modules.polls ? 3 : 2;

        if (postsData.code === 0) setPosts(postsData.data || []);
        if (featuredData.code === 0) setFeatured(featuredData.data || []);
        if (pollsIdx > 0 && results[pollsIdx]?.code === 0) setPolls(results[pollsIdx].data || []);
        if (results[annIdx]?.code === 0) setAnnouncements(results[annIdx].data || []);
      })
      .catch(() => {})
      .finally(() => setPostLoading(false));
  }, [namespace, modules.polls]);

  // Fetch series list when series tab is active or module is enabled
  useEffect(() => {
    if (!namespace || !modules.series) return;
    if (activeTab === 'series') {
      setSeriesLoading(true);
      fetch(`/api/series/space/${namespace}`)
        .then(r => r.json())
        .then(data => {
          if (data.code === 0) {
            setSeriesList(data.data || []);
          }
        })
        .catch(() => {})
        .finally(() => setSeriesLoading(false));
    }
  }, [namespace, activeTab, modules.series]);

  useEffect(() => {
    if (!namespace || !modules.membership) return;
    if (activeTab === 'membership') {
      setTiersLoading(true);
      Promise.all([
        tiers.list(namespace),
        subscribe.get(namespace).catch(() => ({ code: 0, data: null })),
      ]).then(([tRes, sRes]) => {
        if (tRes.code === 0) setSpaceTiers(tRes.data || []);
        if (sRes.code === 0 && sRes.data) setMySubscription(sRes.data);
      }).catch(() => {}).finally(() => setTiersLoading(false));
    }
  }, [namespace, activeTab, modules.membership]);

  const handleCreateSeries = async () => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) { alert('请先登录'); return; }
    if (!newSeriesTitle.trim()) { alert('请输入系列标题'); return; }
    setSeriesCreating(true);
    try {
      const res = await fetch(`/api/series/space/${namespace}`, {
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
        const listRes = await fetch(`/api/series/space/${namespace}`);
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
        <p className="mt-2 text-gray-500 dark:text-gray-400">未找到社区 "{namespace}"</p>
        <Link href="/explore" className="btn-primary mt-4 inline-block px-6 py-2">浏览其他社区</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Community Header - GitHub Style */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
            {space.title.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{space.title}</h1>
              {space.is_root && (
                <span className="rounded bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-400">
                  根社区
                </span>
              )}
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
              <span className="font-mono text-gray-700 dark:text-gray-300">/{communityName}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{space.description}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {formatCount(space.member_count)} 成员</span>
              <span>{formatCount(space.post_count)} 帖子</span>
              {announcements.length > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Megaphone className="h-4 w-4" /> {announcements.length} 条公告
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary text-sm px-5 py-2" onClick={async () => {
              const token = localStorage.getItem('polis_access_token');
              if (!token) { alert('请先登录'); return; }
              const res = await fetch(`/api/spaces/${namespace}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
              const data = await res.json();
              alert(data.code === 0 ? '已加入社区！' : data.message || '操作失败');
            }}>加入社区</button>
            <button className="btn-secondary p-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              <Share2 className="h-4 w-4" />
            </button>
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
            const Icon = tab.icon;
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
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Settings button - outside overflow scroll area */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              showSettings
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="模块设置"
          >
            <Settings className="h-4 w-4" />
            设置
          </button>
          {showSettings && (
            <SpaceSettings
              namespace={namespace}
              modules={modules}
              onChange={setModules}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <main className="flex-1 max-w-3xl">
          {/* === Overview Tab — 各模块动态聚合 === */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Community Description */}
              {space.description && (
                <div className="card">
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
                      <Link key={post.id} href={`/post/${post.id}?space=${encodeURIComponent(namespace)}`}
                        className="card block hover:border-primary-300 dark:hover:border-primary-600 transition-colors group py-3 px-4">
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
                  <div className="card py-6 text-center text-gray-400 animate-pulse">加载中...</div>
                ) : posts.length > 0 ? (
                  <div className="space-y-1">
                    {posts.slice(0, 20).map((post) => {
                      const moduleIcon = post.module_type === 'share' ? '🔖' : '📄';
                      const moduleLabel = post.module_type === 'share' ? '分享' : '交流';
                      const author = (post.author || {}) as any;
                      const authorUsername = author.username || '';
                      const bodyPreview = post.body?.replace(/<[^>]+>/g, '').slice(0, 120) || '';
                      return (
                        <Link key={post.id} href={`/post/${post.id}?space=${encodeURIComponent(namespace)}`
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
                  <div className="card py-8 text-center text-gray-400 dark:text-gray-500">
                    <PenLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">还没有内容</p>
                    <Link href={`/post/new?space=${encodeURIComponent(namespace)}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
                      发布第一篇帖子
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === Posts Tab (交流) === */}
          {activeTab === 'posts' && (
            <>
              <Link href={`/post/new?space=${encodeURIComponent(namespace)}&module=forum`}
                className="card flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group mb-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
                  <PenLine className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">发布帖子</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，所有成员可发帖</p>
                </div>
                <div className="btn-primary text-xs px-4 py-1.5 gap-1">
                  <Plus className="h-3.5 w-3.5" /> 发布
                </div>
              </Link>

              {/* Normal announcements in posts feed */}
              {announcements.filter(a => a.importance === 'normal').length > 0 && (
                <div className="mb-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Megaphone className="h-3 w-3" /> 公告
                  </h4>
                  {announcements.filter(a => a.importance === 'normal').map(ann => (
                    <div key={ann.id} className="card py-2.5 px-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ann.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ann.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {postLoading ? (
                <div className="card py-8 text-center text-gray-400 animate-pulse">加载帖子...</div>
              ) : posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={{
                      id: post.id,
                      title: post.title,
                      body: post.body,
                      author: post.author,
                      space_id: post.space_id,
                      space_ns: namespace,
                      space_name: space.title,
                      like_count: post.like_count,
                      comment_count: post.comment_count,
                      view_count: post.view_count,
                      created_at: post.created_at,
                      tags: post.tags,
                      is_pinned: post.is_pinned,
                    }} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>暂无帖子</p>
                  <p className="text-sm mt-1">成为第一个发帖的人吧！</p>
                </div>
              )}
            </>
          )}

          {/* === Series Tab === */}
          {activeTab === 'series' && (
            <>
              {/* Create series button */}
              <div className="mb-4">
                {!showCreateSeries ? (
                  <button
                    onClick={() => setShowCreateSeries(true)}
                    className="card flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group w-full text-left"
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
                  <div className="card">
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
                <div className="card py-8 text-center text-gray-400 animate-pulse">加载系列...</div>
              ) : seriesList.length > 0 ? (
                <div className="space-y-3">
                  {seriesList.map((s) => (
                    <SeriesCard key={s.id} series={s} namespace={namespace} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
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
                <div className="card">
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
                                await tiers.update(namespace, editingTier.id, {
                                  name: tierForm.name.trim(),
                                  price_cents: parseInt(tierForm.price_cents) || 0,
                                  description: tierForm.description.trim(),
                                  benefits,
                                });
                              } else {
                                await tiers.create(namespace, {
                                  name: tierForm.name.trim(),
                                  price_cents: parseInt(tierForm.price_cents) || 0,
                                  description: tierForm.description.trim(),
                                  benefits,
                                });
                              }
                              setShowTierForm(false); setEditingTier(null);
                              // Refresh
                              const tRes = await tiers.list(namespace);
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
                                    await tiers.delete(namespace, tier.id);
                                    const tRes = await tiers.list(namespace);
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
                                  const token = localStorage.getItem('polis_access_token');
                                  if (!token) { alert('请先登录'); return; }
                                  if (isMyTier) {
                                    if (!confirm('确定要取消订阅吗？')) return;
                                    setSubscribing(tier.id);
                                    try { await subscribe.cancel(namespace); setMySubscription(null); } catch (e: any) { alert(e?.message || '取消失败'); } finally { setSubscribing(null); }
                                  } else {
                                    setSubscribing(tier.id);
                                    try {
                                      const res = await subscribe.join(namespace, tier.id);
                                      if (res.code === 0) { const sRes = await subscribe.get(namespace); if (sRes.code === 0 && sRes.data) setMySubscription(sRes.data); }
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

          {/* === Share Tab（分享 — 仅创建者可发布）=== */}
          {activeTab === 'share' && (
            <>
              {isOwner ? (
                <Link href={`/post/new?space=${encodeURIComponent(namespace)}&module=share`}
                  className="card flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group mb-4">
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
                <div className="card mb-4 py-4 px-4 text-center">
                  <Share2 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">此模块仅社区创建者可发布内容</p>
                </div>
              )}

              {postLoading ? (
                <div className="card py-8 text-center text-gray-400 animate-pulse">加载帖子...</div>
              ) : posts.filter(p => p.module_type === 'share' || !p.module_type).length > 0 ? (
                <div className="space-y-3">
                  {posts.filter(p => p.module_type === 'share' || !p.module_type).map((post) => (
                    <PostCard key={post.id} post={{
                      id: post.id,
                      title: post.title,
                      body: post.body,
                      author: post.author,
                      space_id: post.space_id,
                      space_ns: namespace,
                      space_name: space.title,
                      like_count: post.like_count,
                      comment_count: post.comment_count,
                      view_count: post.view_count,
                      created_at: post.created_at,
                      tags: post.tags,
                      is_pinned: post.is_pinned,
                    }} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
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
              <Link href={`/polls/new?space=${encodeURIComponent(namespace)}`}
                className="card flex items-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group mb-4">
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
                <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
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
                <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>暂无公告</p>
                </div>
              )}
            </div>
          )}

          {/* === Members Tab === */}
          {activeTab === 'members' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>成员列表</p>
              <p className="text-sm mt-1">成员浏览功能开发中</p>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>视频模块</p>
              <p className="text-sm mt-1">即将推出，敬请期待</p>
            </div>
          )}

          {activeTab === 'code_repo' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <Code className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>代码仓库</p>
              <p className="text-sm mt-1">即将推出 Git 代码托管功能</p>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>问答模块</p>
              <p className="text-sm mt-1">即将推出提问与回答功能</p>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>聊天模块</p>
              <p className="text-sm mt-1">即将推出即时通讯功能</p>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>商城模块</p>
              <p className="text-sm mt-1">即将推出商品交易功能</p>
            </div>
          )}

          {activeTab === 'course' && (
            <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>课程模块</p>
              <p className="text-sm mt-1">即将推出在线课程功能</p>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 hidden xl:block">
          <div className="sticky top-20 space-y-4">
            <div className="card">
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

            {/* Clustered communities info */}
            {space.is_root && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> 同名社区集群
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  多个用户创建了同名社区 &quot;{communityName}&quot;，此处聚合展示相关内容索引。
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  格式: @用户/社区名，类似 GitHub 的 organization/repo 结构。
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
