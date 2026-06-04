# Polis 文档索引

## 文档导航

| 文件 | 用途 | 读者 |
|------|------|------|
| [DESIGN-PHILOSOPHY.md](DESIGN-PHILOSOPHY.md) | 核心设计哲学（作品/引用/双维度模型） | **所有人必读** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 微服务架构、权限模型、编码规范 | 开发者 |
| [DEV-SETUP.md](DEV-SETUP.md) | 本地开发环境搭建 | 新开发者 |
| [AUTO-DEV.md](AUTO-DEV.md) | AI 自驱动开发循环 + 部署流程 | AI Agent |
| [OPERATIONS-MANUAL.md](OPERATIONS-MANUAL.md) | 系统运维手册（部署/排障/区块链） | 运维 / 开发者 |
| [KNOWN-ISSUES.md](KNOWN-ISSUES.md) | 已知 bug 记录 + 技术债务 | 开发者 |
| [USER-GUIDE.md](USER-GUIDE.md) | 用户使用指南 | 最终用户 |
| [CLI-GUIDE.md](CLI-GUIDE.md) | polisctl CLI 完整参考 | 开发者 / AI Agent |
| [HTTPS-CONFIG.md](HTTPS-CONFIG.md) | HTTPS/SSL 配置参考 | 运维 |
| [progress/MASTER.md](progress/MASTER.md) | 当前任务进度追踪 | 开发者 / AI Agent |

## 根目录关键文件

| 文件 | 用途 |
|------|------|
| `../README.md` | 项目概述 |
| `../DEPLOY.md` | **第三方部署指南** (从 GitHub 克隆到上线完整流程) |
| `../deploy.sh` | 一键部署脚本 (交叉编译→Release→服务器部署→验证) |
| `../DESIGN.md` | 设计系统 (色彩/排版/组件/暗黑模式) |
| `../Cargo.toml` | Rust workspace 配置 (17 个 crate) |
| `../migrations/` | PostgreSQL 数据库迁移脚本 |
