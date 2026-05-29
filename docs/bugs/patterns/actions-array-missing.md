# Pattern: Actions 数组遗漏

## 分类

代码层 — 路由注册不同步

## 症状

- 新增的 `POST /api/spaces/{ns}/xxx` 端点返回 404（"Space not found"）
- 直连后端服务正常，但通过 Gateway 返回"Space not found"
- 只在 `handle_auth_path` 中处理的端点出现此问题

## 根因

`space_routes.rs` 的 `handle_auth_path` 函数使用 `actions` 数组做 namespace 提取：

```rust
let actions = [
    "/join", "/leave", "/posts",
    "/members/ban", ...
];
```

对于路径 `/api/spaces/{encoded-ns}/modules`，函数遍历 `actions` 数组，用 `strip_suffix` 剥离已知后缀来提取 namespace。如果新端点不在 `actions` 中，`ns` 会保留为 `encoded-ns/modules`，导致 `decode_namespace` 解析出带 `/modules` 的错误 namespace → "Space not found"。

## 脆弱文件

- `crates/polis-space/src/routes/space_routes.rs` — `handle_auth_path` 函数中的 `actions` 数组（约第 185-205 行）

## S.U.P.E.R 违反

- **S (Single Purpose)**: 违反 — 路由注册分散在 route 定义和 actions 数组中，双重维护，单一职责不清
- **U (Unidirectional Flow)**: 不适用
- **P (Ports over Implementation)**: 违反 — actions 是硬编码数组而非从路由表自动派生
- **E (Environment-Agnostic)**: 不适用
- **R (Replaceable Parts)**: 违反 — 新增端点需修改两处（路由定义 + actions 数组），未封装

## 预防方案

1. **短期** — 预防清单已添加检查项
2. **长期** — 重构 `handle_auth_path`，从路由定义自动提取 known suffixes，消除 actions 数组的手动维护

## 已修复点位

| 日期 | 版本 | 端点 | 修复内容 |
|------|------|------|----------|
| 2026-05-28 | v1.0.32 | `/api/spaces/{ns}/modules` POST | actions 数组追加 "/modules" |

## 复发次数

1

## 严重程度

🔴 高 — 所有通过 `handle_auth_path` 处理的新增 POST/PUT/DELETE 端点都可能受影响
