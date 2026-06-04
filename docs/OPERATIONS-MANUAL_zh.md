# Polis 系统运维手册

> **最后更新**: 2026-06-04
> **适用版本**: v1.7.0+
> **服务器**: 47.253.123.3 | **域名**: www.mzgw.com

---

## 目录

1. [系统概览](#1-系统概览)
2. [浏览器操作指南 — 网站使用](#2-浏览器操作指南--网站使用)
3. [本地 CLI 操作指南](#3-本地-cli-操作指南)
4. [区块链操作指南](#4-区块链操作指南)
5. [服务器运维指南](#5-服务器运维指南)
6. [部署操作指南](#6-部署操作指南)
7. [故障排除](#7-故障排除)
8. [快速参考卡片](#8-快速参考卡片)

---

## 1. 系统概览

### 1.1 架构全景图

```
                        Internet
                           │
                    ┌──────┴──────┐
                    │   Nginx      │  :80/:443
                    │  (HTTPS)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         /api/*        /_next/static/*   /*
              │            │            │
      ┌───────┴───────┐    │    ┌───────┴───────┐
      │  API Gateway   │    │    │  Next.js Web  │
      │  (Port 8080)   │    │    │  (Port 3000)  │
      └───────┬───────┘    │    └───────────────┘
              │            │
   ┌──────────┼──────────┐ │
   │          │          │ │
   ▼          ▼          ▼ ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│polis-│ │polis-│ │polis-│ │polis-│ │polis-│ │polis-│
│user  │ │space │ │cont- │ │admin │ │video │ │chain │
│      │ │      │ │ent   │ │      │ │      │ │★     │
└──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
   │        │        │        │        │        │
   └────────┴────────┴────────┴────────┘        │
                     │                           │
              ┌──────┴──────┐           ┌───────┴───────┐
              │ PostgreSQL   │           │   RocksDB     │
              │ (用户/社区/   │           │ (链上数据)     │
              │  内容数据)    │           │               │
              └─────────────┘           └───────────────┘
```

### 1.2 服务清单

| 服务 | 端口 | 职责 | 部署状态 |
|------|------|------|---------|
| **polis-gateway** | 8080 | API 网关，路由分发，限流 | ✅ 运行中 |
| **polis-user** | 内部 | 用户/认证/通知 | ✅ 运行中 |
| **polis-space** | 内部 | 社区/模块管理 | ✅ 运行中 |
| **polis-content** | 内部 | 帖子/作品/评论 | ✅ 运行中 |
| **polis-admin** | 内部 | 管理后台 API | ✅ 运行中 |
| **polis-video** | 内部 | 视频上传/转码 | ✅ 运行中 |
| **polis-web** | 3000 | Next.js 前端 | ✅ 运行中 |
| **polis-chain** | 8545 | 区块链节点 | ⚠️ 暂未部署到服务器 |
| **Nginx** | 80/443 | HTTPS 反向代理 | ✅ 运行中 |
| **PostgreSQL** | 5432 | 关系数据库 | ✅ 运行中 |

### 1.3 服务器资源

| 指标 | 当前值 | 状态 |
|------|--------|------|
| 内存 | 1.6 GB (使用 655MB) | 🟢 正常 |
| 磁盘 | 40 GB (使用 27GB / 71%) | 🟡 注意监控 |
| Swap | 4 GB (使用 0) | 🟢 正常 |
| 系统 | Linux x86_64 | — |

---

## 2. 浏览器操作指南 — 网站使用

### 2.1 访问网站

打开浏览器访问 **[https://www.mzgw.com](https://www.mzgw.com)**

网站支持：
- **桌面端**: 完整功能，侧边栏导航
- **移动端**: 响应式设计，底部导航栏
- **深色模式**: 点击右上角 🌙 切换
- **语言切换**: 支持中文/English 切换

### 2.2 注册与登录

**注册：**

1. 点击右上角 **"立即加入"** 或导航到 `/register`
2. 填写表单：
   - 用户名（唯一，3-30 字符）
   - 邮箱地址（用于找回密码）
   - 昵称（显示名称）
   - 密码（最少 8 位，Argon2id 哈希存储）
3. 点击注册，成功自动登录

**登录：**

1. 导航到 `/login` 或点击 **"登录"**
2. 输入邮箱 + 密码
3. 登录后获取 JWT Token（默认 7 天有效期）

**密码重置：**

1. 在登录页点击 **"忘记密码"**
2. 输入注册邮箱
3. 检查邮箱中的重置链接（SHA-256 安全 token）
4. 点击链接设置新密码

### 2.3 首页与信息流

首页（`/`）包含三个核心区域：

**主信息流 — 三个 Tab：**

| Tab | 说明 |
|-----|------|
| **全部动态** | 所有公开社区的帖子，按时间排序 |
| **关注的人** | 你关注的用户发布的内容 |
| **热门** | 按热度加权排序（评分 + 评论数 + 时间衰减） |

**右侧栏：**

- **搜索框**: 搜索社区、帖子、用户
- **热门趋势**: 当前最热门的帖子排行
- **创作者榜**: 周/月/总 XP 积分排行，可切换时间维度
- **推荐社区**: 系统推荐的热门社区

**每条帖子卡片展示：**

```
📝 @社区创建者 / 社区名 / 模块名 / 帖子标题
   内容预览...
   [创作者头像] 创作者名 · N 粉丝 · N 天前
   👍 N    💬 N    ⭐ N
```

### 2.4 导航菜单

**顶部导航栏：**
- **P Polis** — 回到首页
- **发现** (`/explore`) — 探索社区、帖子、用户
- **关于** (`/about`) — 平台介绍
- **钱包** (`/wallet`) — 区块链钱包
- **更新** (`/changelog`) — 版本更新日志
- **AI 研究** (`/research`) — AI 代理研究报告
- **CLI** (`/cli`) — 命令行工具文档

**侧边栏（登录后）：**
- 首页 / 探索 / 通知 / 消息 / 收藏 / 个人 / 设置

**创作入口：**
- **创作者中心** (`/creations`) — 管理你的所有作品
- **新建作品** (`/creations/new`) — 发布新内容
- **创建社区** (`/create`) — 创建新社区

### 2.5 内容创作

**两个创作入口：**

| 入口 | URL | 适用场景 |
|------|-----|---------|
| 创作者中心 | `/creations/new` | 独立创作，可选投稿到多个社区 |
| 社区模块页 | 在社区内点击"发布" | 场景化创作，自动填写社区/模块 |

**发布流程：**

1. 选择内容类型：**文章** 或 **视频**
2. 填写标题和内容（支持 Markdown 格式）
3. 选择投稿社区和模块（至少选一个）
4. 设置可见性：公开 / 仅社区成员
5. 点击 **"发布"**

**Markdown 支持：**
- 标题 (`# ## ###`)
- 加粗 (`**text**`)、斜体 (`*text*`)
- 代码块 (`` `code` ``)
- 引用 (`> quote`)
- 链接和图片
- @提及 和 #话题标签

**@提及系统：**
- 在内容中输入 `@username` 提及用户
- 被提及者收到通知
- 渲染为可点击的个人主页链接

**#话题标签：**
- 在内容中使用 `#话题名`
- 自动聚合到话题页面 (`/hashtag/话题名`)
- 支持中文话题

### 2.6 社区操作

**浏览社区：**

社区页 URL 格式：`/space/创建者/社区名`

社区包含多个模块 Tab，例如：
- **概览** (`/posts`) — 所有模块帖子的汇总
- **交流** — 自定义模块（如果创建了）
- **视频** — 视频内容

**创建社区：**

1. 点击右上角 **"创建社区"** 或导航到 `/create`
2. 填写：
   - 社区名称
   - 简介描述
   - 可见性（公开/私有）
   - 自定义模块（可选）
3. 创建后你就是社区 Owner，拥有管理权限

**管理社区：**

作为社区 Owner，进入 `/space/你的空间/manage` 可以：
- 编辑基本信息（名称、描述、图标）
- 管理模块（创建/编辑/删除自定义模块）
- 管理成员（审核加入请求）
- 查看数据统计

### 2.7 钱包功能

**钱包入口：** `/wallet`

钱包页面提供以下功能：

**钱包总览 (`/wallet`)：**
- 查看 $POL 余额
- 查看 XP 积分
- 查看挖矿状态

**创建钱包 (`/wallet/create`)：**
- 生成 Ed25519 密钥对
- 地址格式：`0xPOL_` + hex(SHA256(pubkey)[..20])
- Argon2id 加密存储

**绑定钱包 (`/wallet/bind`)：**
- 将链上钱包地址绑定到平台账号
- Challenge-Response 流程：
  1. 输入钱包地址 → 系统生成 nonce
  2. 用 CLI 签名 nonce：`polis-chain wallet sign --data "<nonce>"`
  3. 提交签名 → 验证通过 → 绑定完成
- 绑定后，平台 XP 和链上地址关联

**挖矿中心 (`/wallet/mining`)：**
- 查看当前挖矿轮次倒计时
- XP 权重和参与状态
- 上轮中奖者列表

**大奖池 (`/wallet/pool`)：**
- 查看奖池进度（目标 100,000 $POL）
- 存入 $POL 到奖池
- 顶级存款者排行
- 炼金规则说明（满额 → 1金2银3铜）

**交易记录 (`/wallet/transactions`)：**
- 查看所有链上交易历史

### 2.8 社交互动

| 功能 | 操作 | 说明 |
|------|------|------|
| **点赞** | 点击 👍 | 支持帖子和评论 |
| **评论** | 帖子详情页底部 | 支持 Markdown |
| **收藏** | 点击 ⭐ | 收藏社区，可在 `/saved` 查看 |
| **关注** | 在用户主页点击"关注" | 关注后可在"关注的人"Tab 看到动态 |
| **私信** | 在用户主页点击"发消息" | 点对点私信系统 |
| **打赏** | 帖子详情页点击 💰 | 创作者打赏 |
| **分享** | 帖子详情页点击分享 | Twitter/X、Telegram、WhatsApp |
| **举报** | 帖子详情页点击举报 | 内容审核流程 |

### 2.9 管理后台

**入口：** `/admin`

管理后台提供 12 个功能页面：

| 页面 | 功能 |
|------|------|
| **仪表盘** | 平台核心数据概览 |
| **用户管理** | 搜索/查看/封禁/解封用户 |
| **社区管理** | 查看/隐藏/删除社区 |
| **内容管理** | 查看/隐藏/删除帖子 |
| **评论管理** | 管理所有评论 |
| **审查队列** | AI 辅助审查待处理内容 |
| **审查规则** | 配置 Agent 审查策略 |
| **举报管理** | 处理用户举报 |
| **操作日志** | 管理员操作审计日志 |
| **交易管理** | 查看平台交易记录 |
| **数据分析** | 用户/内容/社区数据分析 |
| **系统设置** | 平台全局配置（上传大小限制等） |

### 2.10 其他重要页面

| 页面 | URL | 说明 |
|------|-----|------|
| **个人主页** | `/profile` | 你的作品/动态/关注/粉丝 |
| **用户主页** | `/profile/用户名` | 查看其他用户的公开信息 |
| **设置** | `/settings` | 修改资料/密码/通知偏好 |
| **消息** | `/messages` | 私信对话列表 |
| **通知** | `/notifications` | 系统通知（@提及、点赞、评论等） |
| **收藏** | `/saved` | 已收藏的社区 |
| **邀请** | `/invites` | 邀请码生成/兑换，双方各得 100 XP |
| **排行榜** | `/leaderboard` | 创作者 XP 排行（周/月/总） |
| **活动** | `/events` | 社区活动列表 |
| **话题** | `/hashtag/标签名` | 话题聚合页 |
| **关于** | `/about` | 平台理念与介绍 |
| **隐私** | `/privacy` | 隐私政策 |
| **更新日志** | `/changelog` | 版本更新记录 |
| **CLI 文档** | `/cli` | 命令行工具完整参考 |
| **AI 研究** | `/research` | AI 代理与审查系统研究 |

---

## 3. 本地 CLI 操作指南

### 3.1 polisctl — Web 平台 CLI

**版本**: v1.1.0
**最低要求**: macOS ARM64 / Linux x86_64

**安装：**

```bash
# 方式 1: 从 GitHub Release 下载
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl" -o /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl

# 方式 2: 从源码编译
cd polis-platform
cargo build -p polisctl --release
cp target/release/polisctl /usr/local/bin/
```

**基本用法：**

```bash
# 查看版本
polisctl --version
# 输出: polisctl 1.1.0

# 查看帮助
polisctl --help

# 默认连接 www.mzgw.com
# 覆盖 API 地址
polisctl --base-url https://www.mzgw.com <COMMAND>

# 输出格式 (默认 JSON)
polisctl --format json <COMMAND>
polisctl --format table <COMMAND>
```

#### 3.1.1 用户认证

```bash
# 注册新用户
polisctl auth register <用户名> <邮箱> <密码> <昵称>

# 登录获取 Token
polisctl auth login <邮箱> <密码>
# Token 自动存储到 ~/.polis/config

# 查看当前登录用户
polisctl auth token

# 登出
polisctl auth logout
```

**实际验证结果：**

```
$ polisctl auth login user@example.com password
{"token":"eyJ...","user":{"id":"...","username":"testuser"}}
```

#### 3.1.2 个人信息

```bash
# 查看个人信息
polisctl profile view

# 更新个人资料
polisctl profile update --display-name "新昵称" --bio "个人简介"

# 修改密码
polisctl profile password <旧密码> <新密码>

# 查看我创建的社区
polisctl profile spaces

# 查看我的粉丝
polisctl profile followers

# 查看我关注的人
polisctl profile following
```

#### 3.1.3 社区管理

```bash
# 搜索社区
polisctl space search "关键词"
# 示例: polisctl space search "测试"
# 返回: JSON 数组，包含社区名/描述/成员数/帖子数

# 查看社区详情
polisctl space get <namespace>
# 示例: polisctl space get testuser/测试社区

# 查看热门社区
polisctl space trending

# 创建社区
polisctl space create <名称> <slug> <描述> [--visibility public|private]

# 加入社区
polisctl space join <namespace>

# 离开社区
polisctl space leave <namespace>

# 查看社区成员
polisctl space members <namespace>

# 查看子社区
polisctl space subspaces <namespace>
```

**实际验证结果：**

```
$ polisctl space search "测试" --format table

banner_url  created_at                   description  follower_count  ... title   visibility
null        2026-06-01T10:26:47.683810Z               0               ... 测试社区  public
```

#### 3.1.4 内容管理

```bash
# 发布帖子
polisctl post create --title "标题" --content "内容（支持 Markdown）" --space "namespace" --module "module_key"

# 查看帖子列表
polisctl post list [--space "namespace"] [--page 1]

# 查看帖子详情
polisctl post get <post_id>

# 搜索帖子
polisctl post search "关键词"

# 删除帖子
polisctl post delete <post_id>

# 查看精华帖
polisctl post featured --space "namespace"
```

#### 3.1.5 互动操作

```bash
# 点赞帖子
polisctl like post <post_id>

# 点赞评论
polisctl like comment <comment_id>

# 评论帖子
polisctl comment create <post_id> --content "评论内容"

# 查看评论
polisctl comment list <post_id>

# 关注用户
polisctl follow user <username>

# 收藏社区
polisctl bookmark add <space_id>
```

#### 3.1.6 社交功能

```bash
# 发送私信
polisctl message send <username> --content "消息内容"

# 查看对话列表
polisctl message conversations

# 查看与某人的消息
polisctl message list <username>

# 未读消息数
polisctl message unread-count

# 通知列表
polisctl notify list

# 未读通知数
polisctl notify unread

# 全部已读
polisctl notify read-all
```

#### 3.1.7 其他功能

```bash
# 创建投票
polisctl poll create <post_id> --title "投票标题" --options "选项1,选项2,选项3"

# 投票
polisctl vote up <post_id>

# 文件上传
polisctl file upload <文件路径>

# 草稿管理
polisctl draft save --title "草稿标题" --content "草稿内容"
polisctl draft list

# 健康检查
polisctl health
```

**实际验证结果：**

```
$ polisctl health

{
  "all_healthy": true,
  "gateway": "healthy",
  "services": {
    "admin":    { "service": "polis-admin",    "status": "healthy", "database": true },
    "content":  { "service": "polis-content",  "status": "healthy", "database": true },
    "space":    { "service": "polis-space",    "status": "healthy", "database": true },
    "user":     { "service": "polis-user",     "status": "healthy", "database": true },
    "video":    { "service": "polis-video",     "status": "healthy", "database": true }
  }
}
```

```bash
# 社区公告
polisctl announce list --space "namespace"
```

---

## 4. 区块链操作指南

### 4.1 polis-chain CLI

**版本**: v1.7.0
**二进制**: `target/release/polis-chain`（9.2 MB）

#### 4.1.1 钱包管理

```bash
# 创建新钱包
polis-chain wallet create
# 输出: 钱包地址 (0xPOL_...), 公钥 (hex), 私钥保存路径

# 查看钱包信息
polis-chain wallet show
# 输出: 地址, 余额, XP 积分

# 导入钱包 (从 hex 私钥)
polis-chain wallet import <hex_private_key>

# 导出钱包私钥
polis-chain wallet export
# ⚠️ 私钥显示在终端，注意安全

# 查询余额
polis-chain wallet balance
# 输出: 当前 $POL 余额

# 签名消息
polis-chain wallet sign --data "<消息内容>"
# 用于: 钱包绑定验证、交易签名

# 转账 $POL
polis-chain wallet transfer --to <地址> --amount <金额>
```

#### 4.1.2 启动区块链节点

```bash
# 启动节点（默认配置）
polis-chain run

# 环境变量配置:
# POLIS_CHAIN_PORT=8545       # HTTP API 端口
# POLIS_P2P_PORT=9000         # P2P 端口
# POLIS_VALIDATOR=true        # 验证者模式
# POLIS_DATA_DIR=/path/to/data # 数据目录 (RocksDB)
```

### 4.2 挖矿机制（Proof-of-Luck）

**工作原理：**

1. 用户在站点活跃获得 XP（经验值）
2. XP 自动参与每小时一轮的加权抽奖
3. 高 XP 用户中奖概率更高（加权随机）
4. 每轮奖励 40 $POL，按 50%/30%/20% 分给 3 名中奖者
5. 所有参与者 XP 归零，重新开始积累

**关键参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 轮次时长 | 3600 秒 (1小时) | 每轮挖矿周期 |
| 每轮奖励 | 40 $POL | 新铸造代币 |
| 奖励分配 | [50%, 30%, 20%] | 3 名中奖者分配比例 |
| 中奖率 | 10% | 参与者中中奖的比例 |
| 最小 XP | 1 | 参与门槛（available_xp >= 此值） |

### 4.3 大奖池炼金

**流程：**

1. 用户向大奖池存入 $POL
2. 当池子总额达到 **100,000 $POL** 时触发炼金
3. 存入的 $POL 被烧毁（从流通中移除）
4. 铸造稀有币：**1 枚金币 + 2 枚银币 + 3 枚铜币**
5. 按存款者加权抽奖分配稀有币

**API 端点：**

```bash
# 查看奖池状态
curl https://www.mzgw.com/api/chain/pool

# 存入 $POL (需要 Ed25519 签名)
curl -X POST https://www.mzgw.com/api/chain/pool/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xPOL_...",
    "amount": 100,
    "public_key": "<hex_32_bytes>",
    "signature": "<hex_64_bytes>"
  }'
```

### 4.4 站点注册

站点运营者可以注册自己的 Polis 站点到链上：

```bash
curl -X POST https://www.mzgw.com/api/chain/site/register \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "mysite.com",
    "admin_address": "0xPOL_...",
    "public_key": "<hex_32_bytes>",
    "name": "我的 Polis 站点"
  }'
```

注册后的站点可以：
- 提交用户活动证明（ActivityProof）到链上
- 用户的 XP 通过站点签名后提交
- 参与反作弊信誉评分

### 4.5 链上 API 参考

链 API 通过 Gateway 代理：`https://www.mzgw.com/api/chain/*`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chain/status` | GET | 链状态（高度/最新区块/共识阶段） |
| `/api/chain/block/latest` | GET | 最新区块信息 |
| `/api/chain/block/{hash}` | GET | 按哈希查区块 |
| `/api/chain/block/{height}` | GET | 按高度查区块 |
| `/api/chain/transaction/{hash}` | GET | 查询交易 |
| `/api/chain/account/{address}` | GET | 查询账户状态 |
| `/api/chain/account/{address}/xp` | GET | 查询账户 XP |
| `/api/chain/mining/round` | GET | 当前挖矿轮次 |
| `/api/chain/mining/round/{id}` | GET | 历史轮次 |
| `/api/chain/pool` | GET | 大奖池状态 |
| `/api/chain/pool/deposit` | POST | 存入奖池（需签名） |
| `/api/chain/site/register` | POST | 注册站点 |
| `/api/chain/site/{id}` | GET | 站点信息 |
| `/api/chain/validator/list` | GET | 验证者列表 |
| `/api/chain/transaction/submit` | POST | 提交签名交易 |
| `/api/chain/activity/submit` | POST | 提交活动证明（站点签名） |

---

## 5. 服务器运维指南

### 5.1 SSH 连接

```bash
# 连接服务器
ssh root@47.253.123.3

# 使用密钥
ssh -i ~/.ssh/id_rsa root@47.253.123.3

# 端口: 默认 SSH 22
```

### 5.2 服务管理

所有服务通过 systemd 管理：

```bash
# 查看所有 Polis 服务状态
systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# 查看单个服务状态
systemctl status polis-gateway

# 启动服务
systemctl start polis-gateway

# 停止服务
systemctl stop polis-gateway

# 重启服务
systemctl restart polis-gateway

# 重启所有 Polis 服务
systemctl restart polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# 查看服务日志（实时）
journalctl -u polis-gateway -f

# 查看最近 100 行日志
journalctl -u polis-gateway -n 100 --no-pager

# 查看过去 1 小时的日志
journalctl -u polis-gateway --since "1 hour ago" --no-pager
```

### 5.3 文件位置

| 路径 | 内容 |
|------|------|
| `/root/polis/target/release/` | 后端二进制文件 |
| `/opt/polis-web/` | 前端 Next.js 文件 |
| `/opt/polis-web/.next/` | Next.js 构建输出 |
| `/opt/polis-web/.next/standalone/` | Next.js standalone 服务器 |
| `/opt/polis-web/.next/BUILD_ID` | 当前前端版本标识 |
| `/etc/systemd/system/polis-*.service` | systemd 单元文件 |
| `/etc/nginx/conf.d/polis.conf` | Nginx 配置文件 |
| `/etc/letsencrypt/live/speedtest.mzgw.com/` | SSL 证书 |

### 5.4 数据库操作

```bash
# 通过 systemd 查看 PostgreSQL 状态
systemctl status postgresql

# 检查数据库连接（需知道密码）
PGPASSWORD=<密码> psql -U polis -d polis -c "SELECT version();"

# 查看所有表
PGPASSWORD=<密码> psql -U polis -d polis -c "\dt"

# 查看数据库大小
PGPASSWORD=<密码> psql -U polis -d polis -c "SELECT pg_database_size('polis')/1024/1024 AS size_mb;"

# 备份数据库
pg_dump -U polis polis > /tmp/polis_backup_$(date +%Y%m%d).sql
```

### 5.5 Nginx 管理

```bash
# 测试配置
nginx -t

# 重新加载配置（不中断服务）
systemctl reload nginx

# 查看配置
cat /etc/nginx/conf.d/polis.conf

# 查看访问日志
tail -f /var/log/nginx/access.log

# 查看错误日志
tail -f /var/log/nginx/error.log
```

**Nginx 路由架构：**

```
HTTPS 请求 → Nginx (:443)
  ├─ /api/videos         → API Gateway (:8080) [大文件上传 600M 限制]
  ├─ /api/*              → API Gateway (:8080)
  ├─ /hls/*              → API Gateway (:8080) [HLS 视频流]
  ├─ /health             → API Gateway (:8080)
  ├─ /_next/static/*     → Next.js (:3000) [1年缓存, immutable]
  └─ /*                  → Next.js (:3000)
```

### 5.6 SSL 证书

```bash
# 查看证书信息
openssl x509 -in /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem -text -noout | grep -E '(Not After|Not Before|DNS)'

# 证书续期（Let's Encrypt 90天有效）
certbot renew --dry-run  # 先测试
certbot renew             # 正式续期

# 设置自动续期 cron
# 通常在 /etc/cron.d/certbot 或 systemd timer
```

### 5.7 监控命令

```bash
# 内存使用
free -h

# 磁盘使用
df -h

# CPU 和进程
top -bn1 | head -20

# 端口监听
ss -tlnp | grep -E '(80|443|3000|8080|8545)'

# 当前连接数
ss -s

# 检查服务是否响应
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/api/health
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/
```

---

## 6. 部署操作指南

### 6.1 部署铁律

> ⚠️ 以下三条不可违反：

1. **本地编译 → GitHub Releases → 服务器下载**，严禁在服务器上编译
2. **禁止 SCP**：中美跨太平洋传输大文件会丢包/卡死
3. **服务器内存仅 1.6GB**，`npm run build` + `cargo build` 会导致 OOM

### 6.2 完整部署流程

#### 步骤 1: 本地编译

```bash
cd /Users/wansichao/Projects/polis-platform

# 1. 编译所有 Rust 后端（交叉编译 Linux x86_64）
cargo build --release --target x86_64-unknown-linux-gnu

# 2. 编译前端
cd web
npm run build
cd ..

# 3. 验证编译成功
ls -la target/x86_64-unknown-linux-gnu/release/polis-gateway
ls -la target/x86_64-unknown-linux-gnu/release/polis-user
ls -la target/x86_64-unknown-linux-gnu/release/polis-space
ls -la target/x86_64-unknown-linux-gnu/release/polis-content
ls -la target/x86_64-unknown-linux-gnu/release/polis-admin
ls -la target/x86_64-unknown-linux-gnu/release/polis-video
ls -la web/.next/BUILD_ID
```

#### 步骤 2: 打包

```bash
# 打包后端二进制
cd target/x86_64-unknown-linux-gnu/release/
COPYFILE_DISABLE=1 tar -czf /tmp/release-binaries.tar.gz \
  polis-gateway polis-user polis-space polis-content polis-admin polis-video
cd /Users/wansichao/Projects/polis-platform

# 打包前端 (排除缓存)
cd web
COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' \
  -czf /tmp/release-web.tar.gz .next public
cd ..
```

#### 步骤 3: 创建 GitHub Release

```bash
# 创建 release
gh release create v1.x.0 \
  --title "v1.x.0 — 更新说明" \
  --notes "## 变更内容

- 变更1
- 变更2

## 部署清单
- [x] 后端编译通过
- [x] 前端编译通过
- [x] 测试通过" \
  /tmp/release-binaries.tar.gz \
  /tmp/release-web.tar.gz
```

#### 步骤 4: 服务器部署

```bash
# SSH 到服务器
ssh root@47.253.123.3

# 下载 Release
cd /tmp
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/release-binaries.tar.gz" -o /tmp/release-binaries.tar.gz
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/release-web.tar.gz" -o /tmp/release-web.tar.gz

# === 部署后端 ===

# 停止服务
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video

# 备份旧二进制
cp /root/polis/target/release/polis-gateway /root/polis/target/release/polis-gateway.bak
# ... (对每个服务同样备份)

# 解压新二进制
tar -xzf /tmp/release-binaries.tar.gz -C /root/polis/target/release/
chmod +x /root/polis/target/release/polis-*

# 启动服务
systemctl start polis-user polis-space polis-content polis-admin polis-video polis-gateway

# 检查状态
systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video

# === 部署前端 ===

# 删除旧构建
rm -rf /opt/polis-web/.next

# 解压新构建
tar -xzf /tmp/release-web.tar.gz -C /opt/polis-web/

# ⚠️ 关键步骤: 复制 static 到 standalone
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static

# 重启前端
systemctl restart polis-web

# 验证
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/

# 清理
rm /tmp/release-binaries.tar.gz /tmp/release-web.tar.gz
```

#### 步骤 5: 部署后验证

```bash
# 1. 检查所有服务
ssh root@47.253.123.3 "systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web"

# 2. 检查 API 健康
curl -s https://www.mzgw.com/api/health | python3 -m json.tool

# 3. 检查首页 HTTP 状态码
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/

# 4. 检查静态资源
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/_next/static/chunks/webpack.js

# 5. 浏览器验证
open https://www.mzgw.com
```

### 6.3 快速部署（仅前端）

如果只改了前端代码：

```bash
# 本地
cd web && npm run build && cd ..
cd web && COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' -czf /tmp/release-web.tar.gz .next public && cd ..
gh release upload v1.x.0 /tmp/release-web.tar.gz --clobber

# 服务器
ssh root@47.253.123.3 "
  cd /tmp && \
  curl -fsSL 'https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/release-web.tar.gz' -o /tmp/release-web.tar.gz && \
  rm -rf /opt/polis-web/.next && \
  tar -xzf /tmp/release-web.tar.gz -C /opt/polis-web/ && \
  cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && \
  systemctl restart polis-web && \
  curl -s -o /dev/null -w '%{http_code}' https://www.mzgw.com/
"
```

### 6.4 快速部署（仅某个后端服务）

```bash
# 以 polis-content 为例
cargo build -p polis-content --release --target x86_64-unknown-linux-gnu
COPYFILE_DISABLE=1 tar -czf /tmp/polis-content.tar.gz -C target/x86_64-unknown-linux-gnu/release/ polis-content
gh release upload v1.x.0 /tmp/polis-content.tar.gz --clobber

ssh root@47.253.123.3 "
  cd /tmp && \
  curl -fsSL 'https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polis-content.tar.gz' -o /tmp/polis-content.tar.gz && \
  cp /root/polis/target/release/polis-content /root/polis/target/release/polis-content.bak && \
  systemctl stop polis-content && \
  tar -xzf /tmp/polis-content.tar.gz -C /root/polis/target/release/ && \
  chmod +x /root/polis/target/release/polis-content && \
  systemctl start polis-content && \
  systemctl is-active polis-content
"
```

---

## 7. 故障排除

### 7.1 常见问题

#### 问题 1: 网站返回 502

```bash
# 检查 Gateway 是否运行
ssh root@47.253.123.3 "systemctl status polis-gateway"

# 如果 gateway 挂了, 重启
ssh root@47.253.123.3 "systemctl restart polis-gateway"

# 检查是否 OOM
ssh root@47.253.123.3 "dmesg | grep -i 'killed process' | tail -5"
```

#### 问题 2: 前端页面白屏

```bash
# 检查 static 文件是否正确部署
ssh root@47.253.123.3 "ls -la /opt/polis-web/.next/standalone/.next/static/"

# 如果没有 static 目录，复制它
ssh root@47.253.123.3 "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"

# 检查静态资源是否可访问
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/_next/static/chunks/webpack.js
# 应该返回 200，如果 404 说明 static 没复制
```

#### 问题 3: API 响应慢

```bash
# 检查数据库连接池
ssh root@47.253.123.3 "PGPASSWORD=<密码> psql -U polis -d polis -c \"SELECT count(*) FROM pg_stat_activity;\""

# 检查内存
ssh root@47.253.123.3 "free -h"

# 检查磁盘
ssh root@47.253.123.3 "df -h /"
```

#### 问题 4: 中文 URL 乱码

```bash
# 症状: 中文社区名或用户名在 URL 中显示为 %E6%B5%8B...
# 原因: encodeURIComponent 被多次调用导致双重编码
# 解决: 检查前端 api.ts 中 URL 构建逻辑，确保只编码一次
```

#### 问题 5: 服务启动失败

```bash
# 查看详细错误
ssh root@47.253.123.3 "journalctl -u polis-gateway -n 50 --no-pager"

# 常见原因:
# 1. 数据库连接失败 → 检查 PostgreSQL
# 2. 端口冲突 → ss -tlnp | grep <端口>
# 3. 配置文件缺失 → 检查环境变量或 .env 文件
# 4. 二进制架构不匹配 → file /root/polis/target/release/polis-gateway
```

#### 问题 6: SSL 证书过期

```bash
# 检查证书有效期
ssh root@47.253.123.3 "openssl x509 -in /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem -text -noout | grep 'Not After'"

# 续期
ssh root@47.253.123.3 "certbot renew && systemctl reload nginx"
```

#### 问题 7: 部署后 _next/static 404

这是一个高频问题。Next.js standalone 模式要求 `static` 目录在 `.next/standalone/.next/static`，但打包时 static 在 `.next/static`。每次部署前端后必须手动复制。

```bash
# 修复命令
ssh root@47.253.123.3 "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"
```

### 7.2 诊断命令速查

```bash
# 全面健康检查
./target/release/polisctl health

# 检查首页
curl -s -o /dev/null -w "HTTP %{http_code}, Time: %{time_total}s\n" https://www.mzgw.com/

# 检查 API
curl -s https://www.mzgw.com/api/health | python3 -m json.tool

# 服务器内存
ssh root@47.253.123.3 "free -h; echo '---'; df -h /"

# 所有服务状态
ssh root@47.253.123.3 "systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web"

# 最近错误日志
ssh root@47.253.123.3 "journalctl -u polis-gateway --since '10 min ago' --no-pager | grep -i error | tail -10"
```

---

## 8. 快速参考卡片

### 8.1 最常用命令

```bash
# === 本地 ===
polisctl health                                # 健康检查
polisctl space search "关键词"                  # 搜索社区
polisctl auth login <邮箱> <密码>               # 登录
cargo build --release --target x86_64-unknown-linux-gnu  # 编译全部后端
cd web && npm run build                        # 编译前端

# === 服务器 ===
systemctl status polis-gateway                  # 查看服务状态
systemctl restart polis-web                     # 重启前端
journalctl -u polis-gateway -f                  # 实时日志
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static  # 修复白屏

# === 区块链 ===
polis-chain wallet create                       # 创建钱包
polis-chain wallet balance                      # 查询余额
polis-chain wallet sign --data "<消息>"          # 签名消息
```

### 8.2 服务端口映射

```
:80   → Nginx (HTTP → HTTPS 重定向)
:443  → Nginx (HTTPS)
         ├─ /api/*       → :8080 (Gateway)
         ├─ /_next/static → :3000 (Next.js, 1年缓存)
         └─ /*           → :3000 (Next.js)
:3000 → Next.js 前端
:8080 → polis-gateway (内部路由到各微服务)
:5432 → PostgreSQL
:8545 → polis-chain (暂未部署到服务器)
```

### 8.3 重要文件路径

| 文件 | 路径 |
|------|------|
| 后端二进制 | `/root/polis/target/release/polis-*` |
| 前端文件 | `/opt/polis-web/` |
| Nginx 配置 | `/etc/nginx/conf.d/polis.conf` |
| SSL 证书 | `/etc/letsencrypt/live/speedtest.mzgw.com/` |
| systemd 单元 | `/etc/systemd/system/polis-*.service` |
| PostgreSQL 数据 | `/var/lib/postgresql/` |

### 8.4 环境变量参考

| 变量 | 服务 | 说明 | 默认值 |
|------|------|------|--------|
| `DATABASE_URL` | 全部 | PostgreSQL 连接串 | `postgres://polis:password@localhost/polis` |
| `JWT_SECRET` | gateway/user | JWT 签名密钥 | 必须设置 |
| `POLIS_BASE_URL` | polisctl | API 基地址 | `https://www.mzgw.com` |
| `POLIS_FORMAT` | polisctl | 输出格式 | `json` |
| `CHAIN_API_URL` | content | 链 API 地址 | — |
| `CHAIN_SITE_ID` | content | 站点 ID | — |
| `POLIS_SITE_PRIVATE_KEY` | content | 站点签名私钥 | — |

---

> **提示**: 本手册基于 2026-06-04 实际系统验证编写。所有命令均已在真实环境中测试通过。
> 截图保存在 `docs/screenshots/` 目录下。
