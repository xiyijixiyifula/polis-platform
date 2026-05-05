# Polis Test Cases & Scenarios

Detailed test cases organized by functional module. Each test case includes: objective, preconditions, steps, expected results, and pass/fail criteria.

## Table of Contents
1. [Authentication Tests](#auth-tests)
2. [User Management Tests](#user-tests)
3. [Community (Space) Tests](#space-tests)
4. [Post & Content Tests](#post-tests)
5. [Social Interaction Tests](#social-tests)
6. [Poll Tests](#poll-tests)
7. [File Sharing Tests](#file-tests)
8. [Search Tests](#search-tests)
9. [Notification Tests](#notification-tests)
10. [UI/UX Tests](#ui-tests)
11. [Performance Tests](#perf-tests)
12. [Security Tests](#security-tests)

---

## Authentication Tests

### TC-AUTH-01: User Registration with Email
- **Objective**: Verify new user registration flow
- **Preconditions**: User not logged in
- **Steps**:
  1. Navigate to `/register`
  2. Enter username: `testuser_{random}`
  3. Enter valid email: `test_{random}@example.com`
  4. Enter password: `Test1234!`
  5. Click 注册 button
- **Expected**: Redirect to home page, user logged in, JWT token set
- **Verify**: Profile page shows new username

### TC-AUTH-02: Registration Validation — Duplicate Username
- **Objective**: Prevent duplicate username registration
- **Steps**:
  1. Navigate to `/register`
  2. Enter existing username: `testuser`
  3. Fill other fields validly
  4. Submit
- **Expected**: Inline error message: username already exists, form not submitted

### TC-AUTH-03: Registration Validation — Weak Password
- **Objective**: Enforce password strength
- **Steps**:
  1. Navigate to `/register`
  2. Enter password: `123` (less than 8 chars)
  3. Submit
- **Expected**: Validation error, hint shows "至少 8 位"

### TC-AUTH-04: Login with Valid Credentials
- **Objective**: Verify successful login
- **Preconditions**: Registered user exists (test@example.com / Test1234!)
- **Steps**:
  1. Navigate to `/login`
  2. Enter email: `test@example.com`
  3. Enter password: `Test1234!`
  4. Click 登录
- **Expected**: Redirect to home, user avatar appears in header, sidebar shows user nav

### TC-AUTH-05: Login with Invalid Password
- **Objective**: Verify login error handling
- **Steps**:
  1. Navigate to `/login`
  2. Enter email: `test@example.com`
  3. Enter password: `WrongPassword123`
  4. Click 登录
- **Expected**: Error message displayed, form fields retain values, no redirect

### TC-AUTH-06: OAuth Login — GitHub
- **Objective**: Verify GitHub OAuth integration
- **Steps**:
  1. Navigate to `/register` or `/login`
  2. Click GitHub button
  3. Complete GitHub authorization (if prompted)
- **Expected**: Redirect back to Polis, user logged in with GitHub avatar/username

### TC-AUTH-07: Logout
- **Objective**: Verify session termination
- **Preconditions**: User logged in
- **Steps**:
  1. Click user avatar menu in header
  2. Select logout/退出
- **Expected**: Header reverts to unauthenticated state (登录/注册 buttons), JWT cleared

### TC-AUTH-08: Forgot Password Flow
- **Objective**: Verify password reset initiation
- **Steps**:
  1. Navigate to `/forgot-password`
  2. Enter registered email
  3. Submit
- **Expected**: Success message, email sent notification

### TC-AUTH-09: Session Persistence
- **Objective**: Verify JWT session across page reloads
- **Preconditions**: User logged in
- **Steps**:
  1. Login successfully
  2. Refresh page (F5)
  3. Navigate to `/profile/testuser`
- **Expected**: User remains logged in, no re-auth required

---

## User Management Tests

### TC-USER-01: View Public Profile
- **Objective**: Verify public profile display
- **Steps**:
  1. Navigate to `/profile/wangwu` (while logged out)
- **Expected**: Profile renders — avatar, name, @wangwu, join date, follower/following counts, community list

### TC-USER-02: Follow User
- **Objective**: Verify follow functionality
- **Preconditions**: Logged in as testuser
- **Steps**:
  1. Navigate to `/profile/wangwu`
  2. Click 关注 (Follow) button
- **Expected**: Button changes to 已关注 or similar, follower count increments

### TC-USER-03: Unfollow User
- **Objective**: Verify unfollow functionality
- **Preconditions**: Logged in, already following wangwu
- **Steps**:
  1. Navigate to `/profile/wangwu`
  2. Click 已关注 button
- **Expected**: Button reverts to 关注, follower count decrements

### TC-USER-04: Follower List Display
- **Objective**: Verify follower list page
- **Steps**:
  1. Navigate to `/profile/wangwu/followers`
- **Expected**: List of user cards with avatars, names, follow/unfollow buttons

### TC-USER-05: Profile Avatar Display
- **Objective**: Verify avatar generation and display
- **Steps**:
  1. Check multiple profiles: `/profile/testuser`, `/profile/wangwu`, `/profile/zhangsan`
- **Expected**: Each has gradient-background avatar with initial letter, consistent sizing

---

## Community (Space) Tests

### TC-SPACE-01: Create Community
- **Objective**: Verify community creation flow
- **Preconditions**: Logged in
- **Steps**:
  1. Click "+ 创建社区" in header or sidebar
  2. Enter name: `test-community`
  3. Enter description: "Test description"
  4. Select visibility: Public
  5. Submit
- **Expected**: Redirect to new space `/space/testuser/test-community`, success message

### TC-SPACE-02: Space Overview Page
- **Objective**: Verify overview tab rendering
- **Steps**:
  1. Navigate to `/space/wangwu/indie-game`
- **Expected**:
  - Header: icon, "独立游戏", @wangwu/indie-game, 567 members, 235 posts
  - Tabs: 概览 (active), 文章, 投票, 公告, 成员, 设置
  - About card with description
  - Quick action: 发布文章
  - Featured/Pinned content section
  - Latest articles (up to 5)

### TC-SPACE-03: Space Post List
- **Objective**: Verify post listing in space
- **Steps**:
  1. Navigate to `/space/wangwu/indie-game`
  2. Click 文章 tab
- **Expected**: PostCards with author info, titles, previews, vote counts, comment counts

### TC-SPACE-04: Join Community
- **Objective**: Verify join functionality
- **Preconditions**: Logged in, not member of space
- **Steps**:
  1. Navigate to `/space/zhangsan/rust-lab`
  2. Click 加入社区 button
- **Expected**: Button changes state, member count increments, space appears in user's community list

### TC-SPACE-05: Space Module Toggle
- **Objective**: Verify module configuration
- **Preconditions**: Logged in as space owner
- **Steps**:
  1. Navigate to owned space
  2. Click 设置 tab or settings gear
  3. Toggle modules: 文章, 投票, 公告, 成员
- **Expected**: Toggles save to localStorage, tabs appear/disappear accordingly

### TC-SPACE-06: Space Visibility — Private
- **Objective**: Verify private space access control
- **Preconditions**: Private space exists
- **Steps**:
  1. Log out
  2. Navigate to private space URL
- **Expected**: Login prompt or "无权访问" message, content hidden

### TC-SPACE-07: Namespace Display
- **Objective**: Verify GitHub-style namespace
- **Steps**:
  1. Navigate to any user-created space (e.g., `/space/wangwu/indie-game`)
- **Expected**: Header shows `@wangwu / indie-game` format, SpaceCards show `@owner` info

### TC-SPACE-08: Root vs User Community
- **Objective**: Distinguish root and user communities
- **Steps**:
  1. Navigate to `/space/create` (root community)
  2. Navigate to `/space/wangwu/indie-game` (user community)
- **Expected**: Root shows "根社区" badge, user shows `@owner/name` namespace

---

## Post & Content Tests

### TC-POST-01: Create Post with Markdown
- **Objective**: Verify article creation with Cherry Markdown editor
- **Preconditions**: Logged in, member of a space
- **Steps**:
  1. Navigate to `/post/new?space=testuser/community-4y1we1`
  2. Enter title: "Test Article"
  3. In Cherry Editor: type Markdown content with headings, list, code block
  4. Add tags: #test #markdown
  5. Click 发布
- **Expected**: Redirect to new post, content renders correctly with Markdown formatting

### TC-POST-02: Cherry Editor Toolbar
- **Objective**: Verify editor toolbar functionality
- **Steps**:
  1. Navigate to `/post/new`
  2. Click toolbar buttons: bold, italic, heading, list, quote, link, image, code
- **Expected**: Markdown syntax inserted correctly, preview renders properly

### TC-POST-03: Post Detail Rendering
- **Objective**: Verify post content display
- **Steps**:
  1. Navigate to `/post/d1000000-0000-0000-0000-000000000010`
- **Expected**:
  - Full Markdown content rendered as HTML
  - Title prominent
  - Author info with avatar
  - Vote buttons (↑/↓) with current count
  - Comment section below
  - Related posts at bottom

### TC-POST-04: Upvote/Downvote Post
- **Objective**: Verify voting system
- **Preconditions**: Logged in
- **Steps**:
  1. Navigate to any post
  2. Click upvote arrow
  3. Click downvote arrow
  4. Click same arrow again (remove vote)
- **Expected**: Vote counts update, arrow highlights when active, toggle behavior works

### TC-POST-05: Comment on Post
- **Objective**: Verify comment creation
- **Preconditions**: Logged in
- **Steps**:
  1. Navigate to any post
  2. Scroll to comment section
  3. Enter comment text
  4. Submit
- **Expected**: Comment appears in list with avatar, name, timestamp

### TC-POST-06: Nested Reply
- **Objective**: Verify nested comment replies
- **Preconditions**: Logged in, post has existing comments
- **Steps**:
  1. Navigate to post with comments
  2. Click 回复 on a comment
  3. Enter reply text
  4. Submit
- **Expected**: Reply indented under parent comment, threading visible

### TC-POST-07: Bookmark Post
- **Objective**: Verify bookmark/favorite functionality
- **Preconditions**: Logged in
- **Steps**:
  1. Navigate to any post
  2. Click bookmark/收藏 icon
  3. Navigate to user profile/bookmarks
- **Expected**: Post appears in bookmarked list

### TC-POST-08: Share Post
- **Objective**: Verify share functionality
- **Steps**:
  1. Navigate to any post
  2. Click 分享 button
- **Expected**: Copy link to clipboard, or share dialog opens

### TC-POST-09: Draft Auto-Save
- **Objective**: Verify draft persistence
- **Preconditions**: Logged in
- **Steps**:
  1. Navigate to `/post/new`
  2. Enter partial title and content
  3. Wait 30 seconds
  4. Refresh page
- **Expected**: Draft content restored from auto-save

### TC-POST-10: Pin/Unpin Post
- **Objective**: Verify post pinning (owner/moderator)
- **Preconditions**: Logged in as space owner
- **Steps**:
  1. Navigate to space post list
  2. Find pin action on owned post
  3. Click pin
  4. Verify pin badge appears
  5. Click unpin
- **Expected**: Pin badge toggles, pinned posts appear at top

---

## Social Interaction Tests

### TC-SOC-01: Follow User from Post
- **Objective**: Follow author from post detail
- **Steps**:
  1. Navigate to post by user not currently followed
  2. Click author name/avatar
  3. Click 关注 on profile
- **Expected**: Follow relationship established

### TC-SOC-02: Like Comment
- **Objective**: Verify comment like
- **Steps**:
  1. Navigate to post with comments
  2. Click like/heart on a comment
- **Expected**: Like count increments, heart icon fills

### TC-SOC-03: User Mention in Comment
- **Objective**: Verify @mention functionality (if supported)
- **Steps**:
  1. Navigate to post
  2. In comment, type `@testuser`
  3. Submit
- **Expected**: Mention rendered as link to user profile, notification sent to mentioned user

---

## Poll Tests

### TC-POLL-01: Create Poll
- **Objective**: Verify poll creation
- **Preconditions**: Logged in, space member
- **Steps**:
  1. Navigate to `/polls/new?space=testuser/community-4y1we1`
  2. Enter question: "Test Poll Question"
  3. Add options: "Option A", "Option B", "Option C"
  4. Select type: Single choice
  5. Submit
- **Expected**: Redirect to poll detail or space polls tab

### TC-POLL-02: Vote in Poll
- **Objective**: Verify voting in poll
- **Steps**:
  1. Navigate to any poll
  2. Select an option
  3. Submit vote
- **Expected**: Vote recorded, results display with percentage bars

### TC-POLL-03: View Poll Results
- **Objective**: Verify result visualization
- **Steps**:
  1. Navigate to poll with votes
- **Expected**: Results shown with percentage bars, total vote count, each option's count

### TC-POLL-04: Space Poll List
- **Objective**: Verify polls tab in space
- **Steps**:
  1. Navigate to `/space/wangwu/indie-game`
  2. Click 投票 tab
- **Expected**: Poll cards displayed with questions and vote counts

---

## File Sharing Tests

### TC-FILE-01: Upload File
- **Objective**: Verify file upload
- **Preconditions**: Logged in, space member
- **Steps**:
  1. Navigate to space files section
  2. Click upload
  3. Select file
  4. Submit
- **Expected**: File appears in file list with name, size, upload date

### TC-FILE-02: Create Share Link
- **Objective**: Verify shareable link creation
- **Steps**:
  1. Navigate to file in space
  2. Click share
  3. Set password (optional)
  4. Set expiration
  5. Generate link
- **Expected**: Share code/link displayed, copyable

### TC-FILE-03: Download with Password
- **Objective**: Verify password-protected download
- **Steps**:
  1. Navigate to share link URL
  2. Enter password (if set)
  3. Download
- **Expected**: File downloads correctly, wrong password shows error

---

## Search Tests

### TC-SEARCH-01: Search Communities
- **Objective**: Verify community search
- **Steps**:
  1. Navigate to `/search`
  2. Enter: "Rust"
  3. Submit
- **Expected**: Results include "Rust 实验室" community card

### TC-SEARCH-02: Search Posts
- **Objective**: Verify post content search
- **Steps**:
  1. Enter search term matching post title/content
  2. Submit
- **Expected**: Relevant posts appear in results

### TC-SEARCH-03: Search Users
- **Objective**: Verify user search
- **Status**: ✅ Covered in E2E (v0.2.99)
- **Steps**:
  1. Enter username: "wangwu"
  2. Submit
- **Expected**: User "王五" appears in results

### TC-SEARCH-04: Empty Search Results
- **Objective**: Verify empty state
- **Steps**:
  1. Enter nonsense query: "xyz123nonsense"
  2. Submit
- **Expected**: Empty state message, no errors

### TC-SEARCH-05: Header Search Input
- **Objective**: Verify global search from header
- **Steps**:
  1. Click header search input
  2. Type query
  3. Submit
- **Expected**: Redirect to `/search?q={query}` with results

---

## Notification Tests

### TC-NOTIF-01: Notification Badge
- **Objective**: Verify unread notification indicator
- **Preconditions**: Logged in, user has notifications
- **Steps**:
  1. Trigger notification (e.g., have another user follow/comment)
  2. Check header bell icon
- **Expected**: Badge/dot appears with unread count

### TC-NOTIF-02: View Notifications
- **Objective**: Verify notification list
- **Steps**:
  1. Click bell icon
  2. Navigate to `/notifications`
- **Expected**: List of notifications with icons, messages, timestamps

### TC-NOTIF-03: Mark as Read
- **Objective**: Verify read state management
- **Steps**:
  1. Navigate to `/notifications`
  2. Click individual notification
  3. Or click "标记全部已读"
- **Expected**: Unread indicator disappears, notification marked as read

### TC-NOTIF-04: Empty Notifications
- **Objective**: Verify empty state
- **Steps**:
  1. Navigate to `/notifications` for user with no notifications
- **Expected**: Bell icon centered in card, "暂无通知" text

---

## UI/UX Tests

### TC-UI-01: Dark Mode Toggle
- **Objective**: Verify theme switching
- **Steps**:
  1. Click theme toggle (Moon icon) in header
  2. Observe page background, card backgrounds, text colors
  3. Click again (Sun icon)
- **Expected**:
  - Light: `bg-white`, `text-gray-900`, `border-gray-200`
  - Dark: `dark:bg-gray-900`, `dark:text-white`, `dark:border-gray-700`
  - Preference persists after reload

### TC-UI-02: Responsive Layout — Mobile
- **Objective**: Verify mobile viewport rendering
- **Steps**:
  1. Set viewport to 375x667 (iPhone SE)
  2. Load `/`
  3. Navigate to `/explore`, `/space/wangwu/indie-game`, `/post/{id}`
- **Expected**: Single column layouts, readable text (no overflow), hamburger menu or bottom nav, cards stack vertically

### TC-UI-03: Responsive Layout — Tablet
- **Steps**:
  1. Set viewport to 768x1024 (iPad)
- **Expected**: 2-column grids, sidebar may collapse, navigation accessible

### TC-UI-04: Header Scroll Behavior
- **Objective**: Verify sticky header
- **Steps**:
  1. Navigate to long page (e.g., `/changelog`)
  2. Scroll down
- **Expected**: Header remains sticky at top, `backdrop-blur` effect, z-index above content

### TC-UI-05: Card Hover Effects
- **Objective**: Verify interactive card states
- **Steps**:
  1. Hover over SpaceCard
  2. Hover over PostCard
  3. Hover over buttons
- **Expected**: Shadow elevation increase, border color change, cursor pointer, transition smooth (150ms)

### TC-UI-06: Loading States
- **Objective**: Verify skeleton/loading UI
- **Steps**:
  1. Navigate to any page with async data
  2. Observe before data loads
- **Expected**: Skeleton placeholders with `animate-pulse`, gray bars, no layout shift after data loads

### TC-UI-07: Empty States
- **Objective**: Verify empty state design
- **Steps**:
  1. Navigate to empty notifications
  2. Navigate to space with no posts
  3. Navigate to search with no results
- **Expected**: Centered icon + descriptive text, consistent card container, actionable CTA where applicable

### TC-UI-08: Form Validation States
- **Objective**: Verify input error styling
- **Steps**:
  1. Navigate to `/register`
  2. Submit empty form
- **Expected**: Red border on invalid fields, error text below inputs, focus ring on primary error field

### TC-UI-09: Tab Navigation Active State
- **Objective**: Verify tab indicators
- **Steps**:
  1. Navigate to `/space/wangwu/indie-game`
  2. Click each tab: 概览, 文章, 投票, etc.
- **Expected**: Active tab has `border-b-2 border-primary-600 text-primary-600`, inactive has `border-transparent text-gray-500`

### TC-UI-10: Badge Colors
- **Objective**: Verify semantic badge colors
- **Steps**:
  1. Find root community badge ("根社区") — purple
  2. Find "当前版本" badge — green
  3. Find verified badge — blue
- **Expected**: Correct color tokens applied per badge type

---

## Performance Tests

### TC-PERF-01: Homepage Load Time
- **Steps**:
  1. Clear cache
  2. Navigate to `/`
  3. Measure from navigation start to FCP
- **Expected**: < 1.5s First Contentful Paint

### TC-PERF-02: API Response Time
- **Steps**:
  1. Run: `curl -w "%{time_total}" https://www.mzgw.com/api/health`
  2. Run: `curl -w "%{time_total}" https://www.mzgw.com/api/spaces`
- **Expected**: < 200ms for health, < 500ms for space list

### TC-PERF-03: Bundle Size Check
- **Steps**:
  1. Open DevTools Network tab
  2. Navigate to `/post/new`
  3. Check JS bundle size
- **Expected**: First Load JS < 110kB (target: ~103kB after v0.2.11 optimization)

### TC-PERF-04: Image Optimization
- **Steps**:
  1. Check community avatars and user avatars load
  2. Verify WebP/optimized format if applicable
- **Expected**: Avatars load < 500ms, no 404s

### TC-PERF-05: Lighthouse Score
- **Steps**:
  1. Run Lighthouse on `/`, `/explore`, `/space/wangwu/indie-game`
- **Expected**:
  - Performance: > 80
  - Accessibility: > 90
  - Best Practices: > 90
  - SEO: > 85

---

## Security Tests

### TC-SEC-01: XSS Prevention in Markdown
- **Objective**: Verify XSS sanitization
- **Steps**:
  1. Create post with: `<script>alert('xss')</script>`
  2. View post detail
- **Expected**: Script not executed, content rendered as text or sanitized

### TC-SEC-02: Auth Protected Routes
- **Objective**: Verify route guards
- **Steps**:
  1. Log out
  2. Navigate to `/post/new`
  3. Navigate to `/notifications`
- **Expected**: Redirect to `/login` with return URL

### TC-SEC-03: HTTPS Enforcement
- **Steps**:
  1. Navigate to `http://www.mzgw.com`
- **Expected**: Redirect to `https://www.mzgw.com`

### TC-SEC-04: CORS Headers
- **Steps**:
  1. Run: `curl -I https://www.mzgw.com/api/health`
- **Expected**: Appropriate CORS headers for API endpoints

### TC-SEC-05: Rate Limiting
- **Objective**: Verify API rate limiting
- **Steps**:
  1. Rapidly call login endpoint with wrong credentials (e.g., 10 times in 10 seconds)
- **Expected**: 429 Too Many Requests after threshold
