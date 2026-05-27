# 修复点位地图

> **用途**: 代码位置 → 修复历史的反向索引。修改任何文件前，查此表了解该文件过去修过什么 Bug，避免回归。

## 统计面板

| 指标 | 数值 |
|------|------|
| 涉及文件数 | 26 |
| 总修复点位 | 58 |
| 高危文件 (修复 3+ 次) | 8 |
| 最近更新 | 2026-05-27 |

## 高危文件 ⚠️

修改这些文件时，务必先查本表和相关 Pattern：

| 文件 | 修复次数 | 涉及 Pattern | 最近修复 |
|------|----------|-------------|----------|
| `crates/polis-content/src/handlers/content_handler.rs` | 4 | SQL注入, post_count, XSS, Argon2 | v1.0.13 |
| `crates/polis-space/src/routes/space_routes.rs` | 4 | URL编码, DELETE路由, 中文slug | v1.0.14 |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | 4 | URL编码, 模块导航, 成员列表, 删除按钮 | v1.0.17 |
| `web/src/components/SpaceSettings.tsx` | 2 | localStorage key, members keyMap | v1.0.14 |
| `web/src/lib/api.ts` | 4 | URL编码, 类型修复, uploadFile, archive | v1.0.17 |
| `crates/polis-content/src/routes/content_routes.rs` | 3 | URL编码, 发帖权限, 上传权限 | v1.0.15 |
| `web/src/app/create/page.tsx` | 2 | title slug, deriveSlug | v1.0.17 |
| `crates/polis-core/src/types.rs` | 1 | Visibility::Hidden 枚举缺失 | v1.0.18 |

## 完整点位索引

### 后端 — polis-space

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `routes/space_routes.rs` | `handle_public_path` | 中文 namespace 解码 (percent_decode_str) | v0.2.54 | url-double-encoding |
| `routes/space_routes.rs` | `decode_namespace` | 统一 URL 解码函数 | v0.2.54 | url-double-encoding |
| `routes/space_routes.rs` | `delete_space` | 新增 DELETE 路由 → archive 软删除 | v1.0.14 | — |
| `routes/space_routes.rs` | `handle_auth_path` | 修复 members/join/leave 路由提取 | v0.3.63 | — |
| `handlers/space_handler.rs` | `create_space` | title 非空验证 + 50 字符限制 | v1.0.14 | — |
| `handlers/space_handler.rs` | `archive_space` | 软删除 (status='archived')，仅 owner | v1.0.14 | — |
| `repo.rs` | `archive` | SQL: update status='archived' where owner match | v1.0.14 | — |
| `repo.rs` | `update` | icon_url/banner_url: CASE WHEN 空值清除替代 COALESCE | v1.0.15 | — |
| `repo.rs` | `follow_space` | INSERT INTO follows + update_follower_count | v1.0.15 | — |
| `repo.rs` | `unfollow_space` | DELETE FROM follows + update_follower_count | v1.0.15 | — |
| `repo.rs` | `is_following_space` | SELECT 1 FROM follows 存在性检查 | v1.0.15 | — |
| `repo.rs` | `get_join_request_status` | SELECT status FROM space_join_requests | v1.0.15 | — |
| `routes/space_routes.rs` | `handle_public_path` | 新增 /my-join-status 端点（JWT 提取，免感认证） | v1.0.15 | — |
| `routes/space_routes.rs` | `handle_auth_path` | 新增 /follow, /unfollow 路由 | v1.0.15 | — |
| `handlers/space_handler.rs` | `follow_space` | 关注社区 + owner 通知 | v1.0.15 | — |
| `handlers/space_handler.rs` | `unfollow_space` | 取消关注 | v1.0.15 | — |

### 后端 — polis-content

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `handlers/content_handler.rs` | `create_post` | post_count +1 (已有，参考实现) | v0.2.x | post-count-sync |
| `handlers/content_handler.rs` | `create_post` | Argon2 密码哈希替代明文 | v1.0.13 | — |
| `handlers/content_handler.rs` | (多处) | zip-slip 路径穿越修复 | v1.0.13 | — |
| `handlers/creation.rs` | `submit_to_community` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `handlers/thread_handler.rs` | `publish` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `repo.rs` | `find_posts_by_space` | SQL format!() → 12 臂 match 参数化 | v1.0.13 | — |
| `routes/content_routes.rs` | `handle_auth_content` (POST posts) | block_private_space_public_listing 发帖门控 | v1.0.15 | — |
| `routes/content_routes.rs` | `handle_auth_content` (POST files) | block_private_space_public_listing 上传门控 | v1.0.15 | — |
| `handlers/content_handler.rs` | `get_post_public` | auto-restore: hidden_until 到期自动恢复 visibility='public' | v1.0.18 | — |
| `handlers/content_handler.rs` | `get_post_public` | visibility 字段使用 effective_visibility (非 post.visibility) | v1.0.18 | — |
| `repo.rs` | `ContentRepo` | pool 字段 pub 化 (auto-restore SQL 直接访问) | v1.0.18 | — |

