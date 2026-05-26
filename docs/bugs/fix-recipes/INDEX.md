# 修复配方索引

> 当 Bug 复发时，按症状关键词查表 → 找到配方 → 复制粘贴修复 → 验证。
> **不需要重新诊断。**

## 快速查表

| 我看到什么？ | 用什么配方？ | 修复耗时 |
|-------------|-------------|----------|
| 中文页面/API 返回 404，URL 含 `%25` | [url-double-encoding.md](url-double-encoding.md) | 5 分钟 |
| 部署后 UI 错乱，CSS 和本地不一致 | [xattr-contamination.md](xattr-contamination.md) | 10 分钟 |
| 页面白屏，console 报 `x.map is not a function` | [array-map-null.md](array-map-null.md) | 2 分钟/处 |
| npm 包升级后编辑器/组件报错 | [dependency-auto-upgrade.md](dependency-auto-upgrade.md) | 15 分钟 |
| 社区帖子计数与实际不符，分析数据为 0 | [post-count-sync.md](post-count-sync.md) | 10 分钟 |

## 配方结构

每个配方文件包含：
1. **症状** — 如何识别这个 bug
2. **一键诊断** — 复制粘贴运行，确认是否命中
3. **标准修复** — 复制粘贴的修复代码
4. **验证方法** — 确认修复成功的步骤
5. **相关回归** — 这个修复可能引发的其他问题

## 如何新增配方

1. bug 修复完成后，在 `fix-recipes/` 下新建 `{pattern-name}.md`
2. 按上述结构填写
3. 在本文件追加一行到查表
4. 更新 [INDEX.md](../INDEX.md) 的统计数据
