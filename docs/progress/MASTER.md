# 当前任务进度

> 最后更新: 2026-06-01

## 追踪模式

LOCAL_ONLY

## 当前状态

**活跃任务**: 无

### 已完成 (v1.0.47) — 视频发布体验修复 (2026-06-01)

- [x] **BUG-005**: `handleVideoUpload()` publish 失败后显示实际错误信息（不再静默忽略）
- [x] **BUG-004**: `addSubmission()` 社区不支持当前模块时拒绝添加并提示
- [x] **BUG-006 排除**: 中文 namespace 查询失败确认为测试拼写错误（缺少"这"字），非代码 bug
- [x] **浏览器验证**: 创作页模块切换预填保留 ✅ / 发布按钮统一 ✅ / 视频标签页正常 ✅
- [x] **编译 + GitHub Release (v1.0.47) + 服务器部署**

- [x] **CLI 页面新增命令组**: 💭 聊天室、✉️ 私信、👥 关注、💚 健康检查、🛠️ adminctl.sh
- [x] **已有命令组扩充**: 社区 (+list/members/root/subspaces/analytics)、帖子 (+pin/featuring/hide/view/download)、投票 (+all)、管理后台 (+approve/reject/hide/unhide/review/rules/refs/audit)
- [x] **Rust vs Bash 对比表修正**: 新增 chat/message/qa/health/series/tier/admin-review 对比行；纠正 series/tier 高级操作 Bash 支持状态
- [x] **安全修复**: 移除快速开始中硬编码的旧管理凭据
- [x] **CLI-GUIDE.md 同步更新**: 管理操作章节补充 review/rules/refs/audit/posts approve-reject 等
- [x] **编译 + GitHub Release (v1.0.46) + 服务器部署 + 浏览器验证** — 20 个命令组全部显示正确

### 已完成 (v1.0.45) — 全站功能审查 + Bug 修复验证 (2026-05-30)

### 已完成 (v1.0.45) — 全站功能审查 + Bug 修复验证 (2026-05-30)

- [x] **全站 20+ 页面逐一测试** — 首页/发现/趋势/热榜/搜索/社区空间(5个Tab)/帖子详情/创作者中心(仪表盘+内容管理)/创作页(文章↔视频切换)/设置/消息/通知/个人资料/创建社区/关于/更新日志/隐私/AI研究/CLI/管理后台
- [x] **v1.0.44 Bug 修复验证通过**:
  - 交流Tab发布按钮已统一为紧凑header按钮（与自定义模块一致）
  - 创作页文章↔视频切换预填数据正确保留
- [x] **无新增Bug** — 所有页面渲染正常、按钮功能正确、API请求无异常
- [x] **已知问题**: PWA manifest icon 404 (非关键)、管理子页面直接URL访问返回404 (客户端Tab切换)

### 已完成 (v1.0.44) — 模块发布按钮统一 + 切换不清除预填

- [x] **Fix 1: 发布按钮统一** — SpacePageClient.tsx Posts Tab 发布按钮从大型 glass-card 改为紧凑 header 按钮（与自定义模块一致）
- [x] **Fix 2: 模块切换不清除预填** — creations/new/page.tsx handleModuleChange 添加 prefillStillValid 检查，预填模块支持新内容类型时不清空 submissions
- [x] **浏览器端到端验证** — 用户空间(世界公园) + 测试社区(测试模块发帖验证) 双场景验证通过
- [x] **新发现 BUG-001** — 视频发布不创建 ModuleRef (video→space_videos 表而非 module_refs 表)，影响自定义模块视频发布
- [x] **Bug 追踪系统深度增强设计**:
  - [x] **`scripts/pre-modify-check.sh`** — 修改文件前的风险评估脚本（13个脆弱文件的风险检查+修复配方）
  - [x] **`docs/bugs/INDEX.md` 增强** — 新增 Bug 生命周期追踪 + 修复紧急程度分级 + 复发预警系统 + 快速参考卡片
  - [x] **`docs/bugs/fix-points.md` 增强** — 新增修复配方反向索引 + 脆弱文件修改前检查清单
  - [x] **`docs/KNOWN-ISSUES.md` 更新** — 记录视频 ModuleRef 架构问题
  - [x] **`CLAUDE.md` 更新** — Bug 修复流程增加 pre-modify-check.sh 步骤
