# .map() 防空防御 Bug

## 元信息

- **首次出现**: 最早出现在 v0.3.72 以前
- **复发次数**: 多次（14+ 处修复）
- **最近一次**: v1.0.35 (2026-05-29)
- **严重程度**: 🟡 中 — 导致页面白屏/组件渲染崩溃，但通常是局部影响
- **影响范围**: 所有前端 `.map()` 调用，尤其是 API 响应数据不确定为数组的场景

## 根因

JavaScript/TypeScript 中，对非数组值（`undefined`、`null`、非数组对象）调用 `.map()` 会抛出 `TypeError: x.map is not a function`。常见触发场景：
- API 返回的数组字段，在网络异常或服务端异常时为 `undefined`
- 嵌套数据中的可选数组字段未做空值检查
- API 字段改名后，旧字段变为 `undefined`

## 典型症状

- 页面白屏（React 未捕获的渲染异常）
- Console 报错: `TypeError: x.map is not a function` 或 `undefined is not iterable`
- 组件树中某处崩溃导致整个 Error Boundary 内白屏
- 刷新后有时正常（API 返回正常数据时）

## 标准修复

```typescript
// ❌ 危险写法
{items.map(item => <Card key={item.id} {...item} />)}

// ✅ 防御写法 1 — 短路求值（最简单）
{items?.map(item => <Card key={item.id} {...item} />)}

// ✅ 防御写法 2 — 空数组兜底（使用方需要确定行为）
{(items || []).map(item => <Card key={item.id} {...item} />)}

// ✅ 防御写法 3 — API 响应处理（推荐）
const data = await res.json();
const items = Array.isArray(data.data) ? data.data : [];
```

## 已修复点位

| 版本 | 文件 | 修复内容 | 日期 |
|------|------|----------|------|
| v0.3.72 | `ContentManager.tsx` | `m.map is not a function` — 添加 `Array.isArray` 检查 | 2026-05-23 |
| v1.0.8 | 14 处前端文件 | 全面添加 `?.` 可选链和 `|| []` 兜底 | 2026-05-25 |

## 诊断命令

```bash
# 搜索所有 .map() 调用，标记缺少 ?. 保护的位置
grep -rn "\.map(" web/src/ --include="*.tsx" --include="*.ts" | grep -v "\.map("

# 搜索所有不带空值保护的 API 响应解构
grep -rn "\.data\." web/src/ --include="*.tsx" | grep -v "Array.isArray"
```

## 预防措施

1. Code Review 规则：任何对可能是 `undefined` 的变量使用 `.map()`，必须在前面有 `?.` 或 `|| []`
2. 新增组件时，接收数组 props 默认值设为 `[]`
3. API 响应处理统一用 `Array.isArray(data) ? data : []` 模式
4. TypeScript strict 模式下开启 `strictNullChecks` 可提前捕获
