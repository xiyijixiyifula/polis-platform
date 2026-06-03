---
name: 用户搜索不支持 ID 查找
description: 按用户名搜索 API 不支持 UUID 精确匹配，导致消息页显示截断 UUID 而非用户名
severity: 🟡 中
keywords:
  - 用户名显示UUID
  - 消息页显示ID
  - 未知用户
  - 截断
  - userId
recipe: ../fix-recipes/user-search-no-id-match.md
diagnosis_cmd: grep -rn "search_users" crates/polis-user/ --include="*.rs"
first_found: v1.0.62 (2026-06-02)
recurrence_count: 0
status: 🟠 Stage 2 (配方化)
---

# Pattern: 用户搜索不支持按 ID 查找

> **分类**: API 设计缺陷
> **首次发现**: v1.0.62
> **严重度**: 中（影响消息页面用户名显示）

## 症状

- 消息页面 URL 为 `/messages/<userId>` 格式（如 `/messages/f4ed3378-a562-4be6-8447-495e474745bc`）
- 页面顶部显示截断 UUID（如 "f4ed3378"）而非真实用户名（如 "testuser"）
- 点击用户名链接跳转到 `/profile/<uuid>` 而非 `/profile/<username>`（返回 404 或空页面）

## 根因

后端用户搜索 API `GET /api/users/search?q=<query>` 的 SQL 只匹配 `username` 和 `display_name`：
```sql
SELECT * FROM users WHERE username ILIKE $1 OR display_name ILIKE $1
```
不支持按 `id` 字段搜索。当前端无法从会话列表中查到用户时，fallback 到搜索 API，传 UUID 查询返回空，走到兜底 `userId.substring(0, 8)`。

## 修复配方

### 后端（推荐）
在 `crates/polis-user/src/repo.rs` `search_users()` 中增加精确 ID 匹配：
```sql
SELECT * FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 OR id::text = $2 ORDER BY created_at DESC LIMIT $3
```

### 前端兜底
将 fallback 从 `userId.substring(0, 8)` 改为 `'未知用户'`，避免显示无意义 UUID 片段。

## 已修复点位

| 文件 | 行号 | 修复内容 | 版本 |
|------|------|----------|------|
| `crates/polis-user/src/repo.rs` | 108 | SQL 增加 `OR id::text = $2` | v1.0.62 |
| `web/src/app/messages/[userId]/page.tsx` | 77, 80 | fallback → '未知用户' | v1.0.62 |

## 预防措施

- 所有搜索类 API 在设计时应考虑是否支持多种标识符（ID / username / email）
- 前端 fallback 值应使用人类可读的文本而非程序标识符
