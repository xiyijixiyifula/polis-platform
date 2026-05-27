# Bug 追踪索引

> 每次修复 Bug 后，按 [Bug 修复流程](../../CLAUDE.md#bug-修复流程) 更新本索引。

## 统计面板

| 指标 | 数值 |
|------|------|
| 总修复数 | 44 |
| 已归类 Pattern | 5 |
| 回归链数 | 4 |
| 总复发次数 | 5（URL编码 ×3 + xattr ×2 + Array.map ×1） |
| 复发率 | 11.4%（5/44） |
| 修复配方数 | 5 |
| 修复点位地图 | [fix-points.md](fix-points.md) |
| 最近更新 | 2026-05-27 |

## 快速定位表

| 症状关键词 | 对应 Pattern | 修复配方 | 快速诊断 |
|------------|-------------|----------|----------|
| 中文 404 / `%25` 在 URL / 用户不存在 | [url-double-encoding](patterns/url-double-encoding.md) | [配方](fix-recipes/url-double-encoding.md) | 看 Network 请求 URL |
| 部署后 UI 错乱 / `._*` 文件 / CSS 不一致 | [xattr-contamination](patterns/xattr-contamination.md) | [配方](fix-recipes/xattr-contamination.md) | `md5sum` 对比 CSS |
| 页面白屏 / `x.map is not a function` | [array-map-null](patterns/array-map-null.md) | [配方](fix-recipes/array-map-null.md) | 搜索 `.map(` 无 `?.` |
| npm 包升级后编辑器/组件报错 | [dependency-auto-upgrade](patterns/dependency-auto-upgrade.md) | [配方](fix-recipes/dependency-auto-upgrade.md) | `npm list <pkg>` 看版本 |
| 社区帖子计数不对 / 分析为 0 / 创作中心发帖不计 | [post-count-sync](patterns/post-count-sync.md) | [配方](fix-recipes/post-count-sync.md) | SQL: `SELECT post_count vs COUNT(posts)` |

## Pattern 列表

| Pattern | 复发次数 | 最近复发 | 严重程度 | 文件 |
|---------|----------|----------|----------|------|
| URL 双重编码 | 3 | v1.0.11 (2026-05-26) | 🔴 高 | [url-double-encoding.md](patterns/url-double-encoding.md) |
| macOS xattr 部署污染 | 2 | v0.3.95 | 🔴 高 | [xattr-contamination.md](patterns/xattr-contamination.md) |
| .map() 防空防御 | 多次 | v1.0.8 (2026-05-25) | 🟡 中 | [array-map-null.md](patterns/array-map-null.md) |
| 依赖自动升级 | 0 | v1.0.12 (2026-05-26) | 🔴 高 | [dependency-auto-upgrade.md](patterns/dependency-auto-upgrade.md) |
| post_count 不同步 | 0 | v1.0.14 (2026-05-26) | 🔴 高 | [post-count-sync.md](patterns/post-count-sync.md) |

## 修复配方库

当 Bug 复发时，按症状查表 → 找到配方 → 复制粘贴修复。**不需要重新诊断。**

| 我看到什么？ | 配方 | 耗时 |
|-------------|------|------|
| 中文 404，URL 含 `%25` | [url-double-encoding](fix-recipes/url-double-encoding.md) | 5 分钟 |
| 部署后 UI 错乱 | [xattr-contamination](fix-recipes/xattr-contamination.md) | 10 分钟 |
| 页面白屏 `.map is not a function` | [array-map-null](fix-recipes/array-map-null.md) | 2 分钟/处 |
| npm 包升级后报错 | [dependency-auto-upgrade](fix-recipes/dependency-auto-upgrade.md) | 15 分钟 |

→ [完整配方索引](fix-recipes/INDEX.md)

## 回归追踪

→ [回归追踪地图](regression-map.md) — 修复因果链 + 脆弱文件清单

## 时间线

按年归档：
- [2026 年修复记录](timeline/2026.md)

## 预防清单

部署前检查：

- [ ] 含中文参数的页面：Network 中 API 请求 URL 不含 `%25`
- [ ] 服务器 `find /opt/polis-web/.next -name '._*'` 数量为 0
- [ ] `grep -rn "\.map(" web/src/ --include="*.tsx" | grep -v "?\."` 无新结果
- [ ] `npm list` 所有关键依赖版本与 `package.json` 一致
- [ ] `npm run build` 通过
- [ ] `grep -rn "Validation::default()" crates/` 无结果（安全：JWT exp 校验）
- [ ] `grep -rn "format!(" crates/*/src/repo.rs` 无 SQL 拼接
- [ ] 服务器 `curl -sI https://www.mzgw.com | grep -i "server:"` 不显示版本号
- [ ] Nginx 配置无废弃 `X-XSS-Protection` 头
- [ ] 新增 INSERT INTO posts 路径：检查是否同步 `UPDATE spaces SET post_count = post_count + 1`
- [ ] 新增 API 端点：检查 title/name 等必填字段是否有非空验证 + 长度限制
- [ ] `grep -rn "INSERT INTO posts" crates/` 每个匹配点后是否有 post_count +1
- [ ] 私有空间 API：`handle_auth_content` 中每个 POST/PUT 操作前是否调用 `block_private_space_public_listing`
- [ ] 新增的枚举值/状态（如 joinStatus）是否在 `handle_auth_path` 的 actions_suffixes 数组中
- [ ] icon_url/banner_url 更新使用 CASE WHEN（空值即清除），非 COALESCE
- [ ] `grep -rn "title:\s*slug" web/src/app/create/` 检查创建社区 title 参数是否被错误 slug 化
- [ ] 新增 DB visibility 值时同步更新 `Visibility` 枚举（types.rs）+ `Display` impl
- [ ] `grep -rn "post\.visibility" crates/polis-content/` 检查是否使用 effective_visibility 而非原始 DB 值
- [ ] 审核系统：封禁用户后 `grep -rn "banned" crates/polis-user/` 确认登录路径有 banned 检查

## 回归热度图

> 记录因修 bug 导致老 bug 重新出现的情况。每次复发在此登记，用于分析脆弱模块。

| 回归事件 | 版本 | 修复内容 | 导致的回归 | Pattern | 根因层级 |
|----------|------|----------|-----------|---------|----------|
| #1 | v1.0.11 | 空间路由中文解码 | 前端 params 双重编码 → 用户不存在 | url-double-encoding | 架构层（缺乏统一编解码） |
| #2 | v0.3.95 | tar 打包 xattr | 部署后 UI 错乱 | xattr-contamination | 流程层（脚本未固化） |
| #3 | v1.0.14 | content_handler 发帖 | 新增两条 posts 路径 → post_count=0 | post-count-sync | 架构层（缺乏统一抽象） |
| #4 | v1.0.14 | 成员列表检查 | SpaceSettings members keyMap 缺失 | — | 代码层（映射表遗漏） |

## 根因层级分布

| 层级 | 次数 | 占比 | 说明 |
|------|------|------|------|
| 架构层（缺乏统一抽象） | 2 | 40% | URL编解码 / post_count同步 |
| 流程层（工具/部署） | 1 | 20% | macOS tar xattr |
| 代码层（映射表/路由数组遗漏） | 2 | 40% | keyMap / actions_suffixes |

> 架构层回归最难根除，需要专门的重构项目来处理。代码层回归可通过预防清单（grep 检查）减少。

## 最新架构漏洞标记

> 以下文件在最近的修复中被标记为需要架构层面改进：

| 文件 | 当前修复次数 | 建议架构改进 | 优先级 |
|------|-------------|-------------|--------|
| `space_routes.rs` | 5 | 统一路由注册宏（消除 actions_suffixes 手动维护） | 🟡 中 |
| `content_routes.rs` | 3 | 中间件统一权限门控（替代每次手写 block_private 调用） | 🟡 中 |
| `SpacePageClient.tsx` | 8 | 拆分为多个小组件（post/join/follow/edit 独立管理状态） | 🟢 低 |
| `types.rs` (Visibility) | 1 | DB 新增 visibility 值 → 同步更新 enum + Display + serde | 🟡 中 |
