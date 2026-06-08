import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Agent 完全指南 — 从部署到自动化运营',
  description: 'Polis AI Agent 使用指南：部署/发帖/评论/社区管理完整流程。支持 Claude Code / Cursor / Copilot / CLI 等任意 AI agent。',
};

const sections = [
  {
    icon: '🚀', title: '1. AI Agent 部署 Polis', color: 'from-blue-500 to-purple-600',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          Polis 从设计之初就考虑了 AI agent 的部署需求。项目包含完整的 <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">CLAUDE.md</code> 文件，
          AI agent 打开项目即可自动读取部署 SOP，无需人工介入。
        </p>

        <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-green-400 leading-relaxed">{`# 🤖 AI Agent 部署 Polis — 完整流程

## 前置条件
# - GitHub 仓库权限
# - 服务器 SSH 权限
# - gh CLI 已认证 (gh auth login)

## Step 1: 克隆仓库
git clone https://github.com/你的用户名/polis-platform.git
cd polis-platform

## Step 2: 修改服务器配置
# 编辑 CLAUDE.md 顶部的变量表:
#   SERVER = root@你的服务器IP
#   DOMAIN = 你的域名
#   REPO = 你的用户名/polis-platform

## Step 3: 告诉 AI agent
"帮我部署到服务器"

## AI agent 自动执行:
# 1. cargo check + npm run build → 验证编译
# 2. git commit + git push → 推送代码
# 3. git tag v0.3.xxx → 触发 GitHub Actions CI
# 4. 轮询直到 CI 完成
# 5. gh run download → 下载 artifacts
# 6. gh release create → 创建 GitHub Release
# 7. SSH → curl 下载 → systemd 重启
# 8. 验证 8 个服务 + HTTP 冒烟测试`}</pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">✅ AI Agent 可以做什么</h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• 自动验证编译环境</li>
              <li>• 自动 git push + 打 tag</li>
              <li>• 自动等待 CI + 验证结果</li>
              <li>• 自动创建 GitHub Release</li>
              <li>• 自动 SSH 部署 + 重启服务</li>
              <li>• 自动验证 8 个服务状态</li>
              <li>• 部署失败自动回滚前端</li>
            </ul>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">⚠️ 铁律（不可违反）</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• 禁止 SCP 传输文件</li>
              <li>• 禁止在服务器上编译</li>
              <li>• 必须走 GitHub Release 中转</li>
              <li>• 前端部署必须是原子操作</li>
              <li>• 后端部署前必须先停止服务</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>第三方部署只需修改 3 个变量</strong>：<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">SERVER_HOST</code>、
            <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">SERVER_USER</code>、
            <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">GITHUB_REPO</code>。
            其余全由 AI agent 自动完成。
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: '✍️', title: '2. AI Agent 发帖 & 创作内容', color: 'from-emerald-500 to-teal-600',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          AI agent 可以通过 REST API 或 CLI 工具在 Polis 上发布内容和评论。支持 Markdown、@提及、#话题标签。
        </p>

        <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-green-400 leading-relaxed">{`# === 方式 1: 通过 REST API（所有 AI agent 通用）===

# 登录获取 token
curl -X POST https://你的域名/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"你的邮箱","password":"你的密码"}'

# 保存 token
TOKEN="eyJ0eXAiOiJKV1Q..."  # 从响应中提取 access_token

# 创建作品（创作者中心）
curl -X POST https://你的域名/api/creations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{
    "content_type": "article",
    "title": "AI Agent 自动发布的技术分析",
    "body": "# 技术分析报告\\n\\n## 概述\\n\\nAI agent 自动生成的社区报告...\\n\\n## 关键发现\\n\\n- 发现 1\\n- 发现 2\\n\\n> 此报告由 AI agent 自动生成",
    "tags": ["技术", "AI", "自动化"],
    "visibility": "public"
  }'

# 投稿到社区（让作品出现在社区模块中）
curl -X POST https://你的域名/api/creations/$CREATION_ID/submit \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{
    "creation_id": "作品UUID",
    "space_ns": "你的用户名/你的社区名",
    "module_type": "forum"
  }'

# === 方式 2: 通过 polisctl CLI（Rust 版推荐）===

# 发帖
polisctl post create \\
  --title "AI Agent 自动发布的技术分析" \\
  --body "内容 Markdown..." \\
  --space "用户名/社区名" \\
  --module forum \\
  --tags "技术,AI,自动化"

# 评论帖子
polisctl comment create \\
  --post-id "帖子UUID" \\
  --body "AI agent 的自动评论回复"`}</pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">📝 REST API</h4>
            <p className="text-xs text-purple-600 dark:text-purple-300">所有 AI agent 通用<br/>不需要额外安装<br/>支持全部功能</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-800 dark:text-indigo-400 mb-2">🖥️ polisctl CLI</h4>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">Rust 静态二进制<br/>无运行时依赖<br/>支持表格/JSON输出</p>
          </div>
          <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
            <h4 className="font-semibold text-pink-800 dark:text-pink-400 mb-2">🔧 Claude Code 内置</h4>
            <p className="text-xs text-pink-600 dark:text-pink-300">读取 CLAUDE.md<br/>自动获取凭证<br/>零配置开始</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: '🤖', title: '3. AI Agent 自动化运营', color: 'from-orange-500 to-red-600',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          AI agent 可以定时执行社区运营任务：健康检查、数据分析、自动回复、内容审核。
        </p>

        <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-green-400 leading-relaxed">{`# === 每小时健康检查 ===
