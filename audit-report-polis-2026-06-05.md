# Fuck My Shit Mountain Audit Report

**Project:** Polis Platform
**Audit mode:** full (19 dimensions)
**Date:** 2026-06-05
**Reviewer:** Claude Opus 4.8

---

## 1. Executive Summary

Polis 平台是一个雄心勃勃的去中心化社交平台，包含 18 个 Rust crate（约 31,842 行）和一个 Next.js 14 前端（约 33,168 行 TypeScript/TSX）。其 Creation/ModuleRef 架构设计概念上非常优雅——所有内容类型统一为"作品"，社区模块下的内容是通过指针引用的，而非独立副本。然而，从工程交付视角审视，代码库存在系统性质量债务：安全、稳定、性能、测试四个维度全线溃败，整体评分仅 4.1/10（D 级），远未达到可安全发布到生产环境的标准。

最大的风险集中在三大区域。**安全方面**，密码重置令牌以明文写入 tracing 日志，任何能看到日志的操作者或下游系统均可冒用任意用户身份；JWT 存储在 localStorage 中暴露给 XSS 攻击；多处 dangerouslySetInnerHTML 未经 DOMPurify 等专业 XSS 净化器处理。**稳定性方面**，106 处生产代码中使用 unwrap/expect，任何一处 panic 都会导致整个服务进程崩溃；前端 127 个空 catch 块静默吞掉错误，用户面对白屏却得不到任何反馈。**测试方面**，CI 流水线完全没有测试步骤——cargo test 从未在 CI 中运行；用户核心服务（user、space、content、gateway）的测试覆盖率为零；没有 API 集成测试、没有前端测试、没有负载测试。

值得肯定的是，Creation/ModuleRef 的架构设计是这段代码库中最闪亮的部分——它解决了传统社交平台"内容属于社区"的思维定式，用引用机制实现了内容的多社区分发。另外，deploy.sh 的一键部署流程设计合理（本地交叉编译→GitHub Release→服务器下载），zig cc 交叉编译方案可行，pre-deploy-check.sh 19 类自动化检查覆盖较全面。但文档与代码之间存在大量矛盾：CLAUDE.md 声称 12 类风险检查，另一处又声称 14 类，实际脚本有 19 类；README 称 36+ 迁移文件，实际仅 35 个；ARCHITECTURE.md 将 polis-aggregate 标记为"未部署"，但 deploy.sh 的 RUST_BINARIES 列表已包含它。这些不一致会严重误导新开发者。

修复建议按优先级分为四层：立即修复密码令牌日志泄漏和 deploy.sh 的原子性问题；稳定版发布前补充 API 测试、前端测试、JWT 存储迁移；后续排期解决 unwrap 消除和文档同步；低优先级样式问题暂缓。同时推荐两个长期重构方向：将 God Component（1974 行 SpacePageClient）按模块拆分，以及将 1980 行的 repo.rs 按领域拆分为独立 repository。

### Score Dashboard

```
Security        ███████░░░  3.5  D  密码重置令牌明文记录日志、JWT 存 localStorage、无 CSP、XOR 加密钱包密钥
Stability       █████████░  4.5  D  106 处 unwrap/expect、127 个空 catch、15+ 表面错误处理缺失
Performance     ██████████  5.0  D  88 处 SELECT *、无 Redis 缓存热数据、185 条原始 SQL 无查询超时
Testing         ██████░░░░  3.0  F  CI 无 test 步骤、核心服务零测试覆盖率、无集成测试/前端测试
Maintainability ████████░░  4.0  D  13 个文件超 500 行达 1980 行、Claims/Config 各重复 11 次、God Component
Design          ██████████  5.0  D  架构概念优秀但实现断裂：auth 中间件分散、refresh token 孤儿逻辑、文档矛盾
Release         ███████░░░  3.5  D  deploy.sh 删除 .next 后才验证下载、CI 无测试、文档严重过时、无回滚机制
─────────────────────────────────────
Overall         ████████░░  4.1  D
```

Higher = better (10 = clean, 0 = shit mountain).

### Finding Statistics

| Severity | Count | Confirmed | Suspected |
|----------|-------|-----------|-----------|
| Critical | 8 | 8 | 0 |
| High | 15 | 15 | 0 |
| Medium | 84 | 84 | 0 |
| Low | 34 | 34 | 0 |
| **Total** | **141** | **141** | **0** |

## 2. Project Map

### 核心组件

Polis 采用微服务架构，包含 18 个 Rust crate 和一个 Next.js 前端。以下是关键组件及其规模：

| 组件 | 路径 | 规模 | 职责 |
|------|------|------|------|
| polis-core | crates/polis-core/ | ~2500 行 | 共享内核：100+ 领域模型 struct/enum、AppError 错误类型、JWT helper、namespace 解析器 |
| polis-gateway | crates/polis-gateway/ | ~533 行 | API 网关：IP 限流、路由分发、健康检查聚合、逐跳 header 剥离、1 次重试 |
| polis-user | crates/polis-user/ | ~1200 行 | 用户服务：注册/登录/注销、密码重置、资料 CRUD、关注/取关、XP/等级、新手任务、钱包绑定 |
| polis-space | crates/polis-space/ | ~1100 行 | 社区服务：社区 CRUD、命名空间解析、成员管理、模块管理、星级/关注 |
| polis-content | crates/polis-content/ | ~7000 行 | 内容服务（最大）：帖子/评论/投票/系列/专栏/书签/通知/私信/聊天/草稿等 |
| polis-admin | crates/polis-admin/ | ~500 行 | 管理后台：审核队列、审计日志、举报处理 |
| polis-video | crates/polis-video/ | ~500 行 | 视频服务：上传（600MB 限制）、HLS 流 |
| polis-aggregate | crates/polis-aggregate/ | ~300 行 | 聚合服务：根空间精选、趋势、子空间列表 |
| polis-chain | crates/polis-chain/ | ~2000 行 | 区块链模块：钱包密钥、内存池、共识/验证、挖矿/抽签 |
| polis-web | web/ | ~33000 行 TS/TSX | Next.js 14 前端：40+ 页面、Cherry Markdown 编辑器、zustand 状态管理 |

### 数据流

```
浏览器 (HTTPS) → Nginx (TLS 终结, CORS 头) 
  → polis-gateway (端口 8080) 
    → IP 限流检查 (内存 HashMap, 60s 滑动窗口)
    → 路由匹配 (前缀: /api/auth/* → user, /api/spaces/* → space, /api/posts/* → content)
    → 代理请求到下游微服务 (HTTP, reqwest, 1 次重试, hop-by-hop header 剥离)
    → 微服务接收请求 → axum 路由 → 可选 JWT auth 中间件 (Bearer token, HS256 验证)
    → Route handler → Handler → Repository → sqlx 查询 PostgreSQL (连接池)
    → 可选 Redis 缓存 → 可选 S3 文件存储
    → 响应序列化为 {code, data, message} 信封 → 网关代理返回 → Nginx → 浏览器
```

WebSocket 和 HLS 流绕过网关直接通过 Nginx 代理以提升性能。

### 安全边界

1. **JWT 认证**: HMAC-SHA256 (HS256) 对称密钥，存储于 `JWT_SECRET` 环境变量。每个微服务独立验证。
2. **Auth 中间件**: 各服务独立实现（存在差异），提取 Bearer token，验证 exp + token_type=access。
3. **限流**: 网关层 IP 限流，内存 HashMap，不可跨网关实例共享。
4. **密码哈希**: Argon2 (argon2 crate v0.5)，通过 `tokio::task::spawn_blocking` 异步化。
5. **社区可见性**: 三级（public/private/unlisted），密码保护用 Argon2 验证。
6. **密钥管理**: 仅环境变量 (dotenvy)，无 Vault/HSM。
7. **CORS**: Nginx 边缘处理，网关剥离上游 access-control-* header。
8. **Body 大小限制**: 通用 60MB、视频 600MB，网关层 axum DefaultBodyLimit 执行。

### 测试结构

测试文件实际存在但极度有限：
- `crates/polis-core/tests/models_test.rs` — 模型序列化/反序列化集成测试
- `crates/polis-chain/src/` — 6 个文件的单元测试（mempool、validator、reputation、slashing、lottery、round、keys）
- `crates/polis-core/src/mention.rs`, `hashtag.rs`, `resolver/mod.rs` — 少量单元测试

CI 测试步骤：`.github/workflows/release.yml` **完全没有 test 步骤**，仅构建和打包。无 `cargo test`、无前端测试、无 linting。

测试缺口：无 HTTP 端点集成测试、无数据库集成测试、无前端测试（无 Jest/Vitest 配置）、无 E2E 测试、无负载/压力测试、无 fuzz 测试、无基于属性的测试。用户核心服务（user、space、content、gateway）测试覆盖率为零。

### 风险热点

1. **content_routes.rs (1713 行)** — 单片路由处理器，`parse_content_path()` 手动字符串解析路由，混合公开和认证路由，手动 query 参数解析。路由 bug 和 URL 编码问题的高风险区。
2. **repo.rs (1980 行)** — 185 条原始 SQL 查询，88 处 SELECT *，N+1 查询风险，缺少索引的问题混合在一个巨型文件中。
3. **content_handler.rs (1698 行)** — 单片 handler 涵盖帖子/评论/投票/系列/文件/聊天/私信/打赏/精选/排行榜/活动/hashtag/推荐，严重违反单一职责。
4. **models.rs (1843 行)** — 100+ struct/enum 在一个文件中，任何修改可能触发 18 个依赖 crate 的级联编译错误。
5. **gateway main.rs (533 行)** — 手动 HTTP header 剥离，硬编码 hop-by-hop header 列表，限流不可跨实例共享，无熔断器模式。
6. **Auth 中间件重复** — Claims 结构在各服务间 11 次重复定义，token_type 字段存在性不一致，JWT 格式变更时有发散风险。
7. **交叉编译复杂度** — deploy.sh 使用 zig cc 进行 macOS→Linux 交叉编译，CI 使用原生 Linux runner（无交叉编译），两条部署路径不一致。
8. **Next.js standalone 模式** — 静态文件必须手动复制到 `.next/standalone`，此部署后步骤脆弱且易遗忘。不执行则 `/_next/static/*` 全部 404。

