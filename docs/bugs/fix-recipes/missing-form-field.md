# 修复配方：表单字段缺失

## 我看到什么？
- 登录/提交表单失败
- 后端返回认证错误或验证错误
- 前端代码中 `useState` 初始化了 N 个字段，但 JSX 中只有 N-1 个 input

## 怎么修

1. 找到 `useState` 初始化对象：
```typescript
const [form, setForm] = useState({ email: '', password: '', admin_code: '' });
```

2. 确认每个 key 在 JSX 中都有对应的 `<input>` 元素：
```tsx
<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
<input value={form.admin_code} onChange={(e) => setForm({ ...form, admin_code: e.target.value })} />
```

3. 补充缺失的 input 元素，确保 onChange 展开所有现有字段

## 耗时
2 分钟/处

## 参考 Pattern
[missing-form-field](../patterns/missing-form-field.md)
