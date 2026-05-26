# 修复配方：依赖自动升级导致运行时错误

## 症状

- 某个功能突然不可用（之前正常）
- Console 报 TypeError/ReferenceError，涉及第三方库内部代码
- 最近一次 `npm install` 或 `package-lock.json` 变更后出现
- `npm list <package>` 显示版本与 `package.json` 预期不一致

## 一键诊断

```bash
# 1. 检查当前安装版本
npm list <package-name>

# 2. 对比 package.json 声明的版本
grep "<package-name>" package.json

# 3. 查看最近的 package-lock.json 变更
git log --oneline -5 -- package-lock.json

# 4. 查看包的 changelog/breaking changes
npm view <package-name> versions --json | tail -20
```

## 标准修复

```bash
# 1. 锁定到已知可用版本（去掉 ^ 或 ~ 前缀）
# package.json: "^0.11.1" → "0.11.0"
vim package.json

# 2. 如果是 ESM-only 包，确认 next.config.js 有 transpilePackages
# next.config.js: transpilePackages: ['package-name'],

# 3. 清理并重装
rm -rf node_modules package-lock.json
npm install

# 4. 本地验证
npm run dev
# → 浏览器测试目标功能
```

## 验证方法

1. `npm run build` 不报错
2. 目标功能在浏览器中正常可用
3. `npm list <package-name>` 显示锁定版本
4. Console 无之前的错误

## 预防措施

1. **所有非信任的第三方包使用精确版本**（去掉 `^` 和 `~`）
2. **`package-lock.json` 必须提交到 git**（已做到）
3. **升级依赖前先查看 CHANGELOG**
4. **ESM-only 包必须在 `next.config.js` 的 `transpilePackages` 中声明**

## 相关回归

- 每次重新生成 `package-lock.json` 时可能触发自动升级
- 如果有多个 ESM-only 包，每个都需要 `transpilePackages`
