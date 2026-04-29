import { Metadata } from 'next';

export const metadata: Metadata = { title: '关于 Polis' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">关于 Polis</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-lg text-gray-600">
          Polis（πόλις）— 古希腊语中的"城邦"，象征着每个用户都可以建立自己的城邦，
          制定自己的法律，经营自己的社区。
        </p>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">我们的使命</h2>
          <p className="text-gray-600">让创建社区像创建 GitHub 仓库一样简单。每个人都能拥有自己的社区主权。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">🏛️ 用户主权</h3>
            <p className="text-sm text-gray-500">社区创建者对自己的社区拥有完全控制权</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">📦 模块化</h3>
            <p className="text-sm text-gray-500">论坛、视频、商城、代码仓库，按需启用</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">🔐 数据自有</h3>
            <p className="text-sm text-gray-500">所有数据归你，支持 Markdown 导出</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-1">⚡ 高性能</h3>
            <p className="text-sm text-gray-500">基于 Rust + Axum 构建，极速响应</p>
          </div>
        </div>
        <div className="card bg-gray-50">
          <h2 className="font-semibold text-gray-900 mb-2">技术栈</h2>
          <div className="flex flex-wrap gap-2">
            {['Rust', 'Axum', 'Tokio', 'PostgreSQL', 'Next.js', 'React', 'Wasmtime', 'Meilisearch'].map((t) => (
              <span key={t} className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs text-gray-600">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
