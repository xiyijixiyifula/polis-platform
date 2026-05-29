# Bug 追踪索引

> 每次修复 Bug 后，按 [Bug 修复流程](../../CLAUDE.md#bug-修复流程) 更新本索引。

## 统计面板

| 指标 | 数值 |
|------|------|
| 总修复数 | 75 |
| 已归类 Pattern | 12 |
| 回归链数 | 8 |
| 总复发次数 | 7（URL编码 ×3 + xattr ×2 + Array.map ×1 + Gateway路由 ×1 + 部署流程 ×1） |
| 复发率 | 9.7%（7/72） |
| 修复配方数 | 12 |
| 修复点位地图 | [fix-points.md](fix-points.md) |
| 最近更新 | 2026-05-29 (v1.0.36) |

## 趋势面板

> 运行 `./scripts/gen-stats.sh` 获取最新动态统计。

### 月度 Bug 产生率

| 月份 | 新增 Bug | 修复 | 复发 | 复发率 |
|------|---------|------|------|--------|
| 2026-05 | 35 | 73 | 7 | 9.7% |

### 脆弱文件 Top-10（修复次数降序）

> 修改这些文件时务必查询 [修复影响矩阵](regression-map.md#修复影响矩阵-fix-impact-matrix)。

| 排名 | 文件 | 修复次数 | 主要风险 | 风险等级 |
|------|------|----------|----------|----------|
| 1 | `SpacePageClient.tsx` | 9 | RTE-MAP, RTE-NULL | 🔴 |
| 2 | `space_routes.rs` | 7 | RTE-REG, RTE-ENC | 🔴 |
| 3 | `content_handler.rs` | 5 | SQL注入, post_count, XSS | 🔴 |
| 4 | `SpaceSettings.tsx` | 4 | RTE-NULL, RTE-ENC | 🟡 |
| 5 | `content_routes.rs` | 4 | RTE-ENC, SEC-AUTH | 🟡 |
| 6 | `main.rs` (gateway) | 4 | RTE-REG, DEP-FLOW | 🔴 |
| 7 | `api.ts` | 4 | DEP-VER | 🟡 |
| 8 | `repo.rs` (space) | 3 | post_count, star | 🟡 |
| 9 | `ManagePageClient.tsx` | 2 | RTE-ENC, UI-FORM | 🟡 |
| 10 | `create/page.tsx` | 2 | RTE-ENC | 🟡 |

### Pattern 频率分布

```
array-map-null         ████████████████████████████ 15+
deploy-flow            ██████████████ 7
url-double-encoding    ████████████ 6
post-count-sync        ██████ 3
xattr-contamination    ████ 2
atob-base64url         ████ 2
gateway-route-missing  ████ 2
actions-array-missing  ████ 2
missing-form-field     ██ 1
wrong-build-target     ██ 1
dependency-auto-upgrade ██ 1
module-tab-key-mismatch ██ 1
```

### 修复有效性追踪

| 修复版本 | Pattern | 是否复发 | 失效天数 | 根除方案 |
|----------|---------|----------|----------|----------|
| v1.0.8 | array-map-null | 是 (v1.0.35) | 27天 | ESLint 规则 |
| v0.3.91 | xattr-contamination | 是 (v0.3.95) | 4天 | CLAUDE.md 部署铁律 |
| v0.2.54 | url-double-encoding | 是 (v1.0.11) | 多天 | 统一编解码工具函数 |
| v1.0.14 | post-count-sync | 否 | — | 修复配方 + 预防清单 |
| v1.0.26 | atob-base64url | 否 | — | 统一 JWT 解码工具 |
| v1.0.30 | module-tab-key-mismatch | 否 | — | 统一键空间映射 |

## 快速定位表

| 症状关键词 | 对应 Pattern | 修复配方 | 快速诊断 |
|------------|-------------|----------|----------|
| 中文 404 / `%25` 在 URL / 用户不存在 | [url-double-encoding](patterns/url-double-encoding.md) | [配方](fix-recipes/url-double-encoding.md) | 看 Network 请求 URL |
| 部署后 UI 错乱 / `._*` 文件 / CSS 不一致 | [xattr-contamination](patterns/xattr-contamination.md) | [配方](fix-recipes/xattr-contamination.md) | `md5sum` 对比 CSS |
| 页面白屏 / `x.map is not a function` | [array-map-null](patterns/array-map-null.md) | [配方](fix-recipes/array-map-null.md) | 搜索 `.map(` 无 `?.` |
| npm 包升级后编辑器/组件报错 | [dependency-auto-upgrade](patterns/dependency-auto-upgrade.md) | [配方](fix-recipes/dependency-auto-upgrade.md) | `npm list <pkg>` 看版本 |
| 社区帖子计数不对 / 分析为 0 / 创作中心发帖不计 | [post-count-sync](patterns/post-count-sync.md) | [配方](fix-recipes/post-count-sync.md) | SQL: `SELECT post_count vs COUNT(posts)` |
| 表单提交失败 / 认证失败 / 字段缺失 | [missing-form-field](patterns/missing-form-field.md) | [配方](fix-recipes/missing-form-field.md) | 对比 useState key 与 JSX input |
| 新增 API 端点 404 / Gateway 透传异常 | [gateway-route-missing](patterns/gateway-route-missing.md) | [配方](fix-recipes/gateway-route-missing.md) | 检查 Gateway 路由表是否覆盖新路径前缀 |
| 部署后功能不生效 / systemd 服务路径与实际部署不一致 | [deploy-path-mismatch](patterns/deploy-path-mismatch.md) | [配方](fix-recipes/deploy-path-mismatch.md) | `systemctl cat <svc> \| grep ExecStart` |
| 点击按钮无反应 / 页面重定向 / atob 报 InvalidCharacterError | [atob-base64url](patterns/atob-base64url.md) | [配方](fix-recipes/atob-base64url.md) | console 中 `atob(token.split('.')[1])` 是否报错 |
| 新增 API 端点返回 "Space not found" / 直连后端正常 | [actions-array-missing](patterns/actions-array-missing.md) | [配方](fix-recipes/actions-array-missing.md) | grep actions 数组是否包含新端点后缀 |
| 部署后功能无变化 / `file` 命令显示 Mach-O 非 ELF | [wrong-build-target](patterns/wrong-build-target.md) | [配方](fix-recipes/wrong-build-target.md) | `file` 检查二进制格式 |
| 社区模块Tab点击空白 / Tab选中无内容 | [module-tab-key-mismatch](patterns/module-tab-key-mismatch.md) | [配方](fix-recipes/module-tab-key-mismatch.md) | 对比 tab id 与渲染块条件 |

## Pattern 列表

| Pattern | 复发次数 | 最近复发 | 严重程度 | 文件 |
|---------|----------|----------|----------|------|
| URL 双重编码 | 3 | v1.0.11 (2026-05-26) | 🔴 高 | [url-double-encoding.md](patterns/url-double-encoding.md) |
| macOS xattr 部署污染 | 2 | v0.3.95 | 🔴 高 | [xattr-contamination.md](patterns/xattr-contamination.md) |
| .map() 防空防御 | 多次 | v1.0.8 (2026-05-25) | 🟡 中 | [array-map-null.md](patterns/array-map-null.md) |
| 依赖自动升级 | 0 | v1.0.12 (2026-05-26) | 🔴 高 | [dependency-auto-upgrade.md](patterns/dependency-auto-upgrade.md) |
| post_count 不同步 | 0 | v1.0.14 (2026-05-26) | 🔴 高 | [post-count-sync.md](patterns/post-count-sync.md) |
| 表单字段缺失 | 0 | v1.0.20 (2026-05-27) | 🟡 中 | [missing-form-field.md](patterns/missing-form-field.md) |
| Gateway 路由遗漏 | 0 | v1.0.22 (2026-05-27) | 🔴 高 | [gateway-route-missing.md](patterns/gateway-route-missing.md) |
| 部署路径不匹配 | 0 | v1.0.27 (2026-05-27) | 🟡 中 | [deploy-path-mismatch.md](patterns/deploy-path-mismatch.md) |
| atob URL-safe base64 解码失败 | 0 | v1.0.29 (2026-05-28) | 🟡 中 | [atob-base64url.md](patterns/atob-base64url.md) |
| Actions 数组遗漏 | 0 | v1.0.32 (2026-05-28) | 🔴 高 | [actions-array-missing.md](patterns/actions-array-missing.md) |
| 交叉编译目标错误 | 0 | v1.0.32 (2026-05-28) | 🔴 高 | [wrong-build-target.md](patterns/wrong-build-target.md) |
| 模块Tab键值不匹配 | 0 | v1.0.34 (2026-05-29) | 🔴 高 | [module-tab-key-mismatch.md](patterns/module-tab-key-mismatch.md) |

## 修复配方库

当 Bug 复发时，按症状查表 → 找到配方 → 复制粘贴修复。**不需要重新诊断。**

| 我看到什么？ | 配方 | 耗时 |
|-------------|------|------|
| 中文 404，URL 含 `%25` | [url-double-encoding](fix-recipes/url-double-encoding.md) | 5 分钟 |
| 部署后 UI 错乱 | [xattr-contamination](fix-recipes/xattr-contamination.md) | 10 分钟 |
| 页面白屏 `.map is not a function` | [array-map-null](fix-recipes/array-map-null.md) | 2 分钟/处 |
| npm 包升级后报错 | [dependency-auto-upgrade](fix-recipes/dependency-auto-upgrade.md) | 15 分钟 |
| 表单提交失败/认证失败 | [missing-form-field](fix-recipes/missing-form-field.md) | 2 分钟/处 |
| 新增 API 端点 404 | [gateway-route-missing](fix-recipes/gateway-route-missing.md) | 10 分钟 |
| 部署后功能不生效 | [deploy-path-mismatch](fix-recipes/deploy-path-mismatch.md) | 3 分钟 |
| 点击按钮无反应，atob 报 InvalidCharacterError | [atob-base64url](fix-recipes/atob-base64url.md) | 5 分钟 |
| 新增 API 端点返回 "Space not found" | [actions-array-missing](fix-recipes/actions-array-missing.md) | 5 分钟 |
| 部署后功能无变化，二进制格式不对 | [wrong-build-target](fix-recipes/wrong-build-target.md) | 3 分钟 |
| 社区模块Tab点击空白无内容 | [module-tab-key-mismatch](fix-recipes/module-tab-key-mismatch.md) | 5 分钟 |

→ [完整配方索引](fix-recipes/INDEX.md)

## 回归追踪

→ [回归追踪地图](regression-map.md) — 修复因果链 + 脆弱文件清单

## 时间线

按年归档：
- [2026 年修复记录](timeline/2026.md)

## 自动化预防

部署前运行：

```bash
./scripts/pre-deploy-check.sh        # 标准模式（警告不阻断）
./scripts/pre-deploy-check.sh --strict  # 严格模式（任何问题都阻断）
```

自动检查以下 12 类风险：xattr 污染 / .map() 防空 / JWT atob / actions 数组 / Gateway 路由 / post_count 同步 / JWT exp 校验 / SQL 注入 / 二进制格式 / 工作区状态 / Visibility 枚举 / 表单字段完整性。

---

## 预防清单（手动补充）

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
- [ ] 新建/重构表单：`useState` 初始化 key 数量 == JSX 中 `<input>` 数量（逐一绑定）
- [ ] 新增 API 端点：检查 Gateway 路由表 (`crates/polis-gateway/src/main.rs`) 是否覆盖新路径前缀
- [ ] 修改管理码后：确认 `admin_code.txt` 文件内容与脚本/文档中的默认值一致
- [ ] 部署后：检查 systemd ExecStart 路径 `for s in polis-gateway polis-space polis-user polis-content polis-video polis-admin; do echo "$s: $(systemctl cat $s 2>/dev/null | grep ExecStart)"; done`
- [ ] 部署前：`systemctl stop <service>` 再覆盖运行中的二进制（避免 Text file busy）
- [ ] 管理后台：登录后查看 /admin/settings 确认上传大小限制符合预期
- [ ] CLI 工具：`grep -rn "password.*admin\|admin123" polisctl.sh adminctl.sh crates/polisctl/` 检查硬编码凭据
- [ ] `grep -rn "atob(" web/src/ --include="*.tsx" --include="*.ts" | grep -v "replace.*-.*g.*replace.*_"` 检查 atob() 是否有 URL-safe base64 转换
- [ ] 新增 `handle_auth_path` 处理的端点：检查 `actions` 数组 (`grep -A 20 "let actions" crates/polis-space/src/routes/space_routes.rs`) 是否包含新端点后缀
- [ ] 部署前：`file target/x86_64-unknown-linux-gnu/release/polis-*` 确认所有二进制为 ELF 格式，非 Mach-O

## 回归热度图

> 记录因修 bug 导致老 bug 重新出现的情况。每次复发在此登记，用于分析脆弱模块。

| 回归事件 | 版本 | 修复内容 | 导致的回归 | Pattern | 根因层级 |
|----------|------|----------|-----------|---------|----------|
| #1 | v1.0.11 | 空间路由中文解码 | 前端 params 双重编码 → 用户不存在 | url-double-encoding | 架构层（缺乏统一编解码） |
| #2 | v0.3.95 | tar 打包 xattr | 部署后 UI 错乱 | xattr-contamination | 流程层（脚本未固化） |
| #3 | v1.0.14 | content_handler 发帖 | 新增两条 posts 路径 → post_count=0 | post-count-sync | 架构层（缺乏统一抽象） |
| #4 | v1.0.14 | 成员列表检查 | SpaceSettings members keyMap 缺失 | — | 代码层（映射表遗漏） |
| #5 | v1.0.20 | 管理后台登录页重写 | 密码 input 缺失 → 认证失败 | missing-form-field | 代码层（表单重构未逐字段对齐） |
| #6 | v1.0.22 | 新增申诉 API 端点 | Gateway 未配置路由 → API 返回 404 | gateway-route-missing | 流程层（新增路由未同步 Gateway） |
| #7 | v1.0.28 | 管理页 isOwner 校验使用 atob() | JWT base64url 编码 → atob 解码失败 → 管理和编辑页无法访问 | atob-base64url | 代码层（JWT 编码标准认知缺失） |
| #8 | v1.0.32 | 新增模块管理端点 (POST/PUT/DELETE /modules) | actions 数组遗漏 → "Space not found" + DELETE 映射错误 → 404 + 编译目标错误 → 修复未生效 | actions-array-missing / wrong-build-target | 流程层（部署 + 路由注册自动化缺失） |
| #9 | v1.0.34 | 动态模块Tab id 映射 | Tab id 用 module_key，渲染块匹配 route 名 → 内容区域空白 | module-tab-key-mismatch | 代码层（键空间不一致） |

## 根因层级分布

| 层级 | 次数 | 占比 | 说明 |
|------|------|------|------|
| 架构层（缺乏统一抽象） | 2 | 25% | URL编解码 / post_count同步 |
| 流程层（工具/部署） | 2 | 25% | macOS tar xattr / Gateway路由未同步 |
| 代码层（映射表/路由数组遗漏） | 5 | 50% | keyMap / actions_suffixes / 表单字段 / atob / module-tab-key |

> 架构层回归最难根除，需要专门的重构项目来处理。代码层回归可通过预防清单（grep 检查）减少。

## 最新架构漏洞标记

> 以下文件在最近的修复中被标记为需要架构层面改进：

| 文件 | 当前修复次数 | 建议架构改进 | 优先级 |
|------|-------------|-------------|--------|
| `space_routes.rs` | 5 | 统一路由注册宏（消除 actions_suffixes 手动维护） | 🟡 中 |
| `content_routes.rs` | 3 | 中间件统一权限门控（替代每次手写 block_private 调用） | 🟡 中 |
| `SpacePageClient.tsx` | 8 | 拆分为多个小组件（post/join/follow/edit 独立管理状态） | 🟢 低 |
| `types.rs` (Visibility) | 1 | DB 新增 visibility 值 → 同步更新 enum + Display + serde | 🟡 中 |
