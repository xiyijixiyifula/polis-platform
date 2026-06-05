# 回归追踪地图

> 记录"修复 A → 导致/发现 B 复发"的因果链。每次发现回归时追加一条链。

## 统计

| 指标 | 数值 |
|------|------|
| 回归链总数 | 9 |
| 跨层回归（后端↔前端） | 1 |
| 同层回归 | 6 |
| 涉及脆弱文件 | 11 |

## 回归链

### Chain #1: URL 双重编码 — 跨层扩散

```
v0.2.54 后端 fix (handle_public_path)
    ↓ 同一根因，不同函数
v0.2.57 后端 fix (parse_content_path)  ← 回归 #1
    ↓ 同一根因，扩散到前端
v1.0.11 前端 fix (ProfilePageClient)   ← 回归 #2
```

| 属性 | 值 |
|------|-----|
| **根因** | 对已编码值再次 encodeURIComponent |
| **脆弱层** | 后端路由层 + 前端客户端组件 |
| **触发条件** | URL params 含中文等非 ASCII 字符 |
| **扩散路径** | 后端 handle 函数 → 前端 useEffect API 调用 |
| **根除方案** | 建立统一的参数安全解码工具函数（尚未实施） |

### Chain #2: macOS xattr 部署污染 — 流程回归

```
v0.3.91 本地打包 fix (COPYFILE_DISABLE=1)
    ↓ 未固化为文档/脚本
v0.3.95 再次污染  ← 回归 #1
    ↓ 写入 CLAUDE.md 铁律
已根除
```

| 属性 | 值 |
|------|-----|
| **根因** | macOS tar 默认附带 AppleDouble 和 xattr 扩展头 |
| **脆弱点** | 部署流程（非代码层面） |
| **触发条件** | 每次本地 `tar` 打包时忘记 `COPYFILE_DISABLE=1` |
| **根除方案** | CLAUDE.md 部署铁律 + auto-dev.sh 固化 |

### Chain #3: .map() 防空 — 系统性缺失

```
v0.2.x 原始代码（多处 .map() 无防空）
    ↓
v1.0.8 大扫除 fix（14 处 .map() 加 ?.）
    ↓ 新页面/新组件仍会遗漏
v0.3.72 内容管理页复发  ← 回归 #1
```

| 属性 | 值 |
|------|-----|
| **根因** | API 返回 null/undefined 时前端未做防御性检查 |
| **脆弱点** | 所有使用 `.map()` 的前端组件 |
| **触发条件** | API 返回空数据或异常响应 |
| **根除方案** | ESLint 规则强制 `?.map()` 或 `(arr ?? []).map()`（尚未实施） |

### Chain #4: post_count 不同步 — 多路径遗漏

```
v0.2.x content_handler::create_post（更新 post_count）← 唯一正确的路径
    ↓ 新增加创作中心投稿路径
v1.0.14 creation::submit_to_community（遗漏 post_count +1）← 回归 #1
    ↓ 新增加对话流发布路径  
v1.0.14 thread_handler::publish（遗漏 post_count +1）← 回归 #2
```

| 属性 | 值 |
|------|-----|
| **根因** | spaces.post_count 只在部分 INSERT INTO posts 路径中更新 |
| **脆弱点** | 所有执行 INSERT INTO posts 的代码路径 |
| **触发条件** | 新增 posts 创建路径时未复制 post_count +1 逻辑 |
| **扩散路径** | content_handler → creation → thread_handler |
| **根除方案** | 数据库触发器或统一抽象层（尚未实施）；修复配方已编写 |

### Chain #5: Visibility 枚举不同步 — 审核系统新增 DB 值引发序列化 Bug

```
v1.0.18 Feature (审核系统新增 visibility='hidden')
    ↓ DB 写入 'hidden' 但 Visibility enum 无此变体
v1.0.18 Bug (隐藏帖子 API 返回 visibility: public)
    ↓ serde_json 反序列化 "hidden" 失败 → unwrap_or_default() → Visibility::Public
    ↓ 同时 PostPublic 使用 post.visibility (原始值) 而非 effective_visibility
```

