# Polis Site Map & Route Inventory

Complete inventory of all known pages and routes in the Polis platform for systematic testing coverage.

## Table of Contents
1. [Public Pages (No Auth Required)](#public-pages)
2. [Authentication Pages](#auth-pages)
3. [Authenticated User Pages](#user-pages)
4. [Community (Space) Pages](#space-pages)
5. [Content Pages](#content-pages)
6. [Interactive Feature Pages](#interactive-pages)
7. [Admin & System Pages](#admin-pages)
8. [API Endpoints](#api-endpoints)

---

## Public Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/` | Home / Landing | Hero section, CTA buttons, feature cards (一键创建/模块化/数据主权), footer | No |
| `/about` | About Polis | Mission statement, feature grid (用户主权/模块化/数据自有/高性能), tech stack badges | No |
| `/changelog` | Changelog | Version timeline (v0.2.12 to v0.2.0+), feature bullets with icons, dates | No |
| `/research` | AI Research | Product roadmap (v0.3.0-v0.6.0), GitHub trending list, auto-generated report | No |

### Home Page (`/`)
- **Hero**: "让创建社区像创建 GitHub 仓库一样简单"
- **CTA**: "免费创建你的社区" (primary button), "探索社区" (secondary button)
- **Features**: 3 cards — 一键创建 / 模块化 / 数据主权
- **Footer**: "Polis (πόλις) — 人人都是城主 · Built with Rust + Next.js"

### About Page (`/about`)
- **Mission**: "让创建社区像创建 GitHub 仓库一样简单"
- **Features**: 2x2 grid — 用户主权, 模块化, 数据自有, 高性能
- **Tech Stack**: Rust, Axum, Tokio, PostgreSQL, Next.js, React, Wasmtime, Meilisearch

### Changelog Page (`/changelog`)
- **Format**: Timeline with version nodes (blue dots)
- **Current Version Badge**: "当前版本" green badge
- **Latest**: v0.2.12 — 文件分享系统 (2026-04-30)

### Research Page (`/research`)
- **Roadmap**: 4 phases (v0.3.0 to v0.6.0) with feature lists and checkmarks
- **Report**: Auto-generated Polis insight report with timestamp

---

## Auth Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/login` | Login | Email input, password input, login button, forgot password link, register link, test account hint | No |
| `/register` | Register | Username input, email input, password input, register button, GitHub/Google OAuth, login link | No |
| `/forgot-password` | Forgot Password | Email input, submit button | No |

### Login Page (`/login`)
- **Fields**: 邮箱 (email), 密码 (password)
- **Actions**: 登录 (submit), 忘记密码? (link), 注册 (link)
- **Test Account Display**: "测试账号: test@example.com / Test1234! (用户名: testuser)"

### Register Page (`/register`)
- **Fields**: 用户名 (username, hint: "支持中英文、数字、特殊符号"), 邮箱 (email), 密码 (password, hint: "至少8位")
- **Actions**: 注册 (submit)
- **OAuth**: GitHub, Google
- **Note**: "这是你的唯一标识，注册后不可修改"

---

## User Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/profile/{username}` | User Profile | Avatar, display name, username, join date, follower/following counts, community list | No (public) |
| `/profile/{username}/followers` | Followers List | User cards with follow/unfollow buttons | Yes for actions |
| `/profile/{username}/following` | Following List | User cards with follow/unfollow buttons | Yes for actions |
| `/settings` | User Settings | Profile edit, password change, notification preferences | Yes |

### Profile Page (`/profile/{username}`)
- **Header**: Avatar (gradient bg with initial), Display name, @username, join date
- **Stats**: 粉丝 (followers), 关注 (following) — clickable buttons
- **Communities**: Grid of SpaceCards owned by user
- **Empty State**: "还没有加入任何社区" / "还没有创建任何社区"

---

## Space Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/explore` | Explore Communities | Sidebar nav, community grid (2-col sm, 3-col lg), SpaceCards with member/post counts | No |
| `/trending` | Trending | Ranked community list with rank badges (#1 amber, #2 gray, #3 amber-700) | No |
| `/hot` | Hot | Popular communities by recent activity | No |
| `/space/{ns}` | Space Overview | Community header, tabs (概览/文章/投票/公告/成员/设置), about card, featured posts, quick actions | No |
| `/space/{ns}/posts` | Space Posts | Post list with filters, sort options | No |
| `/space/{ns}/polls` | Space Polls | Poll cards with vote counts | No |
| `/space/{ns}/members` | Space Members | Member list with roles | No |
| `/space/{ns}/settings` | Space Settings | Module toggles, visibility settings | Yes (owner) |
| `/create` | Create Community | Form: name, description, visibility (public/private/unlisted), namespace | Yes |

### Space Overview Page (`/space/{ns}`)
- **Header**: Community icon (large rounded-xl with initial), Name, @owner/name namespace, description, stats row
- **Actions**: 加入社区 (Join), Share button
- **Tabs**: 概览 (Overview), 文章 (Posts), 投票 (Polls), 公告 (Announcements), 成员 (Members), 设置 (Settings — owner only)
- **Overview Tab**:
  - About card (description + stats)
  - Quick action: 发布文章
  - 精选内容 (Pinned/Featured posts)
  - 最新文章 (Latest 5 posts + "查看全部")
- **Sidebar**: 关于社区 (metadata), 同名社区集群 (if applicable)

### Space Post List (`/space/{ns}/posts` or tab)
- **PostCard Elements**: Author avatar, author name, timestamp, community tag, title, content preview (Markdown rendered), tags, vote buttons (↑/↓), comment count, view count, share button
- **Pinned Posts**: 📌 Pin badge at top
- **Empty State**: "还没有文章" + "发布第一篇文章" link

---

## Content Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/post/{id}` | Post Detail | Full post content (Cherry Markdown rendered), author info, vote buttons, comment section, related posts | No |
| `/post/{id}?space={ns}` | Post Detail (with space context) | Same as above with breadcrumb to space | No |
| `/post/new` | Create Post | Cherry Markdown editor, title input, tag input, space selector, publish button | Yes |
| `/post/new?space={ns}` | Create Post (pre-selected space) | Same with pre-filled space | Yes |
| `/post/{id}/edit` | Edit Post | Same fields as create, pre-populated | Yes (author) |
| `/polls/new` | Create Poll | Question input, option inputs, type selector (single/multi), space selector | Yes |
| `/poll/{id}` | Poll Detail | Question, options with vote bars, vote button, results view | No |

### Post Detail Page (`/post/{id}`)
- **Content**: Cherry Markdown rendered HTML with syntax highlighting
- **Interactions**: Upvote/Downvote, Bookmark, Share (copy link)
- **Comments Section**: Nested reply structure, avatar + name + timestamp + content, reply button
- **Related Posts**: "相关推荐" at bottom

### Create Post Page (`/post/new`)
- **Cherry Editor**: Toolbar (bold/italic/heading/list/quote/link/image/code), Markdown input, preview toggle
- **Fields**: Title, Tags (hashtag style), Community selection
- **Actions**: 发布 (publish), auto-save draft indicator

---

## Interactive Feature Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/search` | Search | Search input, results tabs (communities/posts/users), empty state | No |
| `/search?q={query}` | Search Results | Filtered results by query | No |
| `/notifications` | Notifications | Notification list with read/unread states, mark all read, empty state (bell icon) | Yes |

### Search Page (`/search`)
- **Input**: Full-width search bar with magnifying glass icon
- **Placeholder**: "输入关键词搜索社区"
- **Results**: Community cards matching query
- **Empty State**: "🔍 输入关键词搜索社区"

### Notifications Page (`/notifications`)
- **Header**: "通知" title
- **List**: Notification cards with icon, message, timestamp, read/unread indicator
- **Empty State**: Bell icon + "暂无通知"

---

## Admin Pages

| Route | Page Name | Key Elements | Auth Required |
|-------|-----------|--------------|---------------|
| `/admin` | Admin Dashboard | Stats cards, user/community/content management tables | Yes (admin role) |
| `/admin/users` | User Management | User table with search, filter, ban/unban actions | Yes (admin) |
| `/admin/spaces` | Space Management | Community table with visibility/status edit | Yes (admin) |
| `/admin/content` | Content Management | Post/poll list with moderation actions | Yes (admin) |

---

## API Endpoints (for backend testing)

### Gateway Routes (`:8080`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/{id}` | User profile |
| POST | `/api/users/{id}/follow` | Follow user |
| GET | `/api/spaces` | List spaces |
| POST | `/api/spaces` | Create space |
| GET | `/api/spaces/{ns}` | Space detail |
| GET | `/api/spaces/{ns}/posts` | Space posts |
| POST | `/api/spaces/{ns}/posts` | Create post |
| GET | `/api/spaces/{ns}/polls` | Space polls |
| POST | `/api/spaces/{ns}/polls` | Create poll |
| GET | `/api/spaces/{ns}/featured` | Featured posts |
| GET | `/api/spaces/{ns}/files` | File list |
| POST | `/api/spaces/{ns}/files` | Upload file |
| POST | `/api/files/share` | Create share link |
| GET | `/api/share/{code}` | Share info |
| GET | `/api/share/{code}/download` | Download file |
| GET | `/api/search` | Search |
| GET | `/api/notifications` | Notifications |
| POST | `/api/notifications/read` | Mark read |

### Microservice Ports
| Service | Port |
|---------|------|
| Gateway | 8080 |
| User Service | 3001 |
| Space Service | 3002 |
| Content Service | 3003 |
| Admin Service | 3050 |
| Web (Next.js) | 3000 |

---

## Navigation Structure

### Top Navigation (Desktop)
- **Left**: Logo (P icon + "Polis"), 发现, 关于, 更新, AI研究
- **Center**: Search input (rounded-full, "搜索社区、帖子、用户...")
- **Right**: Theme toggle (Sun/Moon), 登录, 注册 (outline) / + 创建社区, Bell, Avatar (when logged in)

### Sidebar Navigation (Logged-in Homepage)
- 首页, 热门, 发现, 热榜
- Divider
- 文章, 游戏, 商城
- + 创建社区 (primary button)

### Mobile Navigation
- Bottom bar or hamburger menu
- Simplified links

---

## Component Inventory

### Reusable Components (verify across all pages)

| Component | Locations | Test Points |
|-----------|-----------|-------------|
| **Header** | All pages | Sticky behavior, backdrop-blur, nav links, auth state changes |
| **SpaceCard** | /explore, /profile, sidebar | Avatar, name, @owner/name, description, member/post counts |
| **PostCard** | /space/{ns}, /explore | Pin badge, author, title, preview, tags, vote counts, comments |
| **PollCard** | /space/{ns}/polls | Question, options, vote button, result bars |
| **Avatar** | Everywhere | Gradient bg, initial letter, rounded-full, sizing variants |
| **Badge** | Various | Root community (purple), Current version (green), Verified (blue) |
| **TabNav** | /space/{ns} | Active underline, hover states, border-b container |
| **EmptyState** | Many pages | Icon + text centered in card, correct messaging |
| **LoadingSkeleton** | Async pages | Pulse animation, gray placeholder shapes |
| **AnnouncementBanner** | /space/{ns} | Urgent (red), Important (amber), Normal (gray) variants |
