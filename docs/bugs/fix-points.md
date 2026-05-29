# 修复点位地图

> **用途**: 代码位置 → 修复历史的反向索引。修改任何文件前，查此表了解该文件过去修过什么 Bug，避免回归。

## 统计面板

| 指标 | 数值 |
|------|------|
| 涉及文件数 | 52 |
| 总修复点位 | 140 |
| 高危文件 (修复 3+ 次) | 14 |
| 最近更新 | 2026-05-29 (v1.0.43) |

## 高危文件 ⚠️

修改这些文件时，务必先查本表和相关 Pattern：

| 文件 | 修复次数 | 涉及 Pattern | 最近修复 |
|------|----------|-------------|----------|
| `crates/polis-content/src/handlers/content_handler.rs` | 5 | SQL注入, post_count, XSS, Argon2, 上传大小 | v1.0.24 |
| `crates/polis-content/src/routes/content_routes.rs` | 4 | URL编码, 发帖权限, 上传权限, DefaultBodyLimit | v1.0.24 |
| `crates/polis-gateway/src/main.rs` | 4 | 查询参数丢失, 路由缺失, Body Limit, modules路由误判 | v1.0.31 |
| `crates/polis-space/src/routes/space_routes.rs` | 7 | URL编码, DELETE路由, 中文slug, star端点, is_starred, modules CRUD, actions数组遗漏 | v1.0.32 |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | 7 | URL编码, 模块导航, 成员列表, 删除按钮, mtFilter, module-tab-key-mismatch, 去交流中心主义 | v1.0.41 |
| `web/src/lib/api.ts` | 4 | URL编码, 类型修复, uploadFile, archive | v1.0.17 |
| `web/src/components/SpaceSettings.tsx` | 4 | localStorage key, members keyMap, SpaceModulesManager rewrite, allowed_content_types null safety | v1.0.35 |
| `web/src/app/create/page.tsx` | 2 | title slug, deriveSlug | v1.0.17 |
| `crates/polis-core/src/types.rs` | 1 | Visibility::Hidden 枚举缺失 | v1.0.18 |
| `crates/polis-video/src/routes.rs` | 2 | 硬编码 body limit, 动态配置 | v1.0.24 |
| `crates/polis-space/src/repo.rs` | 3 | follow 系统, star 系统 (7个方法), module CRUD (5个方法) | v1.0.30 |

## 完整点位索引

### 后端 — polis-space

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `routes/space_routes.rs` | `handle_public_path` | 中文 namespace 解码 (percent_decode_str) | v0.2.54 | url-double-encoding |
| `routes/space_routes.rs` | `decode_namespace` | 统一 URL 解码函数 | v0.2.54 | url-double-encoding |
| `routes/space_routes.rs` | `delete_space` | 新增 DELETE 路由 → archive 软删除 | v1.0.14 | — |
| `routes/space_routes.rs` | `handle_auth_path` | 修复 members/join/leave 路由提取 | v0.3.63 | — |
| `handlers/space_handler.rs` | `create_space` | title 非空验证 + 50 字符限制 | v1.0.14 | — |
| `handlers/space_handler.rs` | `archive_space` | 软删除 (status='archived')，仅 owner | v1.0.14 | — |
| `repo.rs` | `archive` | SQL: update status='archived' where owner match | v1.0.14 | — |
| `repo.rs` | `update` | icon_url/banner_url: CASE WHEN 空值清除替代 COALESCE | v1.0.15 | — |
| `repo.rs` | `follow_space` | INSERT INTO follows + update_follower_count | v1.0.15 | — |
| `repo.rs` | `unfollow_space` | DELETE FROM follows + update_follower_count | v1.0.15 | — |
| `repo.rs` | `is_following_space` | SELECT 1 FROM follows 存在性检查 | v1.0.15 | — |
| `repo.rs` | `get_join_request_status` | SELECT status FROM space_join_requests | v1.0.15 | — |
| `routes/space_routes.rs` | `handle_public_path` | 新增 /my-join-status 端点（JWT 提取，免感认证） | v1.0.15 | — |
| `routes/space_routes.rs` | `handle_auth_path` | 新增 /follow, /unfollow 路由 | v1.0.15 | — |
| `handlers/space_handler.rs` | `follow_space` | 关注社区 + owner 通知 | v1.0.15 | — |
| `handlers/space_handler.rs` | `unfollow_space` | 取消关注 | v1.0.15 | — |
| `repo.rs` | `star_space` / `unstar_space` / `is_starred_space` / `get_star_count` / `update_star_count` / `get_starred_spaces` / `find_most_starred` | Star 收藏系统 7 个 DB 方法 | v1.0.26 | — |
| `routes/space_routes.rs` | `handle_auth_path` | 新增 /star, /unstar 端点 + is_starred 字段 | v1.0.26 | — |
| `routes/space_routes.rs` | `handle_public_path` | 新增 /starred, /most-starred 公开端点 | v1.0.26 | — |
| `handlers/space_handler.rs` | `star_space` / `unstar_space` / `get_starred_spaces` / `get_most_starred` | Star 收藏 4 个 handler | v1.0.26 | — |
| `handlers/space_handler.rs` | `create_module` / `update_module` / `delete_module` / `list_modules` / `get_module` | Module CRUD 5 个 handler | v1.0.30 | — |
| `repo.rs` | `create_module` / `update_module` / `delete_module` / `list_modules` / `get_module` | Module CRUD 5 个 DB 方法 | v1.0.30 | — |
| `routes/space_routes.rs` | `handle_auth_path` (actions array) | 追加 "/modules" 到 actions 数组 | v1.0.32 | actions-array-missing |
| `routes/space_routes.rs` | Route config (line 65-67) | .delete(delete_space) → .delete(handle_auth_path) | v1.0.32 | — |

