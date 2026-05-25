'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Filter, PenLine, FileText, MessageSquareText, Home, Heart, Eye, Users,
  MessageCircle, TrendingUp, TrendingDown, UserCheck, UserPlus, UserMinus, Clock, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import CreationCard, { type CreationPublic } from '@/components/CreationCard';
import SubmitDialog from '@/components/SubmitDialog';
import CommentsSection from './components/CommentsSection';
import { follow, getToken, type FollowUser } from '@/lib/api';

type SidebarSection = 'dashboard' | 'publish' | 'content' | 'interactions' | 'comments';

export default function MyCreationsPage() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');
  const [creations, setCreations] = useState<CreationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeCreationId, setActiveCreationId] = useState<string>('');

  const [interactionTab, setInteractionTab] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);

  useEffect(() => { loadCreations(true); }, [filter]);

  const loadCreations = async (reset = false) => {
    try {
      setLoading(true);
      const p = reset ? 1 : page;
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('page_size', '20');
      if (filter !== 'all') params.set('status', filter);

      const token = getToken() || '';
      const res = await fetch(`/api/creations?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.data) {
        // 防御性处理：API 可能返回纯数组或分页对象 { items: [...] }
        const items = Array.isArray(data.data) ? data.data
          : (Array.isArray(data.data.items) ? data.data.items : []);
        if (reset) {
          setCreations(items);
          setPage(2);
        } else {
          setCreations((prev) => [...prev, ...items]);
          setPage((prev) => prev + 1);
        }
        setHasMore(items.length === 20);
      }
    } catch { /* */ } finally { setLoading(false); }
  };

  const loadInteractions = useCallback(async () => {
    const stored = localStorage.getItem('polis_user');
    if (!stored) return;
    const me = JSON.parse(stored);
    setInteractionLoading(true);
    try {
      if (interactionTab === 'followers') {
        const res = await follow.followers(me.username);
        if (res.code === 0 && res.data) setFollowers(res.data);
      } else {
        const res = await follow.following(me.username);
        if (res.code === 0 && res.data) setFollowingList(res.data);
      }
    } catch {}
    setInteractionLoading(false);
  }, [interactionTab]);

  useEffect(() => {
    if (activeSection === 'interactions') loadInteractions();
  }, [activeSection, interactionTab, loadInteractions]);

  const handleFollowToggle = async (userId: string) => {
    try {
      const res = await follow.toggle('user', userId);
      if (res.code === 0) loadInteractions();
    } catch {}
  };

  const handleEdit = (id: string) => {
    window.location.href = `/creations/new?edit=${id}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个创作吗？所有社区中的引用也会被移除。')) return;
    try {
      const token = getToken() || '';
      const res = await fetch(`/api/creations/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0) {
        setCreations((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.message || '删除失败');
      }
    } catch { alert('网络错误'); }
  };

  const handleSubmit = (id: string) => {
    setActiveCreationId(id);
    setSubmitDialogOpen(true);
  };

  const handleSubmitSuccess = () => {
    loadCreations(true);
  };

  const handleWithdraw = async (refId: string) => {
    if (!confirm('确定要撤稿吗？该社区将不再展示此内容。')) return;
    try {
      const token = getToken() || '';
      const res = await fetch(`/api/refs/${refId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0) {
        loadCreations(true);
      } else {
        alert(data.message || '撤稿失败');
      }
    } catch { alert('网络错误'); }
  };

  const handleLike = async (id: string) => {
    try {
      const token = getToken() || '';
      await fetch(`/api/creations/${id}/like`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* */ }
  };

  const handleBookmark = async (id: string) => {
    try {
      const token = getToken() || '';
      await fetch(`/api/creations/${id}/bookmark`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* */ }
  };

  const handleVisibilityChange = async (id: string, newVis: string) => {
    try {
      const token = getToken() || '';
      const res = await fetch(`/api/creations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility: newVis }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setCreations((prev) =>
          Array.isArray(prev) ? prev.map((c) => (c.id === id ? { ...c, visibility: newVis } : c)) : prev
        );
      }
    } catch { /* */ }
  };

  const sidebarItems: { key: SidebarSection; label: string; icon: React.ReactNode; href?: string }[] = [
    { key: 'dashboard', label: '\u4eea\u8868\u76d8', icon: <BarChart3 size={18} /> },
    { key: 'publish', label: '\u53d1\u5e03\u4f5c\u54c1', icon: <PenLine size={18} />, href: '/creations/new' },
    { key: 'content', label: '\u5185\u5bb9\u7ba1\u7406', icon: <FileText size={18} /> },
    { key: 'interactions', label: '\u4e92\u52a8\u7ba1\u7406', icon: <MessageSquareText size={18} /> },
    { key: 'comments', label: '\u8bc4\u8bba\u7ba1\u7406', icon: <MessageCircle size={18} /> },
  ];

  const filters = [
    { value: 'all', label: '\u5168\u90e8' },
    { value: 'published', label: '\u5df2\u53d1\u5e03' },
    { value: 'draft', label: '\u8349\u7a3f' },
    { value: 'archived', label: '\u5f52\u6863' },
  ];

  const totalViews = creations.reduce((sum, c: any) => sum + (c.view_count || 0), 0);
  const totalLikes = creations.reduce((sum, c: any) => sum + (c.like_count || 0), 0);
  const totalComments = creations.reduce((sum, c: any) => sum + (c.comment_count || 0), 0);
  const publishedCount = creations.filter((c: any) => c.status === 'published').length;
  const draftCount = creations.filter((c: any) => c.status === 'draft').length;

  const moduleTypeStats: Record<string, number> = {};
  creations.forEach((c: any) => {
    const mt = c.submissions?.[0]?.module_type || c.content_type || 'other';
    moduleTypeStats[mt] = (moduleTypeStats[mt] || 0) + 1;
  });

  const getTrendData = () => {
    const now = new Date();
    const dates: Record<string, { views: number; likes: number; comments: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dates[key] = { views: 0, likes: 0, comments: 0 };
    }
    creations.forEach((c: any) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (dates[key]) {
          dates[key].views += (c.view_count || 0);
          dates[key].likes += (c.like_count || 0);
          dates[key].comments += (c.comment_count || 0);
        }
      }
    });
    return Object.entries(dates).map(([date, vals]) => ({ date, ...vals }));
  };

  const trendData = getTrendData();

  const moduleLabels: Record<string, { label: string; color: string }> = {
    forum: { label: '\u4ea4\u6d41', color: '#10b981' },
    article: { label: '\u6587\u7ae0', color: '#3b82f6' },
    share: { label: '\u5206\u4eab', color: '#f59e0b' },
    wiki: { label: '\u77e5\u8bc6\u5e93', color: '#8b5cf6' },
    video: { label: '\u89c6\u9891', color: '#ef4444' },
    qa: { label: '\u95ee\u7b54', color: '#06b6d4' },
    novel: { label: '\u5c0f\u8bf4', color: '#ec4899' },
    game: { label: '\u6e38\u620f', color: '#f97316' },
    mini_app: { label: '\u5c0f\u7a0b\u5e8f', color: '#84cc16' },
    series: { label: '\u7cfb\u5217', color: '#a855f7' },
    membership: { label: '\u4f1a\u5458', color: '#eab308' },
    code_repo: { label: '\u4ee3\u7801\u4ed3\u5e93', color: '#64748b' },
    polls: { label: '\u6295\u7968', color: '#f43f5e' },
    announcements: { label: '\u516c\u544a', color: '#f97316' },
    chat: { label: '\u804a\u5929', color: '#0ea5e9' },
    store: { label: '\u5546\u57ce', color: '#14b8a6' },
    course: { label: '\u8bfe\u7a0b', color: '#6366f1' },
    other: { label: '\u5176\u4ed6', color: '#94a3b8' },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex gap-6">
      <div className="w-56 shrink-0 hidden md:block">
        <div className="glass-card p-4 sticky top-20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 px-2 flex items-center gap-2">
            <Home size={16} className="text-primary-500" />
            {'\u521b\u4f5c\u8005\u4e2d\u5fc3'}
          </h2>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.key;
              const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
              }`;
              if (item.href) {
                return (
                  <Link key={item.key} href={item.href} className={className}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <button key={item.key} onClick={() => setActiveSection(item.key)} className={className}>
                  {item.icon}
                  <span>{item.label}</span>
                  {item.key === 'content' && <span className="ml-auto text-xs text-gray-400">{creations.length}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {activeSection === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{'\u521b\u4f5c\u8005\u4e2d\u5fc3'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{'\u67e5\u770b\u4f60\u7684\u521b\u4f5c\u6570\u636e\u4e0e\u4f5c\u54c1\u8868\u73b0'}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4 text-center">
                <Eye size={20} className="text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{'\u603b\u9605\u8bfb\u91cf'}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Heart size={20} className="text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{totalLikes.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{'\u603b\u83b7\u8d5e\u6570'}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <MessageCircle size={20} className="text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{totalComments.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{'\u603b\u8bc4\u8bba\u6570'}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <FileText size={20} className="text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{creations.length}</p>
                <p className="text-xs text-gray-500 mt-1">{'\u603b\u4f5c\u54c1\u6570'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">{'\u4e92\u52a8\u6570\u636e\u8d8b\u52bf'}</h2>
                  <span className="text-xs text-gray-500">{'\u8fd17\u5929'}</span>
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          fontSize: '13px',
                        }}
                      />
                      <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} fill="url(#viewsGradient)" name={'\u9605\u8bfb\u91cf'} />
                      <Area type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} fill="url(#likesGradient)" name={'\u70b9\u8d5e\u6570'} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
                    {'\u6682\u65e0\u6570\u636e\uff0c\u53d1\u5e03\u4f5c\u54c1\u540e\u67e5\u770b\u8d8b\u52bf'}
                  </div>
                )}
              </div>

              <div className="glass-card p-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{'\u4f5c\u54c1\u5206\u5e03'}</h2>
                {Object.keys(moduleTypeStats).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(moduleTypeStats).map(([type, count]) => {
                      const info = moduleLabels[type] || moduleLabels.other;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{info.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">{'\u6682\u65e0\u4f5c\u54c1\u6570\u636e'}</p>
                    <p className="text-xs text-gray-400 mt-1">{'\u53d1\u5e03\u4f60\u7684\u7b2c\u4e00\u4e2a\u4f5c\u54c1\u6765\u67e5\u770b\u6570\u636e'}</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{'\u5df2\u53d1\u5e03'}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{publishedCount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500">{'\u8349\u7a3f'}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{draftCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/creations/new"
                className="glass-card p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <PenLine size={20} className="text-primary-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{'\u53d1\u5e03\u65b0\u4f5c\u54c1'}</h3>
                <p className="text-xs text-gray-500 mt-1">{'\u521b\u5efa\u4ea4\u6d41\u3001\u6587\u7ae0\u3001\u89c6\u9891\u6216\u5176\u4ed6\u5185\u5bb9'}</p>
              </Link>
              <div onClick={() => setActiveSection('content')}
                className="glass-card p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Eye size={20} className="text-blue-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{'\u67e5\u770b\u4f5c\u54c1'}</h3>
                <p className="text-xs text-gray-500 mt-1">{'\u7ba1\u7406\u4f60\u7684\u6240\u6709\u5185\u5bb9\u4e0e\u6295\u9012\u60c5\u51b5'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 发布作品 ===== */}
        {activeSection === 'publish' && (
          <div className="glass-card p-10 text-center">
            <PenLine className="h-12 w-12 mx-auto mb-3 text-primary-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">发布新作品</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              创作内容后可以投稿到你的社区或其他创作者的社区
            </p>
            <Link href="/creations/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition shadow-lg shadow-primary-600/20">
              <Plus size={20} /> 开始创作
            </Link>
          </div>
        )}

        {/* ===== 内容管理 ===== */}
        {activeSection === 'content' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">内容管理</h1>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                               text-sm rounded-lg px-3 py-2 pr-8 text-gray-700 dark:text-gray-300
                               focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {filters.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <Filter size={14}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <Link href="/creations/new"
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium
                             rounded-lg hover:bg-primary-700 transition">
                  <Plus size={16} /> 新建创作
                </Link>
              </div>
            </div>

            {loading && creations.length === 0 && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {creations.length === 0 && !loading && (
              <div className="glass-card py-16 text-center text-gray-400 dark:text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg mb-2">还没有创作内容</p>
                <p className="text-sm mb-6">创建你的第一篇内容，可以投稿到任意社区</p>
                <Link href="/creations/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  <Plus size={18} /> 开始创作
                </Link>
              </div>
            )}

            {creations.length > 0 && (
              <div className="space-y-4">
                {creations.map((creation) => (
                  <CreationCard key={creation.id}
                    creation={creation}
                    showSource={true}
                    isOwner={true}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSubmit={handleSubmit}
                    onLike={handleLike}
                    onBookmark={handleBookmark}
                    onWithdraw={handleWithdraw}
                    onVisibilityChange={handleVisibilityChange}
                  />
                ))}

                {hasMore && (
                  <div className="text-center pt-4">
                    <button onClick={() => loadCreations(false)}
                      disabled={loading}
                      className="px-6 py-2 text-sm text-primary-600 border border-primary-200
                                 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20
                                 disabled:opacity-50 transition">
                      {loading ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== 互动管理 ===== */}
        {activeSection === 'interactions' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">互动管理</h1>

            {/* 统计概览卡片 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4 text-center">
                <MessageCircle size={18} className="text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalComments}</p>
                <p className="text-xs text-gray-500 mt-1">总评论数</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Heart size={18} className="text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalLikes}</p>
                <p className="text-xs text-gray-500 mt-1">总获赞数</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Eye size={18} className="text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalViews}</p>
                <p className="text-xs text-gray-500 mt-1">总阅读量</p>
              </div>
            </div>

            {/* 关注/粉丝 Tabs */}
            <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 w-fit">
              <button
                onClick={() => setInteractionTab('followers')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  interactionTab === 'followers'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Users size={16} /> 粉丝管理 ({followers.length})
              </button>
              <button
                onClick={() => setInteractionTab('following')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  interactionTab === 'following'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <UserCheck size={16} /> 关注管理 ({followingList.length})
              </button>
            </div>

            {/* 用户列表 */}
            {interactionLoading ? (
              <div className="glass-card p-12 text-center text-gray-500">
                <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : (interactionTab === 'followers' ? followers : followingList).length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Users size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  {interactionTab === 'followers' ? '暂无粉丝' : '暂无关注'}
                </h3>
                <p className="text-sm text-gray-500">
                  {interactionTab === 'followers' ? '开始创作来吸引粉丝吧' : '去发现有趣的创作者'}
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden rounded-xl">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(interactionTab === 'followers' ? followers : followingList).map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <Link href={`/profile/${user.username}`} className="shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                          {user.display_name?.charAt(0) || '?'}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${user.username}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 transition-colors">
                          {user.display_name}
                        </Link>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                      <button
                        onClick={() => handleFollowToggle(user.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          interactionTab === 'followers'
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        {interactionTab === 'followers' ? <><UserPlus size={13} /> 回关</> : <><UserMinus size={13} /> 取消关注</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {activeSection === 'comments' && <CommentsSection />}
      </div>

      {/* 投稿弹窗 */}
      {submitDialogOpen && (
        <SubmitDialog
          creationId={activeCreationId}
          onClose={() => setSubmitDialogOpen(false)}
          onSubmit={handleSubmitSuccess}
        />
      )}
    </div>
  );
}
