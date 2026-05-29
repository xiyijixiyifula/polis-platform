# 模块Tab键值不匹配

> Pattern ID: PAT-012 | 严重程度: 🔴 高 | 最近发现: v1.0.34

## 症状

- 社区模块Tab点击后内容区域空白
- Tab高亮选中但无任何渲染内容（无帖子列表、无发布按钮、无空状态提示）
- 浏览器console无JS错误
- 仅影响动态模块系统引入后的社区

## 根因

动态模块系统（v1.0.30）使用 `m.module_key` 作为Tab标识符（如 `forum`、`mod_1ade9c1d`），但渲染块条件判断使用 `MODULE_CONFIG[m.module_key].route` 路由名（如 `posts`、`video`）。两个键空间不一致导致Tab激活但无匹配的渲染块。

此外，自定义模块（非17种旧模块类型）的 `module_key` 不在 `KNOWN_TABS` 集合中，完全没有任何渲染块匹配，必然出现空白。

## 诊断步骤

1. 打开社区页，点击每个模块Tab
2. 观察哪些Tab内容区域为空
3. 浏览器console执行：`__NEXT_DATA__` 查看 `spaceModules` 的 `module_key` 值
4. 对比 `MODULE_CONFIG` 中的 `route` 映射

## 修复

**两处修改**：

### 1. Tab id 使用 route 名而非 module_key

```tsx
// ❌ 旧代码 — tab id 用 module_key（如 forum）
id: m.module_key

// ✅ 新代码 — tab id 用 MODULE_CONFIG 映射的 route（如 posts）
id: MODULE_CONFIG[m.module_key]?.route || m.module_key
```

### 2. 添加通用渲染 fallback

为不匹配任何已知Tab的模块添加通用渲染块（含发布按钮 + 帖子列表 + 空状态提示）。

```tsx
{(() => {
  const KNOWN_TABS = new Set(['overview','posts','wiki',...]);
  const currentMod = spaceModules.find(m => 
    (MODULE_CONFIG[m.module_key]?.route || m.module_key) === activeTab
  );
  if (!currentMod || KNOWN_TABS.has(activeTab)) return null;
  // 渲染通用模块内容...
})()}
```

## 已修复点位

| 日期 | 版本 | 文件 | 描述 | 修复 |
|------|------|------|------|------|
| 2026-05-29 | v1.0.34 | SpacePageClient.tsx | module_key→route 映射 + 通用fallback | tab id 映射 + 新增通用渲染块 |

## 预防

- 新增模块系统相关代码时，始终通过 `MODULE_CONFIG[m.module_key]?.route || m.module_key` 统一键空间
- 预防清单: `grep "module_key" web/src/ --include="*.tsx" | grep -v "MODULE_CONFIG"`
