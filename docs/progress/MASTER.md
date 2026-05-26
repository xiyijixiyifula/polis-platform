# 当前任务进度

> 最后更新: 2026-05-26

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

### 待处理

- [ ] 部署 polis-aggregate (代码已有，未部署)
- [ ] 配置 logrotate 日志轮转
- [ ] PostgreSQL 定时备份
- [ ] 社区分类/标签系统
- [ ] 创作者数据分析仪表盘
- [ ] 跨社区引用可见性 (作品详情页展示其他引用位置)

## 部署版本

v1.0.11 — 修复个人主页作品 Tab 为空
v1.0.10 — changelog 补全 + research roadmap 更新
v1.0.9 — 首页 Feed 算法修复
v1.0.8 — 密码重置安全 + Gateway 限流 + JWT_SECRET 强制验证

## 服务器

- IP: 47.253.123.3
- 域名: www.mzgw.com
- 部署路径: `/root/polis/target/release/` (后端), `/opt/polis-web/` (前端)
- 服务: polis-gateway, polis-user, polis-space, polis-content, polis-admin, polis-video, polis-web
