# URL 双重编码 Bug

## 元信息

- **首次出现**: v0.2.54 (2026-05-22 以前)
- **复发次数**: 3 次
- **最近一次**: v1.0.11 (2026-05-26)
- **严重程度**: 🔴 高 — 导致中文路由 404，功能完全不可用
- **影响范围**: 所有包含中文参数的 URL（社区 slug、用户名、帖子标题等）

## 根因

Next.js App Router 的 `params`（服务端组件）或 `useParams()`（客户端组件）返回的值**可能保留 URL 编码形态**（特别是中文等非 ASCII 字符）。直接对这类值调用 `encodeURIComponent` 会导致：

```
原始中文: 原来这是一个大西瓜
params 值: %E5%8E%9F%E6%9D%A5... (已编码但未解码)
encodeURIComponent 后: %25E5%258E%259F%... (双重编码！% → %25)
服务器解码后得到: %E5%8E%9F... (字面量，不是中文)
结果: 404 用户不存在 / 404 社区不存在
```

## 典型症状

- 浏览器中访问中文用户主页/社区页面正常加载，但内部 API 请求返回 404
- Network 面板中请求 URL 包含 `%25` 前缀（如 `%25E5%258E%259F`）
- 服务器返回 `"用户不存在"` / `"社区不存在"`
- 仅影响客户端组件中通过 `params` 取值后调用 API 的场景
- **纯英文参数不受影响**（英文不涉及百分号编码）

## 标准修复

```typescript
// ✅ 安全解码模式 — 每次从 URL params 取值后调用 API 前使用
const safeValue = (() => {
  try { return decodeURIComponent(value); } catch { return value; }
})();
const encoded = encodeURIComponent(safeValue);

// 完整示例：
const safeUsername = (() => {
  try { return decodeURIComponent(username); } catch { return username; }
})();
const res = await fetch(
  `/api/creations?creator_username=${encodeURIComponent(safeUsername)}&page_size=50`
);
```

## 已修复点位

| 版本 | 服务 | 文件 | 函数/位置 | 日期 |
|------|------|------|-----------|------|
| v0.2.54 | 后端 | `polis-space` | `handle_public_path` — `decode_namespace()` | ~2026-05-22 前 |
| v0.2.57 | 后端 | `polis-content` | `parse_content_path` — `percent_decode_str()` | ~2026-05-22 前 |
| v0.2.57 | 前端 | `SpacePageClient.tsx` | namespace 参数 — `decodeURIComponent()` | ~2026-05-22 |
| v1.0.11 | 前端 | `ProfilePageClient.tsx` | useEffect 作品加载 — `decodeURIComponent()` | 2026-05-26 |

## 风险点位（需持续关注）

任何从 URL 参数取值后又用 `encodeURIComponent` 编码后调用 API 的地方。

诊断搜索：
```bash
grep -rn "encodeURIComponent(" web/src/ | grep -v "decodeURIComponent"
```

排除已知安全的模式（已包裹 decodeURIComponent）后，剩余的都是潜在风险。

## 预防措施

1. 所有 `/app/[...slug]/` 下的页面组件，`params` 值在调用 API 前一律先 `decodeURIComponent` 再 `encodeURIComponent`
2. Code review 时对包含 `encodeURIComponent` 的代码必须确认参数来源是否已经过解码
3. E2E 测试覆盖中文参数路径
