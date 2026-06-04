# Polis 部署指南

> 本文档面向任何从 GitHub 克隆代码并部署到自己服务器的人。
> 当前生产环境 (www.mzgw.com) 的配置可作为参考。

---

## 前置条件

### 本地开发机

| 工具 | 用途 | 安装 |
|------|------|------|
| Rust 1.70+ | 后端编译 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js 18+ | 前端构建 | `brew install node` 或 [nvm](https://github.com/nvm-sh/nvm) |
| zig | 交叉编译 linker | `brew install zig` |
| gh (GitHub CLI) | 上传 Release | `brew install gh && gh auth login` |
| git | 版本控制 | `brew install git` |

> **注意**: 如果服务器本身就是 x86_64 Linux，可以跳过 zig，直接 `cargo build --release`。

### 服务器

| 组件 | 用途 |
|------|------|
| PostgreSQL 15+ | 数据库 |
| Nginx | 反向代理 + HTTPS |
| systemd | 服务管理 (Linux) |
| certbot | Let's Encrypt SSL 证书 |

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. 配置服务器连接 (修改 deploy.sh 中的 SERVER_HOST)
#    编辑 deploy.sh 顶部:
#      SERVER_HOST="你的服务器IP或域名"
#      SERVER_USER="root"

# 3. 一键部署
./deploy.sh
```

`deploy.sh` 自动执行：前置检查 → Rust 交叉编译 → 前端构建 → 打包 → GitHub Release → 服务器下载部署 → 重启服务 → 验证。

### 部分部署

```bash
./deploy.sh --backend     # 仅部署后端
./deploy.sh --frontend    # 仅部署前端
./deploy.sh --check       # 仅检查服务器状态
./deploy.sh --dry-run     # 仅本地构建打包，不上传不部署
./deploy.sh --version v2.0.0  # 指定版本号
```

---

## 手动部署 (不使用 deploy.sh)

### 1. 交叉编译 Rust 后端

```bash
# macOS arm64 → Linux x86_64 (需要 zig)
export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER="$(pwd)/deploy/zig-cc-linker.sh"
cargo build --release --target x86_64-unknown-linux-gnu

# 如果服务器是 x86_64 Linux，直接:
cargo build --release
```

### 2. 构建前端

```bash
cd web
npm install
npm run build
cd ..
```

### 3. 打包

```bash
VERSION="v0.1.0"
RELEASE_DIR="polis-release-${VERSION}"
mkdir -p "${RELEASE_DIR}/rust" "${RELEASE_DIR}/frontend"

# 后端二进制
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate; do
  cp target/x86_64-unknown-linux-gnu/release/$svc "${RELEASE_DIR}/rust/"
done

# 前端
cp -r web/.next "${RELEASE_DIR}/frontend/.next"
cp -r web/public "${RELEASE_DIR}/frontend/public"

# 打包 (macOS 必须 COPYFILE_DISABLE=1)
COPYFILE_DISABLE=1 tar -czf "polis-release-${VERSION}.tar.gz" -C "${RELEASE_DIR}" .
```

### 4. 上传 GitHub Release

```bash
gh release create "$VERSION" "polis-release-${VERSION}.tar.gz" \
  --repo xiyijixiyifula/polis-platform \
  --title "$VERSION" \
  --notes "发行说明"
```

### 5. 服务器部署

```bash
# SSH 到服务器执行:
VERSION="v0.1.0"
DOWNLOAD_URL="https://github.com/xiyijixiyifula/polis-platform/releases/download/${VERSION}/polis-release-${VERSION}.tar.gz"

cd /tmp
curl -fsSL "$DOWNLOAD_URL" -o polis-release.tar.gz
mkdir -p /tmp/polis-deploy
tar -xzf polis-release.tar.gz -C /tmp/polis-deploy/

# 部署后端
cp /tmp/polis-deploy/rust/* /usr/local/bin/
chmod +x /usr/local/bin/polis-*

# 部署前端
rm -rf /root/polis/web/.next /root/polis/web/public
cp -r /tmp/polis-deploy/frontend/.next /root/polis/web/.next
cp -r /tmp/polis-deploy/frontend/public /root/polis/web/public

# ⚠️ 关键: 复制 static 和 public 到 standalone 目录
rm -rf /root/polis/web/.next/standalone/.next/static
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
cp -r /root/polis/web/public /root/polis/web/.next/standalone/public

# 重启所有服务
systemctl restart --no-block polis-gateway polis-user polis-space \
  polis-content polis-admin polis-video polis-aggregate polis-web

# 验证
systemctl is-active polis-gateway polis-user polis-space \
  polis-content polis-admin polis-video polis-aggregate polis-web
```

---

## 服务器初始配置

以下是对应 **全新服务器** 的一次性配置步骤。

### 1. 安装依赖

```bash
# Ubuntu/Debian
apt update && apt install -y postgresql nginx certbot python3-certbot-nginx curl wget

# 启动 PostgreSQL
systemctl enable --now postgresql
```

### 2. 创建数据库

```bash
sudo -u postgres psql <<SQL
CREATE USER polis WITH PASSWORD '你的密码';
CREATE DATABASE polis OWNER polis;
GRANT ALL PRIVILEGES ON DATABASE polis TO polis;
SQL

# 运行迁移
for f in migrations/*.sql; do
  psql -h 127.0.0.1 -U polis -d polis -f "$f"
done
```

### 3. 创建目录结构

```bash
# 后端
mkdir -p /root/polis/target/release/backup
mkdir -p /root/polis/uploads

# 前端
mkdir -p /root/polis/web/.next/standalone
mkdir -p /root/polis/web/public

# 环境变量
cat > /root/polis/.env <<'EOF'
DATABASE_URL=postgres://polis:你的密码@localhost:5432/polis
REDIS_URL=redis://localhost:6379
GATEWAY_PORT=8080
USER_SERVICE_URL=http://localhost:3001
SPACE_SERVICE_URL=http://localhost:3002
CONTENT_SERVICE_URL=http://localhost:3003
ADMIN_SERVICE_URL=http://localhost:3004
VIDEO_SERVICE_URL=http://localhost:3005
AGGREGATE_SERVICE_URL=http://localhost:3011
JWT_SECRET=生成一个随机字符串
EOF
```

### 4. 安装 systemd 服务

将 `deploy/` 目录下所有 `.service` 文件复制到 `/etc/systemd/system/`：

```bash
cp deploy/*.service /etc/systemd/system/
systemctl daemon-reload

# 启用所有服务 (但不立即启动，等部署后再启动)
systemctl enable polis-gateway polis-user polis-space \
  polis-content polis-admin polis-video polis-aggregate polis-web
```

### 5. 配置 Nginx + HTTPS

```bash
# Nginx 配置 (示例)
cat > /etc/nginx/sites-available/polis <<'NGINX'
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    client_max_body_size 500M;
}
NGINX

ln -s /etc/nginx/sites-available/polis /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL 证书
certbot --nginx -d 你的域名
```

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

---

## 当前生产环境

> 仅供参考 — 每台服务器配置不同。

| 项目 | 值 |
|------|-----|
| 服务器 IP | 47.253.123.3 |
| 域名 | www.mzgw.com |
| 操作系统 | Ubuntu 22.04 |
| 数据库 | PostgreSQL (本地实例) |
| SSL | Let's Encrypt (certbot 自动续期) |
| 前端路径 | /root/polis/web/ |
| 后端路径 | /usr/local/bin/polis-* |
| 环境变量 | /root/polis/.env |
| Nginx 配置 | /etc/nginx/sites-available/polis |
| 部署方式 | `./deploy.sh` (本地交叉编译 → GitHub Release → 服务器下载) |

---

## 常见问题

### Q: mac 打包后服务器上出现 ._ 前缀文件

macOS 用 `tar` 打包会注入 AppleDouble 文件。解决：打包时加 `COPYFILE_DISABLE=1`：

```bash
COPYFILE_DISABLE=1 tar -czf archive.tar.gz files/
```

### Q: 部署后页面白屏 / JS 404

没有把 `.next/static` 和 `public` 复制到 standalone 目录。解决：

```bash
cp -r /root/polis/web/.next/static /root/polis/web/.next/standalone/.next/static
cp -r /root/polis/web/public /root/polis/web/.next/standalone/public
systemctl restart polis-web
```

### Q: 交叉编译失败 (macOS → Linux)

确保安装了 zig：`brew install zig`。确认 `.cargo/config.toml` 中有 `linker = "deploy/zig-cc-linker.sh"` 配置。

### Q: 不想用 zig，怎么部署？

选项 1: 在 x86_64 Linux 服务器上直接 `cargo build --release`（不推荐，会占用大量内存）。
选项 2: 使用 GitHub Actions 做自动交叉编译（见下方改进方向）。

---

## 未来改进

- [ ] GitHub Actions 自动 CI/CD：push → 自动构建 → Release
- [ ] 蓝绿部署：零停机时间更新
- [ ] Docker 部署方案（可选，当前方案已足够）