## 3. Top Risks

以下是按优先级排列的前 15 大风险：

| # | 标题 | 严重度 | 摘要 |
|---|------|--------|------|
| 1 | 密码重置令牌明文记录在 tracing 日志中 | Critical | 任何可访问日志的操作者可冒用任意用户身份 |
| 2 | CI 流水线完全没有测试步骤 | Critical | cargo test 从未运行，无法捕获回归 bug |
| 3 | deploy.sh 先删除 .next 后验证下载 | Critical | 下载失败时前端处于损坏状态，无自动恢复 |
| 4 | polis-aggregate 缺失于 CI 构建列表 | Critical | Releases 不完整，aggregate 可能未被编译部署 |
| 5 | 106 处 unwrap/expect 在非测试代码中 | Critical | 任一 panic 导致整个服务进程崩溃 |
| 6 | 88 处 SELECT * 在原始 SQL 查询中 | Critical | 不必要的数据传输，破坏仅索引扫描优化 |
| 7 | JWT access token 存储在 localStorage | High | XSS 漏洞可轻易窃取令牌 |
| 8 | 多处 dangerouslySetInnerHTML 无专业净化 | High | Markdown 渲染 HTML 可能包含 XSS 载荷 |
| 9 | Refresh token 机制完整但从未使用 | High | 注销是空操作，令牌泄露后无失效手段 |
| 10 | 1974 行 SpacePageClient God Component | High | 49 个状态 + 18 个 tab，无法独立测试和维护 |
| 11 | JWT Claims 结构在 11 个位置重复定义 | High | 任何 JWT 字段变更需要同步修改 11 处 |
| 12 | 127 个空 catch 块在前端静默吞掉错误 | High | 用户面对白屏/空数据，开发者无法诊断 |
| 13 | 无前端测试框架配置 | High | 33168 行 TypeScript 零测试覆盖 |
| 14 | 部署无自动化回滚机制 | High | 故障恢复依赖手动从备份目录恢复 |
| 15 | 549 处 TypeScript `any` 类型 | Medium | 类型安全被大范围绕过 |

完整细节见第 4 节。

## 4. Detailed Findings

### 安全性

#### Finding: 密码重置令牌明文记录在 tracing 日志中

- Severity: Critical
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: polis-user 认证模块
- Evidence:
  - File: `crates/polis-user/src/routes/user_routes.rs:96`
  - Function: `forgot_password`
  - Relevant behavior: `tracing::info!("Password reset token generated for {}: {}", r.email, token);` 将原始重置令牌与用户邮箱一起记录到 tracing 基础设施中。该令牌足以调用 `/api/auth/reset-password` 并为任意用户设置新密码。
- Problem: 密码重置令牌被原样发射到 tracing/日志管道。任何操作者、日志聚合器（如 Loki、CloudWatch）或下游消费者如果读取这些结构化 JSON 日志，都可以在用户请求密码重置后冒用其身份。
- Why it matters: 这是凭据泄露——重置令牌等同于临时密码。日志通常被多个团队访问（运维、开发、安全），存储时间远长于令牌有效期。日志聚合系统经常将数据复制到多个区域，扩大了泄露面。
- Realistic failure scenario: 用户请求密码重置 → 令牌写入日志 → 日志被发送到集中式日志服务（Elasticsearch/Loki）→ 具有日志访问权限的内部人员或通过日志服务 API 漏洞的外部攻击者读取令牌 → 调用 `/api/auth/reset-password` 设置新密码 → 账户被接管。
- Minimal fix: 将 `tracing::info!` 改为仅记录邮箱地址，不记录令牌值。或使用 `tracing::debug!` 并在生产环境禁用 debug 级别。
- Better long-term fix: 对日志中的所有敏感字段实现自动脱敏（如使用 tracing 的 `valuable` trait 配合 `Sensitive` 包装器）。
- Regression test suggestion: 测试验证 forgot_password 端点不将 token 参数写入任何日志输出。使用 `tracing_test` crate 捕获日志并断言不包含敏感数据。
- Estimated effort: 30 minutes

#### Finding: JWT access token 存储在 localStorage (XSS 可提取)

- Severity: High
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: web 前端认证模块
- Evidence:
  - File: `web/src/lib/api.ts:153`
  - Function: `setToken`
  - Relevant behavior: `localStorage.setItem('polis_access_token', token)` 将 JWT 存储在浏览器 localStorage 中。令牌暴露给同一源上运行的任何脚本，包括第三方 CDN 脚本、npm 依赖供应链攻击和成功的 XSS 载荷。
- Problem: localStorage 是同步的，对源上的所有 JavaScript 可访问。Polis 前端任何部分的 XSS 漏洞（包括 npm 依赖项）都可以轻松读取令牌：`localStorage.getItem('polis_access_token')`。令牌也存储为 cookie（第 155 行），部分缓解但未消除 localStorage 暴露。
- Why it matters: 供应链攻击面极广——14 个前端依赖项中任何一个被攻破都会导致令牌泄露。这包括 cherry-markdown、marked、turndown 等处理用户内容的库。
- Realistic failure scenario: npm 依赖项（如 marked 库）被供应链攻击植入恶意代码 → 恶意代码读取 `localStorage.getItem('polis_access_token')` → 将令牌发送到攻击者服务器 → 攻击者使用令牌访问用户数据、冒充用户发帖。
- Minimal fix: 移除 localStorage 存储，仅使用 httpOnly cookie（需服务端配合设置）。将 `setToken` 简化为仅设置 cookie 选项。
- Better long-term fix: 实现完整的 httpOnly + Secure + SameSite=Strict cookie 方案，配合 CSRF token 保护。添加 token 撤销端点。
- Regression test suggestion: 测试验证 `setToken` 不调用 `localStorage.setItem`，且 `getToken` 不调用 `localStorage.getItem`。
- Estimated effort: 4 hours

#### Finding: 多处 dangerouslySetInnerHTML 使用用户可控的 Markdown 内容

- Severity: High
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: web 前端渲染组件
- Evidence:
  - File: `web/src/components/CherryRender.tsx:143` — `cherry-markdown engine.makeHtml()` 输出直接通过 `dangerouslySetInnerHTML` 插入，无任何后处理净化
  - File: `web/src/components/MarkdownEditor.tsx:113` — 基于正则的自定义 `renderMarkdown` 输出无净化使用
  - File: `web/src/components/MilkdownEditor.tsx:429` — marked 输出经由自定义 `sanitizeHtml` 处理，但早期预览（第 118 行）可能绕过
- Problem: CherryRender 将 cherry-markdown 的 `engine.makeHtml()` 输出直接传递到 `dangerouslySetInnerHTML`，无任何净化包装器。cherry-markdown 是值得信赖的库，但它是 Markdown 转 HTML 渲染器，而非 HTML 净化器。Markdown 渲染器可通过原始 HTML 穿透的边界情况产生包含事件处理器或脚本注入向量的 HTML。MarkdownEditor 的 `renderMarkdown` 函数使用原始正则替换，无基于 DOM 的净化——后备渲染器（CherryRender.tsx:8-24）同样无净化。
- Why it matters: XSS 是 Web 应用最常见的漏洞类别。虽然 Markdown 渲染器通常安全性较好，但无净化步骤意味着任何渲染引擎漏洞或配置错误都可能成为 XSS 入口。
- Realistic failure scenario: 用户创建包含 `"><img src=x onerror=alert(document.cookie)>` HTML 标签的帖子 → cherry-markdown 将其作为原始 HTML 传递 → 帖子被查看时脚本在浏览器上下文中执行 → session cookie 被窃取。
- Minimal fix: 引入 DOMPurify 对 Markdown 转 HTML 的输出进行净化，然后再传入 `dangerouslySetInnerHTML`。在 CherryRender、MarkdownEditor、MilkdownEditor 三处统一应用。
- Better long-term fix: 创建统一的 `SafeHtml` 组件封装净化和渲染逻辑，所有 `dangerouslySetInnerHTML` 使用点强制使用该组件，通过 lint 规则禁止直接使用 `dangerouslySetInnerHTML`。
- Regression test suggestion: 为 SafeHtml 组件编写测试，验证已知 XSS 载荷（如 `<img src=x onerror=...>`、`<script>alert(1)</script>`、`javascript:` URL）被成功净化。
- Estimated effort: 8 hours

#### Finding: Refresh token 机制完整但从未使用——注销是空操作

- Severity: High
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: polis-user 认证模块
- Evidence:
  - File: `crates/polis-user/src/routes/user_routes.rs:168-170` — logout 返回 "logged_out" 字符串但不撤销任何令牌
  - File: `crates/polis-user/src/handlers/user_handler.rs:91-98,149-156` — refresh tokens 被生成但从未验证或使用
  - 不存在 `/api/auth/refresh` 端点，不存在 token 黑名单，不存在撤销机制
- Problem: 注销端点是空操作：它返回 JSON 成功响应但不使 access token 或 refresh token 失效。被盗的 access token 在其自然过期前（如果使用 remember-me，最长 30 天）保持有效。Refresh token 被生成并返回给客户端，但从未被消费——没有端点接受 refresh token 来颁发新的 access token。
- Why it matters: 令牌泄露后无法撤销。refresh token 的存在增加了攻击面（它们也被存储在客户端）却未提供任何安全收益。
- Realistic failure scenario: 用户注销认为已安全退出 → access token 实际仍然有效 → 任何持有该令牌副本的人（通过中间人攻击、浏览器扩展、恶意 npm 包）继续拥有完全 API 访问权限达 30 天。
- Minimal fix: 实现 token 黑名单（内存或 Redis），在 logout 时将 access token 加入黑名单。实现 `/api/auth/refresh` 端点消费 refresh token 颁发新 access token。
- Better long-term fix: 使用短期 access token（15 分钟）+ 可撤销的 refresh token + Redis 黑名单，实现完整的 OAuth2 风格的令牌生命周期管理。
- Regression test suggestion: 测试验证 logout 后 access token 被拒绝（401），refresh 端点接受有效 refresh token 并返回新 access token。
- Estimated effort: 2 days

