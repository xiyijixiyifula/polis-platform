'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { SpaceCard } from '@/components/SpaceCard';
import { TrendingUp, Users, Sparkles } from 'lucide-react';

interface SpaceData {
  id: string;
  namespace: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  member_count: number;
  post_count: number;
  is_root: boolean;
}

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('polis_access_token'));
  }, []);

  if (!isLoggedIn) {
    return <LandingPage />;
  }

  return <FeedPage />;
}

function LandingPage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 dark:from-gray-900 via-white dark:via-gray-900 to-white dark:to-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 px-4 py-1 text-sm text-primary-700 dark:text-primary-300">
              <Sparkles className="h-4 w-4" />
              未来社区平台 — Polis 已上线
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-gray-900 dark:text-white">
              让创建社区像
              <span className="text-primary-600 dark:text-primary-400">创建 GitHub 仓库</span>
              一样简单
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              Polis 是一个去中心化的个人社区创造与管理系统。
              用户拥有自己的社区主权，模块即插即用，数据归你所有。
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-base px-8 py-3 rounded-xl shadow-lg shadow-primary-200 hover:shadow-xl transition-shadow">
                免费创建你的社区
              </Link>
              <Link href="/explore" className="btn-secondary text-base px-8 py-3 rounded-xl">
                探索社区
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="card text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">一键创建</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">零运维成本，像创建仓库一样创建你的社区</p>
            </div>
            <div className="card text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">模块化</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">论坛、视频、商城、代码仓库，按需启用</p>
            </div>
            <div className="card text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">数据主权</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">数据完全归你，支持随时 Markdown 导出</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>Polis (πόλις) — 人人都是城主 · Built with Rust + Next.js</p>
      </footer>
    </div>
  );
}

function FeedPage() {
  const [trendingSpaces, setTrendingSpaces] = useState<SpaceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('polis_access_token');
        const res = await fetch('/api/spaces/trending', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.code === 0 && data.data) {
          setTrendingSpaces(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch trending spaces:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex gap-6">
        <Sidebar />

        <main className="flex-1 min-w-0 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              热门社区
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">发现你感兴趣的社区</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : trendingSpaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {trendingSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          ) : (
            <div className="card py-12 text-center">
              <div className="text-3xl mb-3">🏛️</div>
              <p className="text-gray-500">暂无社区</p>
              <Link href="/create" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
                创建第一个社区 →
              </Link>
            </div>
          )}
        </main>

        <aside className="w-72 shrink-0 hidden xl:block">
          <div className="sticky top-20 space-y-4">
            <div className="card">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                快速入口
              </h3>
              <div className="space-y-2">
                <Link href="/create" className="block rounded-lg bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
                  ✨ 创建社区
                </Link>
                <Link href="/explore" className="block rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  🔍 探索社区
                </Link>
                <Link href="/search" className="block rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  🔎 搜索内容
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
