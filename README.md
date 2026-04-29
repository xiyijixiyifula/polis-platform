<div align="center">

# 🏛️ Polis（πόλις）

**未来社区平台 — 让创建社区像创建 GitHub 仓库一样简单**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Made with](https://img.shields.io/badge/made%20with-%E2%9D%A4%EF%B8%8F-red)]()

</div>

---

## ✨ 一句话介绍

Polis 是一个**开箱即用的社区平台**，你可以在上面创建自己的社区，就像创建 GitHub 仓库一样简单。支持论坛、文章、视频、聊天、商城、代码仓库、文件分享、投票…… 所有功能开箱即用。

## 🚀 5 秒快速启动

**你只需要安装 Docker，然后执行：**

```bash
git clone <你的仓库地址> polis
cd polis

# 🔥 一键启动全部（15+ 个服务）
docker compose up -d --build
```

> 就是这么简单。不需要懂微服务，不需要装 Rust，不需要配置数据库。

启动后访问：
- **API**: http://localhost:8080
- **管理后台**: http://localhost:3050/admin
- **管理员密码**: `polis-admin-2026`

---

## 📖 完整使用指南

### 第一步：安装 Docker

如果你还没有 Docker：

```bash
# macOS
brew install --cask docker

# 或者去官网下载
# https://docker.com/products/docker-desktop
```

验证安装：
```bash
docker --version        # 应该显示版本号
docker compose version  # 应该显示版本号
```

### 第二步：启动 Polis

```bash
# 克隆项目
git clone <仓库地址> polis
cd polis

# 一键启动（第一次会编译，需要几分钟）
docker compose up -d --build
```

### 第三步：初始化数据

```bash
# 创建数据库表
docker compose exec postgres psql -U polis -d polis -f /docker-entrypoint-initdb.d/001_initial.sql

# 导入测试数据（可选，但推荐）
docker compose exec postgres psql -U polis -d polis <<EOF
$(cat migrations/002_seed_data.sql)
EOF
```

### 第四步：验证是否成功

```bash
# 检查所有服务状态
docker compose ps

# 测试 API
curl http://localhost:8080/health
# 返回: {"code":0,"message":"ok","data":"Polis API Gateway is running"}

# 测试注册
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","display_name":"Demo用户","email":"demo@test.com","password":"test123456"}'
```

---

## 🎯 功能一览

| 功能 | 说明 | 位置 |
|------|------|------|
| 📝 **论坛/帖子** | 发帖、评论、点赞，支持 Markdown | 任意社区 |
| 📁 **文件分享** | 上传文件，生成分享链接（支持密码+过期） | 社区 → 文件 Tab |
| 🗳️ **投票** | 创建投票，收集社区意见 | 社区 → 投票 Tab |
| 📢 **公告** | 社区管理员发布通知 | 社区 → 公告 Tab |
| 🎬 **视频** | 上传视频，自动转码 HLS | 社区 → 视频 Tab |
| 💬 **聊天** | WebSocket 实时聊天 | 社区 → 聊天 |
| 📦 **代码仓库** | Git 仓库托管 | 社区 → 代码 Tab |
| 🛍️ **商城** | 商品上架、购买、订单管理 | 社区 → 商城 Tab |
| 💰 **打赏/支付** | 内容打赏、付费内容 | 帖子详情 |
| 🔔 **通知** | 被点赞、评论、关注时提醒 | 顶部铃铛图标 |
| 🔖 **收藏** | 保存喜欢的帖子 | 帖子详情 → 收藏按钮 |
| 📝 **草稿箱** | 文章写到一半随时保存 | 用户菜单 → 草稿箱 |
| 🌙 **暗黑模式** | 护眼模式 | 顶部月亮图标 |
| 🔐 **数据导出** | 所有数据打包下载 | 设置 → 数据导出 |

---

## 🏛️ 管理后台

管理员可以在 `/admin` 管理整个平台：

```
http://localhost:3050/admin
管理员密码: polis-admin-2026
```

功能：
- 📊 **仪表盘** — 平台运营数据概览
- 👥 **用户管理** — 搜索、认证、封禁用户
- 🏗️ **社区管理** — 查看、归档社区
- 📋 **内容管理** — 精选、删除帖子

---

## 🛠️ 常用命令

```bash
# 启动（第一次需编译，稍慢）
docker compose up -d --build

# 启动（无编译，快速）
docker compose up -d

# 查看状态
docker compose ps

# 查看所有日志
docker compose logs -f

# 查看某个服务的日志
docker compose logs -f gateway

# 停止
docker compose down

# 停止并删除数据
docker compose down -v

# 重新编译某个服务
docker compose build gateway
docker compose up -d gateway
```

---

## 🧪 测试数据

系统中预置了以下测试数据（导入 `migrations/002_seed_data.sql` 后）：

| 数据 | 数量 | 说明 |
|------|------|------|
| 👤 用户 | 8 个 | 张三、李四、王五… |
| 🏛️ 根社区 | 4 个 | 科技前沿、游戏天地、生活分享、创作者之家 |
| 🏘️ 用户社区 | 6 个 | Rust 实验室、AI 对话、React 俱乐部… |
| 📄 帖子 | 14 篇 | 涵盖 Rust、AI、Next.js 等话题 |
| 💬 评论 | 10 条 | 含嵌套回复 |
| 💖 点赞 | 17 个 | |

测试账号密码：`test123456`

---

## ❓ 常见问题

**Q: 启动后访问不了？**
A: 等待 1-2 分钟让所有服务启动完成，然后运行 `docker compose ps` 检查状态。

**Q: 端口被占用了？**
A: 修改 `docker-compose.yml` 中对应的 `ports` 配置。

**Q: 如何重置所有数据？**
A: `docker compose down -v` 会删除所有数据卷，然后重新 `docker compose up -d`。

**Q: 需要装 Rust 吗？**
A: 不需要。Docker 部署方式完全不需要 Rust 环境。

---

## 📚 项目结构

```
polis/
├── docker-compose.yml    ← 🚀 一键部署配置文件
├── Dockerfile             ← 构建脚本
├── Makefile              ← 常用命令
├── scripts/
│   ├── start.sh          ← 一键启动脚本
│   └── test_api.sh       ← API 测试脚本
├── migrations/           ← 数据库初始化
├── crates/               ← 后端微服务 (15 个)
│   ├── polis-gateway/    ← API 网关（唯一入口）
│   ├── polis-user/       ← 用户服务
│   ├── polis-space/      ← 社区服务
│   ├── polis-content/    ← 内容服务
│   └── ...               ← 更多服务
└── web/                  ← 前端 (Next.js 14)
```

---

<div align="center">
  <sub>Polis (πόλις) — 古希腊语中的"城邦"</sub>
  <br>
  <sub>人人都是城主 🏛️</sub>
</div>
