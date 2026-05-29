---
symptoms: [新增API端点404, 直连后端正常, 通过网关404]
keywords: [新增API, 404, 直连, 后端, 正常, 网关, gateway, 端点, 路由]
severity: high
recipe: docs/bugs/fix-recipes/gateway-route-missing.md
fix_time: 10min
diagnosis_cmd: grep -n "api/" crates/polis-gateway/src/main.rs | grep route
---

# Gateway 路由遗漏

> Pattern ID: PAT-007 | 严重程度: 🔴 高 | 最近发现: v1.0.22

## 症状

- 新添加的 API 端点返回 HTTP 404
- 直接访问后端服务端口正常，但通过域名/网关访问 404
- Nginx access log 显示请求到达但 Gateway 未转发

## 根因

Polis 微服务架构中，所有 `/api/` 请求由 Nginx → Gateway → 后端服务。Gateway 的路由表是**硬编码**的（`crates/polis-gateway/src/main.rs`），新增 API 路由前缀必须同步添加到 Gateway 路由表。

## 诊断步骤

1. 直连后端服务端口测试：`curl http://127.0.0.1:3001/api/user/ban-status?email=test@example.com`
2. 通过 Gateway 测试：`curl http://127.0.0.1:8080/api/user/ban-status?email=test@example.com`
3. 直连正常但 Gateway 404 → 确认是 Gateway 路由遗漏

## 修复

在 `crates/polis-gateway/src/main.rs` 中添加缺失的路由行：

```rust
.route("/api/user/{*path}", any(proxy_to_user))
```

## 已修复点位

| 日期 | 版本 | 文件 | 遗漏路径 | 修复 |
|------|------|------|----------|------|
| 2026-05-27 | v1.0.22 | main.rs | `/api/user/*` | 新增 `.route("/api/user/{*path}", any(proxy_to_user))` |

## 预防

- 新增 API 端点时，检查 Gateway 路由表是否已覆盖该路径前缀
- 预防清单: `grep "api/<new-prefix>" crates/polis-gateway/src/main.rs`
