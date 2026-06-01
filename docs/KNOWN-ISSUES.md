# 已知问题与技术债务

> 📊 完整的 Bug Pattern 库 + 统计面板见 [docs/bugs/INDEX.md](bugs/INDEX.md)

## 已知技术债务

- ~~微服务缺少独立 `/health` 端点~~ → v0.2.84 已为 4 服务添加
- `GET /api/spaces` 无公共列表端点，使用 `GET /api/spaces/trending` 替代
- 部分规划中的微服务（search/chat/video/pay）仅有骨架代码
- ~~JWT Token 有过期时间，端到端测试需在注册后立即使用~~ → v1.0.13 已显式启用 exp 校验，端口测试需 token 刷新
- ~~JWT 多服务校验不一致 (Validation::default() 行为不确定)~~ → v1.0.13 统一使用 polis_core::auth::secure_validation()
- GitHub Release 下载链接不可用（gh CLI 未认证服务器），仅支持源码编译安装
- `GET /api/spaces/search` 无独立搜索端点
- `polis-aggregate` 有完整代码但未部署，跨社区精选/热榜功能缺失
- 无蓝绿/滚动部署（重启时有短暂中断）
- 日志无自动轮转（可能撑满磁盘）
- systemd 服务 ExecStart 使用 `/root/polis/target/release/` 路径，与部署目标 `/usr/local/bin/` 不一致 → v1.0.27 记录为 [deploy-path-mismatch](bugs/patterns/deploy-path-mismatch.md) Pattern
- 服务器 admin_code 存储在 `/root/polis/admin_code.txt`，文件优先级高于 `ADMIN_CODE` 环境变量（管理后台修改后不同步） → v1.0.25 记录

## 关键 Bug 修复记录

> 防止回退 — 以下 bug 曾经导致线上事故，修复后记录在此
- **视频大文件上传 Gateway 代理失败 502 (v1.0.52)** — >=2MB 视频上传时 gateway 返回 "Service temporarily unavailable"。根因: 视频服务鉴权失败时 axum 在 body 未消费时关闭连接，reqwest 还在写 body 时连接中断 → SendRequest 错误。修复: Gateway 剥离 hop-by-hop headers + 视频服务 auth 失败时先 drain multipart body 再返回错误。**教训: 所有后端 handler 在返回错误前应确保请求体被消耗。**
- **视频投稿 403 "目标社区未开启视频模块" (v1.0.53)** — 自定义视频模块 (module_key=`mod_1ade9c1d`) 投稿后 publish 返回 403。根因: `validate_space_for_video_submission` 检查 `spaces.enabled_modules` 硬编码 key=`"video"`，自定义模块 key 不匹配。修复: 改为查 `space_modules` 表用 `allowed_content_types @> '["video"]'::jsonb`。**教训: 视频服务早于 ModuleRef 系统，`spaces.enabled_modules` 是旧字段，涉及模块能力判断应查 `space_modules` 表。**
- **社区概览页和Feed页帖子面包屑显示模块名为'交流'而非实际模块名(如'天气预报') (v1.0.40)** — 见 [module-breadcrumb-hardcoded](bugs/patterns/module-breadcrumb-hardcoded.md)
- **自定义模块帖子DB中module_type正确但API返回forum/text，前端tab不显示 (v1.0.39)** — 见 [enum-serialization-data-loss](bugs/patterns/enum-serialization-data-loss.md)

- **部署后 UI 错乱 (macOS xattr 污染)** — v0.3.91 和 v0.3.95 两次复现。macOS tar 含 AppleDouble (`._*`) 和 xattr 扩展头。必须：
  1. 本地打包: `COPYFILE_DISABLE=1 tar -czf release.tar.gz ...`
  2. 服务器解压前: `rm -rf /opt/polis-web/.next`
  3. 解压后清理: `find /opt/polis-web/.next -name '._*' -delete`
  4. 清缓存: `rm -rf /opt/polis-web/.next/cache`
  5. 全重启: `systemctl restart polis-web`
  6. 验证 CSS: `md5sum` 对比本地和服务器 CSS 文件一致性

