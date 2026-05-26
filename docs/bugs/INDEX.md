# Bug 追踪索引

> 每次修复 Bug 后，按 [Bug 修复流程](../../CLAUDE.md#bug-修复流程) 更新本索引。

## 统计面板

| 指标 | 数值 |
|------|------|
| 总修复数 | 21 |
| 已归类 Pattern | 3 |
| 总复发次数 | 5（URL编码 ×3 + xattr ×2 + Array.map ×1） |
| 复发率 | 23.8%（5/21） |
| 最近更新 | 2026-05-26 |

## 快速定位表

| 症状关键词 | 对应 Pattern | 快速诊断 |
|------------|-------------|----------|
| 中文 404 / `%25` 在 URL / 用户不存在 | [url-double-encoding](patterns/url-double-encoding.md) | 看 Network 请求 URL |
| 部署后 UI 错乱 / `._*` 文件 / CSS 不一致 | [xattr-contamination](patterns/xattr-contamination.md) | `md5sum` 对比 CSS |
| 页面白屏 / `x.map is not a function` / `undefined is not iterable` | [array-map-null](patterns/array-map-null.md) | 搜索 `.map(` 无 `?.` |

## Pattern 列表

| Pattern | 复发次数 | 最近复发 | 严重程度 | 文件 |
|---------|----------|----------|----------|------|
| URL 双重编码 | 3 | v1.0.11 (2026-05-26) | 🔴 高 | [url-double-encoding.md](patterns/url-double-encoding.md) |
| macOS xattr 部署污染 | 2 | v0.3.95 | 🔴 高 | [xattr-contamination.md](patterns/xattr-contamination.md) |
| .map() 防空防御 | 多次 | v1.0.8 (2026-05-25) | 🟡 中 | [array-map-null.md](patterns/array-map-null.md) |

## 时间线

按年归档：
- [2026 年修复记录](timeline/2026.md)
