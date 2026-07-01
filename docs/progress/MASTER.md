# 当前任务进度

> 最后更新: 2026-07-01

## 追踪模式

LOCAL_ONLY

## 当前状态

**活跃任务**: Bug 修复 + 功能测试 (2026-07-01)

### 本次会话完成 (2026-07-01)

#### Bug #1: Feed 面包屑显示不存在的模块 ✅
- **症状**: 全部动态中 QA Space 789842 下出现 poll/share 模块链接，但这些模块不存在
- **根因**: `get_feed` API (post_repo.rs:818-835) 对 poll/announcement/video 硬编码 `module_type`，未检查 `space_modules` 表
- **修复**:
  - 后端: 新增 `find_space_modules_batch` 批量查询，只有模块真实存在才返回 `module_name`
  - 前端: `ContentCard.tsx` 面包屑仅当 API 提供 `module_name` 时才渲染模块链接
- **部署**: v0.3.20260701-1104

#### Bug #2: Space 页面竞态条件导致帖子被错误过滤 ✅
- **症状**: Space 概览/交流 Tab 显示"还没有内容"但 API 实际返回了帖子
- **根因**: `useSpaceData.ts:297` — posts useEffect 和 modules useEffect 同时触发，posts 过滤依赖未加载的 spaceModules，竞态导致 mtFilter 为空过滤所有帖子
- **修复**: 当 `spaceModules.length === 0` 时跳过过滤，保留所有帖子
- **部署**: v0.3.20260701-1110 (仅前端)

### 测试覆盖
- ✅ 首页 Feed (全部动态/关注的人/热门)
- ✅ Space 页面 (概览/交流/成员 Tab)
- ✅ 登录页面
- ✅ CLI 页面
- ✅ 探索页面
- ✅ 搜索功能
- ✅ 钱包页面
- ✅ 8 个服务全部 active

## Next Steps

1. 继续全面测试其他功能（创作中心、付费内容、系列等）
2. 检查搜索页面面包屑中的模块标签显示为原始 module_type 而非中文名称
3. 继续 Milestone 任务中未完成的部分

**活跃任务**: 生产就绪度冲刺 — Milestone 1+2+3 (绿色任务)

### 本次会话完成 (2026-06-17)

#### M1: 基础设施就绪
- [x] **M1-2: DB 自动备份修复** — 密码 `polis2024` → `polis2024!Secure`，加 `set -o pipefail` + 大小验证 (20B → 60KB 真实备份)
- [x] **M1-4: HTTPS 自动续期** — 验证 `certbot.timer` 已配置，无需改动
- [x] **M1-5: 服务自愈** — 验证 `Restart=always` + 15分钟健康检查 cron 已配置

#### M2: 运营能力补齐
- [x] **M2-4: 前端性能优化**
  - `turndown` 静态 import → 动态 `import()` (减少 ~80KB 首屏)
  - 添加 `@next/bundle-analyzer` + `npm run analyze` 脚本
  - `next.config.js`: `productionBrowserSourceMaps: false`, `poweredByHeader: false`, `generateEtags: true`
  - 所有 `fill` 模式 `<Image>` 添加 `sizes` 属性 (VideoCard, NovelCard, TabRenderer)
- [x] **M2-5: 管理后台完善**
  - 修复 6 个 admin 页面 localStorage.getItem → getAdminToken() (16处)
  - 创建 `web/src/app/admin/error.tsx` 错误边界
  - 后端: 添加 `delete_user` GDPR 账号删除端点 (匿名化而非硬删除)
  
#### M3: 正式上线准备
- [x] **M3-3: 合规文档**
  - 重写 `privacy/page.tsx`: 隐私政策（10节，引用个保法/GDPR）
  - 重写 `terms/page.tsx`: 服务条款（12节，含代币声明）
  - 重写 `about/page.tsx`: 关于页面（6大特性卡片 + 技术架构）
  - 修改 `LandingPage.tsx` 和 `layout.tsx` 添加全局页脚（关于/隐私/条款/更新日志）
- [x] **M3-4: API 文档**
  - 创建手写 OpenAPI 3.0 规范 (`crates/polis-gateway/src/openapi.rs`)
  - 21 个端点文档，6 个标签分组
  - Swagger UI 页面（CDN 加载），地址: `/api/docs`
  - OpenAPI JSON 端点: `/api/docs/openapi.json`
- [x] **M3-5: 数据导出 (GDPR)**
  - 新建 `crates/polis-user/src/handlers/export_data.rs` — 导出端点
  - 新建 repo 方法: `find_user_follows`, `find_user_xp_logs_all`, `find_creator_score`
  - 路由: `GET /api/users/me/export` (JWT 认证)
  - 前端: `export/page.tsx` 真实 API 调用 + JSON 文件下载
  - 密码 hash 排除，Push 密钥脱敏
  
### 修改文件统计

| 类别 | 文件数 | 说明 |
|------|--------|------|
| Rust (gateway) | 3 | main.rs, openapi.rs, Cargo.toml |
| Rust (user) | 5 | export_data.rs, mod.rs, routes.rs, repo.rs, user_routes.rs |
| Rust (admin) | 2 | admin_handler.rs, routes.rs |
| 前端 | 13 | config + component + admin page fixes + export + compliance pages |
| 服务器 | 1 | backup-db.sh |

## Next Steps

1. 确认前端 `npm run build` 通过
2. 部署到服务器验证
3. 继续 Milestone 1-3 的黄色和红色任务（需要用户配置外部服务）
