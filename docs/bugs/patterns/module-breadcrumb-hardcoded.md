---
symptoms: [模块标签显示'交流'而非实际名称, 首页动态自定义模块作品显示'交流', 个人主页作品Tab模块名显示'交流', 帖子详情页引用模块标签不准确]
keywords: [交流, 硬编码, fallback, getModuleLabel, normalizeModuleType, getModuleLabelByContentType, MODULE_CONFIG, MODULE_ALIASES, moduleType, 自定义模块, 去交流中心主义]
severity: high
recipe: docs/bugs/fix-recipes/module-breadcrumb-hardcoded.md
fix_time: 30min
diagnosis_cmd: grep -rn "交流\|'forum'" web/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "MODULE_CONFIG"
---

# 模块标签硬编码回退（去交流中心主义）

## 元信息

- **首次出现**: v1.0.40 (部分修复), v1.0.41 (根因彻底修复)
- **复发次数**: 2 (v1.0.40 表面修复 → v1.0.41 根因修复 → v1.0.43 route fallback 回归)
- **最近一次**: v1.0.43
- **严重程度**: 🔴 高 — 影响首页动态、社区页、个人主页、帖子详情、创作中心等全部模块标签显示
- **影响范围**: 全局 — 8 个文件 20+ 处修复点位，涉及前端核心库、组件、页面和后端 API

## 根因（三层递进）

### 第一层：核心库缺陷（ROOT CAUSE — v1.0.41 修复）

`web/src/lib/module-config.ts` 是整个模块标签体系的基石。4 个关键函数/常量全部有"交流中心主义"回退：

```typescript
// 缺陷 1: MODULE_ALIASES 错误映射
const MODULE_ALIASES: Record<string, string> = {
  'article': 'forum',  // ← 错误！article 是合法模块（label: '文章'），不应被别名覆盖
};
// 修复: 删除此行

// 缺陷 2: getModuleLabel() — 未知模块返回 '交流' 而非自身 key
export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '交流';
  return MODULE_CONFIG[moduleType]?.label || '交流';  // ← '交流' 掩盖真实模块类型
}
// 修复: return MODULE_CONFIG[moduleType]?.label || moduleType;

// 缺陷 3: normalizeModuleType() — 未知模块折叠为 'forum'
export function normalizeModuleType(rawType?: string): string {
  if (!rawType) return 'forum';
  return MODULE_CONFIG[rawType] ? rawType : 'forum';  // ← 擦除原始模块信息
}
// 修复: 只做别名映射，不透传未知 key（实际调用处已移除该函数）

// 缺陷 4: getModuleLabelByContentType() — contentType 优先于 moduleType
export function getModuleLabelByContentType(contentType, moduleType): string {
  if (contentType === 'text' || contentType === 'image') return '交流';  // ← contentType 优先
  // ... 最后才用 getModuleLabel(moduleType)
}
// 修复: moduleType 优先判断，contentType 仅为无 moduleType 时的 fallback
```

### 第二层：组件/页面散落硬编码（v1.0.40 部分修复 + v1.0.41 彻底修复）

- `ContentCard.tsx`: adaptCreationItem() 使用 normalizeModuleType() 擦除原始 module_type
- `PostCard.tsx`: 硬编码 `module_type: 'forum'` 和内联 `<span>交流</span>`
- `SpacePageClient.tsx`: mtFilter 硬编码 Set，概览区只显示 forum，模块标签三元表达式
- `ProfilePageClient.tsx`: 三处硬编码三元表达式（qa→问答/share→分享/...→交流）
- `PostPageClient.tsx`: 创作引用标签 7 臂硬编码映射

### 第三层：后端 API 缺失数据（v1.0.41 修复）

- feed API 不返回 `module_name`，前端无法获知自定义模块的显示名称
- 修复: LEFT JOIN `space_modules` 并在 JSON 响应中新增 `module_name` 字段

## 修复方案

### v1.0.41 — 根因彻底修复（8 文件 20+ 点位）