- **服务器 OOM 宕机** — 2026-05-21~22，服务器 1.6GB 内存被 `npm run build` + `cargo build` 吃满。**铁律：绝不在服务器上编译**。auto-dev.sh 已重写为 v3.0 移除全部编译步骤。

- **Feed 热榜排序被覆盖** — `get_feed` 在 SQL 热榜排序后又按 `created_at DESC` 全量重排。修复: 仅非 hot 模式才按时间排序。

- **关注 Tab key 不匹配** — 前端 tab key `'follow'` 但 `getSortParam` 检查 `'following'`，导致所有 tab 都用默认排序。修复: 统一为 `'following'`。

- **评论匿名 Bug** — `create_comment` 返回 Comment 模型无 author 字段。修复: 改为 `serde_json::Value`，用 `find_users_batch` 查询并嵌入 author 数据（v0.2.68）

- **内容服务发帖中文路由 404** — `parse_content_path` 用 `req.uri().path()` 取到 URL 编码路径未解码。修复: 入口处 `percent_decode_str()` 解码（v0.2.58）

- **模块设置 localStorage key 迁移** — 命名空间编码变更后旧设置丢失。修复: `loadModules` 双 key 回退（v0.2.58）

- **个人主页作品 Tab 双重编码 404** — `params.username` 保留 URL 编码形态，`encodeURIComponent` 二次编码导致 `%` → `%25`，服务器收到乱码返回 404。修复: `decodeURIComponent` → `encodeURIComponent`（v1.0.11）

- **中文 slug 社区 404** — `handle_public_path` 取到 URL 编码后的路径未解码。修复: `decode_namespace()` 用 percent-encoding crate（v0.2.54）

- **Standalone 部署文件同步** — npm build 后需同步 server/ + BUILD_ID + *.json 到 standalone/.next/（v0.2.41）

- **网关查询参数丢失** — `proxy_to_*` 函数改用 `path_and_query()`（v0.2.7）

- **模块Tab点击空白页 (v1.0.34)** — 动态Tab系统使用 `module_key` 作为标识符，但渲染块条件使用 `MODULE_CONFIG` route 名。两个键空间不一致导致Tab激活但无匹配渲染块。修复: tab id 改为 `MODULE_CONFIG[m.module_key]?.route || m.module_key` + 新增通用 fallback 渲染块处理自定义模块。见 [module-tab-key-mismatch](bugs/patterns/module-tab-key-mismatch.md)。

- **SpaceSettings allowed_content_types null 安全 (v1.0.35)** — `m.allowed_content_types.map()` 缺少空值防御，若 API 返回 null/undefined 则 React 崩溃白屏。用户曾报告"改模块权限后页面空白"但多次浏览器测试未能稳定复现。作为防御性修复: `(m.allowed_content_types ?? []).map()`。见 [array-map-null](bugs/patterns/array-map-null.md)。

- **mtFilter 硬编码模块类型过滤 (v1.0.33)** — SpacePageClient 使用硬编码 Set 过滤帖子模块类型（仅允许 17 种旧模块），自定义模块帖子被过滤掉。修复: 移除 mtFilter，直接追加所有帖子。

- **视频发布不创建 ModuleRef (v1.0.44 发现)** — 视频上传后通过 `/api/videos/{id}/publish` 发布到社区，但该端点只接受 `space_ids` 不接受 `module_type`。Video 系统使用独立的 `space_videos` 表而非 `module_refs` 表，导致视频无法关联到自定义模块 Tab。根因: 视频系统架构早于 ModuleRef/自定义模块系统，未同步升级。影响: 通过自定义模块入口发布的视频不会出现在模块 feed 中。修复方向: 1) PublishRequest 增加 `module_type` 字段; 2) `submit_to_space` 同时写入 `module_refs` 表。

