---
symptoms: [社区页面包屑显示模块名为'交流', 自定义模块tab中帖子路径显示'交流/帖子名', PostCard组件面包屑始终显示'交流']
keywords: [面包屑, 模块名, 交流, 自定义模块, getModuleLabel, PostCard, MODULE_CONFIG]
severity: medium
recipe: docs/bugs/fix-recipes/module-breadcrumb-hardcoded.md
fix_time: 15min
diagnosis_cmd: grep -rn 'getModuleLabel\|module_type.*forum\|>交流<' web/src/ --include="*.tsx"
---

# 模块面包屑硬编码

## 元信息

- **首次出现**: v1.0.40
- **复发次数**: 0
- **最近一次**: v1.0.40
- **严重程度**: 🟡 中 — 用户看到错误的模块名称，但不影响功能
- **影响范围**: PostCard 组件、社区概览页、首页 Feed、所有使用 `getModuleLabel()` 的面包屑

## 根因

**根因 1**: `getModuleLabel()` 对未在 `MODULE_CONFIG` 中注册的自定义模块键（如 `mod_4167432e`）返回硬编码 fallback `'交流'`

```typescript
// module-config.ts
export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '交流';
  return MODULE_CONFIG[moduleType]?.label || '交流';  // ← 自定义模块键 return '交流'
}
```

**根因 2**: `PostCard` 组件硬编码了 module_type 和面包屑标签

```typescript
// PostCard.tsx (修复前)
module_type: 'forum',  // ← 硬编码
<span>交流</span>       // ← 硬编码内联面包屑
```

## 修复

**变更 1**: 概览页面包屑使用 `spaceModules` 解析自定义模块名

```typescript
// 修复前
const moduleLabel = getModuleLabel(post.module_type);

// 修复后
const moduleLabel = MODULE_CONFIG[post.module_type]?.label 
  || spaceModules.find(m => m.module_key === post.module_type)?.name 
  || '交流';
```

**变更 2**: `PostCard` 新增 `module_type` 和 `module_label` props，移除硬编码

```typescript
// PostCardProps 新增字段
module_type?: string;
module_label?: string;

// 使用动态标签
{post.module_label || getModuleLabel(post.module_type) || '交流'}
```

**变更 3**: 所有 PostCard 调用处传入 `module_type`，自定义模块 Tab 额外传入 `module_label: currentMod.name`

## 预防

1. 自定义模块的显示名称应从 `spaceModules`（API 返回的模块列表）获取
2. 新增模块渲染组件时，检查是否使用了 `getModuleLabel()` 做 fallback
3. ContentCard.tsx (feed/submission 页面) 仍存在同样的问题（未修复），因为它没有 `spaceModules` 上下文

## 已知残留

| 位置 | 问题 | 影响 |
|------|------|------|
| `ContentCard.tsx:514` | `getModuleLabel(sub.module_type)` fallback 到 '交流' | 首页 Feed、探索页、搜索结果 |
| `ContentCard.tsx:232` | `getModuleLabelByContentType()` 同样的 fallback 问题 | 内容卡片 |

**修复思路**: 后端 API 应返回模块的显示名称，前端直接从 API 数据获取而非本地查表。

## 已修复点位

| 版本 | 日期 | 文件 | 修复内容 |
|------|------|------|----------|
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx:931` | 概览面包屑从 spaceModules 查找自定义模块名 |
| v1.0.40 | 2026-05-29 | `PostCard.tsx:48` | module_type 不再硬编码为 'forum' |
| v1.0.40 | 2026-05-29 | `PostCard.tsx:94` | 内联面包屑使用动态 module_label |
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx` 多处 | PostCard 调用传入 module_type |
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx:1965` | 自定义模块 Tab PostCard 传入 module_label=currentMod.name |
