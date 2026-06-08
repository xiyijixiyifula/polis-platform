import { Metadata } from 'next';

export const metadata: Metadata = { title: 'AI 研究报告 - Polis' };

const roadmap = [
  {
    ver: 'H+0', icon: '🏠', title: '健康检查 + 基础维护',
    items: [
      '🔥 冒烟测试: 首页/Changelog/API 端点 200 验证',
      '🔧 6 服务 systemctl is-active 检查',
      '📊 全量测试: 17 页面 200 + API 端点 + E2E',
      '📝 文档同步: changelog + README + docs/ (ARCHITECTURE/AUTO-DEV/DEV-SETUP/USER-GUIDE)',
      '🚀 部署: 本地交叉编译 → GitHub Releases → 服务器下载 → systemctl restart → verify',
    ],
  },
  {
    ver: 'H+1', icon: '🔬', title: '社区调研 + 功能规划',
    items: [
      '📈 GitHub Trending (type=rust, community 项目)',
      '🦀 Rust 官方动态 (blog.rust-lang.org)',
      '⚛️ Next.js 发布检查 (github.com/vercel/next.js/releases)',
      '🔍 ActivityPub/federation/social Rust 项目搜索',
      '🎯 对标产品更新: Discord, Notion, 知识星球, 知乎, 小红书',
      '📋 输出: 最有价值功能 + 实现评估 (1小时内能否完成)',
    ],
  },
  {
    ver: 'H+2', icon: '💡', title: '小功能开发 (30-50 分钟)',
    items: [
      '🎨 前端集成: 后端已就绪的前端组件',
      '🖥️ CLI 功能增强: 新增命令/参数',
      '🧩 单路由/单组件: 一个 API + 一个页面',
      '🔗 链接/导航优化: 已有功能的交互改进',
      '⚠️ Bug 修复: 单文件修改的快速修复',
    ],
  },
  {
    ver: 'H+3~H+4', icon: '🏗️', title: '中等功能 (2 小时分拆)',
    items: [
      'H+3: 后端实现 — 数据库迁移 + Rust API + 构建验证',
      'H+4: 前端集成 — 页面/组件 + API 对接 + 部署',
      '📋 示例: 新 Tab 页面、新交互组件、数据导入导出',
    ],
  },
  {
    ver: 'H+5~H+8', icon: '🚀', title: '大型功能 (4-8 小时分拆)',
    items: [
      '💬 WebSocket 实时聊天 (H+5: 后端, H+6: 前端, H+7: 测试, H+8: 部署)',
      '🔑 OAuth 第三方登录 (H+5: GitHub OAuth, H+6: 前端集成)',
      '📈 社区统计分析 (H+5: API + 数据, H+6: 图表展示)',
      '🎬 视频上传 ✅ (v0.3.80 — HLS 播放器 + 650MB 上传已上线)',
    ],
  },
  {
    ver: '长期', icon: '🎯', title: '持续迭代方向',
    items: [
      '🛠️ 管理后台增强 ✅ (用户/社区/内容/举报/交易管理 + 仪表盘)',
      '🧪 端到端测试套件 ✅ (17 页面 + 多 API 端点)',
      '📋 系统健康检查 ✅ (每小时自动执行)',
      '📁 文件分享系统 ✅ (上传/分享/密码/过期)',
      '💰 付费社区 ✅ (会员等级 + 订阅 + 前端面板)',
      '📖 专栏/内容系列 ✅ (系列创建/收录/展示)',
      '🎬 视频模块 ✅ (HLS 播放器 + 650MB 上传 + 流式播放)',
      '🔗 引用驱动架构 ✅ (跨社区投稿引用，module_refs 表)',
      '🎨 创作中心 ✅ (独立创作 + 多社区投稿 + 数据分析)',
      '🏠 首页 Feed ✅ (三Tab：全部动态/关注的人/热门 + 右侧栏趋势)',
      '🔒 社区安全 ✅ (封禁/密码保护/可见性控制/等级系统)',
      '🤖 polisctl CLI ✅ (Rust + Bash 双版本，AI Agent 集成)',
      '🛡️ Gateway 安全 ✅ (限流中间件 + JWT_SECRET 强制验证)',
      '💻 Git 代码仓库 (规划中)',
      '🧩 WASM 插件引擎 (规划中)',
      '💎 支付/打赏 (规划中)',
      '🌐 国际化 i18n (规划中)',
      '🔗 ActivityPub 联邦 (规划中)',
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
    reportContent = '# 📊 暂无研究报告\n\n研究报告将在每小时整点自动生成。';
  }

  const sections = reportContent.split('## ').filter((s: string) => s.trim());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🤖 AI 研究院</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reportTime ? `更新时间: ${reportTime}` : '每小时自动研究 + 规划 + 开发'}
            {currentVer ? ` | ${currentVer}` : ''}
          </p>
        </div>
        <a href="/changelog" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
          ← 查看更新日志
        </a>
      </div>

      {/* 每小时计划 — 按小时划分 */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">⏰</span> 每小时任务计划 <span className="text-sm font-normal text-gray-400 dark:text-gray-500">(AI 每小时循环执行一次)</span>
        </h2>
        <div className="space-y-4">
          {roadmap.map((v) => (
            <div key={v.ver} className={`relative pl-8 border-l-2 ${v.ver === 'H+0' ? 'border-green-400 dark:border-green-600' : 'border-amber-200 dark:border-amber-800'}`}>
              <div className={`absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-white dark:border-gray-900 ${v.ver === 'H+0' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <div className="mb-2 flex items-center gap-3">
                <span className="text-base font-bold text-gray-900 dark:text-white">{v.icon} {v.ver}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.ver === 'H+0' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                  {v.ver === 'H+0' ? '每小时执行' : v.ver.startsWith('H+') ? '按需执行' : '持续迭代'}
                </span>
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
