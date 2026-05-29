# Gateway 路由遗漏修复配方

> 适用 Pattern: [gateway-route-missing](../patterns/gateway-route-missing.md) | 耗时: 约 10 分钟

## 当我看到什么时用这个配方？

- 新 API 端点本地测试正常，但生产环境返回 404
- 直连后端服务正常，通过 Gateway 返回 404

## 修复步骤

### 1. 在 Gateway 路由表中添加路由

编辑 `crates/polis-gateway/src/main.rs`，在对应的服务代理区域添加路由行：

```rust
// 用户服务新增路由示例
.route("/api/user/{*path}", any(proxy_to_user))
```

### 2. 交叉编译 Gateway

```bash
cargo build --release --target x86_64-unknown-linux-gnu -p polis-gateway
```

### 3. 部署 Gateway

```bash
# 上传到 GitHub Release
gh release upload vX.Y.Z target/x86_64-unknown-linux-gnu/release/polis-gateway --clobber

# 服务器端
systemctl stop polis-gateway
curl -fsSL "https://github.com/.../releases/download/vX.Y.Z/polis-gateway" -o /root/polis/target/release/polis-gateway
chmod +x /root/polis/target/release/polis-gateway
systemctl start polis-gateway
```

### 4. 验证

```bash
curl -s http://127.0.0.1:8080/api/user/ban-status?email=test@example.com
```

## 路由映射参考

| 路径前缀 | 代理函数 | 后端服务 |
|----------|----------|----------|
| `/api/auth/*` | proxy_to_user | polis-user |
| `/api/users/*` | proxy_user_router | polis-user / polis-content |
| `/api/user/*` | proxy_to_user | polis-user |
| `/api/follow` | proxy_to_user | polis-user |
| `/api/contacts/*` | proxy_to_user | polis-user |
| `/api/admin/*` | proxy_to_admin | polis-admin |
| `/api/spaces/*` | proxy_space_router | polis-space / polis-content |
| `/api/posts/*` | proxy_to_content | polis-content |
