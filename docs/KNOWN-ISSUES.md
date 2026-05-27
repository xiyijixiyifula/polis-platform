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

## 关键 Bug 修复记录

> 防止回退 — 以下 bug 曾经导致线上事故，修复后记录在此

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
