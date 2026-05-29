# 修复配方: atob URL-safe base64 解码失败

## 症状识别

- **触发条件**: 点击需要 JWT 解码的链接/按钮后无反应（实际为解码失败→重定向）
- **控制台诊断**: `atob()` 抛出 `InvalidCharacterError`
- **典型场景**: 新页面首次加载时调用 `atob(token.split('.')[1])` 解码 JWT payload 判断权限

## 一键诊断

在浏览器 console 中运行：

```javascript
// 1. 获取当前 token
const token = localStorage.getItem('polis_access_token');
if (!token) { console.log('未登录'); } else {
  try {
    atob(token.split('.')[1]);  // 如果这里报 InvalidCharacterError → 命中此 Pattern
    console.log('atob 正常');
  } catch(e) {
    console.log('命中 atob-base64url Pattern:', e.message);
  }
}
```

## 标准修复

在第 2 步后将 `-` 和 `_` 替换为 `+` 和 `/`：

```javascript
// 修复前（报错）：
const payload = token.split('.')[1];
const decoded = JSON.parse(atob(payload));

// 修复后（正确）：
const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
const decoded = JSON.parse(atob(b64));
```

## 验证方法

1. 在浏览器 console 运行诊断脚本，确认不再报 `InvalidCharacterError`
2. 打开原本受影响的页面（如管理页、帖子详情页），确认权限判断正常（按钮显示/不跳转）
3. 搜索前端代码 `atob(` 确认所有调用点均已添加 URL-safe 转换：`grep -rn "atob(" web/src/ --include="*.tsx" --include="*.ts"`

## 相关回归

此修复本身几乎零风险（纯字符串转换），不会导致其他问题。但 `atob()` 本身可能涉及权限判断逻辑变更，验证时需确认权限判断仍正确。

## 相关 Pattern

- [atob-base64url.md](../patterns/atob-base64url.md) — Pattern 详细分析
