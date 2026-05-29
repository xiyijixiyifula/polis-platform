# Pattern: atob URL-safe base64 解码失败

> **严重程度**: 🟡 中  
> **首次发现**: v1.0.29 (2026-05-28)  
> **复发次数**: 0

## 症状

- 点击链接/按钮跳转到需要 JWT 解码验证的页面后，立即被重定向回上一页
- 按钮表现为"点了没反应"（实际上发生了导航→解码失败→重定向，对用户无感）
- 控制台检查 `atob()` 调用会抛出 `InvalidCharacterError: Failed to execute 'atob'`
- 或者 `atob()` 失败被 try/catch 静默吞掉，导致某些功能（如权限判断）不生效

## 根因

JWT token 使用 **base64url** 编码（RFC 7519），用 `-` 替代 `+`、`_` 替代 `/`。
JavaScript 的 `atob()` 只支持标准 base64，遇到 `-` / `_` 字符会抛出异常。

```javascript
// atob() 不支持 URL-safe base64
const token = "eyJ...-abc_xyz";  // 含 - 和 _
atob(token.split('.')[1]);        // ❌ InvalidCharacterError
```

## 影响范围

所有使用 `atob()` 解码 JWT payload 的前端代码：

| 文件 | 函数 | 影响 |
|------|------|------|
| `ManagePageClient.tsx` | isOwner 校验 | 🔴 管理页无法访问，重定向回社区页 |
| `PostPageClient.tsx` | `getCurrentUserId()` | 🟡 静默失败，return null → 作者权限判断失效 |

## 根本解决方案

统一使用 `jwt-decode` 或 `js-base64` 等库（支持 base64url），而非手动 `atob()`。

**当前方案**（无需引入依赖，已在预防清单中）：

在调用 `atob()` 前，将 URL-safe base64 转为标准 base64：

```javascript
const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
const payload = JSON.parse(atob(b64));
```

## 已修复点位

| 文件 | 修复内容 | 版本 | 日期 |
|------|----------|------|------|
| `web/src/app/space/manage/[...namespace]/ManagePageClient.tsx` | atob() 前添加 replace(/-/g, '+').replace(/_/g, '/') | v1.0.29 | 2026-05-28 |
| `web/src/app/post/[id]/PostPageClient.tsx` | 同上 | v1.0.29 | 2026-05-28 |

## 预防

在预防清单中新增检查项，编译后扫描所有 `atob()` 调用确认其前有 URL-safe → standard 转换。