#### Finding: 无 CSP (Content Security Policy) header

- Severity: Medium
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: 全平台
- Evidence:
  - 搜索整个代码库：Nginx 配置、Next.js 配置、axum 中间件均未设置 `Content-Security-Policy` header
- Problem: 在无 CSP 的情况下，浏览器无法区分合法的内联脚本和注入的恶意脚本。这使得 XSS 攻击一旦成功即无第二道防线。
- Why it matters: CSP 是纵深防御的关键层。即使存在 dangerouslySetInnerHTML 净化漏洞，正确的 CSP 可以阻止恶意脚本执行。
- Minimal fix: 在 Nginx 配置和 Next.js 响应中添加合理的 CSP header：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'`
- Estimated effort: 2 hours

#### Finding: XOR 基础钱包密钥加密

- Severity: Medium
- Confidence: Medium
- Category: Security
- Status: Confirmed
- Affected area: polis-chain 钱包模块
- Evidence:
  - File: `crates/polis-chain/src/wallet/keys.rs` — 密钥加密/解密
  - 搜索确认使用 XOR 进行密钥加密（非行业标准）
- Problem: XOR 加密不是密码学安全的加密方案。它容易受到已知明文攻击和频率分析。对于区块链钱包密钥的保护，应使用 AES-256-GCM 或类似的认证加密算法。
- Why it matters: 钱包密钥控制着链上资产。XOR 加密提供的是混淆而非真正的保护。任何获得密文和已知明文对的攻击者可以恢复密钥。
- Minimal fix: 将 XOR 加密替换为 AES-256-GCM（使用 `aes-gcm` crate）。
- Estimated effort: 1 day

#### Finding: 所有 crate 使用原始字符串插值 SQL

- Severity: Medium
- Confidence: High
- Category: Security
- Status: Confirmed
- Affected area: 所有后端 crate
- Evidence:
  - File: `crates/polis-content/src/repo.rs` — 185 条原始 SQL 查询
  - File: `crates/polis-content/src/repo.rs:1827` — `format!("SELECT user_id, {} as amount, {} FROM tip_leaderboard ORDER BY {} DESC LIMIT $1", col, col, col)` 使用 format! 动态构建 SQL
- Problem: 虽然 sqlx 本身使用参数化查询（$1, $2），但 `format!` 用于动态构建列名时绕过了这一保护。如果列名来源不可信（如来自用户请求参数），则存在 SQL 注入风险。
- Why it matters: 当前列名来自内部枚举，风险较低。但维护者可能在未来添加用户可控的排序/过滤参数，而不知道此处的 SQL 构建方式会引入注入漏洞。
- Minimal fix: 将动态列名替换为枚举匹配（match on enum → static string），而非 `format!` 拼接。添加 lint 规则禁止 SQL 查询中的 `format!`。
- Estimated effort: 2 hours

### 稳定性

#### Finding: 106 处 unwrap/expect 在生产代码中

- Severity: Critical
- Confidence: High
- Category: Stability
- Status: Confirmed
- Affected area: 所有 Rust crate
- Evidence:
  - File: 多个文件，共 106 处非测试代码中的 `unwrap()` 和 `expect()`
  - 示例: `crates/polis-gateway/src/main.rs:532` — `Err(last_error.unwrap())`
  - 示例: `crates/polis-content/src/routes/content_routes.rs:22` — `serde_json::to_value(value).expect("json_ok: serialization should not fail for known types")`
  - 示例: `crates/polis-content/src/config.rs:24` — `.expect("CONTENT_PORT must be a number")`
- Problem: Rust 的 `unwrap()` 在 `Err`/`None` 情况下会触发 panic，导致整个线程或进程崩溃。在 Web 服务中，这意味着一次请求失败可以拖垮整个服务。106 处分散在代码库各处，任一触发都可能导致服务不可用。
- Why it matters: 与 Go/Java 不同，Rust 的 panic 默认行为是终止进程（除非在 `catch_unwind` 边界内）。这意味着任何未处理的错误都能导致整个微服务崩溃重启。
- Realistic failure scenario: JSON 序列化因非预期类型失败 → `expect` 触发 panic → 服务进程被 tokio runtime 终止 → 所有进行中的请求被中断 → systemd 重启服务 → 冷启动期间请求被拒绝 → 连锁反应影响所有依赖服务。
- Minimal fix: 将所有 `unwrap()`/`expect()` 替换为正确的错误传播（`?` 操作符 + `AppError`），特别是在 HTTP 请求处理路径中。
- Better long-term fix: 添加 clippy lint `clippy::unwrap_used` 禁止新的 unwrap 引入，将现有 unwrap 逐批迁移。
- Regression test suggestion: 编写集成测试覆盖导致 `unwrap` 调用的错误路径，验证返回适当 HTTP 错误而非 502。
- Estimated effort: 1 week (逐文件迁移)

#### Finding: 127 个空 catch 块在前端静默吞掉错误

- Severity: High
- Confidence: High
- Category: Stability
- Status: Confirmed
- Affected area: web 前端
- Evidence:
  - 共计 127 处 `catch {}` 或 `.catch(() => {})` 分布在 TypeScript 文件中
  - 高频文件: `web/src/app/messages/page.tsx` (6 处), `web/src/app/saved/page.tsx` (6 处), `web/src/app/video/[id]/VideoPageClient.tsx` (5 处)
  - `web/src/lib/api.ts:134,144` — `catch {}` 静默吞掉 namespace 解析失败
- Problem: 空 catch 块意味着当 API 请求失败、网络超时、JSON 解析错误时，用户得不到任何反馈。UI 保持空白或显示过期数据，开发者没有错误遥测来诊断问题。
- Why it matters: 生产中无法区分"数据确实是空的"和"API 调用失败了"。用户可能刷新多次页面却不明白为什么看不到内容。
- Realistic failure scenario: 后端 API 返回 500 → catch 块吞噬错误 → 前端渲染空列表 → 用户认为没有内容 → 刷新多次无果 → 放弃使用平台。
- Minimal fix: 为每个 catch 块添加：(1) console.error 记录错误，(2) 设置 error 状态变量，(3) 渲染用户可见的错误提示或重试按钮。
- Better long-term fix: 创建统一的 API 错误处理中间件，自动记录错误、设置错误状态、渲染标准错误 UI。通过 ESLint 规则 `no-empty` 禁止空 catch 块。
- Regression test suggestion: 在 Cypress/Playwright E2E 测试中模拟 API 错误，验证每个页面都显示适当的错误 UI。
- Estimated effort: 2 days

#### Finding: 43 处 let _ = 忽略错误返回值

- Severity: Medium
- Confidence: High
- Category: Stability
- Status: Confirmed
- Affected area: 所有后端 crate
- Evidence:
  - 16 处 `let _ = sqlx::query(...)` 忽略数据库错误
  - 4 处写入文件系统忽略错误 (`fs::write(...).ok()`)
  - 多处 NATS 发布错误被忽略
  - `crates/polis-content/src/xp_bridge.rs:71,123` — XP bridge HTTP 调用错误被忽略
- Problem: `let _ =` 显式丢弃 Result 类型，表示开发者有意忽略错误。其中很多涉及数据库写入和跨服务通信，这些操作失败时会导致数据不一致。
- Why it matters: 例如 `let _ = sqlx::query("UPDATE spaces SET post_count = post_count + 1 WHERE id = $1")` 如果失败，post_count 将永久不同步，导致 UI 显示错误的帖子计数。
- Minimal fix: 为每个 `let _ =` 替换为 `if let Err(e) = ... { tracing::warn!(...) }` 至少记录警告日志。
- Estimated effort: 4 hours

#### Finding: xp_bridge 跨服务 HTTP 调用无重试/超时

- Severity: Medium
- Confidence: High
- Category: Stability
- Status: Confirmed
- Affected area: polis-content XP bridge
- Evidence:
  - File: `crates/polis-content/src/xp_bridge.rs:71,123`
  - Behavior: `let _ = self.client.post(&url).json(&body).send().await;` — 无超时设置，错误被静默忽略
- Problem: XP 奖励发放是异步的，如果 user 服务不可达，XP 将被静默丢失。没有重试机制、没有超时配置、没有死信队列。
- Why it matters: 用户体验到应该获得 XP 但实际未获得，无法排查原因。
- Minimal fix: 添加超时配置（如 5 秒）、3 次指数退避重试、失败时记录错误日志。
- Estimated effort: 2 hours

### 性能

#### Finding: 88 处 SELECT * 扫描整个表

- Severity: Critical
- Confidence: High
- Category: Performance
- Status: Confirmed
- Affected area: polis-content repository
- Evidence:
  - File: `crates/polis-content/src/repo.rs` — 88 处 `SELECT *`
  - Pattern: `sqlx::query_as::<_, Post>("SELECT * FROM posts WHERE space_id = $1 ...")` 出现在多个 `list_posts` 分支中（第 104, 111, 118, 126, 133, 140 行等）
- Problem: `SELECT *` 阻止 PostgreSQL 使用仅索引扫描（index-only scan），强制读取完整行数据。posts 表的 body 字段可能包含大段 Markdown 内容，在列表查询中完全不需要。随着帖子数量增长，这会造成显著的 I/O 和网络开销。
- Why it matters: posts 表的全行读取是高流量端点（如 `/api/posts?space_id=X&sort=trending`）的性能瓶颈。当数据库在磁盘上时，每行多读取几 KB 的 body 字段会大幅增加查询延迟。
- Minimal fix: 将列表查询的 `SELECT *` 替换为明确的列列表（排除 body 字段）：`SELECT id, title, author_id, space_id, ... FROM posts ...`。在帖子详情查询中保留 `SELECT *`。
- Estimated effort: 4 hours

