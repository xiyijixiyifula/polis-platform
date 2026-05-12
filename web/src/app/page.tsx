'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { formatDate, formatCount } from '@/lib/utils';
import {
  Home, Compass, Bell, Mail, Bookmark, User, Settings,
  Search, TrendingUp, MessageCircle, Heart, Eye,
  Share2, Repeat2, Sparkles, Users, FlaskConical
} from 'lucide-react';
import { getSpaceVisual } from '@/components/SpaceCard';

// ===== Main Component =====
export default function HomePage() {
  return <FeedLayout />;
}

// ===== Feed Layout (3-Column) =====
function FeedLayout() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [trendingSpaces, setTrendingSpaces] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadDm, setUnreadDm] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('polis_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
    // Fetch sidebar badge counts
    const token = localStorage.getItem('polis_access_token');
    if (token) {
      fetch('/api/messages/unread-count', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.code === 0) setUnreadDm(d.data || 0); }).catch(() => {});
      fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.code === 0) setUnreadNotif(d.data || 0); }).catch(() => {});
      fetch('/api/bookmarks', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.code === 0 && Array.isArray(d.data)) setBookmarkCount(d.data.length); }).catch(() => {});
    }
  }, []);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/spaces/trending');
      const data = await res.json();
      if (data.code === 0 && data.data) setTrendingSpaces(data.data.slice(0, 4));
    } catch {}
  }, []);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  const fetchTrendingPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/feed?page=1&page_size=5&sort=hot');
      const data = await res.json();
      if (data.code === 0 && data.data) setTrendingPosts(data.data.slice(0, 5));
    } catch {}
  }, []);

  useEffect(() => { fetchTrendingPosts(); }, [fetchTrendingPosts]);

  const getSortParam = (tab: string) => {
    if (tab === 'hot') return '&sort=hot';
    return '';
  };

  const fetchFeed = useCallback(async (pageNum: number, append: boolean = false, tab: string = 'all') => {
    try {
      const token = localStorage.getItem('polis_access_token');
      const url = '/api/feed?page=' + pageNum + '&page_size=20' + getSortParam(tab);
      const res = await fetch(url, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        if (append) {
          setItems(prev => [...prev, ...data.data]);
        } else {
          setItems(data.data);
        }
        if (data.pagination && typeof data.pagination.total === 'number') {
          setTotalItems(data.pagination.total);
        }
        if (data.data.length < 20) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to fetch feed:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchFeed(1, false, activeTab);
  }, [activeTab, fetchFeed]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          fetchFeed(nextPage, true, activeTab);
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [hasMore, loadingMore, loading, page, fetchFeed, activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / 20));

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setLoading(true);
    setItems([]);
    setPage(p);
    setHasMore(true);
    fetchFeed(p, false, activeTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl flex justify-center">
        {/* ===== Left Sidebar ===== */}
        <aside className="w-[275px] shrink-0 hidden lg:block glass-sidebar">
          <div className="sticky top-0 h-screen flex flex-col py-3 px-3">
            {/* Logo */}
            <div className="px-3 pb-3 mb-2">
              <Link href="/" className="nav-item flex items-center gap-4 px-3 py-3 rounded-full transition-all text-xl font-bold text-primary-600 dark:text-primary-400 tracking-tight glass-btn w-full">
                <span className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                  P
                </span>
                Polis
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1">
              {[
                { icon: Home, label: '首页', href: '/' },
                { icon: Compass, label: '探索', href: '/explore' },
                { icon: Bell, label: '通知', href: '/notifications' },
                { icon: Mail, label: '消息', href: '/messages' },
                { icon: Bookmark, label: '收藏', href: '/saved' },
                { icon: User, label: '个人', href: '/profile' },
                { icon: Settings, label: '设置', href: '/settings' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="nav-item flex items-center gap-4 px-3 py-3 rounded-full transition-all text-lg glass-btn w-full"
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                  {item.label === '消息' && unreadDm > 0 && (
                    <span className="ml-auto h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white px-1.5">
                      {unreadDm > 99 ? '99+' : unreadDm}
                    </span>
                  )}
                  {item.label === '通知' && unreadNotif > 0 && (
                    <span className="ml-auto h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white px-1.5">
                      {unreadNotif > 99 ? '99+' : unreadNotif}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* User Info */}
            <div className="px-3 pb-3">
              {currentUser ? (
                <Link href="/profile" className="flex items-center gap-3 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                    {(currentUser.display_name || currentUser.username || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{currentUser.display_name || currentUser.username}</p>
                    <p className="text-xs text-gray-500 truncate">@{currentUser.username}</p>
                  </div>
                </Link>
              ) : (
                <Link href="/login" className="flex items-center gap-3 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">登录</span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* ===== Center Feed ===== */}
        <main className="w-[600px] min-w-0 border-r border-gray-100 dark:border-gray-800">
          {/* Hero Banner — iOS 26 Liquid Glass */}
          <div className="hero-glass gpu-layer animate-glow-pulse mb-4 mx-4 mt-4">
            <div className="px-6 py-8 text-center sm:px-10 sm:py-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-badge mb-5">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-breathe" />
                <span className="text-xs font-medium text-secondary">Polis 社区平台</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: '#1d1d1f' }}>
                连接思想，共创未来
              </h1>
              <p className="text-base text-secondary max-w-md mx-auto mb-6 leading-relaxed">
                创建你的社区，分享知识，与世界连接。每一个想法都值得被看见。
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/explore" className="glass-btn glass-btn-primary">
                  <Compass className="h-4 w-4" />
                  <span>探索社区</span>
                </Link>
                <Link href="/register" className="glass-btn">
                  立即加入
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
            <div className="flex">
              {[
                { key: 'all', label: '全部动态' },
                { key: 'follow', label: '关注的人' },
                { key: 'hot', label: '热门' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={'flex-1 py-4 text-center text-sm font-medium transition-colors relative ' + 
                    (activeTab === tab.key 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')
                  }
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Items */}
          <div>
            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                    <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-1" />
                    <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
                    <div className="flex gap-6">
                      <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
                      <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
                      <div className="h-4 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <FeedItemCard key={item.type + '-' + item.id} item={item} />
                ))}

                {/* Load more trigger (auto-scroll) */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-6 text-center">
                    {loadingMore ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                        <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        加载中...
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">下拉加载更多</span>
                    )}
                  </div>
                )}
                {!hasMore && (
                  <div className="py-8 text-center text-sm text-gray-400">— 已经到底了 —</div>
                )}

                {/* ===== 分页导航 ===== */}
                {totalItems > 20 && (
                  <div className="py-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      ← 上一页
                    </button>

                    {(() => {
                      const pages: (number | string)[] = [];
                      const maxShow = 7;
                      if (totalPages <= maxShow) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (page > 3) pages.push('...');
                        const start = Math.max(2, page - 1);
                        const end = Math.min(totalPages - 1, page + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (page < totalPages - 2) pages.push('...');
                        pages.push(totalPages);
                      }
                      return pages.map((p, i) =>
                        typeof p === 'number' ? (
                          <button
                            key={i}
                            onClick={() => goToPage(p)}
                            className={'w-9 h-9 rounded-full text-sm font-medium transition-colors ' +
                              (p === page
                                ? 'bg-primary-500 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800')
                            }
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={i} className="px-1 text-gray-400 select-none">…</span>
                        )
                      );
                    })()}

                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      下一页 →
                    </button>
                  </div>
                )}

                {totalItems > 0 && (
                  <div className="pb-8 text-center text-xs text-gray-400">
                    共 {totalItems} 条动态 · 第 {page}/{totalPages} 页
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">暂无动态</p>
                <p className="text-sm text-gray-400 mt-1">关注更多社区以获取最新动态</p>
                <Link href="/explore" className="mt-4 inline-block btn-primary px-6 py-2 rounded-full text-sm">
                  探索社区
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* ===== Right Sidebar ===== */}
        <aside className="w-[350px] shrink-0 hidden xl:block px-6">
          <div className="sticky top-0 space-y-4 py-3">
            {/* Search */}
            <form action="/search" method="GET" className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                name="q"
                type="text"
                placeholder="搜索社区、帖子、用户..."
                className="w-full rounded-full bg-gray-100 dark:bg-gray-800 border-0 pl-11 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </form>

            {/* Trending Topics */}
            <div className="glass-card p-4 overflow-hidden">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                热门趋势
              </h3>
              {trendingPosts.length > 0 ? (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {trendingPosts.map((post: any, i: number) => (
                    <Link key={post.id} href={'/post/' + post.id} className="flex items-start gap-3 px-2 py-2.5 hover:bg-white/30 dark:hover:bg-white/5 transition-colors rounded-lg">
                      <span className="text-lg font-bold text-gray-300 dark:text-gray-600 shrink-0 w-6 text-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {post.title || '无标题'}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatCount(post.view_count || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {formatCount(post.comment_count || 0)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-500 py-4">
                  <p className="text-sm">成为第一个发帖的人，引领社区趋势 🚀</p>
                </div>
              )}
            </div>

            {/* Recommended Communities */}
            <div className="glass-card p-4 overflow-hidden">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary-500" />
                推荐社区
              </h3>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {trendingSpaces.length > 0 ? (
                  trendingSpaces.map((space: any) => {
                    const vis = getSpaceVisual(space.namespace || '');
                    return (
                    <Link key={space.id} href={'/space/' + space.namespace} className="flex items-center gap-3 px-2 py-3 hover:bg-white/30 dark:hover:bg-white/5 transition-colors rounded-lg">
                      <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: vis.gradient }}>
                        {space.icon_url ? (
                          <img src={space.icon_url} alt="" className="h-full w-full rounded-xl object-cover" />
                        ) : (
                          <div className="w-5 h-5">{vis.shape('white')}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{space.title}</p>
                        <p className="text-xs text-gray-500 truncate">{space.description || ''}</p>
                      </div>
                    </Link>
                    )})
                ) : (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="px-2 py-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                        <div className="flex-1">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                          <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <Link href="/explore" className="block px-2 py-3 text-sm text-primary-600 dark:text-primary-400 hover:bg-white/30 dark:hover:bg-white/5 transition-colors rounded-lg">
                  显示更多
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 text-xs text-gray-400 space-y-1">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Link href="/about" className="hover:underline">关于</Link>
                <Link href="/privacy" className="hover:underline">隐私</Link>
                <Link href="/changelog" className="hover:underline">更新日志</Link>
                <Link href="/cli" className="hover:underline">CLI</Link>
              </div>
              <p>© 2026 Polis</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ===== Feed Item Card =====
function FeedItemCard({ item }: { item: any }) {
  const author = item.author || {};
  const space = item.space || {};
  const authorUsername = author.username || 'anonymous';
  const authorDisplayName = author.display_name || author.username || '匿名';
  const spaceName = space.title || space.namespace || '未知社区';
  const spaceNs = space.namespace || '';

  const getTypeIcon = () => {
    if (item.type === 'poll') return '📊';
    if (item.type === 'announcement') return '📢';
    return '📝';
  };

  const getModuleLabel = () => {
    if (item.type === 'poll') return '投票';
    if (item.type === 'announcement') return '公告';
    const mt = item.module_type || '';
    if (mt === 'discussion') return '讨论';
    if (mt === 'article' || mt === 'forum') return '交流';
    if (mt === 'share') return '分享';
    if (mt === 'wiki') return '知识库';
    if (mt === 'qa') return '问答';
    if (mt === 'novel') return '小说';
    if (mt === 'game') return '游戏';
    if (mt === 'mini_app') return '小程序';
    if (mt === 'activity') return '活动';
    if (mt === 'knowledge') return '知识库';
    if (mt === 'resource') return '资源';
    return mt || '帖子';
  };

  const getItemLink = () => {
    if (item.type === 'poll' && spaceNs) return '/space/' + spaceNs + '/polls';
    if (item.type === 'poll') return '/explore';
    if (item.type === 'announcement' && spaceNs) return '/space/' + spaceNs;
    const base = '/post/' + item.id;
    if (spaceNs) return base + '?space=' + encodeURIComponent(spaceNs);
    return base;
  };

  const likeCount = item.like_count || 0;
  const commentCount = item.comment_count || 0;
  const viewCount = item.view_count || 0;
  // Simulated share and bookmark counts (not yet in API)
  const shareCount = Math.floor(likeCount * 0.3);
  const bookmarkCount = Math.floor(likeCount * 0.5);

  return (
    <Link href={getItemLink()} className="block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
      {/* Line 1: @username/community/module / title */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
        <span className="text-sm">{getTypeIcon()}</span>
        <Link href={'/profile/' + authorUsername} className="font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[130px]">
          @{authorUsername}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <Link href={spaceNs ? '/space/' + spaceNs : '#'} className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[140px]">
          {spaceName}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <Link href={spaceNs && item.type === 'poll' ? '/space/' + spaceNs + '/polls' : spaceNs ? '/space/' + spaceNs + '/posts' : '#'} className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-medium text-gray-600 dark:text-gray-400 shrink-0 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          {getModuleLabel()}
        </Link>
        <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
        <span className="text-gray-900 dark:text-white font-semibold truncate">
          {item.title || '无标题'}
        </span>
      </div>

      {/* Line 2: Preview */}
      {item.preview && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 pl-5">
          {item.preview}
        </p>
      )}

      {/* Line 3: Social stats */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pl-5">
        <Link href={getItemLink()} className="flex items-center gap-5 py-1">
          <span className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">{authorDisplayName}</span>
        </Link>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-[11px]">{formatDate(item.created_at)}</span>
      </div>

      <div className="flex items-center gap-5 pl-5 mt-1 text-xs text-gray-400">
        {/* Like */}
        <Link href={getItemLink()} className="flex items-center gap-1 hover:text-red-500 transition-colors">
          <Heart className="h-3.5 w-3.5" />
          <span>{formatCount(likeCount)}</span>
        </Link>
        {/* Comment */}
        <Link href={getItemLink()} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{formatCount(commentCount)}</span>
        </Link>
        {/* Bookmark */}
        <button className="flex items-center gap-1 hover:text-yellow-500 transition-colors">
          <Bookmark className="h-3.5 w-3.5" />
          <span>{formatCount(bookmarkCount)}</span>
        </button>
        {/* Share */}
        <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{formatCount(shareCount)}</span>
        </button>
        {/* Views */}
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3.5 w-3.5" />
          <span>{formatCount(viewCount)}</span>
        </span>
      </div>
    </Link>
  );
}