| 属性 | 值 |
|------|-----|
| **根因** | `types.rs::Visibility` enum 与 DB `visibility` 列的有效值不同步 |
| **脆弱点** | 所有 `serde_json::from_str(format!("\"{}\"", post.visibility))` 的转换点 |
| **触发条件** | 新增 DB visibility 值但未更新 Visibility enum + Display + serde rename |
| **扩散路径** | admin_handler (SET visibility='hidden') → content_handler (读取) → PostPublic (序列化) |
| **预防方案** | 新增 visibility 值时 search `enum Visibility` → 同步添加变体 + Display |

### Chain #6: atob URL-safe base64 — JWT 编码标准认知缺失

```
v1.0.26 Feature (社区管理页)
    ↓ ManagePageClient.tsx 使用 atob(token.split('.')[1]) 解码 JWT payload
v1.0.29 Bug (管理页按钮无反应)  ← 首次发现
    ↓ base64url (-/_) 不兼容 atob() → InvalidCharacterError → catch → redirect
    ↓ PostPageClient.tsx 同名问题 (getCurrentUserId 静默失败)
```

| 属性 | 值 |
|------|-----|
| **根因** | JWT 标准使用 base64url 编码，JavaScript atob() 仅支持标准 base64 |
| **脆弱点** | 所有调用 atob() 解码 JWT payload 的前端代码 |
| **触发条件** | JWT token payload 需要 base64url→standard 转换 |
| **根除方案** | 统一使用 jwt-decode 等库，或封装工具函数处理转换 |

### Chain #7: 模块系统部署回归链 — 多环节复合

```
v1.0.30 Feature (自定义模块系统 — 后端+前端)
    ↓ 1. Gateway 路由误判 → modules 请求打到 content 服务
v1.0.31 Bug (proxy_space_router is_content 误判) ← 回归 #1
    ↓ 2. 部署后前端仍是旧版 → SpaceModulesManager 未更新
v1.0.32 Bug (前端打包遗漏) ← 回归 #2
    ↓ 3. handle_auth_path actions 数组遗漏 → "Space not found"
v1.0.32 Bug (actions-array-missing) ← 回归 #3
    ↓ 4. DELETE 路由映射错误 → 模块删除 404
v1.0.32 Bug (DELETE route mapping) ← 回归 #4
    ↓ 5. 编译目标错误 → macOS 二进制部署，修复未生效
v1.0.32 Bug (wrong-build-target) ← 回归 #5
```

| 属性 | 值 |
|------|-----|
| **根因** | 新增功能需要 4 个独立环节同步更新（Gateway路由/actions数组/DELETE handler/编译target），缺乏自动化同步机制 |
| **脆弱点** | space_routes.rs (actions数组) + gateway/main.rs (is_content条件) + 部署脚本 (target路径) |
| **触发条件** | 新增 space 服务端点时未逐项检查所有同步点 |
| **扩散路径** | space_routes → gateway → 部署流程 → 前端打包 |
| **根除方案** | 1) 自动化部署脚本检查 ELF 格式；2) 重构 handle_auth_path 从路由自动提取 actions；3) 部署后冒烟测试

## 脆弱文件清单

这些文件多次出现在修复记录中，修改时需额外注意：

