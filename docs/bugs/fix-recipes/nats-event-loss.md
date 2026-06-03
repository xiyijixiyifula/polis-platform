# 修复配方: NATS 事件丢失

**耗时**: 15 分钟  
**复发时**: 复制粘贴 fix 即可，无需重新诊断

## 快速诊断

```bash
# 1. 确认 NATS 是否运行
ssh root@47.253.123.3 "ps aux | grep nats-server"

# 2. 确认服务日志中的警告
ssh root@47.253.123.3 "journalctl -u polis-user --no-pager -n 50 | grep -i nats"
```

## 如果 NATS 未部署 → 临时修复

在 `publish_event()` 调用后追加直接 DB INSERT：

```rust
// 模式: 复制 publish_event 调用的 payload，转为直接 DB 写入
if followee_type == "user" {
    // NATS 事件（部署后生效）
    let _ = self.publish_event(subjects::USER_FOLLOWED, serde_json::json!({
        "follower_id": follower_id.to_string(),
        "followed_id": followee_id.to_string(),
    })).await;

    // 直接 DB fallback（NATS 缺失时仍生效）
    let follower_name = sqlx::query_scalar::<_, String>(
        "SELECT display_name FROM users WHERE id = $1"
    ).bind(follower_id).fetch_optional(&self.repo.pool).await
        .ok().flatten().unwrap_or_else(|| "有人".to_string());

    let content = format!("{} 关注了你", follower_name);
    let _ = sqlx::query(
        "INSERT INTO notifications (user_id, type, actor_id, target_type, target_id, content) VALUES ($1, $2, $3, $4, $5, $6)"
    ).bind(followee_id).bind("follow").bind(follower_id)
     .bind("user").bind(follower_id).bind(&content)
    .execute(&self.repo.pool).await;
}
```

## 如果决定部署 NATS → 永久修复

```bash
# 服务器上安装并启动 NATS
curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@main | sh
nats-server -js -sd /root/polis/data/nats &

# 更新 .env 中 NATS_URL=nats://localhost:4222
# 更新 systemd 添加 After=nats-server.service
```

## 验证

```bash
# 直接查数据库确认通知写入
ssh root@47.253.123.3 "PGPASSWORD='...' psql -U polis -d polis -c \
  \"SELECT type, COUNT(*) FROM notifications GROUP BY type ORDER BY 2 DESC;\""
```