| 层级 | 文件 | 变更 |
|------|------|------|
| **核心库** | `module-config.ts` | 4 函数/常量修正: MODULE_ALIASES 删 article→forum, getModuleLabel 返回自身 key, normalizeModuleType 去折叠, getModuleLabelByContentType 优先 moduleType |
| **组件** | `ContentCard.tsx` | moduleLabel prop 新增 + 面包屑优先 moduleLabel + adaptCreationItem 去 normalizeModuleType + adaptFeedItem 读 API module_name |
| **组件** | `PostCard.tsx` | 移除 `|| '交流'` 三重 fallback |
| **页面** | `SpacePageClient.tsx` | mtFilter 统一键空间 + 标签回退链 + 概览区 route==='posts' 替代 module_type==='forum' |
| **页面** | `ProfilePageClient.tsx` | 3 处硬编码三元 → getModuleLabel() |
| **页面** | `PostPageClient.tsx` | adaptCreationToPost 优先 submission module_type + 引用标签 getModuleLabel() |
| **页面** | `creations/new/page.tsx` | 简化 MODULE_CONFIG 检查替代复杂逻辑 |
| **后端** | `repo.rs` | feed SQL JOIN space_modules + JSON 返回 module_name |

## 预防

1. **禁止任何地方硬编码 `'forum'` 或 `'交流'` 作为模块回退值** — 应使用 `getModuleLabel(moduleType)` 
2. **新增模块类型时**：在 `MODULE_CONFIG` 注册，`getModuleLabel()` 自动生效
3. **自定义模块**：后端 API 必须返回 `module_name`，前端用 `moduleLabel` prop 透传
4. **不在 MODULE_CONFIG 的模块键**：前端显示原始 key（而非误导性假名），后端返回真实 `module_name`

## 已修复点位

| 版本 | 日期 | 文件 | 修复内容 |
|------|------|------|----------|
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx:931` | 概览面包屑从 spaceModules 查找自定义模块名 |
| v1.0.40 | 2026-05-29 | `PostCard.tsx:48` | module_type 不再硬编码为 'forum' |
| v1.0.40 | 2026-05-29 | `PostCard.tsx:94` | 内联面包屑使用动态 module_label |
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx` 多处 | PostCard 调用传入 module_type |
| v1.0.40 | 2026-05-29 | `SpacePageClient.tsx:1965` | 自定义模块 Tab PostCard 传入 module_label=currentMod.name |
| **v1.0.41** | 2026-05-29 | **`module-config.ts`** | **ROOT CAUSE: MODULE_ALIASES 删 article→forum, getModuleLabel 返回自身 key, normalizeModuleType 去折叠, getModuleLabelByContentType 优先 moduleType** |
| **v1.0.41** | 2026-05-29 | **`ContentCard.tsx`** | **moduleLabel prop + 面包屑优先 + adaptCreationItem 去 normalizeModuleType + adaptFeedItem 读 module_name** |
| **v1.0.41** | 2026-05-29 | **`PostCard.tsx`** | **移除三重 fallback `|| '交流'`** |
| **v1.0.41** | 2026-05-29 | **`SpacePageClient.tsx`** | **mtFilter 统一键空间 + 标签回退链 + 概览区 route==='posts'** |
| **v1.0.41** | 2026-05-29 | **`ProfilePageClient.tsx`** | **3 处硬编码三元 → getModuleLabel()** |
| **v1.0.41** | 2026-05-29 | **`PostPageClient.tsx`** | **adaptCreationToPost 优先 submission + 引用标签 getModuleLabel()** |
| **v1.0.41** | 2026-05-29 | **`creations/new/page.tsx`** | **简化模块检查逻辑** |
| **v1.0.41** | 2026-05-29 | **`repo.rs` (content)** | **feed SQL LEFT JOIN space_modules + JSON 返回 module_name** |
| **v1.0.42** | 2026-05-29 | **`models.rs`** | **SubmissionInfo 新增 module_name: Option\<String\> 字段** |
| **v1.0.42** | 2026-05-29 | **`creation.rs`** | **creation_to_public() + get_submissions() LEFT JOIN space_modules → SubmissionInfo 含 module_name** |
| **v1.0.42** | 2026-05-29 | **`ContentCard.tsx`** | **SubmissionInfo interface + adaptCreationItem 传递 moduleLabel** |
| **v1.0.43** | 2026-05-29 | **`SpacePageClient.tsx` (lines 1081,1087)** | **route fallback `|| 'posts'` → `|| p.module_type` — 修复 v1.0.41 引入的回归: 自定义模块帖子泄漏到交流Tab** |
