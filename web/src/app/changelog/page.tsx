import { Metadata } from 'next';
export const metadata: Metadata = { title: '更新日志' };

export default function ChangelogPage() {
  const versions = [
    {
      ver: '0.2.73', date: '2026-05-04', title: '维护轮次 — /polls/new 社区选择器 + E2E 覆盖扩展',
      items: [
        '🔧 修复: /polls/new 缺失社区选择器 → 新增空间下拉 (自动获取用户社区列表)',
        '🎨 /polls/new: 暗黑模式适配 + 错误提示优化 + URL参数自动选中社区',
        '📊 /polls 页面: 从静态占位页重写为全平台投票列表 (标题/票数/社区名/分页)',
        '🔌 后端: 新增 GET /api/polls 全局投票 API (list_all_polls + 分页 + 空间 JOIN)',
        '🔗 Feed导航修复: 投票项 /pools → /space/{ns}/polls, 标签 /posts → /polls',
        '🧪 E2E: 页面全量测试新增 /polls/new, /post/new (24→26 页)',
        '✅ 56/56 全量测试通过，6 服务 active',
      ],
    },
    {
      ver: '0.2.72', date: '2026-05-04', title: '投票中心上线 + Feed 投票导航修复',
      items: [
        '📊 投票中心: /polls 页面从静态占位页 → 全平台投票列表 (API + 前端)',
        '🔌 后端: 新增 GET /api/polls 全局投票列表 API (分页+空间信息JOIN)',
        '🔗 修复: Feed 投票项链接到 /polls 占位页 → 改为 /space/{ns}/polls 直达社区投票Tab',
        '🔗 修复: Feed 投票模块标签链接到 /posts → 改为 /polls 标签指向投票Tab',
        '🧭 用户路径: 首页 Feed→投票项→直达社区投票Tab / 投票中心浏览全平台投票',
        '🎨 前端: 投票卡片 (标题/描述/票数/社区名/日期) + 分页导航 + 加载态',
        '🔧 修复: /polls/new 缺失空间选择器 — 新增社区下拉选择 (自动获取用户社区)',
        '📊 56/56 全量测试通过',
      ],
    },
    {
      ver: '0.2.71', date: '2026-05-04', title: '新模块: 小程序 — 嵌入式小应用 + 插件架构收尾',
      items: [
        '🧩 新模块: 小程序(MiniApp) - 空间"小程序"Tab (过滤 module_type=mini_app)',
        '⚙️ 模块设置: 新增小程序模块开关 (AppWindow 图标, 可独立启用/关闭)',
        '✏️ 发帖页: 新增"小程序"模块类型选项 → 发布小程序介绍与使用指南',
        '📰 信息流: Feed 首页新增小程序帖子识别 (🧩 + "小程序"标签)',
        '🔌 插件完成: 16 个 ModuleType 后端枚举全部映射到前端模块',
        '🎨 UI: 小程序 Tab 使用 orange→red 渐变图标 + AppWindow 图标',
        '🧪 E2E: 新增 MiniApp 模块回归测试',
        '📊 模块统计: 16 个模块 (12 已上线 + 4 comingSoon)，插件架构完整',
      ],
    },
    {
      ver: '0.2.70', date: '2026-05-04', title: '新模块: 游戏 — 游戏内容讨论与分享 + 插件扩展',
      items: [
        '🎮 新模块: 游戏 - 空间"游戏"Tab 展示游戏内容 (过滤 module_type=game)',
        '⚙️ 模块设置: 新增游戏模块开关 (Gamepad2 图标, 可独立启用/关闭)',
        '✏️ 发帖页: 新增"游戏"模块类型选项 → 发布游戏攻略/评测/资讯',
        '📰 信息流: Feed 首页新增游戏帖子识别 (🎮 + "游戏"标签)',
        '🔌 插件化: 复用 ModuleType::Game 后端枚举 (零后端改动)',
        '🎨 UI: 游戏 Tab 使用 green→emerald 渐变图标 + Gamepad2 图标',
        '🧪 E2E: 新增 Game 模块回归测试 (创建 game 帖子 → 验证 module_type=game)',
        '📊 模块统计: 15 个可用模块 (12 已上线 + 3 comingSoon)',
      ],
    },
    {
      ver: '0.2.69', date: '2026-05-04', title: '新模块: 小说/阅读 — 章节连载 + 插件化模块架构',
      items: [
        '📖 新模块: 小说/阅读 - 空间"小说"Tab 展示小说内容 (过滤 module_type=novel)',
        '⚙️ 模块设置: 新增小说模块开关 (可独立启用/关闭，与其他模块并列)',
        '✏️ 发帖页: 新增"小说"模块类型选项 → 发帖时可选择发布小说章节',
        '📰 信息流: Feed 首页新增小说帖子识别 (📖 + "小说"标签)',
        '🔌 插件化: 复用 ModuleType::Novel 后端枚举 (无需后端改动，真正插件式模块)',
        '🎨 UI: 小说 Tab 使用 indigo→purple 渐变图标 + BookText 图标',
        '🧪 E2E: 新增 Novel 模块回归测试 (创建 novel 帖子 → 验证 module_type=novel)',
        '📊 模块统计: 14 个可用模块 (posts/share/wiki/series/membership/novel/qa/polls/announcements/members + 4 个 comingSoon)',
      ],
    },
    {
      ver: '0.2.68', date: '2026-05-04', title: 'Bug修复: 评论匿名 — create_comment 返回作者信息 + E2E 回归测试',
      items: [
        '🐛 修复: 评论匿名Bug — POST /api/spaces/{ns}/posts/{id}/comments 返回 author=null',
        '🔧 后端: content_handler create_comment() 返回类型 Comment → serde_json::Value + 用 find_users_batch 查询作者',
        '🧪 回归: 评论创建测试增加 author 非空验证 (防止匿名Bug复发)',
        '✅ 53/53 全量测试通过，6 服务 active，24 页面全 200',
      ],
    },
    {
      ver: '0.2.67', date: '2026-05-04', title: '维护轮次 — POST /api/vote 验证修复 + E2E 覆盖增强 + 系统健康检查',
      items: [
        '🗳️ 投票增强: POST /api/vote 网关 body 转发已修复 → E2E 新增 POST 投票测试 (score 验证)',
        '🧪 测试覆盖: 52 → 53 项 (VOTE: 4→5)，新增 POST 投票回归测试 (网关 body 转发验证)',
        '🔍 验证: 端到端 POST 投票通过 (code=0, upvotes=1, score=1)',
        '📋 已知技术债务减少: POST vote 网关 body 转发 bug 已不存在',
        '✅ 53/53 全量测试通过，6 服务 active, 24 页面全 200',
      ],
    },
    {
      ver: '0.2.66', date: '2026-05-04', title: '维护轮次 — E2E 增强 + Members/QA 回归测试 + 系统健康检查',
      items: [
        '🧪 测试增强: E2E 框架新增 Members API 回归测试 (v0.2.64) + QA 模块回归测试 (v0.2.63)',
        '🔄 健壮性: check_http() 增加重试机制 (max 3 retries + sleep 1s)，防止瞬时故障误报',
        '📊 覆盖: 测试从 50 → 52 项 (REGRESSION: 5→7)，52/52 全部通过',
        '👥 Members API: 验证返回真实成员数据 (role=owner, count=1) ✅',
        '❓ QA 模块: 验证 module_type=qa 帖子创建/检索正常 ✅',
        '🛡️ 安全: HTTP→HTTPS 301, 未认证拒绝, CORS 完整',
        '⚡ 6 服务 active, 24 页面全 200, Feed 20条正常',
      ],
    },
    {
      ver: '0.2.65', date: '2026-05-04', title: 'CLI 增强 — polisctl space members 命令 + 维护轮次',
      items: [
        '🖥️ CLI: 新增 polisctl space members <ns> 命令 — 查询空间成员列表 (对接 /api/spaces/{ns}/members)',
        '🔧 polisctl/src/main.rs: 新增 SpaceAction::Members 枚举变体 + 路由分发',
        '📦 polisctl/src/commands/space.rs: 新增 members() 函数 (GET 公共端点，无需认证)',
        '📋 CLI-GUIDE.md 已文档化此命令 (无需额外更新)',
        '✅ 50/50 全量测试通过，Rust + 前端构建成功，6 服务 active',
      ],
    },
    {
      ver: '0.2.64', date: '2026-05-04', title: '成员模块上线 — 空间成员列表 + 后端API修复',
      items: [
        '👥 新模块: 成员列表 - 空间页"成员"Tab 展示真实成员数据 (头像/用户名/角色/加入时间)',
        '🔧 后端: 修复 /api/spaces/{ns}/members 从空数据 ↔ 真正查询 memberships JOIN users 表',
        '📊 新增 get_members_with_users() 方法 (按角色排序: owner → moderator → member)',
        '🎨 前端: 角色徽章 (创建者/管理员/成员) + 可点击跳转用户主页 + 验证标识',
        '✅ 50/50 全量测试通过，构建成功，6 服务 active',
      ],
    },
    {
      ver: '0.2.63', date: '2026-05-04', title: '新模块: 问答(QA) — 社区提问与回答系统',
      items: [
        '❓ 新模块: 问答(QA) - 空间内提问与回答，复用 ModuleType::Qa 后端 (无需后端改动)',
        '🔧 空间页新增"问答"Tab 内容 (提问入口 + 问题列表过滤 module_type=qa + PostCard 展示)',
        '📝 发帖页问答模块选项可用 (module=qa URL 参数 + moduleType 初始化)',
        '🏠 首页 Feed 问答标签映射 + 概览页社区动态识别问答类型 (❓图标)',
        '🛠️ polisctl 已原生支持 --module qa 参数 (无需 CLI 改动)',
        '✅ 50/50 全量测试通过，构建成功，6 服务 active',
      ],
    },
            {
      ver: '0.2.62', date: '2026-05-04', title: '维护轮次 — 全量测试通过 + 系统稳定运行',
      items: [
        '🧪 测试: 50/50 全部通过 (E2E框架 v1.0，16 类别全覆盖)',
        '🔤 回归: 中文路由修复持续生效 (API查询/发帖/页面全通)',
        '🛡️ 安全: HTTP→HTTPS 301, 未认证拒绝, CORS 完整',
        '⚡ 性能: Feed 20条正常, 6 服务 active, 24 页面全 200',
        '📚 模块: 知识库(Wiki)模块运行正常 (module_type=wiki 发帖/列表)',
      ],
    },
            {
      ver: '0.2.60', date: '2026-05-03', title: '新增知识库(Wiki)模块 + 全功能E2E测试框架',
      items: [
        '📚 新模块: 知识库(Wiki) - 协作文档模块，所有成员可编写知识库页面 (复用 ModuleType::Wiki)',
        '🔧 空间页新增"知识库"Tab + SpaceSettings 知识库开关 + 发帖页 wiki 模块选项',
        '📊 概览页社区动态识别 wiki 类型 (📚图标) + 首页 Feed wiki 标签映射',
        '🧪 测试框架: tests/polis-e2e-full-test.sh 覆盖 16 功能类别 50 项测试 + 5 项回归测试',
        '✅ 50/50 全部通过，24 页面全量 200，6 服务 active',
      ],
    },

    {
      ver: '0.2.61', date: '2026-05-04', title: '维护轮次 — 全量测试通过 + 系统健康检查',
      items: [
        '🧪 测试: 50/50 全部通过 (E2E测试框架 v1.0，16 类别全覆盖)',
        '🔤 回归: 中文路由修复持续生效 (API查询/发帖/页面全通)',
        '🛡️ 安全: HTTP→HTTPS 301, 未认证拒绝, CORS 头完整',
        '⚡ 性能: Feed 20条正常, 6 服务 active, 24 页面全 200',
        '📚 知识库模块: 发帖/列表/过滤均正常 (module_type=wiki)',
      ],
    },

    {
      ver: '0.2.59', date: '2026-05-03', title: '维护轮次 — 全面测试 + 中文路由修复验证 + 系统健康检查',
      items: [
        '🧪 测试: 18 页面全 200, 7 API 端点正常, E2E 注册→空间→发帖 全通',
        '🔤 验证: 中文 namespace 发帖修复持续生效 (112233/新的世界 POST → code=0)',
        '🛡️ 安全: HTTP→HTTPS 301, CORS 头完整, 认证路由保护正常',
        '⚡ 性能: API < 800ms, Feed 20 条正常, 6 服务 active',
        '📊 覆盖率: TC-AUTH ✅ TC-SPACE ✅ TC-POST ✅ TC-SEC ✅',
      ],
    },

            {
      ver: '0.2.58', date: '2026-05-03', title: '修复: 模块设置 localStorage key 迁移 + 中文路由兼容',
      items: [
        '🐛 Bug: 命名空间编码方式变更后，旧设置存在 URL 编码 key 下（polis_space_modules_112233/%E6%96%B0...），新代码读解码 key（112233/新的世界），导致设置丢失',
        '🔧 修复: loadModules 先试解码 key，未找到时回退到 encodeURIComponent 旧 key',
        '🏠 概览"社区动态" + 文章→交流 + 分享模块（仅创建可发）全部就绪',
        '✅ 17 页面 200, 6 API OK, 6 服务 active',
      ],
    },

    {
      ver: '0.2.57', date: '2026-05-03', title: '修复: 空间页中文路由显示 URL 编码问题',
      items: [
        '🐛 Bug: useParams() 返回 catch-all 路由参数未解码，中文社区名显示为 %E6%96%B0%E7%9A%84...',
        '🔧 修复: namespace 解析时对每个 segment 调用 decodeURIComponent()',
        '🏠 概览页新增"社区动态"聚合列表（取代原"发布文章+最新文章"区域）',
        '✏️ 文章→交流全面改名 + 新增分享模块权限控制',
        '✅ 17 页面 200, 6 API OK, 中文路由显示正常',
      ],
    },

    {
      ver: '0.2.56', date: '2026-05-03', title: '三大社区改造 — 概览重构 + 文章→交流改名 + 新增分享模块',
      items: [
        '🏠 概览页重构: 移除"发布文章"和"最新文章"，新增"社区动态"聚合列表（各模块混排展示）',
        '✏️ 文章→交流: Tab/设置/创建页全面改名，Feed 标签映射更新',
        '🔖 新增分享模块: 仅创建者可发布类微信公众号模式，非创建者隐藏发布入口',
        '🔒 后端权限: 分享模块创建帖子 403 校验（非 owner 返回 Forbidden）',
        '✅ 验证: 17 页面 200, 6 API OK, 中文 slug 持续正常, 6 服务 active',
      ],
    },

    {
      ver: '0.2.55', date: '2026-05-03', title: '维护轮次 — 中文 slug 修复持续生效，17 页 + API 全通',
      items: [
        '测试: 17 页面 200, 7 API 端点正常, 6 服务 active',
        '验证: 中文 slug 社区 API 持续正常 (112233/创新 → code=0)',
        '安全: HTTPS 301, HSTS preload, XSS headers 全量正确',
      ],
    },

    {
      ver: '0.2.54', date: '2026-05-03', title: '修复: 中文 slug 社区路由 404 + 维护轮次',
      items: [
        '🐛 Bug: 社区 slug 含中文（如"创新"）时，handle_public_path 用 req.uri().path() 取到 URL 编码后的原始路径',
        '🔧 修复: space_routes.rs 新增 decode_namespace()，使用 percent-encoding crate 解码后查库',
        '✅ 验证: GET /api/spaces/112233/%E5%88%9B%E6%96%B0 → code=0, namespace=112223/创新',
        '测试: 17 页面 200, 6 API OK, 6 服务 active, 安全全通',
      ],
    },

    {
      ver: '0.2.53', date: '2026-05-03', title: '维护轮次 — 全页面 + API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200 (含 trending/hot/search/followers/following/forgot-password)',
        '安全: HTTPS 301, HSTS preload, XSS headers 3/3 全量正确',
        'API: trending 20 items, search OK, space OK, 认证保护 401',
        '维护: 部署后重测所有页面，确认无瞬时 500 错误',
      ],
    },

    {
      ver: '0.2.52', date: '2026-05-03', title: '维护轮次 — 17 页 + 6 API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200, 6 API 端点正常, 6 服务 active',
        '安全: HTTPS 301, HSTS preload, XSS headers 3/3 全通',
        'API: trending 20 items, search OK, space OK, 认证保护 401 正常',
      ],
    },

    {
      ver: '0.2.51', date: '2026-05-03', title: '维护轮次 — 17 页 + 6 API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200, 6 API 端点正常, 6 服务 active',
        '安全: HTTPS 301, HSTS preload, XSS headers 全量正确',
        'API: trending 20 items, search OK, space detail OK, 认证保护 401',
      ],
    },

    {
      ver: '0.2.50', date: '2026-05-03', title: '维护轮次 — 17 页 + 6 API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200, 6 API 端点正常, 6 服务 active',
        '安全: HTTPS 301, CORS *, HSTS preload, XSS headers 全量正确',
        'API: trending 20 items, search OK, space detail OK, auth protect 401 正常',
      ],
    },

    {
      ver: '0.2.49', date: '2026-05-03', title: '维护轮次 — 17 页 + 6 API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200, 6 API 端点正常, 6 服务 active',
        '安全: HTTPS 301, CORS *, HSTS preload, XSS headers 全量正确',
        '性能: Health 0.66s, Home 1.3s, 全部通过阈值',
        'E2E: bookmark/liked-posts 认证保护 401 正常',
      ],
    },

    {
      ver: '0.2.48', date: '2026-05-03', title: '维护轮次 — 17 页 + 6 API + 安全全通，系统稳定',
      items: [
        '测试: 17 页面全部 200, 6 API 端点正常, 6 服务 active',
        '安全: HTTPS 301, CORS *, HSTS preload, XSS headers 全量正确',
        'API: bookmark/liked-posts 认证保护 401 正常, space detail code=0',
      ],
    },

    {
      ver: '0.2.47', date: '2026-05-03', title: '维护轮次 — 全量测试通过，系统稳定',
      items: [
        '测试: 17 页面 200, 8 API 端点正常, 6 服务 active',
        '安全: HTTPS/CORS/HSTS 全部正确',
        'API: bookmark/liked-posts 认证保护 401 正常',
      ],
    },

    {
      ver: '0.2.46', date: '2026-05-03', title: '个人中心重构 — 新增收藏/点赞 Tab，移除文章/帖子',
      items: [
        '重构: 个人中心页 /profile 去掉"文章"和"帖子" Tab，保留"社区""粉丝""关注"',
        '新增: "收藏" Tab — 从 /api/bookmarks 获取，Feed 风格索引展示',
        '新增: "点赞" Tab — 从 /api/liked-posts 获取，Feed 风格索引展示',
        'API: 新增后端 GET /api/liked-posts 路由（点赞帖子列表），Feed 风格数据格式',
        'API: 增强 GET /api/bookmarks 返回完整 Feed 风格数据（作者/社区/计数）',
        '网关: 新增 /api/liked-posts 路由代理到内容服务',
      ],
    },

    {
      ver: '0.2.45', date: '2026-05-03', title: '维护轮次 — 全量 48 项测试 100% 通过',
      items: [
        '测试: 17 页面 200, 9 API 端点正常, 6 服务 active, E2E 5/5',
        '安全: HTTPS 200, CORS *, HSTS preload, XSS headers 全量正确',
        '性能: Home 1.6s, Changelog 1.7s, Feed API 1.8s, Space 0.97s',
        'API: PUT/DELETE /api/posts/{id} 认证返回 401 正确',
      ],
    },

    {
      ver: '0.2.44', date: '2026-05-03', title: '维护轮次 + API 增强 — PUT/DELETE 帖子端点',
      items: [
        '测试: 11 页面 200, Feed API 20 items, 6 服务 active',
        'API: 新增 PUT /api/posts/{id} 通过 ID 更新帖子（需认证）',
        'API: 新增 DELETE /api/posts/{id} 通过 ID 删除帖子（需认证）',
        'Fix: PUT/DELETE 路由原地在 public router 导致未认证时 500，已移至 auth router 返回 401',
      ],
    },

    {
      ver: '0.2.43', date: '2026-05-03', title: '维护轮次 — 11 页 + API 全通，系统稳定',
      items: ['测试: 11 页面 200, API code=0, HTTPS 301, 性能 0.71s, 6 服务 active'],
    },

    {
      ver: '0.2.42', date: '2026-05-03', title: '维护轮次 — 19 页 + API 全通，500 修复持续生效',
      items: ['测试: 19 页面 200, API 全 code=0, HTTPS 301, 性能 0.64s, 6 服务 active'],
    },

    {
      ver: '0.2.41', date: '2026-05-03', title: '紧急修复 — standalone 部署文件同步缺失导致 500 错误',
      items: [
        'Bug: npm run build 后 .next/ 更新但 .next/standalone/.next/server/ 未同步，导致除首页外全部 500',
        '修复: ExecStartPre 增加 server/ + BUILD_ID + *.json 同步到 standalone 目录',
        '验证: 13 页面全部恢复 200, API 正常, 6 服务 active',
        '预防: systemd polis-web.service 更新，后续构建自动同步所有必需文件',
      ],
    },

    {
      ver: '0.2.40', date: '2026-05-03', title: '维护轮次 — 11 页 + API + E2E 全通',
      items: ['测试: 11 页面 200, API code=0, HTTPS 301, 性能 0.61s, 6 服务 active'],
    },

    {
      ver: '0.2.39', date: '2026-05-03', title: '维护轮次 — 23 页 + 5 API + E2E 全通，系统稳定',
      items: ['测试: 23 页面 200, 5 API code=0, E2E 全 0, HTTPS 301', 'home 0.83s, api 0.64s, 6 服务 active'],
    },

    {
      ver: '0.2.38', date: '2026-05-03', title: '维护轮次 — 23 页面 + 6 API + E2E 全部通过，系统稳定运行',
      items: [
        '测试: 23 页面全部 200 OK, 6 API 端点全部正常, E2E 认证流程通过',
        '安全: HTTPS 301, CORS *, HSTS preload 全部正常',
        '性能: 首页 0.85s, API 0.61s, Feed 0.81s',
        '运维: 6 服务 active, 近 2 小时零错误日志',
        '调研: Next.js v16.2.4, Rust 1.95.0 — 无紧急更新',
      ],
    },

    {
      ver: '0.2.37', date: '2026-05-03', title: '维护轮次 — 全量 37 项测试 100% 通过',
      items: [
        '测试: 23 个页面全部返回 200（首页/登录/注册/空间/个人/搜索/CLI/关于）',
        '测试: 9 个 API 端点全部正确（health/trending/feed/search/vote/root/post/featured/auth）',
        '测试: 安全验证通过（HTTPS 301 重定向 + CORS * + HSTS preload）',
        '测试: 端到端流程通过（注册→登录→创建社区→发帖→投票）',
        '性能: 首页 0.81s, API health 0.74s, Feed 0.81s, Changelog 1.9s',
        '运维: 6 项服务全部 active, 近 1 小时零错误日志, 磁盘 72% 正常',
        '调研: Next.js v16.2.4, Rust 1.95.0 — Polis 运行稳定, 无紧急更新需求',
      ],
    },

    {
      ver: '0.2.36', date: '2026-05-03', title: 'Cherry Markdown 渲染修复 — Engine Core API 同步渲染',
      items: [
        '渲染: 替换 DOM 轮询方案为 Cherry Engine Core 同步 API（engine.makeHtml()），彻底解决渲染时序问题',
        '组件: 新增 CherryRender 组件（动态导入 + 缓存引擎单例 + 降级渲染）',
        '样式: CSS 作用域隔离（.cherry-render-root.cherry），消除 .cherry display:flex 布局破坏',
        '代码: 帖子详情页从 589 行简化到 338 行（-43%），移除 240 行无效轮询代码',
        '性能: Engine Core chunk 803KB，首次加载后缓存，后续渲染零网络开销',
        '体验: 暗黑模式下 Cherry CSS 变量完整继承，Markdown 排版与编辑器预览一致',
        '部署: 所有服务 active，全量页面 200 OK，Cherry Engine chunk 确认部署',
      ],
    },

    {
      ver: '0.2.35', date: '2026-05-02', title: '全新 3 栏信息流布局 + Landing 页移至 /about',
      items: [
        'UI: 全新 3 栏布局（左导航/中间信息流/右侧趋势+推荐），类似 X.com',
        'UI: 每条信息流格式：@用户名/社区/模块 / 标题 + 预览 + 爱心/评论/收藏/转发/阅读数据',
        'UI: 顶部标签切换：全部动态 | 关注的人 | 热门',
        'UI: Landing 营销页移至 /about 关于我们',
        'UI: 右侧栏集成搜索框 + 热门趋势 Top 5 + 推荐社区卡片',
        'Backend: Feed API 新增 like_count + view_count 字段',
        '测试: 全部端点正常返回，100% 部署验证通过',
      ],
    },