- [x] **部署**: v1.0.44 已发布到 GitHub Release + 服务器

### 已完成 (v1.0.36) — Bug 追踪系统深度增强

- [x] **`scripts/bug-record.sh`** — 一键修复记录 CLI（交互+非交互模式），自动更新 6 个追踪文件（timeline/INDEX/fix-points/KNOWN-ISSUES/Pattern/regression-map）
- [x] **`scripts/gen-stats.sh`** — 自动统计生成器（脆弱文件排名、Pattern 频率分布、月度趋势、DNA 分布）
- [x] **`scripts/diagnose.sh`** — 症状自动诊断工具，输入关键词匹配已知 Pattern + 给出修复配方 + 诊断命令
- [x] **`scripts/install-hooks.sh`** — Git pre-push hook 安装（push 前自动运行 pre-deploy-check.sh --strict）
- [x] **`scripts/pre-deploy-check.sh` 增强** — 新增 Pattern frontmatter 完整性检查 + fix-points 统计一致性检查 + `--quick` 快速模式（只跑高风险检查）
- [x] **INDEX.md 趋势面板** — 新增月度趋势 + 脆弱文件 Top-10 + Pattern 频率分布 + 修复有效性追踪
- [x] **12 个 Pattern 文件 YAML frontmatter** — 机器可解析的症状/关键词/严重程度/配方/诊断命令元数据
- [x] **CLAUDE.md 流程简化** — 8 步手动流程 → 一键命令 + Bug 追踪工具速查表
- [x] **MASTER.md 更新** — 记录 v1.0.36

### 已完成 (v1.0.35) — 模块权限修改调查 + null 安全加固

- [x] **模块权限修改导致页面空白调查** — 浏览器多场景复现测试（修改/添加/移除内容类型、自定义模块创建、返回按钮导航）均无法稳定复现用户报告的问题。可能的根因：v1.0.34 模块Tab渲染修复已间接解决，或是特定浏览器/时序相关
- [x] **SpaceSettings allowed_content_types null 安全** — `m.allowed_content_types.map()` → `(m.allowed_content_types ?? []).map()`，消除潜在 React 崩溃点
- [x] **Bug 追踪文档更新** — 记录 v1.0.35 防御性修复，更新统计 (73→73 修复，array-map-null Pattern 追加)

### 已完成 (v1.0.34) — 模块Tab渲染修复

- [x] **模块Tab空白页修复** — module_key 与 route name 映射修复：tab id 从 `m.module_key` 改为 `MODULE_CONFIG[m.module_key]?.route || m.module_key`
- [x] **自定义模块 fallback** — 新增动态模块通用渲染块（发布按钮 + 帖子列表 + 空状态），处理不在 KNOWN_TABS 中的自定义模块
- [x] **PostCard props 修正** — fallback 块中使用正确的 PostCard props 接口
- [x] **浏览器验证** — 世界公园社区交流Tab和视频Tab正常渲染，发布按钮跳转正确

### 已完成 (v1.0.33) — 创作体验简化

- [x] **创作页简化** — 模块类型从 17 种简化为 2 种（文章/视频），移除 unlisted 可见性，移除密码分享，移除 AI 对话(Thread)模式，移除问答(QA)编辑器
- [x] **mtFilter 修复** — SpacePageClient 移除硬编码模块类型过滤，所有动态模块帖子正常显示
- [x] **个人主页改造** — 作品 Tab 从动态模块子选项卡改为固定 概览/视频/文章 三个子 tab
- [x] **浏览器全量验证** — 创作页(文章+视频)正常、社区页帖子显示正常、帖子详情页正常、无新增 console 错误

### 已完成 (v1.0.32) — 自定义模块系统部署

