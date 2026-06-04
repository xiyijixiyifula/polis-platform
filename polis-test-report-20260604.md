# Polis 平台线上功能测试报告

**测试时间**: 2026-06-04
**测试目标**: https://www.mzgw.com
**服务器**: 47.253.123.3

---

## 一、整体状态

| 指标 | 状态 |
|------|------|
| 网站可访问性 | ✅ 正常 |
| HTTPS/SSL | ✅ 正常 |
| API Gateway | ✅ 正常 |
| 前端渲染 | ✅ 正常 |
| 安全响应头 | ✅ 配置完善 |
| 数据库连接 | ⚠️ 部分字段缺失 |

---

## 二、功能测试结果

### ✅ 正常工作的功能

| 功能 | 端点/页面 | 状态 |
|------|-----------|------|
| 网站首页 | `/` | 200 OK |
| 登录页面 | `/login` | 200 OK |
| 注册页面 | `/register` | 200 OK |
| 社区详情页 | `/space/{namespace}` | 200 OK |
| 创建社区页 | `/create` | 200 OK |
| 创建帖子页 | `/post/new` | 200 OK |
| 管理后台登录 | `/admin/login` | 200 OK |
| API 健康检查 | `/api/health` | 200 OK |
| 社区列表 | `/api/spaces` | 200 OK |
| 社区详情 | `/api/spaces/{ns}` | 200 OK |
| 帖子详情 | `/api/posts/{id}` | 200 OK |
| 社区帖子列表 | `/api/spaces/{ns}/posts` | 200 OK |
| 评论列表 | `/api/posts/{id}/comments` | 200 OK |
| 趋势内容 | `/api/aggregate/.../trending` | 200 OK |
| 精选内容 | `/api/aggregate/.../featured` | 200 OK |
| 子社区 | `/api/aggregate/.../subspaces` | 200 OK |
| 用户排行榜 | `/api/leaderboard` | 200 OK |
| 通知（需认证） | `/api/notifications` | 401 正常 |
| 私信（需认证） | `/api/messages` | 401 正常 |

### ❌ 发现的问题

#### 🔴 严重问题

**1. 用户注册功能完全损坏**
- **端点**: `POST /api/auth/register`
- **错误**: `HTTP 500` — `Database error: no column found for name: chain_address`
- **影响**: 新用户无法注册，阻断用户增长
- **根因**: `users` 表缺少 `chain_address` 和 `chain_bound_at` 字段，与 Rust 模型 `User` 结构体不同步
- **修复**: 执行数据库迁移添加缺失字段

#### 🟡 中等问题

**2. 多个 API 端点返回 404**
| 端点 | 预期功能 | 实际状态 |
|------|----------|----------|
| `/api/profile/{username}` | 查看用户资料 | 404 |
| `/api/space/{ns}/members` | 社区成员列表 | 404 |
| `/api/space/{ns}/modules` | 社区模块列表 | 404 |
| `/api/explore` | 探索页面数据 | 404 |
| `/api/hot` | 热门内容 | 404 |
| `/api/saved` | 收藏列表 | 404 |
| `/api/posts/{id}/likes` | 点赞功能 | 404 |
| `/api/root/{ns}/posts` | 根社区帖子 | 404 |

**3. 搜索功能返回错误类型**
- **端点**: `/api/search?q=xxx`
- **问题**: 返回的是社区列表，而非搜索结果
- **预期**: 应返回帖子/用户/社区的综合搜索结果

**4. SSL 证书域名不匹配**
- **证书域名**: `speedtest.mzgw.com`
- **实际域名**: `www.mzgw.com`
- **影响**: 浏览器可能显示证书警告（目前未触发是因为证书包含通配符或 SAN）

#### 🟢 轻微问题

**5. 内容数据量极少**
- 仅 1 个社区（"测试社区"）
- 仅 4 篇帖子
- 约 13 个注册用户
- **建议**: 添加种子数据或开展内测邀请

**6. 所有用户头像为空**
- `avatar_url` 全部为 `null`
- **建议**: 添加默认头像或 Gravatar 集成

---

## 三、安全评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| HTTPS 强制跳转 | ✅ | HTTP → HTTPS 自动跳转 |
| HSTS | ✅ | max-age=63072000; includeSubDomains; preload |
| X-Frame-Options | ✅ | DENY（防止点击劫持） |
| X-Content-Type-Options | ✅ | nosniff |
| Referrer-Policy | ✅ | strict-origin-when-cross-origin |
| Permissions-Policy | ✅ | 限制了 camera/mic/geolocation |
| CORS | ✅ | 已配置 |
| JWT 认证 | ✅ | 已实现 |

---

## 四、性能与基础设施

| 指标 | 数值 | 评估 |
|------|------|------|
| 服务器内存 | 1.6 GB | ⚠️ 偏低，建议 4GB+ |
| 磁盘使用 | 72% (27G/40G) | ⚠️ 需关注，建议清理日志 |
| 服务启动时间 | < 3秒 | ✅ 正常 |
| 前端构建产物 | 158MB | ✅ 正常 |
| 二进制文件总大小 | 17MB | ✅ 优秀（Rust 优化编译） |

---

## 五、修复建议（按优先级）

### P0 — 立即修复
1. **修复用户注册功能**
   ```sql
   ALTER TABLE users ADD COLUMN chain_address VARCHAR(255);
   ALTER TABLE users ADD COLUMN chain_bound_at TIMESTAMP WITH TIME ZONE;
   ```

### P1 — 本周修复
2. **补充缺失的 API 路由**（检查 Gateway 代理配置）
3. **修复搜索功能**（应返回搜索结果而非社区列表）
4. **更新 SSL 证书**（确保证书包含 `www.mzgw.com`）

### P2 — 近期优化
5. **添加默认用户头像**
6. **导入种子数据**（至少 3-5 个社区，20+ 帖子）
7. **配置日志轮转**（防止磁盘占满）
8. **服务器内存扩容**（建议升级到 4GB）

### P3 — 长期规划
9. 添加 API 文档（Swagger/OpenAPI）
10. 配置监控告警（Prometheus + Grafana）
11. 实现蓝绿部署（减少中断时间）

---

## 六、总结

**当前状态**: 平台核心功能基本可用，但 **用户注册功能完全损坏** 是阻断性问题，必须立即修复。多个 API 端点 404 影响用户体验。安全性和基础设施配置良好。

**建议行动**:
1. 今天内修复数据库字段缺失问题
2. 本周内补充缺失 API 路由
3. 本月内导入种子数据并邀请内测用户
