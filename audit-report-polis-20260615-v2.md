# Fuck My Shit Mountain 审计报告 v2

**项目:** Polis Platform  
**审计模式:** full (15 维度)  
**日期:** 2026-06-15  
**审查者:** Claude Opus 4.8 + 6 并行 AI 审计 Agent  
**对比基准:** v1 报告 (6.3 → 7.0→8.5 S-grade sprint)

---

## 1. 执行摘要

经过 Phase 1-5 的 S-grade sprint 改造后，Polis Platform 的安全性和稳定性显著提升。但深度审计发现了 **漏掉的关键问题**：XP Bridge 端点无认证、Admin JWT 缺失 jti、多个服务仍使用原始 NATS 连接、poly-chain 的 let _ = 修复未实际执行。前端仍有大量空 catch 块在静默吞噬错误。

好消息：所有 8 个后端服务正常运行 (HTTP 200)，clippy 零警告，性能指标改善 (N+1 批量化、连接池 90 < 100、索引完善)。

### 评分仪表板

```
Security        ██████░░░░  6.0  B    XP bridge无认证; Admin JWT无jti; 4服务缺少blacklist持久化加载
Stability       ███████░░░  7.0  A    Gateway last_error.unwrap(); 12处let _ = 未修复; bind_wallet unwrap
Performance     ████████░░  8.0  A    N+1批量化; 连接池优化; 索引完善; ChatRoom无限增长
Testing         █████░░░░░  5.0  B    16/18 crates零Rust测试; 仅1个integration test; CI跳过集成测试
Maintainability ███████░░░  7.0  A    部分修复声称完成但未实际执行; 重复代码; 7个未用依赖
Design          ███████░░░  7.0  A    NATS重连未全覆盖; recharts声称删除但仍在; 架构一致性良好
Release         ████████░░  7.5  A    CI完整; 部署流程可靠; npm audit有漏洞
─────────────────────────────────────
Overall         ███████░░░  6.8  B+
```

### 发现统计

| 严重度 | 数量 | 已确认 | 可疑 |
|--------|------|--------|------|
| Critical | 5 | 5 | 0 |
| High | 14 | 12 | 2 |
| Medium | 18 | 17 | 1 |
| Low | 10 | 10 | 0 |
| Info | 6 | 6 | 0 |
| **总计** | **53** | **50** | **3** |

---

## 2. 线上验证 (浏览器测试)

| 页面/API | 状态 | 内容 |
|----------|------|------|
| 首页 / | HTTP 200 | 9条动态正常渲染 |
| /explore | HTTP 200 | 9个社区列表完整 |
| /about | HTTP 200 | 品牌页面正常 |
| /changelog | HTTP 200 | 更新日志正常 |
| /wallet | HTTP 200 | 钱包页面正常 |
| /login | HTTP 200 | 登录表单正常 |
| /register | HTTP 200 | 注册表单正常 |
| /api/health | HTTP 200 | Gateway 运行中 |
| /api/health/all | HTTP 200 | 5个服务全部healthy |
| /api/spaces/trending | HTTP 200 | 趋势数据正常 |
| /api/feed | HTTP 200 | Feed数据正常 |
| 移动端响应式 | ✅ | 375px 正常渲染 |

---

## 3. 关键发现 (Top 15)

