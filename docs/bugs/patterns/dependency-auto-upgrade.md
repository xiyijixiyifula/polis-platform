# 依赖自动升级 Bug

## 元信息

- **首次出现**: v1.0.12 (2026-05-26)
- **复发次数**: 0
- **最近一次**: v1.0.12 (2026-05-26)
- **严重程度**: 🔴 高 — 导致编辑器完全不可用
- **影响范围**: 所有使用 `cherry-markdown` 的页面（创作中心、编辑页）

## 根因

1. `package.json` 使用 `^0.11.1`（semver 范围），允许 minor/patch 自动升级
2. `package-lock.json` 重建时（本地或 CI），npm 解析到最新匹配版本 `0.11.2`
3. `0.11.2` 的内部变化与项目的 CodeMirror 6 配置不兼容
4. 报错：`Cannot delete property 'toString' of function () { [native code] }`

## 典型症状

- cherry-markdown 编辑器区域空白或报错
- Console 报 `Cannot delete property 'toString'`（Cherry Markdown 内部错误）
- 编辑器工具栏/预览区不渲染
- 回退到上一个 package-lock.json 或用 `npm install cherry-markdown@0.11.0` 后恢复正常

## 标准修复

```bash
# 1. 锁定版本（package.json）
# 改前: "cherry-markdown": "^0.11.1"
# 改后: "cherry-markdown": "0.11.0"

# 2. 确保 ESM-only 包被 transpile（next.config.js）
const nextConfig = {
  transpilePackages: ['cherry-markdown'],
  // ...
};

# 3. 重装
rm -rf node_modules package-lock.json
npm install
```

## 已修复点位

| 版本 | 文件 | 修改内容 | 日期 |
|------|------|----------|------|
| v1.0.12 | `web/package.json` | `^0.11.1` → `0.11.0` | 2026-05-26 |
| v1.0.12 | `web/next.config.js` | 添加 `transpilePackages: ['cherry-markdown']` | 2026-05-26 |

## 风险点位

所有在 `package.json` 中使用 `^` 或 `~` 前缀的第三方依赖。

诊断搜索：
```bash
grep -E '"\^|"~' web/package.json
```

## 预防措施

1. 非信任的第三方包使用精确版本号，去掉 `^`/`~`
2. ESM-only 包（`"type": "module"`）必须在 `transpilePackages` 中声明
3. 升级依赖前手动测试核心功能
4. `package-lock.json` 的变更在 PR 中需要特别审查
