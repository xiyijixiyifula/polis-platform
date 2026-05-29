# 修复配方: Actions 数组遗漏

## 症状

- 新增的 `POST/PUT/DELETE /api/spaces/{ns}/xxx` 返回 404 ("Space not found")
- 直连后端服务正常
- 日志中 namespace 解码异常

## 一键诊断

```bash
# 检查端点是否在 actions 数组中
grep -n "新增的端点后缀" crates/polis-space/src/routes/space_routes.rs
# 看是否在 let actions = [...] 数组中
```

## 标准修复

1. 打开 `crates/polis-space/src/routes/space_routes.rs`
2. 找到 `handle_auth_path` 函数中的 `actions` 数组（约第 185-205 行）
3. 在数组末尾追加新的端点后缀字符串（如 `"/modules"`）

```rust
let actions = [
    "/join", "/leave", "/posts",
    "/members/ban", "/members/role", "/members/unban",
    "/join-requests", "/join-requests/review",
    "/verify-password",
    "/follow", "/unfollow",
    "/star", "/unstar",
    "/modules",        // ← 新增
];
```

4. 重新编译部署

## 验证方法

```bash
# 直接测试端点
curl -X POST "https://www.mzgw.com/api/spaces/{ns}/modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","mode":"free","allowed_content_types":["article"]}'
# 预期: 返回 200，非 404 "Space not found"
```

## 相关回归

- 新增任何需要 `handle_auth_path` 处理的端点时，必须同步更新 `actions` 数组
- 与 [gateway-route-missing](gateway-route-missing.md) 症状类似（都是 404），但根因不同：gateway 是外部路由遗漏，actions 是内部 namespace 提取遗漏

## 修复耗时

5 分钟
