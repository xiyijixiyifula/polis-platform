<div align="center">

# 🏛️ Polis（πόλις）

**未来社区平台 — 让创建社区像创建 GitHub 仓库一样简单**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-green)](https://www.mzgw.com)

</div>

---

## 🌐 在线体验

**https://www.mzgw.com**

测试账号：注册免费，即刻体验所有功能。

---

## ✨ 当前功能 (v0.3.81)

### 🏗️ 引用驱动架构（核心设计）

Polis 采用**引用驱动架构**：内容数据归创作者所有（`creations` 表），社区只是引用文件夹（`community_module_refs` 表）。同一内容可投稿到多个社区，点赞/评论/浏览量跟随数据本体走，社区仅控制引用可见性。

| 概念 | 类比 | 实现 |
|------|------|------|
| **创作数据本体** | 原始文件 | `creations` 表 — 创作者完全控制 |
| **社区模块引用** | 文件夹快捷方式 | `community_module_refs` 表 — 可显示/隐藏/审核 |
| **投稿** | 创建快捷方式 | 同一创作可投到多个社区 |
| **撤稿** | 删除快捷方式 | 仅移除引用，创作本体保留 |

### 功能列表

| 功能 | 状态 | 说明 |
|------|------|------|
| 👤 用户系统 | ✅ | 注册/登录/JWT 认证/个人资料编辑 |
| 🏛️ 社区创建 | ✅ | 创建社区、嵌套命名空间、公开/私有/不公开 |
| 🏗️ 引用驱动架构 | ✅ | 数据本体与社区引用分离、跨社区投稿/撤稿 |
| 🎨 创作中心 | ✅ | `/creations` 统一管理、新建/编辑/详情/投稿弹窗 |
| 💬 交流板块 | ✅ | Markdown 发帖、标签、置顶、精选、Cherry Engine 渲染 |
| 🔖 分享模块 | ✅ | 个人分享空间，仅创建者可发布，他人可阅读/点赞/评论 |
| 📚 知识库(Wiki) | ✅ | 协作文档模块，所有成员可编写 Markdown 知识库页面 |
| ❓ 问答(QA) | ✅ | 社区提问与回答模块，空间内问答 Tab 过滤展示 |
| 🎬 视频模块 | ✅ | 视频上传/FFmpeg 转码/HLS 播放/缩略图/发布到社区/审核 |
| 👥 成员列表 | ✅ | 空间成员展示 (头像/用户名/角色/加入时间)，后端 JOIN 查询 |
| 💬 实时聊天 | ✅ | 空间聊天室 (REST + 轮询), 消息持久化 |
| ✉️ 私信系统 | ✅ | 用户间私信、会话列表、未读计数、标记已读 |
| 💬 评论系统 | ✅ | 评论/点赞评论/嵌套回复 |
| 👍 社交互动 | ✅ | 帖子点赞、收藏/书签 |
| 🗳️ 赞同/反对 | ✅ | 帖子赞同/反对投票、实时分数 |
| 👥 关注/粉丝 | ✅ | 关注用户、粉丝列表、互关 |
| 🔔 通知系统 | ✅ | 互动通知、未读数、标记已读、偏好设置 |
| 🗳️ 投票/问卷 | ✅ | 单选/多选投票、实时结果、社区投票列表 |
| ⚙️ 模块配置 | ✅ | 16 种社区模块开关（交流/分享/知识库/系列/会员/视频/代码仓库/问答/投票/公告/聊天/商城/课程/小说/游戏/小程序/成员） |
| 🏠 社区概览 | ✅ | GitHub 风格概览首页、精选内容、快速操作 |
| 📢 社区公告 | ✅ | 紧急/重要/普通分级、横幅展示 |
| 📝 草稿箱 | ✅ | 未完成帖子自动保存 |
| 🔍 全站搜索 | ✅ | PostgreSQL ILIKE 全文搜索（社区+帖子+用户三Tab） |
| 🍎 深色模式 | ✅ | Apple iOS 层级系统、纯黑背景、纯手动触发、无自动跟随 |
| 🔒 帖子可见性 | ✅ | 公开/私密/不公开三级权限, 编辑器选择器 + PostCard徽章 |
| 🛡️ 管理后台 | ✅ | 9 模块全功能仪表盘 + 系统健康 + 增长趋势 + 最近动态 + 暗黑模式 |
| 📋 更新日志 | ✅ | `/changelog` 版本历史 |
| 🤖 AI 研究 | ✅ | 自动社区调研 + `/research` 报告页 |
| 🔒 HTTPS | ✅ | Let's Encrypt TLS 1.3 |
| 🧪 E2E 测试 | ✅ | 145 项全动态注册用户测试 (v0.3.81), 零种子数据依赖 |
| 📦 数据导出 | ✅ | Markdown/JSON 格式导出 |
| 🏥 服务健康检查 | ✅ | Gateway 聚合 /api/health/all + 6 微服务独立 /health |
| 📝 Markdown 编辑器 | ✅ | Cherry Markdown 集成，完整工具栏 |
| 📁 文件分享系统 | ✅ | 文件上传、分享链接、密码保护下载 |
| 🧩 小程序 | ✅ | 嵌入式小应用，ModuleType::MiniApp 后端复用 |
| 🎮 游戏 | ✅ | 游戏攻略/评测/资讯，ModuleType::Game 后端复用 |
| 📊 投票中心 | ✅ | 全平台投票列表 /polls + GET /api/polls API |
| 📖 小说/阅读 | ✅ | 小说发布与阅读，章节连载，ModuleType::Novel 后端复用 |
| 📖 专栏/内容系列 | ✅ | 系列创建、文章收录、系列展示页 |
| 💰 付费社区 | ✅ | 会员等级创建/编辑/订阅管理 |
| 🤝 粉丝/关注页 | ✅ | 独立粉丝列表和关注列表页面 |
| 📰 信息流首页 | ✅ | 3 栏布局、@用户/社区/模块 时间线、分页导航 |
| 🖥️ CLI 命令行工具 | ✅ | Rust 静态二进制、20+ 命令、JSON/Table 输出 |
| 📝 帖子编辑 | ✅ | 帖子作者可在详情页内联编辑标题/标签/内容 + API + CLI |
| 📊 空间分析 | ✅ | 空间仪表盘 — 6 项指标 + 热门排行 |
| 🧪 E2E 测试 | ✅ | 全栈自动化测试 |
| 🎨 玻璃拟态卡片 | ✅ | PostCard/SpaceCard 毛玻璃背景 + 悬浮上浮 + 绿色辉光阴影 |
| 🖥️ 深色控制台侧边栏 | ✅ | 首页左侧导航 — 深蓝渐变 + 绿色左边框激活态 |
| 🔷 几何SVG社区图标 | ✅ | 8种独特几何形状 + 8种配色, 哈希确定性选择 |
| ✨ 粒子背景动画 | ✅ | SpaceParticles Canvas 组件 — 粒子连线 + 响应式缩放 |
| 🏠 Hero Banner | ✅ | 首页 Feed 顶部 — "连接思想，共创未来" + 粒子背景 + CTA |
| 💎 Liquid Glass 液体玻璃 | ✅ | SVG feTurbulence 动态折射 + 四层架构 + 渐变流动背景 |
| 👥 模块管理者 | ✅ | 社区模块权限管理（审核/隐藏/置顶/封禁） |
| 🎚️ 社区等级系统 | ✅ | Lv.1~Lv.6 经验成长体系 |

---

## 🚧 开发中

| 功能 | 计划版本 | 进度 |
|------|----------|------|
| 🛍️ 社区商城 | v0.5.0 | 桩代码 |
| 💻 Git 代码仓库 | v0.5.0 | 桩代码 |
| 💰 打赏/支付 | v0.5.0 | 桩代码 |
| 🧩 WASM 插件 | v0.5.0 | 桩代码 |

---

## 🚀 生产部署

当前生产环境运行在阿里云 ECS 上，裸金属部署：

```bash
# 拉取代码
ssh root@www.mzgw.com "cd /root/polis && git pull origin main"

# 构建并部署（auto-dev.sh 自动化）
./auto-dev.sh

# 手动构建单个服务
cd crates/polis-gateway && cargo build --release
systemctl restart polis-gateway
```

### 服务架构

```
                    ┌──────────────────┐
                    │  Nginx :443/:80  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
         ┌────▼─────┐                ┌─────▼────┐
         │ Gateway  │ :8080          │ Next.js  │ :3000
         └────┬─────┘                └──────────┘
    ┌────┬────┼──────────┬──────────┬─────┐
    │    │    │          │          │     │
┌───▼┐ ┌▼──┐ ┌▼──┐ ┌────▼────┐ ┌──▼──┐ ┌▼──────┐
│Usr│ │Spc│ │Cnt│ │  Video  │ │Admin│ │Future │
│3001│ │3002│ │3003│ │  3004  │ │3050 │ │svcs   │
└───┘ └───┘ └───┘ └─────────┘ └─────┘ └───────┘
    │    │    │          │          │
    └────┴────┴──────────┴──────────┘
                    │
           ┌────────▼────────┐
           │  PostgreSQL     │
           └─────────────────┘
```

| 服务 | 端口 | 技术栈 | 状态 |
|------|------|--------|------|
| polis-gateway | 8080 | Axum 0.8 | ✅ 运行中 |
| polis-user | 3001 | Axum + SQLx | ✅ 运行中 |
| polis-space | 3002 | Axum + SQLx | ✅ 运行中 |
| polis-content | 3003 | Axum + SQLx | ✅ 运行中 |
| polis-video | 3004 | Axum + SQLx + FFmpeg | ✅ 运行中 |
| polis-admin | 3050 | Axum + SQLx | ✅ 运行中 |
| polis-web | 3000 | Next.js 14 | ✅ 运行中 |
| polis-store | - | Axum | 🚧 规划中 |
| polis-code | - | Axum | 🚧 规划中 |
| polis-pay | - | Axum | 🚧 规划中 |
| polis-search | - | Axum + Tantivy | 🚧 规划中 |

---

## 📖 文档

| 文档 | 说明 |
|------|------|
| [用户使用指南](docs/USER-GUIDE.md) | 完整功能使用说明 |
| [HTTPS 配置手册](docs/HTTPS-CONFIG.md) | SSL 证书/Nginx 配置/故障排查 |
| [部署方案](DEPLOY.md) | 生产部署架构与改进计划 |
| [更新日志](https://www.mzgw.com/changelog) | 在线版本历史 |

---

## 🛠️ 本地开发

```bash
# 前提条件
# - Rust 1.81+
# - Node.js 20+
# - PostgreSQL 16+
# - .env 配置 DATABASE_URL

# 启动后端
cd crates/polis-gateway && cargo run

# 启动前端
cd web && npm install && npm run dev
# 访问 http://localhost:3000
```

---

## 📂 项目结构

```
polis/
├── auto-dev.sh               ← 自动化开发部署脚本
├── auto-build.sh             ← 构建 + .env 校验
├── auto-research.sh          ← AI 社区调研
├── polisctl                  ← 平台 CLI 工具（Rust 二进制，20+ 命令）
├── polisctl admin ...       ← 管理后台通过 CLI 子命令
├── DEPLOY.md                 ← 部署方案文档
├── docs/
│   ├── USER-GUIDE.md         ← 用户使用指南
│   ├── CLI-GUIDE.md          ← CLI 命令行指南
│   └── HTTPS-CONFIG.md       ← HTTPS 配置参考
├── migrations/               ← 数据库迁移 SQL (15+ 文件)
├── crates/                   ← Rust 微服务 (7 个生产 + CLI)
│   ├── polis-core/           ← 共享库 (模型/错误/解析器)
│   ├── polis-gateway/        ← API 网关 ⭐
│   ├── polis-user/           ← 用户服务 ⭐
│   ├── polis-space/          ← 社区服务 ⭐
│   ├── polis-content/        ← 内容服务（含引用驱动架构/创作中心）⭐
│   ├── polis-video/          ← 视频服务（上传/转码/HLS）⭐
│   ├── polis-admin/          ← 管理后台 ⭐
│   └── polisctl/             ← CLI 命令行工具
└── web/                      ← Next.js 14 前端
    └── src/app/              ← 页面路由
```

⭐ = 当前生产环境运行中

---

## 🖥️ 命令行工具 (polisctl)

Polis 提供完整的命令行接口，使用 **Rust** 编写为单一静态二进制文件，无需运行时依赖。支持 JSON/Table 两种输出模式，适合 AI 代理和脚本集成。

### 安装

```bash
# 从源码编译
cd /root/polis && cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# 或从 GitHub Releases 下载预编译二进制
wget https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl \
  -O /usr/local/bin/polisctl && chmod +x /usr/local/bin/polisctl
```

### 配置

```bash
export POLIS_BASE_URL=https://www.mzgw.com
export POLIS_FORMAT=json    # json（AI/脚本推荐）或 table（人类可读）
```

### 快速上手

```bash
# 注册并登录
polisctl auth register mybot bot@test.com pass1234 "AI Bot"

# 发帖
polisctl post create "社区" "标题" "内容"

# 搜索社区
polisctl space search "Rust" -s 10

# 管理后台
polisctl admin login admin@polis.app
polisctl admin dashboard

# 表格输出（人类可读）
polisctl --format table admin users list 1 10
```

| 命令 | 功能 |
|------|------|
| `auth` | 注册/登录/登出/查看当前用户 |
| `profile` | 个人资料查看/编辑/密码 |
| `follow` | 关注用户/社区 |
| `space` | 创建/搜索/热门/加入/子社区 |
| `post` | 发帖/列表/详情/更新/删除/搜索/标签/精选/浏览量/可见性 |
| `comment` | 评论列表/创建（支持回复） |
| `chat` | 聊天消息 (查看/发送) |
| `message` | 私信 (发送/对话列表/标记已读/未读数) |
| `like` | 点赞帖子/评论 |
| `vote/bookmark` | 投票/收藏 |
| `poll` | 投票问卷 (创建/参与/列表) |
| `series/tier/subscribe` | 专栏/会员等级/订阅管理 |
| `file/draft` | 文件上传/草稿箱 |
| `notify/announce` | 通知/社区公告 |
| `report` | 举报帖子 |
| `hide` | 隐藏/恢复帖子索引 (仅空间创建者) |
| `admin` | 管理后台（dashboard/stats/users/spaces/posts/comments/reports/analytics） |

📖 完整文档: [docs/CLI-GUIDE.md](docs/CLI-GUIDE.md) | 🌐 网页参考: [/cli](https://www.mzgw.com/cli)