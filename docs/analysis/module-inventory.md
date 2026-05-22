# Module Inventory — i18n Impact

## Pages (Routes) — All contain Chinese, all need i18n

| Group | Routes | Key Chinese Content |
|:------|:-------|:--------------------|
| **Public** | `/`, `/hot`, `/trending`, `/explore`, `/search` | 导航标签、筛选器、卡片文字、空状态提示 |
| **Auth** | `/login`, `/register`, `/forgot-password` | 表单标签、按钮、错误提示、验证规则 |
| **Space** | `/space/[...namespace]` | 模块标签(21种)、概览面板、成员管理、设置 |
| **Content** | `/post/[id]`, `/video/[id]`, `/series/[id]`, `/polls/*` | 帖子操作、评论区、投票选项 |
| **Create** | `/create`, `/create-center`, `/post/new`, `/polls/new`, `/creations/*` | 创作中心、编辑界面、投稿对话框 |
| **User** | `/profile/*`, `/settings`, `/notifications`, `/messages/*`, `/saved` | 个人资料、通知类型、消息、设置项 |
| **Admin** | `/admin/*` (11 routes) | 管理面板、用户管理、空间审核 |
| **Other** | `/about`, `/privacy`, `/research`, `/export`, `/drafts` | 介绍页、法律页面 |

## Shared Components — Chinese text heavy

| Component | Chinese Items | Impact |
|:----------|:--------------|:-------|
| `Header.tsx` | 导航、搜索、用户菜单、通知 | High |
| `ContentCard.tsx` | 模块标签(25种)、交互按钮、投稿面板、空状态 | Very High |
| `PostCard.tsx` | 统计标签、管理按钮 | High |
| `Sidebar.tsx` | 导航菜单项 | Medium |
| `SubmitDialog.tsx` | 模块选择器、搜索、提交按钮 | High |
| `SpaceSettings.tsx` | 模块开关列表、保存按钮 | High |
| `CreationCard.tsx` | 创作卡片操作 | Medium |
| `CherryEditor.tsx` | 编辑器工具栏提示 | Medium |
| `SpaceAnalytics.tsx` | 分析标签、图表说明 | Medium |

## Lib Files — Config/constants with Chinese

| File | Chinese Content |
|:-----|:---------------|
| `module-config.ts` | 28 module labels, emojis (just created in v0.4.1) |
| `api.ts` | Error messages, type comments |
| `utils.ts` | Minimal |
