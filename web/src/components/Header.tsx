'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, Bell, User, Plus, Menu, X, Info, FileText, Shield as ShieldIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const loggedIn = !!localStorage.getItem('polis_access_token');
    setIsLoggedIn(loggedIn);
    if (loggedIn) fetchUnread();
  }, []);

  const fetchUnread = async () => {
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setUnreadCount(data.data);
    } catch {}
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(fetchUnread, 30000);
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isLoggedIn]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
              P
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:inline">Polis</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/explore" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              发现
            </Link>
            <Link href="/about" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              关于
            </Link>
            <Link href="/changelog" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              更新
            </Link>
            <Link href="/research" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              AI 研究
            </Link>
            <Link href="/cli" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              CLI
            </Link>
          </nav>
        </div>

        {/* Search */}
        <div className="hidden sm:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索社区、帖子、用户..."
              className="w-full rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-2 pl-10 pr-4 text-sm placeholder-gray-400 dark:placeholder-gray-500 dark:text-gray-200 focus:border-primary-400 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
                }
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <Link href="/create" className="hidden sm:inline-flex btn-primary gap-1 text-xs px-3 py-1.5">
                <Plus className="h-3.5 w-3.5" />
                创建社区
              </Link>
              <Link href="/notifications" className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                  <User className="h-5 w-5" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50"
                    onMouseLeave={() => setShowUserMenu(false)}>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">个人主页</Link>
                    <Link href="/drafts" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">草稿箱</Link>
                    <Link href="/saved" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">我的收藏</Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">账号设置</Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button onClick={() => { localStorage.removeItem('polis_access_token'); localStorage.removeItem('polis_user'); window.location.href = '/'; }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">退出登录</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2">登录</Link>
              <Link href="/register" className="btn-primary text-xs px-4 py-1.5">注册</Link>
            </div>
          )}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 md:hidden">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                className="w-full rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-200 py-2 pl-10 pr-4 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
                  }
                }}
              />
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <Link href="/explore" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              发现
            </Link>
            <Link href="/trending" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              热榜
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              关于
            </Link>
            <Link href="/changelog" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              更新日志
            </Link>
            <Link href="/research" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              AI 研究
            </Link>
            <Link href="/cli" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              CLI
            </Link>
            {isLoggedIn && (
              <Link href="/create" className="rounded-lg px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30">
                创建社区
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