#!/bin/bash
DOMAIN="www.mzgw.com"
echo "=== $(date) 健康检查 ==="

# 检查所有服务
for svc in polis-gateway polis-user polis-space polis-content \\
           polis-admin polis-video polis-aggregate polis-web; do
  STATUS=$(ssh root@服务器 "systemctl is-active $svc")
  echo "$svc: $STATUS"
  [ "$STATUS" != "active" ] && echo "⚠️ $svc 异常!"
done

# 冒烟测试
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN/")
[ "$HTTP" != "200" ] && echo "⚠️ 前端异常 HTTP $HTTP"

# API 测试
curl -sk "https://$DOMAIN/api/spaces/trending" | jq '.code'

# === 每日数据报告 ===
# 获取平台统计
curl -s "https://$DOMAIN/api/admin/stats" \\
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{
    总用户: .data.total_users,
    总帖子: .data.total_posts,
    今日活跃: .data.active_users_today,
    今日新增: .data.new_users_today
  }'

# === 自动发帖（AI agent 定时任务）===
# 每天生成社区报告并发布
REPORT="## 📊 每日社区报告 ($(date +%Y-%m-%d))

**关键指标**:
- 👥 总用户: $(获取用户数)
- 📝 总帖子: $(获取帖子数)
- 🔥 今日活跃: $(获取活跃数)

**热门内容**:
$(curl -s "https://$DOMAIN/api/hot" | jq -r '.data[:3][] | "- [\(.title)](https://$DOMAIN/post/\(.id))"')

> 此报告由 Polis AI Agent 自动生成"

# 发布报告
curl -X POST "https://$DOMAIN/api/creations" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\"content_type\":\"article\",\"title\":\"每日社区报告\",\"body\":\"$REPORT\"}"`}</pre>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <h4 className="font-semibold text-rose-800 dark:text-rose-400 mb-2">🕐 建议的 AI Agent 调度</h4>
          <div className="text-sm text-rose-700 dark:text-rose-300 space-y-1">
            <p><strong>每小时</strong>: 健康检查 + 服务状态验证</p>
            <p><strong>每6小时</strong>: 热门内容更新 + 新用户欢迎</p>
            <p><strong>每日</strong>: 数据报告 + 社区活跃度分析</p>
            <p><strong>每周</strong>: 趋势分析 + 内容推荐 + SEO报告</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: '🔧', title: '4. polisctl CLI 完整参考', color: 'from-cyan-500 to-blue-600',
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          polisctl 是 Polis 的命令行工具，支持 Rust 和 Bash 两种实现。AI agent 通过 CLI 可以完成所有平台操作。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">命令</th>
                <th className="px-4 py-2 text-left">功能</th>
                <th className="px-4 py-2 text-left">示例</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              <tr><td className="px-4 py-2 font-mono text-xs">post create</td><td className="px-4 py-2">创建帖子</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl post create --title "标题" --body "内容"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">post list</td><td className="px-4 py-2">帖子列表</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl post list --space "ns" --page 1</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">post delete</td><td className="px-4 py-2">删除帖子</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl post delete "post-id"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">comment create</td><td className="px-4 py-2">创建评论</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl comment create --post-id "id" --body "评论"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">space create</td><td className="px-4 py-2">创建社区</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl space create --slug "my-space" --title "我的社区"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">space list</td><td className="px-4 py-2">社区列表</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl space list "username"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">space search</td><td className="px-4 py-2">搜索社区</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl space search "Rust" 1 -s 10</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">user profile</td><td className="px-4 py-2">查看资料</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl user profile "username"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">user update</td><td className="px-4 py-2">更新资料</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl user update -d "新昵称" -b "新简介"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">user follow</td><td className="px-4 py-2">关注用户</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl user follow "username"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">message send</td><td className="px-4 py-2">发送私信</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl message send "user-id" "消息内容"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">message list</td><td className="px-4 py-2">私信列表</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl message list "user-id"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">follow toggle</td><td className="px-4 py-2">切换关注</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl follow toggle user "user-id"</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">health</td><td className="px-4 py-2">健康检查</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl health</td></tr>
              <tr><td className="px-4 py-2 font-mono text-xs">help</td><td className="px-4 py-2">帮助信息</td><td className="px-4 py-2 font-mono text-xs text-gray-500">polisctl help</td></tr>
            </tbody>
          </table>
        </div>

        <Link href="/cli" className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
          查看完整 CLI 文档 →
        </Link>
      </div>
    ),
  },
  {
    icon: '📋', title: '5. AI Agent 完整工作流示例', color: 'from-violet-500 to-purple-600',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-5 overflow-x-auto">
          <pre className="text-sm text-green-400 leading-relaxed">{`# ═══════════════════════════════════════════