### 后端 — polis-content

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `handlers/content_handler.rs` | `create_post` | post_count +1 (已有，参考实现) | v0.2.x | post-count-sync |
| `handlers/content_handler.rs` | `create_post` | Argon2 密码哈希替代明文 | v1.0.13 | — |
| `handlers/content_handler.rs` | (多处) | zip-slip 路径穿越修复 | v1.0.13 | — |
| `handlers/creation.rs` | `submit_to_community` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `handlers/thread_handler.rs` | `publish` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `repo.rs` | `find_posts_by_space` | SQL format!() → 12 臂 match 参数化 | v1.0.13 | — |
| `routes/content_routes.rs` | `handle_auth_content` (POST posts) | block_private_space_public_listing 发帖门控 | v1.0.15 | — |
| `routes/content_routes.rs` | `handle_auth_content` (POST files) | block_private_space_public_listing 上传门控 | v1.0.15 | — |
| `handlers/content_handler.rs` | `get_post_public` | auto-restore: hidden_until 到期自动恢复 visibility='public' | v1.0.18 | — |
| `handlers/content_handler.rs` | `get_post_public` | visibility 字段使用 effective_visibility (非 post.visibility) | v1.0.18 | — |
| `repo.rs` | `ContentRepo` | pool 字段 pub 化 (auto-restore SQL 直接访问) | v1.0.18 | — |
| `repo.rs` | feed SQL (3处) + PostRow tuple + JSON | feed查询 LEFT JOIN space_modules + SELECT sm.name as module_name → PostRow新增Option<String> → JSON响应新增module_name字段 | v1.0.41 | module-breadcrumb-hardcoded |
| `handlers/creation.rs` | `creation_to_public()` SQL + tuple | LEFT JOIN space_modules ON space_id AND module_key → SELECT sm.name as module_name → tuple 11→12元素 → SubmissionInfo 含 module_name | v1.0.42 | module-breadcrumb-hardcoded |
| `handlers/creation.rs` | `get_submissions()` SQL + tuple | 同上: LEFT JOIN space_modules + tuple 11→12元素 + SubmissionInfo 含 module_name | v1.0.42 | module-breadcrumb-hardcoded |

