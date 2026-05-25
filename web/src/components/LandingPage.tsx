'use client';

import Link from 'next/link';
import { Compass, Users, PenLine, Puzzle, ArrowRight, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: '创建社区',
    desc: '像创建 GitHub 仓库一样简单，拥有自己的专属社区空间，自定义模块与权限。',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: PenLine,
    title: '内容协作',
    desc: 'Markdown 编辑器、多种内容模块（交流/问答/知识库/视频），让创作与分享充满乐趣。',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Puzzle,
    title: '模块化扩展',
    desc: '16 种社区模块自由组合——投票、系列、商城、代码仓库、小程序，按需开启。',
    color: 'from-amber-500 to-orange-500',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">未来社区平台</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
              连接思想，共创未来
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            让创建社区像创建 GitHub 仓库一样简单。
            每一个想法都值得被看见，每一个社区都可以自由生长。
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary-500 text-white font-semibold text-base hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
            >
              立即注册
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Compass className="h-4 w-4" />
              探索社区
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex justify-center gap-12 sm:gap-20">
            {[
              { value: '∞', label: '自由创建社区' },
              { value: '16', label: '内容模块' },
              { value: '100%', label: '开源' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            一切从社区开始
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Polis 为你提供构建社区所需的一切
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card p-6 text-center group hover:scale-[1.02] transition-transform"
            >
              <div
                className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${f.color} text-white mb-4 shadow-lg`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            开始创建你的第一个社区
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span className="h-5 w-5 rounded bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[8px] font-bold">
              P
            </span>
            © 2026 Polis
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/about" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">关于</Link>
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">隐私</Link>
            <Link href="/changelog" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">更新日志</Link>
            <Link href="/login" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">登录</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