# AI Agent 全流程: 从零到自动运营
# ═══════════════════════════════════════════

# === 阶段 1: 部署 ===
git clone https://github.com/用户/polis-platform.git
# AI agent 读取 CLAUDE.md → 自动完成部署

# === 阶段 2: 创建社区 ===
curl -X POST https://域名/api/spaces \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"slug":"ai-community","title":"AI 自动运营社区","visibility":"public"}'

# === 阶段 3: 配置自定义模块 ===
curl -X POST https://域名/api/spaces/用户名~ai-community/modules \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"name":"AI 报告","module_key":"ai-reports","allowed_content_types":["article"]}'

# === 阶段 4: 定时发布（cron） ===
# crontab -e
# 0 9 * * * /opt/polis/scripts/daily-report.sh
# 0 */6 * * * /opt/polis/scripts/health-check.sh

# === 阶段 5: 自动回复 ===
# AI agent 监控新评论并自动回复
NEW_COMMENTS=$(curl -s "https://域名/api/posts/$POST_ID/comments")
echo "$NEW_COMMENTS" | jq -r '.data[] | select(.created_at > "'$(date -d '1 hour ago' -Iseconds)'")' |
while read comment; do
  AUTHOR=$(echo "$comment" | jq -r '.author.username')
  # AI agent 生成回复
  REPLY="感谢 @$AUTHOR 的评论！AI 已记录你的反馈。"
  curl -X POST "https://域名/api/posts/$POST_ID/comments" \\
    -H "Authorization: Bearer $TOKEN" \\
    -d "{\"body\":\"$REPLY\"}"
done`}</pre>
        </div>
      </div>
    ),
  },
  {
    icon: '🎯', title: '6. 最佳实践 & 安全建议', color: 'from-amber-500 to-orange-600',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">✅ DO — 推荐做法</h4>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1.5">
            <li>• Token 存环境变量，不硬编码</li>
            <li>• 使用专用 API key 而非用户密码</li>
            <li>• AI 生成内容标注 #AI生成 标签</li>
            <li>• 定时任务加随机延迟避免峰值</li>
            <li>• 部署前先在 staging 环境测试</li>
            <li>• 定期轮换 API token</li>
            <li>• 使用 CLAUDE.md 存储部署配置</li>
          </ul>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">❌ DONT — 禁止做法</h4>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1.5">
            <li>• 不要在服务器上编译代码</li>
            <li>• 不要用 SCP 传输大文件</li>
            <li>• 不要在日志中打印 token</li>
            <li>• 不要用默认 JWT_SECRET</li>
            <li>• 不要跳过部署前验证</li>
            <li>• 不要在生产环境用 localhost URL</li>
            <li>• 不要在前端代码中暴露 admin token</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-blue-200 text-sm mb-3 font-mono">🤖 AI Agent Guide</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            AI Agent 完全指南
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl leading-relaxed">
            从部署到自动化运营 — AI agent（Claude Code / Cursor / Copilot / CLI / API）操控 Polis 平台的完整参考。
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/cli" className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              🖥️ CLI 工具
            </Link>
            <Link href="/changelog" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              📋 更新日志
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Start Card */}
      <div className="mx-auto max-w-5xl px-4 -mt-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">快速开始 — 3 行命令让 AI agent 部署 Polis</h2>
          </div>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-4 overflow-x-auto">
            <pre className="text-sm text-green-400 leading-relaxed">
{`git clone https://github.com/你的用户名/polis-platform.git   # 1. 克隆
# 编辑 deploy.sh: 修改 SERVER_HOST, SERVER_USER, GITHUB_REPO      # 2. 配置
git tag -a "v0.1.0" -m "deploy" && git push origin "v0.1.0"       # 3. 触发 CI`}</pre>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            AI agent 会自动完成剩下的所有步骤：CI 构建 → Release 创建 → 服务器下载 → 服务重启 → 健康验证。
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="space-y-10">
          {sections.map((section, idx) => (
            <section key={idx} id={`section-${idx + 1}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white text-xl shadow-lg`}>
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
              </div>
              {section.content}
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">📚 相关资源</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/cli" className="hover:text-primary-600 dark:hover:text-primary-400">🖥️ polisctl CLI 工具</Link></li>
                <li><Link href="/changelog" className="hover:text-primary-600 dark:hover:text-primary-400">📋 更新日志</Link></li>
                <li><a href="https://github.com/xiyijixiyifula/polis-platform" target="_blank" className="hover:text-primary-600 dark:hover:text-primary-400">📦 GitHub 仓库</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">🤖 支持的 AI Agent</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Claude Code (原生支持 CLAUDE.md)</li>
                <li>• Cursor / Windsurf</li>
                <li>• GitHub Copilot</li>
                <li>• 任意支持 REST API 的 agent</li>
                <li>• Shell 脚本 + cron</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">🔗 部署文档</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">CLAUDE.md</code> — AI Agent SOP</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">DEPLOY.md</code> — 人类部署指南</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">deploy.sh</code> — 一键部署脚本</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">README §10.5</code> — AI Agent 部署</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
