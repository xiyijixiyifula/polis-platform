'use client';
import { getToken } from '@/lib/api';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Plus, Menu, X, Info, FileText, MessageSquare, Globe, PenLine, Shield as ShieldIcon, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from './ThemeToggle';
import XpBadge from './XpBadge';

const LOCALES: { code: string; nativeName: string }[] = [
  { code: 'zh', nativeName: '中文' },
  { code: 'en', nativeName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'es', nativeName: 'Español' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'ur', nativeName: 'اردو' },
  { code: 'bn', nativeName: 'বাংলা' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'th', nativeName: 'ไทย' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'fa', nativeName: 'فارسی' },
  { code: 'tl', nativeName: 'Filipino' },
  { code: 'my', nativeName: 'မြန်မာ' },
  { code: 'am', nativeName: 'አማርኛ' },
  { code: 'he', nativeName: 'עברית' },
  { code: 'mn', nativeName: 'Монгол' },
];

export function Header() {
  const t = useTranslations();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close lang menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchLocale = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    location.reload();
  };

  useEffect(() => {
    const loggedIn = !!getToken();
    setIsLoggedIn(loggedIn);
    if (loggedIn) { fetchUnread(); fetchUnreadDm(); }
  }, []);

	  // Re-check login state on every route change (cookie may have been set after mount)
	  const pathname = usePathname();
	  useEffect(() => {
	    const loggedIn = !!getToken();
	    setIsLoggedIn(prev => prev !== loggedIn ? loggedIn : prev);
	    if (loggedIn) { fetchUnread(); fetchUnreadDm(); }
	  }, [pathname]);

  const fetchUnread = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setUnreadCount(data.data);
    } catch (e) { console.error('[Header] fetchUnread:', e); }
  };

  const fetchUnreadDm = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setUnreadDmCount(data.data);
    } catch (e) { console.error('[Header] fetchUnreadDm:', e); }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => { fetchUnread(); fetchUnreadDm(); }, 30000);
    const onFocus = () => { fetchUnread(); fetchUnreadDm(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isLoggedIn]);

  return (
    <header className="sticky top-0 z-50 nav-glass">
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
              {t('nav.explore')}
            </Link>
            <Link href="/about" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              {t('footer.about')}
            </Link>
            <Link href="/wallet" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              <Wallet className="w-4 h-4 inline mr-1" />
              钱包
            </Link>
            <Link href="/changelog" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              更新
            </Link>
            <Link href="/research" className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              AI Agent
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
              placeholder={t('nav.searchPlaceholder')}
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

          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button onClick={() => setShowLangMenu(!showLangMenu)}
              className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title={t('lang.switchTo')}>
              <Globe className="h-5 w-5" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                  {t('lang.name')}
                </div>
                {LOCALES.map((loc) => (
                  <button
                    key={loc.code}
                    onClick={() => { setShowLangMenu(false); switchLocale(loc.code); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg leading-none w-6 text-center shrink-0">
                      {loc.code === 'zh' ? '🇨🇳' : loc.code === 'en' ? '🇺🇸' :
                       loc.code === 'ja' ? '🇯🇵' : loc.code === 'ko' ? '🇰🇷' :
                       loc.code === 'de' ? '🇩🇪' : loc.code === 'fr' ? '🇫🇷' :
                       loc.code === 'es' ? '🇪🇸' : loc.code === 'pt' ? '🇧🇷' :
                       loc.code === 'ru' ? '🇷🇺' : loc.code === 'ar' ? '🇸🇦' :
                       loc.code === 'hi' ? '🇮🇳' : loc.code === 'it' ? '🇮🇹' :
                       loc.code === 'tr' ? '🇹🇷' : loc.code === 'vi' ? '🇻🇳' :
                       loc.code === 'th' ? '🇹🇭' : loc.code === 'id' ? '🇮🇩' :
                       loc.code === 'fa' ? '🇮🇷' : loc.code === 'he' ? '🇮🇱' :
                       loc.code === 'ur' ? '🇵🇰' : loc.code === 'bn' ? '🇧🇩' :
                       loc.code === 'tl' ? '🇵🇭' : loc.code === 'my' ? '🇲🇲' :
                       loc.code === 'am' ? '🇪🇹' : loc.code === 'mn' ? '🇲🇳' : '🌐'}
                    </span>
                    <span>{loc.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <XpBadge />
          </div>

          {isLoggedIn ? (
            <>
              <Link href="/creations" className="hidden sm:inline-flex items-center gap-1 text-xs px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <PenLine className="h-3.5 w-3.5" />
                创作
              </Link>
              <Link href="/create" className="hidden sm:inline-flex btn-primary gap-1 text-xs px-3 py-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('home.createSpace')}
              </Link>
              <Link href="/messages" className="relative rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <MessageSquare className="h-5 w-5" />
                {unreadDmCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                    {unreadDmCount > 99 ? '99+' : unreadDmCount}
                  </span>
                )}
              </Link>
              <Link href="/notifications" className="relative rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                  <User className="h-5 w-5" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50"
                    onMouseLeave={() => setShowUserMenu(false)}>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('nav.myProfile')}</Link>
                    <Link href="/creations" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">创作中心</Link>
                    <Link href="/drafts" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('drafts.title')}</Link>
                    <Link href="/saved" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('saved.title')}</Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('nav.settings')}</Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button onClick={() => { import('@/lib/api').then(m => m.setToken(null)); localStorage.removeItem('polis_user'); window.location.href = '/'; }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">{t('nav.logout')}</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2">{t('nav.login')}</Link>
              <Link href="/register" className="btn-primary text-xs px-4 py-1.5">{t('nav.register')}</Link>
            </div>
          )}
          <button className="md:hidden p-2.5" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
                placeholder={t('common.search')}
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
              {t('nav.explore')}
            </Link>
            <Link href="/trending" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {t('nav.trending')}
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {t('footer.about')}
            </Link>
            <Link href="/wallet" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Wallet className="w-4 h-4 inline mr-1" />
              钱包
            </Link>
            <Link href="/changelog" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              更新日志
            </Link>
            <Link href="/research" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              AI Agent
            </Link>
            <Link href="/cli" className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              CLI
            </Link>
            {isLoggedIn && (
              <Link href="/create" className="rounded-lg px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30">
                {t('home.createSpace')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