| # | 发现 | 严重度 | 摘要 |
|---|------|--------|------|
| 1 | XP Bridge端点无认证 | **CRITICAL** | 任何人都可通过 /api/internal/xp/award 给任意用户加XP |
| 2 | Token blacklist仅1个服务加载 | **CRITICAL** | 4个服务使用空blacklist，已撤销token仍可用 |
| 3 | Admin JWT无jti字段 | **CRITICAL** | Admin token无法单独撤销，仅依赖过期时间 |
| 4 | Gateway last_error.unwrap() | **CRITICAL** | 重试失败后可能导致Gateway panic |
| 5 | 12处 let _ = 修复未执行 | HIGH | #243标记完成但代码未实际修改 |
| 6 | polis-search/pay缺少NatsReconnect | HIGH | 仍使用原始async_nats::connect，无重连 |
| 7 | bind_wallet try_into().unwrap() | HIGH | 恶意公钥输入导致用户服务panic |
| 8 | 40+ serde unwrap_or_default | HIGH | 序列化错误被静默转换为空JSON |
| 9 | 前端空catch块残留 | HIGH | api.ts/utils.ts等核心文件仍有静默错误处理 |
| 10 | recharts声称删除但仍在源码中 | MEDIUM | package.json+链上源码均有残留 |
| 11 | ChatRoom HashMap无限增长 | MEDIUM | 闲聊房间数据永不清理 |
| 12 | tokio::spawn无JoinHandle | MEDIUM | 20+spawn在shutdown时可能丢失 |
| 13 | 7个未使用的workspace依赖 | MEDIUM | Cargo.toml和Cargo.lock中的孤包 |
| 14 | Next.js安全漏洞 | HIGH | npm audit发现高危漏洞 |
| 15 | Admin暴力破解仍未防护 | CRITICAL | Agent登录无速率限制 |

---

## 4. 维度详细发现

### 4.1 Security (安全)

#### SEC-01: CRITICAL — XP Bridge端点无任何认证
- **文件:** `crates/polis-user/src/routes/user_routes.rs:40`
- **证据:** `/api/internal/xp/award` 在 public Router 中，不在 auth Router 中。任何知道该端点的人都能调用它给任意用户增加 XP。
- **攻击场景:** 攻击者curl POST到 /api/internal/xp/award，为自己无限刷 XP
- **修复:** 将端点移入 auth Router 或添加内部服务间共享密钥验证
- **工时:** 30分钟

#### SEC-02: CRITICAL — Token blacklist只被polis-user加载
- **文件:** `crates/polis-content/src/main.rs`, `crates/polis-space/src/main.rs`, `crates/polis-video/src/main.rs`, `crates/polis-notify/src/main.rs`
- **证据:** 迁移038添加了token_blacklist表，TokenBlacklist::load_from_db()方法存在，但只有 polis-user/main.rs 调用了它。其他4个服务在启动时创建空黑的blacklist。
- **影响:** 已登出的token在这些服务中仍有效
- **修复:** 在4个服务的main.rs中添加load_from_db()调用
- **工时:** 1小时

#### SEC-03: CRITICAL — Admin JWT 缺少 jti
- **文件:** `crates/polis-admin/src/auth.rs`
- **证据:** `AdminClaims` 结构体没有 `jti` 字段。Admin token签发后无法被单独撤销
- **修复:** 在AdminClaims中添加jti字段，logout时将jti加入blacklist
- **工时:** 1小时

#### SEC-04: CRITICAL — Admin Agent登录无速率限制
- **文件:** `crates/polis-admin/src/routes.rs`
- **证据:** 上次审计修复声称添加了暴力破解防护，但Agent登录端点确实没有速率限制
- **修复:** 添加速率限制中间件
- **工时:** 1小时

#### SEC-05: HIGH — 前端空catch块残留
- **文件:** `web/src/lib/api.ts`, `web/src/lib/utils.ts`
- **证据:** api.ts中的request函数在401时清除token但未传播错误；utils.ts中的formatCount有try-catch静默返回原始值
- **修复:** 添加console.error日志或toast通知
- **工时:** 1小时

### 4.2 Stability (稳定性)

#### STB-01: CRITICAL — Gateway last_error.unwrap()
- **文件:** `crates/polis-gateway/src/main.rs:591`
- **证据:** `Err(last_error.unwrap())` — 当前仅在重试耗尽后执行，技术上是安全的，但如果重构很容易变成致命panic
- **修复:** 用match/if-let替换unwrap
- **工时:** 15分钟

