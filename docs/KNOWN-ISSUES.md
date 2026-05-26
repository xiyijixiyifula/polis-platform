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
