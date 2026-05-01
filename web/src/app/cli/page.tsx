import { Metadata } from 'next';
export const metadata: Metadata = { title: '命令行工具 - polisctl' };

export default function CLIPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        🖥️ polisctl — Polis 命令行工具 (Rust)
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        polisctl 是 Polis 平台的完整命令行接口，使用 <strong>Rust</strong> 编写为单一静态二进制文件，
        无需安装任何运行时依赖，支持 Linux、macOS、Windows 三大平台。
      </p>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        专为 AI 代理和自动化脚本设计 — 使用 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">--format json</code> 获取结构化输出，
        配合 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">jq</code> 轻松实现数据处理。
      </p>

      {/* Install */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📦 安装</h2>

        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">二进制下载 (推荐)</h3>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-green-400">
{`# Linux x86_64
wget https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl-linux-amd64 \\
  -O /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl

# macOS Apple Silicon (M1/M2/M3)
wget https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl-darwin-arm64 \\
  -O /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl

# macOS Intel
wget https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl-darwin-amd64 \\
  -O /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl`}
          </pre>
        </div>

        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">源码编译</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">需要 Rust 1.70+ 工具链</p>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-green-400">
{`# 克隆仓库
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 编译 polisctl
cargo build --release -p polisctl

# 安装到系统路径
sudo cp target/release/polisctl /usr/local/bin/

# 验证
polisctl --version`}
          </pre>
        </div>
      </section>

      {/* Config */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">⚙️ 配置</h2>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">方式一：环境变量（持久化）</h3>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-green-400">
{`export POLIS_BASE_URL=https://speedtest.mzgw.com
export POLIS_FORMAT=json    # json 或 table`}
            </pre>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">方式二：命令行参数（一次性）</h3>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-green-400">
{`polisctl --base-url https://speedtest.mzgw.com --format json space search "Rust" 1 10`}
            </pre>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🚀 快速开始</h2>

        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">普通用户</h3>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-green-400">
{`# 注册并自动登录
polisctl auth register mybot mybot@email.com pass1234 "My Bot"

# 查看当前用户
polisctl auth whoami

# 搜索社区
polisctl space search "Rust" 1 10

# 查看社区详情
polisctl space get "zhangsan/rust-lab"

# 浏览帖子
polisctl post list "zhangsan/rust-lab" 1 10

# 发帖
polisctl post create "zhangsan/rust-lab" "标题" "Markdown 正文..."

# 点赞
polisctl like "zhangsan/rust-lab" "<post_id>"

# 评论
polisctl comment create "<post_id>" "评论内容"

# 投票
polisctl vote up post "<post_id>"`}
          </pre>
        </div>

        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">管理员</h3>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`# 管理员登录
polisctl admin login admin@polis.app polis2024

# 平台概览
polisctl admin dashboard

# 查看用户列表
polisctl admin users list 1 20

# 数据分析
polisctl admin analytics users 30
polisctl admin analytics posts 7`}
          </pre>
        </div>
      </section>

      {/* AI Agent */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🤖 AI 代理集成</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          polisctl 天生为 AI 代理设计。JSON 输出模式下每一行都是一个独立的 JSON 对象，
          可直接管道传递给 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">jq</code> 或其他工具。
        </p>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`# 推荐设置
export POLIS_FORMAT=json
export POLIS_BASE_URL=https://speedtest.mzgw.com

# AI 自动发帖
polisctl auth login bot@email.com password > /dev/null
POST_ID=$(polisctl post create "daily" "日报" "内容..." | jq -r '.id')

# 批量操作
polisctl post list "community" 1 100 | jq -r '.id' | while read pid; do
  polisctl like "community" "$pid"
done

# 数据导出
polisctl admin analytics users 30 | jq '.'

# 与 Python/Node.js 脚本集成
python3 << 'PYEOF'
import subprocess, json
result = subprocess.run(
    ["polisctl", "admin", "dashboard"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(f"Total users: {data['total_users']}")
PYEOF`}
          </pre>
        </div>
      </section>

      {/* All Commands */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📋 全部命令</h2>

        <div className="space-y-4">
          <CommandGroup title="🔐 认证" desc="注册、登录、注销、Token 管理">
            <CmdItem cmd="polisctl auth register <username> <email> <password> [display_name]" desc="注册新账号并自动登录" />
            <CmdItem cmd="polisctl auth login <email> <password>" desc="登录获取 Token，保存至 ~/.polis/" />
            <CmdItem cmd="polisctl auth whoami" desc="查看当前登录用户信息" />
            <CmdItem cmd="polisctl auth logout" desc="退出登录，清除本地 Token" />
            <CmdItem cmd="polisctl auth token" desc="显示当前 Token" />
          </CommandGroup>

          <CommandGroup title="👤 个人资料" desc="查看和编辑个人资料">
            <CmdItem cmd="polisctl profile view" desc="查看个人资料" />
            <CmdItem cmd="polisctl profile update [-d NAME] [-b BIO] [--avatar-url URL]" desc="更新个人资料" />
            <CmdItem cmd="polisctl profile password <old> <new>" desc="修改密码" />
            <CmdItem cmd="polisctl profile spaces" desc="查看已加入的社区" />
            <CmdItem cmd="polisctl profile followers" desc="查看粉丝列表" />
            <CmdItem cmd="polisctl profile following" desc="查看关注列表" />
          </CommandGroup>

          <CommandGroup title="👥 关注" desc="关注用户和社区">
            <CmdItem cmd="polisctl follow user <username>" desc="关注用户" />
            <CmdItem cmd="polisctl follow space <namespace>" desc="关注社区" />
          </CommandGroup>

          <CommandGroup title="🏠 社区" desc="搜索、创建、加入社区">
            <CmdItem cmd="polisctl space search <keyword> [page] [-s size]" desc="搜索社区" />
            <CmdItem cmd="polisctl space trending [page] [-s size]" desc="热门社区" />
            <CmdItem cmd="polisctl space get <namespace>" desc="查看社区详情" />
            <CmdItem cmd="polisctl space join <namespace>" desc="加入社区" />
            <CmdItem cmd="polisctl space leave <namespace>" desc="退出社区" />
            <CmdItem cmd="polisctl space create <slug> <title> [-d desc] [-v visibility]" desc="创建社区" />
            <CmdItem cmd="polisctl space update <namespace> [-t title] [-d desc]" desc="更新社区信息" />
            <CmdItem cmd="polisctl space root <slug>" desc="查看根空间" />
            <CmdItem cmd="polisctl space subspaces <slug>" desc="查看子空间列表" />
          </CommandGroup>

          <CommandGroup title="📝 帖子" desc="CRUD、搜索、精选帖子">
            <CmdItem cmd="polisctl post list <namespace> [page] [-s size] [-m module]" desc="列出社区帖子" />
            <CmdItem cmd="polisctl post get <post_id>" desc="查看帖子详情" />
            <CmdItem cmd="polisctl post create <namespace> <title> <body> [-g tags] [-m module]" desc="创建新帖子（支持 Markdown）" />
            <CmdItem cmd="polisctl post update <post_id> [-t title] [-b body] [-g tags]" desc="更新帖子" />
            <CmdItem cmd="polisctl post delete <post_id>" desc="删除帖子" />
            <CmdItem cmd="polisctl post search <keyword> [limit]" desc="搜索帖子" />
            <CmdItem cmd="polisctl post featured <namespace>" desc="查看精选帖子" />
          </CommandGroup>

          <CommandGroup title="💬 评论" desc="查看和发表评论">
            <CmdItem cmd="polisctl comment list <post_id>" desc="查看帖子评论" />
            <CmdItem cmd="polisctl comment create <post_id> <body> [-p parent_id]" desc="发表评论（支持回复）" />
          </CommandGroup>

          <CommandGroup title="👍 互动" desc="点赞、投票、收藏、举报">
            <CmdItem cmd="polisctl like <namespace> <post_id>" desc="点赞帖子" />
            <CmdItem cmd="polisctl vote up|down|score <type> <target_id>" desc="投票（type: post/comment）" />
            <CmdItem cmd="polisctl bookmark add <post_id>" desc="收藏帖子" />
            <CmdItem cmd="polisctl bookmark list" desc="查看收藏列表" />
            <CmdItem cmd="polisctl report <namespace> <post_id> <reason>" desc="举报帖子" />
          </CommandGroup>

          <CommandGroup title="📊 投票调查" desc="创建和参与投票">
            <CmdItem cmd="polisctl poll list <namespace>" desc="查看社区投票列表" />
            <CmdItem cmd="polisctl poll get <poll_id>" desc="查看投票详情" />
            <CmdItem cmd="polisctl poll vote <poll_id> <option_id>" desc="参与投票" />
            <CmdItem cmd="polisctl poll create <space_id> <title> <options...>" desc="创建投票" />
          </CommandGroup>

          <CommandGroup title="📚 专栏" desc="社区的系列/专栏管理">
            <CmdItem cmd="polisctl series list <namespace>" desc="查看专栏列表" />
            <CmdItem cmd="polisctl series get <series_id>" desc="查看专栏详情" />
            <CmdItem cmd="polisctl series create <namespace> <title> [-d desc]" desc="创建专栏" />
          </CommandGroup>

          <CommandGroup title="⭐ 会员 & 订阅" desc="等级管理和订阅操作">
            <CmdItem cmd="polisctl tier list <namespace>" desc="查看会员等级" />
            <CmdItem cmd="polisctl tier create <namespace> <name> <price_cents> [-d desc]" desc="创建会员等级" />
            <CmdItem cmd="polisctl subscribe join <namespace> <tier_id>" desc="订阅会员" />
            <CmdItem cmd="polisctl subscribe cancel <namespace>" desc="取消订阅" />
            <CmdItem cmd="polisctl subscribe status <namespace>" desc="查看订阅状态" />
          </CommandGroup>

          <CommandGroup title="📁 文件 & 草稿" desc="文件上传和草稿管理">
            <CmdItem cmd="polisctl file list <namespace>" desc="查看社区文件列表" />
            <CmdItem cmd="polisctl file upload <namespace> <filepath>" desc="上传文件" />
            <CmdItem cmd="polisctl draft save [-s space_id] <title> <body>" desc="保存草稿" />
            <CmdItem cmd="polisctl draft list" desc="查看草稿列表" />
          </CommandGroup>

          <CommandGroup title="🔔 通知 & 公告" desc="消息通知和社区公告">
            <CmdItem cmd="polisctl notify list [page] [-s size]" desc="查看通知列表" />
            <CmdItem cmd="polisctl notify unread" desc="查看未读通知数" />
            <CmdItem cmd="polisctl notify read-all" desc="标记所有通知为已读" />
            <CmdItem cmd="polisctl announce <namespace>" desc="查看社区公告" />
          </CommandGroup>

          <CommandGroup title="🛡️ 管理后台" desc="管理员专属操作">
            <CmdItem cmd="polisctl admin login [email] [code]" desc="管理员登录" />
            <CmdItem cmd="polisctl admin dashboard" desc="仪表盘概览" />
            <CmdItem cmd="polisctl admin stats" desc="平台统计" />
            <CmdItem cmd="polisctl admin users list [page] [-s size]" desc="用户列表" />
            <CmdItem cmd="polisctl admin users get <user_id>" desc="用户详情" />
            <CmdItem cmd="polisctl admin users ban <user_id> [reason]" desc="封禁用户" />
            <CmdItem cmd="polisctl admin users unban <user_id>" desc="解封用户" />
            <CmdItem cmd="polisctl admin spaces list [page] [-s size]" desc="社区列表" />
            <CmdItem cmd="polisctl admin spaces get <space_id>" desc="社区详情" />
            <CmdItem cmd="polisctl admin spaces status <space_id> <status>" desc="更新社区状态" />
            <CmdItem cmd="polisctl admin posts list [page] [-s size]" desc="帖子列表" />
            <CmdItem cmd="polisctl admin posts get <post_id>" desc="帖子详情" />
            <CmdItem cmd="polisctl admin posts delete <post_id>" desc="删除帖子" />
            <CmdItem cmd="polisctl admin comments list [page] [-s size]" desc="评论列表" />
            <CmdItem cmd="polisctl admin comments delete <comment_id>" desc="删除评论" />
            <CmdItem cmd="polisctl admin reports list" desc="举报列表" />
            <CmdItem cmd="polisctl admin reports resolve <report_id>" desc="处理举报" />
            <CmdItem cmd="polisctl admin reports dismiss <report_id>" desc="驳回举报" />
            <CmdItem cmd="polisctl admin transactions [page] [-s size]" desc="交易记录" />
            <CmdItem cmd="polisctl admin analytics <users|posts> [days]" desc="数据分析" />
          </CommandGroup>
        </div>
      </section>

      {/* Output Format */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📊 输出格式</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">JSON 模式 (--format json)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              默认格式，每行一个 JSON 对象。适合 AI 代理和管道处理。
            </p>
            <div className="bg-gray-900 dark:bg-gray-800 rounded p-2">
              <pre className="text-xs text-green-400">
{`$ polisctl space trending 1 -s 2
{"id":"b10...","title":"创作之家","member_count":1500}
{"id":"b10...","title":"生活分享","member_count":980}`}
              </pre>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">表格模式 (--format table)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              人类可读的表格格式，适合交互式使用。
            </p>
            <div className="bg-gray-900 dark:bg-gray-800 rounded p-2">
              <pre className="text-xs text-green-400">
{`$ polisctl --format table space trending 1 -s 2
title       member_count  visibility
----------  ------------  ----------
创作者之家    1500         public
生活分享      980          public`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">❓ 常见问题</h2>
        <div className="space-y-4">
          <FaqItem q="支持哪些平台？"
            a="Linux (x86_64)、macOS (Intel 和 Apple Silicon)、Windows。单一静态二进制文件，无需任何运行时依赖。" />
          <FaqItem q="与 Bash 版的区别？"
            a="Rust 版性能更优（启动 < 5ms），原生跨平台支持（包括 Windows），无需安装 jq/curl 等依赖。增加了表格输出模式。" />
          <FaqItem q="输出格式如何切换？"
            a={'环境变量：export POLIS_FORMAT=table\n命令行参数：--format json 或 --format table\nJSON 模式为默认模式（推荐用于脚本和 AI 代理）。'} />
          <FaqItem q="Token 保存在哪里？"
            a="~/.polis/ 目录下，以 0600 权限安全存储。包括 token、user、admin_token 三个文件。" />
          <FaqItem q="Admin 登录需要什么参数？"
            a="Admin 登录使用 email 和 admin_code。默认示例：polisctl admin login admin@polis.app polis2024" />
          <FaqItem q="如何卸载？"
            a="删除二进制文件和配置目录即可：sudo rm /usr/local/bin/polisctl && rm -rf ~/.polis/" />
          <FaqItem q="如何编译 Windows 版本？"
            a={'使用 cross 工具：# cargo install cross\ncross build --release -p polisctl --target x86_64-pc-windows-gnu'} />
        </div>
      </section>

      {/* Resources */}
      <section className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">📚 更多资源</h2>
        <ul className="space-y-2 text-blue-700 dark:text-blue-300">
          <li>
            <a href="https://github.com/xiyijixiyifula/polis-platform/tree/main/crates/polisctl"
               className="hover:underline" target="_blank" rel="noopener noreferrer">
              📦 Rust 源码 (crates/polisctl/)
            </a>
          </li>
          <li>
            <a href="https://github.com/xiyijixiyifula/polis-platform/blob/main/docs/CLI-GUIDE.md"
               className="hover:underline" target="_blank" rel="noopener noreferrer">
              📖 AI 代理集成完整指南 (CLI-GUIDE.md)
            </a>
          </li>
          <li>
            <a href="https://speedtest.mzgw.com"
               className="hover:underline" target="_blank" rel="noopener noreferrer">
              🌐 Polis 在线平台
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

// Helper Components

function CommandGroup({ title, desc, children }: {
  title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </div>
  );
}

function CmdItem({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded shrink-0">
        {cmd}
      </code>
      <span className="text-sm text-gray-500 dark:text-gray-400 pt-0.5">{desc}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-medium text-gray-900 dark:text-white">{q}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">{a}</p>
    </div>
  );
}