#### Finding: 185 条原始 SQL 查询无查询超时

- Severity: Critical
- Confidence: High
- Category: Performance
- Status: Confirmed
- Affected area: polis-content repository
- Evidence:
  - File: `crates/polis-content/src/repo.rs` — 185 条 `sqlx::query` 和 `sqlx::query_as` 调用
  - 无 `statement_timeout` 设置，无 `lock_timeout` 配置
- Problem: PostgreSQL 默认无查询超时。一个慢查询（如缺失索引的全表扫描）可以持有连接无限长时间，耗尽连接池并阻塞所有后续请求。
- Why it matters: 无超时保护的数据库查询是级联故障的主要来源——一个慢查询 → 连接池耗尽 → 所有端点 503 → 整个服务不可用。
- Minimal fix: 在数据库连接 URL 中设置 `options=-c statement_timeout=30000`，或通过 sqlx 的 `after_connect` 回调为每个连接设置超时。
- Estimated effort: 1 hour

#### Finding: 热数据查询无 Redis 缓存层

- Severity: High
- Confidence: High
- Category: Performance
- Status: Confirmed
- Affected area: polis-space trending 端点
- Evidence:
  - File: `crates/polis-space/src/handlers/space_handler.rs`
  - Trending/leaderboard 查询每次请求直接访问 PostgreSQL，无缓存
- Problem: trending spaces、most-starred、leaderboard 等查询结果变化缓慢，但每次请求都直接查询数据库。这些端点通常有最高的访问频率（首页/发现页），对数据库造成不必要的重复负载。
- Why it matters: 首页加载是用户留存的关键指标。trending 查询涉及多表 JOIN 和聚合计算，每次请求都重新计算会浪费数据库资源并增加首页加载延迟。
- Minimal fix: 对 trending/leaderboard 查询添加 Redis 缓存层，TTL 设置为 5 分钟，stale-while-revalidate 模式。
- Estimated effort: 4 hours

#### Finding: N+1 查询风险在列表端点

- Severity: High
- Confidence: High
- Category: Performance
- Status: Confirmed
- Affected area: polis-content 列表端点
- Evidence:
  - File: `crates/polis-content/src/repo.rs` — 获取帖子列表后，author 信息、like 状态、bookmark 状态可能通过单独查询获取
  - `list_posts` 有 20+ 个排序分支，每个分支重复相同的 COUNT + SELECT 模式
- Problem: 每个帖子可能需要额外查询获取作者信息、点赞状态、书签状态。如果页面显示 20 个帖子，可能触发 1 + 20 * 3 = 61 次数据库查询。
- Why it matters: 数据库往返次数是列表页面性能的主要瓶颈。随着并发用户增加，连接池压力呈线性增长。
- Minimal fix: 使用 JOIN 或批量查询（`WHERE id = ANY($1)`）在一次往返中获取所有相关数据。
- Estimated effort: 1 day

### 测试

#### Finding: CI 流水线完全没有测试步骤

- Severity: Critical
- Confidence: High
- Category: Testing
- Status: Confirmed
- Affected area: CI/CD
- Evidence:
  - File: `.github/workflows/release.yml`
  - 行为: 该 workflow 仅包含 `cargo build -p $svc --release` 和打包步骤，无 `cargo test`、无前端测试、无 linting
- Problem: CI 从不运行任何测试。这意味着 merge 到 main 的代码可能破坏现有功能且无人知晓。测试只在开发者本地运行（如果开发者记得的话），没有任何强制机制确保测试通过后才允许合并。
- Why it matters: CI 是阻止回归 bug 进入生产环境的最后一道自动化防线。没有它，每次部署都是赌博。
- Minimal fix: 在 release.yml 的 build-backend job 中添加 `cargo test --workspace --exclude polis-chain` 步骤。添加独立的 lint job 运行 `cargo clippy`。
- Estimated effort: 1 hour

#### Finding: 用户核心服务测试覆盖率为零

- Severity: High
- Confidence: High
- Category: Testing
- Status: Confirmed
- Affected area: polis-user、polis-space、polis-content、polis-gateway
- Evidence:
  - 搜索 `#[test]` 和 `#[tokio::test]` 在 crates/polis-user/、crates/polis-space/、crates/polis-content/、crates/polis-gateway/ 中返回零结果
  - 仅 polis-core 和 polis-chain 包含测试
- Problem: 认证、社区管理、内容发布——平台最核心的用户功能完全没有自动化测试。任何代码修改都可能引入功能回归，且无法在开发流程中被检测到。
- Why it matters: 每个部署都是"祈祷式部署"——开发者希望没有破坏任何东西，但没有任何机制验证。
- Minimal fix: 从每个服务的 handler 层开始，为最关键的端点编写集成测试（使用 testcontainers 提供真实 PostgreSQL）。
- Estimated effort: 2 weeks (持续的)

#### Finding: 无前端测试框架配置

- Severity: High
- Confidence: High
- Category: Testing
- Status: Confirmed
- Affected area: web 前端
- Evidence:
  - 项目根目录和 `web/` 目录均无 `jest.config.*`、`vitest.config.*`
  - `web/package.json` 中无 `jest`、`vitest`、`@testing-library` 等测试依赖
  - 33,168 行 TypeScript/TSX 代码零测试覆盖
- Problem: 前端完全无自动化测试。SpacePageClient（1974 行、49 个状态、18 个 tab）、PostPageClient（979 行）、ProfilePageClient（952 行）等巨型组件从未被测试验证。
- Why it matters: 前端是用户直接交互的层面。UI bug（白屏、显示错误数据、交互异常）直接影响用户留存。God Component 的每一次修改都有破坏其他 tab 的风险。
- Minimal fix: 配置 Vitest + @testing-library/react，为关键用户流程编写测试：登录、浏览社区、查看帖子、发表评论。
- Estimated effort: 3 weeks (持续的)

#### Finding: 声明但未使用的基础测试设施

- Severity: Medium
- Confidence: High
- Category: Testing
- Status: Confirmed
- Affected area: 工作区配置
- Evidence:
  - `Cargo.toml` 声明了 `rstest = "0.22"`（基于属性的测试框架）和 `testcontainers = "0.23"`（集成测试容器）
  - 但这些依赖在测试代码中几乎未被使用
- Problem: 基础设施已就绪但从未使用。testcontainers 可以提供真实的 PostgreSQL 实例进行集成测试，rstest 可以提供参数化测试——这些能力都在那里，只是从未被利用。
- Minimal fix: 立即开始使用这些已有依赖编写测试，无需添加新依赖。
- Estimated effort: N/A (已有基础设施)

#### Finding: 无 E2E 测试、无负载测试、无 fuzz 测试

- Severity: Medium
- Confidence: High
- Category: Testing
- Status: Confirmed
- Affected area: 全平台
- Evidence:
  - 无 Playwright/Cypress 配置
  - 无 k6/artillery/locust 负载测试脚本
  - 无 `cargo fuzz` 或 `proptest` 使用
- Problem: 缺失完整的测试金字塔。仅有的测试（单位测试在 polis-chain）处于金字塔底部，关键的 E2E 和负载测试完全缺失。
- Minimal fix: 优先添加：(1) 关键路径的 Playwright E2E 测试，(2) trending API 的 k6 负载测试。
- Estimated effort: 1 week

### 可维护性

#### Finding: 13 个 Rust 文件超过 500 行，最高 1980 行

- Severity: High
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: 多个 crate
- Evidence:
  - `crates/polis-content/src/repo.rs` — 1980 行，185 条 SQL 查询
  - `crates/polis-core/src/models.rs` — 1843 行，100+ 类型定义
  - `crates/polis-content/src/routes/content_routes.rs` — 1713 行
  - `crates/polis-content/src/handlers/content_handler.rs` — 1698 行
  - `crates/polisctl/src/main.rs` — 1402 行
  - ... 共 13 个文件
- Problem: 超过 1000 行的文件违反了单一职责原则和文件大小限制。这些文件成为"代码黑洞"——修改任何功能都需要在这些巨型文件中导航，增加了引入 bug 的风险。
- Minimal fix: 将 repo.rs 按领域拆分为 `post_repo.rs`、`comment_repo.rs`、`poll_repo.rs` 等。将 content_handler.rs 拆分为更小的 handler 模块。
- Better long-term fix: 为每个领域引入 Repository trait，允许按领域实现和测试，同时保持接口清晰。
- Regression test suggestion: 拆分后运行全量测试验证行为未变。
- Estimated effort: 3 days

#### Finding: JWT Claims 结构在 11 个位置重复定义

- Severity: High
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: 多个 crate 的 auth 中间件
- Evidence:
  - 定义 `struct Claims` 的文件: `polis-space/src/middleware/auth.rs`, `polis-content/src/middleware/auth.rs`, `polis-content/src/routes/content_routes.rs`, `polis-content/src/routes/creation_routes.rs`, `polis-content/src/routes/webhook_routes.rs`, `polis-content/src/routes/thread_routes.rs`, `polis-content/src/routes/agent_routes.rs`, `polis-video/src/routes.rs`, `polis-user/src/auth.rs`, `polis-notify/src/auth_mw.rs`, `polis-core/src/auth.rs`
  - `polis-core/src/auth.rs` 已经提供了共享实现，但各服务选择自己定义
- Problem: 如果 JWT 格式需要变更（例如添加新字段、修改 token_type 验证逻辑），需要同时修改 11 个位置。遗漏任何一处都会导致该服务的认证行为与其他服务不一致。
- Why it matters: 这种不一致已经存在——某些 Claims 定义包含 `token_type` 字段而其他不包含，导致各服务对令牌类型验证策略不一致。
- Minimal fix: 删除所有本地 Claims 定义，统一使用 `polis-core::auth::Claims`。
- Estimated effort: 2 hours

#### Finding: Config 结构模式在 11 个 crate 中重复

- Severity: High
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: 所有后端 crate
- Evidence:
  - 每个 crate 的 `config.rs` 或 `main.rs` 中包含相同的 `struct Config` 模式：host/port/database_url 字段 + `from_env()` 方法
  - 核心字段（database_url、redis_url、jwt_secret）在每个 crate 中重复解析