| 文件 | 涉及回归链 | 修复次数 | 注意事项 |
|------|-----------|----------|----------|
| `web/src/app/spaces/[namespace]/...` | Chain #1 | 2 | params 值必须先 decode 再 encode |
| `web/src/app/users/[username]/...` | Chain #1 | 1 | 同上 |
| 部署脚本/流程 | Chain #2 | 2 | 必须 `COPYFILE_DISABLE=1` |
| 所有含 `.map()` 的组件 | Chain #3 | 15+ | 必须 `?.map()` 或 `?? []` |
| `crates/polis-content/src/handlers/creation.rs` | Chain #4 | 1 | 新增 INSERT INTO posts 必须同步 post_count |
| `crates/polis-content/src/handlers/thread_handler.rs` | Chain #4 | 1 | 同上 |
| `crates/polis-content/src/routes/content_routes.rs` | — | 3 | POST/PUT 操作前需检查 `block_private_space_public_listing` |
| `crates/polis-space/src/routes/space_routes.rs` | — | 5 | 新增 actions_suffixes + actions 数组项时保持同步 |
| `crates/polis-space/src/repo.rs` | — | 5 | COALESCE vs CASE WHEN 空值清除语义区分 |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | — | 9 | 社区页面核心组件，修改时审查所有状态依赖 |
| `web/src/lib/api.ts` | — | 4 | 新增 API 方法注意 ApiResponse<T> 包装类型 |
| `web/src/app/create/page.tsx` | — | 2 | title 参数检查 + deriveSlug 正则字符集维护 |
| `web/src/app/post/[id]/PostPageClient.tsx` | Chain #9 | 2 | atob URL-safe base64 转换 + 模块标签硬编码 |
| `crates/polis-core/src/types.rs` | Chain #5 | 1 | Visibility 枚举必须与 DB visibility 有效值同步 |
| `web/src/app/space/manage/[...namespace]/ManagePageClient.tsx` | — | 2 | 管理页核心 (v1.0.28 React批处理修复失败 + v1.0.29 atob修复) |
| `crates/polis-space/src/routes/space_routes.rs` | Chain #7 | 7 | actions 数组 + DELETE 路由映射 — 任何新端点都需双处同步 |
| `crates/polis-gateway/src/main.rs` | Chain #7 | 4 | is_content/is_video 条件 — 新增 space 端点要排除 |

### Chain #9: 模块标签硬编码回退 — 架构缺陷暴露路径

```
v1.0.30 Feature (自定义模块系统)
    ↓ 自定义模块键（如 mod_4167432e）不在 MODULE_CONFIG 中
    ↓ getModuleLabel() → '交流', normalizeModuleType() → 'forum'
v1.0.40 Bug (面包屑显示'交流') ← 首次发现（部分修复）
    ↓ 仅修复 PostCard + SpacePageClient 面包屑，未改核心库函数
v1.0.41 Bug (全面修复) ← 复发 #1
    ↓ ROOT CAUSE: module-config.ts 4个函数/常量全部有'交流'/'forum'硬编码回退
	    ↓ 连带修复: ContentCard/PostCard/SpacePageClient/ProfilePageClient/PostPageClient/creations+后端API
	    ↓ v1.0.41 概览区 route fallback `|| 'posts'` 导致自定义模块帖子泄漏到交流Tab
v1.0.43 Bug (route fallback 回归修复) ← 复发 #2
```

| 属性 | 值 |
|------|-----|
| **根因** | MODULE_CONFIG 是静态封闭字典，但自定义模块可无限创建。核心库函数对未知 key 返回硬编码 fallback 而非透传原始值 |
| **脆弱点** | module-config.ts (getModuleLabel, normalizeModuleType, getModuleLabelByContentType, MODULE_ALIASES) + SpacePageClient.tsx (route fallback `|| 'posts'`) |
| **触发条件** | 任何不在 MODULE_CONFIG 中的模块键被传入核心库函数；route 查找 fallback 为硬编码值 |
| **扩散路径** | module-config.ts → ContentCard → PostCard → SpacePageClient → ProfilePageClient → PostPageClient → creations/new |
| **根除方案** | 核心库函数对未知 key 透传自身（而非折叠为 'forum'/'交流'），后端 API 返回 module_name；route fallback 应使用 module_type 自身而非硬编码 'posts' |

### Chain #8: 模块Tab键值不匹配 — 功能实现遗留

```
v1.0.30 Feature (动态模块系统 — 动态Tab生成)
    ↓ Tab id 使用 m.module_key（如 forum），渲染块匹配 route 名（如 posts）
v1.0.34 Bug (模块Tab点击空白) ← 首次发现
    ↓ 自定义模块 key（如 mod_1ade9c1d）完全无渲染块匹配
```

