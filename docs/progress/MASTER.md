# 当前任务进度

> 最后更新: 2026-05-27

## 追踪模式

LOCAL_ONLY

## 当前状态

**活跃任务**: 平台功能修复与优化

### 已完成 (本轮)

- [x] 修复首页 Feed 算法 — 关注 Tab key 匹配 (`'follow'` → `'following'`)
- [x] 修复首页 Feed 算法 — 热榜排序不被 `created_at` 覆盖
- [x] 密码重置系统安全加固 (UUID + SHA256 token)
- [x] Gateway 限流中间件 (60 req/min per IP)
- [x] JWT_SECRET 强制验证
- [x] 前端安全加固 (.map() 防御 + console.error 清理)
- [x] 创作中心代码重构 (组件拆分 + API 统一)
- [x] CORS 头由 Nginx 统一管理 (Gateway 剥离)
- [x] 文档重组 (docs/ 目录优化)
- [x] 浏览器验证: 首页 Feed 三 tab 全部正常
- [x] 浏览器验证: 右侧栏"热门趋势"和"推荐社区"正常
- [x] 更新 changelog — 补全 v1.0.8 和 v1.0.9 版本记录
- [x] 修复个人主页作品 Tab 为空 — username 双重 URL 编码导致 API 404
- [x] Bug 追踪系统 — `docs/bugs/` 目录 + Pattern 库 + CLAUDE.md 修复协议
- [x] README 重写 — 从功能目录升级为产品叙事 (竞品对照+双维度模型+核心差异化)
- [x] 修复 cherry-markdown 编辑器报错 — 锁定版本 0.11.0 + transpilePackages (v1.0.12)
- [x] Bug 追踪系统增强 — 回归地图 + 修复配方库 + 依赖升级 Pattern + 预防清单
- [x] **安全审计全面修复 (v1.0.13)** — JWT exp 显式校验 + Argon2 密码哈希 + SQL 参数化 + zip-slip + XSS 过滤 + 安全头加固 + 凭据保护 + 前端 Tab-nabbing
- [x] 社区功能增强 (v1.0.15-16) — 关注+图标上传+私有空间权限+审批状态
- [x] 浏览器全面测试 — 社区创建/编辑/删除/权限/关注/图标 10 项功能验证
- [x] 修复 BUG-11：创建社区标题被 slug 化 (v1.0.17)
- [x] 修复 BUG-12：deriveSlug 不保留下划线 (v1.0.17)
- [x] 修复 BUG-13：前端缺少删除社区按钮 (v1.0.17)
- [x] 内容审核系统 (v1.0.18) — 平台级封禁 + 时限隐藏 + Auto-Restore + 批量操作
- [x] 浏览器验证：封禁/解封 + 隐藏/自动恢复 + 批量隐藏

### 待处理

- [ ] 部署 polis-aggregate (代码已有，未部署)
- [ ] 配置 logrotate 日志轮转
- [ ] PostgreSQL 定时备份
- [ ] 社区分类/标签系统
- [ ] 创作者数据分析仪表盘
- [ ] 跨社区引用可见性 (作品详情页展示其他引用位置)

## 部署版本

v1.0.18 — 内容审核系统：平台级封禁 + 时限隐藏 + Auto-Restore + 批量操作
v1.0.17 — 创建社区标题/下划线修复 + 删除社区按钮
v1.0.16 — 社区功能增强部署 + 私有空间权限门控
v1.0.15 — 关注+图标上传+私有空间权限+审批状态 (开发版本)
v1.0.14 — 社区功能 5 项修复 (title 校验+软删除+post_count 同步+members keyMap)
v1.0.13 — 安全审计全面修复 (JWT/密码/SQL/配置 4 维度加固)
v1.0.12 — cherry-markdown 编辑器修复 + Bug 追踪系统增强
v1.0.11 — 修复个人主页作品 Tab 为空
v1.0.10 — changelog 补全 + research roadmap 更新
v1.0.9 — 首页 Feed 算法修复
v1.0.8 — 密码重置安全 + Gateway 限流 + JWT_SECRET 强制验证

## 服务器

- IP: 47.253.123.3
- 域名: www.mzgw.com
- 部署路径: `/root/polis/target/release/` (后端), `/opt/polis-web/` (前端)
- 服务: polis-gateway, polis-user, polis-space, polis-content, polis-admin, polis-video, polis-web
- **部署方式**: 本地编译 → GitHub Release → 服务器 `curl` 下载
- **禁止**: SCP（中美丢包）、服务器编译（OOM）
