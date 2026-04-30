# 🚀 Polis 部署方案

## 当前生产环境

| 项目 | 值 |
|------|-----|
| 服务器 | 47.253.123.3 (root@speedtest.mzgw.com) |
| 在线地址 | https://speedtest.mzgw.com |
| 部署方式 | 服务器本地编译 + systemd 管理 |
| 反向代理 | Nginx (:80→443 重定向, :443 HTTPS → Gateway :8080 / Next.js :3000) |
| SSL 证书 | Let's Encrypt (certbot, 自动续期) |
| 数据库 | PostgreSQL 本地实例 |

## 当前部署流程

```
开发者本地 git push
    ↓
服务器 git pull + cargo build + npm build
    ↓
systemctl restart 各服务
    ↓
10 项自动化测试
    ↓
健康检查通过 OR 自动回滚
```

## 脚本说明

| 脚本 | 用途 |
|------|------|
| `auto-build.sh` | 拉取代码 → 构建所有服务 → .env 校验 |
| `auto-dev.sh` | 完整开发循环: 构建 → 部署 → 测试 → 报告 |
| `auto-research.sh` | 社区调研 + 报告生成 |
| `auto-changelog.sh` | 自动更新日志 |

## 服务架构

```
                    ┌──────────┐
                    │  Nginx   │ :443 (HTTPS) + :80→443
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         ┌────▼─────┐        ┌─────▼────┐
         │  Gateway │ :8080  │ Next.js  │ :3000
         └────┬─────┘        └──────────┘
    ┌─────────┼──────────┐
    │         │          │
┌───▼──┐ ┌───▼──┐ ┌─────▼────┐
│ User │ │ Space│ │ Content  │
│:3001 │ │:3002 │ │ :3003    │
└──────┘ └──────┘ └──────────┘
         │         │          │
    ┌────▼─────────▼──────────▼─────┐
    │    PostgreSQL      :5432      │
    └───────────────────────────────┘
```

## 安全机制

### 已实现
- ✅ `.env` 自动校验（构建前检查 DATABASE_URL）
- ✅ `.env` 自动备份（防止错误修改导致服务崩溃）
- ✅ 构建失败自动回滚（从最新备份恢复旧二进制）
- ✅ 旧备份自动清理（保留最近 5 个）
- ✅ JWT token 认证
- ✅ CORS 配置
- ✅ HTTPS/TLS 1.2-1.3 (Let's Encrypt + certbot 自动续期)
- ✅ HTTP→HTTPS 自动重定向
- ✅ HSTS (max-age=63072000; includeSubDomains; preload)
- ✅ 安全响应头 (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

### 已知限制（待改进）
| 问题 | 严重度 | 状态 |
|------|--------|------|
| 服务器直接编译（CPU/内存压力） | 🟡 中 | 建议迁移到 CI/CD |
| 无蓝绿/滚动部署（有短暂中断） | 🟡 中 | 待处理 |
| 日志无自动轮转（可能撑满磁盘） | 🟡 中 | 待配置 logrotate |
| 生产环境安装 Rust 工具链 | 🟢 低 | 建议 Docker 化 |

## 未来改进计划

### Phase 1: 稳定性增强（短期）
- [ ] 配置 logrotate 日志轮转
- [ ] 添加 systemd 健康检查 (WatchdogSec)

### Phase 2: 部署优化（中期）
- [ ] GitHub Actions CI/CD: 构建产物 → 服务器拉取
- [ ] 蓝绿部署: 构建到新目录 → 切换 symlink → 重载
- [ ] 监控告警: Prometheus + Grafana

### Phase 3: 容器化（长期）
- [ ] Docker 化所有微服务
- [ ] Docker Compose 一键部署
- [ ] Kubernetes (可选)
