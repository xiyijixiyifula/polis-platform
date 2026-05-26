<div align="center">

# 🏛️ Polis（πόλις）

**作品属于创作者，社区持有引用。像 Rust 所有权模型一样设计内容平台。**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-green)](https://www.mzgw.com)

</div>

---

## 一句话理解 Polis

**Polis 不是又一个社区平台。** 它的核心架构可以用 Rust 的两句话讲清楚：

- **`Creation`** = 作品实体（堆上数据）—— 创作者拥有完全所有权
- **`ModuleRef`** = 社区引用（`&T`）—— 只是指向作品的指针，不拥有数据

这意味着：在贴吧发帖，帖子属于贴吧；在 Polis 发帖，**作品永远属于你**，社区只是引用了它。撤回引用 → 内容从社区消失，但作品还在你的创作者中心。

---

## Polis vs 传统平台

传统平台只在**一个维度**上做文章，Polis 同时打通了**两个维度**：

| 维度 | 贴吧/Discord 模式 | B站/微博 模式 | **Polis** |
|------|-------------------|---------------|-----------|
| **内容归属** | 帖子属于社区/服务器 | 作品属于创作者 | ✅ 作品属于创作者，社区持有引用 |
| **发布入口** | 进社区 → 发帖 | 创作者中心 → 发布 | ✅ 两个入口：创作者中心 + 社区模块页 |
| **跨社区** | 不支持（需复制粘贴） | 无社区概念 | ✅ 同一作品多社区引用，修改全局同步 |
| **Feed 信息** | 只有帖子+作者名 | 只有作者+内容 | ✅ 引用路径 + 创作者信息，两者同时展示 |
| **创作者主权** | 低（删帖=丢内容） | 高（但孤岛化） | ✅ 高主权 + 多社区参与 |

每条 Feed 同时携带两个维度的信息：

```
@rust_writer / Rust 技术前沿 / 交流 / Rust入门指南    ← 引用路径（在哪里）
原来这是一个大西瓜 · 0粉丝 · 2天前                        ← 创作者（谁写的）
```

社区创建者（rust_writer）和作品作者（原来这是一个大西瓜）**可以是不同的人**——这正是 Rust "所有权与借用"思想的产品化。

---

## 核心差异化

### 1. 一次创作，多社区引用

在创作者中心发布一篇作品，可以同时投稿到多个社区的不同模块。所有引用位置的点赞、评论、浏览量跟着作品走。

### 2. 修改全局同步

编辑作品 → 所有引用位置同步更新。不需要像传统平台那样复制粘贴后分别修改。

### 3. 撤稿 ≠ 删作品

社区管理员可以隐藏不当引用，但作品本体始终属于创作者。反过来，创作者撤回投稿，作品从社区消失但不丢失。

### 4. 两个发布入口，不可合并

| 入口 | 场景 | URL |
|------|------|-----|
| **创作者中心** | 独立创作，再选择投稿社区 | `/creations` |
| **社区模块页** | 场景化创作，社区/模块自动填写，可追加其他社区 | `/creations/new?space=namespace&module=forum` |

---

## 功能概览

### 社区维度
社区创建/嵌套命名空间/公开私有不公开 · 16 种模块自由组合（交流/问答/知识库/视频/分享/投票/公告/聊天/商城/课程/小说/游戏/代码仓库/小程序/系列/会员） · 成员管理+角色 · 等级系统 Lv.1~6 · 模块管理者权限 · 社区公告 · 空间分析仪表盘

### 创作者维度
创作中心统一管理 · Cherry Markdown 编辑器 · 作品新建/编辑/详情/投稿 · 多社区投稿弹窗 · 草稿箱 · 数据导出（Markdown/JSON） · 个人作品主页

### 社交互动
评论/嵌套回复 · 点赞 · 收藏/书签 · 赞同/反对投票 · 关注/粉丝 · 私信/聊天 · 通知系统+偏好设置 · 投票问卷（单选/多选）

### 内容类型
交流帖子 · 知识库 Wiki（多人协作） · 问答 QA · 视频（上传/FFmpeg 转码/HLS 播放） · 分享 · 小说连载 · 专栏系列 · 游戏攻略 · 小程序 · 文件分享

### 系统能力
JWT 认证 · 全站搜索（社区+帖子+用户三 Tab） · 深色模式 · 管理后台 9 模块 · CLI 命令行工具 20+ 命令 · E2E 测试 145 项 · 服务健康检查 · 更新日志 · AI 研究报告

---

## 技术架构

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
  user space content  video    admin  (search/chat
  :3001 :3002 :3003   :3004    :3050   /pay 规划中)
    │    │    │        │          │
    └────┴────┴────────┴──────────┘
                    │
              PostgreSQL 16
```

| 服务 | 端口 | 技术栈 |
|------|------|--------|
| polis-gateway | 8080 | Axum 0.8 |
| polis-user | 3001 | Axum + SQLx |
| polis-space | 3002 | Axum + SQLx |
| polis-content | 3003 | Axum + SQLx |
| polis-video | 3004 | Axum + SQLx + FFmpeg |
| polis-admin | 3050 | Axum + SQLx |
| polis-web | 3000 | Next.js 14 |

### 部署铁律

> **本地编译 → GitHub Releases → 服务器下载部署。绝不在服务器上编译。**

```bash
# macOS 本地打包（必须禁用 xattr）
COPYFILE_DISABLE=1 tar -czf release.tar.gz ...

# 服务器部署
ssh root@server "rm -rf /opt/polis-web/.next && tar -xzf release.tar.gz -C /opt/polis-web"
ssh root@server "find /opt/polis-web/.next -name '._*' -delete"  # 清理 macOS xattr 污染
ssh root@server "systemctl restart polis-web"
```

---

## 快速开始

```bash
# 前提：Rust 1.81+ / Node.js 20+ / PostgreSQL 16+

# 后端
cd crates/polis-gateway && cargo run

# 前端
cd web && npm install && npm run dev
# → http://localhost:3000
```

### CLI 工具

```bash
# 安装
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# 使用
export POLIS_BASE_URL=https://www.mzgw.com
polisctl auth register mybot bot@test.com pass1234
polisctl space search "Rust"
polisctl --format table admin dashboard
```

20+ 命令覆盖：auth / profile / follow / space / post / comment / chat / message / like / vote / bookmark / poll / series / tier / subscribe / file / draft / notify / announce / report / hide / admin

---

## 文档

| 文档 | 说明 |
|------|------|
| [完整设计哲学](docs/DESIGN-PHILOSOPHY.md) | Creation/ModuleRef 架构论证 + 竞品深度对比 |
| [架构文档](docs/ARCHITECTURE.md) | 微服务架构 / 权限模型 |
| [CLI 命令指南](docs/CLI-GUIDE.md) | polisctl 完整参考 |
| [用户使用指南](docs/USER-GUIDE.md) | 功能使用说明 |
| [Bug 追踪索引](docs/bugs/INDEX.md) | Pattern 库 + 修复统计 |
| [更新日志](https://www.mzgw.com/changelog) | 在线版本历史 |
| [AI 研究报告](https://www.mzgw.com/research) | 自动化社区调研 |

---

## 在线体验

**https://www.mzgw.com** — 注册免费，即刻体验。
