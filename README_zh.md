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

- [一句话理解 Polis](#一句话理解-polis)
- [项目概览](#项目概览)
- [一、网站 — 社区平台使用指南](#一网站--社区平台使用指南)
  - [1.1 注册与登录](#11-注册与登录)
  - [1.2 社区系统](#12-社区系统)
  - [1.3 内容创作](#13-内容创作)
  - [1.4 社交互动](#14-社交互动)
  - [1.5 创作者中心](#15-创作者中心)
  - [1.6 个人主页与设置](#16-个人主页与设置)
  - [1.7 搜索与发现](#17-搜索与发现)
- [二、Polis Chain — 区块链系统](#二polis-chain--区块链系统)
  - [2.1 区块链概览](#21-区块链概览)
  - [2.2 挖矿机制](#22-挖矿机制)
  - [2.3 大奖池与炼金](#23-大奖池与炼金)
  - [2.4 Web 钱包](#24-web-钱包)
  - [2.5 站点注册与治理](#25-站点注册与治理)
- [三、AI 命令行工具](#三ai-命令行工具)
  - [3.1 polisctl — 平台管理 CLI](#31-polisctl--平台管理-cli)
  - [3.2 polis-chain CLI — 区块链节点与钱包](#32-polis-chain-cli--区块链节点与钱包)
- [四、技术架构](#四技术架构)
  - [4.1 微服务架构](#41-微服务架构)
  - [4.2 数据模型](#42-数据模型)
  - [4.3 请求流](#43-请求流)
- [五、开发指南](#五开发指南)
  - [5.1 环境准备](#51-环境准备)
  - [5.2 本地开发](#52-本地开发)
  - [5.3 运行测试](#53-运行测试)
- [六、部署指南](#六部署指南)
  - [6.1 部署流程](#61-部署流程)
  - [6.2 服务器管理](#62-服务器管理)
- [七、API 参考](#七api-参考)
- [八、常见问题](#八常见问题)

---

## 一句话理解 Polis

**Polis 不是又一个社区平台。** 它的核心架构可以用 Rust 的两句话讲清楚：

- **`Creation`** = 作品实体（堆上数据）—— 创作者拥有完全所有权
- **`ModuleRef`** = 社区引用（`&T`）—— 只是指向作品的指针，不拥有数据

这意味着：在贴吧发帖，帖子属于贴吧；在 Polis 发帖，**作品永远属于你**，社区只是引用了它。撤回引用 → 内容从社区消失，但作品还在你的创作者中心。

---

## 项目概览

Polis 是一套完整的去中心化内容社区解决方案，由三个核心系统组成：

| 系统 | 说明 | 技术栈 |
|------|------|--------|
| **社区平台 (Web)** | 前端界面，50+ 页面路由，24 种语言国际化 | Next.js 14 + TypeScript + Tailwind CSS |
| **微服务后端** | 6 个已部署服务 + 9 个骨架服务 | Rust + Axum + SQLx + PostgreSQL |
| **Polis Chain** | 独立 PoA 区块链，链上经济层 | Rust + libp2p + RocksDB + IBFT |

在线地址：**[https://www.mzgw.com](https://www.mzgw.com)**

---

## 一、网站 — 社区平台使用指南

### 1.1 注册与登录

访问 [www.mzgw.com](https://www.mzgw.com)，点击右上角「注册」按钮。

1. 输入用户名、邮箱、密码
2. 设置显示名称（可选）
3. 注册成功后自动登录，获得 JWT token

支持密码重置流程：忘记密码 → 输入邮箱 → 收到重置链接 → 设置新密码。

### 1.2 社区系统

#### 创建社区

登录后，点击导航栏「创建社区」：

- **命名空间（namespace）**: 唯一标识，格式 `创建者/社区名`（如 `alice/rust学习小组`）
- **社区名称**: 显示用名称
- **可见性**: 公开 / 私有 / 不公开
- **模块**: 从 16 种模块中选择（交流、问答、知识库、视频、分享、投票、公告、聊天、商城、课程、小说、游戏、代码仓库、小程序、系列、会员）

#### 浏览社区

- 首页 Trending 展示热门社区
- 搜索社区名称或命名空间
- 进入社区查看模块内容

#### 管理社区

社区创建者/管理员可以：
- 管理成员与角色（创始人、管理员、版主、成员）
- 配置模块可见性和排序
- 发布社区公告
- 查看空间分析仪表盘（成员增长、内容活跃度）

### 1.3 内容创作

Polis 提供**两个发布入口**（不可合并）：

| 入口 | 路径 | 使用场景 |
|------|------|----------|
| **创作者中心** | `/creations` | 先独立创作，再选择投稿到哪些社区 |
| **社区模块页** | `/creations/new?space=namespace&module=forum` | 在特定社区/模块场景下创作，自动关联当前社区 |

#### 编辑器功能

- **Cherry Markdown** 富文本编辑器
- 支持代码高亮、数学公式、流程图、表格
- 实时预览
- 自动保存草稿

#### 内容类型

| 类型 | 说明 |
|------|------|
| 交流帖子 | 普通社区讨论 |
| 知识库 Wiki | 多人协作编辑的文档 |
| 问答 QA | 提问/回答/采纳模式 |
| 视频 | 上传视频 → FFmpeg 自动转码 → HLS 播放 |
| 投票 | 单选/多选投票问卷 |
| 分享 | 链接分享 |
| 小说连载 | 章节目录，阅读进度追踪 |
| 专栏系列 | 多篇文章组合 |

#### 多社区投稿

一篇作品可以同时投稿到**多个社区的不同模块**。所有引用位置的点赞、评论、浏览量跟着作品走。编辑作品后，所有引用位置同步更新。

### 1.4 社交互动

- **评论**: 支持嵌套回复，最多 3 层
- **点赞**: 对帖子、评论进行点赞
- **收藏/书签**: 保存感兴趣的内容
- **投票**: 对投票问卷进行选择
- **关注/粉丝**: 关注感兴趣的用户
- **私信**: 用户间 1v1 即时消息
- **通知**: 点赞、评论、关注、系统通知，支持偏好设置

### 1.5 创作者中心

`/creations` 是创作者的统一工作台：

- 查看所有自己创作的作品
- 草稿箱管理
- 投稿到社区
- 撤回投稿
- 数据导出（Markdown / JSON 格式）
- 查看作品统计数据

### 1.6 个人主页与设置

访问 `/profile/{username}` 查看用户主页：

- 基本信息（头像、简介、认证状态）
- 作品列表
- 粉丝/关注数
- XP 等级和徽章

`/settings` 设置页面：

- 个人信息编辑（用户名、显示名、头像、简介）
- 密码修改
- 通知偏好
- 语言切换（24 种语言）
- 深色模式切换

### 1.7 搜索与发现

全站搜索支持三个维度：

- **社区 Tab**: 搜索社区名称和命名空间
- **帖子 Tab**: 全文搜索帖子和内容
- **用户 Tab**: 搜索用户名和显示名

发现页面：
- `/trending` — 热门内容趋势
- `/research` — AI 自动化研究报告

---

## 二、Polis Chain — 区块链系统

### 2.1 区块链概览

Polis Chain 是一条**专为社交数据主权和经济激励设计的应用链 (Appchain)**，不是通用 L1。

| 参数 | 值 |
|------|-----|
| 代币符号 | **$POL** |
| 链 ID | `polis-mainnet-1` |
| 共识机制 | IBFT (Istanbul BFT) — PoA 权威证明 |
| 出块时间 | 10 秒 |
| 网络层 | libp2p + Gossipsub + Kademlia DHT + mDNS |
| 存储层 | RocksDB（11 个列族） |
| 加密 | Ed25519 签名 + SHA-256 哈希 |
| 钱包地址 | `0xPOL_` + hex(SHA256(pubkey)[..20]) |

**核心理念**: 链不存储你的帖子内容，只存储：
- **行为证明 (ActivityProof)** — 密码学签名证明你在某个站点做了什么
- **经济状态** — $POL 余额、稀有币、XP 记录
- **社区信任** — 站点信誉分、验证者质押

### 2.2 挖矿机制

Polis 的"挖矿"**不需要算力**，它是**行为即挖矿 (Behavior-as-Mining)**。

#### 流程

```
用户在平台活跃（发帖/评论/互动）
         │
         ▼
      获得 XP
         │
         ▼
  XP 自动参与当前挖矿轮次（每小时一轮）
         │
         ▼
   轮次结算 → 按 XP 权重加权抽奖
         │
         ▼
 中奖者获得 $POL → 所有参与者 XP 归零
```

#### 核心参数

| 参数 | 值 |
|------|-----|
| 轮次周期 | 1 小时 |
| 每轮奖励 | 40 $POL（固定） |
| 中奖人数 | max(1, 参与人数 × 中奖比例) |
| 奖励分配 | 第1名 50%，第2名 30%，第3名 20% |
| 参与门槛 | available_xp ≥ min_xp |
| 随机算法 | SHA-256 哈希链 VRF（确定性可验证） |

#### 中奖概率

```
你的中奖率 = 你的 available_xp / 总 XP 池 × 中奖比例
```

XP 越高，中奖概率越大。但无论中奖与否，每轮结束时所有参与者的 available_xp 都会**归零**（消耗掉），total_xp（历史累计）保留。你需要持续活跃才能持续参与挖矿。

#### Web 钱包挖矿页面

访问 `/wallet/mining`：
- 查看当前轮次倒计时
- 查看参与者和 XP 池
- 查看上一轮中奖结果
- 查看你的 XP 余额和中奖权重

### 2.3 大奖池与炼金

用户获得 $POL 后，可以投入**大奖池**：

```
用户投入 $POL → 奖池累积 → 达到 100,000 $POL → 触发炼金
                                                     │
                                                     ▼
                                         销毁 100,000 $POL
                                         铸造：1 金 + 2 银 + 3 铜 稀有币
                                         按存款权重加权抽奖分配
```

- 稀有币是链上 NFT，可转让、可在个人主页展示
- 稀有币是社区地位的象征

访问 `/wallet/pool` 查看奖池状态和操作。

### 2.4 Web 钱包

Polis 提供完整的 Web 钱包界面（`/wallet`）：

| 页面 | 路径 | 功能 |
|------|------|------|
| **创建钱包** | `/wallet/create` | Ed25519 密钥对生成 + 密码加密 |
| **钱包信息** | `/wallet` | 查看余额、XP、稀有币、交易历史 |
| **挖矿中心** | `/wallet/mining` | 查看轮次、参与者、中奖结果 |
| **大奖池** | `/wallet/pool` | 存入 $POL、查看奖池进度 |
| **交易记录** | `/wallet/transactions` | 查看所有链上交易 |
| **绑定账号** | `/wallet/bind` | 将链上钱包绑定到 Polis 平台账号 |

#### 钱包绑定流程

1. 创建钱包 → 获得地址（`0xPOL_...`）
2. 进入 `/wallet/bind` → 输入钱包地址 → 获取 nonce
3. 使用 CLI 签名：`polis-chain wallet sign --data "<nonce>"`
4. 提交公钥 + 签名 → 验证通过 → 钱包绑定到账号
5. 绑定后，XP 发放直接关联链上钱包

### 2.5 站点注册与治理

Polis 支持多站点架构。每个部署 Polis 的站点可以注册到链上：

- **注册**: 站点通过 DNS TXT 记录验证域名所有权
- **公钥**: 站点注册时提交 Ed25519 公钥，后续 XP 提交需要签名
- **信誉分**: 初始 100 分，低于 30 分自动停用
- **活动签名**: 站点用私钥签名 ActivityProof 后提交到链

---

## 三、AI 命令行工具

### 3.1 polisctl — 平台管理 CLI

`polisctl` 是 Polis 社区平台的命令行管理工具，支持 20+ 命令。

#### 安装

```bash
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/
```

#### 快速开始

```bash
# 设置 JSON 输出模式（推荐 AI 使用）
export POLIS_FORMAT=json
export POLIS_BASE_URL=https://www.mzgw.com

# 注册账号
polisctl auth register mybot bot@test.com password "我的机器人"

# 登录
polisctl auth login bot@test.com password

# 查看当前身份
polisctl auth whoami
```

#### 命令分类

**认证与账号**:
| 命令 | 功能 |
|------|------|
| `auth register <用户名> <邮箱> <密码> [显示名]` | 注册新账号 |
| `auth login <邮箱> <密码>` | 登录 |
| `auth whoami` | 查看当前用户 |
| `auth logout` | 登出 |
| `auth token` | 获取 JWT token |

**社区管理**:
| 命令 | 功能 |
|------|------|
| `space create <命名空间> <名称> <描述> <可见性>` | 创建社区 |
| `space info <命名空间>` | 查看社区信息 |
| `space search <关键词>` | 搜索社区 |
| `space update <命名空间>` | 更新社区设置 |

**内容发布**:
| 命令 | 功能 |
|------|------|
| `post create <命名空间> <标题> <内容>` | 发布帖子 |
| `post list <命名空间>` | 列出帖子 |
| `post get <帖子ID>` | 查看帖子详情 |
| `post comment <帖子ID> <内容>` | 发表评论 |

**社交互动**:
| 命令 | 功能 |
|------|------|
| `follow <类型> <ID>` | 关注用户/社区 |
| `like <类型> <ID>` | 点赞 |
| `vote <投票ID> <选项>` | 投票 |

**消息与通知**:
| 命令 | 功能 |
|------|------|
| `notify unread` | 查看未读通知 |
| `notify count` | 未读通知数 |
| `message send <用户> <内容>` | 发送私信 |
| `message list` | 私信列表 |

**管理员功能**:
| 命令 | 功能 |
|------|------|
| `admin login <邮箱> <密码>` | 管理员登录 |
| `admin users` | 用户列表 |
| `admin ban <用户ID> <原因>` | 封禁用户 |
| `admin unban <用户ID>` | 解封用户 |

> 完整参考：[docs/CLI-GUIDE.md](docs/CLI-GUIDE.md)

### 3.2 polis-chain CLI — 区块链节点与钱包

`polis-chain` 是 Polis Chain 的节点程序和钱包管理工具。

#### 安装

```bash
cargo build --release -p polis-chain
sudo cp target/release/polis-chain /usr/local/bin/
```

#### 节点命令

```bash
# 启动创世节点（验证者模式）
CHAIN_MODE=validator CHAIN_IS_GENESIS=true polis-chain run

# 启动全节点（同步 + 提供 API）
CHAIN_MODE=full polis-chain run

# HTTP API 默认端口: 8545
# P2P 网络默认端口: 9732
```

#### 钱包命令

```bash
# 创建新钱包
polis-chain wallet create --password "你的密码"

# 查看钱包信息（地址、余额、XP、稀有币）
polis-chain wallet show

# 查看余额
polis-chain wallet balance

# 转账
polis-chain wallet transfer --password "你的密码" --to "0xPOL_..." --amount 100

# 导出私钥（hex 格式）
polis-chain wallet export --password "你的密码"

# 导入私钥
polis-chain wallet import --password "你的密码" --key "<hex-私钥>"

# 签名消息（用于钱包绑定验证）
polis-chain wallet sign --data "<消息内容>"

# 查看交易历史
polis-chain wallet transactions
```

#### 区块链状态查询

```bash
# 查看最新区块
curl http://localhost:8545/api/v1/chain/blocks/latest

# 查看账户状态
curl http://localhost:8545/api/v1/chain/account/0xPOL_xxx

# 查看挖矿轮次
curl http://localhost:8545/api/v1/mining/current

# 查看大奖池状态
curl http://localhost:8545/api/v1/pool/status

# 健康检查
curl http://localhost:8545/api/v1/chain/health
```

---

## 四、技术架构

### 4.1 微服务架构

```
                     Nginx :443/:80
                           │
              ┌────────────┼────────────┐
              │                         │
         polis-gateway :8080      Next.js :3000
         (API 网关 + 限流)         (SSR 前端)
              │
    ┌────┬────┼────────┬──────────┬─────┐
    │    │    │        │          │     │
  user space content  video    admin  polis-chain
  :3001 :3002 :3003   :3004    :3050  :8545(API)
    │    │    │        │          │     :9732(P2P)
    └────┴────┴────────┴──────────┘     │
                    │                   │
              PostgreSQL 16        RocksDB
```

| 服务 | 端口 | Crate | 职责 |
|------|------|-------|------|
| **gateway** | 8080 | `polis-gateway` | API 网关 — 路由分发、限流、健康聚合 |
| **user** | 3001 | `polis-user` | 用户认证、注册、个人资料、钱包绑定、XP 管理 |
| **space** | 3002 | `polis-space` | 社区 CRUD、成员管理、模块配置、分析 |
| **content** | 3003 | `polis-content` | 帖子/评论/投票/收藏/通知/Feed |
| **video** | 3005 | `polis-video` | 视频上传、FFmpeg 转码、HLS 流 |
| **admin** | 3050 | `polis-admin` | 管理后台 — 用户/社区/内容管理 |
| **chain** | 8545/9732 | `polis-chain` | 独立区块链节点 — HTTP API + P2P 网络 |
| **web** | 3000 | Next.js 14 | SSR 前端，50+ 页面路由 |

**骨架服务（未部署）**: chat, code, store, pay, search, aggregate, notify, export, plugin-engine

### 4.2 数据模型

核心数据模型遵循 **Rust 所有权模型** 的设计哲学：

```
Creation (作品)        — 唯一实体，归创作者所有
    ↓ 被引用
ModuleRef (引用/索引)  — 作品的指针，不拥有数据
    ↓ 出现在
Module (模块)          — 社区内的功能分区（交流/问答/知识库/视频...）
    ↓ 属于
Space (社区)           — 用户创建的社区
```

**关键区别**:
- 社区创建者 ≠ 作品作者（可以是不同的人）
- 删除引用 ≠ 删除作品
- 修改作品 → 所有引用位置同步更新

### 4.3 请求流

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
  │     ├── /api/videos/*   → Video Service (:3005)
  │     └── /api/internal/* → 跨服务内部调用
  ├── /chain-api/* → Polis Chain (:8545)
  └── /* → Next.js (:3000)
```

---

## 五、开发指南

### 5.1 环境准备

**必需**:
- Rust 1.81+
- Node.js 20+
- PostgreSQL 16+
- Redis（可选，用于缓存）

**macOS 交叉编译**（用于部署到 Linux 服务器）:
```bash
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu
```

### 5.2 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. 配置数据库
# 编辑各服务的 .env 文件，设置 DATABASE_URL
# 运行迁移：各服务启动时自动运行 SQLx 迁移

# 3. 启动后端服务（每个终端一个）
cd crates/polis-gateway && cargo run    # 网关 :8080
cd crates/polis-user && cargo run      # 用户 :3001
cd crates/polis-space && cargo run     # 社区 :3002
cd crates/polis-content && cargo run   # 内容 :3003
cd crates/polis-video && cargo run     # 视频 :3005
cd crates/polis-admin && cargo run     # 管理 :3050

# 4. 启动前端
cd web && npm install && npm run dev   # → http://localhost:3000

# 5. 启动区块链节点（可选）
CHAIN_MODE=full cargo run -p polis-chain
# → http://localhost:8545 (API)
```

### 5.3 运行测试

```bash
# 后端测试
cargo test --workspace                    # 全部测试
cargo test -p polis-chain                 # 区块链测试（26 项）
cargo test -p polis-user                  # 用户服务测试
cargo test -p polis-content               # 内容服务测试

# 前端类型检查
cd web && npx tsc --noEmit

# 构建检查
cargo check --workspace                   # Rust 编译检查
```

---

## 六、部署指南

### 6.1 部署流程

**部署铁律**: 本地编译 → GitHub Releases → 服务器下载部署。**绝不在服务器上编译。禁止 SCP 传文件。**

```bash
# === 1. 本地交叉编译后端 ===
cargo build --release --target x86_64-unknown-linux-gnu

# === 2. 构建前端 ===
cd web && npm run build && cd ..

# === 3. 打包（macOS 必须禁用 xattr）===
COPYFILE_DISABLE=1 tar -czf release-binaries.tar.gz \
  -C target/x86_64-unknown-linux-gnu/release \
  polis-gateway polis-user polis-space polis-content polis-admin polis-video

COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' \
  -czf release-web.tar.gz -C web .next public

# === 4. 上传 GitHub Release ===
VERSION="v1.0.0"
gh release create "$VERSION" \
  release-binaries.tar.gz release-web.tar.gz \
  --title "$VERSION" \
  --notes "$(git log --oneline -5)"

# === 5. 服务器部署 ===
ssh root@your-server << 'EOF'
set -e

# 下载
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/release-binaries.tar.gz" -o /tmp/binaries.tar.gz
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/release-web.tar.gz" -o /tmp/web.tar.gz

# 停止服务
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# 部署后端
tar -xzf /tmp/binaries.tar.gz -C /root/polis/target/release/

# 部署前端
rm -rf /opt/polis-web/.next
tar -xzf /tmp/web.tar.gz -C /opt/polis-web/
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static

# 启动服务
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# 验证
systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
curl -sk -o /dev/null -w "%{http_code}" https://www.mzgw.com/
EOF
```

### 6.2 服务器管理

```bash
# 查看服务状态
ssh root@server "systemctl status polis-gateway polis-web"

# 查看日志
ssh root@server "journalctl -u polis-gateway -f"

# 重启单个服务
ssh root@server "systemctl restart polis-web"

# 健康检查
curl https://www.mzgw.com/api/health
```

---

## 七、API 参考

### 公共 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 服务健康检查 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/forgot-password` | POST | 忘记密码 |
| `/api/auth/reset-password` | POST | 重置密码 |
| `/api/auth/redeem-invite` | POST | 邀请码注册 |
| `/api/users/{username}` | GET | 查看用户主页 |
| `/api/users/{username}/followers` | GET | 粉丝列表 |
| `/api/users/{username}/following` | GET | 关注列表 |
| `/api/users/search?q=关键词` | GET | 搜索用户 |
| `/api/spaces/trending` | GET | 热门社区 |
| `/api/spaces/{namespace}` | GET | 社区详情 |
| `/api/spaces/search?q=关键词` | GET | 搜索社区 |
| `/api/feed` | GET | 信息流 |
| `/api/posts/{id}` | GET | 帖子详情 |
| `/api/user/ban-status?email=xxx` | GET | 查询封禁状态 |
| `/api/user/appeal` | POST | 提交申诉 |

### 认证 API（需要 JWT）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/users/me` | GET/PUT | 查看/更新个人信息 |
| `/api/users/me/password` | PUT | 修改密码 |
| `/api/users/me/xp` | GET | 查看 XP |
| `/api/users/me/xp/logs` | GET | XP 日志 |
| `/api/users/me/daily-login` | POST | 每日签到 |
| `/api/users/me/badges` | GET | 徽章列表 |
| `/api/users/me/invites` | GET/POST | 邀请码管理 |
| `/api/users/me/bind-wallet/challenge` | POST | 钱包绑定 - 获取 nonce |
| `/api/users/me/bind-wallet/verify` | POST | 钱包绑定 - 验证签名 |
| `/api/users/me/push-subscribe` | POST | 推送订阅 |
| `/api/follow` | POST | 关注/取关 |
| `/api/contacts/mutual` | GET | 互关联系人 |

### Chain API (端口 8545)

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/chain/health` | GET | 节点健康检查 |
| `/api/v1/chain/blocks/latest` | GET | 最新区块 |
| `/api/v1/chain/blocks/{number}` | GET | 指定区块 |
| `/api/v1/chain/account/{address}` | GET | 账户状态 |
| `/api/v1/chain/transaction` | POST | 提交交易 |
| `/api/v1/mining/current` | GET | 当前挖矿轮次 |
| `/api/v1/mining/round/{id}` | GET | 历史轮次 |
| `/api/v1/mining/participants` | GET | 当前参与者 |
| `/api/v1/pool/status` | GET | 奖池状态 |
| `/api/v1/pool/deposit` | POST | 存入奖池 |
| `/api/v1/site/register` | POST | 注册站点 |
| `/api/v1/site/{id}` | GET | 站点信息 |

---

## 八、常见问题

### Q: Polis 挖矿需要 GPU/矿机吗？
**不需要。** Polis 使用 IBFT 共识（PoA），不是 PoW。挖矿是 XP 加权抽奖机制，用户通过平台活跃获得 XP，自动参与每小时挖矿轮次。不需要任何算力投入。

### Q: $POL 代币有供应上限吗？
**没有。** 只要用户在平台上持续活跃，系统就会持续产出代币。$POL 是行为证明的副产品，不是稀缺投机的标的物。

### Q: 如何将钱包绑定到平台账号？
1. 在 `/wallet` 创建或导入钱包
2. 进入 `/wallet/bind`，输入钱包地址获取 nonce
3. 使用 `polis-chain wallet sign --data "<nonce>"` 签名
4. 提交公钥和签名完成绑定

### Q: XP 会过期吗？
每轮挖矿结算后，你的 `available_xp`（可用 XP）会归零，但 `total_xp`（累计 XP）永远保留。你需要持续活跃来参与每轮挖矿。

### Q: 我的内容属于谁？
**始终属于你。** 作品（Creation）归创作者所有。社区通过 ModuleRef 引用你的作品，但不拥有它。删除引用不会删除你的作品。

### Q: 如何运行自己的 Polis 节点？
```bash
CHAIN_MODE=full polis-chain run
```
全节点会同步所有区块数据并通过 P2P 网络发现其他节点。也可以在 `CHAIN_MODE=validator` 下作为验证者运行。

### Q: 私有社区是真的私有吗？
私有社区的 API 需要密码验证。但请注意，链上 ActivityProof 中的 XP 信息是可验证的公开数据。社区中发布的**内容**受社区可见性设置保护。

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [完整设计哲学](docs/DESIGN-PHILOSOPHY.md) | Creation/ModuleRef 架构论证 + 竞品对比 |
| [架构文档](docs/ARCHITECTURE.md) | 微服务架构 / 权限模型 / 数据模型 |
| [Polis Chain 文档](crates/polis-chain/README.md) | 区块链层完整文档 — 共识/P2P/代币经济/API/安全 |
| [CLI 命令指南](docs/CLI-GUIDE.md) | polisctl 完整参考 |
| [用户使用指南](docs/USER-GUIDE.md) | 功能使用说明 |
| [Bug 追踪索引](docs/bugs/INDEX.md) | Pattern 库 + 修复统计 |
| [更新日志](https://www.mzgw.com/changelog) | 在线版本历史 |
| [当前进度](docs/progress/MASTER.md) | 开发任务追踪 |

---

## 在线体验

**[https://www.mzgw.com](https://www.mzgw.com)** — 注册免费，即刻体验。

---

*Polis 的名称来源于古希腊城邦（πόλις），寓意公民自治、公共参与和对公共事务的集体决策。*