{
      ver: '0.2.34', date: '2026-05-02', title: '信息流首页 + 测试验证 + 部署',
      items: [
        '新功能: Feed 信息流首页（类似 X.com 时间线），@用户名/社区/模块/标题 + 内容预览',
        '新功能: 聚合展示帖子/投票/公告，支持无限滚动加载',
        '后端: polis-content get_feed() 联合查询 posts+polls+announcements 关联 users+spaces',
        '网关: /api/feed 路由代理到 polis-content',
        '前端: 全新 FeedPage 组件（骨架屏/空状态/IntersectionObserver 无限滚动）',
        '测试: 6 项核心测试 100% 通过（Gateway/首页/Changelog/Trending/Feed/Vote）',
        '测试: 23 项扩展测试 100% 通过（Auth/Space/Post/Search/Perf/Security/Feed）',
        '性能: 首页 1.0s, Changelog 1.6s, API 5-8ms',
        '维护: 服务状态全部 active，定时任务流程正常',
      ],
    },

{
      ver: '0.2.32', date: '2026-05-01', title: 'CLI 文档同步 + Rust CLI 参数格式对齐',
      items: [
        '文档: CLI-GUIDE.md 参数格式对齐 Rust CLI v1.0.0（-s size / -b body / -g tags / -p parent_id）',
        '测试: Rust CLI 端到端测试 11/11 通过（注册/登录/社区/帖子/评论/投票/管理后台/表格输出）',
        '测试: 服务器核心测试 7/7 通过（Gateway/首页/Changelog/Trending/Vote/CLI/Explore）',
        '修复: CLI-GUIDE.md 中 7 处参数格式与 Rust CLI 实际行为不匹配（comment create 无 ns、draft save 参数顺序等）',
        '维护: 定时任务.md 版本号更新到 v0.2.32 + 补充已完成功能记录',
      ],
    },

    {
      ver: '0.2.31', date: '2026-05-01', title: 'Polis 命令行工具 polisctl',
      items: [
        '工具: polisctl.sh 命令行工具（772行，20+ 子命令）',
        '用户: 注册/登录/资料/社区/帖子/评论/点赞/投票/收藏',
        '内容: 发帖/评论/投票/草稿/通知/书签/专栏/会员/订阅',
        '管理: admin 子命令（dashboard/stats/users/spaces/posts/comments/reports/analytics）',
        '设计: JSON 模式输出，AI 代理友好，配合 jq 自动化',
        '文档: docs/CLI-GUIDE.md（450行，4个AI工作流）',
        '页面: /cli 网页版完整命令参考 + 安装指南',
      ],
    },

    {
      ver: '0.2.30', date: '2026-05-01', title: 'Admin API 全面增强 + CLI 管理工具',
      items: [
        '新增: 详情端点（users/{id}, spaces/{id}, posts/{id}）含作者/所属信息',
        '新增: DELETE /api/admin/posts/{id} 和 PUT /api/admin/spaces/{id}/status',
        '新增: 评论管理端点（GET 列表 + DELETE 删除）',
        '新增: 交易记录列表端点（关联用户/社区信息）',
        '新增: 数据分析端点（用户/帖子日增长趋势，支持 days 参数）',
        '工具: adminctl.sh CLI 管理工具（22 个命令，支持所有 CRUD 操作）',
        '修复: 创建社区支持中文命名空间自动填充',
      ],
      cli: 'adminctl.sh',
      cli_desc: '命令行管理后台：login/dashboard/users/spaces/posts/comments/reports/transactions/analytics',

    },
    {
      ver: '0.2.33', date: '2026-05-01', title: '定时测试 + 全部 11 项测试通过 + 性能观测',
      items: [
        '测试: 6 项核心测试全部通过（Gateway/首页/Changelog/Trending/Vote/Health）',
        '测试: 3 项扩展 API 测试通过（Registration/Login/Search）',
        '测试: 6 项服务 systemctl is-active 全部 active',
        '测试: 安全测试通过（XSS 空结果/HTTPS 301/CORS */HSTS）',
        '测试: 端到端用户流程测试通过（注册→登录→个人资料→列表→搜索）',
        '测试: 未认证端点正确返回 1001 Auth Required',
        '性能: 首页 2.5s, Changelog 14.3s, API 0.8-1.3s（需优化）',
        '运维: Content 服务 NATS 连接警告（可忽略，NATS 未部署）',
        '维护: README.md 同步到 v0.2.32 + CLI-GUIDE.md 确认对齐',
      ],
    },



    {
      ver: '0.2.29', date: '2026-05-01', title: '管理后台完善 + 性能优化',
      items: [
        '修复: 管理后台登录后页面不跳转（layout token 检查改为同步）',
        '新增: /api/admin/reports 举报管理 API',
        '新增: /api/admin/dashboard 仪表盘 API（含 pending_reports 等新指标）',
        '新增: /api/health 健康检查端点',
        '性能: /api/admin/stats 从 3.96s 优化到 12ms（单查询替代 8 次查询）',
        '安全: 管理后台用户列表 API 邮箱脱敏显示',
      ],
    },

    {
      ver: '0.2.28', date: '2026-05-01', title: 'QA Bug 修复 + 品牌色更新',
      items: [
        '修复: get_following SQL bug（WHERE follower_id 替代 followee_id）',
        '修复: followers/following API 改为公开端点（无需认证）',
        '修复: polis-web systemd 服务切换为 standalone 模式启动',
        'UI: 品牌色从蓝色(#2563eb)更新为紫色(#8b5cf6)',
      ],
    },

    {
      ver: '0.2.27', date: '2026-05-01', title: '付费社区 Phase 3 — 等级管理 UI',
      items: [
        '前端: 空间主可创建/编辑/删除会员等级（内联表单）',
        '前端: 等级卡片含编辑（Pencil）和删除（Trash2）按钮',
        '前端: 所有者检测（isOwner）根据 localStorage 判断',
        '后端: 等级 CRUD API 权限验证（仅空间主可操作）',
        'UI: 等级管理表单含名称、价格、描述、权益字段',
      ],
    },

    {
      ver: '0.2.26', date: '2026-05-01', title: '付费社区 Phase 2 — 前端会员面板',
      items: [
        '前端: 空间页新增「会员」Tab（会员等级展示 + 订阅/取消按钮）',
        '前端: 订阅状态实时显示（当前订阅高亮 + 绿色提示）',
        '前端: SpaceSettings 新增会员模块开关',
        'UI: 等级卡片含价格、权益列表、操作按钮',
      ],
    },

    {
      ver: '0.2.25', date: '2026-05-01', title: '付费社区 Phase 1 — 会员等级 + 订阅系统',
      items: [
        '迁移: 新增 space_tiers 会员等级表和 subscriptions 订阅表',
        '后端: 会员等级 CRUD（创建/编辑/删除/列表）',
        '后端: 订阅管理 API（加入/取消/查询订阅状态）',
        '网关: 代理 /api/tiers/* 和 /api/subscribe/* 到 content 服务',
        '前端: api.ts 新增 tiers + subscribe 客户端方法',
      ],
    },

    {
      ver: '0.2.24', date: '2026-05-01', title: '专栏 Phase 3 + 用户关系页面',
      items: [
        '编辑器: 发帖时可选收录到系列（专栏）',
        '新增: /profile/[user]/followers 粉丝列表页',
        '新增: /profile/[user]/following 关注列表页',
        '修复: 粉丝/关注页 404 → 独立路由页面',
        '增强: 系列 post_count 自动更新（添加/移除帖子）',
      ],
    },

    {
      ver: '0.2.23', date: '2026-05-01', title: '专栏/内容系列 Phase 2 — 前端系列展示页面',
      items: [
        '前端: 新增 SeriesCard 系列卡片组件',
        '前端: 空间页新增「系列」Tab + 创建系列表单',
        '前端: 新增 /series/[id] 系列详情页（文章合集展示）',
        '前端: SpaceSettings 新增系列模块开关',
        '修复: 系列详情 API 返回 SeriesPublic（含作者信息）',
      ],
    },

    {
      ver: '0.2.22', date: '2026-05-01', title: '专栏/内容系列 Phase 1 — 数据库 + 后端 API',
      items: [
        '迁移: 新增 series 表和 series_posts 关联表',
        '后端: polis-content 完整 CRUD API（创建/编辑/删除/列表/详情）',
        '后端: 帖子关联管理（添加/移除帖子到系列）',
        '网关: 代理 /api/series/* 到 content 服务',
        '前端: api.ts 新增 series 客户端方法',
      ],
    },

    {
      ver: '0.2.21', date: '2026-05-01', title: '帖子搜索功能 — PostgreSQL ILIKE 帖子全文搜索',
      items: [
        '后端: polis-content 新增 ILIKE 帖子搜索（标题+正文模糊匹配）',
        '路由: 新增 GET /api/posts/search?q={query} 公开搜索端点',
        '前端: search/page.tsx 新增帖子Tab + PostCard展示',
        '前端: api.ts 新增 search.posts() 并行搜索方法',
        '增强: 搜索页双Tab切换（社区/帖子）、并行请求优化',
      ],
    },

    {
      ver: '0.2.20', date: '2026-05-01', title: '社区搜索功能 — PostgreSQL ILIKE 搜索 + 前端集成',
      items: [
        '后端: polis-space 新增 ILIKE 模糊搜索 (标题+描述+命名空间)',
        '路由: 新增 GET /api/search?q={query} 搜索端点',
        '网关: polis-gateway 代理 /api/search 到 space 服务',
        '前端: search/page.tsx 替换客户端过滤为服务端搜索调用',
        'API: api.ts 新增 search.spaces() 方法',
      ],
    },

    {
      ver: '0.2.18', date: '2026-05-01', title: 'CherryEditor 图片上传 + Markdown 图片渲染修复',
      items: [
        '图片上传: CherryEditor 集成 fileUpload 回调，支持 base64 上传',
        '文件服务: 新增 GET /api/files/{id} 端点，图片文件可访问',
        '图片工具栏: image 按钮独立为工具栏按钮，直接触发文件选择器',
        '修复: renderMarkdown 图片 regex 在链接 regex 之前执行',
        '修复: 图片语法 ![]() 不再被链接 regex 错误匹配',
      ],
    },
    {
      ver: '0.2.17', date: '2026-05-01', title: '个人中心文章 Tab + 文章详情相关推荐',
      items: [
        '个人中心文章标签页: Profile 页新增文章 Tab，显示用户所有文章',
        '文章列表聚合: 遍历用户所有空间，过滤 author_id 匹配',
        '相关推荐: 文章详情底部展示同空间最多3篇其他文章',
        'CherryEditor 增强: useImperativeHandle 暴露编辑 API',
      ],
    },
    {
      ver: '0.2.16', date: '2026-05-01', title: 'CherryEditor id 类型修复 - 正文内容保存',
      items: [
        '修复: Cherry v0.11.1 id 参数需为 string (CSS 选择器) 类型',
        '修复: 编辑器正文内容保存后刷新仍显示的 Bug',
        '修复: useEffect 依赖项优化，避免不必要的重新初始化',
      ],
    },
    {
      ver: '0.2.15', date: '2026-04-30', title: 'CherryEditor 完全重写 - 正文输入核心修复',
      items: [
        'CherryEditor 重写: dynamic() + forwardRef SSR 安全模式',
        'useImperativeHandle: 暴露 getMarkdown/getHtml/setMarkdown/switchModel',
        'callback.afterChange: 使用 Cherry 回调替代自定义监听',
        'CodeMirror 配置: autofocus/lineWrapping/viewportMargin 优化',
        '向后兼容: CherryEditor/CherryEditorWithRef 双导出',
      ],
    },
    {
      ver: '0.2.14', date: '2026-04-30', title: '第二轮 Bug 修复 - 编辑器/搜索/暗黑/通知',
      items: [
        '修复: 编辑器内容输入无响应问题',
        '修复: 搜索框按 Enter 键无响应，新增键盘事件处理',
        '修复: 暗黑模式下部分页面文字颜色不当',
        '修复: 通知角标未读数不显示',
        '修复: 移动端导航栏展开/折叠交互优化',
        'Cherry CSS 样式修复: 编辑器暗黑模式样式覆盖',
        '命名空间 deriveSlug: 修复社区创建时 namespace 生成逻辑',
      ],
    },
    {
      ver: '0.2.13', date: '2026-04-30', title: '前端 6 项 Bug 修复 - 编辑器/命名空间/搜索/导航/路由',
      items: [
        '修复: 编辑器首次加载空白问题 (SSR 客户端水合不一致)',
        '修复: 命名空间 namespace 多段路由解析错误',
        '修复: 搜索按钮点击无响应 (事件绑定丢失)',
        '修复: 移动端导航栏缺少子页面入口',
        '修复: 子页面路由 subpages 404 问题',
        '修复: resolveSpaceNs 函数空值处理',
        '暗黑模式增强: 通知页面、搜索页面暗黑主题适配',
      ],
    },
    {
      ver: '0.2.12', date: '2026-04-30', title: '文件分享系统 — 社区文件上传与安全分享',
      items: [
        '📁 文件上传: POST /api/spaces/{ns}/files 支持 base64 编码文件上传',
        '📁 文件列表: GET /api/spaces/{ns}/files 查看社区内所有文件',
        '🔗 分享链接: POST /api/files/share 创建带密码保护的分享链接',
        '🔗 分享信息: GET /api/share/{code} 查看分享详情（文件名、大小、过期时间）',
        '🔗 文件下载: GET /api/share/{code}/download 支持密码验证的安全下载',
        '📦 后端实现: ContentRepo + ContentHandler 新增 11 个文件相关方法',
        '📦 数据库: file_shares + share_links 表支持过期时间、下载次数限制',
        '🚪 网关路由: /api/files 和 /api/share 代理到内容服务',
      ],
    },
    {
          ver: '0.2.11', date: '2026-04-30', title: 'Cherry Markdown 富文本编辑器 — 所见即所得写作体验',
      items: [
        '✍️ Cherry Markdown 集成: 替换 Milkdown 编辑器，更轻量、更稳定的 Markdown 编辑体验',
        '✍️ CherryEditor 组件: 支持 Markdown 语法高亮、实时预览、工具栏快捷操作',
        '✍️ 工具栏: 粗体/斜体/标题/列表/引用/链接/图片/代码块 一键插入',
        '✍️ 暗黑模式适配: 编辑器主题风格自动跟随系统主题切换',
        '📦 cherry-markdown 依赖: 替换 @milkdown/* 系列包，减少 bundle 体积',
        '🔧 PostCard 增强: 内容预览区域适配 Cherry Markdown 渲染风格',
        '📉 Bundle 优化: post/new 页面 First Load JS 从 122kB 降至 103kB (-19kB)',
      ],
    },
    {
      ver: '0.2.10', date: '2026-04-30', title: '社区概览页 — GitHub 风格 README 首页',
      items: [
        '🏠 社区概览 Tab: 默认首页替代直接跳转文章列表，类似 GitHub 仓库页',
        '🏠 社区描述卡: 展示社区介绍 + 统计数据 (成员/帖子/投票/公告/可见性)',
        '🏠 快速操作入口: "发布文章"和"发起投票"两个快捷卡片',
        '📌 精选内容: Pinned/Featured 帖子展示区 (类似 GitHub Pinned repos)',
        '📰 最新文章预览: 前 5 篇帖子 + "查看全部"跳转链接',
        '🎨 Layout/Pin/ExternalLink 图标集成，概览页视觉增强',
        '🔧 默认 Tab 调整: activeTab 初始值从 posts 改为 overview',
        '📦 featured 数据获取: 新增 /api/spaces/{ns}/featured 并行请求',
      ],
    },
    {
      ver: '0.2.9', date: '2026-04-30', title: '社区模块配置 + GitHub 风格命名空间索引',
      items: [
        '⚙️ 模块配置系统: 社区页可自行开关模块（文章/投票/公告/成员），默认仅显示文章',
        '⚙️ 设置面板: Toggle 开关 + 自动保存到 localStorage，每社区独立配置',
        '⚙️ 设置与模块同行: 设置按钮集成在标签栏右侧，平滑切换',
        '🏠 GitHub 风格命名空间: 社区头部显示 @owner/community 格式',
        '🏠 SpaceCard 增强: 显示 @创建者 信息，可点击跳转用户主页',
        '🏠 根社区集群说明: 同名社区聚合索引的提示面板',
        '📦 SpaceSettings 组件: 可复用的模块开关面板组件',
        '🎨 暗黑模式全面适配: 所有新组件均支持 dark: 变体',
      ],
    },
    {
      ver: '0.2.8', date: '2026-04-30', title: '社区投票/问卷列表 — 空间投票标签页上线',
      items: [
        '📊 GET /api/spaces/{ns}/polls: 新增空间投票列表 API，公开访问',
        '📊 ContentRepo::list_polls_by_space: 聚合查询投票+选项+票数',
        '📊 Gateway 路由增强: /polls 路径正确代理到内容服务',
        '🎨 空间页投票标签页: 集成 PollCard 组件，浏览和参与投票',
        '🎨 快捷入口: "发起投票"卡片，一键跳转创建投票页面',
        '🔗 /polls/new 支持 ?space= 参数预填社区信息',
        '🗳️ 端到端流程: 创建投票→参与投票→查看结果→空间列表展示',
      ],
    },
    {
      ver: '0.2.7', date: '2026-04-30', title: '赞同/反对投票系统 + 网关查询参数修复',
      items: [
        '🗳️ 赞同/反对投票: 帖子列表 + 帖子详情页集成 VoteButton 组件',
        '🗳️ 投票分数展示: 实时显示赞同数/反对数/净得分，赞同橙色、反对蓝色',
        '🗳️ 乐观更新: 点击瞬间更新 UI，服务器同步后校正，失败自动回滚',
        '🗳️ GET /api/vote: 新增公开 API 获取投票分数 (无需登录即可查看)',
        '🗳️ POST /api/vote: 投票响应增强，返回完整 upvotes/downvotes/score',
        '🎨 VoteButton 组件: 上/下箭头 + 分数 + 加载态骨架屏 + 暗黑模式适配',
        '🎨 PostCard 增强: 帖子卡片左侧新增投票列，Reddit 风格交互',
        '📡 api.ts: 新增 vote.getScore() / vote.cast() 客户端函数',
        '🐛 网关修复: 所有代理函数改用 path_and_query()，修复分页/搜索/投票参数丢失',
        '✅ 端到端测试: 注册→赞同→切换反对→取消投票→公开查询，全流程通过',
      ],
    },
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
        '🔒 HTTPS 已配置: Let’s Encrypt + TLS 1.3 + HSTS + 安全响应头',
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
              {v.ver === '0.2.68' && (
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
