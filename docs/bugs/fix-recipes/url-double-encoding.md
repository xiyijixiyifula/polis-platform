# 修复配方：URL 双重编码

## 症状

- 中文用户名/社区名页面能加载，但内部 API 返回 404
- Network 面板中请求 URL 包含 `%25`（如 `%25E5%258F%25A0`）
- 服务器返回 `"用户不存在"` / `"社区不存在"`
- 仅影响含中文的 URL 参数

## 一键诊断

打开浏览器 DevTools → Network 标签 → 找失败的 XHR/Fetch 请求 → 看 URL：

```
# 双重编码（有问题）：
/api/creations?creator_username=%25E5%258E%259F...  ← %25 开头！

# 正常：
/api/creations?creator_username=%E5%8E%9F...
```

## 标准修复

```typescript
// 替换原来的：
// const res = await fetch(`/api/xxx?param=${encodeURIComponent(params.username)}`);

// 改为：
const safeValue = (() => {
  try { return decodeURIComponent(params.username); } catch { return params.username; }
})();
const res = await fetch(`/api/xxx?param=${encodeURIComponent(safeValue)}`);
```

**一行版（如果确定参数总是有效）：**
```typescript
const res = await fetch(`/api/xxx?param=${encodeURIComponent(decodeURIComponent(params.username))}`);
```

## 验证方法

1. 打开 Network 面板
2. 访问含中文参数的目标页面
3. 确认 API 请求 URL 中不含 `%25`
4. 确认 API 返回 200

## 搜索潜在风险点

```bash
# 找所有可能出问题的地方
grep -rn "encodeURIComponent(" web/src/ | grep -v "decodeURIComponent" | grep -v "\.test\." | grep -v node_modules
```

## 相关回归

- 修复后确认其他含 `params.` 的同文件 API 调用是否也需要修复
- 检查同页面其他 `useEffect` 中的 API 调用
