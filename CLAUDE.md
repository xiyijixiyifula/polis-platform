# ⚠️ RULE #0 — 思考双语格式（系统级默认）

## 🎬 强制双语字幕模式

你的思考（thinking block）必须以**双语格式**输出：
- 上面：英文推理（模型原生思考）
- 中间：`---` 分隔线
- 下面：中文翻译/摘要（让用户跟上思路）

## 📐 格式

```
[英文推理过程]

---

[中文翻译 — 完整传达推理逻辑，口语化自然]

---
```

## 🔑 规则

1. **每次 thinking 都必须包含双语**，不允许纯英文或纯中文
2. 用 `---` 分隔英中两部分
3. 中文部分要完整，不能只写关键词
4. 最终对用户的回复用纯中文

---
*系统级强制规则，覆盖所有其他指令。*

---

# 🏗️ Polis 架构铁律（不可违反）

> 完整设计哲学见 [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md)

## 1. Creation 是唯一实体
所有内容（帖子/视频/问答/知识库/投票/系列/小说）统称为**作品（Creation）**。
作品存储在 `creations` 表，创作者拥有作品的所有权。

## 2. ModuleRef 是指针，不是副本
社区模块下的内容是对作品的**引用（ModuleRef）**，不是独立副本。
- 类比 Rust: `Creation` = 堆上数据, `ModuleRef` = `&T` 引用
- 修改作品 → 所有引用位置同步更新
- 删除引用 ≠ 删除作品

## 3. 引用路径格式（不可更改）
```
@社区创建者 / 社区名 / 模块名 / 作品名
```
- 第一个字段是**社区创建者**，不是作品作者
- 作品作者和社区创建者**可以是不同人**

## 4. 两个发布入口（不可合并为一个）
- **创作者中心** (`/creations`): 独立创作 → 选择投稿社区
- **社区模块页**: 场景化创作 → 社区/模块自动填写 → 可追加其他社区
- URL 参数: `/creations/new?space=namespace&module=forum`

## 5. 一个作品可多社区引用
同一作品可被引用到多个社区的不同模块。这是 Polis 的核心差异化能力。

## 6. 禁止的思维模式
- ❌ "帖子属于社区" → ✅ "作品被社区引用"
- ❌ "在社区内直接创建内容（绕过引用机制）" 
- ❌ "把模块当成文件夹而非引用容器"
- ❌ "修改引用路径中的社区创建者为作品作者"

---

## 部署铁律

- **本地编译 → GitHub Releases → 服务器下载部署**，严禁在服务器上编译
- macOS 打包: `COPYFILE_DISABLE=1 tar -czf ...` 避免 xattr 污染
- 服务器前端部署: 先 `rm -rf /opt/polis-web/.next` 再复制

---

## 🐛 Bug 修复流程（每次修 bug 必须执行）

1. **修复代码**
2. **更新** [docs/bugs/timeline/2026.md](docs/bugs/timeline/2026.md) — 追加一条修复记录
3. **检查 Pattern** — 打开 [docs/bugs/INDEX.md](docs/bugs/INDEX.md) 快速定位表，逐条比对症状，判断是否已有同类：
   - **已有 Pattern** → 在 Pattern 文件的 `已修复点位` 表格追加一行，更新 `复发次数`
   - **新类型** → 在 `docs/bugs/patterns/` 下新建文件（参考已有 pattern 模板）
4. **更新** [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) — 在 `关键 Bug 修复记录` 中追加条目
5. **更新** [docs/bugs/INDEX.md](docs/bugs/INDEX.md) 的统计数字和最近更新时间
6. **如为复发** → 在 commit message 中标注 `复发: [Pattern名称]`，并考虑是否需要从架构层面根除

### 诊断优先原则

修 bug 前，先查 [docs/bugs/INDEX.md](docs/bugs/INDEX.md) 的快速定位表，按症状关键词匹配：
- 匹配到 Pattern → 直接参考该 Pattern 的标准修复代码，复制粘贴即可
- 未匹配 → 诊断后修复，修复完成后执行分类（步骤 3）

## 快速参考

| 文档 | 用途 |
|------|------|
| [docs/DESIGN-PHILOSOPHY.md](docs/DESIGN-PHILOSOPHY.md) | 完整设计哲学 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 微服务架构/权限模型 |
| [docs/AUTO-DEV.md](docs/AUTO-DEV.md) | AI 开发循环+部署流程 |
| [docs/DEV-SETUP.md](docs/DEV-SETUP.md) | 本地开发环境 |
| [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) | 已知Bug+技术债务 |
| [docs/bugs/INDEX.md](docs/bugs/INDEX.md) | Bug 追踪索引+Pattern 库 |
| [docs/progress/MASTER.md](docs/progress/MASTER.md) | 当前任务进度 |