| 属性 | 值 |
|------|-----|
| **根因** | 动态Tab系统使用 module_key 作为标识符，但渲染块条件使用 MODULE_CONFIG route 名，两个键空间不一致 |
| **脆弱点** | SpacePageClient.tsx: availableTabs 的 id 字段 + JSX 渲染块的 activeTab 比较 |
| **触发条件** | 社区使用任何 module_key ≠ route 名的模块（如 forum→posts, mod_xxx→无匹配） |
| **扩散路径** | v1.0.30 动态模块 → SpacePageClient 渲染逻辑 |
| **根除方案** | 统一使用 MODULE_CONFIG 映射 + 通用 fallback 渲染块 |

## 脆弱文件清单

这些文件多次出现在修复记录中，修改时需额外注意：

| 文件 | 涉及回归链 | 修复次数 | 注意事项 |
|------|-----------|----------|----------|
| `web/src/app/spaces/[namespace]/...` | Chain #1 | 2 | params 值必须先 decode 再 encode |
| `web/src/app/users/[username]/...` | Chain #1 | 1 | 同上 |
| 部署脚本/流程 | Chain #2 | 2 | 必须 `COPYFILE_DISABLE=1` |
| 所有含 `.map()` 的组件 | Chain #3 | 15+ | 必须 `?.map()` 或 `?? []` |
| `crates/polis-content/src/handlers/creation.rs` | Chain #4 | 1 | 新增 INSERT INTO posts 必须同步 post_count |
| `crates/polis-content/src/handlers/thread_handler.rs` | Chain #4 | 1 | 同上 |
| `crates/polis-content/src/routes/content_routes.rs` | — | 3 | POST/PUT 操作前需检查 `block_private_space_public_listing` |
| `crates/polis-space/src/routes/space_routes.rs` | — | 5 | 新增 actions_suffixes + actions 数组项时保持同步 |
| `crates/polis-space/src/repo.rs` | — | 5 | COALESCE vs CASE WHEN 空值清除语义区分 |
| `web/src/app/space/[...namespace]/SpacePageClient.tsx` | Chain #8, Chain #9 | 11 | 社区页面核心组件，修改时审查所有状态依赖 |
| `web/src/lib/api.ts` | — | 4 | 新增 API 方法注意 ApiResponse<T> 包装类型 |
| `web/src/app/create/page.tsx` | — | 2 | title 参数检查 + deriveSlug 正则字符集维护 |
| `web/src/app/post/[id]/PostPageClient.tsx` | Chain #9 | 2 | atob URL-safe base64 转换 + 模块标签硬编码 |
| `crates/polis-core/src/types.rs` | Chain #5 | 1 | Visibility 枚举必须与 DB visibility 有效值同步 |
| `web/src/app/space/manage/[...namespace]/ManagePageClient.tsx` | — | 2 | 管理页核心 (v1.0.28 React批处理修复失败 + v1.0.29 atob修复) |
| `crates/polis-space/src/routes/space_routes.rs` | Chain #7 | 7 | actions 数组 + DELETE 路由映射 — 任何新端点都需双处同步 |
| `crates/polis-gateway/src/main.rs` | Chain #7 | 4 | is_content/is_video 条件 — 新增 space 端点要排除 |
| `web/src/app/creations/new/page.tsx` | Chain #8, Chain #9 | 3 | 模块类型简化 + 动态模块联动 — 修改时确保 MODULE_CONFIG 映射完整 |
| `web/src/lib/module-config.ts` | Chain #9 | 1 | **模块标签体系基石** — getModuleLabel/normalizeModuleType/getModuleLabelByContentType/MODULE_ALIASES 任一修改影响全局 |
| `web/src/components/ContentCard.tsx` | Chain #9 | 2 | 首页Feed/探索/搜索核心组件 — adaptCreationItem/adaptFeedItem 影响所有列表页模块标签 |

## 修复影响矩阵 (Fix Impact Matrix)

> **用法**: 修改某个文件/区域时，查此表了解可能引发的回归。
> 行 = 你正在修改什么，列 = 可能触发哪些已知 Bug。

