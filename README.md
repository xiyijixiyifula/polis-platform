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

## ✨ 当前功能 (v0.2.91)

| 功能 | 状态 | 说明 |
|------|------|------|
| 👤 用户系统 | ✅ | 注册/登录/JWT 认证/个人资料编辑 |
| 🏛️ 社区创建 | ✅ | 创建社区、嵌套命名空间、公开/私有/不公开 |
| 💬 交流板块 | ✅ | Markdown 发帖、标签、置顶、精选、Cherry Engine 渲染（原"文章"模块） |
| 🔖 分享模块 | ✅ | 个人分享空间，仅创建者可发布，他人可阅读/点赞/评论 |
| 📚 知识库(Wiki) | ✅ | 协作文档模块，所有成员可编写 Markdown 知识库页面 |
| ❓ 问答(QA) | ✅ | 社区提问与回答模块，空间内问答 Tab 过滤展示 |
| 👥 成员列表 | ✅ | 空间成员展示 (头像/用户名/角色/加入时间)，后端 JOIN 查询 |
| 💬 评论系统 | ✅ | 评论/点赞/嵌套回复 |
| 👍 社交互动 | ✅ | 帖子点赞、收藏/书签 |
| 🗳️ 赞同/反对 | ✅ | 帖子赞同/反对投票、实时分数 |
| 👥 关注/粉丝 | ✅ | 关注用户、粉丝列表、互关 |
| 🔔 通知系统 | ✅ | 互动通知、未读数、标记已读 |
| 🗳️ 投票/问卷 | ✅ | 单选/多选投票、实时结果、社区投票列表 |
| ⚙️ 模块配置 | ✅ | 社区模块开关，按需启用（默认仅文章） |
| 🏠 社区概览 | ✅ | GitHub 风格概览首页、精选内容、快速操作 |
| 📢 社区公告 | ✅ | 紧急/重要/普通分级、横幅展示 |
| 📝 草稿箱 | ✅ | 未完成帖子自动保存 |
| 🔍 全站搜索 | ✅ | PostgreSQL ILIKE 全文搜索（社区+帖子） |
| 🌙 暗黑模式 | ✅ | Tailwind CSS 变量、偏好记忆 |
| 🛡️ 管理后台 | ✅ | 用户/社区/内容管理仪表盘 |
| 📋 更新日志 | ✅ | `/changelog` 版本历史 |
| 🤖 AI 研究 | ✅ | 自动社区调研 + `/research` 报告页 |
| 🔒 HTTPS | ✅ | Let's Encrypt TLS 1.3 |
| 📦 数据导出 | ✅ | Markdown/JSON 格式导出 |
| 🏥 服务健康检查 | ✅ | Gateway 聚合 /api/health/all + 4 微服务独立 /health + polisctl health CLI |
| 📝 Markdown 编辑器 | ✅ | Cherry Markdown 集成，完整工具栏 |
| 📁 文件分享系统 | ✅ | 文件上传、分享链接、密码保护下载 |
| 🧩 小程序 | ✅ | 嵌入式小应用，ModuleType::MiniApp 后端复用 |
| 🎮 游戏 | ✅ | 游戏攻略/评测/资讯，ModuleType::Game 后端复用 |
| 📊 投票中心 | ✅ | 全平台投票列表 /polls + GET /api/polls API + Feed导航修复 |
| 📖 小说/阅读 | ✅ | 小说发布与阅读，章节连载，ModuleType::Novel 后端复用 |
| 📖 专栏/内容系列 | ✅ | 系列创建、文章收录、系列展示页 |
| 💰 付费社区 | ✅ | 会员等级创建/编辑/订阅管理 |
| 🤝 粉丝/关注页 | ✅ | 独立粉丝列表和关注列表页面 |
| 📰 信息流首页 | ✅ | 3 栏布局、@用户/社区/模块 时间线、无限滚动 |
| 🖥️ CLI 命令行工具 | ✅ | Rust 静态二进制、20+ 命令、JSON/Table 输出 |
| 🎨 Cherry 渲染修复 | ✅ | Engine Core API 同步渲染、CSS 作用域隔离 |

---

## 🚧 开发中

