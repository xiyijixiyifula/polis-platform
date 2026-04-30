import { Metadata } from 'next';

export const metadata: Metadata = { title: 'AI 研究报告 - Polis' };

const roadmap = [
  {
    ver: 'v0.3.0', date: '2026-05', title: '社交与互动',
    items: [
      '🔔 通知系统 (WebSocket + NATS)',
      '👥 用户关注/粉丝系统✅',
      '💬 WebSocket 实时聊天',
      '📨 私信系统',
      '⭐ 帖子收藏/推荐系统✅',
      '📊 社区统计分析',
    ],
  },
  {
    ver: 'v0.4.0', date: '2026-06', title: '内容生态扩展',
    items: [
      '🎬 视频上传与转码 (FFmpeg)',
      '📌 帖子置顶与精华',
      '🚩 内容举报与审核系统',
      '🌐 国际化 (i18n)',
      '🔍 全文搜索 (Meilisearch/PostgreSQL GIN)',
      '📁 文件分享系统 (百度网盘风格)',
    ],
  },
  {
    ver: 'v0.5.0', date: '2026-06', title: '高级功能',
    items: [
      '💻 Git 代码仓库托管 (基于 Git)',
      '🧩 WASM 插件引擎',
      '💎 支付与打赏系统',
      '📦 数据导入/导出 (Markdown/JSON)',
      '🔑 OAuth 第三方登录',
      '🤖 AI 助手集成 (内容推荐、自动审核)',
    ],
  },
  {
    ver: 'v0.6.0', date: '2026-07', title: '运维与生态',
    items: [
      '🛠️ 管理后台 ✅ (用户/社区/内容管理已上线)',
      '📈 Prometheus + Grafana 监控',
      '🔄 自动化 CI/CD 流水线 ✅ (auto-dev.sh + cron)',
      '📄 API 文档 (OpenAPI/Swagger)',
      '🧪 端到端测试套件 ✅ (10项自动化测试)',
      '📋 系统健康检查与自动恢复 ✅ (每2小时检查+自动重启)',
    ],
  },
];

import { readFileSync } from 'fs';

export default function ResearchPage() {
  let reportContent = '';
  let reportTime = '';
  let currentVer = '';

  try {
    const report = readFileSync('/root/polis/research-reports/latest-summary.md', 'utf-8');
    const lines = report.split('\n');
    reportContent = report;
    
    for (const line of lines) {
      if (line.includes('生成时间')) reportTime = line.replace('**生成时间**: ', '').trim();
      if (line.includes('当前版本')) currentVer = line.replace('**当前版本**: ', '').trim();
    }
  } catch (e) {
    reportContent = '# 暂无研究报告\n\n研究报告将在每小时整点自动生成。';
  }

  const sections = reportContent.split('## ').filter((s: string) => s.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI 研究报告</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reportTime ? `更新时间: ${reportTime}` : '每小时自动更新'}
            {currentVer ? ` | ${currentVer}` : ''}
          </p>
        </div>
        <a href="/changelog" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
          ← 查看更新日志
        </a>
      </div>

      {/* Product Roadmap */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🚀</span> 产品路线图
        </h2>
        <div className="space-y-4">
          {roadmap.map((v) => (
            <div key={v.ver} className="relative pl-8 border-l-2 border-amber-200 dark:border-amber-800">
              <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900" />
              <div className="mb-2 flex items-center gap-3">
                <span className="text-base font-bold text-gray-900 dark:text-white">{v.ver}</span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">{v.date}</span>
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">规划中</span>
              </div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{v.title}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {v.items.map((item: string) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 dark:bg-amber-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research Reports */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">📊</span> 研究报告
        </h2>

      <div className="space-y-6">
        {sections.map((section, idx) => {
          const lines = section.split('\n');
          const title = lines[0].trim();
          const body = lines.slice(1).join('\n').trim();
          if (!title) return null;

          const sectionColors: Record<string, string> = {
            '🔥': 'from-orange-50 to-red-50 border-orange-200 dark:from-orange-950 dark:to-red-950 dark:border-orange-800',
            '📱': 'from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800',
            '💡': 'from-green-50 to-emerald-50 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:border-green-800',
            '🏥': 'from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950 dark:to-violet-950 dark:border-purple-800',
            '🎯': 'from-primary-50 to-blue-50 border-primary-200 dark:from-primary-950 dark:to-blue-950 dark:border-primary-800',
          };

          const emoji = title.charAt(0);
          const bgColor = sectionColors[emoji] || 'from-gray-50 to-gray-50 border-gray-200 dark:from-gray-900 dark:to-gray-900 dark:border-gray-700';

          return (
            <div key={idx} className={`rounded-xl border bg-gradient-to-br ${bgColor} p-6`}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                {body.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-2">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('- **[')) {
                    const match = line.match(/- \*\*\[(.+?)\]\((.+?)\)\*\*(.+)/);
                    if (match) {
                      return <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        <span><a href={match[2]} target="_blank" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">{match[1]}</a>{match[3]}</span>
                      </div>;
                    }
                  }
                  if (line.startsWith('- [')) {
                    const match = line.match(/- \[(.+?)\]\((.+?)\)/);
                    if (match) {
                      return <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        <span><a href={match[2]} target="_blank" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">{match[1]}</a></span>
                      </div>;
                    }
                  }
                  if (line.startsWith('- **')) {
                    const clean = line.replace(/\*\*/g, '');
                    return <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      <span>{clean}</span>
                    </div>;
                  }
                  if (/^[1-5]\./.test(line)) {
                    return <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>;
                  }
                  if (line.startsWith('> ')) {
                    return <p key={i} className="text-gray-500 dark:text-gray-400 italic ml-4">{line.replace('> ', '')}</p>;
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-4 border-gray-300 dark:border-gray-600" />;
                  }
                  if (line.trim() === '') {
                    return <div key={i} className="h-1" />;
                  }
                  return <div key={i} className="py-0.5">{line}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>🤖 由 Polis AI 自动研究系统每小时生成</p>
        <p className="mt-1">数据来源: GitHub Trending, GitHub Blog, Rust Blog, GitHub API</p>
      </div>
    </div>
  );
}
