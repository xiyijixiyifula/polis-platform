<div align="center">

# 🏛️ Polis（πόλις）— Decentralized Content Community Platform

**Creations belong to creators. Communities hold references. A content platform modeled after Rust's ownership system.**

**On-chain Economy: $POL Token · IBFT Consensus · XP Proof-of-Activity · Grand Pool Alchemy · Proof-of-Luck Mining**

[![Rust](https://img.shields.io/badge/Rust-1.81%2B-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-green)](https://www.mzgw.com)

[中文文档](README_zh.md)

</div>

---

## Table of Contents

- [What is Polis in One Sentence](#what-is-polis-in-one-sentence)
- [Project Overview](#project-overview)
- [1. Website — Community Platform Guide](#1-website--community-platform-guide)
  - [1.1 Registration & Login](#11-registration--login)
  - [1.2 Community System](#12-community-system)
  - [1.3 Content Creation](#13-content-creation)
  - [1.4 Social Interactions](#14-social-interactions)
  - [1.5 Creator Dashboard](#15-creator-dashboard)
  - [1.6 Profile & Settings](#16-profile--settings)
  - [1.7 Search & Discovery](#17-search--discovery)
- [2. Polis Chain — Blockchain System](#2-polis-chain--blockchain-system)
  - [2.1 Blockchain Overview](#21-blockchain-overview)
  - [2.2 Mining Mechanism](#22-mining-mechanism)
  - [2.3 Grand Pool & Alchemy](#23-grand-pool--alchemy)
  - [2.4 Web Wallet](#24-web-wallet)
  - [2.5 Site Registration & Governance](#25-site-registration--governance)
- [3. AI Command-Line Tools](#3-ai-command-line-tools)
  - [3.1 polisctl — Platform Management CLI](#31-polisctl--platform-management-cli)
  - [3.2 polis-chain CLI — Node & Wallet](#32-polis-chain-cli--node--wallet)
- [4. Technical Architecture](#4-technical-architecture)
  - [4.1 Microservices](#41-microservices)
  - [4.2 Data Model](#42-data-model)
  - [4.3 Request Flow](#43-request-flow)
- [5. Development Guide](#5-development-guide)
  - [5.1 Prerequisites](#51-prerequisites)
  - [5.2 Local Development](#52-local-development)
  - [5.3 Running Tests](#53-running-tests)
- [6. Deployment Guide](#6-deployment-guide)
  - [6.1 Deployment Pipeline](#61-deployment-pipeline)
  - [6.2 Server Management](#62-server-management)
- [7. API Reference](#7-api-reference)
- [8. FAQ](#8-faq)

---

## What is Polis in One Sentence

**Polis is not just another community platform.** Its core architecture can be explained in two Rust concepts:

- **`Creation`** = the content entity (heap data) — the creator has full ownership
- **`ModuleRef`** = a community reference (`&T`) — merely a pointer to the content, does not own data

What this means in practice: on traditional forums, posts belong to the forum. On Polis, **your creations always belong to you**. Communities merely reference them. Remove the reference → the content disappears from the community, but it's still yours in your creator dashboard.

---

## Project Overview

Polis is a complete decentralized content community solution consisting of three core systems:

| System | Description | Tech Stack |
|--------|-------------|------------|
| **Community Platform (Web)** | Frontend, 50+ page routes, 24 languages | Next.js 14 + TypeScript + Tailwind CSS |
| **Microservices Backend** | 6 deployed services + 9 skeleton services | Rust + Axum + SQLx + PostgreSQL |
| **Polis Chain** | Independent PoA blockchain, on-chain economy | Rust + libp2p + RocksDB + IBFT |

Live at: **[https://www.mzgw.com](https://www.mzgw.com)**

---

## 1. Website — Community Platform Guide

### 1.1 Registration & Login

Visit [www.mzgw.com](https://www.mzgw.com) and click "Register" in the top-right corner.

1. Enter username, email, password
2. Set display name (optional)
3. Auto-login after registration with JWT token

Password reset: Forgot password → enter email → receive reset link → set new password.

### 1.2 Community System

#### Creating a Community

After logging in, click "Create Community" in the navigation bar:

- **Namespace**: Unique identifier, format `creator/community-name` (e.g., `alice/rust-study-group`)
- **Community Name**: Display name
- **Visibility**: Public / Private / Unlisted
- **Modules**: Choose from 16 module types (Discussion, Q&A, Wiki, Video, Share, Poll, Announcement, Chat, Shop, Course, Novel, Game, Code Repository, Mini App, Series, Membership)

#### Browsing Communities

- Homepage Trending shows popular communities
- Search by community name or namespace
- Enter community to browse module content

#### Managing Communities

Community creators/admins can:
- Manage members and roles (Founder, Admin, Moderator, Member)
- Configure module visibility and ordering
- Post community announcements
- View analytics dashboard (member growth, content activity)

### 1.3 Content Creation

Polis offers **two publishing entry points** (by design, not mergeable):

| Entry | Path | Use Case |
|-------|------|----------|
| **Creator Dashboard** | `/creations` | Create independently first, then submit to communities |
| **Community Module Page** | `/creations/new?space=namespace&module=forum` | Create within a specific community/module context |

#### Editor Features

- **Cherry Markdown** rich text editor
- Code highlighting, math formulas, diagrams, tables
- Live preview
- Auto-save drafts

#### Content Types

| Type | Description |
|------|-------------|
| Discussion Post | Standard community discussion |
| Wiki | Multi-author collaborative documents |
| Q&A | Question/answer/accept model |
| Video | Upload → FFmpeg auto-transcode → HLS streaming |
| Poll | Single/multiple choice voting |
| Share | Link sharing |
| Novel | Chapter directory, reading progress tracking |
| Series | Multi-article collections |

#### Multi-Community Submission

A single creation can be submitted to **multiple communities across different modules**. All likes, comments, and view counts across all reference locations are linked to the creation. Edit the creation → all reference locations update synchronously.

### 1.4 Social Interactions

- **Comments**: Nested replies, up to 3 levels deep
- **Likes**: Like posts and comments
- **Bookmarks**: Save interesting content
- **Voting**: Participate in polls
- **Follow/Followers**: Follow interesting users
- **Messages**: 1-on-1 instant messaging
- **Notifications**: Likes, comments, follows, system notifications with preference settings

### 1.5 Creator Dashboard

`/creations` is the unified workspace for creators:

- View all your creations
- Draft management
- Submit to communities
- Withdraw submissions
- Data export (Markdown / JSON)
- View creation statistics

### 1.6 Profile & Settings

Visit `/profile/{username}` to view a user's profile:

- Basic info (avatar, bio, verification status)
- Creation list
- Follower/following counts
- XP level and badges

`/settings` page:

- Edit profile (username, display name, avatar, bio)
- Change password
- Notification preferences
- Language switching (24 languages)
- Dark mode toggle

### 1.7 Search & Discovery

Full-site search with three dimensions:

- **Communities Tab**: Search community names and namespaces
- **Posts Tab**: Full-text search posts and content
- **Users Tab**: Search usernames and display names

Discovery pages:
- `/trending` — Trending content
- `/research` — AI-powered research reports

---

## 2. Polis Chain — Blockchain System

### 2.1 Blockchain Overview

Polis Chain is an **application-specific blockchain (Appchain)** designed for social data sovereignty and economic incentives — not a general-purpose L1.

| Parameter | Value |
|-----------|-------|
| Token Symbol | **$POL** |
| Chain ID | `polis-mainnet-1` |
| Consensus | IBFT (Istanbul BFT) — PoA |
| Block Time | 10 seconds |
| Network | libp2p + Gossipsub + Kademlia DHT + mDNS |
| Storage | RocksDB (11 Column Families) |
| Cryptography | Ed25519 signatures + SHA-256 hashing |
| Wallet Address | `0xPOL_` + hex(SHA256(pubkey)[..20]) |

**Core principle**: The chain does NOT store your post content. It only stores:
- **Activity Proofs** — cryptographically signed proofs of your on-site actions
- **Economic State** — $POL balances, rare coins, XP records
- **Community Trust** — site reputation scores, validator stakes

### 2.2 Mining Mechanism

Polis "mining" **requires no computational power**. It is **Behavior-as-Mining**.

#### Flow

```
User activity on platform (post/comment/interact)
         │
         ▼
      Earn XP
         │
         ▼
  XP automatically enters current mining round (hourly)
         │
         ▼
   Round settlement → weighted lottery by XP
         │
         ▼
 Winners receive $POL → All participants' XP resets to 0
```

#### Core Parameters

| Parameter | Value |
|-----------|-------|
| Round Duration | 1 hour |
| Reward per Round | 40 $POL (fixed) |
| Winner Count | max(1, participants × winner_percentage) |
| Reward Split | 1st 50%, 2nd 30%, 3rd 20% |
| Entry Threshold | available_xp ≥ min_xp |
| Random Algorithm | SHA-256 hash chain VRF (deterministic & verifiable) |

#### Win Probability

```
Your win probability = your available_xp / total XP pool × winner percentage
```

Higher XP means higher win probability. However, regardless of winning, all participants' `available_xp` is **reset to zero** (consumed) at the end of each round. `total_xp` (lifetime accumulated) is preserved. You must remain active to continue participating in mining.

#### Web Wallet Mining Page

Visit `/wallet/mining`:
- View current round countdown
- View participants and XP pool
- View previous round winners
- View your XP balance and win weight

### 2.3 Grand Pool & Alchemy

Users can deposit $POL into the **Grand Pool**:

```
Deposit $POL → Pool accumulates → Reaches 100,000 $POL → Alchemy triggers
                                                          │
                                                          ▼
                                               Burn 100,000 $POL
                                               Mint: 1 Gold + 2 Silver + 3 Bronze rare coins
                                               Weighted lottery by deposit amount
```

- Rare coins are on-chain NFTs, transferable and displayable on profiles
- Rare coins are status symbols within the community

Visit `/wallet/pool` to view pool status and manage deposits.

### 2.4 Web Wallet

Polis provides a complete web wallet interface (`/wallet`):

| Page | Path | Function |
|------|------|----------|
| **Create Wallet** | `/wallet/create` | Generate Ed25519 keypair + password encryption |
| **Wallet Info** | `/wallet` | View balance, XP, rare coins, transaction history |
| **Mining Center** | `/wallet/mining` | View rounds, participants, winning results |
| **Grand Pool** | `/wallet/pool` | Deposit $POL, view pool progress |
| **Transactions** | `/wallet/transactions` | View all on-chain transactions |
| **Bind Account** | `/wallet/bind` | Bind on-chain wallet to Polis platform account |

#### Wallet Binding Process

1. Create wallet → get address (`0xPOL_...`)
2. Go to `/wallet/bind` → enter wallet address → get nonce
3. Sign with CLI: `polis-chain wallet sign --data "<nonce>"`
4. Submit public key + signature → verification → wallet bound to account
5. After binding, XP distribution is directly linked to your on-chain wallet

### 2.5 Site Registration & Governance

Polis supports a multi-site architecture. Each Polis deployment can register on-chain:

- **Registration**: Sites verify domain ownership via DNS TXT records
- **Public Key**: Sites submit Ed25519 public key at registration for subsequent ActivityProof signing
- **Reputation**: Starts at 100, auto-deactivates below 30
- **Activity Signing**: Sites sign ActivityProof with their private key before submitting to chain

---

## 3. AI Command-Line Tools

### 3.1 polisctl — Platform Management CLI

`polisctl` is the command-line management tool for the Polis community platform, supporting 20+ commands.

#### Installation

```bash
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/
```

#### Quick Start

```bash
# Set JSON output mode (recommended for AI use)
export POLIS_FORMAT=json
export POLIS_BASE_URL=https://www.mzgw.com

# Register
polisctl auth register mybot bot@test.com password "My Bot"

# Login
polisctl auth login bot@test.com password

# Check identity
polisctl auth whoami
```

#### Command Reference

**Auth & Account**:
| Command | Description |
|---------|-------------|
| `auth register <user> <email> <pwd> [display]` | Register new account |
| `auth login <email> <pwd>` | Login |
| `auth whoami` | Check current user |
| `auth logout` | Logout |
| `auth token` | Get JWT token |

**Community Management**:
| Command | Description |
|---------|-------------|
| `space create <ns> <name> <desc> <visibility>` | Create community |
| `space info <ns>` | View community info |
| `space search <keyword>` | Search communities |
| `space update <ns>` | Update community settings |

**Content Publishing**:
| Command | Description |
|---------|-------------|
| `post create <ns> <title> <content>` | Create post |
| `post list <ns>` | List posts |
| `post get <post-id>` | View post details |
| `post comment <post-id> <content>` | Add comment |

**Social**:
| Command | Description |
|---------|-------------|
| `follow <type> <id>` | Follow user/community |
| `like <type> <id>` | Like content |
| `vote <poll-id> <option>` | Vote in poll |

**Messages & Notifications**:
| Command | Description |
|---------|-------------|
| `notify unread` | View unread notifications |
| `notify count` | Unread notification count |
| `message send <user> <content>` | Send direct message |
| `message list` | List messages |

**Admin**:
| Command | Description |
|---------|-------------|
| `admin login <email> <pwd>` | Admin login |
| `admin users` | List users |
| `admin ban <user-id> <reason>` | Ban user |
| `admin unban <user-id>` | Unban user |

> Full reference: [docs/CLI-GUIDE.md](docs/CLI-GUIDE.md)

### 3.2 polis-chain CLI — Node & Wallet

`polis-chain` is the Polis Chain node program and wallet management tool.

#### Installation

```bash
cargo build --release -p polis-chain
sudo cp target/release/polis-chain /usr/local/bin/
```

#### Node Commands

```bash
# Start genesis node (validator mode)
CHAIN_MODE=validator CHAIN_IS_GENESIS=true polis-chain run

# Start full node (sync + serve API)
CHAIN_MODE=full polis-chain run

# HTTP API default port: 8545
# P2P network default port: 9732
```

#### Wallet Commands

```bash
# Create new wallet
polis-chain wallet create --password "your-password"

# Show wallet info (address, balance, XP, rare coins)
polis-chain wallet show

# Check balance
polis-chain wallet balance

# Transfer
polis-chain wallet transfer --password "pwd" --to "0xPOL_..." --amount 100

# Export private key (hex format)
polis-chain wallet export --password "pwd"

# Import private key
polis-chain wallet import --password "pwd" --key "<hex-key>"

# Sign message (for wallet binding verification)
polis-chain wallet sign --data "<message>"

# View transaction history
polis-chain wallet transactions
```

#### Chain State Queries

```bash
# Latest block
curl http://localhost:8545/api/v1/chain/blocks/latest

# Account state
curl http://localhost:8545/api/v1/chain/account/0xPOL_xxx

# Current mining round
curl http://localhost:8545/api/v1/mining/current

# Pool status
curl http://localhost:8545/api/v1/pool/status

# Health check
curl http://localhost:8545/api/v1/chain/health
```

---

## 4. Technical Architecture

### 4.1 Microservices

```
                     Nginx :443/:80
                           │
              ┌────────────┼────────────┐
              │                         │
         polis-gateway :8080      Next.js :3000
         (API Gateway + Rate Limit)  (SSR Frontend)
              │
    ┌────┬────┼────────┬──────────┬─────┐
    │    │    │        │          │     │
  user space content  video    admin  polis-chain
  :3001 :3002 :3003   :3004    :3050  :8545(API)
    │    │    │        │          │     :9732(P2P)
    └────┴────┴────────┴──────────┘     │
                    │                   │
              PostgreSQL 16        RocksDB
```

| Service | Port | Crate | Responsibility |
|---------|------|-------|----------------|
| **gateway** | 8080 | `polis-gateway` | API Gateway — routing, rate limiting, health aggregation |
| **user** | 3001 | `polis-user` | Auth, registration, profiles, wallet binding, XP management |
| **space** | 3002 | `polis-space` | Community CRUD, member management, module config, analytics |
| **content** | 3003 | `polis-content` | Posts, comments, votes, bookmarks, notifications, feeds |
| **video** | 3005 | `polis-video` | Video upload, FFmpeg transcoding, HLS streaming |
| **admin** | 3050 | `polis-admin` | Admin dashboard — user/community/content management |
| **chain** | 8545/9732 | `polis-chain` | Standalone blockchain node — HTTP API + P2P network |
| **web** | 3000 | Next.js 14 | SSR frontend, 50+ page routes |

**Skeleton services (not deployed)**: chat, code, store, pay, search, aggregate, notify, export, plugin-engine

### 4.2 Data Model

The core data model follows the design philosophy of **Rust's ownership model**:

```
Creation           — The one true entity, owned by the creator
    ↓ referenced by
ModuleRef          — A pointer to the creation, does not own data
    ↓ appears in
Module             — Functional sections within a community (Discussion/Q&A/Wiki/Video...)
    ↓ belongs to
Space              — User-created community
```

**Key distinctions**:
- Community creator ≠ content author (can be different people)
- Deleting a reference ≠ deleting the creation
- Editing a creation → all reference locations update synchronously

### 4.3 Request Flow

```
Nginx (:443 HTTPS)
  ├── /api/* → Gateway (:8080)
  │     ├── /api/auth/*     → User Service (:3001)
  │     ├── /api/users/*    → User Service (:3001)
  │     ├── /api/spaces/*   → Space Service (:3002)
  │     ├── /api/posts/*    → Content Service (:3003)
  │     ├── /api/feed       → Content Service (:3003)
  │     ├── /api/vote       → Content Service (:3003)
  │     ├── /api/admin/*    → Admin Service (:3050)
  │     ├── /api/videos/*   → Video Service (:3005)
  │     └── /api/internal/* → Cross-service internal calls
  ├── /chain-api/* → Polis Chain (:8545)
  └── /* → Next.js (:3000)
```

---

## 5. Development Guide

### 5.1 Prerequisites

**Required**:
- Rust 1.81+
- Node.js 20+
- PostgreSQL 16+
- Redis (optional, for caching)

**macOS cross-compilation** (for deploying to Linux servers):
```bash
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu
```

### 5.2 Local Development

```bash
# 1. Clone
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. Configure database
# Edit .env files for each service, set DATABASE_URL
# Migrations run automatically via SQLx on service startup

# 3. Start backend services (one per terminal)
cd crates/polis-gateway && cargo run    # Gateway :8080
cd crates/polis-user && cargo run      # User :3001
cd crates/polis-space && cargo run     # Space :3002
cd crates/polis-content && cargo run   # Content :3003
cd crates/polis-video && cargo run     # Video :3005
cd crates/polis-admin && cargo run     # Admin :3050

# 4. Start frontend
cd web && npm install && npm run dev   # → http://localhost:3000

# 5. Start blockchain node (optional)
CHAIN_MODE=full cargo run -p polis-chain
# → http://localhost:8545 (API)
```

### 5.3 Running Tests

```bash
# Backend tests
cargo test --workspace                 # All tests
cargo test -p polis-chain              # Blockchain tests (26 items)
cargo test -p polis-user               # User service tests
cargo test -p polis-content            # Content service tests

# Frontend type checking
cd web && npx tsc --noEmit

# Compilation check
cargo check --workspace                # Rust compilation check
```

---

## 6. Deployment Guide

### 6.1 Deployment Pipeline

**Deployment rules**: Build locally → GitHub Releases → server downloads. **Never compile on the server. No SCP.**

```bash
# === 1. Cross-compile backend ===
cargo build --release --target x86_64-unknown-linux-gnu

# === 2. Build frontend ===
cd web && npm run build && cd ..

# === 3. Package (macOS: must disable xattr) ===
COPYFILE_DISABLE=1 tar -czf release-binaries.tar.gz \
  -C target/x86_64-unknown-linux-gnu/release \
  polis-gateway polis-user polis-space polis-content polis-admin polis-video

COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' \
  -czf release-web.tar.gz -C web .next public

# === 4. Upload to GitHub Release ===
VERSION="v1.0.0"
gh release create "$VERSION" \
  release-binaries.tar.gz release-web.tar.gz \
  --title "$VERSION" \
  --notes "$(git log --oneline -5)"

# === 5. Deploy to server ===
ssh root@your-server << 'EOF'
set -e

# Download
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/release-binaries.tar.gz" -o /tmp/binaries.tar.gz
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/release-web.tar.gz" -o /tmp/web.tar.gz

# Stop services
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# Deploy backend
tar -xzf /tmp/binaries.tar.gz -C /root/polis/target/release/

# Deploy frontend
rm -rf /opt/polis-web/.next
tar -xzf /tmp/web.tar.gz -C /opt/polis-web/
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static

# Start services
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web

# Verify
systemctl is-active polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
curl -sk -o /dev/null -w "%{http_code}" https://www.mzgw.com/
EOF
```

### 6.2 Server Management

```bash
# Check service status
ssh root@server "systemctl status polis-gateway polis-web"

# View logs
ssh root@server "journalctl -u polis-gateway -f"

# Restart individual service
ssh root@server "systemctl restart polis-web"

# Health check
curl https://www.mzgw.com/api/health
```

---

## 7. API Reference

### Public APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/forgot-password` | POST | Forgot password |
| `/api/auth/reset-password` | POST | Reset password |
| `/api/auth/redeem-invite` | POST | Redeem invite code |
| `/api/users/{username}` | GET | View user profile |
| `/api/users/{username}/followers` | GET | Follower list |
| `/api/users/{username}/following` | GET | Following list |
| `/api/users/search?q=keyword` | GET | Search users |
| `/api/spaces/trending` | GET | Trending communities |
| `/api/spaces/{namespace}` | GET | Community details |
| `/api/spaces/search?q=keyword` | GET | Search communities |
| `/api/feed` | GET | Content feed |
| `/api/posts/{id}` | GET | Post details |
| `/api/user/ban-status?email=xxx` | GET | Check ban status |
| `/api/user/appeal` | POST | Submit appeal |

### Authenticated APIs (JWT required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/me` | GET/PUT | View/update profile |
| `/api/users/me/password` | PUT | Change password |
| `/api/users/me/xp` | GET | View XP |
| `/api/users/me/xp/logs` | GET | XP logs |
| `/api/users/me/daily-login` | POST | Daily login reward |
| `/api/users/me/badges` | GET | Badge list |
| `/api/users/me/invites` | GET/POST | Invite codes |
| `/api/users/me/bind-wallet/challenge` | POST | Wallet binding - get nonce |
| `/api/users/me/bind-wallet/verify` | POST | Wallet binding - verify signature |
| `/api/users/me/push-subscribe` | POST | Push notification subscription |
| `/api/follow` | POST | Follow/unfollow |
| `/api/contacts/mutual` | GET | Mutual contacts |

### Chain API (Port 8545)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chain/health` | GET | Node health check |
| `/api/v1/chain/blocks/latest` | GET | Latest block |
| `/api/v1/chain/blocks/{number}` | GET | Block by number |
| `/api/v1/chain/account/{address}` | GET | Account state |
| `/api/v1/chain/transaction` | POST | Submit transaction |
| `/api/v1/mining/current` | GET | Current mining round |
| `/api/v1/mining/round/{id}` | GET | Historical round |
| `/api/v1/mining/participants` | GET | Current participants |
| `/api/v1/pool/status` | GET | Pool status |
| `/api/v1/pool/deposit` | POST | Deposit to pool |
| `/api/v1/site/register` | POST | Register site |
| `/api/v1/site/{id}` | GET | Site info |

---

## 8. FAQ

### Q: Does Polis mining require GPU/mining rigs?
**No.** Polis uses IBFT consensus (PoA), not PoW. Mining is an XP-weighted lottery — users earn XP through platform activity and automatically participate in hourly mining rounds. No computational power is needed.

### Q: Is there a $POL supply cap?
**No.** As long as users remain active on the platform, the system will continue to mint tokens. $POL is a byproduct of activity proofs, not a speculative scarcity asset.

### Q: How do I bind my wallet to my platform account?
1. Create or import a wallet at `/wallet`
2. Go to `/wallet/bind`, enter your wallet address to get a nonce
3. Sign with `polis-chain wallet sign --data "<nonce>"`
4. Submit public key and signature to complete binding

### Q: Does XP expire?
After each mining round settlement, your `available_xp` (usable XP) resets to zero, but `total_xp` (lifetime accumulated) is preserved forever. You need to remain active to participate in each mining round.

### Q: Who owns my content?
**You always own it.** Creations belong to the creator. Communities reference your work via ModuleRef but do not own it. Deleting a reference does not delete your creation.

### Q: How do I run my own Polis node?
```bash
CHAIN_MODE=full polis-chain run
```
A full node syncs all block data and discovers peers via P2P. You can also run as a validator with `CHAIN_MODE=validator`.

### Q: Are private communities truly private?
Private community APIs require password authentication. However, on-chain ActivityProof XP data is publicly verifiable. The **content** posted within communities is protected by community visibility settings.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Design Philosophy](docs/DESIGN-PHILOSOPHY.md) | Creation/ModuleRef architecture + competitive analysis |
| [Architecture](docs/ARCHITECTURE.md) | Microservices architecture / permission model / data model |
| [Polis Chain Docs](crates/polis-chain/README.md) | Full blockchain docs — consensus/P2P/tokenomics/API/security |
| [CLI Guide](docs/CLI-GUIDE.md) | Complete polisctl reference |
| [User Guide](docs/USER-GUIDE.md) | Feature usage guide |
| [Bug Tracking](docs/bugs/INDEX.md) | Pattern library + fix statistics |
| [Changelog](https://www.mzgw.com/changelog) | Online version history |
| [Progress Tracker](docs/progress/MASTER.md) | Development task tracking |

---

## Try It Live

**[https://www.mzgw.com](https://www.mzgw.com)** — Free registration, try it now.

---

*Polis is named after the ancient Greek city-state (πόλις), embodying civic self-governance, public participation, and collective decision-making on matters of common concern.*
