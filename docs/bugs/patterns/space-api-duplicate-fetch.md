# Pattern: 空间页面 API 双重调用

## 现象

空间页面作品索引加载极慢（>4 秒），API 调用次数远多于预期（~20 次而非 ~5 次）。每个 API 被调用了两次。

## 根因

React `useEffect` 的依赖数组包含了**异步变化的 state 变量**（如 `spaceModules`）。该变量在初始渲染时为空数组 `[]`，异步加载完成后更新为实际值，触发 effect 重新执行。导致所有 API 在极短时间内被调用两遍。

```tsx
// ❌ 错误 — spaceModules 异步变化会引起二重调用
}, [cleanNamespace, spaceModules, postSort, postPage, showHiddenPosts]);

// ✅ 正确 — 移除异步变化量，改用 ref 读取
}, [cleanNamespace, postSort, postPage, showHiddenPosts]);
```

## 诊断方法

1. 打开 Chrome DevTools → Network 面板
2. 刷新页面，观察 API 调用量
3. 如果同一 URL 出现 2 次以上 → 检查对应 useEffect 的依赖数组

## 修复

1. **移除异步变化的 state 依赖** — 使用 `useRef` 代替
2. **添加并发防护** — `fetchingRef` 防止 parallel effect 执行
3. **服务端合并批量接口** — 当多个数据必然同时需要时，用一个 API 返回

## 已修复点位

| 日期 | 文件 | 修复内容 |
|------|------|---------|
| 2026-06-16 | `web/src/app/space/[...namespace]/hooks/useSpaceData.ts:262-305` | 移除 spaceModules 依赖，添加 fetchingRef 防护 |

## 回归风险

- ⚠️ moduleKeySet 移除依赖后，模块切换时不会自动重新筛选帖子。需要确保 `spaceModules` 变化时通过其他路径（如 `activeTab`）触发数据刷新。
- ⚠️ 所有包含异步加载 state 的 useEffect 都应检查是否有类似问题。
