<div align="center">

# 🏛️ Polis（πόλις）

**未来社区平台 — 让创建社区像创建 GitHub 仓库一样简单**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-green)](https://speedtest.mzgw.com)

</div>

---

## 🌐 在线体验

**https://speedtest.mzgw.com**

测试账号：注册免费，即刻体验所有功能。

---

## ✨ 当前功能 (v0.2.7)

| 功能 | 状态 | 说明 |
|------|------|------|
| 👤 用户系统 | ✅ | 注册/登录/JWT 认证/个人资料编辑 |
| 🏛️ 社区创建 | ✅ | 创建社区、嵌套命名空间、公开/私有/不公开 |
| 📝 论坛帖子 | ✅ | Markdown 发帖、标签、置顶、精选 |
| 💬 评论系统 | ✅ | 评论/点赞/嵌套回复 |
| 👍 社交互动 | ✅ | 帖子点赞、收藏/书签 |
| 🗳️ 赞同/反对 | ✅ | 帖子赞同/反对投票、实时分数 |
| 👥 关注/粉丝 | ✅ | 关注用户、粉丝列表、互关 |
| 🔔 通知系统 | ✅ | 互动通知、未读数、标记已读 |
| 🗳️ 投票/问卷 | ✅ | 单选/多选投票、实时结果 |
| 📢 社区公告 | ✅ | 紧急/重要/普通分级、横幅展示 |
| 📝 草稿箱 | ✅ | 未完成帖子自动保存 |
| 🔍 全站搜索 | ✅ | 搜索社区、帖子、用户 |
| 🌙 暗黑模式 | ✅ | Tailwind CSS 变量、偏好记忆 |
| 🛡️ 管理后台 | ✅ | 用户/社区/内容管理仪表盘 |
| 📋 更新日志 | ✅ | `/changelog` 版本历史 |
| 🤖 AI 研究 | ✅ | 自动社区调研 + `/research` 报告页 |
| 🔒 HTTPS | ✅ | Let's Encrypt TLS 1.3 |
| 📦 数据导出 | ✅ | Markdown/JSON 格式导出 |

---

## 🚧 开发中

| 功能 | 计划版本 | 进度 |
|------|----------|------|
| 💬 实时聊天 | v0.3.0 | 桩代码 |
| 📁 文件分享 | v0.3.0 | 规划中 |
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
ssh root@speedtest.mzgw.com "cd /root/polis && git pull origin main"

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
| [更新日志](https://speedtest.mzgw.com/changelog) | 在线版本历史 |

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
├── DEPLOY.md                 ← 部署方案文档
├── docs/
│   ├── USER-GUIDE.md         ← 用户使用指南
│   └── HTTPS-CONFIG.md       ← HTTPS 配置参考
├── migrations/               ← 数据库 SQL
├── crates/                   ← Rust 微服务 (16 个)
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

## 🏗️ 自动化系统

Polis 内置了 AI 自驱动开发系统：

| 脚本 | 用途 | 频率 |
|------|------|------|
| `auto-dev.sh` | 构建→部署→10项测试→报告 | 每天 4 次 |
| `auto-research.sh` | GitHub Trending 调研→推荐 | 每小时 |
| `auto-build.sh` | 增量编译 + .env 校验 | 按需 |
| `auto-changelog.sh` | 自动生成更新日志 | 每次发布 |

---

<div align="center">
  <sub>Polis (πόλις) — 古希腊语中的"城邦"</sub>
  <br>
  <sub>人人都是城主 🏛️</sub>
</div>
