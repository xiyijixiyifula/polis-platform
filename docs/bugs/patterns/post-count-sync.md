---
symptoms: [帖子计数不对, 统计为0, 分析数据不准, post_count]
keywords: [帖子计数, 不对, 为0, 不更新, post_count, INSERT INTO posts, 不同步, 计数]
severity: high
recipe: docs/bugs/fix-recipes/post-count-sync.md
fix_time: 10min
diagnosis_cmd: grep -rn "INSERT INTO posts" crates/ | grep -v migration
---

# Pattern: post_count 不同步

> **类型**: 数据一致性问题  
> **首次发现**: v1.0.14 (2026-05-26)  
> **严重程度**: 🔴 高 — 导致用户看到的数据与实际内容不匹配

## 根因

`spaces.post_count` 缓存了社区的帖子计数，但该字段仅在**部分**创建 posts 的代码路径中更新。当有多个代码路径可以 INSERT 到 `posts` 表时，容易遗漏 `UPDATE spaces SET post_count = post_count + 1`。

## 爆发条件

1. 系统存在多个创建 posts 行的代码路径
2. 新增代码路径时，开发者不知道需要同步更新 `post_count`
3. 没有数据库触发器或应用层抽象来保证一致性

## 受影响路径（3 条，已全部修复）

| 路径 | 位置 | 状态 |
|------|------|------|
| 直接发帖 `content_handler::create_post` | `crates/polis-content/src/handlers/content_handler.rs:74` | ✅ 已有 |
| 创作中心投稿 `creation::submit_to_community` | `crates/polis-content/src/handlers/creation.rs` | ✅ v1.0.14 修复 |
| 对话流发布 `thread_handler::publish` | `crates/polis-content/src/handlers/thread_handler.rs` | ✅ v1.0.14 修复 |

## 预防措施

- 新增任何 `INSERT INTO posts` 代码时，必须同时添加 `UPDATE spaces SET post_count = post_count + 1`
- 部署后验证：在社区发帖 + 创作中心投稿 + 对话流发布，检查三个路径的 post_count 是否各自 +1
- 考虑未来用数据库触发器替代手动 UPDATE（尚未实施）

## 已修复点位

| 日期 | 位置 | 修复内容 | 修复人 |
|------|------|----------|--------|
| 2026-05-26 | `creation.rs` submit_to_community | INSERT INTO posts 后追加 post_count +1 | @xiyijixiyifula |
| 2026-05-26 | `thread_handler.rs` publish | INSERT INTO posts 后追加 post_count +1 | @xiyijixiyifula |

## 诊断命令

```sql
-- 检查 post_count 与实际 posts 数量是否一致
SELECT s.namespace, s.post_count, COUNT(p.id) as actual
FROM spaces s
LEFT JOIN posts p ON p.space_id = s.id AND p.deleted_at IS NULL
WHERE s.status = 'active'
GROUP BY s.id, s.namespace, s.post_count
HAVING s.post_count != COUNT(p.id);
```
