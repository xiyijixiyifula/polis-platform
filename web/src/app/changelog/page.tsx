import { Metadata } from 'next';
export const metadata: Metadata = { title: '更新日志' };

export default function ChangelogPage() {
  const versions = [
    {
      ver: '0.2.6', date: '2026-04-30', title: 'DESIGN.md 设计系统 + 页面修复与文档完善',
      items: [
        '🎨 DESIGN.md: 完整设计系统文档 (426行)，符合 awesome-design-md 标准',
        '🎨 设计令牌: 颜色体系 (Purple/Indigo)、字体阶梯、间距系统、圆角规范',
        '🎨 组件规范: 按钮 (primary/secondary/ghost)、卡片、输入框、徽章、标签页',
        '🎨 布局模式: 页面/网格/侧边栏/导航栏/空状态/加载态 完整规范',
        '🎨 暗黑模式: 完整的 dark: 变体映射表 + 主题切换策略',
        '🎨 响应式: sm/md/lg/xl 断点 + 移动端适配规范',
        '🐛 修复: /trending 热门页面 404 (Header/Sidebar 引用但页面缺失)',
        '🐛 修复: /hot 热榜页面 404 (Sidebar 引用但页面缺失)',
        '🐛 修复: /polls 投票中心页面 404 (仅 /polls/new 存在)',
        '🐛 修复: /space/* 空间页面 404 (服务器 page.tsx 被误删)',
        '📖 USER-GUIDE.md: 245行完整用户使用指南 (注册到管理后台全流程)',
        '📖 README.md: 重写，移除16项不实功能描述，标注10个桩代码状态',
        '🔒 HTTPS 已配置: Let\'s Encrypt + TLS 1.3 + HSTS + 安全响应头',
        '📋 HTTPS-CONFIG.md: 完整证书/Nginx/故障排查/急救流程参考手册',
        '✅ 全量页面测试: 30+ 路由全部 200，注册+创建+发帖+评论+投票实测通过',
      ],
    },
    {
      ver: '0.2.5', date: '2026-04-30', title: '关注/粉丝社交系统',
      items: [
        '👥 关注/取关功能: 用户主页一键关注，再次点击取关',
        '👥 粉丝列表: 查看关注者和被关注者列表',
        '👥 关注计数: 用户主页实时显示粉丝数和关注数',
        '👥 个人主页增强: 新增粉丝/关注标签页',
        '🌙 暗黑模式: profile 页面全面适配深色主题',
        '🔧 Gateway: 新增 /api/follow 路由代理到 user 服务',
        '📡 API: users.toggleFollow / follow.followers / follow.following',
        '🐛 修复: profile/[username] TypeScript strict null 检查',
        '🔧 部署脚本 v2.0: 修复 10 项测试中的 6 个 Bug (错误路径/payload)',
        '🔧 自动回滚: 构建失败时从备份恢复旧二进制',
        '🔧 .env 保护: 构建前自动校验 DATABASE_URL 并备份',
        '🔧 增量构建: 只重新编译有变更的服务',
        '📋 DEPLOY.md: 完整部署方案文档 + 已知限制 + 改进路线图',
      ],
    },
    {
      ver: '0.2.4', date: '2026-04-30', title: '暗黑模式增强 + Admin 修复',
      items: [
        '🌙 暗黑模式全面增强: Header、首页、更新日志等核心页面适配',
        '🌙 CSS 变量 + Tailwind dark: 变体实现主题切换',
        '🌙 导航栏、搜索框、下拉菜单、卡片组件暗黑适配',
        '🐛 修复: Admin 服务路由语法 Axum 0.8 兼容 (:id → {id})',
        '🐛 修复: 生产环境数据库密码配置错误',
        '🔧 polis-admin 服务恢复正常运行',
        '💾 主题偏好自动保存到 localStorage',
      ],
    },
    {
      ver: '0.1.0', date: '2026-04-28', title: 'Polis MVP 发布',
      items: [
        '用户注册/登录系统', '社区创建与管理', '论坛帖子/评论/点赞',
        'API 网关', 'Docker 开发环境',
      ],
    },
    {
      ver: '0.1.1', date: '2026-04-29', title: 'Bug 修复与路由重构',
      items: [
        '🐛 修复: 多段 namespace 路由支持 (catch-all {*path})',
        '🐛 修复: 添加 GET /api/users/me 端点',
        '🐛 修复: 帖子列表作者信息为空的问题 (批量查询用户)',
        '🐛 修复: 创建社区时的 namespace 冲突',
        '🔐 修复: 内容服务和社区服务的鉴权中间件缺失',
        '🔄 重构: Gateway 路由分发器支持智能路径转发',
      ],
    },
    {
      ver: '0.2.0', date: '2026-04-29', title: '搜索与内容增强',
      items: [
        '📋 社区公告板功能 (前后端完整实现)',
        '📊 帖子投票/问卷系统 (后端 + PollCard 组件)',
        '🗳️ 赞同/反对投票 (VoteButton 组件)',
        '👤 用户个人主页完善 (资料编辑、密码修改)',
        '⭐ 帖子收藏/书签系统',
        '📱 移动端响应式适配',
      ],
    },
    {
      ver: '0.2.1', date: '2026-04-29', title: 'API 网关增强与管理后台',
      items: [
        '🚪 新增 /api/vote、/api/polls、/api/drafts 路由代理',
        '🔔 通知系统 API (列表/未读数/标记已读)',
        '🛡️ 管理后台服务上线 (polis-admin 微服务, 端口 3050)',
        '📊 管理仪表盘: 用户/社区/内容管理页面 (对接真实 API)',
        '🐛 修复: featured 帖子接口使用错误 space_id (Uuid::new_v4 → 实际 ID)',
        '🐛 修复: 网关缺少 /api/bookmarks /api/notifications 等路由',
        '🐛 修复: Admin 路由 Axum 0.7 (:id) → 0.8 ({id}) 语法不兼容',
        '📋 社区页面增加公告横幅展示 (urgent/important/normal 分级)',
        '🔄 自动构建脚本集成管理后台 (auto-build.sh)',
      ],
    },
    {
      ver: '0.2.2', date: '2026-04-29', title: 'AI 自驱动开发系统',
      items: [
        '🤖 auto-dev.sh: 自动构建+部署+10项全面测试',
        '⏰ Cron 定时任务: 每天 4 次自动开发 + 每 2 小时健康检查',
        '🔧 Gateway 配置: 新增 admin_service_url 字段',
        '✅ 自动化测试覆盖: 健康检查/社区/注册/公告/精选/5 服务',
        '📋 社区页面新增"投票"选项卡',
        '🔄 系统自恢复: 服务宕机自动重启机制',
      ],
    },
    {
      ver: '0.2.3', date: '2026-04-29', title: 'AI 自动研究系统',
      items: [
        '🔍 auto-research.sh: 每小时自动搜索 GitHub Trending + 社区更新',
        '📊 自动洞察报告: 提取功能推荐 + 系统健康 + 开发进度',
        '🌐 /research 页面: 可视化展示 AI 研究报告',
        '📱 导航栏新增 AI 研究入口',
        '⏰ Cron 定时: 每小时整点研究 + 每15分钟健康检查',
        '🔄 polis-web 服务: 正式纳入 systemd 管理 + 健康检查',
        '📋 自动更新日志 (auto-changelog.sh)',
      ],
    },
    {
      ver: '0.3.0', date: '2026-05', title: '社交与互动',
      items: [
        '🔔 通知系统 (WebSocket + NATS)',
        '👥 用户关注/粉丝系统',
        '💬 WebSocket 实时聊天',
        '📨 私信系统',
        '⭐ 帖子收藏/推荐系统',
        '📊 社区统计分析',
      ],
    },
    {
      ver: '0.4.0', date: '2026-06', title: '内容生态扩展',
      items: [
        '🎬 视频上传与转码 (FFmpeg)',
        '📝 Markdown 富文本编辑器',
        '📌 帖子置顶与精华',
        '🚩 内容举报与审核系统',
        '🌙 暗黑模式',
        '🌐 国际化 (i18n)',
      ],
    },
    {
      ver: '0.5.0', date: '2026-06', title: '高级功能',
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
      ver: '0.6.0', date: '2026-07', title: '运维与生态',
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">更新日志</h1>
      <div className="space-y-8">
        {versions.map((v) => (
          <div key={v.ver} className="relative pl-8 border-l-2 border-primary-200 dark:border-primary-800">
            <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-primary-600 border-2 border-white dark:border-gray-900" />
            <div className="mb-1 flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900 dark:text-white">v{v.ver}</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">{v.date}</span>
              {v.ver === '0.2.6' && (
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">当前版本</span>
              )}
            </div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{v.title}</h3>
            <ul className="space-y-1">
              {v.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 dark:bg-green-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