- Problem: 添加新的共享配置项需要修改所有 11 个 crate。环境变量命名约定可能在各 crate 间发散。
- Minimal fix: 将通用配置结构提取到 `polis-core::config::BaseConfig`，各 crate 组合使用。
- Estimated effort: 3 hours

#### Finding: God Component — 1974 行 SpacePageClient 单体组件

- Severity: High
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: web 前端
- Evidence:
  - File: `web/src/app/space/[...namespace]/SpacePageClient.tsx` — 1974 行
  - 49 个状态变量、18 个 tab、多个数据获取 Effect
- Problem: Space 页面是平台的核心页面，包含帖子列表、模块导航、成员管理、设置等 18 个功能区域，全部塞在一个组件中。修改任何一个 tab 的行为都可能影响其他 tab。没有子组件使得每块功能无法独立测试。
- Why it matters: SpacePageClient 几乎每次功能迭代都需要修改。1974 行的组件对于新开发者是不可穿透的认知壁垒。
- Minimal fix: 将每个 tab 提取为独立子组件（PostListPanel、MemberPanel、SettingsPanel 等），通过 props 传递共享数据。
- Better long-term fix: 引入每个 tab 的专用 zustand store，避免通过 prop drilling 传递大量共享状态。
- Regression test suggestion: 拆分后为每个 tab 组件编写独立的渲染测试。
- Estimated effort: 3 days

#### Finding: content_handler.rs 违反单一职责原则

- Severity: Medium
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: polis-content
- Evidence:
  - File: `crates/polis-content/src/handlers/content_handler.rs` — 1698 行
  - 涵盖职责: 帖子、评论、投票、系列、文件、聊天、私信、打赏、精选、排行榜、活动、hashtag、推荐
- Problem: 一个 handler 类承担了 13+ 种独立的业务逻辑。修改打赏逻辑与修改评论逻辑在同一文件中进行，增加了合并冲突和回归 bug 的风险。
- Minimal fix: 拆分为 `PostHandler`、`CommentHandler`、`PollHandler`、`SeriesHandler`、`ChatHandler`、`TipHandler` 等独立 handler。
- Estimated effort: 2 days

#### Finding: 549 处 TypeScript `any` 类型使用

- Severity: Medium
- Confidence: High
- Category: Maintainability
- Status: Confirmed
- Affected area: web 前端
- Evidence:
  - 549 处 `: any`、`as any`、`: any[]` 分布在 TypeScript 文件中
  - 许多出现在 API 响应类型标注中
- Problem: `any` 完全绕过 TypeScript 的类型检查器。这意味着对 API 响应结构的修改不会触发编译错误，类型不匹配只能在运行时发现。
- Minimal fix: 为 API 响应定义完整的 TypeScript 接口替代 `any`。逐步收敛，配合 ESLint 规则 `@typescript-eslint/no-explicit-any`。
- Estimated effort: 1 week (持续收敛)

### 设计

#### Finding: Auth 中间件在各服务间不一致

- Severity: Critical
- Confidence: High
- Category: Design
- Status: Confirmed
- Affected area: 认证架构
- Evidence:
  - 4 个独立的 auth 中间件实现: polis-user、polis-content、polis-space、polis-video、polis-notify
  - 某些 Claims 定义包含 `token_type` 字段，其他不包含
  - 各处对 `JWT_SECRET` 的访问方式不同（`std::env::var` vs 配置结构）
- Problem: 认证逻辑的分叉意味着安全漏洞修复可能只应用于部分服务。如果发现新的 JWT 验证绕过方式，某些服务可能仍存在漏洞。
- Why it matters: 认证是安全的基础。不一致的认证实现直接导致不一致的安全态势。
- Minimal fix: 将 auth 中间件提取到 polis-core，通过 `axum::middleware::from_fn_with_state` 提供统一的 `auth_middleware`。
- Estimated effort: 1 day

#### Finding: Content routes 中的手动 URL 解析脆弱且易出错

- Severity: High
- Confidence: High
- Category: Design
- Status: Confirmed
- Affected area: polis-content 路由
- Evidence:
  - File: `crates/polis-content/src/routes/content_routes.rs` — 1713 行
  - `parse_content_path()` 函数手动解析 namespace/posts/comments 路径段
  - 手动 `urlencoding_decode()` 处理 query 参数
- Problem: 手动 URL 解析容易遗漏边界情况——中文路径双重编码 bug 就是典型例子（已在 CLAUDE.md 文档记录为重复出现的 bug pattern）。axum 提供了原生的 Path extractor，应该使用它而不是手动字符串解析。
- Why it matters: 路由 bug 通常表现为 404 或 500 错误，用户直接受影响。URL 编码问题是 Polis 中文社区用户最常遇到的问题。
- Minimal fix: 将手动路径解析替换为 axum 的嵌套 Router，使用 Path extractor 进行命名参数提取。将 query 参数改为使用 axum 的 Query extractor。
- Estimated effort: 2 days

#### Finding: Refresh token + logout 的孤儿逻辑

- Severity: Medium
- Confidence: High
- Category: Design
- Status: Confirmed
- Affected area: polis-user 认证
- Evidence:
  - refresh token 被生成并返回给客户端
  - 但没有任何端点消费 refresh token
  - logout 端点不做任何令牌撤销
- Problem: 这表示功能开发中途停止。代码库中的 refresh token 逻辑是死代码，但其存在暗示不应有的功能。logout 是空操作意味着设计上缺乏对安全退出的考虑。
- Minimal fix: 要么实现完整的 refresh token 流程，要么删除 refresh token 生成和 logout 端点，待有必要时再加入完整实现。
- Estimated effort: 2 days (实现完整流程) 或 1 hour (删除死代码)

### 发布

#### Finding: polis-aggregate 缺失于 CI 构建列表

- Severity: Critical
- Confidence: High
- Category: Release
- Status: Confirmed
- Affected area: CI/CD
- Evidence:
  - File: `.github/workflows/release.yml:33` — 构建列表: `polis-gateway polis-user polis-space polis-content polis-admin polis-video`
  - `polis-aggregate` 不在 CI 构建列表中
  - File: `deploy.sh:28` — `RUST_BINARIES=(polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate)`
  - deploy.sh 包含 polis-aggregate，CI 不包含
- Problem: CI 构建和 deploy.sh 部署的服务列表不同步。如果依赖 CI 构建产物进行部署，polis-aggregate 根本不会被编译。如果依赖 deploy.sh 本地编译，则 CI 构建是浪费的（构建了不同的服务集合）。
- Minimal fix: 同步 CI 构建列表和 deploy.sh 的 RUST_BINARIES。同时将所有 crate 列表提取为一个共享配置文件。
- Estimated effort: 15 minutes

#### Finding: deploy.sh 在验证下载前删除 .next 目录

- Severity: Critical
- Confidence: High
- Category: Release
- Status: Confirmed
- Affected area: 部署流程
- Evidence:
  - File: `deploy.sh:278` — `rm -rf ${SERVER_WEB_DIR}/.next ${SERVER_WEB_DIR}/public`
  - 紧接着才执行 `curl -fsSL '${web_dl_url}'` 下载新版本（第 273 行）
  - 但 `.next` 的删除在第 278 行，在下载（第 273 行）和验证之间
- Problem: 如果 GitHub Release 下载失败（网络超时、GitHub 宕机、Release 被删除），前端已经处于损坏状态。旧版本已被删除，新版本未成功安装——前端服务将完全不可用，直到手动恢复。
- Why it matters: 这是经典的原子性违规（atomicity violation）。部署要么完全成功，要么完全失败并回滚。当前实现允许"部分失败"状态——前端被删除但未替换。
- Minimal fix: 将新版本下载并解压到临时目录（如 `/tmp/polis-web-new`），验证解压完整性后，再原子性地将旧版本移动到备份目录并替换为新版本。
- Better long-term fix: 使用符号链接原子切换：维护 `current -> polis-web-v1` 和 `current -> polis-web-v2` 的符号链接切换。部署失败时只需将符号链接指回旧版本。
- Regression test suggestion: 编写部署脚本的集成测试，模拟下载失败，验证旧版本完好无损。
- Estimated effort: 2 hours

#### Finding: 无自动化回滚机制

- Severity: High
- Confidence: High
- Category: Release
- Status: Confirmed
- Affected area: 部署流程
- Evidence:
  - File: `deploy.sh` — 备份到 `/root/polis/target/release/backup-DATE` 但无自动恢复逻辑
  - 回滚需要手动 SSH 登录服务器并从备份目录复制文件
- Problem: 部署失败后无法快速恢复。运维人员需要 SSH 到服务器、找到正确的备份目录、手动复制文件——这在凌晨 2 点的生产事故中是慢速且易出错的。
- Minimal fix: 添加 `deploy.sh --rollback` 选项，自动从最新备份恢复。
- Estimated effort: 3 hours

#### Finding: 文档系统性过时和矛盾

- Severity: High
- Confidence: High
- Category: Release
- Status: Confirmed
- Affected area: 文档体系
- Evidence:
  - `CLAUDE.md:155` 声称 pre-deploy-check.sh 有 "14 类风险"
  - `CLAUDE.md:174` 声称 "12类风险"
  - 实际脚本包含 19 个编号检查（check 1-19）
  - `README.md:116` 声称 "36+ files" 迁移，实际 35 个文件
  - `ARCHITECTURE.md:14` 将 polis-aggregate 标记为"未部署"，但 deploy.sh 包含它
  - `README.md:1548` 说 PostgreSQL 16，`docs/DEV-SETUP.md:9` 说 PostgreSQL 15+
  - `Cargo.toml` edition 为 "2021"，但某处声称 Rust 2024