- [x] **自定义模块系统后端** — space_modules 表 + 5 个 repo 方法 + handler + routes
- [x] **前端模块重写** — SpaceModulesManager 组件从硬编码 17 模块改写为动态 API CRUD
- [x] **动态 Tab 生成** — 社区页从 API 读取模块列表动态生成 Tab
- [x] **创作页模块联动** — allowed_content_types 驱动内容类型过滤
- [x] **Gateway 路由修复 (v1.0.31)** — proxy_space_router 移除 modules is_content 误判
- [x] **Actions 数组修复 (v1.0.32)** — handle_auth_path 追加 "/modules" 后缀
- [x] **DELETE 路由修复 (v1.0.32)** — .delete(delete_space) → .delete(handle_auth_path)
- [x] **编译目标修复 (v1.0.32)** — 改用 --target x86_64-unknown-linux-gnu
- [x] **前端旧代码残留修复 (v1.0.32)** — 重新 next build + 打包部署
- [x] **Bug 追踪系统增强** — 2 个新 Pattern (actions-array-missing, wrong-build-target) + 2 个新配方 + 自动化预防脚本 + 修复影响矩阵 + Bug DNA 分类体系
- [x] **管理页功能验证** — 浏览器测试管理页 5 个 Tab 全部正常渲染
- [x] **模块 CRUD 验证** — 创建/编辑/删除模块全部正常

### 已完成 (v1.0.27)

- [x] **Star 系统全链路** — space_stars 表 + 7 个 repo 方法 + 4 个 API 端点 + 前端按钮 + Saved 页 + Trending 加权
- [x] **社区管理页** — 独立管理页 (5 个 Tab: 基本信息/模块/成员/审批/数据)，仅 owner 可访问
- [x] **star_count 前端显示修复** — stats 行新增 "收藏" 计数
- [x] **上传大小限制调整** — 附件 50MB→10MB，视频 500MB→200MB（适配 1.6GB 服务器）
- [x] **部署路径修复** — 解决 systemd ExecStart 路径与部署目标不一致问题
- [x] **浏览器全部验证** — Star 收藏/取消/Saved 页/管理页 5 个 Tab/管理后台 12 页/系统设置上传限制 全部正常
- [x] **Bug 追踪增强** — 新增 deploy-path-mismatch Pattern + 修复配方 + 预防清单 + 59→62 总修复数

### 已完成 (v1.0.25)

- [x] **全功能深度测试** — 首页/社区/用户/内容/管理后台（12页）/申诉/API 全部正常，无新增 Bug
- [x] **管理后台全部验证** — 仪表盘/用户/社区/内容/评论/审查队列/审查规则/举报/操作日志/交易/分析/设置
- [x] **polisctl/adminctl 硬编码密码修复** — 移除硬编码 `admin123` 和空密码，改为参数传入
- [x] **管理码不一致记录** — 文档化 `admin_code.txt` vs 环境变量的优先级逻辑
- [x] 管理员密码重置 — 通过 Argon2 hash 更新恢复后台访问

### 已完成 (v1.0.24)

- [x] **平台设置系统** — `platform_settings` 表 + Admin API (GET/PUT) + 前端设置页上传大小配置
- [x] **上传大小可配置** — 视频服务 DB 动态读取 `max_video_size_mb` + 内容服务 DB 动态读取 `max_upload_size_mb`
- [x] **安全加固** — 内容服务附件上传新增大小检查 + DefaultBodyLimit 层 + Gateway body limit 可配置
- [x] **网站初始化** — 登录页移除测试账号提示 + 清理 66 个测试用户 + 89 个测试空间
- [x] 浏览器验证 — 首页正常 + 管理后台设置页上传限制配置正常 + 平台设置 API 正常

### 已完成 (v1.0.41) — 模块架构去交流中心主义彻底改造

- [x] **核心库 (module-config.ts) ROOT CAUSE 修复** — MODULE_ALIASES 删除 article→forum / getModuleLabel() 未知key返回自身 / normalizeModuleType() 去折叠 / getModuleLabelByContentType() moduleType优先
- [x] **ContentCard.tsx** — moduleLabel prop + 面包屑优先 + adaptCreationItem 去 normalizeModuleType + adaptFeedItem 读 module_name
- [x] **PostCard.tsx** — 移除 `|| '交流'` 三重fallback
- [x] **SpacePageClient.tsx** — mtFilter 统一键空间 + 标签回退链 + 概览区 route==='posts'
- [x] **ProfilePageClient.tsx** — 3 处硬编码三元 → getModuleLabel()
- [x] **PostPageClient.tsx** — adaptCreationToPost 优先 submission + 引用标签 getModuleLabel()
- [x] **creations/new/page.tsx** — 简化模块检查逻辑
- [x] **后端 repo.rs** — feed SQL LEFT JOIN space_modules + JSON 返回 module_name
- [x] **Bug 追踪完整记录** — Pattern 更新 + 时间线 + INDEX 统计 + fix-points + regression-map Chain #9 + 修复配方
- [x] **编译 + GitHub Release (v1.0.41) + 服务器部署 + 浏览器全量验证** — 首页动态/社区概览/自定义模块Tab/个人主页/帖子详情/创作中心全部正常

