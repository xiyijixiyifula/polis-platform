# Bug 追踪索引

> 每次修复 Bug 后，按 [Bug 修复流程](../../CLAUDE.md#bug-修复流程) 更新本索引。

## 统计面板

| 指标 | 数值 |
|------|------|
| 总修复数 | 28 |
| 已归类 Pattern | 4 |
| 回归链数 | 3 |
| 总复发次数 | 5（URL编码 ×3 + xattr ×2 + Array.map ×1） |
| 复发率 | 17.9%（5/28） |
| 修复配方数 | 4 |
| 最近更新 | 2026-05-26 |

## 快速定位表

| 症状关键词 | 对应 Pattern | 修复配方 | 快速诊断 |
|------------|-------------|----------|----------|
| 中文 404 / `%25` 在 URL / 用户不存在 | [url-double-encoding](patterns/url-double-encoding.md) | [配方](fix-recipes/url-double-encoding.md) | 看 Network 请求 URL |
| 部署后 UI 错乱 / `._*` 文件 / CSS 不一致 | [xattr-contamination](patterns/xattr-contamination.md) | [配方](fix-recipes/xattr-contamination.md) | `md5sum` 对比 CSS |
| 页面白屏 / `x.map is not a function` | [array-map-null](patterns/array-map-null.md) | [配方](fix-recipes/array-map-null.md) | 搜索 `.map(` 无 `?.` |
| npm 包升级后编辑器/组件报错 | [dependency-auto-upgrade](patterns/dependency-auto-upgrade.md) | [配方](fix-recipes/dependency-auto-upgrade.md) | `npm list <pkg>` 看版本 |

## Pattern 列表

| Pattern | 复发次数 | 最近复发 | 严重程度 | 文件 |
|---------|----------|----------|----------|------|
| URL 双重编码 | 3 | v1.0.11 (2026-05-26) | 🔴 高 | [url-double-encoding.md](patterns/url-double-encoding.md) |
| macOS xattr 部署污染 | 2 | v0.3.95 | 🔴 高 | [xattr-contamination.md](patterns/xattr-contamination.md) |
| .map() 防空防御 | 多次 | v1.0.8 (2026-05-25) | 🟡 中 | [array-map-null.md](patterns/array-map-null.md) |
| 依赖自动升级 | 0 | v1.0.12 (2026-05-26) | 🔴 高 | [dependency-auto-upgrade.md](patterns/dependency-auto-upgrade.md) |

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