### 后端 — polis-admin

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `admin_handler.rs` | `ban_user` | 升级封禁: banned=TRUE + 隐藏所有 creations + 隐藏所有 posts | v1.0.18 | — |
| `admin_handler.rs` | `unban_user` | 清除 banned/banned_at/ban_reason | v1.0.18 | — |
| `admin_handler.rs` | `hide_post` | 新增 duration_hours 参数 → hidden_until = NOW() + interval | v1.0.18 | — |
| `admin_handler.rs` | `hide_user_works` | 批量隐藏用户所有作品 (creations + posts)，支持 duration | v1.0.18 | — |
| `admin_handler.rs` | `hide_user_spaces` | 批量设置用户所有社区 visibility='private' | v1.0.18 | — |
| `routes.rs` | hide_post/hide-works/hide-spaces | 新增 HideRequest(duration_hours)，三条路由 | v1.0.18 | — |
| `admin_handler.rs` | `update_review_rule` | UPDATE review_rules SET 规则编辑 | v1.0.19 | — |
| `admin_handler.rs` | `delete_review_rule` | DELETE FROM review_rules 规则删除 | v1.0.19 | — |
| `admin_handler.rs` | `get_agent_policy` | 返回启用的规则 + 违规分类 + 处置分级 + 置信度阈值 | v1.0.19 | — |
| `admin_handler.rs` | `get_agent_new_content` | 按时间窗口查询新内容，audit_logs 反连接去重 | v1.0.19 | — |
| `admin_handler.rs` | `agent_review` | 置信度路由: ≥0.9 自动执行 / 0.6-0.9 创建举报 / <0.6 跳过 | v1.0.19 | — |
| `admin_handler.rs` | `get_agent_stats` | 返回今日/本周审查统计 | v1.0.19 | — |
| `routes.rs` | review-rules + agent | 新增 PUT/DELETE /review-rules/{id} + 4 条 Agent 路由 | v1.0.19 | — |
| `stats.rs` | `list_users` | SQL 新增 banned/banned_at/ban_reason 字段 | v1.0.19 | — |
| `stats.rs` | `list_all_posts` | SQL 新增 visibility/hidden_until 字段 | v1.0.19 | — |
| `routes.rs` | `update_admin_code_handler` | 验证码不匹配 Unauthorized → Validation，错误码 401→400 | v1.0.21 | — |
| `admin_handler.rs` | `resolve_report_with_action` | 新增 ("user","unban") + ("appeal","unban") match arm → 解封用户 | v1.0.22 | — |

### 后端 — polis-user

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `handlers/user_handler.rs` | `login` | banned 状态检查 (密码验证前)，返回 403 + 封禁原因 | v1.0.18 | — |
| `handlers/user_handler.rs` | `get_ban_status` | 公开查询封禁状态 (无需JWT): banned/banned_at/ban_reason | v1.0.22 | — |
| `handlers/user_handler.rs` | `submit_appeal` | 被封用户申诉: 校验 banned + reason≥10字 → INSERT INTO reports | v1.0.22 | — |
| `routes/user_routes.rs` | ban_status + submit_appeal | 新增 2 条公开路由 GET /api/user/ban-status + POST /api/user/appeal | v1.0.22 | — |

### 后端 — polis-core

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `auth.rs` | `secure_validation` | JWT exp 显式校验，统一全服务 | v1.0.13 | — |
| `types.rs` | `Visibility` enum | 新增 Hidden 变体 (serde rename="hidden") + Display impl | v1.0.18 | — |
| `models.rs` | `User` struct | 新增 banned/banned_at/ban_reason 字段 | v1.0.18 | — |
| `models.rs` | `Post` struct | 新增 hidden_until 字段 (TIMESTAMPTZ → DateTime<Utc>) | v1.0.18 | — |
| `models.rs` | `AgentReviewDecision` | 新增 struct: target_type/id/action/duration/confidence/violation | v1.0.19 | — |
| `models.rs` | `AgentReviewRequest` | 新增 struct: decisions: Vec<AgentReviewDecision> | v1.0.19 | — |
| `models.rs` | `SubmissionInfo` struct | 新增 module_name: Option<String> 字段 (来自 space_modules.name) | v1.0.42 | module-breadcrumb-hardcoded |