#### STB-02: HIGH — 12处 let _ = 修复未实际执行
- **文件:** `crates/polis-chain/src/network/api.rs` (行107,211,371,376,386,400,508,626,693,734), `sync.rs` (行84,130)
- **证据:** 任务#243标记为已完成，但代码中的 `let _ = state.storage.put_account_state(...)` 等12处仍未修改。这些静默忽略存储写入/发送失败
- **修复:** 添加 `if let Err(e) = ... { tracing::error!(...) }` 日志
- **工时:** 1小时

#### STB-03: HIGH — bind_wallet try_into().unwrap()
- **文件:** `crates/polis-user/src/handlers/bind_wallet.rs:92`
- **修复:** 用 `.map_err()` 替换 `.unwrap()`
- **工时:** 10分钟

#### STB-04: MEDIUM — shutdown.rs unwrap()
- **文件:** `crates/polis-core/src/shutdown.rs:14`
- **修复:** 用 `.ok()` + pending() 回退替换 .unwrap()
- **工时:** 10分钟

### 4.3 Performance (性能)

#### PERF-01: MEDIUM — ChatRoom HashMap无限增长
- **文件:** `crates/polis-chat/src/room.rs:17`
- **证据:** `rooms: Arc<Mutex<HashMap<String, ChatRoom>>>` — 永不移除，每创建一个聊天室就增加内存占用
- **修复:** 添加TTL驱逐或最大房间数限制
- **工时:** 30分钟

#### PERF-02: MEDIUM — polis-content routes.rs .expect()
- **文件:** `crates/polis-content/src/routes/content_routes.rs:1227`
- **证据:** 运行时HTTP响应构建的expect，若失败则整个服务panic
- **修复:** 替换为优雅的错误处理
- **工时:** 15分钟

### 4.4 Testing (测试)

- **16/18 crates零Rust测试** — 仅 polis-core (39测试) 和 polis-chain (26测试) 有覆盖
- **1个集成测试** — polis-user/tests/integration_test.rs，需要testcontainers
- **CI跳过集成测试** — DATABASE_URL检查在CI=true时跳过
- **frontend 6文件46测试** — 大部分为浅层导出验证

### 4.5 Maintainability (可维护性)

- **7个未使用的workspace依赖** — 包括 polis-code, polis-export 等几乎为空的crate
- **recharts声称删除但未删除** — package.json中仍有 `recharts` 依赖
- **克隆的TokenBlacklist** — polis-user/src/token_blacklist.rs 在迁移到 polis-core 后未删除

---

## 5. 冲击 S 级路线图 (6.8 → 9.0)

### Phase 1: 修复认证缺口 (2-3h, 6.8 → 7.5)
1. XP Bridge端点添加认证 ⚡ CRITICAL
2. 4个服务加载token blacklist ⚡ CRITICAL
3. Admin JWT添加jti + Admin暴力破解防护
4. Gateway unwrap修复

### Phase 2: 完成未完成的修复 (3-5h, 7.5 → 8.0)
5. 12处 let _ = 错误日志
6. polis-search/pay添加NatsReconnect
7. bind_wallet unwrap + shutdown unwrap
8. 删除重复TokenBlacklist
9. 删除recharts依赖

### Phase 3: 消除静默错误 (4-6h, 8.0 → 8.5)
10. 40+ serde unwrap_or_default → 用 ? 传播
11. 前端空catch块 → 添加日志
12. ChatRoom添加TTL驱逐
13. tokio::spawn JoinHandle跟踪

### Phase 4: 测试覆盖 (10-15h, 8.5 → 9.0)
14. polis-user handler集成测试 (testcontainers)
15. polis-content repo集成测试
16. polis-space handler集成测试
17. 前端e2e测试CI集成
18. npm audit修复 + Next.js更新

**总估计工时: 20-30小时**

---

> 📊 **报告生成:** 2026-06-15 by Claude Opus 4.8 + 6 parallel AI agents | **53 findings** | 5 Critical | 14 High | 18 Medium | 10 Low | 6 Info | 审计覆盖率: 18 Rust crates + Next.js frontend + 浏览器E2E验证
