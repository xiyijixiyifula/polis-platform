# 回归追踪地图

> 记录"修复 A → 导致/发现 B 复发"的因果链。每次发现回归时追加一条链。

## 统计

| 指标 | 数值 |
|------|------|
| 回归链总数 | 5 |
| 跨层回归（后端↔前端） | 1 |
| 同层回归 | 4 |
| 涉及脆弱文件 | 8 |

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
| `crates/polis-core/src/types.rs` | Chain #5 | 1 | Visibility 枚举必须与 DB visibility 有效值同步 |

## 如何使用本文件

1. **修 bug 前** — 查脆弱文件清单，确认要修改的文件是否有回归历史
2. **修 bug 后** — 如果发现修复导致了其他问题，在此追加回归链
3. **部署前** — 扫一遍回归链，确认本次修改不会触发已知回归