### 前端 — web

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | moduleLabel从spaceModules查找自定义模块名,web/src/components/PostCard.tsx:48:module_type不再硬编码为forum,web/src/components/PostCard.tsx:94:内联面包屑使用动态module_label,SpacePageClient多处PostCard调用:传入module_type和module_label | v1.0.40 | module-breadcrumb-hardcoded |
| `web/src/lib/module-config.ts` | **ROOT CAUSE**: MODULE_ALIASES 删除 article→forum 映射 / getModuleLabel() 未知key返回自身而非'交流' / normalizeModuleType() 去折叠 / getModuleLabelByContentType() moduleType优先 | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/components/ContentCard.tsx` | moduleLabel prop新增 / 面包屑优先moduleLabel / adaptCreationItem()去normalizeModuleType / adaptFeedItem()读API module_name | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/components/PostCard.tsx` | 移除三重fallback `|| '交流'` / getModuleLabel不再返回空值 | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | mtFilter统一键空间(Object.keys(MODULE_CONFIG)+spaceModules) / 标签回退链(+post.module_type) / 概览区route==='posts'替代module_type==='forum' | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/app/profile/[username]/ProfilePageClient.tsx` | 3处硬编码三元表达式(856/910/935) → getModuleLabel(refPostModuleType) + import | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/app/post/[id]/PostPageClient.tsx` | adaptCreationToPost优先submission module_type / 引用标签7臂硬编码 → getModuleLabel() + import | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/app/creations/new/page.tsx` | 简化模块检查逻辑: normalized===forum复杂判断 → !MODULE_CONFIG[prefillModule] | v1.0.41 | module-breadcrumb-hardcoded |
| `web/src/components/ContentCard.tsx` | `SubmissionInfo` interface + `adaptCreationItem()` | SubmissionInfo 新增 module_name 字段 + adaptCreationItem 传递 moduleLabel = firstSub?.module_name | v1.0.42 | module-breadcrumb-hardcoded |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | 概览区 route fallback (lines 1081, 1087) | `|| 'posts'` → `|| p.module_type` — 修复 v1.0.41 引入的回归: 自定义模块帖子泄漏到交流Tab | v1.0.43 | module-breadcrumb-hardcoded |
| `SpaceSettings.tsx` | `persistModules` | 补充 members keyMap 映射 | v1.0.14 | — |
| `SpaceSettings.tsx` | `loadModules` | localStorage key 双格式回退 (编码/解码) | v0.2.58 | url-double-encoding |
| `SpacePageClient.tsx` | params 处理 | decodeURIComponent → encodeURIComponent 防双重编码 | v1.0.11 | url-double-encoding |
| `SpacePageClient.tsx` | 模块导航 | qa 模块 Tab 显示 | 已验证正常 | — |
| `CherryRender.tsx` | 渲染 | external link rel="noopener noreferrer" | v1.0.13 | — |
| `MarkdownEditor.tsx` | URL 验证 | javascript: 协议白名单过滤 | v1.0.13 | — |
| `MilkdownEditor.tsx` | XSS 过滤 | javascript: href/src 属性移除 | v1.0.13 | — |
| `Header.tsx` | 登出 | 清除 token + localStorage | v1.0.13 | — |
| `next.config.js` | 安全头 | Permissions-Policy + CORP 头 | v1.0.13 | — |
| `SpacePageClient.tsx` | useEffect | my-join-status 替代 /members 检查 | v1.0.15 | — |
| `SpacePageClient.tsx` | Join button | 新增 pending 状态显示 + 禁用 | v1.0.15 | — |
| `SpacePageClient.tsx` | Follow button | 关注/取消关注按钮 + follower_count 本地更新 | v1.0.15 | — |
| `SpacePageClient.tsx` | Edit dialog | 图标/封面上传 (FileReader base64 → POST /files) | v1.0.15 | — |
| `SpacePageClient.tsx` | Header | icon_url 头像显示 + banner_url 横幅背景 | v1.0.15 | — |
| `api.ts` | `spaces.update` | 新增 icon_url/banner_url 参数 | v1.0.15 | — |
| `api.ts` | `spaces.uploadFile` | 新增 base64 文件上传方法 | v1.0.15 | — |
| `create/page.tsx` | `handleCreate` | title: slug → title.trim()，保留用户原始标题 | v1.0.17 | — |
| `create/page.tsx` | `deriveSlug` | 正则新增 `_` 保留下划线字符 | v1.0.17 | — |
| `SpacePageClient.tsx` | Header area | 新增删除社区按钮 (Trash2 图标 + Fragment 包裹) | v1.0.17 | — |
| `api.ts` | `spaces.archive` | 新增 DELETE 请求方法 → archive 社区 | v1.0.17 | — |
| `admin/login/page.tsx` | `handleSubmit` JSX | 补充密码 `<input type="password">` 字段，useState 初始化了 password 但 JSX 缺失对应 input | v1.0.20 | missing-form-field |
| `admin/review-queue/page.tsx` | 整个文件 | 新建审查队列页 — 批量操作 + 时长选择 + 审批/拒绝/隐藏 | v1.0.19 | — |
| `admin/review-rules/page.tsx` | 整个文件 | 新建审查规则页 — CRUD + 启用/禁用 + JSON 配置编辑器 | v1.0.19 | — |
| `admin/audit-logs/page.tsx` | 整个文件 | 新建操作日志页 — 操作者/操作/对象三维筛选 + 状态迁移展示 | v1.0.19 | — |
| `admin/layout.tsx` | navItems | 新增审查队列/审查规则/操作日志 3 个导航项 | v1.0.19 | — |
| `admin/users/page.tsx` | 表格+状态列 | 新增封禁状态徽章 + 解封/隐藏作品/隐藏社区按钮 | v1.0.19 | — |
| `admin/posts/page.tsx` | 表格+可见性列 | 新增可见性徽章 + 隐藏/取消隐藏/精选 + 批量选择+隐藏 | v1.0.19 | — |
| `admin/reports/page.tsx` | doResolve | 新增"处理+隐藏""处理+封禁"联动按钮 | v1.0.19 | — |
| `SpacePageClient.tsx` | Header stats + Star button | 新增 Star 按钮（收藏/已收藏 切换 + star_count 本地更新）+ stats 行新增 收藏 计数显示 | v1.0.26 | — |
| `api.ts` | `spaces` object | 新增 star/unstar/getStarred/getMostStarred 4 个 API 方法 + star_count 类型 | v1.0.26 | — |
| `saved/page.tsx` | Bookmark list | 新增收藏的社区 section — SpaceCard 网格 + fetchStarredSpaces() | v1.0.26 | — |
| `manage/[...namespace]/ManagePageClient.tsx` | 整个文件 | 新建社区管理页 — 5 个 Tab (基本信息/模块/成员/审批/数据) | v1.0.26 | — |
| `manage/[...namespace]/ManagePageClient.tsx` | `atob(token.split('.')[1])` | URL-safe base64 → standard 转换 (v1.0.28 React批处理修复无效) | v1.0.29 | atob-base64url |
| `post/[id]/PostPageClient.tsx` | `getCurrentUserId()` | URL-safe base64 → standard 转换 | v1.0.29 | atob-base64url |
| `manage/[...namespace]/page.tsx` | 整个文件 | 管理页路由入口 — 服务器组件参数透传 | v1.0.26 | — |
| `admin/settings/page.tsx` | 上传限制设置 | 附件/视频上传大小限制调整（10MB / 200MB） | v1.0.27 | — |
| `admin/users/page.tsx` | 封禁按钮条件 | 未认证用户也显示封禁按钮（取消 verified 前置条件） | v1.0.22 | — |
| `admin/users/page.tsx` | banReason state | 封禁确认对话框添加自定义原因 textarea 输入 | v1.0.22 | — |
| `admin/reports/page.tsx` | TARGET_LABELS + doResolve | 新增 appeal→"申诉" 标签 + "解封"联动按钮 (target_action: unban) | v1.0.22 | — |
| `app/login/page.tsx` | error 显示 | 封禁错误下方显示"申请申诉 →"链接 (Forbidden/封禁/冻结 关键词) | v1.0.22 | — |
| `app/login/page.tsx` | appeal 链接触发 | 增加 `Forbidden:` 前缀检测，不依赖语义关键词 | v1.0.23 | — |
| `app/appeal/page.tsx` | 整个文件 | 新建申诉页: 邮箱+理由+封禁状态查询+提交 | v1.0.22 | — |
| `SpaceSettings.tsx` | `SpaceModulesManager` 整个组件 | 从硬编码 17 个模块改写为动态 API CRUD + 自定义模块名/模式/内容类型 | v1.0.30 | — |
| `app/creations/new/page.tsx` | module/content_type 联动 | 动态模块过滤 + allowed_content_types 驱动内容类型选择 | v1.0.30 | — |
| `app/polls/new/page.tsx` | `listModules` API | 从硬编码模块检查改为动态 API 验证 polls 模块是否启用 | v1.0.30 | — |
| `app/space/[...namespace]/SpacePageClient.tsx` | moduleKeySet + availableTabs | 动态 Tab 生成替代硬编码 17 个 Tab | v1.0.30 | — |
| `app/space/[...namespace]/SpacePageClient.tsx` | mtFilter + loadMorePosts | 移除硬编码模块类型过滤，所有动态模块帖子正常显示 | v1.0.33 | — |
| `app/space/[...namespace]/SpacePageClient.tsx` | availableTabs (tab id) + 通用fallback | 模块Tab id 从 module_key 改为 MODULE_CONFIG route 映射 + 自定义模块渲染fallback | v1.0.34 | module-tab-key-mismatch |
| `app/creations/new/page.tsx` | 整个文件简化 | 模块类型 17→2 (文章/视频)，移除 unlisted/密码/Thread/QA | v1.0.33 | — |
| `app/profile/[username]/ProfilePageClient.tsx` | Works tab subtabs | 从动态模块子选项卡改为固定 概览/视频/文章 三个子tab | v1.0.33 | — |

### 后端 — polis-gateway

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `main.rs` | Router 构建 | 新增 `.route("/api/user/{*path}", any(proxy_to_user))` — ban-status/appeal API | v1.0.22 | gateway-route-missing |
| `main.rs` | `proxy_space_router` (is_content) | 移除 `remaining.contains("/modules")` 避免 modules 路由误判为 content | v1.0.31 | gateway-route-missing |

### 部署 — infra

| 文件 | 位置 | 修复内容 | 版本 | Pattern |
|------|------|----------|------|---------|
| `deploy/nginx-polis.conf` | server 块 | server_tokens off + 移除 X-XSS-Protection | v1.0.13 | — |
| 部署流程 | tar 打包 | COPYFILE_DISABLE=1 防 xattr 污染 | v0.3.91 | xattr-contamination |

### CLI — polisctl

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `main.rs` | AdminPostsAction::Hide | 新增 --duration 参数 (小时) | v1.0.18 | — |
| `main.rs` | AdminUsersAction | 新增 HideWorks/HideSpaces 子命令 | v1.0.18 | — |
| `commands/admin.rs` | `posts_hide` | duration_hours: Option<i32> 参数传递 | v1.0.18 | — |
| `commands/admin.rs` | `users_hide_works` | POST /api/admin/users/{id}/hide-works | v1.0.18 | — |
| `commands/admin.rs` | `users_hide_spaces` | POST /api/admin/users/{id}/hide-spaces | v1.0.18 | — |
| `main.rs` | AdminAction::Login | 新增 --password 参数，移除硬编码密码 | v1.0.25 | — |
| `commands/admin.rs` | `login` | 密码从硬编码 `admin123` → 参数传入 | v1.0.25 | — |

### 脚本 — Shell

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `polisctl.sh` | `cmd_admin` login | 硬编码 `admin123` → 命令行参数 `password` | v1.0.25 | — |
| `polisctl.sh` | `cmd_admin` login | admin_code 默认值 `mzGW2026!PolisHub` → `polis2026` | v1.0.25 | — |
| `adminctl.sh` | `cmd_login` | 空密码 `""` → 环境变量 `$POLIS_ADMIN_PASSWORD` (必须) | v1.0.25 | — |
| `adminctl.sh` | 全局变量 | ADMIN_CODE 默认值 `mzGW2026!PolisHub` → `polis2026` | v1.0.25 | — |

### 配置 — 服务器

| 文件 | 位置 | 修复内容 | 版本 | Pattern |
|------|------|----------|------|---------|
| `/root/polis/admin_code.txt` | 管理码文件 | 内容 `polis2026` 与 env var `mzGW2026!PolisHub` 不一致，记录但不自动同步 | v1.0.25 | — |

## 如何使用本文件

1. **修改代码前**: 查此表，确认要改的文件有何修复历史
2. **修改代码后**: 在此表追加一条记录，标注修改内容和 Pattern
3. **Bug 复发时**: 从此表定位之前的修复代码，复制粘贴修复
4. **Code Review**: 检查修改是否与历史修复冲突
