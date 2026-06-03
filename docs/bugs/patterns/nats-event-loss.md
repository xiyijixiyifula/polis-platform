---
name: NATS 事件丢失
description: NATS 消息代理未部署时，publish_event() 静默失败，跨服务事件通知全部丢失
severity: 🔴 高
keywords:
  - NATS
  - 通知不工作
  - 事件丢失
  - Connection refused
  - publish_event
  - 关注通知
  - 注册通知
recipe: ../fix-recipes/nats-event-loss.md
diagnosis_cmd: ssh root@47.253.123.3 "ps aux | grep nats"
first_found: v1.0.63 (2026-06-02)
recurrence_count: 0
status: 🟠 Stage 2 (配方化)
---

# NATS 事件丢失 (nats-event-loss)

## 症状

- 用户关注后，被关注者收不到通知
- 用户注册后，相关事件未触发
- 排查发现 `notifications` 表中缺少对应记录
- 服务日志出现: `"Failed to connect to NATS: IO error: Connection refused (os error 111)"`
- 服务器上 `ps aux | grep nats` 无结果

## 根因

生产服务器未安装 nats-server。所有微服务在启动时尝试连接 NATS：

```rust
let nats = match async_nats::connect(&config.nats_url).await {
    Ok(client) => { Some(client) }
    Err(e) => {
        tracing::warn!("Failed to connect to NATS: {}", e);
        None  // ← NATS 连接失败，返回 None
    }
};
```

当 `nats` 为 `None` 时，所有 `publish_event()` 调用静默无操作：

```rust
async fn publish_event(&self, subject: &str, payload: serde_json::Value) {
    if let Some(ref nats) = self.nats {  // ← None，跳过
        // ... publish logic
    }
}
```

## 影响范围

| 功能 | 涉及服务 | 事件 Subject | 当前 fallback |
|------|---------|-------------|---------------|
| 用户注册 | polis-user | USER_REGISTERED | ❌ 无 |
| 用户关注 | polis-user | USER_FOLLOWED | ✅ v1.0.63 直接 DB INSERT |
| 帖子点赞 | polis-content | CONTENT_POST_LIKED | ✅ Content handler 直接写 DB |
| 评论创建 | polis-content | CONTENT_COMMENT_CREATED | ✅ Content handler 直接写 DB |
| 帖子创建 | polis-content | CONTENT_POST_CREATED | ❌ 依赖 Notify service (未部署) |

## 修复模式

**原则**: 任何依赖 NATS 事件的功能必须同时实现直接 DB 写入作为 fallback。

```rust
// ✅ 正确模式
pub async fn some_action(&self, ...) -> Result<(), AppError> {
    // 1. 主逻辑 (SQL INSERT/UPDATE)
    sqlx::query("INSERT INTO ...").execute(&self.pool).await?;

    // 2. NATS 事件 (可选，失败不影响主流程)
    let _ = self.publish_event(subjects::SOME_EVENT, payload).await;

    // 3. 直接 DB fallback (确保 NATS 缺失时通知仍写入)
    if some_condition {
        let _ = sqlx::query("INSERT INTO notifications ...")
            .execute(&self.pool).await;
    }

    Ok(())
}

// ❌ 错误模式 — 仅依赖 NATS
pub async fn some_action(&self, ...) -> Result<(), AppError> {
    sqlx::query("INSERT INTO ...").execute(&self.pool).await?;
    self.publish_event(subjects::SOME_EVENT, payload).await; // NATS 不部署 = 通知丢失
    Ok(())
}
```

## 诊断

```bash
# 检查服务器是否有 NATS 运行
ssh root@47.253.123.3 "ps aux | grep nats"

# 检查服务日志中的 NATS 连接警告
ssh root@47.253.123.3 "journalctl -u polis-user --no-pager | grep -i nats"
ssh root@47.253.123.3 "journalctl -u polis-content --no-pager | grep -i nats"

# 验证通知是否写入数据库
ssh root@47.253.123.3 "PGPASSWORD='...' psql -U polis -d polis -c \
  \"SELECT type, COUNT(*) FROM notifications GROUP BY type ORDER BY 2 DESC;\""
```

## 长期方案

1. **部署 NATS Server** (推荐): `curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@main | sh`
2. **或改用 PostgreSQL LISTEN/NOTIFY**: 利用现有 PG 实例做事件总线
3. **或全部改为直接 DB 写入**: 移除 NATS 依赖，简化架构

## 已修复点位

| 文件 | 位置 | 修复内容 | 版本 |
|------|------|----------|------|
| `crates/polis-user/src/handlers/user_handler.rs` | `toggle_follow` (line 353-386) | INSERT INTO follows 后直接 INSERT INTO notifications | v1.0.63 |
| `crates/polis-notify/src/handler.rs` | `handle_event` (line 33-41) | 移除 CONTENT_POST_LIKED/CONTENT_COMMENT_CREATED 的重复 DB 写入 | v1.0.63 |

## 预防清单

- [ ] 新增 `publish_event()` 调用时，同时检查是否有直接 DB fallback
- [ ] 部署前运行: `ssh root@47.253.123.3 "ps aux | grep nats"` 确认 NATS 状态
- [ ] 新服务启动日志中关注 "Failed to connect to NATS" 警告