| 修改区域 | 可能触发回归的 Bug Pattern | 风险等级 | 验证方法 |
|----------|--------------------------|----------|----------|
| 新增 space 端点 (`space_routes.rs`) | actions-array-missing, gateway-route-missing, delete-route-mapping | 🔴 | curl 测试端点 + 检查 Gateway 日志 |
| 新增 Gateway 路由 (`main.rs`) | proxy_space_router is_content 误判 | 🔴 | curl 通过域名测试，确认后端收到请求 |
| 新增 posts 创建路径 | post-count-sync (post_count 不更新) | 🔴 | SQL 验证 `post_count` vs `COUNT(*)` |
| 新增前端表单组件 | missing-form-field (useState vs JSX 不匹配) | 🟡 | 手动测试表单提交流程 |
| 涉及 URL 参数中文 | url-double-encoding (%25 双重编码) | 🔴 | Network 面板检查 API URL |
| 修改 `atob()` 调用 | atob-base64url (JWT 解码失败) | 🟡 | console 测试 `atob(token.split('.')[1])` |
| 修改 `Visibility` 枚举 | visibility-enum-sync (序列化失败) | 🔴 | API 返回的 visibility 值与 DB 一致 |
| 修改部署脚本/流程 | deploy-path-mismatch, wrong-build-target, xattr-contamination | 🔴 | MD5 对比 + `file` 检查二进制格式 |
| 新增 `handle_auth_path` 端点 | actions-array-missing (命名空间提取失败) | 🔴 | curl 直连后端测试 |
| 修改 `.map()` 调用 | array-map-null (白屏) | 🟡 | console 无 TypeError |
| 修改 `module-config.ts` 核心函数 | module-breadcrumb-hardcoded (全局模块标签错误) | 🔴 | 首页/社区/个人主页/帖子详情/创作中心面包屑全部正确 |

---

## Bug DNA — 根因分类体系

> 将每个 Bug 按根因分类（非按症状分类），识别系统性缺陷。
> 每修复一个 Bug，对照此体系标记其 DNA 类别。

### 根因类别

| 类别 | 代码 | 说明 | 示例 | 修复数 | 占比 |
|------|------|------|------|--------|------|
| 路由注册不完整 | RTE-REG | 新增端点未在所有路由注册点同步 | Gateway路由/actions数组/DELETE mapper | 5 | 7.4% |
| 编码/解码错误 | RTE-ENC | URL/Base64/字符集编解码不规范 | URL双重编码/atob base64url | 4 | 5.9% |
| 状态同步遗漏 | RTE-SYNC | 数据变更后未同步更新计数器/缓存 | post_count/评论计数 | 3 | 4.4% |
| 部署流程缺陷 | DEP-FLOW | 打包/传输/重启流程中的错误 | xattr污染/路径不匹配/编译target | 7 | 10.3% |
| 类型/枚举不同步 | RTE-TYPE | DB schema 变更后类型定义未同步 | Visibility::Hidden缺失 | 2 | 2.8% |
| 键值映射不一致 | RTE-MAP | 两个键空间使用不同标识符系统 | module_key vs route 名 | 1 | 1.4% |
| 表单/UI 不完整 | UI-FORM | useState 字段与 JSX input 不一致 | 密码字段缺失 | 2 | 2.8% |
| 空值/异常处理缺失 | RTE-NULL | 未对 null/undefined 做防御性处理 | .map() 防空 | 15+ | 22.1% |
| 安全/认证缺陷 | SEC-AUTH | 权限检查遗漏/凭据泄露 | 私有空间权限/硬编码密码 | 5 | 7.4% |
| 依赖/版本问题 | DEP-VER | 依赖自动升级导致不兼容 | cherry-markdown 0.11.2 | 1 | 1.5% |
| 配置/环境不一致 | CFG-ENV | 环境变量/配置文件不同步 | admin_code 文件 vs env | 2 | 2.9% |
| 其他 | OTHER | 不属于以上类别 | — | 22 | 32.4% |

### DNA 分布洞察

```
🔴 部署流程缺陷 (DEP-FLOW): 10.3% — 最高风险的类别，每次部署都可能触发
🔴 路由注册不完整 (RTE-REG): 7.4% — 新增功能时最容易遗漏
🟡 空值/异常处理 (RTE-NULL): 22.1% — 数量最多，但危害相对可控（白屏 vs 数据损坏）
🟢 依赖/版本问题 (DEP-VER): 1.5% — 已通过版本锁定大幅降低
```

