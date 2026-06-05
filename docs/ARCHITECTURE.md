# Polis 架构设计

## 微服务清单

| 服务 | 端口 | Crate | 职责 |
|------|------|-------|------|
| **gateway** | 8080 | `polis-gateway` | API 网关 — 路由分发、限流、健康聚合 |
| **user** | 3001 | `polis-user` | 用户认证、注册、个人资料、密码重置 |
| **space** | 3002 | `polis-space` | 社区 CRUD、成员管理、模块配置、分析 |
| **content** | 3003 | `polis-content` | 帖子/评论/投票/收藏/通知/Feed |
| **search** | 3004 | `polis-search` | 全文搜索 |
| **admin** | 3050 | `polis-admin` | 管理后台 — 用户/空间/内容管理 |
| **video** | 3005 | `polis-video` | 视频上传、FFmpeg 转码、HLS 流 |
| **aggregate** | — | `polis-aggregate` | 内容聚合器 — 跨社区精选/热榜 |
| **notify** | — | `polis-notify` | 通知系统 |
| **chat** | — | `polis-chat` | 社区实时聊天 |
| **code** | — | `polis-code` | 代码仓库模块 |
| **store** | — | `polis-store` | 商城模块 |
| **pay** | — | `polis-pay` | 支付模块 |
| **export** | — | `polis-export` | 数据导出 |
| **plugin-engine** | — | `polis-plugin-engine` | 插件引擎 |

> 已部署 8 个服务: gateway, user, space, content, aggregate, admin, video, web (Next.js :3000)
> 其余 crate 为骨架代码或未部署

## 请求流

```
Nginx (:443 HTTPS)
  ├── /api/* → Gateway (:8080)
  │     ├── /api/auth/*     → User Service (:3001)
  │     ├── /api/users/*    → User Service (:3001)
  │     ├── /api/spaces/*   → Space Service (:3002)
  │     ├── /api/posts/*    → Content Service (:3003)
  │     ├── /api/feed       → Content Service (:3003)
  │     ├── /api/vote       → Content Service (:3003)
  │     ├── /api/admin/*    → Admin Service (:3050)
  │     └── /api/videos/*   → Video Service (:3005)
  └── /* → Next.js (:3000)
```

## 核心数据模型

### 引用驱动架构

```
Creation (作品)        — 唯一实体，归创作者所有
    ↓ 被引用
ModuleRef (引用/索引)  — 作品的指针，不拥有数据
    ↓ 出现在
Module (模块)          — 社区内的功能分区（交流/问答/知识库/视频...）
    ↓ 属于
Space (社区)           — 用户创建的社区
```

**类比**: `Creation` = Rust 堆上数据，`ModuleRef` = `&T` 引用，`Space` = 容器。

### 关键区别

- 社区创建者 ≠ 作品作者（可以是不同的人）
- 作品属于创作者，社区只持有引用
- 一个作品可被引用到多个社区的不同模块
- 修改作品 → 所有引用位置同步更新

## 权限架构

### OS → Disk → Folder → File 模型

```
登录用户 (@xxx)      → OS 系统用户
社区 (Space)          → 磁盘分区
模块 (Module)         → 文件夹
内容 (Post/File/…)    → 文件
```

### 核心原则

1. **内容归作者所有** — 社区只能控制展示/隐藏索引，不能修改/删除他人的内容
2. **模块 = 文件夹开关** — 关闭模块 = 过滤该类型的内容不展示
3. **空间控制索引** — 置顶/精选/隐藏都是索引操作，不修改内容本身
4. **模块设置持久化到服务器** — 不能仅用 localStorage

### 可见性层级

| 层级 | 可见范围 |
|------|---------|
| `public` | 所有人 |
| `space_member` | 仅社区成员 |
| `follower` | 仅关注者 |
| `private` | 仅作者 |
| `password` | 有密码者 |

## 编码规范

### Rust 后端
- API 返回统一格式: `{ code: int, data?: any, message: string }`
- 关键逻辑必须有错误处理，避免 `unwrap()`
- 网关代理函数使用 `path_and_query()` 而非 `path()` 以保留查询参数
- 公共路由放 `public` Router，需认证的路由放 `auth` Router
- 空间内路径通过 `parse_content_path` 统一解析

### TypeScript 前端
- 使用 Tailwind CSS + `dark:` 变体适配暗黑模式
- 组件使用 `'use client'` 指令
- 新增功能必须同时更新前端页面

### 数据库
- 所有变更通过 `migrations/` 下的 SQL 文件
- 禁止在生产环境执行破坏性操作（如 DROP TABLE）

## 模块类型

| 模块 | module_type | 说明 |
|------|-------------|------|
| 交流 | `forum` | 社区讨论帖 |
| 分享 | `share` | 链接/内容分享 |
| 知识库 | `wiki` | 协作文档 |
| 问答 | `qa` | 问答社区 |
| 投票 | `polls` | 投票和问卷 |
| 视频 | `video` | 视频内容 |
| 专栏 | `series` | 内容系列/合集 |
| 会员 | `membership` | 付费订阅 |
| 聊天 | `chat` | 实时聊天室 |
| 代码 | `code_repo` | 代码仓库 |
| 商店 | `store` | 商城 |
| 课程 | `course` | 在线课程 |
| 小说 | `novel` | 小说/阅读 |
| 游戏 | `game` | 游戏 |
| 小程序 | `mini_app` | 小程序 |
| 公告 | `announcements` | 社区公告 |
| 文件 | `files` | 文件分享 |