- **管理后台 reported_content SQL Bug** — `get_platform_stats()` 子查询错误使用了 `posts` 表。修复: 改为 `SELECT COUNT(*) FROM reports WHERE status = 'pending'`（v0.3.64）

- **安全审计 — 密码明文存储** — v1.0.13 之前帖子密码以明文存储在 `posts.password_hash`。修复: 创建/更新时 Argon2 哈希，验证时 PasswordVerifier 比对。⚠️ 回归风险: 旧密码数据仍为明文，新创建/更新的帖子密码才走 Argon2 验证。

- **安全审计 — JWT exp 校验未显式启用** — v1.0.13 之前 14+ 处调用点使用 `Validation::default()`。虽然 jsonwebtoken v9 默认 validate_exp=true，但行为不明确。修复: 提取 `polis_core::auth::secure_validation()` 统一配置，所有微服务引用同一函数。

- **安全审计 — SQL 注入风险** — `find_posts_by_space` 使用 `format!()` 拼接 SQL 排序子句。修复: 改为 12 臂 match 全参数化查询。

- **安全审计 — zip-slip 路径穿越** — 上传插件包解压时未 strip 路径。修复: `unzip -j` 废弃路径。

- **安全审计 — Markdown XSS** — CherryRender/MarkdownEditor 未过滤 `javascript:` 协议。修复: URL scheme 白名单 + 属性过滤 + `rel="noopener noreferrer"`。

- **种子数据依赖已根除** — E2E 测试全面重构为动态注册用户/空间模式，移除所有硬编码（v0.3.81）

- **cherry-markdown 编辑器报错 (依赖自动升级)** — `^0.11.1` 允许自动升级到 `0.11.2`，后者与 CodeMirror 6 配置不兼容，报 `Cannot delete property 'toString'`。修复: 锁定 `0.11.0` + 添加 `transpilePackages: ['cherry-markdown']`。教训: 非信任第三方依赖使用精确版本号（v1.0.12）

- **社区空标题创建 + 超长标题无限制** — 创建社区 API 缺少 title 非空验证和长度上限。修复: `space_handler.rs:create_space` 添加 `trim().is_empty()` 拒绝 + 50 字符上限（v1.0.14）

- **社区无法删除 (405 Method Not Allowed)** — DELETE 路由未注册，用户无法清理误创建的社区。修复: 新增 `delete_space` 路由 → `archive_space` handler → `archive` repo 方法，软删除: `status = 'archived'` 仅 owner 可操作（v1.0.14）

- **社区数据统计不准确 (post_count 不同步)** — `spaces.post_count` 仅在 `create_post` 中更新，`submit_to_community` 和 `thread_handler::publish` 两个路径遗漏了 `post_count +1`，导致社区页计数为 0。修复: 两个路径各追加 `UPDATE spaces SET post_count = post_count + 1`。⚠️ 回归风险: 新增任何 INSERT INTO posts 路径必须同步更新。已建立 [Pattern](../docs/bugs/patterns/post-count-sync.md) + [修复配方](../docs/bugs/fix-recipes/post-count-sync.md)（v1.0.14）

- **SpaceSettings members keyMap 缺失** — `persistModules` 映射表缺少 `members: 'members'`，虽通过 fallback 能工作但不一致。修复: 补充 keyMap（v1.0.14）

- **私有空间发帖权限缺失（安全漏洞）** — POST /api/spaces/{ns}/posts 到私有空间时，仅认证检查，未校验成员身份。任何认证用户均可向私有空间发帖。修复: 发帖前调用 `block_private_space_public_listing`（v1.0.15）

- **私有空间文件上传权限缺失（安全漏洞）** — POST /api/spaces/{ns}/files 到私有空间时未检查成员身份。修复: 上传前调用 `block_private_space_public_listing`（v1.0.15）

