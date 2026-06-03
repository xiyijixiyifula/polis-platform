#!/usr/bin/env bash
# =============================================================================
# Polis 生产服务器基础设施检查脚本
# 检查所有必需的服务/依赖是否正常运行
# 用法: ./scripts/infra-check.sh [--summary]
# =============================================================================

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER="root@47.253.123.3"
PASS=0
FAIL=0
SUMMARY_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --summary) SUMMARY_ONLY=true ;;
    esac
done

header() { echo -e "${CYAN}═══ $1 ═══${NC}"; }

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Polis 生产服务器基础设施检查${NC}"
echo -e "${CYAN}  目标: $SERVER${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""

# ─── SSH Connectivity ────────────────────────────────────────────
header "SSH 连接"
if ssh -o ConnectTimeout=5 "$SERVER" "echo ok" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH 连接正常${NC}"
else
    echo -e "${RED}❌ 无法连接到 $SERVER${NC}"
    exit 1
fi
echo ""

# ─── System Resources ────────────────────────────────────────────
header "系统资源"
ssh "$SERVER" '
echo "CPU: $(nproc) cores"
echo "内存: $(free -h | awk "/^Mem:/{print \$2\" total, \"\$3\" used, \"\$4\" free\"}")"
echo "磁盘: $(df -h / | awk "NR==2{print \$3\" used, \"\$4\" free, \"\$5\" used\"}")"
echo "负载: $(uptime | awk -F"load average:" "{print \$2}")"
'
echo ""

# ─── Systemd Services ────────────────────────────────────────────
header "Polis 服务状态"
SERVICES=(
    "polis-gateway|API 网关"
    "polis-user|用户服务"
    "polis-space|社区服务"
    "polis-content|内容服务"
    "polis-admin|管理后台"
    "polis-video|视频服务"
    "polis-web|前端 Web"
)

ALL_ACTIVE=true
for svc_info in "${SERVICES[@]}"; do
    svc="${svc_info%%|*}"
    desc="${svc_info##*|}"
    STATUS=$(ssh "$SERVER" "systemctl is-active $svc 2>/dev/null" || echo "unknown")
    case "$STATUS" in
        active)
            echo -e "  ${GREEN}✅${NC} $svc ($desc): active"
            PASS=$((PASS + 1))
            ;;
        failed)
            echo -e "  ${RED}❌${NC} $svc ($desc): FAILED"
            FAIL=$((FAIL + 1))
            ALL_ACTIVE=false
            ;;
        *)
            echo -e "  ${YELLOW}⚠️${NC}  $svc ($desc): $STATUS"
            ALL_ACTIVE=false
            ;;
    esac
done
echo ""

# ─── Infrastructure Services ──────────────────────────────────────
header "基础设施服务"

# PostgreSQL
if ssh "$SERVER" "systemctl is-active postgresql 2>/dev/null" | grep -q "active"; then
    echo -e "  ${GREEN}✅${NC} PostgreSQL: running"
    # DB connectivity test
    if ssh "$SERVER" "grep DATABASE_URL /root/polis/.env 2>/dev/null | head -1" > /dev/null 2>&1; then
        DB_URL=$(ssh "$SERVER" "grep DATABASE_URL /root/polis/.env | head -1 | cut -d= -f2-")
        if ssh "$SERVER" "psql '$DB_URL' -c 'SELECT 1' > /dev/null 2>&1"; then
            echo -e "  ${GREEN}✅${NC} PostgreSQL: 连接正常"
            PASS=$((PASS + 1))
        else
            echo -e "  ${RED}❌${NC} PostgreSQL: 连接失败"
            FAIL=$((FAIL + 1))
        fi
    fi
else
    echo -e "  ${RED}❌${NC} PostgreSQL: 未运行"
    FAIL=$((FAIL + 1))
fi

# NATS Server (关键 — 缺失则所有事件通知不工作)
if ssh "$SERVER" "ps aux | grep -c '[n]ats-server'" 2>/dev/null | grep -q "[1-9]"; then
    echo -e "  ${GREEN}✅${NC} NATS Server: running"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}❌${NC} NATS Server: 未运行 — 所有跨服务事件通知不工作"
    echo -e "      影响: 注册/关注/点赞/评论/帖子创建 等事件无法通过 NATS 发布"
    echo -e "      状态: 关键功能已有 DB 直接写入 fallback (v1.0.63)"
    echo -e "      修复: 部署 NATS Server 或全部改为 DB 直接写入"
    FAIL=$((FAIL + 1))
fi

# Redis (optional)
if ssh "$SERVER" "systemctl is-active redis-server 2>/dev/null || ps aux | grep -c '[r]edis-server'" 2>/dev/null | grep -q "[1-9]"; then
    echo -e "  ${GREEN}✅${NC} Redis: running"
else
    echo -e "  ${YELLOW}⚠️${NC}  Redis: 未检测到 (可选服务)"
fi

# Nginx
if ssh "$SERVER" "systemctl is-active nginx 2>/dev/null" | grep -q "active"; then
    echo -e "  ${GREEN}✅${NC} Nginx: running"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}❌${NC} Nginx: 未运行"
    FAIL=$((FAIL + 1))
fi
echo ""

# ─── NATS Impact Summary ──────────────────────────────────────────
header "NATS 缺失影响分析"
echo "以下功能依赖 NATS 事件系统 (当前 NATS 未部署):"
echo ""
echo "  | 功能 | 事件 | 原始状态 | v1.0.63 后 |"
echo "  |------|------|----------|------------|"
echo "  | 用户注册 | USER_REGISTERED | ❌ 无 fallback | ❌ 仍未修复 |"
echo "  | 用户关注 | USER_FOLLOWED | ❌ 无 fallback | ✅ 直接 DB INSERT |"
echo "  | 帖子点赞 | CONTENT_POST_LIKED | ✅ Content handler 直写 | ✅ 正常 |"
echo "  | 评论创建 | CONTENT_COMMENT_CREATED | ✅ Content handler 直写 | ✅ 正常 |"
echo "  | 帖子创建 | CONTENT_POST_CREATED | ❌ 依赖 Notify (未部署) | ❌ 仍未修复 |"
echo ""

# ─── Service Log Warnings ─────────────────────────────────────────
if ! $SUMMARY_ONLY; then
    header "服务启动日志警告 (最近 3 行 NATS 相关)"
    for svc in polis-user polis-content polis-space polis-admin polis-video polis-aggregate polis-notify; do
        NATS_LOG=$(ssh "$SERVER" "journalctl -u $svc --no-pager -n 100 2>/dev/null | grep -i 'nats\|NATS' | tail -3" || true)
        if [[ -n "$NATS_LOG" ]]; then
            echo "  [$svc]"
            echo "$NATS_LOG" | while read line; do echo "    $line"; done
        fi
    done
    echo ""
fi

# ─── Summary ──────────────────────────────────────────────────────
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  检查结果${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"

if [[ "$FAIL" -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  关键基础设施缺失:${NC}"
    if ! ssh "$SERVER" "ps aux | grep -c '[n]ats-server'" 2>/dev/null | grep -q "[1-9]"; then
        echo "  - NATS Server: 未部署。当前通过 DB 直接写入作为 fallback。"
        echo "    安装: curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@main | sh"
    fi
    echo ""
    echo "  详见: docs/bugs/patterns/nats-event-loss.md"
fi