| 功能 | 计划版本 | 进度 |
|------|----------|------|
| 💬 实时聊天 | v0.3.0 | 桩代码 |
| 🎬 视频上传 | v0.4.0 | 桩代码 |
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
    ┌─────────┼──────────┬──────────┐
    │         │          │          │
┌───▼──┐ ┌───▼──┐ ┌─────▼────┐ ┌───▼───┐
│ User │ │ Space│ │ Content  │ │ Admin │
│:3001 │ │:3002 │ │ :3003    │ │:3050  │
└──────┘ └──────┘ └──────────┘ └───────┘
    │         │          │          │
    └─────────┴──────────┴──────────┘
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
| polis-admin | 3050 | Axum + SQLx | ✅ 运行中 |
| polis-web | 3000 | Next.js 14 | ✅ 运行中 |
| polis-chat | - | Axum | 🚧 规划中 |
| polis-video | - | Axum | 🚧 规划中 |
| polis-store | - | Axum | 🚧 规划中 |
| polis-code | - | Axum | 🚧 规划中 |
| polis-pay | - | Axum | 🚧 规划中 |
| polis-search | - | Axum + Tantivy | 🚧 规划中 |
| polis-export | - | Axum | 🚧 规划中 |
| polis-notify | - | Axum | 🚧 规划中 |
| polis-plugin-engine | - | WASM runtime | 🚧 规划中 |
| polis-aggregate | - | Axum | 🚧 规划中 |

---

## 🧪 测试数据

导入 `migrations/002_seed_data.sql` 后预置：

| 数据 | 数量 | 说明 |
|------|------|------|
| 👤 用户 | 8 个 | 张三、李四、王五… |
| 🏛️ 根社区 | 4 个 | 科技前沿、游戏天地、生活分享、创作者之家 |
| 🏘️ 用户社区 | 6 个 | Rust 实验室、AI 对话、React 俱乐部… |
| 📄 帖子 | 14 篇 | Rust、AI、Next.js 等话题 |
| 💬 评论 | 10 条 | 含嵌套回复 |

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
├── migrations/               ← 数据库 SQL
├── crates/                   ← Rust 微服务 + CLI (17 个)
│   ├── polisctl/               ← CLI 命令行工具（Rust）
│   ├── polis-core/           ← 共享库 (模型/错误/工具)
│   ├── polis-gateway/        ← API 网关 ⭐
│   ├── polis-user/           ← 用户服务 ⭐
│   ├── polis-space/          ← 社区服务 ⭐
│   ├── polis-content/        ← 内容服务 ⭐
│   ├── polis-admin/          ← 管理后台 ⭐
│   └── ...                   ← 更多规划中的服务
└── web/                      ← Next.js 14 前端
    └── src/app/              ← 页面路由
```

⭐ = 当前生产环境运行中
---

| `admin` | 管理后台（dashboard/stats/users/spaces/posts/...） |

📖 完整文档: [docs/CLI-GUIDE.md](docs/CLI-GUIDE.md) | 🌐 网页参考: [/cli](https://www.mzgw.com/cli)

## 🏗️ 自动化系统
## 🖥️ 命令行工具 (polisctl)

Polis 提供完整的命令行接口，使用 **Rust** 编写为单一静态二进制文件，无需运行时依赖，支持 Linux、macOS、Windows。设计为 AI 代理友好，JSON 模式输出。

### 安装

```bash
# 从源码编译
cd /root/polis && cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# 或下载预编译二进制
wget https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl-linux-amd64 \
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
polisctl space search "Rust" 1 -s 10

# 管理后台
polisctl admin login admin@polis.app polis2024
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
| `post` | 发帖/列表/详情/更新/删除/搜索/精选 |
| `comment` | 评论列表/创建（支持回复） |
| `like/vote/bookmark` | 点赞/投票/收藏 |
| `poll` | 投票问卷 (创建/参与/列表/全局all) |
| `series/tier/subscribe` | 专栏/会员等级/订阅管理 |
| `file/draft` | 文件上传/草稿箱 |
| `notify/announce` | 通知/社区公告 |
| `report` | 举报帖子 |
| `admin` | 管理后台（dashboard/stats/users/spaces/posts/comments/reports/analytics） |

📖 完整文档: [docs/CLI-GUIDE.md](docs/CLI-GUIDE.md) | 🌐 网页参考: [/cli](https://www.mzgw.com/cli)


