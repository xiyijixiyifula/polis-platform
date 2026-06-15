# 当前任务进度

> 最后更新: 2026-06-15

## 追踪模式

LOCAL_ONLY

## 当前状态

**活跃任务**: 冲击 A- (8.0+) — 全面改造

### 已完成 (上次 S-grade sprint — commit a870a8b)

- [x] Clippy -D warnings 全仓修复 (18 crates, CI 强制)
- [x] SELECT* → 显式列名替换 (所有 repo/handler 文件)
- [x] CSP 安全头增强 (frame-ancestors, form-action, base-uri)
- [x] Gateway 结构化请求日志 + 限流器 TTL 清理 (T4)
- [x] 优雅关闭信号处理 shutdown.rs (T9)
- [x] 图片懒加载 + 骨架屏 loading (T10)
- [x] 移动端响应式修复 — 超小触控目标/侧边栏/表格滚动 (T11)
- [x] AppError enum→struct 重构 + telemetry 上下文
- [x] Integration tests: comment, follow, space, search (T1 部分)
- [x] 前端组件测试: PostCard, SpaceCard, ShareButton (T2 部分)

### Phase 3: 剩余任务

#### Lane 1 — 测试体系 (Testing 5.0→6.5)
- [ ] T1: Vitest 核心 API 集成测试 — 已有 4 个，补 auth/login/register/post
- [ ] T2: 前端组件渲染测试 — 已有 3 个，补 ContentCard/Header/CreationEditor
- [x] T3: E2E 冒烟测试脚本 (注册→发帖→评论→点赞)

#### Lane 2 — 可观测性 (Monitoring 5.0→6.0)
- [x] T4: 结构化请求日志中间件 (Gateway 层)
- [ ] T5: 健康检查增强 (DB/NATS/Redis 状态)
- [ ] T6: 错误追踪 sentry-like 集成

#### Lane 3 — 架构补全 (Architecture 6.8→7.5)
- [ ] T7: NATS 部署 + 事件系统验证
- [ ] T8: 跨服务事件一致性测试
- [x] T9: 优雅关闭 + 健康探针

#### Lane 4 — 前端优化 (UX 7.0→7.5)
- [x] T10: 图片懒加载 + skeleton loading
- [x] T11: 移动端响应式修复

### 新增改进项 (当前 sprint)

- [ ] T12: 健康检查端点完善 — 各服务 /health 返回 DB/NATS 连接状态
- [ ] T13: 前端端到端测试完善 — 补充更多用户路径
- [ ] T14: CI 流程完善 — 前端 lint + test 步骤
- [ ] T15: 部署后自动冒烟测试

## Next Steps

1. T5: 完善健康检查端点 (DB/NATS 连接状态)
2. T12-T15: 进一步夯实测试和 CI 体系
3. 推送到 GitHub → CI → 部署
