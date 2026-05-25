'use client';

import Link from 'next/link';
import { Users, Compass, ArrowRight, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20 mb-6">
          <Sparkles className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">欢迎加入</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          欢迎加入 Polis
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          从这里开始，创建或发现属于你的社区
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/create"
          className="glass-card p-6 text-center group hover:scale-[1.02] transition-transform"
        >
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            创建你的第一个社区
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            像创建 GitHub 仓库一样简单，自定义模块与权限
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 group-hover:text-primary-600">
            开始创建 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/explore"
          className="glass-card p-6 text-center group hover:scale-[1.02] transition-transform"
        >
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
            <Compass className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            探索推荐社区
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            发现热门社区，找到志同道合的人
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-500 group-hover:text-amber-600">
            去探索 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="text-center mt-8">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          稍后再说，先看看首页
        </Link>
      </div>
    </div>
  );
}