- Problem: 不一致的文档不是一个维护问题——它是可操作的虚假信息。新开发者根据 README 安装 PostgreSQL 16，但 DEV-SETUP 假设 15。开发者阅读 CLAUDE.md 预期 12 或 14 类检查，但实际有 19 类——这些数字上的矛盾是真实的认知摩擦。
- Minimal fix: 对所有文档进行一次统一审查，建立单一事实来源。将可变的数字（服务数、迁移数、检查数）从多处引用改为引用单一配置文件。
- Estimated effort: 4 hours

#### Finding: 前端 tarball 打包缺少 standalone 复制步骤验证

- Severity: Medium
- Confidence: High
- Category: Release
- Status: Confirmed
- Affected area: 部署流程
- Evidence:
  - `deploy.sh:289-293` — 部署后必须手动执行 `cp -r ${SERVER_WEB_DIR}/.next/static ${SERVER_WEB_DIR}/.next/standalone/.next/static`
  - CLAUDE.md 明确警告："不执行 → /_next/static/* 全部 404 → 页面白屏"
  - 此步骤已在 systemd `ExecStartPre` 中自动化（`deploy.sh:314`），但首次部署时如果忘记执行，页面立即白屏
- Problem: 部署脚本中有一个已知的"不执行就白屏"步骤。虽然 systemd 服务文件包含了备用复制逻辑，但部署脚本本身的可靠性依赖这个手动步骤的正确执行。
- Minimal fix: 在部署脚本中添加验证步骤——部署后检查 `.next/standalone/.next/static` 目录是否存在且包含文件。
- Estimated effort: 30 minutes

## 5. Security Concerns

### 认证与授权
- **JWT 在 localStorage** — XSS 可提取令牌，攻击面包括所有 14 个 npm 依赖
- **Refresh token 未使用** — 注销不撤销令牌，泄露后无防护
- **Auth 中间件 11 处重复** — 认证逻辑不一致，修复可能遗漏
- **Symmetric HS256** — JWT 密钥为对称密钥，所有服务共享，任一服务泄露即全部受损

### 数据保护
- **密码重置令牌明文日志** — 最严重的安全漏洞，令牌等同临时密码
- **XOR 钱包密钥加密** — 非密码学安全，链上资产面临风险
- **无数据加密** — 数据库字段级别无加密，敏感用户数据明文存储
- **密钥管理** — 仅环境变量，无 Vault/HSM，无密钥轮换

### 注入防御
- **dangerouslySetInnerHTML 无 DOMPurify** — XSS 攻击向量开放
- **format! SQL 动态列名** — 潜在 SQL 注入路径
- **无 CSP header** — 缺少 XSS 纵深防御层
- **无输入净化框架** — 每个端点自行处理输入验证，不一致

## 6. Stability Concerns

### Error Propagation
- **106 unwrap/expect** — 任何一处 panic 终止进程
- **127 空 catch** — 前端错误静默消失
- **43 let _ = 忽略错误** — 数据库写入失败被丢弃
- **xp_bridge 无重试** — 跨服务调用失败静默丢弃

### Failure Recovery
- **无熔断器** — 下游服务故障持续传播
- **网关 1 次重试** — 无指数退避，可能加重故障
- **无死信队列** — 异步事件失败无恢复
- **deploy.sh 非原子部署** — 部分失败状态

### Resource Management
- **无查询超时** — 慢查询无限持有连接
- **无连接池配置** — 使用 sqlx 默认值
- **限流仅内存** — 多网关实例不共享限流状态

## 7. Performance Concerns

### Database
- **88 SELECT \*** — 阻止 index-only scan，浪费 I/O
- **185 原始 SQL** — 无 query plan 缓存
- **排序分支爆炸** — `list_posts` 20+ 排序组合，每个重复 COUNT+SELECT
- **无查询超时** — 慢查询可耗尽连接池

### Caching
- **热数据无 Redis** — trending/leaderboard 每次直接查库
- **前端无 SWR/stale-while-revalidate** — 每次导航重新获取全部数据
- **namespace 缓存仅内存** — `spaceNsCache` 在 `resolveSpaceNs` 中仅存活于页面生命周期

### Frontend
- **无图片优化** — next/image 使用不充分
- **大组件无 Code Splitting** — SpacePageClient 1974 行一次性加载
- **无 Bundle 分析** — 无 webpack-bundle-analyzer 配置

## 8. Testing Gaps

### 覆盖空白
| 区域 | 覆盖率 | 风险 |
|------|--------|------|
| polis-user (认证) | 0% | 登录/注册/密码重置无测试 |
| polis-space (社区) | 0% | 社区 CRUD/权限无测试 |
| polis-content (内容) | 0% | 帖子/评论/投票无测试 |
| polis-gateway (网关) | 0% | 路由/限流无测试 |
| polis-admin (管理) | 0% | 审核/举报无测试 |
| polis-video (视频) | 0% | 上传/流无测试 |
| web 前端 | 0% | 33168 行 TypeScript 无测试 |
| polis-chain (区块链) | 有限 | 仅 6 个文件有单元测试 |
| polis-core (核心) | 有限 | 仅序列化 roundtrip 测试 |

### 缺失的测试类型
- API 集成测试 — 无 testcontainers 实际使用
- E2E 测试 — 无 Playwright/Cypress
- 负载测试 — 无 k6/artillery
- Fuzz 测试 — 无 cargo-fuzz
- 基于属性的测试 — rstest 声明但未使用
- 前端组件测试 — 无 Vitest/Jest

## 9. Maintainability Concerns

### 文件大小违规
13 个 Rust 文件超过 500 行可维护性阈值：
- `repo.rs` (1980 行) — 严重超标
- `models.rs` (1843 行) — 严重超标
- `content_routes.rs` (1713 行) — 严重超标
- `content_handler.rs` (1698 行) — 严重超标
- `main.rs` (polisctl, 1402 行)
- `creation.rs` (handler, 1007 行)
- `admin_handler.rs` (892 行)
- `network/api.rs` (883 行)
- `routes.rs` (admin, 832 行)
- `repo.rs` (space, 777 行)
- `space_handler.rs` (648 行)
- `user_handler.rs` (616 行)
- `main.rs` (gateway, 533 行)

### 代码重复
- **Claims 结构** — 11 个位置重复定义
- **Config 结构** — 11 个 crate 重复 from_env() 模式
- **auth_middleware** — 5 个服务各有独立实现
- **列表查询模式** — repo.rs 中 20+ 个排序分支重复相同的 COUNT + SELECT 模式

### 前端复杂度
- **SpacePageClient** (1974 行) — 单体组件，49 状态、18 tab
- **PostPageClient** (979 行) — 帖子详情单体
- **ProfilePageClient** (952 行) — 个人资料单体
- **api.ts** (1247 行) — 单文件包含所有 API 调用
- **549 any 类型** — 类型安全大范围绕过

## 10. Design / Principles Concerns

### Principles Violated

| 原则 | 违规次数 | 严重度 | 影响区域 |
|------|---------|--------|---------|
| Single Responsibility (1.1) | 13+ | High | repo.rs, content_handler, SpacePageClient 等 |
| File Size Limit (1.2) | 13 | High | 13 个文件 > 500 行 |
| DRY (4.1) | 22+ | High | Claims 11x, Config 11x, auth middleware 5x |
| Fail-Fast (4.4) | 169+ | High | 127 空 catch, 43 let _ =, 106 unwrap |
| Don't Swallow Errors (6.1) | 170+ | High | 空 catch, let _ =, 静默降级 |
| Fail on Missing Config (9.2) | 7+ | Medium | Gateway fallback URLs 硬编码 localhost |
| KISS (4.3) | 1 | Medium | 手动 URL 解析替代 axum Path extractor |
| Principle of Least Privilege (4.6) | 1 | Medium | JWT_SECRET 在所有服务间共享 |
| Timeout Every External Call (10.4) | Multiple | High | 185 SQL 无超时, xp_bridge 无超时 |
| YAGNI (4.2) | 2 | Medium | Refresh token 死代码, 未使用的测试依赖 |
| Explicit Dependencies (7.3) | Multiple | Medium | 各处 `std::env::var("JWT_SECRET")` |
| Configuration Over Hardcoding (9.1) | 8+ | Medium | 8 个 Gateway fallback URL 硬编码 |

### Principles Respected
- **Composition Over Inheritance** — Rust 的 trait 系统自然鼓励组合
- **Meaningful Names** — 整体命名清晰（handler/repo/routes 分层命名一致）
- **Arrange-Act-Assert** — 现有测试结构清晰
- **Dependency Rule** — 分层架构合理，依赖方向从外到内
- **Environment Separation** — 通过环境变量区分环境
- **High Cohesion** — 各 crate 职责划分清晰（content 太大是例外）

## 11. Release Concerns

### CI/CD
- CI 无测试步骤 — 代码质量无自动化保障
- CI 构建列表与 deploy.sh 不同步 — polis-aggregate 遗漏
- CI 和本地编译使用不同的链接器 — zig cc vs 原生 gcc
- 无分支保护规则 — 无必须通过的 check

### 部署原子性
- deploy.sh 先删除 .next 再下载 — 下载失败 = 前端损坏
- 无自动化回滚 — 需要手动 SSH 恢复备份
- 无金丝雀/蓝绿部署 — 全量替换无流量切换

### 文档
- CLAUDE.md 自相矛盾 — 12 vs 14 vs 19 风险检查
- README 迁移数错误 — 35 实际 vs 36+ 声称
- ARCHITECTURE.md 部署状态错误 — aggregate "未部署" vs deploy.sh 包含
- DEV-SETUP PostgreSQL 版本与 README 不一致 — 15+ vs 16
- Cargo edition 标注可能过时 — 显示 "2021"

## 12. Fallback / Defensive Code Analysis

### Fallback Summary

| Subtype | Count | KeepWithAlert | FailFast | Remove |
|---------|-------|---------------|----------|--------|
| SilentFallback | 40+ | 10 | 30+ | 0 |
| EmptyCatch | 127 | 0 | 127 | 0 |
| CompatibilityBranch | 5 | 3 | 2 | 0 |
| SilentCorrection | 8+ | 0 | 8+ | 0 |
| DefensiveGuess | 15+ | 5 | 10+ | 0 |

