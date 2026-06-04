<div align="center">

# 🏛️ Polis（πόλις）— 去中心化内容社区平台

**作品属于创作者，社区持有引用。像 Rust 所有权模型一样设计内容平台。**

**链上经济层：$POL 代币 · IBFT 共识 · XP 行为证明 · 大奖池炼金 · Proof-of-Luck 挖矿**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-green)](https://www.mzgw.com)

</div>

---

## 目录

1. [项目哲学与设计理念](#1-项目哲学与设计理念)
2. [项目全景概览](#2-项目全景概览)
3. [网站 — 社区平台完整使用指南](#3-网站--社区平台完整使用指南)
4. [Polis Chain — 区块链系统深度解析](#4-polis-chain--区块链系统深度解析)
5. [AI 命令行工具完整参考](#5-ai-命令行工具完整参考)
6. [技术架构深度剖析](#6-技术架构深度剖析)
7. [数据模型详解](#7-数据模型详解)
8. [安全模型](#8-安全模型)
9. [开发指南](#9-开发指南)
10. [部署指南](#10-部署指南)
11. [API 完整参考](#11-api-完整参考)
12. [配置参考](#12-配置参考)
13. [常见问题与故障排除](#13-常见问题与故障排除)
14. [文档索引](#14-文档索引)

---

## 1. 项目哲学与设计理念

### 1.1 核心问题

现代社交平台的核心矛盾是：**用户创造价值，平台捕获价值**。你发帖、互动、创作内容，产生的数据和社交资本被中心化公司垄断。你的身份和数据不属于你 — 它们属于运营数据库的那个实体。

Polis 解决这个问题的方法不是"把所有社交数据搬上区块链"（那既不经济也不必要），而是设计了三条并行的系统：

| 系统 | 类比 | 职责 |
|------|------|------|
| **社区平台 (Web + 微服务)** | 城市广场 | 用户在这里交流、创作、互动 |
| **Polis Chain** | 中央银行 + 公证处 | 记录行为证明、管理经济状态、维护社区信任 |
| **CLI 工具** | 瑞士军刀 | 自动化管理、AI 代理操作、开发者接口 |

### 1.2 Rust 所有权模型的社区化翻译

Polis 的核心架构可以用 Rust 的两个概念讲清楚：

```
Creation (作品)        ≈ 堆上数据 (Box<T>)    — 创作者拥有完全所有权
ModuleRef (社区引用)   ≈ 不可变引用 (&T)       — 社区借用作品，不拥有数据
Space (社区)           ≈ 容器 (Vec/Rc)         — 持有多个 ModuleRef
```

这在产品层面的含义：

| 场景 | 传统平台 | Polis |
|------|---------|-------|
| 在社区发帖 | 帖子属于社区 | 作品属于你，社区只是引用了它 |
| 社区删帖 | 帖子消失，你丢失内容 | 删除引用，作品还在你的创作者中心 |
| 转帖到多个社区 | 复制粘贴，各自独立 | 同一作品多社区引用，一改全改 |
| 社区创建者和作者 | 必须是同一个人 | 可以是不同的人（你可以在别人的社区发布你的作品） |
| 内容所有权 | 模糊 | 明确：创作者拥有作品，社区拥有引用 |

### 1.3 双维度 Feed

每条 Feed 同时携带两个维度的信息：

```
@rust_writer / Rust 技术前沿 / 交流 / Rust入门指南    ← 引用路径（在哪里看到）
原来这是一个大西瓜 · 0粉丝 · 2天前                        ← 创作者（谁写的）
```

- **第一个维度**（引用路径）：告诉你在哪里看到这条内容 — 社区创建者 / 社区名 / 模块 / 作品名
- **第二个维度**（创作者）：告诉你内容是谁写的 — 创作者、粉丝数、发布时间

传统平台只有后一个维度。Polis 同时展示两个维度，让你在信息流中同时感知"社区来源"和"创作者身份"。

---

## 2. 项目全景概览

### 2.1 仓库组成

```
polis-platform/
├── crates/                         # Rust 后端 (18 个 crate)
│   ├── polis-core/                 # 共享核心库 (models, error, config)
│   ├── polis-gateway/              # API 网关 (已部署)
│   ├── polis-user/                 # 用户服务 (已部署)
│   ├── polis-space/                # 社区服务 (已部署)
│   ├── polis-content/              # 内容服务 (已部署)
│   ├── polis-video/                # 视频服务 (已部署)
│   ├── polis-admin/                # 管理后台 (已部署)
│   ├── polis-chain/                # 区块链节点 (独立部署)
│   ├── polisctl/                   # CLI 管理工具
│   ├── polis-chat/                 # 聊天服务 (骨架)
│   ├── polis-code/                 # 代码仓库 (骨架)
│   ├── polis-store/                # 商城 (骨架)
│   ├── polis-pay/                  # 支付 (骨架)
│   ├── polis-search/               # 搜索服务 (骨架)
│   ├── polis-aggregate/            # 聚合器 (骨架)
│   ├── polis-notify/               # 通知 (骨架)
│   ├── polis-export/               # 数据导出 (骨架)
│   └── polis-plugin-engine/        # 插件引擎 (骨架)
├── web/                            # Next.js 14 前端 (50+ 页面路由)
├── docs/                           # 文档体系
├── migrations/                     # 数据库迁移 (36+ 迁移文件)
└── scripts/                        # 运维/诊断脚本
```

### 2.2 快速导航

| 你想要... | 去这里 |
|-----------|--------|
| 注册账号、使用社区功能 | [§3 网站使用指南](#3-网站--社区平台完整使用指南) |
| 了解区块链、挖矿、代币 | [§4 Polis Chain](#4-polis-chain--区块链系统深度解析) |
| 用命令行操作平台 | [§5.1 polisctl CLI](#51-polisctl--平台管理-cli) |
| 管理区块链节点和钱包 | [§5.2 polis-chain CLI](#52-polis-chain-cli--区块链节点与钱包) |
| 理解技术架构 | [§6 技术架构](#6-技术架构深度剖析) |
| 本地开发 | [§9 开发指南](#9-开发指南) |
| 部署到服务器 | [§10 部署指南](#10-部署指南) |
| 查找 API | [§11 API 参考](#11-api-完整参考) |

---

## 3. 网站 — 社区平台完整使用指南

在线地址：**[https://www.mzgw.com](https://www.mzgw.com)**

### 3.1 注册与登录

#### 注册流程

1. 访问 [www.mzgw.com](https://www.mzgw.com)，点击右上角 **「注册」** 按钮
2. 填写表单：
   - **用户名** (username)：3-30 个字符，字母数字和下划线，全站唯一
   - **邮箱** (email)：用于密码重置和通知
   - **密码** (password)：最少 8 个字符
   - **显示名称** (display_name)：可选，对外展示的名字
3. 点击注册，系统自动完成：
   - 创建用户记录（PostgreSQL `users` 表）
   - Argon2 哈希密码存储（不存明文）
   - 生成 JWT access token（24 小时有效期）
   - 自动登录并跳转到首页

#### 登录流程

1. 点击 **「登录」**，输入邮箱和密码
2. 系统验证 Argon2 密码哈希
3. 返回 JWT token，存储在浏览器 localStorage
4. 后续请求自动携带 `Authorization: Bearer <token>` 头

#### 密码重置

```
忘记密码 → 输入注册邮箱 → 系统生成重置 token (30 分钟有效)
  → 发送重置链接到邮箱 → 点击链接 → 输入新密码 → 完成重置
```

> 注意：如果邮箱未注册，系统不会报错（防止邮箱枚举攻击），而是显示"如果该邮箱已注册，重置链接已发送"。

#### 邀请码注册

系统支持邀请码机制：
- 已注册用户可以在设置页面生成邀请码
- 新用户使用邀请码注册：`POST /api/auth/redeem-invite`
- 邀请人和被邀请人都可获得 XP 奖励

### 3.2 社区系统

Polis 的社区系统是其最核心的差异化功能。社区不是内容的容器，而是**内容的引用网络**。

#### 3.2.1 命名空间（Namespace）

每个社区有一个唯一的命名空间，格式为 `创建者/社区名`：

```
alice/rust学习小组        ← alice 创建的 Rust 学习社区
bob/摄影爱好者             ← bob 创建的摄影社区
alice/typescript进阶       ← alice 创建的另一个社区（同一人可以创建多个社区）
```

命名空间规则：
- 只能包含小写字母、数字、连字符、下划线
- 创建后不可更改
- 用于 URL 路由：`/space/alice/rust学习小组`

#### 3.2.2 社区可见性

| 可见性 | 含义 | 访问控制 |
|--------|------|----------|
| **public**（公开） | 任何人可浏览、搜索 | 无需登录 |
| **private**（私有） | 仅成员可浏览 | 需要密码加入 |
| **unlisted**（不公开） | 有链接才能访问 | 不显示在搜索和 Trending 中 |

#### 3.2.3 创建社区

创建步骤：
1. 登录后点击导航栏「创建社区」
2. 填写基本信息：
   - **命名空间**（必填）：如 `myname/tech-notes`
   - **社区名称**（必填）：显示名称，支持中文
   - **描述**（可选）：社区简介，会显示在社区首页
   - **可见性**：public / private / unlisted
   - **图标**（可选）：社区头像
   - **横幅**（可选）：社区顶部背景图
   - **密码**（可选）：设置后，加入社区需要密码
3. **选择模块**：从 16 种模块中勾选需要的（可后续增减）：
   - 交流 (Discussion)、问答 (Q&A)、知识库 (Wiki)、视频 (Video)
   - 分享 (Share)、投票 (Poll)、公告 (Announcement)、聊天 (Chat)
   - 商城 (Shop)、课程 (Course)、小说 (Novel)、游戏 (Game)
   - 代码仓库 (Code)、小程序 (Mini App)、系列 (Series)、会员 (Membership)
4. 创建完成 → 自动跳转到社区主页

#### 3.2.4 社区管理

社区创建者拥有完整的管理权限：

**成员管理**：
- 角色体系：创始人 (Founder) > 管理员 (Admin) > 版主 (Moderator) > 成员 (Member)
- 邀请成员、审核加入申请
- 移除成员、封禁用户
- 设置模块级权限（版主只能管理指定模块）

**模块管理**：
- 增删模块、调整顺序
- 每个模块可设置独立的版主
- 模块可见性控制

**数据分析**：
- 成员增长趋势图
- 内容活跃度统计（发帖量、评论量、浏览量）
- 热门内容排行

**等级系统**：
- 社区经验值 (Community XP)，独立于全局 XP
- Lv.1 ~ Lv.6 共 6 个等级
- 等级影响社区内权限和标识

### 3.3 内容创作系统

#### 3.3.1 两个发布入口（不可合并的设计决策）

这是 Polis 最精妙的设计之一，强烈建议理解其用意：

| 入口 | 路由 | 设计意图 |
|------|------|----------|
| **创作者中心** | `/creations` → 新建 → 选择投稿社区 | 以"我"为中心：先创作，再分发。适合个人创作者、独立作者 |
| **社区模块页** | 进入社区 → 某模块 → 发布按钮 | 以"场景"为中心：在特定社区环境下创作。适合社区活跃成员 |

**为什么不可合并？**

两个入口代表了两种完全不同的创作心智模型：
- **创作者中心路线**：你想写一篇 Rust 教程 → 在创作者中心写完 → 决定投稿到"Rust 技术前沿"和"程序员日常"两个社区。你的身份是"独立创作者"。
- **社区模块路线**：你在"Rust 技术前沿"社区浏览 → 看到有人在讨论异步编程 → 想发一篇回复/教程 → 直接在场景中创作。你的身份是"社区参与者"。

URL 参数：`/creations/new?space=alice/rust-club&module=forum`
→ 创作页自动预填社区和模块，但仍可追加其他社区。

#### 3.3.2 Cherry Markdown 编辑器

- **语法支持**：标准 Markdown + GFM 扩展（表格、任务列表、删除线）
- **代码高亮**：支持 180+ 编程语言的语法高亮
- **数学公式**：LaTeX 数学公式渲染（KaTeX）
- **图表**：Mermaid 流程图、序列图、甘特图
- **图片**：拖拽上传、粘贴上传、自动压缩
- **实时预览**：左右分栏，编辑即时预览
- **自动保存**：草稿自动保存到 localStorage，防止丢失

#### 3.3.3 内容类型详解

**交流帖子 (Discussion)**：标准社区讨论贴，支持 Markdown，评论嵌套 3 层。

**问答 (Q&A)**：
- 提问者发布问题 → 社区成员回答
- 提问者可标记"已采纳"答案
- 采纳的答案置顶显示
- 回答按赞同数排序

**知识库 (Wiki)**：
- 多人协作编辑的文档系统
- 版本历史追踪
- 支持目录结构组织
- 适合社区共建知识体系

**视频 (Video)**：
- 上传视频文件 → FFmpeg 自动转码 → HLS 自适应码率流播放
- 支持格式：MP4, MOV, AVI, WebM
- 服务端自动生成缩略图
- 播放进度记忆

**投票 (Poll)**：
- 单选 / 多选模式
- 截止时间设置
- 实时结果显示
- 投票后可见（防羊群效应）

**小说 (Novel)**：
- 章节目录管理
- 阅读进度追踪
- 字数统计
- 连续阅读模式

**系列 (Series)**：
- 多篇文章组成系列合集
- 序列导航（上一篇/下一篇）
- 统一目录页

#### 3.3.4 多社区投稿机制

这是 Polis 的基础设施级差异化能力：

```
一篇作品 (Creation)
    ├── ModuleRef → alice/rust-club/forum          (在 Rust 俱乐部的交流模块)
    ├── ModuleRef → bob/programming/wiki            (在编程社区的知识库)
    └── ModuleRef → carol/tech-notes/discussion     (在技术笔记的讨论区)
```

核心保证：
- **修改同步**：在任一位置编辑 → 所有引用位置同步更新
- **数据聚合**：所有引用位置的点赞、评论、浏览量回馈到作品本身
- **独立管理**：每个社区的版主可以独立管理自己社区的引用（隐藏、置顶等），不影响其他社区
- **创作者控制**：创作者可以撤回任意社区的投稿（删除那个引用），但作品本体保留

### 3.4 社交互动系统

| 功能 | 说明 | 技术实现 |
|------|------|----------|
| **评论** | 支持嵌套回复，最多 3 层 | `comments` 表，`parent_id` 自引用 |
| **点赞** | 对帖子/评论点赞（可取消） | `likes` 表，唯一约束防重复 |
| **收藏** | 个人书签，支持分类 | `bookmarks` 表，关联用户和作品 |
| **关注** | 关注用户/社区 | `follows` 表，`followee_type` 区分 |
| **投票** | 参与社区问卷 | `poll_votes` 表，一人一票 |
| **私信** | 用户间 1v1 即时消息 | `messages` 表，WebSocket 推送 |
| **通知** | 点赞/评论/关注/系统通知 | `notifications` 表，支持标记已读 |
| **打赏** | 向创作者转账 $POL | Polis Chain TokenTransfer 交易 |

### 3.5 创作者中心

路径：`/creations`

创作者的统一工作台：

- **作品管理**：列表视图，筛选（已发布/草稿/已投稿/已撤回）
- **数据统计**：每篇作品的浏览量、点赞数、评论数、收藏数
- **草稿箱**：自动保存的草稿，可继续编辑
- **投稿管理**：查看投稿状态，撤回投稿
- **数据导出**：
  - Markdown 格式（保留原始排版）
  - JSON 格式（结构化数据，便于迁移）
- **批量操作**：批量投稿、批量撤回

### 3.6 个人主页与设置

#### 个人主页 (`/profile/{username}`)

- **基本信息区**：头像、显示名、简介、认证标识
- **数据面板**：作品数、粉丝数、关注数、总获赞数
- **XP 展示**：等级、XP 进度条、徽章墙
- **作品列表**：Tab 切换（作品 / 系列 / 收藏）
- **钱包信息**：如果绑定了链上钱包，显示 $POL 余额和稀有币
- **链上地址**：绑定钱包后显示 `0xPOL_...` 地址

#### 设置页面 (`/settings`)

- **个人资料**：修改显示名、头像、简介、个人网站
- **账号安全**：修改密码、查看登录历史
- **通知偏好**：开关各类通知（点赞/评论/关注/系统/邮件）
- **钱包绑定**：查看绑定状态、解绑
- **邀请码**：生成、查看已使用情况
- **外观**：深色模式 / 浅色模式 / 跟随系统
- **语言**：24 种语言切换（基于 next-intl）

### 3.7 搜索与发现

#### 全局搜索

路径：`/search?q=关键词`

三 Tab 搜索结果：

| Tab | 搜索范围 | 搜索字段 |
|-----|---------|---------|
| **社区** | 所有公开社区 | 名称、命名空间、描述 |
| **帖子** | 所有公开帖子 | 标题、内容全文 |
| **用户** | 所有用户 | 用户名、显示名、简介 |

搜索后端：PostgreSQL `ILIKE` + `tsvector` 全文搜索

#### 发现页面

- `/trending` — 热门内容趋势：
  - 热门社区（按成员增长）
  - 热门帖子（按近期互动量）
  - 热门创作者（按作品获赞数）
- `/research` — AI 自动研究报告：AI Agent 定期抓取社区数据，生成分析报告
- `/changelog` — 更新日志：按时间倒序的版本历史

---

## 4. Polis Chain — 区块链系统深度解析

### 4.1 设计定位

Polis Chain 不是通用 L1（如以太坊），而是一条**专为社交数据主权和经济激励设计的应用链 (Appchain)**。

| 维度 | 通用链（以太坊） | Polis Chain |
|------|-----------------|-------------|
| 目标 | 运行任意智能合约 | 记录社交行为证明 + 管理社区经济 |
| 数据存储 | 所有状态上链 | 只存证明和资产，内容存在 Polis 站点 |
| 共识 | PoS（权益证明） | IBFT PoA（权威证明） |
| 代币 | 支付 Gas + 投机 | 行为激励 + 社区治理 |
| 智能合约 | 图灵完备 | 内置交易类型（9 种），不可编程 |
| 吞吐量 | 全网共享 | 应用链专用，不与其他应用争抢 |

**核心理念：锚定而非存储** — 链不存储你的帖子内容，只存储行为证明和经济状态。内容和社交逻辑仍由 Polis 站点处理，链负责经济层的不可篡改性。

### 4.2 系统架构全景

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Polis 社区站点                                 │
│  用户在前端发帖/评论/互动 → Content Service 处理                      │
│  → XpBridge 发 XP 到 User Service + 提交 ActivityProof 到链           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ ActivityProof (HTTP + Ed25519 签名)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Polis Chain 节点                                  │
│                                                                      │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │    HTTP API      │  │    P2P 网络层      │  │  IBFT 共识引擎   │  │
│  │    (axum :8545)  │  │   (libp2p :9732)  │  │  (PoA + 投票)    │  │
│  │                  │  │                    │  │                  │  │
│  │ 26+ REST 端点    │  │ Gossipsub 广播     │  │ Idle → PrePre-  │  │
│  │ 交易/区块/挖矿   │  │ Kademlia DHT 发现  │  │ pared → Prepar- │  │
│  │ 钱包/站点/奖池   │  │ mDNS 局域网发现    │  │ ed → Committed  │  │
│  │                  │  │ Request/Response   │  │ → RoundChange   │  │
│  └────────┬─────────┘  └────────┬──────────┘  └────────┬─────────┘  │
│           │                     │                       │            │
│           └─────────────────────┼───────────────────────┘            │
│                                 │                                    │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │                ConsensusBridge (事件驱动胶水层)                  │  │
│  │   P2P 收到 PrePrepare/Prepare/Commit/RoundChange               │  │
│  │   → 转发到共识引擎 → 共识引擎决策 → 广播回复 → 执行/回滚        │  │
│  └──────────────────────────────┼────────────────────────────────┘  │
│                                 │                                    │
│  ┌───────────────┬──────────────┼───────────────┬──────────────────┐ │
│  │   Mempool     │  挖矿引擎     │  大奖池        │  安全模块         │ │
│  │  交易排序/去重 │  XP加权抽奖   │  $POL众筹销毁  │  站点注册+信誉    │ │
│  │  nonce校验    │  SHA-256 VRF  │  稀有币铸造    │  罚没引擎        │ │
│  │  防重放攻击   │  每小时一轮    │  按存款权重分配│  行为异常检测    │ │
│  └───────────────┴──────────────┼───────────────┴──────────────────┘ │
│                                 │                                    │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │                RocksDB 存储层 (11 个 Column Family)            │  │
│  │                                                                │  │
│  │  Blocks │ Transactions │ AccountState │ Activities           │  │
│  │  Mining │ Pool │ Sites │ Validators │ Config │ Meta          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 IBFT 共识引擎详解

#### 4.3.1 为什么选 IBFT 而不是 PoW/PoS？

| 共识 | 优点 | 缺点 | 适合 Polis? |
|------|------|------|------------|
| **PoW** (工作量证明) | 去中心化程度高 | 能源浪费、吞吐量低、最终确认慢 | ❌ 不需要 |
| **PoS** (权益证明) | 节能、可扩展 | 富者愈富、复杂 | ❌ 过于复杂 |
| **IBFT** (伊斯坦布尔 BFT) | 即时终局、无分叉、低延迟 | 需要预授权验证者 | ✅ 完美匹配 |

Polis 的验证者由社区信任的节点运营（如站点运营者）。IBFT 提供即时终局（区块一旦提交就不会被回滚），这对经济活动（XP 发放、代币转账）非常重要。

#### 4.3.2 共识阶段状态机

```
                    ┌─────────┐
                    │  Idle   │  ← 等待新区块提案
                    └────┬────┘
                         │ 提议者创建候选区块 → 广播 PrePrepare
                         ▼
                   ┌───────────┐
                   │PrePrepared│  ← 验证区块合法性
                   └─────┬─────┘
                         │ 收集 ≥ 2/3 Prepare 投票
                         ▼
                   ┌───────────┐
                   │ Prepared  │  ← 锁定区块 (不会为其他区块投票)
                   └─────┬─────┘
                         │ 收集 ≥ 2/3 Commit 投票
                         ▼
                   ┌───────────┐
                   │ Committed │  ← 区块最终确定 → 执行交易 → 写入 RocksDB → 重置到 Idle
                   └───────────┘

     任何时候超时 (未在规定时间内收到足够投票):
     任意阶段 ──→ RoundChange → 增加 round → 重新选举提议者 → Idle
```

#### 4.3.3 共识消息类型

| 消息 | 发送者 | 内容 | 触发条件 |
|------|--------|------|---------|
| **PrePrepare** | 当前轮次提议者 | 完整区块 (Block) | 提议者轮到出块 |
| **Prepare** | 所有验证者 | 区块哈希 + Ed25519 签名 | 验证 PrePrepare 合法 |
| **Commit** | 所有验证者 | 区块哈希 + Ed25519 签名 | 收集到 ≥ 2/3 Prepare |
| **RoundChange** | 任何验证者 | 当前 Height + Round | 超时未达成共识 |

#### 4.3.4 验证者集合管理

```rust
pub struct ValidatorInfo {
    pub address: String,           // 钱包地址 (0xPOL_...)
    pub public_key: Vec<u8>,       // Ed25519 公钥 (32 字节)
    pub site_id: Option<String>,   // 关联的站点 ID
    pub stake_amount: u64,         // 质押 $POL 数量 (最低 1,000)
    pub joined_at: u64,            // 加入时间戳
    pub reputation: u32,           // 信誉分 (0-100)
    pub is_active: bool,           // 是否活跃
}
```

- 验证者轮换 (Round Robin) 提议区块：`proposer = validators[(height + round) % len]`
- 法定人数 (Quorum)：`⌊2F + 1⌋` 其中 F = `⌊(N-1)/3⌋`（标准 BFT 容错）
- 最多 21 个验证者
- 最少质押 1,000 $POL 才能成为验证者
- 验证者 epoch：24 小时（每个 epoch 结束时重新计算验证者集合）

### 4.4 区块结构

```rust
pub struct Block {
    pub header: BlockHeader,                 // 区块头
    pub transactions: Vec<SignedTransaction>, // 交易列表
}

pub struct BlockHeader {
    pub number: u64,           // 区块高度（从 0 开始）
    pub parent_hash: [u8; 32], // 父区块哈希
    pub state_root: [u8; 32],  // 状态 Merkle 根
    pub tx_root: [u8; 32],     // 交易 Merkle 根
    pub timestamp: u64,        // Unix 时间戳（秒）
    pub proposer: String,      // 提议者地址
    pub round: u64,            // 共识轮次
    pub commits: Vec<CommitSeal>, // Commit 投票集合
}

pub struct CommitSeal {
    pub validator: String,          // 验证者地址
    pub block_hash: [u8; 32],       // 确认的区块哈希
    pub signature: [u8; 64],     // Ed25519 签名
}
```

### 4.5 交易类型 (9 种)

Polis Chain 不运行智能合约，而是内置 9 种预定义交易类型。这避免了智能合约的安全风险，同时覆盖了社交经济所需的所有操作。

| # | 交易类型 | 变体名 | 触发者 | 说明 |
|---|---------|--------|--------|------|
| 1 | **SiteRegister** | `site_register` | 站点运营者 | 注册站点，提交域名和公钥 |
| 2 | **ActivityProof** | `activity_proof` | 站点 | 用户在站点的行为证明（核心交易） |
| 3 | **MiningTicket** | `mining_ticket` | 用户 | 购买挖矿票参与抽奖 |
| 4 | **MiningReward** | `mining_reward` | 系统 | 挖矿奖励分配（系统自动生成） |
| 5 | **TokenTransfer** | `token_transfer` | 用户 | $POL 代币转账 |
| 6 | **PoolDeposit** | `pool_deposit` | 用户 | 投入 $POL 到奖池 |
| 7 | **PoolAlchemy** | `pool_alchemy` | 系统 | 炼金：销毁 $POL，铸造稀有币（系统自动生成） |
| 8 | **ValidatorStake** | `validator_stake` | 用户 | 质押 $POL 成为验证者 |
| 9 | **ValidatorUnstake** | `validator_unstake` | 用户 | 解除质押，退出验证者集合 |

#### 签名交易结构

```rust
pub struct SignedTransaction {
    pub tx: Transaction,        // 交易体（9 种变体之一）
    pub signer: String,         // 签名者地址
    pub signature: Vec<u8>,     // Ed25519 签名 (64 字节)
    pub hash: [u8; 32],         // 交易哈希 = SHA256(bincode(tx) || signer)
}
```

签名验证流程：
1. 反序列化交易 → 获取 `expected_signer()`
2. 重建哈希 `compute_hash_with_signer(tx, signer)`
3. 用签名者公钥验证 Ed25519 签名
4. 验证 nonce 单调递增（防重放）

### 4.6 挖矿机制 (Proof-of-Luck)

#### 4.6.1 核心原理

Polis 的"挖矿"不需要算力。它是 **XP 加权随机抽奖**，称为 Proof-of-Luck（运气证明）。

```
用户在平台活跃 (发帖/评论/互动/创作)
         │
         ▼
  Content Service → XpBridge → User Service 发放 XP
         │
         ▼
  XP 记入链上 AccountState.available_xp
         │
         ▼
  每小时的挖矿轮次自动收集所有 available_xp ≥ min_xp 的账户
         │
         ▼
  SHA-256 哈希链 VRF 加权抽奖 → 按 50%/30%/20% 分配 40 $POL
         │
         ▼
  中奖者获得 $POL → 所有参与者的 available_xp 归零
```

#### 4.6.2 为什么叫 Proof-of-Luck 而不是 PoW？

PoW 矿工投入电力换取区块奖励，运气差的矿工可能永远挖不到区块。Polis 将此模型改进：
- **投入的不是电力，是社交活跃度 (XP)**
- **不是竞争出块权，是竞争每小时的固定奖励**
- **数学保证**：XP 越高，中奖概率越高（加权抽奖）
- **确定性可验证**：SHA-256 哈希链种子 = 任何人都可以重放验证结果

#### 4.6.3 抽奖算法（可验证随机函数）

```rust
// 1. 生成种子
seed = SHA256(prev_block_hash || round_id || end_time || merkle_root)

// 2. 加权抽奖（累积分布法）
fn select_weighted_winners(seed, participants, winner_count):
    total_xp = sum(p.xp for p in participants)
    
    for i in 0..winner_count:
        // 哈希链扩展随机数
        rng = SHA256(seed || i.to_be_bytes())
        target = first_8_bytes(rng) % total_xp
        
        // 累积分布选取
        cumulative = 0
        for (idx, participant) in enumerate(participants):
            cumulative += participant.xp
            if cumulative > target and idx not in used:
                winners.append(idx)
                break
```

#### 4.6.4 挖矿轮次参数

| 参数 | 值 | 代码位置 |
|------|-----|---------|
| 轮次周期 | 3600 秒 (1 小时) | `ChainConfig.mining_round_secs` |
| 每轮总奖励 | 40 $POL | `ChainConfig.mining_reward` |
| 中奖比例 | 10%（参与人数 × 10% = 中奖人数） | `ChainConfig.winner_percentage` |
| 最少参与者 | 1 人（无参与者则轮次跳过） | — |
| 参与门槛 | 1 XP | `ChainConfig.min_xp_to_participate` |
| 奖励分配 | 50% / 30% / 20% | `settle_round()` 硬编码 |
| 随机算法 | SHA-256 哈希链 | `lottery::select_weighted_winners()` |
| XP 消耗 | 参与即清零 available_xp | `settle_round()` 步骤 5 |
| total_xp | 永久保留（累计记录） | 不清零 |

#### 4.6.5 示例

假设当前轮次有 5 个参与者：

| 地址 | available_xp | 权重 |
|------|-------------|------|
| UserA | 500 XP | 50% |
| UserB | 200 XP | 20% |
| UserC | 150 XP | 15% |
| UserD | 100 XP | 10% |
| UserE | 50 XP | 5% |
| **总计** | **1000 XP** | **100%** |

中奖人数 = max(1, 5 × 10%) = 1 人

UserA 有 50% 概率中奖（500/1000），UserE 只有 5% 概率（50/1000）。

结算后：
- 中奖者获得 20 $POL（50% × 40，本轮只有一个中奖者，但奖励分配仍是 50/30/20 比例，实际只分配给中奖的 1 人）
- 所有 5 人 `available_xp` 归零
- UserA `total_xp` = 500（保留），`available_xp` = 0
- UserE `total_xp` = 50（保留），`available_xp` = 0

### 4.7 大奖池与炼金机制

#### 4.7.1 流程

```
$POL 代币 → 存入大奖池 (PoolDeposit 交易)
                         │
                         ▼
              奖池余额累积 (current_amount)
                         │
                         ▼
              达到 100,000 $POL (target_amount)
                         │
                         ▼
              ⚗️ 触发炼金 (PoolAlchemy 系统交易)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   100,000 $POL 销毁   铸造稀有币    按存款权重抽奖
   (链上不可逆)      1金 2银 3铜    分配稀有币给存款者
```

#### 4.7.2 稀有币 (Premium Coins)

| 类型 | 每轮铸造数量 | 标识 | 权重（获得概率） |
|------|------------|------|-----------------|
| **金 (Gold)** | 1 | 🥇 | 最高，按存款额占比 |
| **银 (Silver)** | 2 | 🥈 | 中等 |
| **铜 (Bronze)** | 3 | 🥉 | 较低 |

- 稀有币是链上 NFT（通过 `MintedPremiumCoin` 结构记录）
- 可转让（TokenTransfer）、可在个人主页展示
- 序列号全局唯一递增（第 1 枚金币 = Gold #1）
- 是社区地位的象征，不是投机资产

#### 4.7.3 奖池状态

```rust
pub struct PoolState {
    pub pool_id: String,                // 当前池子 ID (如 "pool-1")
    pub current_amount: u64,            // 当前累积量
    pub target_amount: u64,             // 目标: 100,000 $POL
    pub deposited_count: u32,           // 投入人次
    pub top_depositors: Vec<DepositorEntry>,  // 投入排行
    pub created_at: u64,
}
```

Web 钱包查看：`/wallet/pool`

### 4.8 Web 钱包系统

#### 4.8.1 钱包页面一览

| 页面 | 路由 | 功能 |
|------|------|------|
| **创建钱包** | `/wallet/create` | 生成 Ed25519 密钥对，密码加密存储 |
| **导入钱包** | `/wallet/create?import=true` | 从 hex 私钥导入已有钱包 |
| **钱包概览** | `/wallet` | 余额、XP、稀有币、地址、最近交易 |
| **挖矿中心** | `/wallet/mining` | 当前轮次、倒计时、参与者列表、中奖历史 |
| **大奖池** | `/wallet/pool` | 存 $POL 进奖池、查看进度、存款排行 |
| **交易记录** | `/wallet/transactions` | 所有交易的列表和详情 |
| **绑定账号** | `/wallet/bind` | 将链上钱包绑定到 Polis 平台用户账号 |

#### 4.8.2 钱包创建与安全

创建流程：
1. 用户输入密码
2. 浏览器端使用 Web Crypto API 生成 Ed25519 密钥对
3. 派生地址：`"0xPOL_" + hex(SHA256(pubkey)[..20])`
4. 使用 Argon2id 从密码派生加密密钥
5. XOR 加密私钥 → 存入 localStorage (`polis_wallet_encrypted_key`)
6. 公钥和地址 → 存入 localStorage (`polis_wallet_address`, `polis_wallet_public_key`)

> 安全说明：Web 钱包私钥在浏览器端加密存储，不经过服务器。所有签名操作在客户端执行。

#### 4.8.3 钱包绑定流程（完整步骤）

这是连接"平台账号 (user_id)"和"链上钱包地址 (0xPOL_...)"的桥：

```
Step 1: 用户 → POST /api/users/me/bind-wallet/challenge { address: "0xPOL_abc123..." }
        服务端 → 验证地址格式 → 检查未被其他用户绑定
               → 生成 nonce: "Bind 0xPOL_abc123... to Polis user <uuid>: <random_hex>"
               → 返回 nonce（存入内存 HashMap，5 分钟过期）

Step 2: 用户 → polis-chain wallet sign --data "<nonce>"
        CLI → 解密本地私钥 → Ed25519 签名 nonce → 输出 signature_hex

Step 3: 用户 → POST /api/users/me/bind-wallet/verify {
           address, public_key_hex, nonce, signature_hex
        }
        服务端 → 解码公钥 → 验证 address = "0xPOL_" + hex(SHA256(pubkey)[..20])
               → 查 nonce 是否有效且未过期 → 验证 user_id 匹配
               → Ed25519 验证签名 → 通过后 UPDATE users SET chain_address
```

### 4.9 多站点架构

Polis 设计为多站点网络。任何人都可以部署自己的 Polis 站点，注册到 Polis Chain 上。

#### 4.9.1 站点身份

```rust
pub struct SiteInfo {
    pub site_id: String,            // SHA256(domain) — 域名哈希作为唯一标识
    pub domain: String,             // 站点域名
    pub site_name: String,          // 站点名称
    pub admin_address: String,      // 管理员钱包地址
    pub registered_at: u64,         // 注册区块高度
    pub reputation_score: u32,      // 信誉分 (0-100, 初始 100)
    pub is_active: bool,            // 活跃状态 (低于 30 分自动停用)
    pub public_key: Option<Vec<u8>>, // Ed25519 公钥 (站点用此签名 ActivityProof)
}
```

#### 4.9.2 跨站点 XP 隔离

不同站点的同一用户，XP 天然隔离：

```
user_ref = SHA256(site_id + ":" + username)
```

这意味着：
- 在站点 A 获得的 XP 与站点 B 独立计算
- 但都锚定到同一条 Polis Chain
- 用户的链上钱包地址是跨站点统一的

#### 4.9.3 XpBridge 架构

```
Polis Content Service (crates/polis-content)
    │
    ├── 用户发帖/评论/互动
    │
    ├── XpBridge.award_xp(user_id, action_type, description)
    │       │
    │       ├──→ POST /api/internal/xp/award (User Service, 非阻塞)
    │       │    发放 XP 到平台数据库
    │       │
    │       └──→ POST /api/v1/activities (Polis Chain, 非阻塞)
    │            提交 ActivityProof 链上存证
    │            message = "POLIS_ACTIVITY:{site_id}:{user_ref}:{xp_value}:{nonce}"
    │            Ed25519 签名 (使用站点私钥)
```

### 4.10 P2P 网络层

Polis Chain 使用 libp2p 构建去中心化 P2P 网络：

| 协议 | 用途 | 端口 |
|------|------|------|
| **TCP + Noise** | 加密传输层 | 9732 |
| **Yamux** | 多路复用（单连接多流） | — |
| **Gossipsub** | 共识消息广播（PrePrepare/Prepare/Commit/RoundChange） | — |
| **Kademlia DHT** | 节点发现（分布式哈希表） | — |
| **mDNS** | 局域网节点自动发现 | — |
| **Identify** | 节点身份交换 | — |
| **Ping** | 节点心跳检测 | — |
| **Request/Response** | 区块同步（请求缺失的区块） | — |

#### 多节点启动

```bash
# 节点 1 — 创世验证者 (启动链)
CHAIN_MODE=validator CHAIN_IS_GENESIS=true \
  CHAIN_P2P_PORT=9732 CHAIN_API_PORT=8545 \
  polis-chain run

# 节点 2 — 全节点 (从创世节点同步)
CHAIN_MODE=full \
  CHAIN_P2P_PORT=9733 CHAIN_API_PORT=8546 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run

# 节点 3 — 验证者节点
CHAIN_MODE=validator \
  CHAIN_P2P_PORT=9734 CHAIN_API_PORT=8547 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run

# 节点 4 — 另一个全节点
CHAIN_MODE=full \
  CHAIN_P2P_PORT=9735 CHAIN_API_PORT=8548 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run
```

### 4.11 安全模块

#### 信誉系统

- 站点初始信誉分 = 100
- 异常行为检测 → 扣分
- 低于 30 分 → 自动停用
- 可以通过重新激活流程恢复（需要信誉分 ≥ 30）

#### 罚没引擎 (Slashing)

检测的违规行为：
- 验证者双重签名（同一高度签名两个不同区块）
- 站点提交虚假 ActivityProof
- 验证者长时间离线

处罚措施：
- 扣除质押的 $POL
- 降低信誉分
- 严重违规 → 移出验证者集合

---

## 5. AI 命令行工具完整参考

### 5.1 polisctl — 平台管理 CLI

`polisctl` 是 Polis 社区平台的命令行管理工具，专为 AI Agent 和自动化脚本设计。

#### 安装

```bash
# 从源码编译
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# 验证安装
polisctl --version
```

#### 配置

```bash
# 设置 JSON 输出模式（强烈推荐，便于解析）
export POLIS_FORMAT=json

# 设置服务器地址
export POLIS_BASE_URL=https://www.mzgw.com

# 会话状态保存在 ~/.polis/
#   ~/.polis/token        — JWT access token
#   ~/.polis/user         — 当前登录用户名
#   ~/.polis/admin_token  — 管理员 JWT token
```

#### 命令完整参考

##### Auth（认证模块）

```bash
# 注册新账号
polisctl auth register <username> <email> <password> [display_name]
# 示例: polisctl auth register mybot bot@test.com pass123 "我的机器人"

# 登录
polisctl auth login <email> <password>
# 示例: polisctl auth login bot@test.com pass123

# 查看当前登录用户
polisctl auth whoami
# 输出: {"username":"mybot","email":"bot@test.com",...}

# 登出（清除本地 token）
polisctl auth logout

# 获取 JWT token（用于 curl 等工具）
polisctl auth token
# 输出: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# 使用: TOKEN=$(polisctl auth token)
#       curl -H "Authorization: Bearer $TOKEN" https://www.mzgw.com/api/users/me
```

##### Profile（个人资料）

```bash
# 查看用户主页
polisctl profile get <username>
# 示例: polisctl profile get alice

# 更新个人资料
polisctl profile update --display-name "新名字" --bio "新的个人简介"
```

##### Space（社区管理）

```bash
# 创建社区
polisctl space create <namespace> <name> <description> <visibility>
# 示例: polisctl space create myname/tech "技术分享" "技术爱好者社区" public

# 查看社区详情
polisctl space info <namespace>
# 示例: polisctl space info myname/tech

# 搜索社区
polisctl space search <keyword>
# 示例: polisctl space search "Rust"

# 更新社区设置
polisctl space update <namespace> --name "新名称" --description "新描述"

# 获取社区成员
polisctl space members <namespace>

# 获取社区模块
polisctl space modules <namespace>
```

##### Post（内容发布）

```bash
# 发布帖子
polisctl post create <namespace> <title> <content>
# 示例: polisctl post create myname/tech "Rust学习笔记" "## 所有权\n\nRust的所有权系统..."

# 列出社区的帖子
polisctl post list <namespace> [--limit 20]

# 查看帖子详情
polisctl post get <post_id>

# 搜索帖子
polisctl post search <keyword> [--limit 20]

# 发表评论
polisctl post comment <post_id> <content>
# 示例: polisctl post comment abc123 "写得很好！"

# 回复评论
polisctl post reply <comment_id> <content>
```

##### Social（社交互动）

```bash
# 关注用户
polisctl follow user <user_id>
# 示例: polisctl follow user f4ed3378-a562-4be6-8447-495e474745bc

# 关注社区
polisctl follow space <namespace>

# 点赞
polisctl like post <post_id>
polisctl like comment <comment_id>

# 投票
polisctl vote <poll_id> <option_index>
# 示例: polisctl vote poll123 0  # 选第一个选项
```

##### Notify（通知系统）

```bash
# 查看未读通知
polisctl notify unread

# 查看未读通知数
polisctl notify count
# 输出: {"count": 5}

# 标记通知为已读
polisctl notify read <notification_id>

# 标记全部已读
polisctl notify read-all

# 通知列表（含已读）
polisctl notify list [--limit 50]
```

##### Message（私信）

```bash
# 发送私信
polisctl message send <username> <content>
# 示例: polisctl message send alice "你好，想请教一个问题"

# 私信列表
polisctl message list [--limit 20]

# 与某人的对话
polisctl message conversation <username>
```

##### Data（数据导出）

```bash
# 导出个人数据
polisctl data export --format json
polisctl data export --format markdown

# 导出社区数据（需要管理员权限）
polisctl data export-space <namespace> --format json
```

##### Admin（管理员功能）

```bash
# 管理员登录
polisctl admin login <email> <password>

# 用户管理
polisctl admin users [--page 1] [--limit 50]
polisctl admin user <user_id>

# 封禁/解封
polisctl admin ban <user_id> --reason "违规内容"
polisctl admin unban <user_id>

# 社区管理
polisctl admin spaces [--status all|active|banned]
polisctl admin ban-space <space_id> --reason "违规"
```

### 5.2 polis-chain CLI — 区块链节点与钱包

#### 安装

```bash
cargo build --release -p polis-chain
sudo cp target/release/polis-chain /usr/local/bin/
```

#### 节点操作

```bash
# ---- 启动节点 ----

# 创世节点（第一个启动的节点，创建创世区块）
CHAIN_MODE=validator CHAIN_IS_GENESIS=true polis-chain run

# 全节点（同步区块 + 提供 HTTP API，不参与共识）
CHAIN_MODE=full polis-chain run

# 验证者节点（参与共识，需要预先在验证者集合中注册）
CHAIN_MODE=validator polis-chain run

# 环境变量配置
# CHAIN_API_PORT=8545         # HTTP API 端口（默认 8545）
# CHAIN_P2P_PORT=9732         # P2P 网络端口（默认 9732）
# CHAIN_BOOTSTRAP_PEERS=...    # 引导节点地址（多地址用逗号分隔）
# CHAIN_DATA_DIR=./data        # RocksDB 数据目录
# RUST_LOG=info                # 日志级别
```

#### 钱包操作

```bash
# ---- 创建与查看 ----

# 创建新钱包
polis-chain wallet create --password "你的强密码"
# 输出:
#   钱包创建成功！
#   地址: 0xPOL_a1b2c3d4e5f6...
#   私钥已使用 Argon2id 加密保存

# 查看钱包信息（地址、余额、XP、稀有币）
polis-chain wallet show
# 输出:
#   地址: 0xPOL_a1b2c3d4e5f6...
#   余额: 150.00 $POL
#   累计 XP: 2340
#   可用 XP: 120
#   稀有币: Gold #3, Silver #7

# 查看余额
polis-chain wallet balance
# 输出: 150.00 $POL

# ---- 转账 ----
polis-chain wallet transfer \
  --password "你的强密码" \
  --to "0xPOL_recipient_address..." \
  --amount 10
# 输出: 交易已提交: tx_hash = abc123...

# ---- 导入/导出 ----

# 导出私钥（hex 格式，32 字节 Ed25519 种子）
polis-chain wallet export --password "你的强密码"
# 输出: <64位hex字符串>（请安全保管！）

# 导入私钥
polis-chain wallet import --password "你的强密码" --key "<hex私钥>"

# ---- 签名（用于钱包绑定验证） ----
polis-chain wallet sign --data "Bind 0xPOL_xxx to Polis user uuid: random_hex"
# 输出: <128位hex签名字符串>

# ---- 交易历史 ----
polis-chain wallet transactions [--limit 50]
```

#### 链状态查询（通过 HTTP API）

```bash
# 节点状态
curl http://localhost:8545/api/v1/status

# 区块信息
curl http://localhost:8545/api/v1/blocks?from=0&limit=10
curl http://localhost:8545/api/v1/blocks/42

# 交易查询
curl http://localhost:8545/api/v1/transactions/pending
curl http://localhost:8545/api/v1/transactions/<tx_hash>

# 账户状态
curl http://localhost:8545/api/v1/wallet/0xPOL_address...

# 挖矿轮次
curl http://localhost:8545/api/v1/mining/rounds/current
curl http://localhost:8545/api/v1/mining/rounds/5

# 大奖池
curl http://localhost:8545/api/v1/pool/status
curl http://localhost:8545/api/v1/pool/history

# 站点信息
curl http://localhost:8545/api/v1/sites/<site_id>

# P2P 网络
curl http://localhost:8545/api/v1/peers
```

---

## 6. 技术架构深度剖析

### 6.1 完整服务拓扑

```
                         Internet
                            │
                    ┌───────┴───────┐
                    │  Nginx :443   │  (HTTPS 终止 + 反向代理)
                    │  www.mzgw.com │
                    └───┬───────┬───┘
                        │       │
           ┌────────────┘       └────────────┐
           ▼                                 ▼
   ┌───────────────┐                 ┌──────────────┐
   │ polis-gateway │                 │   Next.js    │
   │    :8080      │                 │    :3000     │
   │  (Axum 0.8)   │                 │ (SSR + API)  │
   │  API网关+限流  │                 │  前端渲染     │
   └───────┬───────┘                 └──────┬───────┘
           │                                │
     ┌─────┼─────────┬──────────┬──────────┐
     ▼     ▼         ▼          ▼          ▼
   user  space   content    video      admin
   :3001 :3002   :3003      :3005      :3050
     │     │        │          │          │
     │     │        ├──────────┤          │
     │     │        │ XpBridge │          │
     │     │        │ (→ Chain)│          │
     │     │        └──────────┘          │
     └─────┴─────────┴────────────────────┘
              │
              ▼
       ┌──────────────┐
       │ PostgreSQL 16│
       │ (一个实例，   │
       │  各服务独立DB)│
       └──────────────┘

              ┌──────────────────┐
              │   Polis Chain    │
              │   (独立进程)      │
              │   API :8545      │
              │   P2P :9732      │
              │   RocksDB 存储   │
              └──────────────────┘
```

### 6.2 请求路由详情

```
Nginx (:443 HTTPS)
  │
  ├── /api/auth/*          → Gateway → User (:3001)
  │   ├── /api/auth/register        注册
  │   ├── /api/auth/login           登录
  │   ├── /api/auth/forgot-password 忘记密码
  │   └── /api/auth/reset-password  重置密码
  │
  ├── /api/users/*         → Gateway → User (:3001)
  │   ├── /api/users/{username}            查看主页
  │   ├── /api/users/search?q=             搜索用户
  │   ├── /api/users/me                    我的信息 (需 JWT)
  │   ├── /api/users/me/bind-wallet/*      钱包绑定 (需 JWT)
  │   └── /api/users/me/xp                 查看 XP (需 JWT)
  │
  ├── /api/spaces/*        → Gateway → Space (:3002)
  │   ├── /api/spaces/trending             热门社区
  │   ├── /api/spaces/{namespace}          社区详情
  │   ├── /api/spaces/search?q=            搜索社区
  │   └── /api/spaces/{namespace}/members  社区成员
  │
  ├── /api/posts/*         → Gateway → Content (:3003)
  │   ├── /api/posts/{id}                  查看帖子
  │   ├── /api/posts/{id}/comments         查看评论
  │   └── /api/posts (POST)                发布帖子 (需 JWT)
  │
  ├── /api/feed            → Gateway → Content (:3003)
  │
  ├── /api/vote            → Gateway → Content (:3003)
  │
  ├── /api/admin/*         → Gateway → Admin (:3050)
  │
  ├── /api/videos/*        → Gateway → Video (:3005)
  │
  ├── /api/internal/*      → 内部服务间调用（不对外暴露）
  │   └── /api/internal/xp/award  User Service XP 发放
  │
  ├── /chain-api/*         → Polis Chain (:8545)
  │   (Next.js rewrites 代理到链节点)
  │
  └── /*                   → Next.js (:3000)
      SSR 页面渲染
```

### 6.3 技术栈详情

| 服务 | 框架 | 数据库 | 关键依赖 |
|------|------|--------|---------|
| **gateway** | Axum 0.8 | — | tower-http (限流/CORS) |
| **user** | Axum 0.8 + SQLx 0.8 | PostgreSQL | argon2, jsonwebtoken, ed25519-dalek, sha2 |
| **space** | Axum 0.8 + SQLx 0.8 | PostgreSQL | — |
| **content** | Axum 0.8 + SQLx 0.8 | PostgreSQL | reqwest (XpBridge), ed25519-dalek |
| **video** | Axum 0.8 + SQLx 0.8 | PostgreSQL | FFmpeg (系统依赖) |
| **admin** | Axum 0.8 + SQLx 0.8 | PostgreSQL | — |
| **chain** | Axum 0.8 + libp2p 0.54 | RocksDB 0.22 | ed25519-dalek, sha2, bincode, rand |
| **web** | Next.js 14 | — | Tailwind CSS, next-intl, recharts, Cherry Markdown |

---

## 7. 数据模型详解

### 7.1 核心数据库表

```
PostgreSQL
├── users                    # 用户表
│   ├── id (UUID, PK)
│   ├── username (UNIQUE)
│   ├── email (UNIQUE)
│   ├── password_hash (Argon2id)
│   ├── display_name
│   ├── avatar_url
│   ├── bio
│   ├── verified (BOOLEAN)
│   ├── chain_address (钱包地址, 可为NULL)
│   ├── chain_bound_at (绑定时间)
│   ├── notification_prefs (JSONB)
│   ├── created_at / updated_at
│   └── deleted_at (软删除)
│
├── spaces                   # 社区表
│   ├── id (UUID, PK)
│   ├── namespace (UNIQUE, 如 "alice/rust-club")
│   ├── owner_id → users.id
│   ├── title, description
│   ├── visibility (public/private/unlisted)
│   ├── has_password
│   ├── member_count, post_count
│   └── created_at
│
├── space_members            # 社区成员
│   ├── space_id, user_id
│   └── role (founder/admin/moderator/member)
│
├── modules                  # 社区模块
│   ├── space_id
│   ├── type (discussion/qa/wiki/video/...)
│   └── config (JSONB)
│
├── creations                # 作品表（核心实体）
│   ├── id (UUID, PK)
│   ├── author_id → users.id
│   ├── title, content (Markdown)
│   ├── type (post/wiki/qa/video/poll/series/novel)
│   ├── status (published/draft/archived)
│   └── created_at / updated_at
│
├── module_refs               # 社区引用（核心概念）
│   ├── creation_id → creations.id
│   ├── module_id → modules.id
│   ├── space_id → spaces.id
│   ├── pinned, hidden (社区管理员操作)
│   └── created_at
│
├── comments                 # 评论
│   ├── id, content
│   ├── creation_id (被评论的作品)
│   ├── author_id → users.id
│   ├── parent_id → comments.id (嵌套回复)
│   └── created_at
│
├── likes                    # 点赞
│   ├── user_id, target_type, target_id
│   └── UNIQUE(user_id, target_type, target_id)
│
├── follows                  # 关注
│   ├── follower_id, followee_type, followee_id
│   └── UNIQUE 约束
│
├── bookmarks                # 收藏
│   ├── user_id, creation_id
│   └── created_at
│
├── notifications            # 通知
│   ├── user_id, type, data (JSONB), is_read
│   └── created_at
│
├── messages                 # 私信
│   ├── sender_id, receiver_id, content
│   └── created_at
│
├── user_xp                  # 用户 XP 记录
│   ├── user_id, xp_amount
│   ├── action_type, description
│   └── created_at
│
├── badges                   # 徽章
│   ├── user_id, badge_type, earned_at
│   └── UNIQUE 约束
│
├── invites                  # 邀请码
│   ├── code, creator_id, used_by, used_at
│   └── created_at
│
├── ban_records              # 封禁记录
│   ├── user_id, reason, banned_by
│   └── banned_at / unbanned_at
│
└── appeals                  # 申诉记录
    ├── email, reason, status
    └── created_at
```

### 7.2 链上数据结构 (RocksDB)

```
RocksDB — 11 个 Column Family
├── CF_BLOCKS               # 区块数据
│   key: block_number (u64 BE bytes)
│   value: bincode(Block)
│
├── CF_TRANSACTIONS         # 交易数据
│   key: tx_hash ([u8; 32])
│   value: bincode(SignedTransaction)
│
├── CF_ACCOUNT_STATE        # 账户状态
│   key: address (string bytes)
│   value: bincode(AccountState)
│
├── CF_SITE_REGISTRY        # 站点注册
│   key: site_id (SHA256 hex bytes)
│   value: bincode(SiteInfo)
│
├── CF_ACTIVITIES           # 活动记录
│   key: user_ref + nonce (复合键)
│   value: bincode(ActivityRecord)
│
├── CF_MINING_ROUNDS        # 挖矿轮次
│   key: round_id (u64 BE bytes)
│   value: bincode(MiningRound)
│
├── CF_POOL_STATE           # 奖池状态
│   key: pool_id (string bytes)
│   value: bincode(PoolState)
│
├── CF_POOL_HISTORY         # 炼金历史
│   key: pool_id (string bytes)
│   value: bincode(PoolAlchemyRecord)
│
├── CF_VALIDATORS           # 验证者信息
│   key: validator_address (string bytes)
│   value: bincode(ValidatorInfo)
│
├── CF_CONFIG               # 链配置
│   key: "chain_config"
│   value: bincode(ChainConfig)
│
└── CF_META                 # 元数据
    key: "latest_block" / "latest_block_hash"
    value: 对应的值
```

---

## 8. 安全模型

### 8.1 认证与授权

```
用户认证流程:
  注册 → Argon2id 哈希密码 → 存入 PostgreSQL
  登录 → 验证哈希 → 签发 JWT (24h 过期, HS256, 包含 user_id + username)
  请求 → Authorization: Bearer <token> → Auth Middleware → 提取 user_id
```

- **密码**: Argon2id (memory=64MB, iterations=3, parallelism=4)
- **JWT**: HS256, 24 小时过期
- **管理员**: 独立的 JWT token (email + admin_password)

### 8.2 链上安全

| 安全层 | 机制 | 说明 |
|--------|------|------|
| **签名** | Ed25519 | 所有用户交易需要 Ed25519 签名 |
| **防重放** | nonce 单调递增 | 每笔交易包含 nonce，按账户递增 |
| **签名字段** | compute_hash_with_signer() | 哈希包含 signer 字段，防止签名跨账户重放 |
| **地址派生** | SHA256(pubkey) 截断 | 地址不可伪造，无法从地址反推公钥 |
| **PoolDeposit** | POLIS_POOL_DEPOSIT 前缀签名 | 存入奖池需要特定格式签名 |
| **ActivityProof** | POLIS_ACTIVITY 前缀签名 | 站点用私钥签名，防止伪造 XP |
| **共识安全** | ≥ 2/3 BFT 法定人数 | 容忍 ⌊(N-1)/3⌋ 拜占庭节点 |
| **罚没** | 双重签名检测 + 离线检测 | 自动处罚恶意验证者 |

### 8.3 站点信任模型

```
站点信誉分 (0-100)
  ├── 初始: 100 分
  ├── 降分事件: ActivityProof 异常、用户投诉、验证失败
  ├── 门槛: < 30 分 → 自动停用
  └── 恢复: 需重新激活（信誉 ≥ 30 分才能激活）
```

---

## 9. 开发指南

### 9.1 环境准备

#### 必需

```bash
# Rust 工具链
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup component add rustfmt clippy

# macOS 交叉编译 (部署 Linux 服务器需要)
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu

# Node.js
brew install node@20

# PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 创建数据库
createdb polis_user
createdb polis_space
createdb polis_content
createdb polis_video
createdb polis_admin
```

#### 可选

```bash
# Redis (缓存)
brew install redis

# FFmpeg (视频转码)
brew install ffmpeg

# NATS (消息队列)
brew install nats-server
```

### 9.2 本地开发

```bash
# 1. 克隆
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. 配置环境变量（编辑各 crate 的 .env）
# crates/polis-gateway/.env:
#   GATEWAY_PORT=8080
#   USER_SERVICE_URL=http://localhost:3001
#   SPACE_SERVICE_URL=http://localhost:3002
#   ...

# crates/polis-user/.env:
#   DATABASE_URL=postgres://localhost/polis_user
#   JWT_SECRET=your-secret-key
#   PORT=3001

# 3. 数据库迁移（服务启动时自动执行 SQLx 迁移）
# 或手动运行:
# cd migrations && psql polis_user < 001_init.sql

# 4. 启动后端服务（每个服务一个终端）
cargo run -p polis-gateway     # 网关 → :8080
cargo run -p polis-user        # 用户 → :3001
cargo run -p polis-space       # 社区 → :3002
cargo run -p polis-content     # 内容 → :3003
cargo run -p polis-video       # 视频 → :3005
cargo run -p polis-admin       # 管理 → :3050

# 5. 启动前端
cd web
npm install
npm run dev                    # → http://localhost:3000

# 6. (可选) 启动区块链节点
CHAIN_MODE=full RUST_LOG=info cargo run -p polis-chain run
# → http://localhost:8545 (API)
```

### 9.3 运行测试

```bash
# 全部测试
cargo test --workspace

# 按 crate
cargo test -p polis-chain           # 区块链 (26 tests)
cargo test -p polis-user            # 用户服务
cargo test -p polis-content         # 内容服务
cargo test -p polis-space           # 社区服务

# 特定测试
cargo test -p polis-chain test_settle_round_xp_cleared
cargo test -p polis-chain test_weighted_lottery_higher_xp_wins

# 前端检查
cd web
npx tsc --noEmit                   # TypeScript 类型检查
npm run lint                       # ESLint

# Rust 代码检查
cargo check --workspace            # 编译检查
cargo clippy --workspace           # Clippy lint
```

### 9.4 代码组织规范

```
crates/<crate>/
├── src/
│   ├── main.rs           # 入口 + 服务器启动
│   ├── routes/           # API 路由定义 (axum Router)
│   ├── handlers/         # 请求处理器 (业务逻辑)
│   ├── repo.rs           # 数据库仓库层 (SQLx 查询)
│   ├── models.rs         # 数据模型 (Serialize/Deserialize)
│   └── middleware/       # 中间件 (认证/日志/CORS)
├── migrations/           # SQLx 迁移文件
├── Cargo.toml
└── .env                  # 环境配置
```

---

## 10. 部署指南

### 10.1 部署铁律

> ⚠️ **绝对不可违反**：
> 1. **本地编译 → GitHub Releases → 服务器下载部署**，绝不可以在服务器上编译
> 2. **禁止使用 SCP** 向服务器传输文件（本地在中国，服务器在美国，跨太平洋 SCP 会丢包/卡死）
> 3. 服务器内存仅 1.6GB，`npm run build` + `cargo build` 会 OOM 宕机

### 10.2 完整部署流水线

```bash
#!/bin/bash
set -e

VERSION="v1.7.0"
PROJECT_DIR="/Users/wansichao/Projects/polis-platform"
SERVER="root@47.253.123.3"

echo "=== 步骤 1: 本地编译后端（交叉编译为 Linux x86_64）==="
cd "$PROJECT_DIR"
cargo build --release --target x86_64-unknown-linux-gnu -p polis-gateway -p polis-user -p polis-space -p polis-content -p polis-admin -p polis-video

echo "=== 步骤 2: 构建前端 ==="
cd "$PROJECT_DIR/web"
npm run build

echo "=== 步骤 3: 打包（macOS 必须禁用 xattr）==="
cd "$PROJECT_DIR"
COPYFILE_DISABLE=1 tar -czf /tmp/polis-release-binaries.tar.gz \
  -C target/x86_64-unknown-linux-gnu/release \
  polis-gateway polis-user polis-space polis-content polis-admin polis-video

COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' \
  -czf /tmp/polis-release-web.tar.gz -C web .next public

echo "=== 步骤 4: 创建 GitHub Release ==="
gh release create "$VERSION" \
  /tmp/polis-release-binaries.tar.gz \
  /tmp/polis-release-web.tar.gz \
  --title "$VERSION" \
  --notes "$(git log --oneline -10 | sed 's/^/- /')"

echo "=== 步骤 5: 服务器部署 ==="
ssh "$SERVER" << 'DEPLOY'
set -e
VERSION="v1.7.0"

# 下载
echo "下载 Release..."
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/polis-release-binaries.tar.gz" -o /tmp/binaries.tar.gz
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/polis-release-web.tar.gz" -o /tmp/web.tar.gz

# 备份
echo "备份旧文件..."
BACKUP_DIR="/root/polis/target/release/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video; do
  [ -f "/root/polis/target/release/$svc" ] && cp "/root/polis/target/release/$svc" "$BACKUP_DIR/"
done
echo "备份完成: $BACKUP_DIR"

# 停止
echo "停止服务..."
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
sleep 2

# 部署后端
echo "部署后端..."
tar -xzf /tmp/binaries.tar.gz -C /root/polis/target/release/
chmod +x /root/polis/target/release/polis-*

# 部署前端
echo "部署前端..."
rm -rf /opt/polis-web/.next
tar -xzf /tmp/web.tar.gz -C /opt/polis-web/
# ⚠️ 关键步骤：复制 static 到 standalone 目录
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static
# 清理 macOS xattr 污染
find /opt/polis-web/.next -name '._*' -delete 2>/dev/null || true

# 启动
echo "启动服务..."
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
sleep 3

# 验证
echo "=== 验证 ==="
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web; do
  STATUS=$(systemctl is-active "$svc")
  echo "  $svc: $STATUS"
done

echo ""
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://www.mzgw.com/)
echo "  www.mzgw.com: HTTP $HTTP_CODE"

# 清理
rm -f /tmp/binaries.tar.gz /tmp/web.tar.gz

echo ""
echo "=== 部署完成 ==="
DEPLOY

echo "=== 所有步骤完成 ==="
```

### 10.3 服务器日常管理

```bash
# 查看所有服务状态
ssh root@47.253.123.3 "systemctl status polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web --no-pager"

# 查看日志
ssh root@47.253.123.3 "journalctl -u polis-gateway -n 100 --no-pager"
ssh root@47.253.123.3 "journalctl -u polis-web -n 100 --no-pager"

# 实时日志
ssh root@47.253.123.3 "journalctl -u polis-gateway -f"
ssh root@47.253.123.3 "journalctl -u polis-web -f"

# 重启单个服务
ssh root@47.253.123.3 "systemctl restart polis-web"

# 磁盘使用
ssh root@47.253.123.3 "df -h && du -sh /root/polis/target/release/* /opt/polis-web/.next"

# 查看内存
ssh root@47.253.123.3 "free -h && ps aux --sort=-%mem | head -10"

# 健康检查
curl -sk https://www.mzgw.com/api/health
curl -sk -o /dev/null -w "HTTP %{http_code} | Size: %{size_download} | Time: %{time_total}s\n" https://www.mzgw.com/
```

### 10.4 回滚

```bash
# 如果部署后有问题，从备份恢复
ssh root@47.253.123.3 << 'ROLLBACK'
BACKUP_DIR=$(ls -dt /root/polis/target/release/backup-* | head -1)
echo "从 $BACKUP_DIR 恢复..."
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
cp "$BACKUP_DIR"/* /root/polis/target/release/
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
echo "回滚完成"
ROLLBACK
```

---

## 11. API 完整参考

### 11.1 统一响应格式

所有 API 响应使用统一格式：

```json
{
  "code": 0,         // 0 = 成功, 非 0 = 错误
  "message": "ok",   // 错误时包含描述
  "data": { ... }    // 具体数据
}
```

### 11.2 公共 API（无需认证）

#### 健康检查

```bash
# 整体服务健康
GET /api/health
→ {"code":0,"message":"ok","data":{"service":"polis-gateway","status":"healthy","database":true}}
```

#### 认证

```bash
# 注册
POST /api/auth/register
Body: { "username": "alice", "email": "alice@test.com", "password": "password123" }
→ {"code":0,"data":{"token":"eyJ...","user":{...}}}

# 登录
POST /api/auth/login
Body: { "email": "alice@test.com", "password": "password123" }
→ {"code":0,"data":{"token":"eyJ...","user":{...}}}

# 忘记密码
POST /api/auth/forgot-password
Body: { "email": "alice@test.com" }
→ {"code":0,"data":{"message":"如果该邮箱已注册，密码重置链接已发送"}}

# 重置密码
POST /api/auth/reset-password
Body: { "token": "reset-token-from-email", "new_password": "newpass456" }
→ {"code":0,"data":null}

# 邀请码
POST /api/auth/redeem-invite
Body: { "code": "INVITE-CODE-HERE" }
→ {"code":0,"data":{...}}
```

#### 用户

```bash
# 查看用户主页
GET /api/users/{username}
→ {"code":0,"data":{"id":"...","username":"alice","display_name":"Alice",...}}

# 粉丝列表
GET /api/users/{username}/followers
→ {"code":0,"data":[{...},...]}

# 关注列表
GET /api/users/{username}/following
→ {"code":0,"data":[{...},...]}

# 用户空间列表
GET /api/users/{username}/spaces
→ {"code":0,"data":[{...},...]}

# 搜索用户
GET /api/users/search?q=alice&limit=20
→ {"code":0,"data":[{...},...]}

# 封禁状态查询
GET /api/user/ban-status?email=alice@test.com
→ {"code":0,"data":{"banned":false,"ban_reason":null,"banned_at":null}}

# 提交申诉
POST /api/user/appeal
Body: { "email": "alice@test.com", "reason": "我认为我的账号被误封" }
→ {"code":0,"data":{"message":"申诉已提交，管理员将在1-3个工作日内审核"}}
```

### 11.3 认证 API（需要 JWT）

所有以下请求需要在 Header 中携带：
```
Authorization: Bearer <jwt_token>
```

#### 个人信息

```bash
# 获取我的信息
GET /api/users/me
→ {"code":0,"data":{"id":"...","username":"alice","chain_address":"0xPOL_...",...}}

# 更新个人资料
PUT /api/users/me
Body: { "display_name": "新名字", "bio": "新的简介", "avatar_url": "https://..." }
→ {"code":0,"data":{...}}

# 修改密码
PUT /api/users/me/password
Body: { "old_password": "oldpass", "new_password": "newpass" }
→ {"code":0,"data":null}

# 更新通知设置
PUT /api/users/me/settings
Body: { "notification_prefs": {...} }
→ {"code":0,"data":null}
```

#### 钱包绑定

```bash
# 生成绑定 nonce
POST /api/users/me/bind-wallet/challenge
Body: { "address": "0xPOL_a1b2c3..." }
→ {"code":0,"data":{"nonce":"Bind 0xPOL_... to Polis user uuid: random_hex","message":"请使用 CLI 签名"}}

# 验证并绑定
POST /api/users/me/bind-wallet/verify
Body: {
  "address": "0xPOL_a1b2c3...",
  "public_key_hex": "<64位hex公钥>",
  "nonce": "Bind 0xPOL_... to Polis user uuid: random_hex",
  "signature_hex": "<128位hex签名>"
}
→ {"code":0,"data":{...}}  # 返回更新后的 UserPublic
```

#### XP 系统

```bash
# 查看 XP
GET /api/users/me/xp
→ {"code":0,"data":{"total_xp":2340,"available_xp":120,"level":3}}

# XP 日志
GET /api/users/me/xp/logs
→ {"code":0,"data":[{...},...]}

# 每日签到
POST /api/users/me/daily-login
→ {"code":0,"data":{"xp_earned":10,"streak":5}}

# 新手任务状态
GET /api/users/me/onboarding
→ {"code":0,"data":[{...},...]}

# 完成任务
POST /api/users/me/onboarding/complete
Body: { "quest_key": "first_post" }
→ {"code":0,"data":true}

# 领取奖励
POST /api/users/me/onboarding/claim
Body: { "quest_key": "first_post" }
→ {"code":0,"data":{"xp_reward":50}}
```

#### 徽章

```bash
# 获取徽章
GET /api/users/me/badges
→ {"code":0,"data":[{...},...]}
```

#### 邀请码

```bash
# 获取/生成邀请码
GET /api/users/me/invites
→ {"code":0,"data":{"codes":[...],"used":[...]}}

POST /api/users/me/invites
→ {"code":0,"data":{"code":"ABCD-EFGH-IJKL"}}
```

#### 社交

```bash
# 关注/取关
POST /api/follow
Body: { "followee_type": "user", "followee_id": "uuid" }
→ {"code":0,"data":true}   # true = 已关注, false = 已取关

# RESTful 关注 (v0.3.22+)
POST /api/users/{username}/follow
DELETE /api/users/{username}/follow

# 互关联系人
GET /api/contacts/mutual
→ {"code":0,"data":[{...},...]}
```

#### Push 推送

```bash
# 订阅推送
POST /api/users/me/push-subscribe
Body: { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
→ {"code":0,"data":null}

# 取消订阅
POST /api/users/me/push-unsubscribe
Body: { "endpoint": "..." }
→ {"code":0,"data":null}
```

### 11.4 Chain API (端口 8545)

#### 节点状态

```bash
GET /api/v1/status
→ {"code":0,"data":{"node_address":"0xPOL_...","uptime_seconds":3600,"peers_connected":3}}
```

#### 区块查询

```bash
# 区块列表
GET /api/v1/blocks?from=0&limit=10
→ {"code":0,"data":[{"number":0,"parent_hash":"0x0...","transactions":[...]},...]}

# 指定区块
GET /api/v1/blocks/{number}
→ {"code":0,"data":{"number":42,"transactions":[...],...}}
```

#### 交易

```bash
# 提交交易
POST /api/v1/transactions
Body: { "tx": {...}, "signer": "0xPOL_...", "signature": "hex...", "hash": "hex..." }
→ {"code":0,"data":{"hash":"hex..."}}

# 待处理交易
GET /api/v1/transactions/pending
→ {"code":0,"data":[...]}

# 交易详情
GET /api/v1/transactions/{hash}
→ {"code":0,"data":{...}}
```

#### 活动证明

```bash
# 提交活动证明
POST /api/v1/activities
Body: {
  "site_id": "site_hash...",
  "user_ref": "user_hash...",
  "action_type": "post_create",
  "target_ref": "target_hash...",
  "xp_value": 10,
  "nonce": 42,
  "signature": "hex...",    # 站点 Ed25519 签名
  "public_key": "hex..."    # 站点公钥
}
→ {"code":0,"data":{"nonce":42}}

# 查询活动
GET /api/v1/activities/{user_ref}
→ {"code":0,"data":[...]}

# XP 查询
GET /api/v1/activities/{user_ref}/xp
→ {"code":0,"data":{"total_xp":2340}}
```

#### 挖矿

```bash
# 当前轮次
GET /api/v1/mining/rounds/current
→ {"code":0,"data":{"round_id":42,"start_time":1717000000,"end_time":1717003600,...}}

# 历史轮次
GET /api/v1/mining/rounds/{id}
→ {"code":0,"data":{...}}

# 当前参与者
GET /api/v1/mining/rounds/current/participants
→ {"code":0,"data":{"participants":[{...}],"total_xp_pool":1000}}
```

#### 大奖池

```bash
# 奖池状态
GET /api/v1/pool/status
→ {"code":0,"data":{"pool_id":"pool-1","current_amount":50000,"target_amount":100000}}

# 炼金历史
GET /api/v1/pool/history
→ {"code":0,"data":[...]}

# 存入
POST /api/v1/pool/deposit
Body: {
  "from_address": "0xPOL_...",
  "amount": 100,
  "nonce": 5,
  "signature": "hex...",
  "public_key": "hex..."
}
→ {"code":0,"data":{"current_amount":50100}}
```

#### 钱包

```bash
# 创建钱包（服务端生成，仅供开发测试）
POST /api/v1/wallet/create
Body: { "password": "password" }
→ {"code":0,"data":{"address":"0xPOL_...","public_key":"hex..."}}

# 查询钱包
GET /api/v1/wallet/{address}
→ {"code":0,"data":{"address":"0xPOL_...","balance":150,"total_xp":2340,...}}
```

#### 站点

```bash
# 注册站点
POST /api/v1/sites/register
Body: {
  "domain": "mysite.mzgw.com",
  "admin_address": "0xPOL_...",
  "site_name": "我的站点",
  "verification_proof": "DNS TXT record value",
  "public_key": "hex..."    # 可选，Ed25519 公钥
}
→ {"code":0,"data":{"site_id":"...","domain":"mysite.mzgw.com",...}}

# 站点信息
GET /api/v1/sites/{site_id}
→ {"code":0,"data":{...}}
```

#### P2P 网络

```bash
# 已连接节点
GET /api/v1/peers
→ {"code":0,"data":["peer_id_1","peer_id_2",...]}
```

---

## 12. 配置参考

### 12.1 Chain 配置

```rust
// ChainConfig 默认值
ChainConfig {
    chain_id: "polis-mainnet-1",       // 链标识
    block_time_secs: 10,               // 出块间隔 10 秒
    mining_round_secs: 3600,           // 挖矿轮次 1 小时
    mining_reward: 40,                 // 每轮奖励 40 $POL
    winner_percentage: 10,             // 中奖比例 10%
    min_xp_to_participate: 1,          // 最低 XP 参与门槛
    pool_target: 100_000,              // 奖池目标 10 万 $POL
    premium_gold_count: 1,             // 金币数量
    premium_silver_count: 2,           // 银币数量
    premium_bronze_count: 3,           // 铜币数量
    min_validator_stake: 1_000,        // 最低验证者质押 1,000 $POL
    max_validators: 21,                // 最多验证者
    validator_epoch_secs: 86400,       // 验证者 epoch 24 小时
}
```

### 12.2 环境变量

```bash
# ---- Polis Chain ----
CHAIN_MODE=validator|full              # 节点模式
CHAIN_IS_GENESIS=true                  # 是否为创世节点
CHAIN_P2P_PORT=9732                    # P2P 端口
CHAIN_API_PORT=8545                    # API 端口
CHAIN_BOOTSTRAP_PEERS=<multiaddr>      # 引导节点 (逗号分隔)
CHAIN_DATA_DIR=./data                  # RocksDB 数据目录
RUST_LOG=info                          # 日志级别 (trace/debug/info/warn/error)

# ---- polisctl ----
POLIS_FORMAT=json                      # 输出格式 (json/text)
POLIS_BASE_URL=https://www.mzgw.com    # 服务器地址

# ---- XpBridge (Content Service) ----
POLIS_USER_SERVICE_URL=http://localhost:3001
POLIS_CHAIN_API_URL=http://localhost:8545
POLIS_SITE_ID=<SHA256(domain)>
POLIS_SITE_PRIVATE_KEY=<hex-encoded-32-byte-seed>

# ---- Gateway ----
GATEWAY_PORT=8080
USER_SERVICE_URL=http://localhost:3001
SPACE_SERVICE_URL=http://localhost:3002
CONTENT_SERVICE_URL=http://localhost:3003
VIDEO_SERVICE_URL=http://localhost:3005
ADMIN_SERVICE_URL=http://localhost:3050

# ---- User Service ----
DATABASE_URL=postgres://user:pass@localhost/polis_user
JWT_SECRET=<random-secret>
PORT=3001
```

---

## 13. 常见问题与故障排除

### 13.1 通用问题

**Q: Polis 挖矿需要 GPU/矿机吗？**
不需要。Polis 使用 IBFT 共识（PoA），不是 PoW。挖矿 = XP 加权抽奖。用户通过发帖、评论、互动获得 XP，自动参与每小时的挖矿轮次。

**Q: $POL 代币有供应上限吗？**
没有。只要用户持续活跃，系统就持续铸币。$POL 是行为证明的副产品。

**Q: 如何将钱包绑定到平台账号？**
1. 在 `/wallet` 创建或导入钱包 → 2. 进入 `/wallet/bind` → 3. 用 CLI 签名 nonce → 4. 提交验证。

**Q: XP 会过期吗？**
每轮挖矿结算后 available_xp 归零（消耗），但 total_xp 永久保留。需要持续活跃才能持续参与挖矿。

**Q: 我的内容属于谁？**
始终属于你。社区通过 ModuleRef 引用你的作品，但不拥有它。删除引用 ≠ 删除作品。

### 13.2 部署故障排除

**问题：前端白屏**
```bash
# 最常见原因：.next/static 未复制到 standalone 目录
ssh root@server "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"
```

**问题：服务启动失败**
```bash
# 检查日志
ssh root@server "journalctl -u polis-gateway -n 50 --no-pager"

# 常见原因：端口被占用
ssh root@server "ss -tlnp | grep -E '8080|3001|3002|3003|3005|3050'"

# 检查磁盘空间
ssh root@server "df -h"
```

**问题：RocksDB 损坏**
```bash
# 停止节点 → 删除数据目录 → 重新同步
ssh root@server "systemctl stop polis-chain && rm -rf /root/polis-chain/data && systemctl start polis-chain"
```

**问题：交叉编译失败**
```bash
# 确保安装了交叉编译工具
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu
# 检查 linker 配置: .cargo/config.toml
```

### 13.3 区块链故障排除

**问题：节点无法发现其他节点**
```bash
# 检查 P2P 端口是否通
nc -zv <other_node_ip> 9732
# 检查 mDNS 是否被防火墙阻止（局域网场景）
# 确认 CHAIN_BOOTSTRAP_PEERS 设置的 multiaddr 正确
```

**问题：共识卡在某个阶段**
```bash
# 检查日志中的共识阶段
RUST_LOG=debug polis-chain run 2>&1 | grep "Consensus"
# 如果卡在 PrePrepared → 检查提议者是否在线
# 如果卡在 Prepared → 检查验证者网络是否互通
```

---

## 14. 文档索引

| 文档 | 说明 |
|------|------|
| [完整设计哲学](docs/DESIGN-PHILOSOPHY.md) | Creation/ModuleRef 架构论证 + 竞品深度对比 |
| [架构文档](docs/ARCHITECTURE.md) | 微服务架构 / 权限模型 / 数据模型 / 请求流 |
| [Polis Chain 文档](crates/polis-chain/README.md) | 区块链层完整文档 — 共识/P2P/代币经济/API/安全 |
| [CLI 命令指南](docs/CLI-GUIDE.md) | polisctl 完整参考 20+ 命令 |
| [📖 系统运维手册](docs/OPERATIONS-MANUAL_zh.md) | **浏览器/CLI/服务器/区块链全场景操作指南** |
| [用户使用指南](docs/USER-GUIDE.md) | 前端功能使用说明 |
| [开发环境搭建](docs/DEV-SETUP.md) | 本地开发环境配置 |
| [Bug 追踪索引](docs/bugs/INDEX.md) | Pattern 库 + 修复统计 + 回归地图 |
| [已知问题](docs/KNOWN-ISSUES.md) | 当前已知 Bug 和技术债务 |
| [修复配方库](docs/bugs/fix-recipes/INDEX.md) | 复发 Bug 的标准化修复方案 |
| [更新日志](https://www.mzgw.com/changelog) | 在线版本历史 |
| [当前进度](docs/progress/MASTER.md) | 开发任务追踪 |

---

## 在线体验

**[https://www.mzgw.com](https://www.mzgw.com)** — 注册免费，即刻体验。

---

*Polis 的名称来源于古希腊城邦（πόλις），寓意公民自治、公共参与和对公共事务的集体决策。*
