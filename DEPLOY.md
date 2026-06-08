# Polis 部署指南

> 面向任何从 GitHub 克隆代码并部署到自己服务器的人。两条路径：推荐 CI 部署 / 传统本地编译。

---

## 目录

- [推荐方式：GitHub Actions CI 部署](#推荐方式github-actions-ci-部署)
- [传统方式：本地编译部署](#传统方式本地编译部署)
- [服务器初始配置](#服务器初始配置)
- [数据库迁移](#数据库迁移)
- [服务端口参考](#服务端口参考)
- [环境变量](#环境变量)
- [常见问题](#常见问题)

---

## 推荐方式：GitHub Actions CI 部署

**最简单** — 不需要本地 Rust/Node.js 环境，只需要 `git` 和 `gh`。

### 流程

```
本地 git push + tag → GitHub Actions 构建 → Release 自动创建 → 服务器 curl 下载部署
```

### Step 1: 修改配置

编辑 `deploy.sh` 顶部：

```bash
SERVER_HOST="你的服务器IP"
SERVER_USER="root"
GITHUB_REPO="你的GitHub用户名/polis-platform"
SERVER_WEB_DIR="/root/polis/web"
```

### Step 2: Push + 等 CI

```bash
# 提交代码
git add -A && git commit -m "your changes" && git push origin main

# 创建 tag 触发 CI
VERSION="v0.1.$(date +%Y%m%d-%H%M)"
git tag -a "$VERSION" -m "release" && git push origin "$VERSION"
```

### Step 3: 等待 CI 完成

查看进度：`gh run list --repo 你的用户名/polis-platform`

CI 完成后 Release 页面会有两个文件：
- `release-binaries.tar.gz` — 后端 7 个服务二进制
- `release-web.tar.gz` — Next.js 前端

### Step 4: 服务器部署

```bash
VERSION="v0.1.20260101-1200"
DL_URL="https://github.com/你的用户名/polis-platform/releases/download/${VERSION}"

ssh root@你的服务器 << 'DEPLOY'
VERSION="v0.1.20260101-1200"
DL_URL="https://github.com/你的用户名/polis-platform/releases/download/${VERSION}"

# --- 后端 ---
# 停止服务避免 "Text file busy"
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate; do
  systemctl stop $svc
done

curl -fsSL "${DL_URL}/release-binaries.tar.gz" -o /tmp/pb.tar.gz
mkdir -p /tmp/pb && tar -xzf /tmp/pb.tar.gz -C /tmp/pb/
find /tmp/pb -type f -executable -name 'polis-*' | while read f; do cp "$f" /usr/local/bin/; done
chmod +x /usr/local/bin/polis-*

# --- 前端（原子替换） ---
curl -fsSL "${DL_URL}/release-web.tar.gz" -o /tmp/pw.tar.gz
mkdir -p /tmp/pw && tar -xzf /tmp/pw.tar.gz -C /tmp/pw/

# 验证暂存区完整性
[ -f /tmp/pw/.next/standalone/server.js ] || { echo "ERROR: 前端不完整"; exit 1; }

# 备份旧版本
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/polis/web/.next-backups
[ -d /root/polis/web/.next ] && mv /root/polis/web/.next /root/polis/web/.next-backups/backup-$STAMP

# 安装新版本
cp -r /tmp/pw/.next /root/polis/web/.next
[ -d /tmp/pw/public ] && cp -r /tmp/pw/public /root/polis/web/public

# ⚠️ 关键：复制 static/public 到 standalone
rm -rf /root/polis/web/.next/standalone/.next/static /root/polis/web/.next/standalone/public
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
[ -d /root/polis/web/public ] && cp -r /root/polis/web/public /root/polis/web/.next/standalone/public

# 清理
rm -rf /tmp/pb.tar.gz /tmp/pb /tmp/pw.tar.gz /tmp/pw

# 重启
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  systemctl restart --no-block $svc
done
sleep 2

# 验证
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web; do
  echo "$svc: $(systemctl is-active $svc)"
done
curl -sk -o /dev/null -w "HTTP %{http_code}\n" https://你的域名/
DEPLOY
```

### ⚠️ 注意事项

- **严禁 SCP 传输大文件** — 跨网络 SCP 会丢包/卡死。始终通过 GitHub Release 中转。
- **严禁在服务器上编译** — 服务器配置低，`cargo build` + `npm build` 会 OOM。
- **前端部署必须是原子操作** — 先验证暂存区再替换，不能先删后下载。

---

## 传统方式：本地编译部署

适合在本地就有 Rust/Node.js 环境、或者 fork 了代码想改动的开发者。

### 前置条件 (本地)

| 工具 | 用途 |
|------|------|
| Rust 1.70+ | 后端编译 |
| Node.js 22+ | 前端构建 |
| gh CLI | 创建 Release |
| git | 版本控制 |

> **不需要 zig** — 本地编译走 CI 路线即可。如需本地交叉编译见下方常见问题。

### 一键部署脚本

```bash
git clone https://github.com/你的用户名/polis-platform.git
cd polis-platform

# 修改 deploy.sh 中的 SERVER_HOST
sed -i '' 's/speedtest.mzgw.com/你的服务器IP/' deploy.sh

# 全量部署
./deploy.sh --full

# 或部分部署
./deploy.sh --backend     # 仅后端
./deploy.sh --frontend    # 仅前端
./deploy.sh --check       # 仅检查
```

`deploy.sh` 自动执行全部 7 个阶段。

---

## 服务器初始配置

以下是对全新 Ubuntu 22.04 服务器的一次性配置。

### 1. 安装依赖

```bash
apt update && apt install -y postgresql nginx certbot python3-certbot-nginx curl
systemctl enable --now postgresql
```

### 2. 创建用户和目录

```bash
# 数据库
sudo -u postgres psql <<SQL
CREATE USER polis WITH PASSWORD '生成强密码';
CREATE DATABASE polis OWNER polis;
GRANT ALL PRIVILEGES ON DATABASE polis TO polis;
SQL

# 目录
mkdir -p /root/polis/target/release/backup
mkdir -p /root/polis/web/.next/standalone
mkdir -p /root/polis/web/public
```

### 3. 环境变量

```bash
cat > /root/polis/.env <<'EOF'
# 数据库
DATABASE_URL=postgres://polis:你的密码@localhost:5432/polis
REDIS_URL=redis://localhost:6379

# JWT (openssl rand -hex 32)
JWT_SECRET=生成一个64位随机hex字符串
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# 服务 URL (网关用来转发)
USER_SERVICE_URL=http://localhost:3001
SPACE_SERVICE_URL=http://localhost:3002
CONTENT_SERVICE_URL=http://localhost:3003
ADMIN_SERVICE_URL=http://localhost:3004
VIDEO_SERVICE_URL=http://localhost:3005
AGGREGATE_SERVICE_URL=http://localhost:3011

# 各服务端口
GATEWAY_PORT=8080
USER_PORT=3001
SPACE_PORT=3002
CONTENT_PORT=3003
ADMIN_PORT=3004
VIDEO_PORT=3005
AGGREGATE_PORT=3011

# 可选
NATS_URL=nats://localhost:4222
EOF
```

### 4. 安装 systemd 服务

```bash
# 从仓库复制
cp deploy/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web
```

### 5. Nginx + HTTPS

```bash
cat > /etc/nginx/sites-available/polis <<'NGINX'
server {
    listen 80;
    server_name 你的域名;

    # 前端 (Next.js standalone)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (网关)
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # HLS 视频流 (直连 video 服务)
    location /hls/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_set_header Host $host;
    }

    # 静态资源
    location /_next/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    client_max_body_size 500M;
    proxy_read_timeout 300s;
}
NGINX

ln -s /etc/nginx/sites-available/polis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d 你的域名
```

---

## 数据库迁移

首次部署后需要运行迁移：

```bash
# 从仓库克隆后
for f in migrations/*.sql; do
  PGPASSWORD=你的密码 psql -h 127.0.0.1 -U polis -d polis -f "$f"
done

# 验证
PGPASSWORD=你的密码 psql -h 127.0.0.1 -U polis -d polis -c "\dt"
```

每次更新代码后，检查是否有新的迁移文件需要执行。

> ⚠️ 迁移没有 down 脚本。回滚需要手动 SQL。

---

## 服务端口参考

| 服务 | 端口 | systemd 单元 |
|------|------|-------------|
| polis-gateway | 8080 | polis-gateway.service |
| polis-user | 3001 | polis-user.service |
| polis-space | 3002 | polis-space.service |
| polis-content | 3003 | polis-content.service |
| polis-admin | 3004 | polis-admin.service |
| polis-video | 3005 | polis-video.service |
| polis-aggregate | 3011 | polis-aggregate.service |
| polis-web (Next.js) | 3000 | polis-web.service |

共 8 个服务。所有后端二进制安装在 `/usr/local/bin/polis-*`。前端安装在 `/root/polis/web/`。

---

## 常见问题

### Q: 部署后页面白屏 / JS/CSS 404

没有把 `.next/static` 和 `public` 复制到 standalone 目录。Next.js standalone server 从 `.next/standalone/.next/static` 提供静态文件。

```bash
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
cp -r /root/polis/web/public /root/polis/web/.next/standalone/public
systemctl restart polis-web
```

### Q: 后端复制失败 "Text file busy"

服务正在运行，文件被占用。必须先 `systemctl stop` 再复制。

### Q: systemd 服务路径不一致

systemd service 文件中的路径可能过时。部署脚本已自动同步，或手动检查 `/etc/systemd/system/polis-*.service` 确保路径正确。

### Q: macOS 打包后出现 ._ 前缀文件

`COPYFILE_DISABLE=1 tar -czf ...` 避免 AppleDouble 污染。

### Q: zig cc 交叉编译 ring 失败

`zig cc` 可能不兼容 `ring` crate 的 C 代码。推荐使用 CI 部署（GitHub Actions 原生 Linux runner），或使用 `cross` 工具。

### Q: 不想用 GitHub Release，能直接部署吗？

不行。SCP 跨太平洋传输会丢包/卡死。GitHub Release 是全球 CDN，速度快且可靠。

### Q: 数据库迁移报错

检查迁移文件是否按顺序执行。迁移编号从 001 开始递增，必须全部执行。某些迁移有依赖关系。

---

## 当前生产环境参考

| 项目 | 值 |
|------|-----|
| 服务器 | 47.253.123.3 (Ubuntu 22.04) |
| 域名 | www.mzgw.com |
| 数据库 | PostgreSQL 本地实例 |
| SSL | Let's Encrypt (certbot) |
| 前端路径 | /root/polis/web/ |
| 后端路径 | /usr/local/bin/polis-* |
| 环境变量 | /root/polis/.env |
| 部署方式 | Git tag → CI 构建 → Release → curl 部署 |
| 仓库地址 | https://github.com/xiyijixiyifula/polis-platform |

---

## 更新日志

- **2026-06-08**: 重写为 CI 优先流程，补充环境变量/数据库迁移/常见问题
- **2026-06-04**: 原版 v1 — deploy.sh 一键部署指南
