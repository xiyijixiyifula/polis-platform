# 本地开发环境

## 前置条件

| 工具 | 版本要求 | 安装 |
|------|---------|------|
| Rust | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | 18+ | `brew install node` 或 nvm |
| PostgreSQL | 15+ | `brew install postgresql@15` |
| zig | latest | `brew install zig` (交叉编译 linker) |

## 首次设置

```bash
# 1. 克隆仓库
git clone https://github.com/xiyijixiyifula/polis-platform.git
cd polis-platform

# 2. 环境变量
cp .env.example .env
# 编辑 .env 填入本地 PostgreSQL 连接信息

# 3. 创建数据库
createdb polis_dev

# 4. 运行迁移
for f in migrations/*.sql; do
  psql -d polis_dev -f "$f"
done

# 5. 安装交叉编译目标 (macOS → Linux)
rustup target add x86_64-unknown-linux-gnu

# 6. 安装前端依赖
cd web && npm install && cd ..
```

## 日常开发

```bash
# 后端编译检查 (本地 target)
cargo check

# 后端编译 (发布用，交叉编译 Linux)
cargo build --release --target x86_64-unknown-linux-gnu

# 前端开发服务器
cd web && npm run dev

# 前端构建
cd web && npm run build
```

## 项目结构

```
polis-platform/
├── crates/                # Rust 微服务 (17 个 crate)
│   ├── polis-core/        # 共享核心库 (模型/错误/事件/JWT)
│   ├── polis-gateway/     # API 网关
│   ├── polis-user/        # 用户服务
│   ├── polis-space/       # 社区服务
│   ├── polis-content/     # 内容服务
│   ├── polis-admin/       # 管理后台服务
│   ├── polis-video/       # 视频服务
│   └── ...
├── web/                   # Next.js 前端
├── migrations/            # PostgreSQL 迁移脚本
├── docs/                  # 项目文档
├── tests/                 # E2E 测试
└── deploy/                # 部署脚本
```

## 部署

一键部署: `./deploy.sh`（交叉编译→打包→GitHub Release→服务器部署→验证）。

详情参考 [DEPLOY.md](../DEPLOY.md)（第三方部署指南）和 [AUTO-DEV.md](AUTO-DEV.md)（AI 开发循环）。

**严禁在服务器上编译** — 服务器仅 1.6GB 内存，编译会导致 OOM。