### 每类优先根治方案

| 类别 | 短期措施 | 长期根治 |
|------|---------|---------|
| RTE-REG | 预防清单 + 自动化脚本检查 | 路由自动注册宏（编译期强制同步） |
| RTE-ENC | 统一编解码工具函数 | 所有 API 调用走统一 HTTP client |
| RTE-SYNC | SQL 触发器或 ORM hook | 事件驱动架构 (CQRS/Event Sourcing) |
| DEP-FLOW | pre-deploy-check.sh 自动化 | CI/CD pipeline (GitHub Actions) |
| RTE-TYPE | grep 检查 + code review | 编译期类型检查 (sqlx prepare) |
| UI-FORM | React Hook Form + Zod schema | E2E 表单测试自动化 |
| RTE-NULL | ESLint 规则 + TypeScript strict | API 响应 schema 校验（运行时） |
| SEC-AUTH | 中间件统一权限门控 | OPA/OpenFGA 策略引擎 |

---

## 修复有效性评分 (Fix Effectiveness Score)

> 量化每次修复的"耐久度"。评分越低 → 越容易复发 → 越需要升级到架构层修复。

### 评分公式

```
有效性评分 = 基础分(100) - 复发扣分 - 时间衰减 - 范围扣分

- 复发扣分: 每复发 1 次 -30 分
- 时间衰减: 每存活 <7 天 -20 分，7-30 天 -10 分
- 范围扣分: 修复涉及 >10 个点位 -15 分（多点修复容易遗漏）
```

### 各修复有效性排行

| 排名 | 修复 | 版本 | 存活天数 | 复发次数 | 评分 | 状态 |
|------|------|------|----------|----------|------|------|
| 1 | pre-deploy-check.sh (19类自动化) | v1.0.32 | 持续有效 | 0 | 🟢 95 | 活跃 |
| 2 | Argon2 密码哈希 | v1.0.13 | 持续有效 | 0 | 🟢 95 | 稳定 |
| 3 | JWT exp 显式校验 | v1.0.13 | 持续有效 | 0 | 🟢 95 | 稳定 |
| 4 | zip-slip 路径穿越修复 | v1.0.13 | 持续有效 | 0 | 🟢 95 | 稳定 |
| 5 | CASE WHEN 空值清除 | v1.0.15 | 持续有效 | 0 | 🟢 90 | 稳定 |
| 6 | COPYFILE_DISABLE=1 | v0.3.91 | 4天→根除 | 1 | 🟡 70 | 已根除 (铁律固化) |
| 7 | post_count +1 同步 | v1.0.14 | — | 1 | 🟡 70 | 需配方+自动化 |
| 8 | URL-safe base64 转换 | v1.0.29 | — | 0 | 🟢 85 | pre-deploy 自动检查 |
| 9 | Gateway 路由补充 | v1.0.22 | — | 1 | 🟡 60 | 每次新增端点手动维护 |
| 10 | actions 数组同步 | v1.0.32 | — | 1 | 🟡 60 | 手动维护，易遗漏 |
| 11 | module-breadcrumb 硬编码修复 | v1.0.41 | 2天 | 2 | 🔴 35 | 架构重构进行中 |
| 12 | module-tab-key 键值统一 | v1.0.34 | — | 1 | 🟡 55 | 重构进行中 |
| 13 | URL 双重编码 (前端) | v1.0.11 | — | 3 | 🔴 25 | 需架构层统一 |

### 解读

```
🟢 ≥80 分 — 有效修复，不太可能复发
🟡 50-79 分 — 需要监控，建议增强自动化检查
🔴 <50 分 — 高危，应提升至架构层修复（Stage 4）
```

---

## 如何使用本文件

1. **修 bug 前** — 查脆弱文件清单 + 修复影响矩阵，确认要修改的文件是否有回归历史
2. **修 bug 后** — 如果发现修复导致了其他问题，在此追加回归链
3. **部署前** — 扫一遍回归链 + 运行 `scripts/pre-deploy-check.sh`，确认本次修改不会触发已知回归
4. **修完新 bug** — 在 DNA 分类体系中标记其类别，累计统计数据用于识别系统性问题
