---
symptoms: [API返回的module_type始终是forum, content_type始终是text, 自定义模块帖子在tab中不显示, 数据已存入DB但序列化后丢失]
keywords: [module_type, content_type, 枚举, 序列化, serde_json, unwrap_or_default, 自定义模块, 数据丢失]
severity: high
recipe: docs/bugs/fix-recipes/enum-serialization-data-loss.md
fix_time: 5min/处
diagnosis_cmd: grep -rn 'serde_json::from_str.*unwrap_or_default' crates/ --include="*.rs"
---

# 枚举序列化数据丢失

## 元信息

- **首次出现**: v1.0.39
- **复发次数**: 0
- **最近一次**: v1.0.39
- **严重程度**: 🔴 高 — 自定义模块帖子在 Tab 中不可见，用户以为数据丢失
- **影响范围**: 所有使用 `serde_json::from_str().unwrap_or_default()` 做枚举反序列化的代码

## 根因

`PostPublic` 结构体的 `module_type` 和 `content_type` 字段类型为 `ModuleType` 和 `ContentType` 枚举。代码中使用以下模式构造：

```rust
module_type: serde_json::from_str(&format!("\"{}\"", p.module_type)).unwrap_or_default(),
content_type: serde_json::from_str(&format!("\"{}\"", p.content_type)).unwrap_or_default(),
```

当 DB 中存储的 `module_type` 值为 `"mod_4167432e"`（自定义模块键）时：
1. `ModuleType` 枚举没有 `Custom(String)` variant
2. `serde_json::from_str()` 反序列化失败
3. `unwrap_or_default()` 返回 `ModuleType::Forum`（默认值）
4. 序列化时输出 `"forum"`

同样，`content_type` 值 `"article"` 不是 `ContentType` 枚举的合法 variant，也会丢失为 `ContentType::Text` → `"text"`。

## 修复

**变更 1**: 将 `PostPublic` 的字段类型从枚举改为 `String`

```rust
// 修改前
pub module_type: ModuleType,
pub content_type: ContentType,

// 修改后
pub module_type: String,
pub content_type: String,
```

**变更 2**: 所有构造点用 `.clone()` 替代 `serde_json round-trip`

```rust
// 修改前
module_type: serde_json::from_str(&format!("\"{}\"", p.module_type)).unwrap_or_default(),

// 修改后
module_type: p.module_type.clone(),
```

## 预防

1. **禁止使用** `serde_json::from_str().unwrap_or_default()` 做类型转换 — 这是无声的数据丢失
2. 对于来自 DB 的字符串字段，直接用 `String` 类型而非枚举
3. 如需将枚举用于验证，在 HTTP 边界做校验，内部传递用 String

## 已修复点位

| 版本 | 日期 | 文件 | 修复内容 |
|------|------|------|----------|
| v1.0.39 | 2026-05-29 | `crates/polis-core/src/models.rs:33` | module_type: ModuleType → String |
| v1.0.39 | 2026-05-29 | `crates/polis-core/src/models.rs:37` | content_type: ContentType → String |
| v1.0.39 | 2026-05-29 | `crates/polis-content/src/handlers/content_handler.rs` (5处) | serde_json round-trip → .clone() |
| v1.0.39 | 2026-05-29 | `web/src/app/space/[...namespace]/SpacePageClient.tsx:379` | mtFilter 纳入动态自定义模块键 |
