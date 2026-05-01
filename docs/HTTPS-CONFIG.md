# 🔒 HTTPS 配置参考手册

> 服务器: 47.253.123.3 (root@www.mzgw.com)
> 配置日期: 2026-04-30
> 域名: www.mzgw.com

---

## 一、证书信息

| 项目 | 值 |
|------|-----|
| 证书类型 | Let's Encrypt (R3) |
| 域名 | www.mzgw.com |
| 签发日 | 2026-04-30 |
| 到期日 | 2026-07-29 (90天) |
| TLS 版本 | TLSv1.2 / TLSv1.3 |
| 证书路径 | `/etc/letsencrypt/live/speedtest.mzgw.com/` |
| 私钥路径 | `/etc/letsencrypt/live/speedtest.mzgw.com/privkey.pem` |
| 完整链 | `/etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem` |
| 归档目录 | `/etc/letsencrypt/archive/www.mzgw.com/` |

---

## 二、Nginx 配置

### 配置文件位置
- 主配置: `/etc/nginx/sites-available/polis`
- 软链接: `/etc/nginx/sites-enabled/polis` → `/etc/nginx/sites-available/polis`

### 完整配置

```nginx
# Next.js Frontend upstream
upstream frontend {
    server 127.0.0.1:3000;
}

# API Gateway upstream
upstream api_gateway {
    server 127.0.0.1:8080;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name www.mzgw.com _;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name www.mzgw.com _;
    client_max_body_size 50M;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/speedtest.mzgw.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes -> Gateway
    location /api/ {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health check -> Gateway
    location /health {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
    }

    # All other routes -> Next.js Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

### 重载 Nginx
```bash
nginx -t && systemctl reload nginx
```

---

## 三、自动续期

### certbot systemd timer
```bash
systemctl list-timers certbot.timer
```

### cron 定时任务 (双重保险)
文件: `/etc/cron.d/certbot-renew`
```
0 3,15 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 手动续期
```bash
# 演练（不实际续期）
certbot renew --dry-run

# 强制续期
certbot renew --force-renewal

# 续期后重载 nginx
certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 四、故障排查

### 检查证书状态
```bash
openssl x509 -in /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem -noout -dates -subject -issuer
```

### 检查端口监听
```bash
ss -tlnp | grep -E ':80 |:443 '
```

### 测试 HTTPS 连接
```bash
curl -sI https://www.mzgw.com
echo | openssl s_client -connect www.mzgw.com:443 -servername www.mzgw.com 2>&1 | grep -E "subject=|Verify|TLS"
```

### 查看证书错误日志
```bash
tail -f /var/log/letsencrypt/letsencrypt.log
tail -f /var/log/nginx/error.log
```

---

## 五、证书到期急救流程

如果证书过期或出现问题，按以下步骤处理：

### 方案 A: 重新申请（推荐）
```bash
# 停止 nginx（释放 80 端口）
systemctl stop nginx

# 用 standalone 模式重新申请
certbot certonly --standalone -d www.mzgw.com --agree-tos --email admin@speedtest.mzgw.com

# 恢复 nginx
systemctl start nginx
```

### 方案 B: webroot 模式续期
```bash
# 确保 webroot 目录存在
mkdir -p /var/www/html/.well-known/acme-challenge

# webroot 模式续期
certbot renew --webroot -w /var/www/html
```

### 方案 C: 紧急回退到 HTTP
```bash
# 查看备份的纯 HTTP 配置
cat /etc/nginx/sites-available/default

# 临时替换配置（保留 SSL 配置备份）
cp /etc/nginx/sites-available/polis /etc/nginx/sites-available/polis.ssl.bak
# 手动编辑去掉 SSL server block...
nginx -t && systemctl reload nginx
```

---

## 六、端口与防火墙

| 端口 | 用途 | 状态 |
|------|------|------|
| 80 | HTTP (重定向到 HTTPS) | ✅ 监听中 |
| 443 | HTTPS | ✅ 监听中 |
| 3000 | Next.js (仅本地) | ✅ 监听中 |
| 8080 | Gateway (仅本地) | ✅ 监听中 |

> Alibaba Cloud 安全组需开放 80 和 443 端口 (TCP)

---

## 七、操作记录

| 日期 | 操作 | 详情 |
|------|------|------|
| 2026-04-30 | 首次配置 | 安装 certbot + python3-certbot-nginx，获取证书，配置 nginx HTTPS |
| 2026-04-30 | 自动续期 | 配置 cron (每天 3:00, 15:00) + systemd certbot.timer |