关键发现：
- **resolveSpaceNs 的双重 try-catch (api.ts:122-145)** — 先调用 trending API 搜索 space，失败后调用 spaces API，都失败后返回原始 ID。这是三重防御性猜测——应直接调用 spaces API 并在 404 时快速失败。
- **Gateway 硬编码 localhost fallback** — 8 个下游服务 URL 在配置缺失时静默回退到 `http://localhost:3XXX`。在生产环境中，缺失配置应启动失败而非连接到错误的 localhost。
- **dotenvy::dotenv().ok() 在 8 个 crate 中** — .env 文件缺失时静默跳过，服务使用空白配置启动（然后因 DATABASE_URL 缺失在运行时崩溃）。

## 13. Testing Authenticity Analysis

### Confidence Assessment

| Test Area | Real Confidence | Risk | Action |
|-----------|---------------|------|--------|
| polis-core/tests/models_test.rs | Low | 仅测试序列化 roundtrip，不测试业务逻辑 | Keep (基础检查) |
| polis-chain/src/mempool.rs | Medium | 测试核心区块链逻辑 | Keep |
| polis-chain/src/consensus/ | Medium | 测试共识算法 | Keep |
| polis-chain/src/mining/ | Medium | 测试挖矿逻辑 | Keep |
| polis-user (全部) | None | 零测试，认证逻辑无验证 | 需从头构建 |
| polis-space (全部) | None | 零测试，权限逻辑无验证 | 需从头构建 |
| polis-content (全部) | None | 零测试，核心业务逻辑无验证 | 需从头构建 |
| polis-gateway (全部) | None | 零测试，路由/限流无验证 | 需从头构建 |
| web 前端 (全部) | None | 零测试，UI 行为无验证 | 需从头构建 |

### Valuable Tests
- `polis-chain` 的 6 个测试文件 — 测试实际的区块链逻辑（mempool 操作、验证器、共识、挖矿轮次）
- `polis-core` 的 mention/hashtag/resolver 单元测试 — 测试解析逻辑

### Suspicious Tests
- `models_test.rs` — 仅序列化/反序列化 roundtrip，不是业务逻辑测试
- 部分 polis-chain 测试使用硬编码随机种子 — 确定性但覆盖有限

### Missing Tests (关键路径)
- 用户注册 → 登录 → 发帖 → 评论 → 点赞的完整 E2E 流程
- 密码重置令牌生命周期（生成 → 使用 → 过期）
- 社区权限模型（public/private/unlisted + 密码保护）
- 并发请求下的限流行为
- 数据库连接池耗尽时的优雅降级

## 14. Type Safety Analysis

### Summary

| Subtype | Count | Critical | High | Medium | Low |
|---------|-------|----------|------|--------|-----|
| TypeAssertion (as any, as Type) | 549 | 0 | 5 | 100 | 444 |
| InputBoundary | 8+ | 1 | 3 | 4 | 0 |
| OutputLeak | 3 | 0 | 1 | 2 | 0 |
| BooleanTrap | 5+ | 0 | 0 | 5 | 0 |
| StringlyTyped | 15+ | 0 | 5 | 10 | 0 |
| ErrorType | 20+ | 0 | 0 | 15 | 5 |

关键发现：
- **549 `any` 类型** — TypeScript 的类型安全被大面积绕过
- **`serde_json::Value` 作为 API 响应类型** — 多处 handler 返回 `Vec<serde_json::Value>` 代替正确的类型
- **Claims struct 中 token_type 时有时无** — 某些服务验证 token_type=access，其他服务不验证
- **Gateway config 的 String 类型化端口** — 端口存储为 String 而非 u16
- **模块类型表示为字符串** — `module_type: String` 而非枚举（"forum", "wiki", "video" 等）

## 15. Frontend State Analysis

### Summary

| Subtype | Count | Affected Components |
|---------|-------|-------------------|
| ComponentSize | 8 | SpacePageClient (1974行), PostPageClient (979), ProfilePageClient (952), api.ts (1247), ContentCard (699), FeedLayout (510), MilkdownEditor (436), CherryEditor (332) |
| StateDuplication | 4 | api.ts + 各组件内重复的 fetch 逻辑 |
| PropDrilling | 5 | SpacePageClient → 内嵌面板 |
| EffectChain | 8 | SpacePageClient 多个 useEffect 依赖链 |
| UIBusinessCoupling | 6 | FeedLayout 嵌入排序/过滤逻辑, api.ts 耦合请求+缓存 |
| DOMasState | 3 | 多处通过 DOM 读取/设置状态 |
| RequestState | 12 | 每个页面手动管理 loading/error/data 状态 |
| RenderPerf | 5 | 大列表无虚拟化, 无 React.memo 使用 |

关键发现：
- **SpacePageClient 状态爆炸** — 49 个 useState 无分组
- **api.ts 巨型文件** — 1247 行单文件包含所有 API 函数，混合请求逻辑和缓存管理
- **无状态管理库的最佳实践** — zustand 已安装但使用不足，大部分状态在组件内用 useState 管理
- **Effect 链** — SpacePageClient 中的 useEffect 之间通过 state 隐式耦合

## 16. Backend API Analysis

### Summary

