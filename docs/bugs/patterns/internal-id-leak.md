# Pattern: 内部标识符泄露到 UI 显示层

## 标识符
`internal-id-leak`

## 症状
- UI 显示 slug/key/path 而非用户友好的 display_name/title
- 探索页社区卡片显示 "mod-test" 而非 "模块测试社区"
- 模块标签显示 `module_key`（"forum"）而非 `name`（"交流"）
- 帖子引用路径显示内部 namespace 格式而非可读名称

## 根因
底层数据模型存储了两种名称：
1. **用户友好的**（title, name, display_name）— 用于显示
2. **机器友好的**（slug, namespace, module_key）— 用于 URL/API

UI 层误用了后者。常见场景：
- 从 `namespace.split('/').pop()` 取 slug 当标题显示
- 直接从 API 返回的 `module_key` 字段渲染
- 用 `communitySlug` 而非 `communityTitle`

## 修复配方
1. 区分"内部标识符"和"显示标签"
2. 内部标识符（slug/key/namespace）仅用于 URL 路由和 API 调用
3. UI 永远显示 `title`/`name`/`display_name` 字段
4. 如果只有内部标识符，用 `getModuleLabel()` 或 `space.title` 映射到友好的名称
5. 检查所有 `SpaceCard`、`ContentCard`、`FeedLayout`、`PostCard` 等组件

## 预防措施
- 代码审查时检查 `namespace`、`slug`、`module_key` 是否出现在 render 中
- 新增显示组件时，优先用 `title`/`name` 而非标识符字段
- `grep -rn "namespace\|slug\|module_key" web/src/components/` 检查是否有泄露

## 已修复点位

| 版本 | 文件 | 问题 | 修复日期 |
|------|------|------|----------|
| v0.3.x | SpaceCard.tsx:176-178 | 显示 `@owner/slug`→只显示 `@owner` | 2026-06-09 |
| v1.0.x | TabRenderer.tsx | 模块标签硬编码 module_key → getModuleLabel() | 2026-06-03 |
| v1.0.x | ContentCard.tsx | 面包屑用 slug → 用 space.title | 2026-06-02 |

## 复发次数
3 次（2026-06-02, 2026-06-03, 2026-06-09）
