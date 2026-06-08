# Pattern: 全局替换不完整导致残留引用

## 标识符
`localstorage-residual`

## 症状
- 执行全局搜索替换后（如 localStorage → getToken），部分文件仍使用旧的 API
- 用户登录后头部仍显示"登录"按钮
- 组件未识别登录态但 cookie 中 token 存在
- 部分组件功能正常、部分不正常

## 根因
全局 sed/grep 替换时：
1. 替换范围不足 — 只修改了核心文件（api.ts），遗漏了直接读取 API 的组件
2. 新增 import 未验证 — 替换后未检查 type check 是否通过
3. `use client` 指令顺序问题 — import 被插入到指令之前

## 修复配方
1. `grep -rn "old_pattern" web/src/ crates/ --include="*.tsx" --include="*.ts" --include="*.rs" | grep -v node_modules | grep -v target` — 穷尽搜索所有残留
2. 对所有结果逐一替换
3. 对替换涉及的文件检查 import 是否完整
4. 对前端文件验证 `'use client'` 指令是否在第一行
5. `npm run build` + `cargo check` 验证编译

## 预防措施
- 全局替换类修改完成后必须执行 `grep -rn` 穷尽搜索验证零残留
- 不得假定"只改核心文件就够了" — 必须检查所有调用方
- 新增 import 后运行 `npx tsc --noEmit` 验证

## 已修复点位

| 版本 | 文件 | 问题 | 修复日期 |
|------|------|------|----------|
| v0.3.x | 12个文件22处 localStorage残留 | Header/SpaceChat/CherryEditor等未迁移 | 2026-06-08 |
