# 修复配方：模块标签硬编码回退（去交流中心主义）

## 症状

- 首页动态/社区页/个人主页/帖子详情页 — 模块面包屑标签显示为"交流"而非实际模块名
- 自定义模块（如"天气预报"）的作品被标记为"交流"
- article 模块被错误显示为"论坛"而非"文章"
- profile 页面投稿弹窗显示"交流"而非真实模块名

## 一键诊断

```bash
# 检查是否还有 '交流' 或 'forum' 硬编码回退（排除 MODULE_CONFIG 定义本身）
grep -rn "交流\|'forum'" web/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "MODULE_CONFIG" | grep -v "label:"
```

预期结果：修复后应只有 MODULE_CONFIG 中的 label 定义出现"交流"和"forum"。

## 标准修复（三层递进）

### 第一层：核心库修复（ROOT CAUSE — 必须做）

**文件**: `web/src/lib/module-config.ts`

```typescript
// 修复 1: MODULE_ALIASES — 删除 article→forum 错误映射
const MODULE_ALIASES: Record<string, string> = {
  // 'article': 'forum',  ← 删除此行！article 是合法模块
  'text': 'forum',
  'image': 'forum',
  'post': 'forum',
  'discussion': 'forum',
  'activity': 'forum',
};

// 修复 2: getModuleLabel() — 未知模块返回自身 key 而非 '交流'
export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '交流';
  return MODULE_CONFIG[moduleType]?.label || moduleType;  // ← moduleType 替代 '交流'
}

// 修复 3: normalizeModuleType() — 只做别名映射，不折叠未知 key
export function normalizeModuleType(rawType?: string): string {
  if (!rawType) return 'forum';
  const key = rawType.toLowerCase();
  return MODULE_ALIASES[key] || rawType;  // ← rawType 替代 'forum'
}

// 修复 4: getModuleLabelByContentType() — moduleType 优先于 contentType
export function getModuleLabelByContentType(contentType?: string, moduleType?: string): string {
  if (moduleType) return getModuleLabel(moduleType);  // ← 先判断 moduleType
  if (contentType === 'text' || contentType === 'image') return '交流';
  // ... 其余 contentType fallback
  return '交流';
}
```

### 第二层：组件/页面修复（使用第一层修复后的函数）

**ContentCard.tsx**:
```typescript
// 面包屑标签 — 使用 moduleLabel prop 或 getModuleLabel
const moduleLabel = moduleLabelOverride || getModuleLabel(moduleType);

// adaptCreationItem — 不用 normalizeModuleType，保留原始值
moduleType: firstSub?.module_type || creation.content_type || 'forum',

// adaptFeedItem — 读取 API 返回的 module_name
moduleLabel: item.module_name || undefined,
```

**PostCard.tsx**:
```typescript
// 去掉 || '交流' 三重回退
{post.module_label || getModuleLabel(post.module_type)}
```

**SpacePageClient.tsx**:
```typescript
// mtFilter — 包含所有模块键
new Set<string>([...Object.keys(MODULE_CONFIG), ...spaceModules.map(m => m.module_key)])

// 标签回退链
MODULE_CONFIG[...]?.label || spaceModules.find(...)?.name || post.module_type || '交流'

// 概览区 — route==='posts' 替代 module_type==='forum'
posts.filter(p => {
  if (!p.module_type) return true;
  const route = MODULE_CONFIG[p.module_type]?.route || 'posts';
  return route === 'posts';
})
```

**ProfilePageClient.tsx** / **PostPageClient.tsx**:
```typescript
// 所有硬编码三元表达式替换为
import { getModuleLabel } from '@/lib/module-config';
{getModuleLabel(refPostModuleType)}
```

**creations/new/page.tsx**:
```typescript
// 简化模块检查
if (!MODULE_CONFIG[prefillModule]) return 'article';
```

### 第三层：后端 API 修复

**文件**: `crates/polis-content/src/repo.rs`

在所有 feed SQL 查询中：
```sql
LEFT JOIN space_modules sm ON sm.space_id = p.space_id AND sm.module_key = p.module_type
```
SELECT 中增加 `sm.name as module_name`。

PostRow 元组增加 `Option<String>` 元素（位置 4）。

JSON 响应增加 `"module_name": module_name` 字段。

## 验证方法

1. 首页全部动态 — 各模块帖子面包屑标签正确
2. `/profile/{username}` — 作品Tab模块名正确
3. `/space/{ns}` — 自定义模块Tab标签正确
4. `/post/{id}` — 创作引用区模块标签正确
5. `/creations/new` — 模块选择正确

## 相关回归

- **Chain #9**: v1.0.40 表面修复 → v1.0.41 根因修复
- **关联 Chain #8**: 模块Tab键值不匹配（同样源于动态模块系统与静态配置的矛盾）
- **注意**: 修改 `module-config.ts` 核心函数会影响全局所有页面的模块标签显示