### 已完成 (v1.0.42) — Profile 页作品模块名修复

- [x] **后端 models.rs** — SubmissionInfo struct 新增 `module_name: Option<String>` 字段
- [x] **后端 creation.rs** — `creation_to_public()` SQL LEFT JOIN space_modules + tuple 11→12元素 + SubmissionInfo 含 module_name
- [x] **后端 creation.rs** — `get_submissions()` 同样 LEFT JOIN space_modules + tuple 更新
- [x] **前端 ContentCard.tsx** — SubmissionInfo interface 新增 module_name 字段 + adaptCreationItem 传递 moduleLabel
- [x] **编译 + GitHub Release (v1.0.42) + 服务器部署** — 个人主页作品Tab自定义模块显示真实名称（"天气预报"而非 mod_4167432e）

### 已完成 (v1.0.43) — Route fallback 回归修复

- [x] **SpacePageClient.tsx** — 概览区 route fallback `|| 'posts'` → `|| p.module_type` (lines 1081, 1087)
- [x] **根因**: v1.0.41 引入的回归 — 当 p.module_type 不在 MODULE_CONFIG 中时，fallback 'posts' 导致自定义模块帖子泄漏到交流Tab
- [x] **编译 + GitHub Release (v1.0.43) + 服务器部署 + 浏览器验证** — 交流Tab不再显示天气预报模块帖子

### 已完成 (v1.0.44) — 发布按钮统一 + 模块切换不清除预填

- [x] **SpacePageClient.tsx Posts Tab** — 大型 glass-card 发布卡片 → 紧凑 header 按钮（"交流"标题 + "发布"按钮），与自定义模块样式一致
- [x] **creations/new/page.tsx handleModuleChange** — 添加 prefillStillValid 检查：预填模块支持新内容类型时不清空 submissions
- [x] **编译 + GitHub Release (v1.0.44) + 服务器部署 + 浏览器验证** — 交流模块发布按钮与天气预报一致；文章↔视频切换预填保留

### 部署版本

v1.0.46 — CLI 页面文档全面更新 (2026-05-30)
v1.0.45 — 全站功能审查 (无新增Bug) (2026-05-30)
v1.0.44 — 发布按钮统一 + 模块切换不清除预填 (2026-05-29)
v1.0.43 — Route fallback 回归修复 (2026-05-29)
v1.0.42 — Profile 页作品模块名修复 (2026-05-29)
v1.0.41 — 模块架构去交流中心主义彻底改造 (2026-05-29)
v1.0.40 — 模块面包屑部分修复 (2026-05-29)
v1.0.36 — Bug 追踪系统深度增强 (2026-05-29)
v1.0.35 — 模块权限调查 + null 安全加固 (2026-05-29)
v1.0.34 — 模块Tab渲染修复 + 创作体验简化 (2026-05-29)

### 之前版本

v1.0.24 — 平台设置系统 + 上传大小可配置 + 网站初始化 + 安全加固

### 之前完成 (本轮)

- [x] 管理后台增强 — 3 个新页面 (审查队列/审查规则/操作日志) + 3 个页面增强 (Users/Posts/Reports)
- [x] Agent 审查系统 — 4 个 Agent API + 4 条种子规则 + polisctl agent-review 命令 + AGENT-POLICY.md 操作手册
- [x] 浏览器全部验证 — 10 个管理页面正常渲染 + 4 个 Agent API 端点正常响应
- [x] 修复管理后台登录页缺少密码输入框 (v1.0.20)
- [x] Bug 追踪更新 — 新增 missing-form-field Pattern + 修复配方 + 回归事件 #5
- [x] 修复系统设置页验证码修改错误类型 (Unauthorized→Validation) (v1.0.21)
- [x] 浏览器全部功能深入测试 — 12 个管理页面 + 所有功能验证
- [x] 管理后台联动修复 + 用户申诉系统 (v1.0.22 + v1.0.23) — 未认证封禁+自定义原因+申诉API+申诉页面+Gateway路由修复+登录页申诉链接触发修复

