import { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Users, PenLine, Puzzle, Shield, Globe, Zap, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: '关于 Polis',
  description: 'Polis 是一个去中心化的社区创造与管理平台。让创建社区像创建 GitHub 仓库一样简单。',
  openGraph: {
    title: '关于 Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单',
  },
};

const values = [
  {
    icon: Users,
    title: '去中心化社区',
    desc: '每个人都可以自由创建和管理自己的社区空间，不需要中心化平台的许可。你的社区，你做主。',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: PenLine,
    title: '创作为核心',
    desc: '帖子、视频、投票、系列、知识库——所有内容统一为"作品"，一次创作，多处引用。',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Puzzle,
    title: '模块化扩展',
    desc: '16 种社区模块自由组合——交流、问答、知识库、视频、投票、系列、商城、代码仓库等。按需开启。',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Shield,
    title: '数据主权',
    desc: '你的数据你做主。支持一键导出全部作品（Markdown + JSON），支持账户删除。你的创作永远属于你。',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: '开放生态',
    desc: '后端核心代码开源（Rust 微服务架构），前端采用 Next.js。支持 API 访问和 CLI 工具。',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Zap,
    title: 'Web3 集成',
    desc: '支持加密钱包绑定、XP 经验值系统、$POL 平台代币激励。链上链下结合的创作者经济。',
    color: 'from-orange-500 to-red-500',
  },
];

const techStack = [
  { category: '后端框架', items: 'Rust (Actix-web), SQLx, PostgreSQL' },
  { category: '前端框架', items: 'Next.js 14, React 18, Tailwind CSS' },
  { category: '微服务', items: 'Gateway, User, Space, Content, Video, Admin, Aggregate, Chain (8 服务)' },
  { category: '缓存 & 消息', items: 'Redis, NATS (消息队列)' },
  { category: '区块链', items: 'Polis Chain (Substrate), $POL 代币, XP 挖矿' },
  { category: '部署', items: 'GitHub Actions CI/CD, systemd, GitHub Releases' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white mb-6 shadow-lg">
            <span className="text-4xl font-extrabold">P</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            关于 Polis
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            让创建社区像创建 GitHub 仓库一样简单。<br />
            每一个想法都值得被看见，每一个社区都可以自由生长。
          </p>
        </div>

        {/* What is Polis */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Polis 是什么？
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">愿景</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Polis 的名字来源于古希腊的"城邦"（πόλις）概念——一个自治的公民社区。
                我们的愿景是让互联网回归到去中心化的社区治理模式：每个人都可以创建自己的"城邦"，
                设定自己的规则，与志同道合的人一起创造价值。
              </p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">定位</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Polis 是一个面向创作者和社区建设者的平台。不同于传统的中心化社交平台，
                Polis 采用"作品-引用"架构：创作者保留作品所有权，社区通过引用机制聚合内容。
                这类似于 GitHub 的 fork/pull-request 模型应用在内容创作领域。
              </p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            核心特性
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="card p-6 group hover:scale-[1.02] transition-transform"
              >
                <div
                  className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${v.color} text-white mb-4 shadow-md`}
                >
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            技术架构
          </h2>
          <div className="card p-6 overflow-hidden">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {techStack.map((t) => (
                <div key={t.category} className="p-3">
                  <h4 className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
                    {t.category}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.items}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                由 8 个 Rust 微服务 + Next.js 前端驱动，全部代码开源
              </p>
              <Link
                href="https://github.com/xiyijixiyifula/polis-platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Code className="h-4 w-4" />
                GitHub 仓库
              </Link>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="mb-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            开源与透明
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed text-sm mb-6">
            Polis 的后端核心代码以开源协议发布。我们相信透明是建立信任的基础——
            任何人都可以审查我们的代码、提交改进、自托管部署。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
            >
              隐私政策
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
            >
              服务条款
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/changelog"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
            >
              更新日志
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="h-5 w-5 rounded bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[8px] font-bold">
                P
              </span>
              &copy; 2026 Polis Platform
            </div>
            <div className="flex gap-6 text-gray-400">
              <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">隐私</Link>
              <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">条款</Link>
              <Link href="/changelog" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">更新日志</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
