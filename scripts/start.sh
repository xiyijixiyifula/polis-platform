#!/bin/bash
set -e

# ============================================================================
# Polis 一键启动脚本 🚀
# 用法: bash scripts/start.sh [dev|prod|stop|status]
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

print_banner() {
  echo ""
  echo -e "${CYAN}  ╔═══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}  ║        Polis 一键启动 🚀                  ║${NC}"
  echo -e "${CYAN}  ║        未来社区平台                       ║${NC}"
  echo -e "${CYAN}  ╚═══════════════════════════════════════════╝${NC}"
  echo ""
}

check_deps() {
  local missing=0
  for cmd in docker psql cargo; do
    if ! command -v $cmd &>/dev/null; then
      echo -e "${YELLOW}⚠ $cmd 未安装${NC}"
      missing=1
    fi
  done
  if [ $missing -eq 1 ]; then
    echo -e "${YELLOW}请先安装缺失的依赖${NC}"
    echo "  Docker: https://docker.com"
    echo "  Rust:   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
  fi
}

# ====== dev 模式 ======
start_dev() {
  print_banner
  echo -e "${GREEN}▶ 启动 Polis 开发环境...${NC}\n"

  # 1. 检查依赖
  check_deps
  echo -e "${GREEN}✅ 依赖检查通过${NC}"

  # 2. 启动基础设施 (Docker)
  echo -e "\n${YELLOW}▶ 启动基础设施 (PostgreSQL + Redis + Meilisearch + NATS)...${NC}"
  if docker ps | grep -q polis; then
    echo -e "${GREEN}✅ 基础设施已在运行${NC}"
  else
    docker compose up -d postgres redis meilisearch nats 2>/dev/null || docker-compose up -d postgres redis meilisearch nats
    echo -e "${GREEN}✅ 基础设施已启动${NC}"
    echo -e "   ${CYAN}等待数据库就绪...${NC}"
    sleep 3
  fi

  # 3. 运行数据库迁移
  echo -e "\n${YELLOW}▶ 运行数据库迁移...${NC}"
  PGPASSWORD=p polis psql -h localhost -U polis -d polis -f migrations/001_initial.sql 2>/dev/null && echo -e "${GREEN}✅ 迁移完成${NC}" || echo -e "${YELLOW}⚠ 迁移可能已存在，跳过${NC}"

  # 4. 编译服务 (并行)
  echo -e "\n${YELLOW}▶ 编译核心服务...${NC}"
  cargo build --release -p polis-gateway -p polis-user -p polis-space -p polis-content -p polis-notify 2>&1 | tail -1
  echo -e "${GREEN}✅ 编译完成${NC}"

  # 5. 启动所有服务 (后台)
  echo -e "\n${YELLOW}▶ 启动服务...${NC}"
  
  # 清理旧进程
  pkill -f "polis-" 2>/dev/null || true
  sleep 1

  mkdir -p logs

  # 启动各个服务
  nohup ./target/release/polis-user > logs/user.log 2>&1 &
  echo -e "  ${GREEN}✓${NC} 用户服务 (3001)"
  sleep 0.5

  nohup ./target/release/polis-space > logs/space.log 2>&1 &
  echo -e "  ${GREEN}✓${NC} 社区服务 (3002)"
  sleep 0.5

  nohup ./target/release/polis-content > logs/content.log 2>&1 &
  echo -e "  ${GREEN}✓${NC} 内容服务 (3003)"
  sleep 0.5

  nohup ./target/release/polis-notify > logs/notify.log 2>&1 &
  echo -e "  ${GREEN}✓${NC} 通知服务 (3020)"
  sleep 0.5

  nohup ./target/release/polis-gateway > logs/gateway.log 2>&1 &
  echo -e "  ${GREEN}✓${NC} API 网关 (8080)"

  # 6. 等待就绪
  sleep 2

  # 7. 验证
  echo -e "\n${YELLOW}▶ 验证服务状态...${NC}"
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Polis 已成功启动！${NC}"
  else
    echo -e "${RED}✗ 启动可能有问题，查看日志:${NC}"
    echo "   tail -f logs/gateway.log"
  fi

  # 8. 显示信息
  echo ""
  echo -e "${CYAN}  ┌────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}  │  访问地址                                │${NC}"
  echo -e "${CYAN}  │  API:      http://localhost:8080         │${NC}"
  echo -e "${CYAN}  │  前端:     http://localhost:3000         │${NC}"
  echo -e "${CYAN}  │  管理后台: http://localhost:3050/admin   │${NC}"
  echo -e "${CYAN}  │                                          │${NC}"
  echo -e "${CYAN}  │  管理密码: polis-admin-2026               │${NC}"
  echo -e "${CYAN}  │  日志:     tail -f logs/*.log            │${NC}"
  echo -e "${CYAN}  │  停止:     bash scripts/start.sh stop    │${NC}"
  echo -e "${CYAN}  └────────────────────────────────────────┘${NC}"
  echo ""
}

# ====== prod 模式 (全 Docker) ======
start_prod() {
  print_banner
  echo -e "${GREEN}▶ 启动 Polis 生产环境 (Docker)...${NC}\n"

  # 1. 创建 .env（如果不存在）
  if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ 已创建 .env 文件 (请修改配置)${NC}"
  fi

  # 2. 一键启动所有容器
  echo -e "${YELLOW}▶ 构建并启动所有服务...${NC}"
  docker compose up -d --build 2>/dev/null || docker-compose up -d --build

  # 3. 等待就绪
  echo -e "${YELLOW}▶ 等待服务就绪...${NC}"
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Polis 已成功启动！${NC}"
      break
    fi
    sleep 2
  done

  echo -e "\n${CYAN}  访问地址: http://localhost:8080${NC}"
  echo -e "${CYAN}  管理后台: http://localhost:3050/admin${NC}"
  echo ""
}

# ====== 停止 ======
stop_services() {
  echo -e "${YELLOW}▶ 停止所有服务...${NC}"
  pkill -f "polis-" 2>/dev/null || true
  docker compose stop 2>/dev/null || docker-compose stop 2>/dev/null || true
  echo -e "${GREEN}✅ 已停止${NC}"
}

# ====== 状态 ======
show_status() {
  echo -e "${CYAN}▶ 服务状态:${NC}"
  echo ""

  # 检测进程
  for svc in polis-user polis-space polis-content polis-gateway polis-notify polis-admin; do
    if pgrep -f "$svc" > /dev/null 2>&1; then
      echo -e "  ${GREEN}●${NC} $svc 运行中"
    else
      echo -e "  ${RED}○${NC} $svc 未运行"
    fi
  done

  echo ""
  echo -e "${CYAN}▶ Docker 容器:${NC}"
  docker ps --format "  {{.Names}}\t{{.Status}}" 2>/dev/null | grep polis || echo "  (无)"
}

# ====== 主入口 ======
case "${1:-dev}" in
  dev)
    start_dev
    ;;
  prod)
    start_prod
    ;;
  stop)
    stop_services
    ;;
  restart)
    stop_services
    sleep 1
    start_dev
    ;;
  status)
    show_status
    ;;
  *)
    echo "用法: bash scripts/start.sh [dev|prod|stop|status]"
    echo ""
    echo "  dev     - 开发模式 (本地编译 + Docker 依赖)"
    echo "  prod    - 生产模式 (全 Docker)"
    echo "  stop    - 停止所有服务"
    echo "  status  - 查看运行状态"
    ;;
esac
