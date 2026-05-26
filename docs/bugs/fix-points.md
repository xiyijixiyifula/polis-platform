# 修复点位地图

> **用途**: 代码位置 → 修复历史的反向索引。修改任何文件前，查此表了解该文件过去修过什么 Bug，避免回归。

## 统计面板

| 指标 | 数值 |
|------|------|
| 涉及文件数 | 18 |
| 总修复点位 | 35 |
| 高危文件 (修复 3+ 次) | 4 |
| 最近更新 | 2026-05-26 |

## 高危文件 ⚠️

修改这些文件时，务必先查本表和相关 Pattern：

| 文件 | 修复次数 | 涉及 Pattern | 最近修复 |
|------|----------|-------------|----------|
| `crates/polis-content/src/handlers/content_handler.rs` | 4 | SQL注入, post_count, XSS, Argon2 | v1.0.13 |
| `crates/polis-space/src/routes/space_routes.rs` | 4 | URL编码, DELETE路由, 中文slug | v1.0.14 |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | 3 | URL编码, 模块导航, 成员列表 | v1.0.14 |
| `web/src/components/SpaceSettings.tsx` | 2 | localStorage key, members keyMap | v1.0.14 |

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

### 后端 — polis-content

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `handlers/content_handler.rs` | `create_post` | post_count +1 (已有，参考实现) | v0.2.x | post-count-sync |
| `handlers/content_handler.rs` | `create_post` | Argon2 密码哈希替代明文 | v1.0.13 | — |
| `handlers/content_handler.rs` | (多处) | zip-slip 路径穿越修复 | v1.0.13 | — |
| `handlers/creation.rs` | `submit_to_community` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `handlers/thread_handler.rs` | `publish` | INSERT INTO posts 后 post_count +1 | v1.0.14 | post-count-sync |
| `repo.rs` | `find_posts_by_space` | SQL format!() → 12 臂 match 参数化 | v1.0.13 | — |

### 后端 — polis-core

| 文件 | 函数/位置 | 修复内容 | 版本 | Pattern |
|------|----------|----------|------|---------|
| `auth.rs` | `secure_validation` | JWT exp 显式校验，统一全服务 | v1.0.13 | — |

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

### 部署 — infra

| 文件 | 位置 | 修复内容 | 版本 | Pattern |
|------|------|----------|------|---------|
| `deploy/nginx-polis.conf` | server 块 | server_tokens off + 移除 X-XSS-Protection | v1.0.13 | — |
| 部署流程 | tar 打包 | COPYFILE_DISABLE=1 防 xattr 污染 | v0.3.91 | xattr-contamination |

## 如何使用本文件

1. **修改代码前**: 查此表，确认要改的文件有何修复历史
2. **修改代码后**: 在此表追加一条记录，标注修改内容和 Pattern
3. **Bug 复发时**: 从此表定位之前的修复代码，复制粘贴修复
4. **Code Review**: 检查修改是否与历史修复冲突
