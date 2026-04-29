# 🚀 Polis 一键部署指南

## 方法 1: Docker 一键部署 (推荐)

```bash
# 一条命令启动全部
docker compose up -d --build

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f gateway user space

# 停止
docker compose down
```

启动后访问:
- API: http://localhost:8080
- 管理后台: http://localhost:3050/admin
- 管理员密码: `polis-admin-2026`

## 方法 2: 本地开发部署

```bash
# 一条命令搞定
bash scripts/start.sh dev
```

## 方法 3: 生产部署

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 中的数据库密码、JWT密钥等

# 启动
docker compose up -d --build
```

## 架构说明

```
                   ┌──────────┐
                   │  Nginx   │ (可选，用于 HTTPS)
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │  Gateway │ :8080  ← 唯一入口
                   └────┬─────┘
          ┌─────────────┼──────────────┐
          │             │              │
     ┌────▼───┐   ┌────▼───┐    ┌─────▼────┐
     │ User   │   │ Space  │    │ Content  │ ... 15+ 微服务
     │ :3001  │   │ :3002  │    │ :3003    │
     └────────┘   └────────┘    └──────────┘
          │             │              │
     ┌────▼─────────────▼──────────────▼─────┐
     │         PostgreSQL :5432              │
     │         Redis :6379                   │
     │         Meilisearch :7700             │
     │         NATS :4222                    │
     └──────────────────────────────────────┘
```

你只需要关心 `:8080` 这一个端口！