### 已完成 (v1.0.39 - v1.0.40) — 自定义模块完整修复

- [x] **枚举序列化数据丢失修复 (v1.0.39)** — PostPublic.module_type 和 content_type 从枚举改为 String，消除 serde_json round-trip 的数据丢失
- [x] **content_handler.rs 5 处修复** — 所有 `serde_json::from_str().unwrap_or_default()` 替换为 `.clone()`
- [x] **前端 mtFilter 修复 (v1.0.39)** — 纳入动态自定义模块键（从 spaceModules 读取）
- [x] **概览页面包屑修复 (v1.0.40)** — 从 spaceModules 查找自定义模块的实际名称而非 fallback 到 '交流'
- [x] **PostCard 组件修复 (v1.0.40)** — module_type 不再硬编码为 'forum'，内联面包屑使用动态 module_label
- [x] **所有 PostCard 调用点更新** — 传入真实 module_type，自定义模块 Tab 传入 module_label=currentMod.name
- [x] **Bug 追踪记录** — 2 个新 Pattern (enum-serialization-data-loss, module-breadcrumb-hardcoded) + 修复点数更新 (73→75)
- [x] **浏览器全量验证** — 天气预报 Tab 正常显示帖子、面包屑显示正确模块名、首页动态正常更新、交流模块发帖正常

### 已知残留 (v1.0.41 后)

- [x] ~~**ContentCard.tsx feed 面包屑**~~ — v1.0.41 已通过 moduleLabel prop + adaptFeedItem(module_name) + getModuleLabel 返修彻底解决
- [x] ~~**Profile 页作品 Tab 模块名显示 module_key**~~ — v1.0.42 已通过 creation_to_public() JOIN space_modules + SubmissionInfo.module_name 解决

### 历史完成

- [x] 修复首页 Feed 算法 — 关注 Tab key 匹配 (`'follow'` → `'following'`)
- [x] 修复首页 Feed 算法 — 热榜排序不被 `created_at` 覆盖
- [x] 密码重置系统安全加固 (UUID + SHA256 token)
- [x] Gateway 限流中间件 (60 req/min per IP)
- [x] JWT_SECRET 强制验证
- [x] 前端安全加固 (.map() 防御 + console.error 清理)
- [x] 创作中心代码重构 (组件拆分 + API 统一)
- [x] CORS 头由 Nginx 统一管理 (Gateway 剥离)
- [x] 文档重组 (docs/ 目录优化)
- [x] 浏览器验证: 首页 Feed 三 tab 全部正常
- [x] 浏览器验证: 右侧栏"热门趋势"和"推荐社区"正常
- [x] 更新 changelog — 补全 v1.0.8 和 v1.0.9 版本记录
- [x] 修复个人主页作品 Tab 为空 — username 双重 URL 编码导致 API 404
- [x] Bug 追踪系统 — `docs/bugs/` 目录 + Pattern 库 + CLAUDE.md 修复协议
- [x] README 重写 — 从功能目录升级为产品叙事 (竞品对照+双维度模型+核心差异化)
- [x] 修复 cherry-markdown 编辑器报错 — 锁定版本 0.11.0 + transpilePackages (v1.0.12)
- [x] Bug 追踪系统增强 — 回归地图 + 修复配方库 + 依赖升级 Pattern + 预防清单
- [x] **安全审计全面修复 (v1.0.13)** — JWT exp 显式校验 + Argon2 密码哈希 + SQL 参数化 + zip-slip + XSS 过滤 + 安全头加固 + 凭据保护 + 前端 Tab-nabbing
- [x] 社区功能增强 (v1.0.15-16) — 关注+图标上传+私有空间权限+审批状态
- [x] 浏览器全面测试 — 社区创建/编辑/删除/权限/关注/图标 10 项功能验证
- [x] 修复 BUG-11：创建社区标题被 slug 化 (v1.0.17)
- [x] 修复 BUG-12：deriveSlug 不保留下划线 (v1.0.17)
- [x] 修复 BUG-13：前端缺少删除社区按钮 (v1.0.17)
- [x] 内容审核系统 (v1.0.18) — 平台级封禁 + 时限隐藏 + Auto-Restore + 批量操作
- [x] 浏览器验证：封禁/解封 + 隐藏/自动恢复 + 批量隐藏

