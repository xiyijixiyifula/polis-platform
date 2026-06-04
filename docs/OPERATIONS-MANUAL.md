# Polis — System Operations Manual

> **Last Updated**: 2026-06-04
> **Applicable Version**: v1.7.0+
> **Server**: 47.253.123.3 | **Domain**: www.mzgw.com

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Browser Operations — Website Guide](#2-browser-operations--website-guide)
3. [Local CLI Operations](#3-local-cli-operations)
4. [Blockchain Operations](#4-blockchain-operations)
5. [Server Administration](#5-server-administration)
6. [Deployment Guide](#6-deployment-guide)
7. [Troubleshooting](#7-troubleshooting)
8. [Quick Reference Card](#8-quick-reference-card)

---

## 1. System Overview

### 1.1 Architecture

```
                        Internet
                           │
                    ┌──────┴──────┐
                    │   Nginx      │  :80/:443
                    │  (HTTPS)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         /api/*        /_next/static/*   /*
              │            │            │
      ┌───────┴───────┐    │    ┌───────┴───────┐
      │  API Gateway   │    │    │  Next.js Web  │
      │  (Port 8080)   │    │    │  (Port 3000)  │
      └───────┬───────┘    │    └───────────────┘
              │            │
   ┌──────────┼──────────┐ │
   │          │          │ │
   ▼          ▼          ▼ ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│polis-│ │polis-│ │polis-│ │polis-│ │polis-│ │polis-│
│user  │ │space │ │cont- │ │admin │ │video │ │chain │
│      │ │      │ │ent   │ │      │ │      │ │★     │
└──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
   │        │        │        │        │        │
   └────────┴────────┴────────┴────────┘        │
                     │                           │
              ┌──────┴──────┐           ┌───────┴───────┐
              │ PostgreSQL   │           │   RocksDB     │
              │ (Users/Spaces│           │ (On-chain     │
              │  Content)    │           │  data)        │
              └─────────────┘           └───────────────┘
```

### 1.2 Service Inventory

| Service | Port | Responsibility | Status |
|---------|------|---------------|--------|
| **polis-gateway** | 8080 | API Gateway, routing, rate limiting | ✅ Running |
| **polis-user** | internal | Users, auth, notifications | ✅ Running |
| **polis-space** | internal | Communities, module management | ✅ Running |
| **polis-content** | internal | Posts, creations, comments | ✅ Running |
| **polis-admin** | internal | Admin dashboard API | ✅ Running |
| **polis-video** | internal | Video upload, transcoding | ✅ Running |
| **polis-web** | 3000 | Next.js frontend | ✅ Running |
| **polis-chain** | 8545 | Blockchain node | ⚠️ Not deployed to server |
| **Nginx** | 80/443 | HTTPS reverse proxy | ✅ Running |
| **PostgreSQL** | 5432 | Relational database | ✅ Running |

### 1.3 Server Resources

| Metric | Current Value | Status |
|--------|--------------|--------|
| Memory | 1.6 GB (655MB used) | 🟢 Normal |
| Disk | 40 GB (27GB used / 71%) | 🟡 Monitor |
| Swap | 4 GB (0 used) | 🟢 Normal |
| OS | Linux x86_64 | — |

---

## 2. Browser Operations — Website Guide

### 2.1 Accessing the Website

Open your browser and visit **[https://www.mzgw.com](https://www.mzgw.com)**

The site supports:
- **Desktop**: Full functionality with sidebar navigation
- **Mobile**: Responsive design with bottom navigation bar
- **Dark Mode**: Click the 🌙 icon in top-right corner
- **Language Toggle**: Switch between 中文 and English

### 2.2 Registration & Login

**Registration:**

1. Click **"立即加入"** (Join Now) in the top-right or navigate to `/register`
2. Fill in the form:
   - Username (unique, 3-30 characters)
   - Email address (for password recovery)
   - Display name (shown publicly)
   - Password (minimum 8 characters, stored with Argon2id hashing)
3. Click register — auto-login on success

**Login:**

1. Navigate to `/login` or click **"登录"** (Login)
2. Enter email + password
3. JWT Token issued after login (7-day default validity)

**Password Reset:**

1. Click **"忘记密码"** (Forgot Password) on the login page
2. Enter your registered email
3. Check your inbox for the reset link (SHA-256 secure token)
4. Click the link to set a new password

### 2.3 Homepage & Feed

The homepage (`/`) has three core areas:

**Main Feed — Three Tabs:**

| Tab | Description |
|-----|------------|
| **全部动态** (All) | Posts from all public communities, chronological |
| **关注的人** (Following) | Posts from users you follow |
| **热门** (Hot) | Weighted by score + comments + time decay |

**Right Sidebar:**

- **Search**: Search communities, posts, users
- **Trending**: Currently hottest posts ranked
- **Creator Leaderboard**: Weekly/Monthly/All-time XP rankings
- **Recommended Communities**: System-recommended communities

**Post Card Format:**

```
📝 @space_creator / space_name / module / post_title
   Content preview...
   [Avatar] Author Name · N followers · N days ago
   👍 N    💬 N    ⭐ N
```

### 2.4 Navigation

**Top Navigation Bar:**
- **P Polis** — Home
- **发现** (Explore) — `/explore`
- **关于** (About) — `/about`
- **钱包** (Wallet) — `/wallet`
- **更新** (Changelog) — `/changelog`
- **AI 研究** (AI Research) — `/research`
- **CLI** — `/cli`

**Sidebar (after login):**
- Home / Explore / Notifications / Messages / Saved / Profile / Settings

**Creation Entry Points:**
- **Creator Hub** (`/creations`) — Manage all your works
- **New Creation** (`/creations/new`) — Publish new content
- **Create Community** (`/create`) — Start a new community

### 2.5 Content Creation

**Two Entry Points:**

| Entry | URL | Best For |
|-------|-----|----------|
| Creator Hub | `/creations/new` | Independent creation, submit to multiple communities |
| Community Module Page | Click "发布" inside community | Contextual creation, auto-filled community/module |

**Publishing Flow:**

1. Select content type: **Article** or **Video**
2. Fill in title and content (Markdown supported)
3. Choose target community and module (at least one)
4. Set visibility: Public / Community Members Only
5. Click **"发布"** (Publish)

**Markdown Support:**
- Headings (`# ## ###`)
- Bold (`**text**`), Italic (`*text*`)
- Code blocks (`` `code` ``)
- Blockquotes (`> quote`)
- Links and images
- @mentions and #hashtags

**@Mention System:**
- Type `@username` in content to mention a user
- Mentioned user receives a notification
- Renders as a clickable profile link

**#Hashtag System:**
- Use `#tag-name` in content
- Auto-aggregated to hashtag page (`/hashtag/tag-name`)
- Chinese hashtags fully supported

### 2.6 Community Operations

**Browsing Communities:**

Community URL format: `/space/creator-name/community-name`

Each community has module tabs such as:
- **概览** (Overview) — All module posts aggregated
- **交流** (Discussion) — Custom module (if created)
- **视频** (Video) — Video content

**Creating a Community:**

1. Click **"创建社区"** (Create Community) or navigate to `/create`
2. Fill in:
   - Community name
   - Description
   - Visibility (public/private)
   - Custom modules (optional)
3. After creation, you become the community Owner with admin rights

**Managing a Community:**

As Owner, navigate to `/space/your-space/manage` to:
- Edit basic info (name, description, icon)
- Manage modules (create/edit/delete custom modules)
- Manage members (approve join requests)
- View analytics

### 2.7 Wallet Features

**Wallet Entry:** `/wallet`

**Wallet Overview (`/wallet`):**
- View $POL balance
- View XP points
- View mining status

**Create Wallet (`/wallet/create`):**
- Generate Ed25519 key pair
- Address format: `0xPOL_` + hex(SHA256(pubkey)[..20])
- Argon2id encrypted storage

**Bind Wallet (`/wallet/bind`):**
- Link on-chain wallet address to platform account
- Challenge-Response flow:
  1. Enter wallet address → system generates nonce
  2. Sign nonce with CLI: `polis-chain wallet sign --data "<nonce>"`
  3. Submit signature → verification → binding complete
- After binding, platform XP is associated with on-chain address

**Mining Center (`/wallet/mining`):**
- View current mining round countdown
- XP weight and participation status
- Previous round winners list

**Grand Pool (`/wallet/pool`):**
- View pool progress (target: 100,000 $POL)
- Deposit $POL to the pool
- Top depositors leaderboard
- Alchemy rules (pool full → 1 gold + 2 silver + 3 bronze coins)

**Transaction History (`/wallet/transactions`):**
- View all on-chain transaction history

### 2.8 Social Interactions

| Feature | Action | Notes |
|---------|--------|-------|
| **Like** | Click 👍 | Supports posts and comments |
| **Comment** | Bottom of post detail page | Markdown supported |
| **Bookmark** | Click ⭐ | Bookmark communities, view at `/saved` |
| **Follow** | Click "关注" on user profile | See their posts in "Following" tab |
| **Message** | Click "发消息" on user profile | Direct messaging |
| **Tip** | Click 💰 on post detail | Creator tipping |
| **Share** | Click share on post detail | Twitter/X, Telegram, WhatsApp |
| **Report** | Click report on post detail | Content moderation flow |

### 2.9 Admin Dashboard

**Entry:** `/admin`

The admin dashboard includes 12 functional pages:

| Page | Function |
|------|----------|
| **Dashboard** | Platform overview metrics |
| **Users** | Search/view/ban/unban users |
| **Communities** | View/hide/delete communities |
| **Content** | View/hide/delete posts |
| **Comments** | Manage all comments |
| **Review Queue** | AI-assisted content review |
| **Review Rules** | Configure Agent review policies |
| **Reports** | Handle user reports |
| **Audit Log** | Admin action audit trail |
| **Transactions** | View platform transactions |
| **Analytics** | User/content/community analytics |
| **Settings** | Global platform config |

### 2.10 Other Important Pages

| Page | URL | Description |
|------|-----|-------------|
| **Profile** | `/profile` | Your works/activity/following/followers |
| **User Profile** | `/profile/username` | View another user's public info |
| **Settings** | `/settings` | Edit profile/password/notification prefs |
| **Messages** | `/messages` | DM conversation list |
| **Notifications** | `/notifications` | System notifications (@mentions, likes, etc.) |
| **Saved** | `/saved` | Bookmarked communities |
| **Invites** | `/invites` | Generate/redeem invite codes (100 XP each) |
| **Leaderboard** | `/leaderboard` | Creator XP rankings (weekly/monthly/all-time) |
| **Events** | `/events` | Community events list |
| **Hashtag** | `/hashtag/tag-name` | Hashtag aggregation page |
| **About** | `/about` | Platform philosophy |
| **Privacy** | `/privacy` | Privacy policy |
| **Changelog** | `/changelog` | Version history |
| **CLI Docs** | `/cli` | CLI tool reference |
| **AI Research** | `/research` | AI agent & review system research |

---

## 3. Local CLI Operations

### 3.1 polisctl — Web Platform CLI

**Version**: v1.1.0
**Requirements**: macOS ARM64 / Linux x86_64

**Installation:**

```bash
# Option 1: Download from GitHub Release
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/latest/download/polisctl" -o /usr/local/bin/polisctl
chmod +x /usr/local/bin/polisctl

# Option 2: Build from source
cd polis-platform
cargo build -p polisctl --release
cp target/release/polisctl /usr/local/bin/
```

**Basic Usage:**

```bash
# Check version
polisctl --version
# Output: polisctl 1.1.0

# Show help
polisctl --help

# Default connects to www.mzgw.com
# Override API URL
polisctl --base-url https://www.mzgw.com <COMMAND>

# Output format (default JSON)
polisctl --format json <COMMAND>
polisctl --format table <COMMAND>
```

#### 3.1.1 Authentication

```bash
# Register new user
polisctl auth register <username> <email> <password> <display_name>

# Login to get Token
polisctl auth login <email> <password>
# Token auto-stored at ~/.polis/config

# Check current login
polisctl auth token

# Logout
polisctl auth logout
```

**Verified Output:**

```
$ polisctl auth login user@example.com password
{"token":"eyJ...","user":{"id":"...","username":"testuser"}}
```

#### 3.1.2 Profile Management

```bash
# View profile
polisctl profile view

# Update profile
polisctl profile update --display-name "New Name" --bio "My bio"

# Change password
polisctl profile password <old_password> <new_password>

# View my communities
polisctl profile spaces

# View followers
polisctl profile followers

# View following
polisctl profile following
```

#### 3.1.3 Community Management

```bash
# Search communities
polisctl space search "keyword"
# Example: polisctl space search "test"

# Get community details
polisctl space get <namespace>
# Example: polisctl space get testuser/test-community

# View trending communities
polisctl space trending

# Create community
polisctl space create <name> <slug> <description> [--visibility public|private]

# Join community
polisctl space join <namespace>

# Leave community
polisctl space leave <namespace>

# View members
polisctl space members <namespace>
```

**Verified Output:**

```
$ polisctl space search "test" --format table

banner_url  created_at                   description  ... title         visibility
null        2026-06-01T10:26:47.683810Z               ... Test Community  public
```

#### 3.1.4 Content Management

```bash
# Create post
polisctl post create --title "Title" --content "Markdown content" --space "namespace" --module "module_key"

# List posts
polisctl post list [--space "namespace"] [--page 1]

# Get post details
polisctl post get <post_id>

# Search posts
polisctl post search "keyword"

# Delete post
polisctl post delete <post_id>
```

#### 3.1.5 Interactions

```bash
# Like a post
polisctl like post <post_id>

# Like a comment
polisctl like comment <comment_id>

# Comment on a post
polisctl comment create <post_id> --content "Comment text"

# List comments
polisctl comment list <post_id>

# Follow a user
polisctl follow user <username>

# Bookmark a community
polisctl bookmark add <space_id>
```

#### 3.1.6 Social Features

```bash
# Send DM
polisctl message send <username> --content "Message text"

# View conversations
polisctl message conversations

# View messages with a user
polisctl message list <username>

# Unread count
polisctl message unread-count

# Notification list
polisctl notify list

# Unread notification count
polisctl notify unread

# Mark all read
polisctl notify read-all
```

#### 3.1.7 Health Check

```bash
polisctl health
```

**Verified Output:**

```
$ polisctl health

{
  "all_healthy": true,
  "gateway": "healthy",
  "services": {
    "admin":    { "service": "polis-admin",    "status": "healthy", "database": true },
    "content":  { "service": "polis-content",  "status": "healthy", "database": true },
    "space":    { "service": "polis-space",    "status": "healthy", "database": true },
    "user":     { "service": "polis-user",     "status": "healthy", "database": true },
    "video":    { "service": "polis-video",    "status": "healthy", "database": true }
  }
}
```

---

## 4. Blockchain Operations

### 4.1 polis-chain CLI

**Version**: v1.7.0
**Binary**: `target/release/polis-chain` (9.2 MB)

#### 4.1.1 Wallet Management

```bash
# Create new wallet
polis-chain wallet create
# Output: wallet address (0xPOL_...), public key (hex), private key save path

# Show wallet info
polis-chain wallet show
# Output: address, balance, XP points

# Import wallet (from hex private key)
polis-chain wallet import <hex_private_key>

# Export wallet private key
polis-chain wallet export
# ⚠️ Private key displayed in terminal — keep secure

# Check balance
polis-chain wallet balance
# Output: current $POL balance

# Sign a message
polis-chain wallet sign --data "<message content>"
# Used for: wallet binding verification, transaction signing

# Transfer $POL
polis-chain wallet transfer --to <address> --amount <amount>
```

#### 4.1.2 Running a Blockchain Node

```bash
# Start node (default config)
polis-chain run

# Environment variable configuration:
# POLIS_CHAIN_PORT=8545       # HTTP API port
# POLIS_P2P_PORT=9000         # P2P port
# POLIS_VALIDATOR=true        # Validator mode
# POLIS_DATA_DIR=/path/to/data # Data directory (RocksDB)
```

### 4.2 Mining Mechanism (Proof-of-Luck)

**How It Works:**

1. Users earn XP (experience points) through site activity
2. XP automatically enters hourly weighted lottery rounds
3. Higher XP users have higher win probability (weighted random)
4. Each round rewards 40 $POL, split 50%/30%/20% among 3 winners
5. All participants' XP resets to zero after each round

**Key Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| Round Duration | 3600s (1 hour) | Mining cycle length |
| Reward per Round | 40 $POL | Newly minted tokens |
| Reward Split | [50%, 30%, 20%] | 3 winner distribution |
| Winner Percentage | 10% | Fraction of participants who win |
| Minimum XP | 1 | Participation threshold |

### 4.3 Grand Pool Alchemy

**Flow:**

1. Users deposit $POL into the Grand Pool
2. When pool reaches **100,000 $POL**, alchemy triggers
3. Deposited $POL is burned (removed from circulation)
4. Rare coins minted: **1 Gold + 2 Silver + 3 Bronze**
5. Rare coins distributed via weighted lottery among depositors

**API Endpoints:**

```bash
# Check pool status
curl https://www.mzgw.com/api/chain/pool

# Deposit $POL (requires Ed25519 signature)
curl -X POST https://www.mzgw.com/api/chain/pool/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xPOL_...",
    "amount": 100,
    "public_key": "<hex_32_bytes>",
    "signature": "<hex_64_bytes>"
  }'
```

### 4.4 Site Registration

Site operators can register their Polis site on-chain:

```bash
curl -X POST https://www.mzgw.com/api/chain/site/register \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "mysite.com",
    "admin_address": "0xPOL_...",
    "public_key": "<hex_32_bytes>",
    "name": "My Polis Site"
  }'
```

Registered sites can:
- Submit user activity proofs (ActivityProof) to the chain
- Users' XP submitted with site's Ed25519 signature
- Participate in anti-fraud reputation scoring

### 4.5 On-Chain API Reference

Chain API proxied through Gateway: `https://www.mzgw.com/api/chain/*`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chain/status` | GET | Chain status (height, latest block, consensus phase) |
| `/api/chain/block/latest` | GET | Latest block info |
| `/api/chain/block/{hash}` | GET | Query block by hash |
| `/api/chain/block/{height}` | GET | Query block by height |
| `/api/chain/transaction/{hash}` | GET | Query transaction |
| `/api/chain/account/{address}` | GET | Query account state |
| `/api/chain/account/{address}/xp` | GET | Query account XP |
| `/api/chain/mining/round` | GET | Current mining round |
| `/api/chain/mining/round/{id}` | GET | Historical round |
| `/api/chain/pool` | GET | Grand Pool status |
| `/api/chain/pool/deposit` | POST | Deposit to pool (signature required) |
| `/api/chain/site/register` | POST | Register site |
| `/api/chain/site/{id}` | GET | Site info |
| `/api/chain/validator/list` | GET | Validator list |
| `/api/chain/transaction/submit` | POST | Submit signed transaction |
| `/api/chain/activity/submit` | POST | Submit activity proof (site-signed) |

---

## 5. Server Administration

### 5.1 SSH Connection

```bash
# Connect to server
ssh root@47.253.123.3

# With key
ssh -i ~/.ssh/id_rsa root@47.253.123.3

# Port: default SSH 22
```

### 5.2 Service Management

All services managed via systemd:

```bash
# Check all Polis service statuses
systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# Check individual service status
systemctl status polis-gateway

# Start a service
systemctl start polis-gateway

# Stop a service
systemctl stop polis-gateway

# Restart a service
systemctl restart polis-gateway

# Restart all Polis services
systemctl restart polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# View service logs (real-time)
journalctl -u polis-gateway -f

# View last 100 log lines
journalctl -u polis-gateway -n 100 --no-pager

# View logs from the past hour
journalctl -u polis-gateway --since "1 hour ago" --no-pager
```

### 5.3 File Locations

| Path | Content |
|------|---------|
| `/root/polis/target/release/` | Backend binaries |
| `/opt/polis-web/` | Frontend Next.js files |
| `/opt/polis-web/.next/` | Next.js build output |
| `/opt/polis-web/.next/standalone/` | Next.js standalone server |
| `/opt/polis-web/.next/BUILD_ID` | Current frontend version ID |
| `/etc/systemd/system/polis-*.service` | systemd unit files |
| `/etc/nginx/conf.d/polis.conf` | Nginx configuration |
| `/etc/letsencrypt/live/speedtest.mzgw.com/` | SSL certificates |

### 5.4 Database Operations

```bash
# Check PostgreSQL status via systemd
systemctl status postgresql

# Test database connection
PGPASSWORD=<password> psql -U polis -d polis -c "SELECT version();"

# List all tables
PGPASSWORD=<password> psql -U polis -d polis -c "\dt"

# Check database size
PGPASSWORD=<password> psql -U polis -d polis -c "SELECT pg_database_size('polis')/1024/1024 AS size_mb;"

# Backup database
pg_dump -U polis polis > /tmp/polis_backup_$(date +%Y%m%d).sql
```

### 5.5 Nginx Management

```bash
# Test configuration
nginx -t

# Reload configuration (zero downtime)
systemctl reload nginx

# View configuration
cat /etc/nginx/conf.d/polis.conf

# View access logs
tail -f /var/log/nginx/access.log

# View error logs
tail -f /var/log/nginx/error.log
```

**Nginx Routing Architecture:**

```
HTTPS Request → Nginx (:443)
  ├─ /api/videos         → API Gateway (:8080) [600M upload limit]
  ├─ /api/*              → API Gateway (:8080)
  ├─ /hls/*              → API Gateway (:8080) [HLS video streaming]
  ├─ /health             → API Gateway (:8080)
  ├─ /_next/static/*     → Next.js (:3000) [1-year cache, immutable]
  └─ /*                  → Next.js (:3000)
```

### 5.6 SSL Certificates

```bash
# View certificate info
openssl x509 -in /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem -text -noout | grep -E '(Not After|Not Before|DNS)'

# Renew certificate (Let's Encrypt 90-day validity)
certbot renew --dry-run  # Test first
certbot renew             # Actual renewal

# Auto-renewal is typically configured via cron or systemd timer
```

### 5.7 Monitoring Commands

```bash
# Memory usage
free -h

# Disk usage
df -h

# Top processes
top -bn1 | head -20

# Listening ports
ss -tlnp | grep -E '(80|443|3000|8080|8545)'

# Connection count
ss -s

# Check if services respond
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/api/health
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/
```

---

## 6. Deployment Guide

### 6.1 One-Click Deploy (Recommended)

```bash
./deploy.sh                     # Full deploy (auto version)
./deploy.sh --backend           # Backend only
./deploy.sh --frontend          # Frontend only
./deploy.sh --check             # Check server status only
./deploy.sh --version v2.0.0    # Specify version
./deploy.sh --dry-run           # Build + package, skip upload/deploy
```

The script runs: preflight check → Rust cross-compile → frontend build → package → GitHub Release → server deploy → restart → verify.

> See [DEPLOY.md](../../DEPLOY.md) for the complete third-party deployment guide with server setup instructions.

### 6.2 Deployment Rules (Must Follow)

> ⚠️ The following three rules must not be violated:

1. **Local build → GitHub Releases → Server download.** Never compile on the server.
2. **No SCP**: Trans-Pacific SCP transmission of large files will drop packets or freeze.
3. **Server has only 1.6GB RAM** — `npm run build` + `cargo build` will cause OOM.

### 6.3 Post-Deployment Verification

```bash
# 1. Check all services
ssh root@47.253.123.3 "systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web"

# 2. Check homepage
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://www.mzgw.com/

# 3. Check API
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://www.mzgw.com/api/spaces/trending

# 4. Check static assets
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://www.mzgw.com/_next/static/chunks/webpack.js

# 5. Browser verification
open https://www.mzgw.com
```
"
```

---

## 7. Troubleshooting

### 7.1 Common Issues

#### Issue 1: Website Returns 502

```bash
# Check if Gateway is running
ssh root@47.253.123.3 "systemctl status polis-gateway"

# If gateway is down, restart it
ssh root@47.253.123.3 "systemctl restart polis-gateway"

# Check for OOM kills
ssh root@47.253.123.3 "dmesg | grep -i 'killed process' | tail -5"
```

#### Issue 2: Frontend Shows Blank Page

```bash
# Check if static files are correctly deployed
ssh root@47.253.123.3 "ls -la /opt/polis-web/.next/standalone/.next/static/"

# If static directory is missing, copy it
ssh root@47.253.123.3 "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"

# Check if static assets are accessible
curl -s -o /dev/null -w "%{http_code}" https://www.mzgw.com/_next/static/chunks/webpack.js
# Should return 200. If 404, static wasn't copied.
```

#### Issue 3: Slow API Responses

```bash
# Check database connection pool
ssh root@47.253.123.3 "PGPASSWORD=<password> psql -U polis -d polis -c \"SELECT count(*) FROM pg_stat_activity;\""

# Check memory
ssh root@47.253.123.3 "free -h"

# Check disk
ssh root@47.253.123.3 "df -h /"
```

#### Issue 4: Chinese URLs Garbled

```bash
# Symptom: Chinese community/user names appear as %E6%B5%8B... in URLs
# Cause: encodeURIComponent called multiple times causing double encoding
# Fix: Check URL construction logic in frontend api.ts, ensure single encoding
```

#### Issue 5: Service Fails to Start

```bash
# View detailed error
ssh root@47.253.123.3 "journalctl -u polis-gateway -n 50 --no-pager"

# Common causes:
# 1. Database connection failure → check PostgreSQL
# 2. Port conflict → ss -tlnp | grep <port>
# 3. Missing config → check environment variables or .env file
# 4. Binary architecture mismatch → file /root/polis/target/release/polis-gateway
```

#### Issue 6: SSL Certificate Expired

```bash
# Check certificate expiration
ssh root@47.253.123.3 "openssl x509 -in /etc/letsencrypt/live/speedtest.mzgw.com/fullchain.pem -text -noout | grep 'Not After'"

# Renew
ssh root@47.253.123.3 "certbot renew && systemctl reload nginx"
```

#### Issue 7: _next/static 404 After Deploy

This is a high-frequency issue. Next.js standalone mode requires `static` directory at `.next/standalone/.next/static`, but packaging places it at `.next/static`. You must manually copy it after every frontend deployment.

```bash
# Fix command
ssh root@47.253.123.3 "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"
```

### 7.2 Diagnostic Command Reference

```bash
# Full health check
./target/release/polisctl health

# Check homepage
curl -s -o /dev/null -w "HTTP %{http_code}, Time: %{time_total}s\n" https://www.mzgw.com/

# Check API
curl -s https://www.mzgw.com/api/health | python3 -m json.tool

# Server memory & disk
ssh root@47.253.123.3 "free -h; echo '---'; df -h /"

# All service statuses
ssh root@47.253.123.3 "systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web"

# Recent error logs
ssh root@47.253.123.3 "journalctl -u polis-gateway --since '10 min ago' --no-pager | grep -i error | tail -10"
```

---

## 8. Quick Reference Card

### 8.1 Most Used Commands

```bash
# === Local ===
polisctl health                                          # Health check
polisctl space search "keyword"                          # Search communities
polisctl auth login <email> <password>                   # Login
cargo build --release --target x86_64-unknown-linux-gnu  # Build all backends
cd web && npm run build                                  # Build frontend

# === Server ===
systemctl status polis-gateway                            # Check service status
systemctl restart polis-web                               # Restart frontend
journalctl -u polis-gateway -f                            # Real-time logs
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static  # Fix blank page

# === Blockchain ===
polis-chain wallet create                                 # Create wallet
polis-chain wallet balance                                # Check balance
polis-chain wallet sign --data "<message>"                # Sign message
```

### 8.2 Port Mapping

```
:80   → Nginx (HTTP → HTTPS redirect)
:443  → Nginx (HTTPS)
         ├─ /api/*       → :8080 (Gateway)
         ├─ /_next/static → :3000 (Next.js, 1yr cache)
         └─ /*           → :3000 (Next.js)
:3000 → Next.js Frontend
:8080 → polis-gateway (internal routing to microservices)
:5432 → PostgreSQL
:8545 → polis-chain (not deployed to server)
```

### 8.3 Key File Paths

| File | Path |
|------|------|
| Backend Binaries | `/root/polis/target/release/polis-*` |
| Frontend Files | `/opt/polis-web/` |
| Nginx Config | `/etc/nginx/conf.d/polis.conf` |
| SSL Certs | `/etc/letsencrypt/live/speedtest.mzgw.com/` |
| systemd Units | `/etc/systemd/system/polis-*.service` |
| PostgreSQL Data | `/var/lib/postgresql/` |

### 8.4 Environment Variables

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `DATABASE_URL` | All | PostgreSQL connection string | `postgres://polis:password@localhost/polis` |
| `JWT_SECRET` | gateway/user | JWT signing key | Required |
| `POLIS_BASE_URL` | polisctl | API base URL | `https://www.mzgw.com` |
| `POLIS_FORMAT` | polisctl | Output format | `json` |
| `CHAIN_API_URL` | content | Chain API URL | — |
| `CHAIN_SITE_ID` | content | Site ID | — |
| `POLIS_SITE_PRIVATE_KEY` | content | Site signing private key | — |

---

> **Note**: This manual was written based on actual system verification performed on 2026-06-04. All commands have been tested in the real environment.
> Screenshots are saved in `docs/screenshots/` directory.
