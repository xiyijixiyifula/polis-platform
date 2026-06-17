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

1. [Philosophy & Design Principles](#1-philosophy--design-principles)
2. [Project Overview](#2-project-overview)
3. [Website — Community Platform Complete Guide](#3-website--community-platform-complete-guide)
4. [Polis Chain — Blockchain System Deep Dive](#4-polis-chain--blockchain-system-deep-dive)
5. [AI CLI Tools Complete Reference](#5-ai-cli-tools-complete-reference)
6. [Technical Architecture Deep Dive](#6-technical-architecture-deep-dive)
7. [Data Model Reference](#7-data-model-reference)
8. [Security Model](#8-security-model)
9. [Development Guide](#9-development-guide)
10. [Deployment Guide](#10-deployment-guide) — incl. [AI Agent Deploy](#105-ai-agent-deployment-claude-code--cursor--copilot)
11. [API Complete Reference](#11-api-complete-reference)
12. [Configuration Reference](#12-configuration-reference)
13. [FAQ & Troubleshooting](#13-faq--troubleshooting)
14. [Documentation Index](#14-documentation-index)

---

## 1. Philosophy & Design Principles

### 1.1 The Core Problem

The fundamental contradiction of modern social platforms: **users create value, platforms capture value**. Your posts, interactions, and content generate data and social capital that centralized companies monopolize. Your identity and data don't belong to you — they belong to the entity operating the database.

Polis solves this not by "putting all social data on-chain" (which is neither economical nor necessary), but by designing three parallel systems:

| System | Analogy | Responsibility |
|--------|---------|----------------|
| **Community Platform (Web + Microservices)** | Town Square | Where users communicate, create, and interact |
| **Polis Chain** | Central Bank + Notary | Records activity proofs, manages economic state, maintains community trust |
| **CLI Tools** | Swiss Army Knife | Automation, AI agent operations, developer interfaces |

### 1.2 Rust's Ownership Model Translated to Community

Polis's core architecture can be explained in two Rust concepts:

```
Creation           ≈ heap data (Box<T>)      — Full ownership belongs to the creator
ModuleRef          ≈ immutable reference (&T) — Community borrows the work, doesn't own it
Space              ≈ container (Vec/Rc)       — Holds multiple ModuleRefs
```

What this means in practice:

| Scenario | Traditional Platform | Polis |
|----------|---------------------|-------|
| Post in a community | Post belongs to the community | Creation belongs to you, community merely references it |
| Community deletes post | Post disappears, you lose content | Reference deleted, creation remains in your dashboard |
| Cross-post to multiple communities | Copy-paste, each copy independent | One creation, multiple references, one edit updates all |
| Community creator vs author | Must be the same person | Can be different people (you can publish in someone else's community) |
| Content ownership | Ambiguous | Clear: creator owns creation, community owns reference |

### 1.3 Dual-Dimension Feed

Every feed item carries information from two dimensions simultaneously:

```
@rust_writer / Rust Tech / Discussion / Rust Guide    ← Reference path (where you see it)
original_poster · 0 followers · 2 days ago              ← Creator (who wrote it)
```

- **First dimension** (reference path): Where you're seeing this content — community creator / community name / module / creation name
- **Second dimension** (creator): Who wrote it — creator name, follower count, time posted

Traditional platforms only have the second dimension. Polis shows both, letting you perceive both "community source" and "creator identity" in your feed.

---

## 2. Project Overview

### 2.1 Repository Structure

```
polis-platform/
├── crates/                         # Rust backend (18 crates)
│   ├── polis-core/                 # Shared core library (models, error, config)
│   ├── polis-gateway/              # API Gateway (deployed)
│   ├── polis-user/                 # User Service (deployed)
│   ├── polis-space/                # Space/Community Service (deployed)
│   ├── polis-content/              # Content Service (deployed)
│   ├── polis-video/                # Video Service (deployed)
│   ├── polis-admin/                # Admin Dashboard (deployed)
│   ├── polis-chain/                # Blockchain Node (standalone)
│   ├── polisctl/                   # CLI Management Tool
│   ├── polis-chat/                 # Chat Service (skeleton)
│   ├── polis-code/                 # Code Repository (skeleton)
│   ├── polis-store/                # Shop (skeleton)
│   ├── polis-pay/                  # Payments (skeleton)
│   ├── polis-search/               # Search Service (skeleton)
│   ├── polis-aggregate/            # Aggregator (deployed)
│   ├── polis-notify/               # Notifications (skeleton)
│   ├── polis-export/               # Data Export (skeleton)
│   └── polis-plugin-engine/        # Plugin Engine (skeleton)
├── web/                            # Next.js 14 Frontend (50+ page routes)
├── docs/                           # Documentation
├── migrations/                     # Database Migrations (36+ files)
└── scripts/                        # Ops/Diagnostic Scripts
```

### 2.2 Quick Navigation

| You want to... | Go to |
|----------------|-------|
| Register, use community features | [§3 Website Guide](#3-website--community-platform-complete-guide) |
| Understand blockchain, mining, tokens | [§4 Polis Chain](#4-polis-chain--blockchain-system-deep-dive) |
| Use CLI for platform operations | [§5.1 polisctl CLI](#51-polisctl--platform-management-cli) |
| Manage blockchain node & wallet | [§5.2 polis-chain CLI](#52-polis-chain-cli--node--wallet) |
| Understand technical architecture | [§6 Architecture](#6-technical-architecture-deep-dive) |
| Set up local development | [§9 Development Guide](#9-development-guide) |
| Deploy to server | [§10 Deployment Guide](#10-deployment-guide) |
| Find API endpoints | [§11 API Reference](#11-api-complete-reference) |

---

## 3. Website — Community Platform Complete Guide

Live at: **[https://www.mzgw.com](https://www.mzgw.com)**

### 3.1 Registration & Login

#### Registration Flow

1. Visit [www.mzgw.com](https://www.mzgw.com), click **"Register"** in the top-right corner
2. Fill in the form:
   - **Username**: 3-30 characters, alphanumeric + underscores, globally unique
   - **Email**: For password reset and notifications
   - **Password**: Minimum 8 characters
   - **Display Name** (optional): Public-facing name
3. Click register. The system automatically:
   - Creates user record (PostgreSQL `users` table)
   - Stores Argon2id password hash (never plaintext)
   - Generates JWT access token (24-hour expiry)
   - Auto-login and redirects to homepage

#### Login Flow

1. Click **"Login"**, enter email and password
2. System verifies Argon2 password hash
3. Returns JWT token, stored in browser localStorage
4. Subsequent requests automatically carry `Authorization: Bearer <token>` header

#### Password Reset

```
Forgot password → Enter registered email → System generates reset token (30 min TTL)
  → Sends reset link to email → Click link → Enter new password → Reset complete
```

> Note: If the email is not registered, the system does NOT reveal this (prevents email enumeration), instead displays "If this email is registered, a reset link has been sent."

#### Invite Code Registration

- Registered users can generate invite codes from settings
- New users redeem invite codes: `POST /api/auth/redeem-invite`
- Both inviter and invitee earn XP rewards

### 3.2 Community System

Polis's community system is its most critical differentiating feature. Communities are not content containers — they are **content reference networks**.

#### 3.2.1 Namespace

Each community has a unique namespace in the format `creator/community-name`:

```
alice/rust-study-group        ← Rust study community created by alice
bob/photography-club           ← Photography community created by bob
alice/typescript-advanced      ← Another community by alice (one person can create many)
```

Namespace rules:
- Lowercase letters, digits, hyphens, underscores only
- Immutable after creation
- Used for URL routing: `/space/alice/rust-study-group`

#### 3.2.2 Community Visibility

| Visibility | Meaning | Access Control |
|------------|---------|----------------|
| **public** | Anyone can browse, search | No login required |
| **private** | Members only | Password required to join |
| **unlisted** | Link-access only | Hidden from search and Trending |

#### 3.2.3 Creating a Community

Steps:
1. Log in, click "Create Community" in navigation
2. Fill in basic info:
   - **Namespace** (required): e.g., `myname/tech-notes`
   - **Community Name** (required): Display name, supports Unicode
   - **Description** (optional): Community bio, shown on homepage
   - **Visibility**: public / private / unlisted
   - **Icon** (optional): Community avatar
   - **Banner** (optional): Community header background
   - **Password** (optional): If set, joining requires password
3. **Select Modules**: Choose from 16 module types (can add/remove later):
   - Discussion, Q&A, Wiki, Video
   - Share, Poll, Announcement, Chat
   - Shop, Course, Novel, Game
   - Code Repository, Mini App, Series, Membership
4. Create → auto-redirect to community homepage

#### 3.2.4 Community Management

Community creators have full administrative control:

**Member Management**:
- Role hierarchy: Founder > Admin > Moderator > Member
- Invite members, review join applications
- Remove members, ban users
- Module-level permissions (moderators manage only assigned modules)

**Module Management**:
- Add/remove modules, reorder
- Assign module-specific moderators
- Module visibility controls

**Analytics**:
- Member growth trend charts
- Content activity stats (post count, comment count, view count)
- Trending content rankings

**Level System**:
- Community XP (independent from global XP)
- Lv.1 ~ Lv.6, six levels
- Level affects in-community permissions and badges

### 3.3 Content Creation System

#### 3.3.1 Two Publishing Entry Points (Design Decision, Not Mergeable)

This is one of Polis's most elegant designs. Understanding the intent is highly recommended:

| Entry | Route | Design Intent |
|-------|-------|---------------|
| **Creator Dashboard** | `/creations` → New → Submit to communities | "Me"-centric: create first, then distribute. For independent creators, solo authors |
| **Community Module Page** | Enter community → Module → Publish button | "Context"-centric: create within a specific community setting. For active community members |

**Why not merge them?**

The two entries represent fundamentally different creative mental models:
- **Creator dashboard path**: You want to write a Rust tutorial → write it in the dashboard → decide to submit to "Rust Tech" and "Programmer Daily" communities. Your identity is "independent creator."
- **Community module path**: You're browsing "Rust Tech" community → see people discussing async programming → want to post a reply/tutorial → create directly in context. Your identity is "community participant."

URL parameter: `/creations/new?space=alice/rust-club&module=forum`
→ Creation page pre-fills community and module, but you can still add more communities.

#### 3.3.2 Cherry Markdown Editor

- **Syntax**: Standard Markdown + GFM extensions (tables, task lists, strikethrough)
- **Code Highlighting**: 180+ programming languages
- **Math**: LaTeX math rendering (KaTeX)
- **Diagrams**: Mermaid flowcharts, sequence diagrams, Gantt charts
- **Images**: Drag-and-drop upload, paste upload, auto-compression
- **Live Preview**: Split-pane, edit with instant preview
- **Auto-save**: Drafts saved to localStorage, preventing data loss

#### 3.3.3 Content Type Details

**Discussion Post**: Standard community discussion, Markdown, nested comments (3 levels).

**Q&A**:
- Questioner posts question → community members answer
- Questioner can mark "Accepted" answer
- Accepted answer pinned to top
- Answers sorted by upvotes

**Wiki**:
- Multi-author collaborative document system
- Version history tracking
- Table-of-contents organization
- Ideal for community-built knowledge bases

**Video**:
- Upload video → FFmpeg auto-transcode → HLS adaptive bitrate streaming
- Supported formats: MP4, MOV, AVI, WebM
- Auto-generated thumbnails on server
- Playback position memory

**Poll**:
- Single-choice / multi-choice modes
- Deadline setting
- Real-time results display
- Results hidden until voted (prevents herding)

**Novel**:
- Chapter directory management
- Reading progress tracking
- Word count stats
- Continuous reading mode

**Series**:
- Multi-article collections
- Sequential navigation (prev/next)
- Unified table of contents page

#### 3.3.4 Multi-Community Submission Mechanism

This is Polis's infrastructure-level differentiating capability:

```
One Creation
    ├── ModuleRef → alice/rust-club/forum          (in Rust Club's Discussion)
    ├── ModuleRef → bob/programming/wiki            (in Programming's Wiki)
    └── ModuleRef → carol/tech-notes/discussion     (in Tech Notes' Discussion)
```

Core guarantees:
- **Sync edits**: Edit in any location → all reference locations update synchronously
- **Data aggregation**: Likes, comments, views from all references flow back to the creation
- **Independent moderation**: Each community's moderators independently manage their own references (hide, pin, etc.) without affecting other communities
- **Creator control**: Creator can withdraw submission from any community (delete that reference), but the creation itself is preserved

### 3.4 Social Interaction System

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Comments** | Nested replies, up to 3 levels | `comments` table, `parent_id` self-reference |
| **Likes** | Like posts/comments (toggleable) | `likes` table, UNIQUE constraint prevents duplicates |
| **Bookmarks** | Personal bookmarks with categories | `bookmarks` table, user + creation |
| **Follows** | Follow users/communities | `follows` table, `followee_type` discriminator |
| **Votes** | Participate in community polls | `poll_votes` table, one vote per person |
| **Messages** | 1-on-1 instant messaging | `messages` table, WebSocket push |
| **Notifications** | Likes/comments/follows/system | `notifications` table, mark-as-read support |
| **Tips** | Send $POL to creators | Polis Chain TokenTransfer transaction |

### 3.5 Creator Dashboard

Path: `/creations`

Unified workspace for creators:

- **Creation Management**: List view, filters (published/draft/submitted/withdrawn)
- **Statistics**: Views, likes, comments, bookmarks per creation
- **Drafts**: Auto-saved drafts, continue editing
- **Submission Management**: View submission status, withdraw submissions
- **Data Export**:
  - Markdown format (preserves original formatting)
  - JSON format (structured data for migration)
- **Batch Operations**: Batch submit, batch withdraw

### 3.6 Profile & Settings

#### Profile Page (`/profile/{username}`)

- **Basic Info**: Avatar, display name, bio, verification badge
- **Data Panel**: Creation count, follower count, following count, total likes received
- **XP Display**: Level, XP progress bar, badge wall
- **Creation List**: Tab switcher (Creations / Series / Bookmarks)
- **Wallet Info**: If on-chain wallet is bound, displays $POL balance and rare coins
- **On-chain Address**: Shows `0xPOL_...` address when wallet is bound

#### Settings Page (`/settings`)

- **Profile**: Edit display name, avatar, bio, website
- **Account Security**: Change password, view login history
- **Notification Preferences**: Toggle notification types (likes/comments/follows/system/email)
- **Wallet Binding**: View binding status, unbind
- **Invite Codes**: Generate, view usage
- **Appearance**: Dark mode / Light mode / Follow system
- **Language**: 24 languages (powered by next-intl)

### 3.7 Search & Discovery

#### Global Search

Path: `/search?q=keyword`

Three-tab search results:

| Tab | Scope | Fields Searched |
|-----|-------|-----------------|
| **Communities** | All public communities | Name, namespace, description |
| **Posts** | All public posts | Title, full-text content |
| **Users** | All users | Username, display name, bio |

Backend: PostgreSQL `ILIKE` + `tsvector` full-text search

#### Discovery Pages

- `/trending` — Trending content:
  - Hot communities (by member growth)
  - Hot posts (by recent engagement)
  - Hot creators (by likes received)
- `/research` — AI auto research reports: AI Agent periodically scrapes community data, generates analysis reports
- `/changelog` — Changelog: reverse-chronological version history

---

## 4. Polis Chain — Blockchain System Deep Dive

### 4.1 Design Philosophy

Polis Chain is not a general-purpose L1 (like Ethereum). It is an **application-specific blockchain (Appchain)** designed for social data sovereignty and economic incentives.

| Dimension | General Chain (Ethereum) | Polis Chain |
|-----------|-------------------------|-------------|
| Goal | Run arbitrary smart contracts | Record social activity proofs + manage community economy |
| Data Storage | All state on-chain | Only proofs & assets; content stays on Polis sites |
| Consensus | PoS (Proof of Stake) | IBFT PoA (Proof of Authority) |
| Token | Gas payment + speculation | Behavior incentive + community governance |
| Smart Contracts | Turing-complete | Built-in transaction types (9), non-programmable |
| Throughput | Shared across network | Appchain-dedicated, no contention |

**Core principle: Anchor, don't store** — the chain does NOT store your post content. It only stores activity proofs and economic state. Content and social logic remain on Polis sites. The chain ensures the economic layer is immutable.

### 4.2 System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Polis Community Site                             │
│  Users interact in browser → Content Service processes                │
│  → XpBridge sends XP to User Service + submits ActivityProof to Chain │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ ActivityProof (HTTP + Ed25519 signature)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Polis Chain Node                                  │
│                                                                      │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │    HTTP API      │  │    P2P Network     │  │  IBFT Consensus  │  │
│  │   (axum :8545)   │  │   (libp2p :9732)  │  │   (PoA + Voting) │  │
│  │                  │  │                    │  │                  │  │
│  │ 26+ REST endpoints│  │ Gossipsub broadcast│  │ Idle → PrePre-  │  │
│  │ Txs/blocks/mining│  │ Kademlia DHT peer  │  │ pared → Prepar- │  │
│  │ wallet/site/pool │  │ discovery          │  │ ed → Committed  │  │
│  │                  │  │ mDNS LAN discovery │  │ → RoundChange   │  │
│  │                  │  │ Request/Response   │  │                  │  │
│  └────────┬─────────┘  └────────┬──────────┘  └────────┬─────────┘  │
│           │                     │                       │            │
│           └─────────────────────┼───────────────────────┘            │
│                                 │                                    │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │           ConsensusBridge (Event-Driven Glue Layer)            │  │
│  │   P2P receives PrePrepare/Prepare/Commit/RoundChange          │  │
│  │   → forwards to consensus engine → engine decides              │  │
│  │   → broadcast response → execute/rollback                      │  │
│  └──────────────────────────────┼────────────────────────────────┘  │
│                                 │                                    │
│  ┌───────────────┬──────────────┼───────────────┬──────────────────┐ │
│  │   Mempool     │ Mining Engine │  Grand Pool   │  Security Module │ │
│  │   Tx ordering │ XP-weighted   │ $POL crowdfund│  Site registry   │ │
│  │   dedup       │ lottery       │ + burn        │  + reputation    │ │
│  │   nonce check │ SHA-256 VRF   │ Rare coin mint│  Slashing engine │ │
│  │   anti-replay │ 1 round/hour  │ Deposit-weight│  Anomaly detect  │ │
│  └───────────────┴──────────────┼───────────────┴──────────────────┘ │
│                                 │                                    │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │            RocksDB Storage (11 Column Families)                │  │
│  │                                                                │  │
│  │  Blocks │ Transactions │ AccountState │ Activities           │  │
│  │  Mining │ Pool │ Sites │ Validators │ Config │ Meta          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 IBFT Consensus Engine in Detail

#### 4.3.1 Why IBFT instead of PoW/PoS?

| Consensus | Pros | Cons | Good for Polis? |
|-----------|------|------|-----------------|
| **PoW** | Highly decentralized | Energy waste, low throughput, slow finality | ❌ Not needed |
| **PoS** | Energy-efficient, scalable | Rich-get-richer, complex | ❌ Overly complex |
| **IBFT** | Instant finality, no forks, low latency | Requires authorized validators | ✅ Perfect fit |

Polis validators are operated by community-trusted nodes (e.g., site operators). IBFT provides instant finality (once a block is committed, it cannot be rolled back), which is critical for economic activities (XP distribution, token transfers).

#### 4.3.2 Consensus Phase State Machine

```
                    ┌─────────┐
                    │  Idle   │  ← Waiting for new block proposal
                    └────┬────┘
                         │ Proposer creates candidate block → broadcasts PrePrepare
                         ▼
                   ┌───────────┐
                   │PrePrepared│  ← Validating block legitimacy
                   └─────┬─────┘
                         │ Collect ≥ 2/3 Prepare votes
                         ▼
                   ┌───────────┐
                   │ Prepared  │  ← Lock block (won't vote for another)
                   └─────┬─────┘
                         │ Collect ≥ 2/3 Commit votes
                         ▼
                   ┌───────────┐
                   │ Committed │  ← Block finalized → execute txs → write RocksDB → reset to Idle
                   └───────────┘

     Any timeout (insufficient votes within deadline):
     Any phase ──→ RoundChange → increase round → re-elect proposer → Idle
```

#### 4.3.3 Consensus Message Types

| Message | Sender | Content | Trigger |
|---------|--------|---------|---------|
| **PrePrepare** | Current round proposer | Full Block | Proposer's turn to propose |
| **Prepare** | All validators | Block hash + Ed25519 seal | PrePrepare is valid |
| **Commit** | All validators | Block hash + Ed25519 seal | ≥ 2/3 Prepares collected |
| **RoundChange** | Any validator | Current Height + Round | Timeout, no consensus |

#### 4.3.4 Validator Set Management

```rust
pub struct ValidatorInfo {
    pub address: String,           // Wallet address (0xPOL_...)
    pub public_key: Vec<u8>,       // Ed25519 public key (32 bytes)
    pub site_id: Option<String>,   // Associated site ID
    pub stake_amount: u64,         // Staked $POL (minimum 1,000)
    pub joined_at: u64,            // Join timestamp
    pub reputation: u32,           // Reputation score (0-100)
    pub is_active: bool,           // Active status
}
```

- Validator round-robin block proposal: `proposer = validators[(height + round) % len]`
- Quorum: `⌊2F + 1⌋` where F = `⌊(N-1)/3⌋` (standard BFT fault tolerance)
- Maximum 21 validators
- Minimum 1,000 $POL stake to be a validator
- Validator epoch: 24 hours (validator set recalculated at each epoch end)

### 4.4 Block Structure

```rust
pub struct Block {
    pub header: BlockHeader,
    pub transactions: Vec<SignedTransaction>,
}

pub struct BlockHeader {
    pub number: u64,              // Block height (starts at 0)
    pub parent_hash: [u8; 32],    // Parent block hash
    pub state_root: [u8; 32],     // State Merkle root
    pub tx_root: [u8; 32],        // Transaction Merkle root
    pub timestamp: u64,           // Unix timestamp (seconds)
    pub proposer: String,         // Proposer address
    pub round: u64,               // Consensus round
    pub commits: Vec<CommitSeal>, // Commit vote set
}

pub struct CommitSeal {
    pub validator: String,        // Validator address
    pub block_hash: [u8; 32],     // Confirmed block hash
    pub signature: [u8; 64],      // Ed25519 signature
}
```

### 4.5 Transaction Types (9 Variants)

Polis Chain does not run smart contracts. Instead, it has 9 built-in transaction types. This avoids smart contract security risks while covering all social economy operations.

| # | Type | Variant Name | Triggered By | Description |
|---|------|-------------|-------------|-------------|
| 1 | **SiteRegister** | `site_register` | Site operator | Register site with domain and public key |
| 2 | **ActivityProof** | `activity_proof` | Site | User activity proof on site (core transaction) |
| 3 | **MiningTicket** | `mining_ticket` | User | Purchase ticket for mining lottery |
| 4 | **MiningReward** | `mining_reward` | System | Mining reward distribution (auto-generated) |
| 5 | **TokenTransfer** | `token_transfer` | User | $POL token transfer |
| 6 | **PoolDeposit** | `pool_deposit` | User | Deposit $POL into grand pool |
| 7 | **PoolAlchemy** | `pool_alchemy` | System | Alchemy: burn $POL, mint rare coins (auto-generated) |
| 8 | **ValidatorStake** | `validator_stake` | User | Stake $POL to become validator |
| 9 | **ValidatorUnstake** | `validator_unstake` | User | Unstake, exit validator set |

#### Signed Transaction Structure

```rust
pub struct SignedTransaction {
    pub tx: Transaction,        // Transaction body (one of 9 variants)
    pub signer: String,         // Signer address
    pub signature: Vec<u8>,     // Ed25519 signature (64 bytes)
    pub hash: [u8; 32],         // Tx hash = SHA256(bincode(tx) || signer)
}
```

Signature verification flow:
1. Deserialize transaction → get `expected_signer()`
2. Rebuild hash `compute_hash_with_signer(tx, signer)`
3. Verify Ed25519 signature with signer's public key
4. Verify nonce is monotonically increasing (anti-replay)

### 4.6 Mining Mechanism (Proof-of-Luck)

#### 4.6.1 Core Principle

Polis "mining" requires **zero computational power**. It is an **XP-weighted random lottery** called Proof-of-Luck.

```
User activity on platform (post/comment/interact/create)
         │
         ▼
  Content Service → XpBridge → User Service awards XP
         │
         ▼
  XP recorded on-chain as AccountState.available_xp
         │
         ▼
  Hourly mining round auto-collects all accounts with available_xp ≥ min_xp
         │
         ▼
  SHA-256 hash chain VRF weighted lottery → 50%/30%/20% split of 40 $POL
         │
         ▼
  Winners receive $POL → All participants' available_xp resets to 0
```

#### 4.6.2 Why "Proof-of-Luck"?

PoW miners invest electricity for block rewards — unlucky miners may never mine a block. Polis improves this model:
- **Investment is not electricity, but social activity (XP)**
- **Competition is not for block creation rights, but for fixed hourly rewards**
- **Mathematical guarantee**: Higher XP = higher win probability (weighted lottery)
- **Deterministic & verifiable**: SHA-256 hash chain seed = anyone can replay and verify results

#### 4.6.3 Lottery Algorithm (Verifiable Random Function)

```rust
// 1. Generate seed
seed = SHA256(prev_block_hash || round_id || end_time || merkle_root)

// 2. Weighted lottery (cumulative distribution)
fn select_weighted_winners(seed, participants, winner_count):
    total_xp = sum(p.xp for p in participants)
    
    for i in 0..winner_count:
        // Hash chain expands randomness
        rng = SHA256(seed || i.to_be_bytes())
        target = first_8_bytes(rng) % total_xp
        
        // Cumulative distribution selection
        cumulative = 0
        for (idx, participant) in enumerate(participants):
            cumulative += participant.xp
            if cumulative > target and idx not in used:
                winners.append(idx)
                break
```

#### 4.6.4 Mining Round Parameters

| Parameter | Value | Code Location |
|-----------|-------|---------------|
| Round Duration | 3600 seconds (1 hour) | `ChainConfig.mining_round_secs` |
| Reward per Round | 40 $POL | `ChainConfig.mining_reward` |
| Winner Percentage | 10% (participants × 10% = winner count) | `ChainConfig.winner_percentage` |
| Min Participants | 1 (zero participants skips round) | — |
| Entry Threshold | 1 XP | `ChainConfig.min_xp_to_participate` |
| Reward Split | 50% / 30% / 20% | Hardcoded in `settle_round()` |
| Random Algorithm | SHA-256 hash chain | `lottery::select_weighted_winners()` |
| XP Consumption | available_xp reset to 0 on participation | `settle_round()` step 5 |
| total_xp | Preserved forever (cumulative record) | Never reset |

#### 4.6.5 Example

Current round has 5 participants:

| Address | available_xp | Weight |
|---------|-------------|--------|
| UserA | 500 XP | 50% |
| UserB | 200 XP | 20% |
| UserC | 150 XP | 15% |
| UserD | 100 XP | 10% |
| UserE | 50 XP | 5% |
| **Total** | **1000 XP** | **100%** |

Winner count = max(1, 5 × 10%) = 1 winner

UserA has 50% probability of winning (500/1000), UserE only 5% (50/1000).

After settlement:
- Winner receives $POL (50% of 40 for 1 winner)
- All 5 participants' `available_xp` = 0
- UserA `total_xp` = 500 (preserved), `available_xp` = 0
- UserE `total_xp` = 50 (preserved), `available_xp` = 0

### 4.7 Grand Pool & Alchemy Mechanism

#### 4.7.1 Flow

```
$POL tokens → Deposit to Grand Pool (PoolDeposit transaction)
                         │
                         ▼
              Pool balance accumulates (current_amount)
                         │
                         ▼
              Reaches 100,000 $POL (target_amount)
                         │
                         ▼
              ⚗️ Trigger Alchemy (PoolAlchemy system transaction)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   100,000 $POL burned  Mint rare coins  Weighted lottery by deposit
   (irreversible)      1 Gold 2 Silver  distributes coins to depositors
                        3 Bronze
```

#### 4.7.2 Rare Coins (Premium Coins)

| Type | Minted Per Round | Badge | Weight (acquisition probability) |
|------|-----------------|-------|----------------------------------|
| **Gold** | 1 | 🥇 | Highest, proportional to deposit share |
| **Silver** | 2 | 🥈 | Medium |
| **Bronze** | 3 | 🥉 | Lower |

- Rare coins are on-chain NFTs (recorded via `MintedPremiumCoin`)
- Transferable (TokenTransfer), displayable on profiles
- Serial numbers globally unique (first gold coin = Gold #1)
- Status symbols, not speculative assets

#### 4.7.3 Pool State

```rust
pub struct PoolState {
    pub pool_id: String,                // Current pool ID (e.g., "pool-1")
    pub current_amount: u64,            // Current accumulated amount
    pub target_amount: u64,             // Target: 100,000 $POL
    pub deposited_count: u32,           // Number of deposit transactions
    pub top_depositors: Vec<DepositorEntry>,  // Leaderboard
    pub created_at: u64,
}
```

Web wallet view: `/wallet/pool`

### 4.8 Web Wallet System

#### 4.8.1 Wallet Pages

| Page | Route | Function |
|------|-------|----------|
| **Create Wallet** | `/wallet/create` | Generate Ed25519 keypair, encrypt with password |
| **Import Wallet** | `/wallet/create?import=true` | Import existing wallet from hex private key |
| **Wallet Overview** | `/wallet` | Balance, XP, rare coins, address, recent transactions |
| **Mining Center** | `/wallet/mining` | Current round, countdown, participants, winner history |
| **Grand Pool** | `/wallet/pool` | Deposit $POL, view progress, deposit leaderboard |
| **Transactions** | `/wallet/transactions` | All transactions list and details |
| **Bind Account** | `/wallet/bind` | Bind on-chain wallet to Polis platform user account |

#### 4.8.2 Wallet Creation & Security

Creation flow:
1. User enters password
2. Browser-side Web Crypto API generates Ed25519 keypair
3. Derives address: `"0xPOL_" + hex(SHA256(pubkey)[..20])`
4. Derives encryption key from password using Argon2id
5. XOR-encrypts private key → stored in localStorage (`polis_wallet_encrypted_key`)
6. Public key and address → stored in localStorage (`polis_wallet_address`, `polis_wallet_public_key`)

> Security note: Web wallet private keys are encrypted and stored browser-side. No private key material ever touches the server. All signing operations happen client-side.

#### 4.8.3 Wallet Binding Flow (Complete Steps)

This bridges "platform account (user_id)" and "on-chain wallet address (0xPOL_...)":

```
Step 1: User → POST /api/users/me/bind-wallet/challenge { address: "0xPOL_abc123..." }
        Server → validates address format → checks not already bound
               → generates nonce: "Bind 0xPOL_abc123... to Polis user <uuid>: <random_hex>"
               → returns nonce (stored in memory HashMap, 5-minute TTL)

Step 2: User → polis-chain wallet sign --data "<nonce>"
        CLI → decrypts local private key → Ed25519 signs nonce → outputs signature_hex

Step 3: User → POST /api/users/me/bind-wallet/verify {
           address, public_key_hex, nonce, signature_hex
        }
        Server → decodes public key → verifies address = "0xPOL_" + hex(SHA256(pubkey)[..20])
               → checks nonce valid & not expired → verifies user_id match
               → Ed25519 verifies signature → on success UPDATE users SET chain_address
```

### 4.9 Multi-Site Architecture

Polis is designed as a multi-site network. Anyone can deploy their own Polis site and register it on Polis Chain.

#### 4.9.1 Site Identity

```rust
pub struct SiteInfo {
    pub site_id: String,            // SHA256(domain) — domain hash as unique ID
    pub domain: String,             // Site domain
    pub site_name: String,          // Site name
    pub admin_address: String,      // Admin wallet address
    pub registered_at: u64,         // Registration block height
    pub reputation_score: u32,      // Reputation score (0-100, starts at 100)
    pub is_active: bool,            // Active status (auto-deactivate below 30)
    pub public_key: Option<Vec<u8>>, // Ed25519 public key (site signs ActivityProof with this)
}
```

#### 4.9.2 Cross-Site XP Isolation

The same user on different sites has naturally isolated XP:

```
user_ref = SHA256(site_id + ":" + username)
```

This means:
- XP earned on Site A is calculated independently from Site B
- But both anchor to the same Polis Chain
- A user's on-chain wallet address is unified across sites

#### 4.9.3 XpBridge Architecture

```
Polis Content Service (crates/polis-content)
    │
    ├── User posts/comments/interacts
    │
    ├── XpBridge.award_xp(user_id, action_type, description)
    │       │
    │       ├──→ POST /api/internal/xp/award (User Service, non-blocking)
    │       │    Awards XP to platform database
    │       │
    │       └──→ POST /api/v1/activities (Polis Chain, non-blocking)
    │            Submits ActivityProof on-chain
    │            message = "POLIS_ACTIVITY:{site_id}:{user_ref}:{xp_value}:{nonce}"
    │            Ed25519 signed (using site private key)
```

### 4.10 P2P Network Layer

Polis Chain uses libp2p for decentralized P2P networking:

| Protocol | Purpose | Port |
|----------|---------|------|
| **TCP + Noise** | Encrypted transport | 9732 |
| **Yamux** | Multiplexing (multiple streams per connection) | — |
| **Gossipsub** | Consensus message broadcast (PrePrepare/Prepare/Commit/RoundChange) | — |
| **Kademlia DHT** | Peer discovery (distributed hash table) | — |
| **mDNS** | LAN peer auto-discovery | — |
| **Identify** | Node identity exchange | — |
| **Ping** | Peer heartbeat | — |
| **Request/Response** | Block sync (request missing blocks) | — |

#### Multi-Node Startup

```bash
# Node 1 — Genesis Validator (bootstraps the chain)
CHAIN_MODE=validator CHAIN_IS_GENESIS=true \
  CHAIN_P2P_PORT=9732 CHAIN_API_PORT=8545 \
  polis-chain run

# Node 2 — Full Node (syncs from genesis)
CHAIN_MODE=full \
  CHAIN_P2P_PORT=9733 CHAIN_API_PORT=8546 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run

# Node 3 — Validator Node
CHAIN_MODE=validator \
  CHAIN_P2P_PORT=9734 CHAIN_API_PORT=8547 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run

# Node 4 — Another Full Node
CHAIN_MODE=full \
  CHAIN_P2P_PORT=9735 CHAIN_API_PORT=8548 \
  CHAIN_BOOTSTRAP_PEERS="/ip4/127.0.0.1/tcp/9732/p2p/<peer_id>" \
  polis-chain run
```

### 4.11 Security Module

#### Reputation System

- Site initial reputation = 100
- Abnormal behavior detection → score deduction
- Below 30 → auto-deactivation
- Can attempt reactivation (requires score ≥ 30)

#### Slashing Engine

Detected violations:
- Validator double-signing (signing two different blocks at same height)
- Site submitting fake ActivityProof
- Validator extended offline

Penalties:
- Deduct staked $POL
- Reduce reputation score
- Severe violations → removal from validator set

---

## 5. AI CLI Tools Complete Reference

### 5.1 polisctl — Platform Management CLI

`polisctl` is the command-line management tool for the Polis community platform, designed for AI Agents and automation scripts.

#### Installation

```bash
# Build from source
cargo build --release -p polisctl
sudo cp target/release/polisctl /usr/local/bin/

# Verify installation
polisctl --version
```

#### Configuration

```bash
# Set JSON output mode (strongly recommended for parsing)
export POLIS_FORMAT=json

# Set server URL
export POLIS_BASE_URL=https://www.mzgw.com

# Session state stored at ~/.polis/
#   ~/.polis/token        — JWT access token
#   ~/.polis/user         — Current logged-in username
#   ~/.polis/admin_token  — Admin JWT token
```

#### Complete Command Reference

##### Auth

```bash
# Register new account
polisctl auth register <username> <email> <password> [display_name]
# Example: polisctl auth register mybot bot@test.com pass123 "My Bot"

# Login
polisctl auth login <email> <password>
# Example: polisctl auth login bot@test.com pass123

# Check current user
polisctl auth whoami
# Output: {"username":"mybot","email":"bot@test.com",...}

# Logout (clears local token)
polisctl auth logout

# Get JWT token (for use with curl)
polisctl auth token
# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Usage: TOKEN=$(polisctl auth token)
#        curl -H "Authorization: Bearer $TOKEN" https://www.mzgw.com/api/users/me
```

##### Profile

```bash
# View user profile
polisctl profile get <username>

# Update profile
polisctl profile update --display-name "New Name" --bio "New bio"
```

##### Space (Community Management)

```bash
# Create community
polisctl space create <namespace> <name> <description> <visibility>
# Example: polisctl space create myname/tech "Tech Sharing" "Tech enthusiast community" public

# View community details
polisctl space info <namespace>

# Search communities
polisctl space search <keyword>
# Example: polisctl space search "Rust"

# Update community settings
polisctl space update <namespace> --name "New Name" --description "New description"

# Get community members
polisctl space members <namespace>

# Get community modules
polisctl space modules <namespace>
```

##### Post (Content Publishing)

```bash
# Create post
polisctl post create <namespace> <title> <content>
# Example: polisctl post create myname/tech "Rust Notes" "## Ownership\n\nRust's ownership system..."

# List posts in community
polisctl post list <namespace> [--limit 20]

# View post details
polisctl post get <post_id>

# Search posts
polisctl post search <keyword> [--limit 20]

# Add comment
polisctl post comment <post_id> <content>
# Example: polisctl post comment abc123 "Great post!"

# Reply to comment
polisctl post reply <comment_id> <content>
```

##### Social

```bash
# Follow user
polisctl follow user <user_id>

# Follow community
polisctl follow space <namespace>

# Like
polisctl like post <post_id>
polisctl like comment <comment_id>

# Vote in poll
polisctl vote <poll_id> <option_index>
# Example: polisctl vote poll123 0  # select first option
```

##### Notifications

```bash
# View unread notifications
polisctl notify unread

# Unread count
polisctl notify count
# Output: {"count": 5}

# Mark as read
polisctl notify read <notification_id>

# Mark all as read
polisctl notify read-all

# Notification list (including read)
polisctl notify list [--limit 50]
```

##### Messages

```bash
# Send direct message
polisctl message send <username> <content>
# Example: polisctl message send alice "Hi, I have a question"

# Message list
polisctl message list [--limit 20]

# Conversation with user
polisctl message conversation <username>
```

##### Data Export

```bash
# Export personal data
polisctl data export --format json
polisctl data export --format markdown

# Export community data (requires admin)
polisctl data export-space <namespace> --format json
```

##### Admin

```bash
# Admin login
polisctl admin login <email> <password>

# User management
polisctl admin users [--page 1] [--limit 50]
polisctl admin user <user_id>

# Ban/unban
polisctl admin ban <user_id> --reason "Violation"
polisctl admin unban <user_id>

# Community management
polisctl admin spaces [--status all|active|banned]
polisctl admin ban-space <space_id> --reason "Violation"
```

### 5.2 polis-chain CLI — Blockchain Node & Wallet

#### Installation

```bash
cargo build --release -p polis-chain
sudo cp target/release/polis-chain /usr/local/bin/
```

#### Node Operations

```bash
# ---- Start Node ----

# Genesis node (first node, creates genesis block)
CHAIN_MODE=validator CHAIN_IS_GENESIS=true polis-chain run

# Full node (syncs blocks + serves HTTP API, no consensus participation)
CHAIN_MODE=full polis-chain run

# Validator node (participates in consensus, must be in validator set)
CHAIN_MODE=validator polis-chain run

# Environment variable configuration
# CHAIN_API_PORT=8545         # HTTP API port (default 8545)
# CHAIN_P2P_PORT=9732         # P2P network port (default 9732)
# CHAIN_BOOTSTRAP_PEERS=...   # Bootstrap peer addresses (comma-separated)
# CHAIN_DATA_DIR=./data       # RocksDB data directory
# RUST_LOG=info               # Log level
```

#### Wallet Operations

```bash
# ---- Create & View ----

# Create new wallet
polis-chain wallet create --password "your-strong-password"
# Output:
#   Wallet created successfully!
#   Address: 0xPOL_a1b2c3d4e5f6...
#   Private key encrypted with Argon2id

# Show wallet info (address, balance, XP, rare coins)
polis-chain wallet show
# Output:
#   Address: 0xPOL_a1b2c3d4e5f6...
#   Balance: 150.00 $POL
#   Total XP: 2340
#   Available XP: 120
#   Rare Coins: Gold #3, Silver #7

# Check balance
polis-chain wallet balance
# Output: 150.00 $POL

# ---- Transfer ----
polis-chain wallet transfer \
  --password "your-password" \
  --to "0xPOL_recipient_address..." \
  --amount 10
# Output: Transaction submitted: tx_hash = abc123...

# ---- Import/Export ----

# Export private key (hex format, 32-byte Ed25519 seed)
polis-chain wallet export --password "your-password"
# Output: <64-char hex string> (guard this carefully!)

# Import private key
polis-chain wallet import --password "your-password" --key "<hex-private-key>"

# ---- Sign (for wallet binding verification) ----
polis-chain wallet sign --data "Bind 0xPOL_xxx to Polis user uuid: random_hex"
# Output: <128-char hex signature>

# ---- Transaction History ----
polis-chain wallet transactions [--limit 50]
```

#### Chain State Queries (via HTTP API)

```bash
# Node status
curl http://localhost:8545/api/v1/status

# Block info
curl http://localhost:8545/api/v1/blocks?from=0&limit=10
curl http://localhost:8545/api/v1/blocks/42

# Transaction queries
curl http://localhost:8545/api/v1/transactions/pending
curl http://localhost:8545/api/v1/transactions/<tx_hash>

# Account state
curl http://localhost:8545/api/v1/wallet/0xPOL_address...

# Mining rounds
curl http://localhost:8545/api/v1/mining/rounds/current
curl http://localhost:8545/api/v1/mining/rounds/5

# Grand pool
curl http://localhost:8545/api/v1/pool/status
curl http://localhost:8545/api/v1/pool/history

# Site info
curl http://localhost:8545/api/v1/sites/<site_id>

# P2P network
curl http://localhost:8545/api/v1/peers
```

---

## 6. Technical Architecture Deep Dive

### 6.1 Complete Service Topology

```
                         Internet
                            │
                    ┌───────┴───────┐
                    │  Nginx :443   │  (HTTPS termination + reverse proxy)
                    │  www.mzgw.com │
                    └───┬───────┬───┘
                        │       │
           ┌────────────┘       └────────────┐
           ▼                                 ▼
   ┌───────────────┐                 ┌──────────────┐
   │ polis-gateway │                 │   Next.js    │
   │    :8080      │                 │    :3000     │
   │  (Axum 0.8)   │                 │ (SSR + API)  │
   │  API Gateway  │                 │  Frontend    │
   └───────┬───────┘                 └──────┬───────┘
           │                                │
     ┌─────┼─────────┬──────────┬──────────┐
     ▼     ▼         ▼          ▼          ▼
   user  space   content    video      admin
   :3001 :3002   :3003      :3005      :3050
     │     │        │          │          │
     │     │        ├──────────┤          │
     │     │        │ XpBridge │          │
     │     │        │ (→ Chain)│          │
     │     │        └──────────┘          │
     └─────┴─────────┴────────────────────┘
              │
              ▼
       ┌──────────────┐
       │ PostgreSQL 16│
       │ (one instance,│
       │  per-service DB)│
       └──────────────┘

              ┌──────────────────┐
              │   Polis Chain    │
              │   (standalone)   │
              │   API :8545      │
              │   P2P :9732      │
              │   RocksDB store  │
              └──────────────────┘
```

### 6.2 Request Routing Details

```
Nginx (:443 HTTPS)
  │
  ├── /api/auth/*          → Gateway → User (:3001)
  │   ├── /api/auth/register        Registration
  │   ├── /api/auth/login           Login
  │   ├── /api/auth/forgot-password Password reset request
  │   └── /api/auth/reset-password  Password reset confirm
  │
  ├── /api/users/*         → Gateway → User (:3001)
  │   ├── /api/users/{username}            View profile
  │   ├── /api/users/search?q=             Search users
  │   ├── /api/users/me                    My info (JWT required)
  │   ├── /api/users/me/bind-wallet/*      Wallet binding (JWT required)
  │   └── /api/users/me/xp                 View XP (JWT required)
  │
  ├── /api/spaces/*        → Gateway → Space (:3002)
  │   ├── /api/spaces/trending             Trending communities
  │   ├── /api/spaces/{namespace}          Community details
  │   ├── /api/spaces/search?q=            Search communities
  │   └── /api/spaces/{namespace}/members  Community members
  │
  ├── /api/posts/*         → Gateway → Content (:3003)
  │   ├── /api/posts/{id}                  View post
  │   ├── /api/posts/{id}/comments         View comments
  │   └── /api/posts (POST)                Create post (JWT required)
  │
  ├── /api/feed            → Gateway → Content (:3003)
  │
  ├── /api/vote            → Gateway → Content (:3003)
  │
  ├── /api/admin/*         → Gateway → Admin (:3050)
  │
  ├── /api/videos/*        → Gateway → Video (:3005)
  │
  ├── /api/internal/*      → Internal cross-service calls (not publicly exposed)
  │   └── /api/internal/xp/award  User Service XP award
  │
  ├── /chain-api/*         → Polis Chain (:8545)
  │   (Next.js rewrites proxy to chain node)
  │
  └── /*                   → Next.js (:3000)
      SSR page rendering
```

### 6.3 Tech Stack Details

| Service | Framework | Database | Key Dependencies |
|---------|-----------|----------|------------------|
| **gateway** | Axum 0.8 | — | tower-http (rate limiting/CORS) |
| **user** | Axum 0.8 + SQLx 0.8 | PostgreSQL | argon2, jsonwebtoken, ed25519-dalek, sha2 |
| **space** | Axum 0.8 + SQLx 0.8 | PostgreSQL | — |
| **content** | Axum 0.8 + SQLx 0.8 | PostgreSQL | reqwest (XpBridge), ed25519-dalek |
| **video** | Axum 0.8 + SQLx 0.8 | PostgreSQL | FFmpeg (system dependency) |
| **admin** | Axum 0.8 + SQLx 0.8 | PostgreSQL | — |
| **chain** | Axum 0.8 + libp2p 0.54 | RocksDB 0.22 | ed25519-dalek, sha2, bincode, rand |
| **web** | Next.js 14 | — | Tailwind CSS, next-intl, recharts, Cherry Markdown |

---

## 7. Data Model Reference

### 7.1 Core Database Tables

```
PostgreSQL
├── users                    # User table
│   ├── id (UUID, PK)
│   ├── username (UNIQUE)
│   ├── email (UNIQUE)
│   ├── password_hash (Argon2id)
│   ├── display_name
│   ├── avatar_url
│   ├── bio
│   ├── verified (BOOLEAN)
│   ├── chain_address (wallet address, nullable)
│   ├── chain_bound_at (binding timestamp)
│   ├── notification_prefs (JSONB)
│   ├── created_at / updated_at
│   └── deleted_at (soft delete)
│
├── spaces                   # Community table
│   ├── id (UUID, PK)
│   ├── namespace (UNIQUE, e.g., "alice/rust-club")
│   ├── owner_id → users.id
│   ├── title, description
│   ├── visibility (public/private/unlisted)
│   ├── has_password
│   ├── member_count, post_count
│   └── created_at
│
├── space_members            # Community members
│   ├── space_id, user_id
│   └── role (founder/admin/moderator/member)
│
├── modules                  # Community modules
│   ├── space_id
│   ├── type (discussion/qa/wiki/video/...)
│   └── config (JSONB)
│
├── creations                # Creation table (core entity)
│   ├── id (UUID, PK)
│   ├── author_id → users.id
│   ├── title, content (Markdown)
│   ├── type (post/wiki/qa/video/poll/series/novel)
│   ├── status (published/draft/archived)
│   └── created_at / updated_at
│
├── module_refs              # Community references (core concept)
│   ├── creation_id → creations.id
│   ├── module_id → modules.id
│   ├── space_id → spaces.id
│   ├── pinned, hidden (community admin operations)
│   └── created_at
│
├── comments                 # Comments
│   ├── id, content
│   ├── creation_id (commented creation)
│   ├── author_id → users.id
│   ├── parent_id → comments.id (nested replies)
│   └── created_at
│
├── likes                    # Likes
│   ├── user_id, target_type, target_id
│   └── UNIQUE(user_id, target_type, target_id)
│
├── follows                  # Follows
│   ├── follower_id, followee_type, followee_id
│   └── UNIQUE constraint
│
├── bookmarks                # Bookmarks
│   ├── user_id, creation_id
│   └── created_at
│
├── notifications            # Notifications
│   ├── user_id, type, data (JSONB), is_read
│   └── created_at
│
├── messages                 # Direct messages
│   ├── sender_id, receiver_id, content
│   └── created_at
│
├── user_xp                  # User XP records
│   ├── user_id, xp_amount
│   ├── action_type, description
│   └── created_at
│
├── badges                   # Badges
│   ├── user_id, badge_type, earned_at
│   └── UNIQUE constraint
│
├── invites                  # Invite codes
│   ├── code, creator_id, used_by, used_at
│   └── created_at
│
├── ban_records              # Ban records
│   ├── user_id, reason, banned_by
│   └── banned_at / unbanned_at
│
└── appeals                  # Appeals
    ├── email, reason, status
    └── created_at
```

### 7.2 On-Chain Data Structures (RocksDB)

```
RocksDB — 11 Column Families
├── CF_BLOCKS               # Block data
│   key: block_number (u64 BE bytes)
│   value: bincode(Block)
│
├── CF_TRANSACTIONS         # Transaction data
│   key: tx_hash ([u8; 32])
│   value: bincode(SignedTransaction)
│
├── CF_ACCOUNT_STATE        # Account state
│   key: address (string bytes)
│   value: bincode(AccountState)
│
├── CF_SITE_REGISTRY        # Site registration
│   key: site_id (SHA256 hex bytes)
│   value: bincode(SiteInfo)
│
├── CF_ACTIVITIES           # Activity records
│   key: user_ref + nonce (composite key)
│   value: bincode(ActivityRecord)
│
├── CF_MINING_ROUNDS        # Mining rounds
│   key: round_id (u64 BE bytes)
│   value: bincode(MiningRound)
│
├── CF_POOL_STATE           # Pool state
│   key: pool_id (string bytes)
│   value: bincode(PoolState)
│
├── CF_POOL_HISTORY         # Alchemy history
│   key: pool_id (string bytes)
│   value: bincode(PoolAlchemyRecord)
│
├── CF_VALIDATORS           # Validator info
│   key: validator_address (string bytes)
│   value: bincode(ValidatorInfo)
│
├── CF_CONFIG               # Chain config
│   key: "chain_config"
│   value: bincode(ChainConfig)
│
└── CF_META                 # Metadata
    key: "latest_block" / "latest_block_hash"
    value: corresponding value
```

---

## 8. Security Model

### 8.1 Authentication & Authorization

```
User auth flow:
  Register → Argon2id hash password → store in PostgreSQL
  Login → verify hash → issue JWT (24h expiry, HS256, contains user_id + username)
  Request → Authorization: Bearer <token> → Auth Middleware → extract user_id
```

- **Passwords**: Argon2id (memory=64MB, iterations=3, parallelism=4)
- **JWT**: HS256, 24-hour expiry
- **Admin**: Independent JWT token (email + admin_password)

### 8.2 On-Chain Security

| Security Layer | Mechanism | Notes |
|----------------|-----------|-------|
| **Signing** | Ed25519 | All user transactions require Ed25519 signature |
| **Anti-Replay** | Monotonically increasing nonce | Each transaction includes nonce, per-account incrementing |
| **Signature Field** | compute_hash_with_signer() | Hash includes signer field, preventing cross-account signature replay |
| **Address Derivation** | SHA256(pubkey) truncation | Address unforgeable, cannot reverse-derive public key from address |
| **PoolDeposit** | POLIS_POOL_DEPOSIT prefix signing | Specific format signature required for pool deposits |
| **ActivityProof** | POLIS_ACTIVITY prefix signing | Site signs with private key, prevents XP forgery |
| **Consensus Security** | ≥ 2/3 BFT quorum | Tolerates ⌊(N-1)/3⌋ Byzantine nodes |
| **Slashing** | Double-sign detection + offline detection | Automatic penalty for malicious validators |

### 8.3 Site Trust Model

```
Site Reputation Score (0-100)
  ├── Initial: 100
  ├── Downgrade events: ActivityProof anomalies, user complaints, verification failures
  ├── Threshold: < 30 → auto-deactivation
  └── Recovery: Reactivation requires score ≥ 30
```

---

## 9. Development Guide

### 9.1 Prerequisites

#### Required

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup component add rustfmt clippy

# macOS cross-compilation (for Linux server deployment)
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu

# Node.js
brew install node@20

# PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Create databases
createdb polis_user
createdb polis_space
createdb polis_content
createdb polis_video
createdb polis_admin
```

#### Optional

```bash
# Redis (caching)
brew install redis

# FFmpeg (video transcoding)
brew install ffmpeg

# NATS (message queue)
brew install nats-server
```

### 9.2 Local Development

```bash
# 1. Clone
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. Configure environment (edit each crate's .env)
# crates/polis-gateway/.env:
#   GATEWAY_PORT=8080
#   USER_SERVICE_URL=http://localhost:3001
#   ...

# crates/polis-user/.env:
#   DATABASE_URL=postgres://localhost/polis_user
#   JWT_SECRET=your-secret-key
#   PORT=3001

# 3. Database migrations (auto-run by SQLx on service startup)
# Or manually:
# cd migrations && psql polis_user < 001_init.sql

# 4. Start backend services (one per terminal)
cargo run -p polis-gateway     # Gateway → :8080
cargo run -p polis-user        # User → :3001
cargo run -p polis-space       # Space → :3002
cargo run -p polis-content     # Content → :3003
cargo run -p polis-video       # Video → :3005
cargo run -p polis-admin       # Admin → :3050

# 5. Start frontend
cd web
npm install
npm run dev                    # → http://localhost:3000

# 6. (Optional) Start blockchain node
CHAIN_MODE=full RUST_LOG=info cargo run -p polis-chain run
# → http://localhost:8545 (API)
```

### 9.3 Running Tests

```bash
# All tests
cargo test --workspace

# By crate
cargo test -p polis-chain           # Blockchain (26 tests)
cargo test -p polis-user            # User service
cargo test -p polis-content         # Content service
cargo test -p polis-space           # Space service

# Specific tests
cargo test -p polis-chain test_settle_round_xp_cleared
cargo test -p polis-chain test_weighted_lottery_higher_xp_wins

# Frontend checks
cd web
npx tsc --noEmit                   # TypeScript type checking
npm run lint                       # ESLint

# Rust code checks
cargo check --workspace            # Compilation check
cargo clippy --workspace           # Clippy lint
```

### 9.4 Code Organization

```
crates/<crate>/
├── src/
│   ├── main.rs           # Entry point + server startup
│   ├── routes/           # API route definitions (axum Router)
│   ├── handlers/         # Request handlers (business logic)
│   ├── repo.rs           # Database repository layer (SQLx queries)
│   ├── models.rs         # Data models (Serialize/Deserialize)
│   └── middleware/       # Middleware (auth/logging/CORS)
├── migrations/           # SQLx migration files
├── Cargo.toml
└── .env                  # Environment configuration
```

---

## 10. Deployment Guide

### 10.1 Deployment Rules (Non-Violable)

> ⚠️ **Must never violate**:
> 1. **Build locally → GitHub Releases → server downloads.** Never compile on the server.
> 2. **No SCP** for file transfer to server (local China → US server, cross-Pacific SCP will drop packets/freeze)
> 3. Server has only 1.6GB RAM — `npm run build` + `cargo build` will OOM and crash

### 10.2 Complete Deployment Pipeline

```bash
#!/bin/bash
set -e

VERSION="v1.7.0"
PROJECT_DIR="/Users/wansichao/Projects/polis-platform"
SERVER="root@47.253.123.3"

echo "=== Step 1: Cross-compile backend (Linux x86_64) ==="
cd "$PROJECT_DIR"
cargo build --release --target x86_64-unknown-linux-gnu -p polis-gateway -p polis-user -p polis-space -p polis-content -p polis-admin -p polis-video

echo "=== Step 2: Build frontend ==="
cd "$PROJECT_DIR/web"
npm run build

echo "=== Step 3: Package (macOS: must disable xattr) ==="
cd "$PROJECT_DIR"
COPYFILE_DISABLE=1 tar -czf /tmp/polis-release-binaries.tar.gz \
  -C target/x86_64-unknown-linux-gnu/release \
  polis-gateway polis-user polis-space polis-content polis-admin polis-video

COPYFILE_DISABLE=1 tar --exclude='.next/cache' --exclude='.next/types' \
  -czf /tmp/polis-release-web.tar.gz -C web .next public

echo "=== Step 4: Create GitHub Release ==="
gh release create "$VERSION" \
  /tmp/polis-release-binaries.tar.gz \
  /tmp/polis-release-web.tar.gz \
  --title "$VERSION" \
  --notes "$(git log --oneline -10 | sed 's/^/- /')"

echo "=== Step 5: Deploy to server ==="
ssh "$SERVER" << 'DEPLOY'
set -e
VERSION="v1.7.0"

# Download
echo "Downloading release..."
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/polis-release-binaries.tar.gz" -o /tmp/binaries.tar.gz
curl -fsSL "https://github.com/xiyijixiyifula/polis-platform/releases/download/$VERSION/polis-release-web.tar.gz" -o /tmp/web.tar.gz

# Backup
echo "Backing up old files..."
BACKUP_DIR="/root/polis/target/release/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video; do
  [ -f "/root/polis/target/release/$svc" ] && cp "/root/polis/target/release/$svc" "$BACKUP_DIR/"
done
echo "Backup: $BACKUP_DIR"

# Stop
echo "Stopping services..."
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
sleep 2

# Deploy backend
echo "Deploying backend..."
tar -xzf /tmp/binaries.tar.gz -C /root/polis/target/release/
chmod +x /root/polis/target/release/polis-*

# Deploy frontend
echo "Deploying frontend..."
rm -rf /opt/polis-web/.next
tar -xzf /tmp/web.tar.gz -C /opt/polis-web/
# ⚠️ Critical: copy static to standalone directory
cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static
# Clean macOS xattr pollution
find /opt/polis-web/.next -name '._*' -delete 2>/dev/null || true

# Start
echo "Starting services..."
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
sleep 3

# Verify
echo "=== Verification ==="
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web; do
  STATUS=$(systemctl is-active "$svc")
  echo "  $svc: $STATUS"
done

echo ""
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://www.mzgw.com/)
echo "  www.mzgw.com: HTTP $HTTP_CODE"

# Cleanup
rm -f /tmp/binaries.tar.gz /tmp/web.tar.gz

echo ""
echo "=== Deployment complete ==="
DEPLOY

echo "=== All steps complete ==="
```

### 10.3 Server Day-to-Day Management

```bash
# Check all service statuses
ssh root@47.253.123.3 "systemctl status polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web --no-pager"

# View logs
ssh root@47.253.123.3 "journalctl -u polis-gateway -n 100 --no-pager"
ssh root@47.253.123.3 "journalctl -u polis-web -n 100 --no-pager"

# Real-time logs
ssh root@47.253.123.3 "journalctl -u polis-gateway -f"
ssh root@47.253.123.3 "journalctl -u polis-web -f"

# Restart single service
ssh root@47.253.123.3 "systemctl restart polis-web"

# Disk usage
ssh root@47.253.123.3 "df -h && du -sh /root/polis/target/release/* /opt/polis-web/.next"

# Memory check
ssh root@47.253.123.3 "free -h && ps aux --sort=-%mem | head -10"

# Health check
curl -sk https://www.mzgw.com/api/health
curl -sk -o /dev/null -w "HTTP %{http_code} | Size: %{size_download} | Time: %{time_total}s\n" https://www.mzgw.com/
```

### 10.4 Rollback

```bash
# If deployment has issues, restore from backup
ssh root@47.253.123.3 << 'ROLLBACK'
BACKUP_DIR=$(ls -dt /root/polis/target/release/backup-* | head -1)
echo "Restoring from $BACKUP_DIR..."
systemctl stop polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
cp "$BACKUP_DIR"/* /root/polis/target/release/
systemctl start polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web
echo "Rollback complete"
ROLLBACK
```

### 10.5 AI Agent Deployment (Claude Code / Cursor / Copilot)

> AI agent 可直接读取 `CLAUDE.md` 中的 [🤖 AI Agent 部署 SOP](CLAUDE.md#-ai-agent-部署-sop) 自动完成部署。

**为什么 AI agent 可以部署这个项目？**

| 原因 | 说明 |
|------|------|
| `CLAUDE.md` 含完整 SOP | 变量表 + 6步脚本 + 检查清单 |
| GitHub Actions CI | 不需要本地编译环境 |
| `deploy.sh` 一键脚本 | 3 个变量即可适配任何服务器 |
| 严禁 SCP / 服务器编译 | 强制安全的 CI 路线 |

**AI agent 部署只需一句话：**

```
"帮我部署到服务器"
```

或更具体的：

```
"修改了前端代码，部署到 47.253.123.3，域名 www.mzgw.com"
```

AI agent 会自动执行：
1. 验证编译 → `cargo check` + `npm run build`
2. 提交推送 → `git commit` + `git push`
3. 打 tag 触发 CI → `git tag v0.3.xxx`
4. 等待 CI 完成
5. 下载 artifacts + 创建 Release
6. SSH 到服务器 → curl 下载 → systemd 重启
7. 验证 8 个服务 + HTTP 冒烟测试

> 💡 **第三方部署**: fork 仓库后只需修改 `CLAUDE.md` 顶部的 `SERVER`/`DOMAIN`/`REPO` 三个变量即可让 AI agent 为你自动部署。

---

## 11. API Complete Reference

### 11.1 Unified Response Format

All API responses use a unified format:

```json
{
  "code": 0,         // 0 = success, non-zero = error
  "message": "ok",   // Error description when non-zero
  "data": { ... }    // Payload
}
```

### 11.2 Public APIs (No Authentication Required)

#### Health Check

```bash
GET /api/health
→ {"code":0,"message":"ok","data":{"service":"polis-gateway","status":"healthy","database":true}}
```

#### Auth

```bash
# Register
POST /api/auth/register
Body: { "username": "alice", "email": "alice@test.com", "password": "password123" }
→ {"code":0,"data":{"token":"eyJ...","user":{...}}}

# Login
POST /api/auth/login
Body: { "email": "alice@test.com", "password": "password123" }
→ {"code":0,"data":{"token":"eyJ...","user":{...}}}

# Forgot password
POST /api/auth/forgot-password
Body: { "email": "alice@test.com" }
→ {"code":0,"data":{"message":"If this email is registered, a reset link has been sent"}}

# Reset password
POST /api/auth/reset-password
Body: { "token": "reset-token-from-email", "new_password": "newpass456" }
→ {"code":0,"data":null}

# Redeem invite
POST /api/auth/redeem-invite
Body: { "code": "INVITE-CODE-HERE" }
→ {"code":0,"data":{...}}
```

#### Users

```bash
# View user profile
GET /api/users/{username}
→ {"code":0,"data":{"id":"...","username":"alice","display_name":"Alice",...}}

# Follower list
GET /api/users/{username}/followers
→ {"code":0,"data":[{...},...]}

# Following list
GET /api/users/{username}/following
→ {"code":0,"data":[{...},...]}

# User spaces
GET /api/users/{username}/spaces
→ {"code":0,"data":[{...},...]}

# Search users
GET /api/users/search?q=alice&limit=20
→ {"code":0,"data":[{...},...]}

# Ban status
GET /api/user/ban-status?email=alice@test.com
→ {"code":0,"data":{"banned":false,"ban_reason":null,"banned_at":null}}

# Submit appeal
POST /api/user/appeal
Body: { "email": "alice@test.com", "reason": "I believe my account was wrongly banned" }
→ {"code":0,"data":{"message":"Appeal submitted, admin will review within 1-3 business days"}}
```

### 11.3 Authenticated APIs (JWT Required)

All requests below require header:
```
Authorization: Bearer <jwt_token>
```

#### Profile

```bash
# Get my info
GET /api/users/me
→ {"code":0,"data":{"id":"...","username":"alice","chain_address":"0xPOL_...",...}}

# Update profile
PUT /api/users/me
Body: { "display_name": "New Name", "bio": "New bio", "avatar_url": "https://..." }
→ {"code":0,"data":{...}}

# Change password
PUT /api/users/me/password
Body: { "old_password": "oldpass", "new_password": "newpass" }
→ {"code":0,"data":null}

# Update settings
PUT /api/users/me/settings
Body: { "notification_prefs": {...} }
→ {"code":0,"data":null}
```

#### Wallet Binding

```bash
# Generate binding nonce
POST /api/users/me/bind-wallet/challenge
Body: { "address": "0xPOL_a1b2c3..." }
→ {"code":0,"data":{"nonce":"Bind 0xPOL_... to Polis user uuid: random_hex","message":"Sign with CLI"}}

# Verify and bind
POST /api/users/me/bind-wallet/verify
Body: {
  "address": "0xPOL_a1b2c3...",
  "public_key_hex": "<64-char hex pubkey>",
  "nonce": "Bind 0xPOL_... to Polis user uuid: random_hex",
  "signature_hex": "<128-char hex signature>"
}
→ {"code":0,"data":{...}}  # Returns updated UserPublic
```

#### XP System

```bash
# View XP
GET /api/users/me/xp
→ {"code":0,"data":{"total_xp":2340,"available_xp":120,"level":3}}

# XP logs
GET /api/users/me/xp/logs
→ {"code":0,"data":[{...},...]}

# Daily login
POST /api/users/me/daily-login
→ {"code":0,"data":{"xp_earned":10,"streak":5}}

# Onboarding status
GET /api/users/me/onboarding
→ {"code":0,"data":[{...},...]}

# Complete quest
POST /api/users/me/onboarding/complete
Body: { "quest_key": "first_post" }
→ {"code":0,"data":true}

# Claim reward
POST /api/users/me/onboarding/claim
Body: { "quest_key": "first_post" }
→ {"code":0,"data":{"xp_reward":50}}
```

#### Badges, Invites, Social, Push

```bash
# Badges
GET /api/users/me/badges

# Invites
GET /api/users/me/invites
POST /api/users/me/invites

# Follow/unfollow
POST /api/follow
Body: { "followee_type": "user", "followee_id": "uuid" }
→ {"code":0,"data":true}

# RESTful follow (v0.3.22+)
POST /api/users/{username}/follow
DELETE /api/users/{username}/follow

# Mutual contacts
GET /api/contacts/mutual

# Push subscription
POST /api/users/me/push-subscribe
Body: { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
POST /api/users/me/push-unsubscribe
Body: { "endpoint": "..." }
```

### 11.4 Chain API (Port 8545)

#### Node Status

```bash
GET /api/v1/status
→ {"code":0,"data":{"node_address":"0xPOL_...","uptime_seconds":3600,"peers_connected":3}}
```

#### Blocks

```bash
# Block list
GET /api/v1/blocks?from=0&limit=10
→ {"code":0,"data":[{"number":0,"parent_hash":"0x0...","transactions":[...]},...]}

# Specific block
GET /api/v1/blocks/{number}
→ {"code":0,"data":{"number":42,"transactions":[...],...}}
```

#### Transactions

```bash
# Submit transaction
POST /api/v1/transactions
Body: { "tx": {...}, "signer": "0xPOL_...", "signature": "hex...", "hash": "hex..." }
→ {"code":0,"data":{"hash":"hex..."}}

# Pending transactions
GET /api/v1/transactions/pending

# Transaction by hash
GET /api/v1/transactions/{hash}
```

#### Activities

```bash
# Submit activity proof
POST /api/v1/activities
Body: {
  "site_id": "site_hash...",
  "user_ref": "user_hash...",
  "action_type": "post_create",
  "target_ref": "target_hash...",
  "xp_value": 10,
  "nonce": 42,
  "signature": "hex...",
  "public_key": "hex..."
}
→ {"code":0,"data":{"nonce":42}}

# Query activities
GET /api/v1/activities/{user_ref}

# XP query
GET /api/v1/activities/{user_ref}/xp
→ {"code":0,"data":{"total_xp":2340}}
```

#### Mining

```bash
# Current round
GET /api/v1/mining/rounds/current
→ {"code":0,"data":{"round_id":42,"start_time":1717000000,...}}

# Historical round
GET /api/v1/mining/rounds/{id}

# Current participants
GET /api/v1/mining/rounds/current/participants
→ {"code":0,"data":{"participants":[{...}],"total_xp_pool":1000}}
```

#### Grand Pool

```bash
# Pool status
GET /api/v1/pool/status
→ {"code":0,"data":{"pool_id":"pool-1","current_amount":50000,"target_amount":100000}}

# Alchemy history
GET /api/v1/pool/history

# Deposit
POST /api/v1/pool/deposit
Body: {
  "from_address": "0xPOL_...",
  "amount": 100,
  "nonce": 5,
  "signature": "hex...",
  "public_key": "hex..."
}
→ {"code":0,"data":{"current_amount":50100}}
```

#### Wallet

```bash
# Create wallet (server-side, dev/test only)
POST /api/v1/wallet/create
Body: { "password": "password" }
→ {"code":0,"data":{"address":"0xPOL_...","public_key":"hex..."}}

# Query wallet
GET /api/v1/wallet/{address}
→ {"code":0,"data":{"address":"0xPOL_...","balance":150,"total_xp":2340,...}}
```

#### Sites

```bash
# Register site
POST /api/v1/sites/register
Body: {
  "domain": "mysite.mzgw.com",
  "admin_address": "0xPOL_...",
  "site_name": "My Site",
  "verification_proof": "DNS TXT record value",
  "public_key": "hex..."
}
→ {"code":0,"data":{"site_id":"...","domain":"mysite.mzgw.com",...}}

# Get site info
GET /api/v1/sites/{site_id}
→ {"code":0,"data":{...}}
```

#### P2P Network

```bash
# Connected peers
GET /api/v1/peers
→ {"code":0,"data":["peer_id_1","peer_id_2",...]}
```

---

## 12. Configuration Reference

### 12.1 Chain Configuration

```rust
// ChainConfig defaults
ChainConfig {
    chain_id: "polis-mainnet-1",       // Chain identifier
    block_time_secs: 10,               // Block interval 10 seconds
    mining_round_secs: 3600,           // Mining round 1 hour
    mining_reward: 40,                 // Reward per round 40 $POL
    winner_percentage: 10,             // Winner percentage 10%
    min_xp_to_participate: 1,          // Minimum XP to participate
    pool_target: 100_000,              // Pool target 100K $POL
    premium_gold_count: 1,             // Gold coins per alchemy
    premium_silver_count: 2,           // Silver coins per alchemy
    premium_bronze_count: 3,           // Bronze coins per alchemy
    min_validator_stake: 1_000,        // Minimum validator stake 1,000 $POL
    max_validators: 21,                // Maximum validators
    validator_epoch_secs: 86400,       // Validator epoch 24 hours
}
```

### 12.2 Environment Variables

```bash
# ---- Polis Chain ----
CHAIN_MODE=validator|full              # Node mode
CHAIN_IS_GENESIS=true                  # Is genesis node
CHAIN_P2P_PORT=9732                    # P2P port
CHAIN_API_PORT=8545                    # API port
CHAIN_BOOTSTRAP_PEERS=<multiaddr>      # Bootstrap peers (comma-separated)
CHAIN_DATA_DIR=./data                  # RocksDB data directory
RUST_LOG=info                          # Log level (trace/debug/info/warn/error)

# ---- polisctl ----
POLIS_FORMAT=json                      # Output format (json/text)
POLIS_BASE_URL=https://www.mzgw.com   # Server URL

# ---- XpBridge (Content Service) ----
POLIS_USER_SERVICE_URL=http://localhost:3001
POLIS_CHAIN_API_URL=http://localhost:8545
POLIS_SITE_ID=<SHA256(domain)>
POLIS_SITE_PRIVATE_KEY=<hex-encoded-32-byte-seed>

# ---- Gateway ----
GATEWAY_PORT=8080
USER_SERVICE_URL=http://localhost:3001
SPACE_SERVICE_URL=http://localhost:3002
CONTENT_SERVICE_URL=http://localhost:3003
VIDEO_SERVICE_URL=http://localhost:3005
ADMIN_SERVICE_URL=http://localhost:3050

# ---- User Service ----
DATABASE_URL=postgres://user:pass@localhost/polis_user
JWT_SECRET=<random-secret>
PORT=3001

# ---- Mail Relay (SMTP) ----
MAIL_FROM=polis@mzgw.com              # Sender address
MAIL_FROM_NAME=Polis                  # Sender display name
BASE_URL=https://www.mzgw.com         # Password reset link base URL
```

### 12.3 Mail Relay Setup (SMTP Relay via Postfix)

Polis uses a **Postfix + SMTP Relay** architecture for sending emails (password reset, notifications, etc.). Instead of direct MTA-to-MTA delivery (which requires port 25), we relay through an external SMTP provider on port 587/465.

**Architecture:**
```
Rust (mail.rs) → sendmail → Postfix → [smtp.gmail.com]:587 → Recipient
```

**Quick Setup (Ubuntu/Debian):**

```bash
# 1. Install Postfix
apt-get install -y postfix

# 2. Configure relay credentials
echo "[smtp.gmail.com]:587 your@gmail.com:YOUR_APP_PASSWORD" > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd

# 3. Configure Postfix main.cf (add these lines)
postconf -e "relayhost = [smtp.gmail.com]:587"
postconf -e "smtp_use_tls = yes"
postconf -e "smtp_sasl_auth_enable = yes"
postconf -e "smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd"
postconf -e "smtp_sasl_security_options = noanonymous"

# 4. Reload Postfix
postfix reload

# 5. Set environment variables
export MAIL_FROM=your@domain.com
export MAIL_FROM_NAME="Your Platform"
export BASE_URL=https://your-domain.com

# 6. Test
echo "Test mail" | sendmail -f your@domain.com test@example.com
```

**Supported Relay Providers:**
| Provider | Host | Port | Free Tier |
|----------|------|------|-----------|
| Gmail | smtp.gmail.com | 587 | 500/day (App Password required) |
| SendGrid | smtp.sendgrid.net | 587 | 100/day |
| Mailgun | smtp.mailgun.org | 587 | Flexible trial |

**Admin Panel Config:** Settings → Email Relay (admin/settings page) allows configuring sender address, relay host, and credentials through the web UI, stored in the `platform_settings` table.

**Why Relay Instead of Direct Delivery?**
- Cloud VPS providers (Alibaba Cloud, AWS, GCP) block port 25 outbound by default to prevent spam
- SMTP relay on port 587 uses TLS encryption (more secure than plain SMTP on port 25)
- Relay providers handle DKIM/SPF/DMARC for better deliverability
- No need to apply for port 25 unblocking

```

## 13. FAQ & Troubleshooting

### 13.1 General

**Q: Does Polis mining require GPU/mining rigs?**
No. Polis uses IBFT consensus (PoA), not PoW. Mining = XP-weighted lottery. Users earn XP through posting, commenting, and interacting, then automatically participate in hourly mining rounds.

**Q: Is there a $POL supply cap?**
No. As long as users remain active, the system continues minting. $POL is a byproduct of activity proofs.

**Q: How do I bind my wallet to my platform account?**
1. Create/import wallet at `/wallet` → 2. Go to `/wallet/bind` → 3. Sign nonce with CLI → 4. Submit for verification.

**Q: Does XP expire?**
After each mining round, available_xp resets to 0 (consumed), but total_xp is preserved forever. Stay active to keep participating.

**Q: Who owns my content?**
Always you. Communities reference your work via ModuleRef but don't own it. Deleting a reference ≠ deleting the creation.

### 13.2 Deployment Troubleshooting

**White screen after deployment**
```bash
# Most common cause: .next/static not copied to standalone directory
ssh root@server "cp -r /opt/polis-web/.next/static /opt/polis-web/.next/standalone/.next/static && systemctl restart polis-web"
```

**Service fails to start**
```bash
# Check logs
ssh root@server "journalctl -u polis-gateway -n 50 --no-pager"

# Common cause: port already in use
ssh root@server "ss -tlnp | grep -E '8080|3001|3002|3003|3005|3050'"

# Check disk space
ssh root@server "df -h"
```

**RocksDB corruption**
```bash
# Stop node → delete data directory → resync
ssh root@server "systemctl stop polis-chain && rm -rf /root/polis-chain/data && systemctl start polis-chain"
```

**Cross-compilation failure**
```bash
# Ensure cross-compilation tools installed
brew install x86_64-unknown-linux-gnu-binutils
rustup target add x86_64-unknown-linux-gnu
# Check linker config: .cargo/config.toml
```

### 13.3 Blockchain Troubleshooting

**Node can't discover peers**
```bash
# Check P2P port reachability
nc -zv <other_node_ip> 9732
# Verify mDNS not blocked by firewall (LAN scenarios)
# Confirm CHAIN_BOOTSTRAP_PEERS multiaddr is correct
```

**Consensus stuck at a phase**
```bash
# Check consensus phase in logs
RUST_LOG=debug polis-chain run 2>&1 | grep "Consensus"
# If stuck at PrePrepared → verify proposer is online
# If stuck at Prepared → check validator network connectivity
```

---

## 14. Documentation Index

| Document | Description |
|----------|-------------|
| [Design Philosophy](docs/DESIGN-PHILOSOPHY.md) | Creation/ModuleRef architecture + competitive analysis |
| [Architecture](docs/ARCHITECTURE.md) | Microservices / permission model / data model / request flow |
| [Polis Chain Docs](crates/polis-chain/README.md) | Full blockchain docs — consensus/P2P/tokenomics/API/security |
| [CLI Guide](docs/CLI-GUIDE.md) | Complete polisctl reference (20+ commands) |
| [📖 Operations Manual](docs/OPERATIONS-MANUAL.md) | **Full-scenario guide: Browser/CLI/Server/Blockchain** |
| [User Guide](docs/USER-GUIDE.md) | Frontend feature usage guide |
| [Dev Setup](docs/DEV-SETUP.md) | Local development environment configuration |
| [Bug Tracking](docs/bugs/INDEX.md) | Pattern library + fix stats + regression map |
| [Known Issues](docs/KNOWN-ISSUES.md) | Current known bugs and technical debt |
| [Fix Recipes](docs/bugs/fix-recipes/INDEX.md) | Standardized fixes for recurring bugs |
| [Changelog](https://www.mzgw.com/changelog) | Online version history |
| [Progress](docs/progress/MASTER.md) | Development task tracking |

---

## Try It Live

**[https://www.mzgw.com](https://www.mzgw.com)** — Free registration, try it now.

---

*Polis is named after the ancient Greek city-state (πόλις), embodying civic self-governance, public participation, and collective decision-making on matters of common concern.*
