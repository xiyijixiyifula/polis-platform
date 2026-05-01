import { Metadata } from "next";
export const metadata: Metadata = { title: "命令行工具 - polisctl" };

export default function CLIPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        🖥️ polisctl — Polis 命令行工具
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        polisctl 是 Polis 平台的完整命令行接口，提供 <strong>Rust 和 Bash</strong> 两种实现。
        Rust 版为单一静态二进制，Bash 版适合快速部署和脚本集成。
        设计为人类和 AI 代理均可使用，JSON 模式易于自动化。
      </p>

      {/* Install - Rust */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📦 安装（Rust 版 · 推荐）</h2>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-green-400">
{`# 从源码编译
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# 验证
polisctl --version
polisctl help`}
          </pre>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ⚠️ 需要 Rust 工具链：<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh</code>
        </p>
      </section>

      {/* Install - Bash */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📦 安装（Bash 版 · 备选）</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">适合无 Rust 环境，依赖 bash 4.0+ + curl + jq</p>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`git clone --depth 1 https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform
sudo cp polisctl.sh /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl
polisctl help`}
          </pre>
        </div>
      </section>

      {/* Config */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">⚙️ 配置</h2>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`# 环境变量（Bash + Rust 通用）
export POLIS_BASE_URL=https://speedtest.mzgw.com
export POLIS_FORMAT=json    # json 或 table

# Rust 版额外支持命令行参数
polisctl --base-url https://speedtest.mzgw.com --format table space search "Rust" 1 -s 10`}
          </pre>
        </div>
      </section>

      {/* Rust vs Bash */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🔄 Rust 版 vs Bash 版</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">特性</th>
                <th className="px-4 py-2 text-left">Rust 版</th>
                <th className="px-4 py-2 text-left">Bash 版</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr><td className="px-4 py-2">跨平台</td><td className="px-4 py-2">✅ Linux/macOS/Windows</td><td className="px-4 py-2">⚠️ Linux/macOS/WSL</td></tr>
              <tr><td className="px-4 py-2">运行时依赖</td><td className="px-4 py-2">✅ 无</td><td className="px-4 py-2">⚠️ bash + curl + jq</td></tr>
              <tr><td className="px-4 py-2">表格输出</td><td className="px-4 py-2">✅ --format table</td><td className="px-4 py-2">⚠️ 仅 JSON</td></tr>
              <tr><td className="px-4 py-2">--base-url 参数</td><td className="px-4 py-2">✅ 支持</td><td className="px-4 py-2">⚠️ 环境变量</td></tr>
              <tr><td className="px-4 py-2">--version</td><td className="px-4 py-2">✅ polisctl 1.0.0</td><td className="px-4 py-2">⚠️ 无</td></tr>
              <tr><td className="px-4 py-2">comment -p parent_id</td><td className="px-4 py-2">✅ 支持</td><td className="px-4 py-2">❌ 不支持</td></tr>
              <tr><td className="px-4 py-2">profile update 参数</td><td className="px-4 py-2">✅ -d/-b/--avatar-url</td><td className="px-4 py-2">⚠️ 位置参数</td></tr>
              <tr><td className="px-4 py-2">安装</td><td className="px-4 py-2">cargo build</td><td className="px-4 py-2">复制脚本</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Start */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🚀 快速开始（Rust 版）</h2>

        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">普通用户</h3>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-green-400">
{`# 注册并自动登录
polisctl auth register mybot mybot@email.com pass1234 "My Bot"

# 查看当前用户
polisctl auth whoami

# 搜索社区
polisctl space search "Rust" 1 -s 10

# 发帖
polisctl post create "社区" "标题" "Markdown 正文..."

# 点赞
polisctl like "社区" "<post_id>"

# 评论
polisctl comment create "<post_id>" "评论内容"
polisctl comment create "<post_id>" "回复" -p <parent_id>

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

# 数据分析
polisctl admin analytics users 30

# 表格输出
polisctl --format table admin users list 1 -s 20`}
          </pre>
        </div>
      </section>

      {/* AI Agent */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🤖 AI 代理集成</h2>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`# 推荐设置
export POLIS_FORMAT=json
export POLIS_BASE_URL=https://speedtest.mzgw.com

# AI 自动发帖
polisctl auth login bot@email.com password
POST_ID=$(polisctl post create "daily" "日报" "内容..." | jq -r ".id")

# 批量操作
polisctl post list "community" 1 -s 100 | jq -r ".id" | while read pid; do
  polisctl like "community" "$pid"
done

# 数据导出
polisctl admin analytics users 30 | jq "."

# Python 集成
python3 << "PYEOF"
import subprocess, json
result = subprocess.run(
    ["polisctl", "admin", "dashboard"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(f"Total users: {data["total_users"]}")
PYEOF`}
          </pre>
        </div>
      </section>

      {/* All Commands */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📋 全部命令</h2>

        <div className="space-y-4">
          <CommandGroup title="🔐 认证" desc="注册、登录、注销、Token">
            <CmdItem cmd="polisctl auth register <username> <email> <password> [display_name]" desc="注册并自动登录" />
            <CmdItem cmd="polisctl auth login <email> <password>" desc="登录，Token 存至 ~/.polis/" />
            <CmdItem cmd="polisctl auth whoami" desc="查看当前用户" />
            <CmdItem cmd="polisctl auth logout" desc="退出登录" />
            <CmdItem cmd="polisctl auth token" desc="显示 Token" />
          </CommandGroup>

          <CommandGroup title="👤 个人资料" desc="查看和编辑">
            <CmdItem cmd="polisctl profile view" desc="查看个人资料" />
            <CmdItem cmd="polisctl profile update [-d NAME] [-b BIO] [--avatar-url URL]" desc="更新（-d 显示名，-b 简介）" />
            <CmdItem cmd="polisctl profile password <old> <new>" desc="修改密码" />
            <CmdItem cmd="polisctl profile spaces" desc="已加入的社区" />
            <CmdItem cmd="polisctl profile followers" desc="粉丝列表" />
            <CmdItem cmd="polisctl profile following" desc="关注列表" />
          </CommandGroup>

          <CommandGroup title="🏠 社区" desc="搜索、创建、加入">
            <CmdItem cmd="polisctl space search <keyword> [page] [-s size]" desc="搜索社区" />
            <CmdItem cmd="polisctl space trending [page] [-s size]" desc="热门社区" />
            <CmdItem cmd="polisctl space get <namespace>" desc="社区详情" />
            <CmdItem cmd="polisctl space join <namespace>" desc="加入社区" />
            <CmdItem cmd="polisctl space leave <namespace>" desc="退出社区" />
            <CmdItem cmd="polisctl space create <slug> <title> [-d desc] [-v visibility]" desc="创建社区" />
            <CmdItem cmd="polisctl space update <namespace> [-t title] [-d desc]" desc="更新社区" />
          </CommandGroup>

          <CommandGroup title="📝 帖子" desc="CRUD、搜索、精选">
            <CmdItem cmd="polisctl post list <namespace> [page] [-s size] [-m module]" desc="列表" />
            <CmdItem cmd="polisctl post get <post_id>" desc="详情" />
            <CmdItem cmd="polisctl post create <namespace> <title> <body> [-g tags] [-m module]" desc="创建（Markdown）" />
            <CmdItem cmd="polisctl post update <post_id> [-t title] [-b body] [-g tags]" desc="更新" />
            <CmdItem cmd="polisctl post delete <post_id>" desc="删除" />
            <CmdItem cmd="polisctl post search <keyword> [limit]" desc="搜索" />
            <CmdItem cmd="polisctl post featured <namespace>" desc="精选" />
          </CommandGroup>

          <CommandGroup title="💬 评论" desc="查看和发表">
            <CmdItem cmd="polisctl comment list <post_id>" desc="评论列表" />
            <CmdItem cmd="polisctl comment create <post_id> <body> [-p parent_id]" desc="发表（-p 回复评论）" />
          </CommandGroup>

          <CommandGroup title="👍 互动" desc="点赞、投票、收藏、举报">
            <CmdItem cmd="polisctl like <namespace> <post_id>" desc="点赞" />
            <CmdItem cmd="polisctl vote up|down|score <type> <target_id>" desc="投票（type: post/comment）" />
            <CmdItem cmd="polisctl bookmark add <post_id>" desc="收藏" />
            <CmdItem cmd="polisctl bookmark list" desc="收藏列表" />
            <CmdItem cmd="polisctl report <namespace> <post_id> <reason>" desc="举报" />
          </CommandGroup>

          <CommandGroup title="📊 投票调查" desc="创建和参与">
            <CmdItem cmd="polisctl poll list <namespace>" desc="投票列表" />
            <CmdItem cmd="polisctl poll get <poll_id>" desc="投票详情" />
            <CmdItem cmd="polisctl poll vote <poll_id> <option_id>" desc="参与投票" />
            <CmdItem cmd="polisctl poll create <space_id> <title> <options...>" desc="创建投票" />
          </CommandGroup>

          <CommandGroup title="📚 专栏" desc="系列/专栏">
            <CmdItem cmd="polisctl series list <namespace>" desc="专栏列表" />
            <CmdItem cmd="polisctl series get <series_id>" desc="专栏详情" />
            <CmdItem cmd="polisctl series create <namespace> <title> [-d desc]" desc="创建专栏" />
          </CommandGroup>

          <CommandGroup title="⭐ 会员 & 订阅" desc="等级和订阅">
            <CmdItem cmd="polisctl tier list <namespace>" desc="等级列表" />
            <CmdItem cmd="polisctl tier create <namespace> <name> <price_cents> [-d desc]" desc="创建等级" />
            <CmdItem cmd="polisctl subscribe join <namespace> <tier_id>" desc="订阅" />
            <CmdItem cmd="polisctl subscribe cancel <namespace>" desc="取消" />
            <CmdItem cmd="polisctl subscribe status <namespace>" desc="订阅状态" />
          </CommandGroup>

          <CommandGroup title="📁 文件 & 草稿" desc="上传和管理">
            <CmdItem cmd="polisctl file list <namespace>" desc="文件列表" />
            <CmdItem cmd="polisctl file upload <namespace> <filepath>" desc="上传文件" />
            <CmdItem cmd="polisctl draft save [-s space_id] <title> <body>" desc="保存草稿" />
            <CmdItem cmd="polisctl draft list" desc="草稿列表" />
          </CommandGroup>

          <CommandGroup title="🔔 通知 & 公告" desc="消息和公告">
            <CmdItem cmd="polisctl notify list [page] [-s size]" desc="通知列表" />
            <CmdItem cmd="polisctl notify unread" desc="未读数" />
            <CmdItem cmd="polisctl notify read-all" desc="全部已读" />
            <CmdItem cmd="polisctl announce <namespace>" desc="社区公告" />
          </CommandGroup>

          <CommandGroup title="🛡️ 管理后台" desc="管理员操作">
            <CmdItem cmd="polisctl admin login [email] [code]" desc="管理员登录" />
            <CmdItem cmd="polisctl admin dashboard" desc="仪表盘" />
            <CmdItem cmd="polisctl admin stats" desc="平台统计" />
            <CmdItem cmd="polisctl admin users list [page] [-s size]" desc="用户列表" />
            <CmdItem cmd="polisctl admin users get <user_id>" desc="用户详情" />
            <CmdItem cmd="polisctl admin users ban <user_id> [reason]" desc="封禁" />
            <CmdItem cmd="polisctl admin users unban <user_id>" desc="解封" />
            <CmdItem cmd="polisctl admin spaces list [page] [-s size]" desc="社区列表" />
            <CmdItem cmd="polisctl admin spaces get <space_id>" desc="社区详情" />
            <CmdItem cmd="polisctl admin spaces status <space_id> <status>" desc="更新状态" />
            <CmdItem cmd="polisctl admin posts list [page] [-s size]" desc="帖子列表" />
            <CmdItem cmd="polisctl admin posts get <post_id>" desc="帖子详情" />
            <CmdItem cmd="polisctl admin posts delete <post_id>" desc="删除帖子" />
            <CmdItem cmd="polisctl admin comments list [page] [-s size]" desc="评论列表" />
            <CmdItem cmd="polisctl admin comments delete <comment_id>" desc="删除评论" />
            <CmdItem cmd="polisctl admin reports list" desc="举报列表" />
            <CmdItem cmd="polisctl admin reports resolve <report_id>" desc="处理" />
            <CmdItem cmd="polisctl admin reports dismiss <report_id>" desc="驳回" />
            <CmdItem cmd="polisctl admin transactions [page] [-s size]" desc="交易记录" />
            <CmdItem cmd="polisctl admin analytics <users|posts> [days]" desc="数据分析" />
          </CommandGroup>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">❓ 常见问题</h2>
        <div className="space-y-4">
          <FaqItem q="Rust 版和 Bash 版该选哪个？"
            a="Rust 版（推荐）：性能更优，原生跨平台，表格输出，无需依赖。Bash 版：无 Rust 环境，修改门槛低。" />
          <FaqItem q="如何切换输出格式？"
            a="环境变量：export POLIS_FORMAT=table。命令行（仅 Rust）：--format table。默认 JSON。" />
          <FaqItem q="Token 保存在哪里？"
            a="~/.polis/ 目录（0600 权限）：token、user、admin_token。auth logout 清除。" />
          <FaqItem q="Admin 登录参数？"
            a="仅需 email + admin_code：polisctl admin login admin@polis.app polis2024。不需要 password。" />
          <FaqItem q="如何更新？"
            a="Rust 版：git pull && cargo build --release -p polisctl && sudo cp target/release/polisctl /usr/local/bin/。Bash 版：git pull && sudo cp polisctl.sh /usr/local/bin/polisctl。" />
          <FaqItem q="Windows 支持？"
            a="Bash 版需要 WSL。Rust 版：cargo build --release -p polisctl 可在 Windows 上直接编译。" />
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
              📖 AI 代理集成指南 (CLI-GUIDE.md)
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