### 待处理

- [ ] 部署 polis-aggregate (代码已有，未部署)
- [ ] 配置 logrotate 日志轮转
- [ ] PostgreSQL 定时备份
- [x] 深入功能测试 (2026-05-27) — 12 个管理页面 + 前端核心功能 + 登录/申诉流程 + API 端点全量验证，无新增 Bug
- [x] 视频无法播放问题诊断 — 根因: 服务器 HLS 文件全部丢失 (数据持久化问题)，非代码 Bug，与 v1.0.22/23 修复无关
- [ ] 恢复丢失的视频文件（无备份，无法恢复）
- [ ] 社区分类/标签系统
- [ ] 创作者数据分析仪表盘
- [ ] 跨社区引用可见性 (作品详情页展示其他引用位置)

## 部署版本

v1.0.41 — 模块架构去交流中心主义彻底改造 (8文件20+点位根因修复) (2026-05-29)
v1.0.40 — 模块面包屑部分修复 (PostCard+SpacePageClient) (2026-05-29)
v1.0.39 — 枚举序列化数据丢失修复 (2026-05-29)
v1.0.34 — 模块Tab渲染修复 (module_key→route 映射 + 自定义模块fallback) (2026-05-29)
v1.0.33 — 创作体验简化 (2类型+移除unlisted+个人主页改造) (2026-05-29)
v1.0.32 — 自定义模块系统 (部署修复 + 3 Bug 修复) (2026-05-28)
v1.0.31 — Gateway 路由修复 (modules 误判) (2026-05-28)
v1.0.30 — 自定义模块系统 (后端+前端+DB) (2026-05-28)
v1.0.29 — 修复管理页 atob URL-safe base64 解码失败 (2026-05-28)
v1.0.28 — 管理页 isOwner 竞态修复尝试（未解决问题，React 批处理非根因）(2026-05-28)
v1.0.27 — Star 收藏 + 管理页 + 上传限制调整 + Bug 追踪增强 (2026-05-27)
v1.0.26 — Star 系统 + 管理页 + Trending 增强 (2026-05-27)
v1.0.25 — 深度功能测试 + polisctl/adminctl 凭据修复 (2026-05-27)
v1.0.24 — 平台设置系统 + 上传大小可配置 + 网站初始化 + 安全加固 (2026-05-27)
v1.0.23 — 登录页申诉链接触发条件修复 (Forbidden: 前缀检测)
v1.0.22 — 管理后台联动修复 (未认证封禁+自定义原因) + 用户申诉系统
v1.0.21 — 系统设置验证码错误类型修复 (Unauthorized→Validation)
v1.0.20 — 管理后台登录修复 (密码字段缺失)
v1.0.19 — 管理后台增强 + Agent 审查系统完善
v1.0.18 — 内容审核系统：平台级封禁 + 时限隐藏 + Auto-Restore + 批量操作
v1.0.17 — 创建社区标题/下划线修复 + 删除社区按钮
v1.0.16 — 社区功能增强部署 + 私有空间权限门控
v1.0.15 — 关注+图标上传+私有空间权限+审批状态 (开发版本)
v1.0.14 — 社区功能 5 项修复 (title 校验+软删除+post_count 同步+members keyMap)
v1.0.13 — 安全审计全面修复 (JWT/密码/SQL/配置 4 维度加固)
v1.0.12 — cherry-markdown 编辑器修复 + Bug 追踪系统增强
v1.0.11 — 修复个人主页作品 Tab 为空
v1.0.10 — changelog 补全 + research roadmap 更新
v1.0.9 — 首页 Feed 算法修复
v1.0.8 — 密码重置安全 + Gateway 限流 + JWT_SECRET 强制验证

## 服务器

- IP: 47.253.123.3
- 域名: www.mzgw.com
- 部署路径: `/root/polis/target/release/` (后端), `/opt/polis-web/` (前端)
- 服务: polis-gateway, polis-user, polis-space, polis-content, polis-admin, polis-video, polis-web
- **部署方式**: 本地编译 → GitHub Release → 服务器 `curl` 下载
- **禁止**: SCP（中美丢包）、服务器编译（OOM）