| Subtype | Count | Affected Endpoints |
|---------|-------|-------------------|
| ApiConsistency | 8 | 响应格式不一致 (ApiResponse vs raw Json), 路径风格混合 (/api/auth/* vs RESTful) |
| Validation | 12 | 输入验证缺乏统一层, body 字段手动检查 |
| Auth | 5 | 5 个独立 auth 中间件, token_type 验证不一致 |
| NplusOne | 5 | 帖子列表 → author/likes/bookmarks 单独查询 |
| Caching | 6 | trending/leaderboard 无缓存 |
| ErrorResponse | 10 | AppError 覆盖广泛但某些 handler 返回裸 String 错误 |
| BusinessLogic | 3 | forgot_password 总是返回成功（防枚举）但日志泄露令牌 |
| DataFlow | 4 | XP bridge 无保障, NATS 事件可能丢失 |

关键发现：
- **响应信封一致性** — 大部分使用 `{code, data, message}` 但部分端点返回裸 JSON
- **输入验证分散** — 每个 handler 自行实现验证，无共享验证中间件
- **API 版本控制缺失** — 无 `/api/v1/` 前缀规划
- **manual query parsing** — content_routes 中使用手动 query 解析代替 axum Query extractor

## 17. Dependency Weight Analysis

### Dependency Scoreboard

| Dependency | Status | Weight | Recommended Action |
|------------|--------|--------|-------------------|
| cherry-markdown@0.11.0 | Monitor | Heavy (纯 JS Markdown 引擎) | 考虑升级到最新版或替换为更轻量的 marked |
| marked@18.0.2 | Healthy | Medium | 保留（已在使用） |
| next@14.2.0 | Healthy | Heavy | 考虑升级到 Next.js 15（React 19 支持） |
| react@18.3.0 | Healthy | Heavy | 保留，与 Next.js 14 配套 |
| zustand@4.5.0 | Healthy | Light | 保留，更多利用 |
| recharts@3.8.1 | Overweight | Heavy (图表库) | 仅管理后台使用，可考虑懒加载 |
| hls.js@1.6.16 | Healthy | Medium | 视频播放必需 |
| jszip@3.10.1 | Healthy | Medium | 文件导出使用 |
| turndown@7.2.4 | Healthy | Light | Markdown 转换 |
| rstest@0.22 | Underused | Light | 声明但几乎未使用 |
| testcontainers@0.23 | Underused | Medium | 声明但几乎未使用 |
| zig (系统依赖) | Fragile | N/A | 交叉编译必需，zig 不可用 = 无法部署 |

依赖总数：Rust workspace 包含 18 个 crate + 大量传递依赖，前端仅 14 个直接依赖 + 8 个开发依赖。

## 18. Code Consistency Analysis

### Patterns Found

**命名风格**：
- Rust: snake_case 一致（handler、repo、routes、models 命名一致）
- TypeScript: camelCase 一致，但部分文件混用 PascalCase 和 camelCase 文件名

**导入组织**：
- Rust: `use` 语句大部分按 std → 第三方 → crate 分组，但部分文件混序
- TypeScript: 导入大部分按类型 → 库 → 本地组件分组

**错误处理模式**：
- Rust: Some 返回 `Result<_, AppError>` 正确传播，其他使用 `unwrap()` 或 `let _ =`
- TypeScript: 127 个空 catch + 部分 try/catch with console.error + 少数正确设置 error state

**文件结构**：
- Rust: routes → handlers → repo 三层一致，但各 crate 实现细节差异大
- TypeScript: app/ 下 page.tsx + ClientComponent 模式一致

**API 路径风格**：
- 混合使用 `/api/auth/*`、`/api/users/*`、`/api/spaces/*` 前缀
- RESTful 别名正在添加（如 `/api/users/{username}/follow`）

## 19. Comment Coverage Analysis

### Documentation Gaps

**Rust 文档缺失**：
- `models.rs` (1843 行) — 许多 pub struct 缺少文档注释，仅有 9 行注释开头
- `repo.rs` (1980 行) — 0 行文档注释开头
- Gateway 配置 — 无文档说明下游服务 fallback URL 的行为
- Auth 中间件 — 无文档说明 Claims 验证逻辑差异

**TypeScript 文档缺失**：
- `api.ts` (1247 行) — 大部分 API 函数无 JSDoc
- `SpacePageClient.tsx` (1974 行) — 组件职责说明缺失
- 复杂 hooks/effects — 无注释说明触发条件和副作用

**过时注释**：
- 部分 TODO 注释包含已部署的功能
- ARCHITECTURE.md 中的部署状态与实际不符

**文档亮点**：
- CLAUDE.md 架构铁律部分文档质量高
- README.md 架构图清晰
- DESIGN-PHILOSOPHY.md 概念解释到位
- API 文档通过 rust-analyzer 的类型推断提供部分自文档化

## 20. Documentation Accuracy

### Doc vs Code Mismatches

| 文档 | 声称 | 实际 |
|------|------|------|
| CLAUDE.md:155 | 14 类风险检查 | pre-deploy-check.sh 有 19 个检查 |
| CLAUDE.md:174 | 12 类风险 | 同脚本有 19 个检查 |
| README.md:116 | 36+ 迁移文件 | migrations/ 目录有 35 个文件 |
| ARCHITECTURE.md:14 | polis-aggregate "未部署" | deploy.sh RUST_BINARIES 包含它 |
| README.md:1548 | PostgreSQL 16 | DEV-SETUP.md:9 说 PostgreSQL 15+ |
| Cargo.toml | edition = "2021" | 某处引用 Rust 2024 |
| ARCHITECTURE.md:23 | "已部署 7 个服务" | deploy.sh 部署 7 个 Rust + 1 个 web = 8 个 systemd 服务 |
| README.md c8 统计 | "crates count" 可能不对 | 实际 18 个 crate 目录 |

## 21. Configuration Safety

### Hardcoded Values

- **8 个 Gateway fallback URL** — 全部硬编码 `http://localhost:3XXX`（config.rs:33-48）
- **邀请链接** — `user_handler.rs:589` 硬编码 `https://mzgw.com/invite`
- **MeiliSearch URL** — `search/config.rs:20` 硬编码 fallback `http://localhost:7700`
- **JWT_SECRET 访问** — 各处使用 `std::env::var("JWT_SECRET").expect(...)` 而非统一配置结构

### Unsafe Defaults

- **RATE_LIMIT_PER_MINUTE 默认 60** — 合理的默认值但无文档
- **Body limit 60MB 通用 / 600MB 视频** — 上限偏高
- **无 `statement_timeout` 数据库默认** — PostgreSQL 默认无限等待
- **无连接池大小配置** — sqlx 使用默认值
- **redis_url 无默认值** — 缺失时服务可能不启动（取决于实现）

### Environment Separation

- **无显式环境变量** — 没有 `ENV=production` 检查
- **8 个 dotenvy::dotenv().ok()** — .env 文件缺失时静默跳过
- **tracing level 无文档** — 不清楚生产环境日志级别

## 22. Observability

### Logging

- **tracing 已集成** — 整个 Rust 代码库使用 `tracing` crate
- **日志级别混乱** — `forgot_password` 在 info 级别记录敏感令牌，而关键业务操作可能仅在 debug 级别
- **前端无遥测** — 无 ErrorBoundary 日志上报，空 catch 不产生任何日志
- **无结构化日志规范** — 日志字段不一致

### Metrics

- **无指标导出** — 无 Prometheus endpoint，无 `/metrics`
- **无请求延迟直方图** — 无法监控 P50/P95/P99 延迟
- **无数据库连接池指标** — 无法监控连接池饱和
- **无业务指标** — 无注册数、发帖数、活跃用户数监控

### Tracing

- **无分布式追踪** — 无 OpenTelemetry 集成，跨服务请求无法追踪
- **请求 ID 可能缺失** — 无统一的 `X-Request-Id` 传递

## 23. Principles Compliance

### Principles Violated

| 原则 | 违规次数 | 严重度 | 影响区域 |
|------|---------|--------|---------|
| Single Responsibility (1.1) | 13+ | High | content_handler (13 职责), SpacePageClient (18 tab) |
| File Size Limit (1.2) | 13 | High | repo.rs 1980 行, models.rs 1843 行等 |
| Function Size (1.3) | 40+ | Medium | 多个 handler 函数超过 50 行 |
| DRY (4.1) | 22+ | High | Claims 11x, Config 11x, auth middleware 5x |
| Fail-Fast (4.4) | 170+ | High | 127 空 catch, 43 let _ =, 静默 fallback |
| Don't Swallow Errors (6.1) | 170+ | High | 同上 |
| Don't Lose Error Context (6.2) | 40+ | Medium | let _ = 丢弃原始错误 |
| Fail on Missing Config (9.2) | 8+ | Medium | Gateway fallback localhost, dotenvy ok() |
| Timeout Every External Call (10.4) | 185+ | High | SQL 查询无超时, xp_bridge 无超时 |
| No Hidden Side Effects (5.3) | 3 | Medium | forgot_password 记录令牌到日志（副作用） |
| Explicit Dependencies (7.3) | Multiple | Medium | JWT_SECRET 通过 std::env::var 获取 |
| Configuration Over Hardcoding (9.1) | 10+ | Medium | 8 Gateway URL, 邀请链接, MeiliSearch URL |

### Principles Respected

- **Composition Over Inheritance (7.4)** — Rust trait 系统鼓励组合，无深层继承
- **Meaningful Names (3.4)** — 命名整体清晰，分层一致性好
- **Dependency Rule (7.1)** — routes → handlers → repo 分层正确
- **Environment Separation (9.3)** — 配置通过环境变量注入
- **High Cohesion (2.2)** — 各 crate 职责划分合理

## 24. Recommended Fix Order

### Fix Immediately (可能导致数据丢失、安全漏洞或服务宕机)

1. **移除 forgot_password 日志中的令牌** — 30 分钟
2. **fix deploy.sh 原子性问题** — 先下载验证，再删除旧版 — 2 小时
3. **同步 CI 构建列表和 deploy.sh** — 添加 polis-aggregate 到 CI — 15 分钟
4. **在 CI 中添加 cargo test** — 1 小时

### Fix Before Stable Release (降低可靠性、正确性或安全性)

5. **将 JWT 从 localStorage 迁移到 httpOnly cookie** — 4 小时
6. **为 dangerouslySetInnerHTML 添加 DOMPurify 净化** — 8 小时
7. **实现 token 撤销端点** — 2 天
8. **为 SQL 查询添加 statement_timeout** — 1 小时
9. **替换 XOR 钱包加密为 AES-256-GCM** — 1 天
10. **为 trending/leaderboard 添加 Redis 缓存** — 4 小时
11. **添加 CSP header** — 2 小时

### Schedule Later (增加维护成本或限制规模)

12. **消除所有 unwrap/expect** — 1 周
13. **统一 Claims 定义** — 2 小时
14. **统一 Config 模式** — 3 小时
15. **拆分 repo.rs 1980 行** — 3 天
16. **拆分 SpacePageClient 1974 行** — 3 天
17. **为内容服务添加集成测试** — 2 周
18. **为前端添加 Vitest 测试** — 3 周
19. **替换 SELECT * 为明确列列表** — 4 小时
20. **同步所有文档中的数字** — 4 小时

### Ignore for Now (低严重度、理论风险、样式偏好)

21. recharts 懒加载优化
22. 样式统一（tailwind 类名组织）
23. 部分过时 TODO 注释清理
24. 导入语句排序统一

## 25. Quick Wins

| 修复 | 时间 | 影响 |
|------|------|------|
| 移除日志中的令牌 | 30 min | 消除最高严重度安全漏洞 |
| CI 添加 cargo test | 1 hour | 建立自动化回归保护 |
| SQL statement_timeout | 1 hour | 防止慢查询耗尽连接池 |
| 统一 Claims 定义 | 2 hours | 消除 11 处认证不一致 |
| 统一 Config 模式 | 3 hours | 消除 11 处配置重复 |
| 同步部署文档 | 4 hours | 消除误导信息 |
| 添加 CSP header | 2 hours | XSS 纵深防御 |
| DOMPurify 净化 | 8 hours | 消除 XSS 攻击向量 |
| localStorage → cookie | 4 hours | 防止令牌 XSS 泄露 |
| deploy.sh 原子化 | 2 hours | 防止部署失败导致服务不可用 |

## 26. Long-term Refactor Plan

### 1. 内容服务领域拆分
- **Motivation**: polis-content 过于庞大（7000+ 行），repo.rs 1980 行、content_handler 1698 行、content_routes 1713 行。修改任何功能都影响整个大文件。
- **Approach**: 按领域拆分为独立模块：post、comment、poll、series、chat、tip、notification、file、webhook。每个领域有自己的 handler + repo + routes。
- **Risk**: 高。涉及最多最复杂的业务逻辑，需充分测试保障。
- **Testing Strategy**: 拆分前先为核心功能（帖子 CRUD、评论 CRUD、投票）编写集成测试建立基线。

### 2. 前端 Space 页面模块化
- **Motivation**: SpacePageClient 1974 行、49 个状态、18 个 tab，是前端最大的单点故障。任何 tab 的修改都可能意外影响其他 tab。
- **Approach**: 将每个 tab 提取为独立功能组件，通过 zustand store 管理共享状态。使用 React.lazy + Suspense 按需加载 tab 内容。
- **Risk**: 中。拆分大型 React 组件的风险可管理，但需要充分测试每个 tab 的独立行为。
- **Testing Strategy**: 为每个 tab 组件编写 Vitest 渲染测试 + Playwright E2E 测试验证 tab 切换。

### 3. 认证统一
- **Motivation**: 5 个服务各有独立的 auth 中间件和 Claims 定义，不一致的 token_type 验证。安全修复可能只应用于部分服务。
- **Approach**: 将 auth 中间件提取到 polis-core，各服务使用统一的 `auth_middleware`。实现完整的 token 生命周期管理（颁发、刷新、撤销）。
- **Risk**: 低。auth 逻辑已存在，主要是代码移动和统一。
- **Testing Strategy**: 编写全面的认证集成测试（注册、登录、token 验证、token 过期、token 撤销）。

## Appendix: Codebase Statistics

| Metric | Value |
|--------|-------|
| Rust source files | 179 |
| Rust lines of code | ~31,842 |
| TypeScript/TSX files | 201 |
| TypeScript/TSX lines | ~33,168 |
| Rust crates | 18 |
| Deployed services | 7 (gateway, user, space, content, admin, video, aggregate) + web |
| Database migrations | 35 |
| Total findings | 141 (8 Critical, 15 High, 84 Medium, 34 Low) |
| Pre-deploy automated checks | 19 |
| npm direct dependencies | 14 |
| npm dev dependencies | 8 |