### 后端 — polis-admin

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `admin_handler.rs` | `ban_user` | 升级封禁: banned=TRUE + 隐藏所有 creations + 隐藏所有 posts | v1.0.18 | — |
| `admin_handler.rs` | `unban_user` | 清除 banned/banned_at/ban_reason | v1.0.18 | — |
| `admin_handler.rs` | `hide_post` | 新增 duration_hours 参数 → hidden_until = NOW() + interval | v1.0.18 | — |
| `admin_handler.rs` | `hide_user_works` | 批量隐藏用户所有作品 (creations + posts)，支持 duration | v1.0.18 | — |
| `admin_handler.rs` | `hide_user_spaces` | 批量设置用户所有社区 visibility='private' | v1.0.18 | — |
| `routes.rs` | hide_post/hide-works/hide-spaces | 新增 HideRequest(duration_hours)，三条路由 | v1.0.18 | — |

### 后端 — polis-user

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `handlers/user_handler.rs` | `login` | banned 状态检查 (密码验证前)，返回 403 + 封禁原因 | v1.0.18 | — |

### 后端 — polis-core

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `auth.rs` | `secure_validation` | JWT exp 显式校验，统一全服务 | v1.0.13 | — |
| `types.rs` | `Visibility` enum | 新增 Hidden 变体 (serde rename="hidden") + Display impl | v1.0.18 | — |
| `models.rs` | `User` struct | 新增 banned/banned_at/ban_reason 字段 | v1.0.18 | — |
| `models.rs` | `Post` struct | 新增 hidden_until 字段 (TIMESTAMPTZ → DateTime<Utc>) | v1.0.18 | — |

### 前端 — web

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `SpaceSettings.tsx` | `persistModules` | 补充 members keyMap 映射 | v1.0.14 | — |
| `SpaceSettings.tsx` | `loadModules` | localStorage key 双格式回退 (编码/解码) | v0.2.58 | url-double-encoding |
| `SpacePageClient.tsx` | params 处理 | decodeURIComponent → encodeURIComponent 防双重编码 | v1.0.11 | url-double-encoding |
| `SpacePageClient.tsx` | 模块导航 | qa 模块 Tab 显示 | 已验证正常 | — |
| `CherryRender.tsx` | 渲染 | external link rel="noopener noreferrer" | v1.0.13 | — |
| `MarkdownEditor.tsx` | URL 验证 | javascript: 协议白名单过滤 | v1.0.13 | — |
| `MilkdownEditor.tsx` | XSS 过滤 | javascript: href/src 属性移除 | v1.0.13 | — |
| `Header.tsx` | 登出 | 清除 token + localStorage | v1.0.13 | — |
| `next.config.js` | 安全头 | Permissions-Policy + CORP 头 | v1.0.13 | — |
| `SpacePageClient.tsx` | useEffect | my-join-status 替代 /members 检查 | v1.0.15 | — |
| `SpacePageClient.tsx` | Join button | 新增 pending 状态显示 + 禁用 | v1.0.15 | — |
| `SpacePageClient.tsx` | Follow button | 关注/取消关注按钮 + follower_count 本地更新 | v1.0.15 | — |
| `SpacePageClient.tsx` | Edit dialog | 图标/封面上传 (FileReader base64 → POST /files) | v1.0.15 | — |
| `SpacePageClient.tsx` | Header | icon_url 头像显示 + banner_url 横幅背景 | v1.0.15 | — |
| `api.ts` | `spaces.update` | 新增 icon_url/banner_url 参数 | v1.0.15 | — |
| `api.ts` | `spaces.uploadFile` | 新增 base64 文件上传方法 | v1.0.15 | — |
| `create/page.tsx` | `handleCreate` | title: slug → title.trim()，保留用户原始标题 | v1.0.17 | — |
| `create/page.tsx` | `deriveSlug` | 正则新增 `_` 保留下划线字符 | v1.0.17 | — |
| `SpacePageClient.tsx` | Header area | 新增删除社区按钮 (Trash2 图标 + Fragment 包裹) | v1.0.17 | — |
| `api.ts` | `spaces.archive` | 新增 DELETE 请求方法 → archive 社区 | v1.0.17 | — |

### 部署 — infra

| 文件 | 位置 | 修复内容 | 版本 | Pattern |
|------|------|----------|------|---------|
| `deploy/nginx-polis.conf` | server 块 | server_tokens off + 移除 X-XSS-Protection | v1.0.13 | — |
| 部署流程 | tar 打包 | COPYFILE_DISABLE=1 防 xattr 污染 | v0.3.91 | xattr-contamination |

### CLI — polisctl

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `main.rs` | AdminPostsAction::Hide | 新增 --duration 参数 (小时) | v1.0.18 | — |
| `main.rs` | AdminUsersAction | 新增 HideWorks/HideSpaces 子命令 | v1.0.18 | — |
| `commands/admin.rs` | `posts_hide` | duration_hours: Option<i32> 参数传递 | v1.0.18 | — |
| `commands/admin.rs` | `users_hide_works` | POST /api/admin/users/{id}/hide-works | v1.0.18 | — |
| `commands/admin.rs` | `users_hide_spaces` | POST /api/admin/users/{id}/hide-spaces | v1.0.18 | — |

## 如何使用本文件

1. **修改代码前**: 查此表，确认要改的文件有何修复历史
2. **修改代码后**: 在此表追加一条记录，标注修改内容和 Pattern
3. **Bug 复发时**: 从此表定位之前的修复代码，复制粘贴修复
4. **Code Review**: 检查修改是否与历史修复冲突
