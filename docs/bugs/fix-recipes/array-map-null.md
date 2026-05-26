# 修复配方：.map() 防空

## 症状

- 页面白屏（React 崩溃）
- Console 报错：`x.map is not a function` 或 `Cannot read properties of undefined (reading 'map')`
- 通常发生在 API 返回 null/undefined 时

## 一键诊断

```bash
# 在项目根目录搜索所有无防空 .map()
grep -rn "\.map(" web/src/ --include="*.tsx" --include="*.ts" | grep -v "\.test\." | grep -v node_modules | grep -v "?\.map" | grep -v "\.filter"
```

## 标准修复

```tsx
// ❌ 修复前：
{items.map(item => <Card key={item.id} {...item} />)}

// ✅ 修复后（方案 A — 推荐）：
{items?.map(item => <Card key={item.id} {...item} />)}

// ✅ 修复后（方案 B — 需要默认值时）：
{(items ?? []).map(item => <Card key={item.id} {...item} />)}
```

## 验证方法

1. 构造 API 返回 null/undefined 的场景（或断网测试）
2. 确认页面不白屏，Console 无 `.map is not a function` 错误
3. 确认正常数据仍正常渲染

## 搜索所有潜在风险点

```bash
# 找出所有尚未使用 ?. 的 .map() 调用
grep -rn "\.map(" web/src/ --include="*.tsx" --include="*.ts" \
  | grep -v "?\.map" \
  | grep -v node_modules \
  | grep -v "\.test\."
```

## 相关回归

- 每次新增含 `.map()` 的组件都可能出现此问题
- 建议配置 ESLint 规则自动检查（尚未实施）
