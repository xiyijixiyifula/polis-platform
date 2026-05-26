# 修复配方: post_count 不同步

## 症状

- 社区页面显示的帖子数量与实际内容不符
- 数据分析页面计数为 0 或偏低
- 通过创作中心/对话流发布的作品在社区中看不到计数变化

## 一键诊断

```bash
# 在服务器上运行，检查数据不一致
psql "$DATABASE_URL" -c "
SELECT s.namespace, s.post_count as cached, COUNT(p.id) as actual,
       COUNT(p.id) - s.post_count as diff
FROM spaces s
LEFT JOIN posts p ON p.space_id = s.id AND p.deleted_at IS NULL
WHERE s.status = 'active'
GROUP BY s.id, s.namespace, s.post_count
HAVING s.post_count != COUNT(p.id);
"
```

## 标准修复

在 **每一个** 执行 `INSERT INTO posts` 的代码路径中，紧跟着添加：

```rust
// 更新社区帖子计数
sqlx::query("UPDATE spaces SET post_count = post_count + 1 WHERE id = $1")
    .bind(space_id)
    .execute(&self.pool)
    .await
    .ok(); // 非关键路径，失败不阻塞主流程
```

关键位置（务必全部覆盖）：
1. `crates/polis-content/src/handlers/content_handler.rs` — `create_post` 方法中 `INSERT INTO posts` 之后
2. `crates/polis-content/src/handlers/creation.rs` — `submit_to_community` 方法中 `INSERT INTO posts` 之后
3. `crates/polis-content/src/handlers/thread_handler.rs` — `publish` 方法中 `INSERT INTO posts` 之后

## 验证方法

1. 部署后，通过创作中心向社区投稿一篇
2. 检查社区首页帖子计数是否 +1
3. 通过对话流发布一篇到社区
4. 检查社区首页帖子计数是否再次 +1
5. 直接发帖，确认也正常计数

## 相关回归

- 修复时注意：不要重复计数（确保 SQL 有 `WHERE NOT EXISTS` 防守）
- 删除帖子时 `post_count - 1` 的逻辑是否正常
