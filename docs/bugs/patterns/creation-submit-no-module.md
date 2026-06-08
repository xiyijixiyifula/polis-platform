# Pattern: 创作者中心投稿参数缺失

## 标识符
`creation-submit-no-module`

## 症状
- 从社区模块页面点击"发布"跳转到创作者中心
- 创作内容成功但模块中看不到任何作品引用
- submissions 数组为空，投稿 API 从未调用

## 根因
1. 社区 tab 链接只传 `space=` 参数，未传 `module=`
2. 创作者中心预填逻辑 `if (prefillSpaceNs && prefillModule)` 严格要求两个参数都存在
3. 投稿 API 的 catch 块静默吞掉错误 → 用户感知不到投稿失败

## 修复配方
1. 检查社区到创作者中心的所有链接，补充 `&module={module_key}` 参数
2. 创作者中心添加兜底逻辑：无 module 参数时自动获取社区第一个可用模块
3. 投稿 API 错误从 `console.error` 改为用户可见的 toast 提示
4. 验证流程：创建作品 → 检查 submissions 数组 → 确认社区帖子列表可见

## 预防措施
- 所有跨页面的参数传递必须逐页验证完整性
- 条件判断 `if (A && B)` 需考虑缺省值兜底
- API 调用失败必须用户可见，不得静默吞错

## 已修复点位

| 版本 | 文件 | 问题 | 修复日期 |
|------|------|------|----------|
| v0.3.x | TabRenderer.tsx:216, creations/new/page.tsx:169 | URL缺module→投稿跳过 | 2026-06-08 |
