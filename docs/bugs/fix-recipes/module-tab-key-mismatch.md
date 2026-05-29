# 模块Tab键值不匹配修复配方

> 适用 Pattern: [module-tab-key-mismatch](../patterns/module-tab-key-mismatch.md) | 耗时: 约 5 分钟

## 当我看到什么时用这个配方？

- 社区模块Tab点击后内容区域完全空白
- Tab已选中但无任何内容渲染（无帖子、无按钮、无空状态）
- 浏览器console无报错

## 修复步骤

### 1. 检查 availableTabs 的 id 映射

编辑 `web/src/app/space/[...namespace]/SpacePageClient.tsx`，找到 `availableTabs` 的 useMemo：

```tsx
// ❌ 错误 — 直接用 module_key 作为 tab id
id: m.module_key,

// ✅ 正确 — 用 MODULE_CONFIG 映射为 route 名
id: MODULE_CONFIG[m.module_key]?.route || m.module_key,
```

### 2. 确保有通用 fallback 渲染块

在所有已知Tab的渲染块之后（`course` 块之后、`analytics` 块之前），添加通用fallback：

检查是否已有 `{/* === 动态模块通用渲染 === */}` 注释块。若没有，添加之。

### 3. 编译部署

```bash
cd web && npm run build
COPYFILE_DISABLE=1 tar -czf /tmp/release-web-vX.Y.Z.tar.gz -C web .next public
gh release create vX.Y.Z /tmp/release-web-vX.Y.Z.tar.gz
# 服务器部署...
```

### 4. 验证

进入任意社区页，逐个点击所有模块Tab，确认：
- 有内容的Tab显示帖子列表 + 排序选项
- 无内容的Tab显示空状态 + 发布按钮
- 自定义模块Tab显示通用fallback（模块名 + 发布按钮 + 空状态）
