# Task Breakdown — Polis 网站全面修复

## Phase 1: P0 安全 + 基础设施 (8 tasks)
| ID | Task | Priority | Effort |
|----|------|----------|--------|
| 1.1 | 修复 forgot-password 账户接管漏洞 | P0 | M |
| 1.2 | 验证并修复生产 JWT_SECRET | P0 | S |
| 1.3 | 配置 logrotate | P0 | S |
| 1.4 | 配置 PostgreSQL 定时备份 | P0 | M |
| 1.5 | 添加 CSP 头 | P1 | S |
| 1.6 | 关闭 TLSv1.0/1.1 | P1 | S |
| 1.7 | 配置速率限制 | P1 | M |
| 1.8 | 收紧 CORS 配置 | P1 | S |

## Phase 2: P1 代码质量 (3 tasks)
| 2.1 | 添加后端核心流程测试 | P1 | L |
| 2.2 | 拆分最大单体组件 | P1 | L |
| 2.3 | 启用 next/image 优化 | P1 | M |

## Phase 3: P2 技术债务 (4 tasks)
| 3.1 | 服务器资源优化 | P2 | M |
| 3.2 | 添加基础监控 | P2 | M |
| 3.3 | 统一 API 响应格式 | P2 | L |
| 3.4 | 修复 N+1 查询 | P2 | L |