- **加入社区无"审批中"状态显示** — 用户提交加入私有社区的申请后，按钮仍显示"加入社区"，无法区分"已申请待审批"状态。修复: 新增 `/my-join-status` 端点，前端显示"审批中..."（v1.0.15）

- **无法关注社区** — 缺少关注/取消关注 API 和 UI。修复: 新增 `/follow` `/unfollow` 端点 + 前端关注按钮 + owner 通知（v1.0.15）

- **社区缺少图标/封面上传功能** — `icon_url`/`banner_url` 字段已存在但无上传 UI。修复: 编辑对话框新增图标/封面上传（base64），header 展示图标和横幅（v1.0.15）

- **icon_url/banner_url 无法清除** — 更新逻辑使用 COALESCE，NULL 时保留旧值，导致"移除"按钮不生效。修复: 改为 `CASE WHEN $4 = '' THEN NULL ELSE COALESCE(...)`（v1.0.15）

- **创建社区标题被 slug 化（BUG-11）** — `create/page.tsx` 中 `handleCreate` 将 `slug`（已 slugify 处理的小写/无特殊字符版本）作为 `title` 传给 API，导致用户输入的原始标题（如 "TestCommunity_17686"）丢失，变成全小写无下划线版本。修复: `title: slug` → `title: title.trim()`，保留用户原始输入（v1.0.17）

- **deriveSlug 不保留下划线（BUG-12）** — `create/page.tsx` 中 `deriveSlug` 正则会过滤 `_`，导致 slug 中下划线丢失，命名空间与用户预期不一致。修复: 正则字符类中添加 `_`（v1.0.17）

- **前端缺少删除社区按钮（BUG-13）** — `SpacePageClient.tsx` 已有编辑按钮但无删除功能，用户无法清理误创建的社区。修复: 新增 Trash2 删除按钮 + Fragment 包裹多个子元素（v1.0.17）

- **Visibility 枚举缺失 Hidden 变体** — 审核系统新增 `visibility='hidden'` 状态，但 `Visibility` 枚举只有 Public/Private/Unlisted。serde_json 反序列化 "hidden" 失败时 fallback 到 `Default::Public`，导致隐藏帖子 API 返回 `visibility: public`。修复: 新增 `Hidden` 变体 + serde rename="hidden" + Display impl（v1.0.18）

- **PostPublic 使用原始 visibility 而非 effective_visibility** — `get_post_public` 计算了 auto-restore 后的 effective_visibility，但构造 PostPublic 时错误使用 `post.visibility`（DB 原始值），导致首次 GET 返回过期 visibility。修复: 将 `post.visibility` 替换为 `effective_visibility`（v1.0.18）

- **管理后台登录页缺少密码输入框** — admin/login 页面 `useState` 初始化了 `password` 字段但 JSX 中没有对应的 `<input type="password">`，导致后端 Argon2 验证失败，无法登录。修复: 在邮箱和验证码之间补充密码输入框（v1.0.20）

- **系统设置页验证码修改失败返回 "Authentication required"** — `update_admin_code_handler` 在校验当前验证码不匹配时错误返回 `AppError::Unauthorized` (HTTP 401)，前端收到 401 无法读取业务错误消息，显示 "Authentication required" 而非 "当前验证码不正确"。修复: 将错误类型改为 `AppError::Validation("当前验证码不正确".to_string())` (HTTP 400)。⚠️ 教训: API 错误类型映射要保持语义一致 — 业务校验失败用 Validation(400)，认证失败用 Unauthorized(401)（v1.0.21）

- **上传大小硬编码不一致** — 视频上传 3 处硬编码（500/600/650MB），附件上传完全无大小限制（内容服务 + Gateway）。修复: 新建 `platform_settings` 表 + Admin API 可配置 + 视频/内容服务动态 DB 读取 + Gateway 环境变量可配 + 内容服务 DefaultBodyLimit + 大小检查。⚠️ 修改平台设置后需重启 polis-video 和 polis-gateway 服务（v1.0.24）

