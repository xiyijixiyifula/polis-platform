---
symptoms: [表单提交失败, 认证失败, 字段缺失, 输入框消失]
keywords: [表单, 提交, 失败, 认证, 密码, 缺少, input, useState, JSX, 不匹配, 字段]
severity: medium
recipe: docs/bugs/fix-recipes/missing-form-field.md
fix_time: 2min
diagnosis_cmd: grep -c "useState" web/src/app/admin/login/page.tsx
---

# 表单字段缺失 (Missing Form Field)

## 症状

- 表单提交失败，后端返回认证/验证错误
- 前端 form state 包含某个字段但 JSX 中没有对应 input
- 登录/注册等认证表单无法正常工作

## 根因

表单重构或新增页面时，`useState` 初始化了字段但没有在 JSX 中渲染对应的 `input`/`select`/`textarea`。
后端期望字段通过 JSON body 传递，但前端发送的是空字符串（state 默认值）。

## 诊断

```bash
# 查找后端期望字段与前端渲染 input 不匹配
grep -n "setForm\|form\." web/src/app/ --include="*.tsx"
# 对比 useState 初始值 与 JSX 中的 input name/value 绑定
```

## 修复配方

逐个对比 `useState` 初始对象中的 key 与 JSX 中 `<input>` 元素的 `value`/`onChange` 绑定：
- `useState({ email: '', password: '', admin_code: '' })` → 必须有 3 个 `<input>` 分别绑定 email/password/admin_code
- 缺失的字段 → 补充 `<input>` 元素

## 已修复点位

| 文件 | 缺失字段 | 版本 | 日期 |
|------|---------|------|------|
| `web/src/app/admin/login/page.tsx` | password (UI 无密码框) | v1.0.20 | 2026-05-27 |

## 预防

- 创建新表单时：写完 `useState` → 立即写出所有 input (一一对应)
- 重构表单时：对比新旧代码的 input 数量是否一致
- 修改后端期望字段时：同步更新前端 form state + input