- **测试数据污染** — 95 个用户中有 66 个 E2E 测试账号（`tester_*`），139 个空间中有 89 个测试空间（`E2E Test Space*`），登录页显示测试账号提示。修复: 按 FK 依赖顺序清理所有测试数据 + 移除登录页测试提示。⚠️ 67 个 FK 引用约束，删除需按正确顺序进行（v1.0.24）

## 部署前预防清单

> 每次部署前过一遍，防止已知 Bug 回归。详见 [docs/bugs/INDEX.md](bugs/INDEX.md)

- [ ] **URL 编码**: 含中文参数的页面，Network 中 API 请求 URL 不含 `%25`
- [ ] **xattr 污染**: 服务器 `find /opt/polis-web/.next -name '._*'` 数量为 0
- [ ] **前端防空**: `grep -rn "\.map(" web/src/ | grep -v "?\."` 无新增非防空调用
- [ ] **依赖版本**: `npm list cherry-markdown` 与 `package.json` 锁定版本一致
- [ ] **构建通过**: `npm run build` 无报错
- [ ] **JWT 安全**: `grep -rn "Validation::default()" crates/` 无结果
- [ ] **SQL 安全**: `grep -rn 'format!("' crates/*/src/repo.rs | grep -i "select\|update\|delete\|insert"' 无结果
- [ ] **Nginx 版本泄露**: `curl -sI https://www.mzgw.com | grep server:` 不显示版本号
- [ ] **Nginx 废弃头**: 服务器 nginx 配置不含 `X-XSS-Protection`
- [ ] **Gateway 路由同步**: 新增 API 路径前缀时，检查 `crates/polis-gateway/src/main.rs` 是否已有对应路由
- [ ] **JWT atob 解码**: `grep -rn "atob(" web/src/ --include="*.tsx" --include="*.ts" | grep -v "replace.*-.*g.*replace.*_"` 检查 atob() 前有 URL-safe base64 转换

- **Gateway 路由遗漏导致新 API 404** — v1.0.22 新增 `/api/user/ban-status` 和 `/api/user/appeal` 端点后，Gateway 未配置 `/api/user/` 路由导致通过域名访问返回 404。修复: 在 Gateway 路由表添加 `.route("/api/user/{*path}", any(proxy_to_user))`。教训: 新增 API 端点时同步检查 Gateway 路由表（v1.0.22）

- **登录页申诉链接触发条件不完整** — v1.0.22 申诉链接仅在错误信息包含"封禁"/"冻结"时显示，但自定义封禁原因可能不含这些关键词。修复: 增加 `Forbidden:` 前缀检测（AppError::Forbidden 的 display 格式为 "Forbidden: {reason}"）。教训: 错误匹配用结构性前缀而非语义关键词（v1.0.23）

- **未认证用户无法被封禁** — v1.0.22 管理后台用户页仅对已认证用户显示封禁按钮。修复: 封禁按钮对所有未封禁用户显示，认证按钮仅对未认证用户显示（两个按钮独立判断）（v1.0.22）

- **封禁原因硬编码** — v1.0.22 封禁操作始终使用 "违规操作" 作为原因。修复: 确认对话框中添加封禁原因输入框（v1.0.22）

- **视频无法播放 — HLS 文件全部丢失 (2026-05-27 发现)** — 服务器 `data/hls/` 和 `data/videos/` 目录为空，所有历史视频的原始文件和 HLS 分段文件均已丢失。API 返回正常（数据库记录完整），但磁盘文件不存在。视频上传功能正常（新上传可用），但历史视频无法恢复。根因: 服务器 `data/` 目录在部署/重启过程中被清空重建。**待修复**: 暂无恢复方案，需建立数据备份机制。教训: `data/` 目录需独立于部署流程持久化，部署脚本不得触碰该目录。**建议**: 新增部署预防清单项 — 部署前备份 `data/` 目录。（2026-05-27）

- **管理页"管理"按钮无反应 — atob URL-safe base64 解码失败** — JWT token 使用 base64url 编码（含 `-` 和 `_`），`ManagePageClient.tsx` 中 isOwner 校验调用了 `JSON.parse(atob(token.split('.')[1]))`，但 JavaScript 的 `atob()` 不支持 base64url，解码失败抛异常被 catch 捕获后重定向回社区页，表现为按钮无反应。修复: atob() 前添加 `.replace(/-/g, '+').replace(/_/g, '/')` 将 base64url 转为标准 base64。同时修复 `PostPageClient.tsx` 中 `getCurrentUserId()` 的同名问题。教训: 所有调用 atob() 解码 JWT payload 的位置必须先行转换 base64url→standard base64（v1.0.29）

- **polisctl/adminctl 硬编码密码 (v1.0.25 已修复)** — polisctl admin login 硬编码 `admin123` 密码，adminctl.sh 硬编码空密码，导致管理员无法通过 CLI 工具登录。修复: polisctl 新增 `--password` 参数，adminctl.sh 改为读取 `POLIS_ADMIN_PASSWORD` 环境变量（必须）。教训: 不得在工具代码中硬编码凭据。（2026-05-27）

- **管理员密码丢失 (2026-05-27 发现及修复)** — 管理后台 seed 时创建的管理员 `admin@polis.app` 密码不明确（非 `admin123`，非空），导致无法登录。通过直接更新 PostgreSQL 中 password_hash 重置。教训: seed 数据中的密码应记录在安全位置，或提供初始密码重置机制。（2026-05-27）

- **模块管理 POST 端点 "Space not found" (2026-05-28)** — 新增 `/api/spaces/{ns}/modules` POST/PUT 端点后，`handle_auth_path` 的 `actions` 数组遗漏 `/modules` 后缀，导致 namespace 提取失败。修复: actions 数组追加 "/modules"。教训: 所有通过 handle_auth_path 处理的新端点必须同步更新 actions 数组。已建立 [Pattern](bugs/patterns/actions-array-missing.md) + [修复配方](bugs/fix-recipes/actions-array-missing.md)（v1.0.32）

- **模块管理 DELETE 返回 404 (2026-05-28)** — 路由配置 `.delete(delete_space)` 将 `/api/spaces/{*path}` 的所有 DELETE 请求路由到 `delete_space` 函数，而非 `handle_auth_path`。修复: 改为 `.delete(handle_auth_path)`，space 归档逻辑移入 handle_auth_path 内部（v1.0.32）

- **Gateway 模块接口路由误判 (2026-05-28)** — `proxy_space_router` 的 `is_content` 条件包含 `remaining.contains("/modules")`，导致 `/api/spaces/{ns}/modules` 被转发到内容服务而非空间服务。修复: 移除 modules 条件（v1.0.31）

- **编译目标错误导致修复无效 (2026-05-28)** — `cargo build --release` 默认编译 macOS (aarch64-apple-darwin) 二进制，Linux 服务器二进制从未更新，导致 `actions` 数组修复看似完成但实际未部署。修复: 改用 `--target x86_64-unknown-linux-gnu`。教训: 每次编译时显式指定 Linux target，打包前验证 ELF 格式。已建立 [Pattern](bugs/patterns/wrong-build-target.md) + [修复配方](bugs/fix-recipes/wrong-build-target.md)（v1.0.32）

- **前端旧代码残留 (2026-05-28)** — v1.0.30 打包时 SpaceSettings.tsx 新版代码未被打入（可能与 tar 排序或缓存有关），服务器仍运行旧版硬编码模块列表。修复: 重新 `next build` + 打包部署。教训: 部署后验证前端功能实际生效（v1.0.32）
