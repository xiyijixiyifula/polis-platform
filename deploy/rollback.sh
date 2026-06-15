#!/bin/bash
set -euo pipefail

## ============================================================
## Polis 回滚脚本 — 一键回滚到上一个部署版本
## 用法: ./deploy/rollback.sh [选项]
##
## 选项:
##   --frontend         仅回滚前端 (从 .next-backups 恢复)
##   --backend          仅回滚后端 (从本地备份恢复)
##   --full             回滚前端+后端 (默认)
##   --release VERSION  回滚到指定 GitHub Release 版本
##   --list             列出服务器上所有可用备份
##   --check            仅健康检查，不回滚
##   --help             显示帮助
##
## 示例:
##   ./deploy/rollback.sh                          # 回滚到最新备份
##   ./deploy/rollback.sh --frontend                # 仅回滚前端
##   ./deploy/rollback.sh --release v0.3.20250601   # 回滚到指定 Release
##   ./deploy/rollback.sh --list                    # 查看可用备份
##   ./deploy/rollback.sh --check                   # 仅检查服务状态
##
## 备份来源:
##   前端: 每次部署自动备份在 /root/polis/web/.next-backups/
##   后端: 每次部署自动备份在 /root/polis/target/release/backup-*
## ============================================================

# ═══════════════════════════════════════════
# 第三方部署: 修改以下 3 个变量即可使用
# ═══════════════════════════════════════════
SERVER_HOST="speedtest.mzgw.com"        # ← 改成你的服务器 IP/域名
SERVER_USER="root"                      # ← 改成你的 SSH 用户
GITHUB_REPO="xiyijixiyifula/polis-platform"  # ← 改成你的 GitHub 仓库
# ═══════════════════════════════════════════

SERVER_WEB_DIR="/root/polis/web"
SERVER_BIN_DIR="/usr/local/bin"
SERVER_BACKUP_DIR="/root/polis/target/release"
RUST_BINARIES=(polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-chain)
SYSTEMD_SERVICES=(polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-chain polis-web)
DOMAIN="www.mzgw.com"

MODE="full"
RELEASE_VERSION=""

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $(date +%H:%M:%S) $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $(date +%H:%M:%S) $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $(date +%H:%M:%S) $*"; }
step() { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }

# ---- 参数解析 ----
while [[ $# -gt 0 ]]; do
    case "$1" in
        --frontend) MODE="frontend"; shift ;;
        --backend)  MODE="backend"; shift ;;
        --full)     MODE="full"; shift ;;
        --release)  RELEASE_VERSION="$2"; MODE="release"; shift 2 ;;
        --list)     MODE="list"; shift ;;
        --check)    MODE="check"; shift ;;
        --help)     head -30 "$0" | grep '^##' | sed 's/^## \?//'; exit 0 ;;
        *) err "未知选项: $1"; head -30 "$0" | grep '^#' | sed 's/^# \?//'; exit 1 ;;
    esac
done

# ---- SSH 连接检查 ----
check_ssh() {
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "echo ok" &>/dev/null; then
        err "无法 SSH 连接服务器 ${SERVER_HOST}"
        exit 1
    fi
}

# ---- 健康检查 ----
health_check() {
    step "健康检查"

    log "检查服务状态..."
    local all_ok=true
    for svc in "${SYSTEMD_SERVICES[@]}"; do
        local status
        status=$(ssh "${SERVER_USER}@${SERVER_HOST}" "systemctl is-active ${svc}" 2>/dev/null || echo "unknown")
        if [[ "$status" == "active" ]]; then
            echo -e "  ${GREEN}✓${NC} ${svc}: active"
        else
            echo -e "  ${RED}✗${NC} ${svc}: ${status}"
            all_ok=false
        fi
    done

    if [[ "$all_ok" == false ]]; then
        warn "部分服务未正常运行"
    fi

    echo ""
    log "冒烟测试..."

    local http_code
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} HTTP ${http_code} — https://${DOMAIN}/"
    else
        echo -e "  ${RED}✗${NC} HTTP ${http_code} — https://${DOMAIN}/ (前端可能异常)"
        return 1
    fi

    http_code=$(curl -sk -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/spaces/trending" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} HTTP ${http_code} — Trending API"
    else
        echo -e "  ${RED}✗${NC} HTTP ${http_code} — Trending API"
        return 1
    fi

    return 0
}

# ---- 列出可用备份 ----
list_backups() {
    step "服务器可用备份"

    echo -e "${BLUE}前端备份 (.next-backups):${NC}"
    ssh "${SERVER_USER}@${SERVER_HOST}" '
        BACKUP_DIR="'"${SERVER_WEB_DIR}"'/.next-backups"
        if [ -d "$BACKUP_DIR" ]; then
            echo "  路径: $BACKUP_DIR"
            echo "  内容:"
            ls -1dt "$BACKUP_DIR"/backup-* 2>/dev/null | while read d; do
                SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
                echo "    $(basename "$d")  ($SIZE)"
            done
            ls -1dt "$BACKUP_DIR"/public-* 2>/dev/null | while read d; do
                SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
                echo "    $(basename "$d")  ($SIZE) [public目录]"
            done
        else
            echo "  (无前端备份)"
        fi
    ' 2>&1

    echo ""
    echo -e "${BLUE}后端备份 (二进制):${NC}"
    ssh "${SERVER_USER}@${SERVER_HOST}" '
        BACKUP_DIR="'"${SERVER_BACKUP_DIR}"'"
        ls -1dt "$BACKUP_DIR"/backup-* 2>/dev/null | while read d; do
            SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
            COUNT=$(ls -1 "$d" 2>/dev/null | wc -l | tr -d " ")
            echo "  $(basename "$d")  ($SIZE, ${COUNT} 个二进制)"
        done
        if ! ls -dt "$BACKUP_DIR"/backup-* &>/dev/null; then
            echo "  (无后端备份)"
        fi
    ' 2>&1

    echo ""
    echo -e "${BLUE}GitHub Releases (最近 10 个):${NC}"
    gh release list --repo "$GITHUB_REPO" --limit 10 2>/dev/null || echo "  (无法获取 GitHub Releases，请检查 gh auth status)"

    echo ""
    echo -e "${YELLOW}提示: 使用 --release VERSION 回滚到指定 GitHub Release${NC}"
}

# ---- 前端回滚 ----
rollback_frontend() {
    step "前端回滚"

    # 查找最新备份
    local latest_backup
    latest_backup=$(ssh "${SERVER_USER}@${SERVER_HOST}" '
        ls -1dt '"${SERVER_WEB_DIR}"'/.next-backups/backup-* 2>/dev/null | head -1 || echo ""
    ' 2>/dev/null)

    if [[ -z "$latest_backup" ]]; then
        err "未找到前端备份! 服务器上没有 .next-backups/backup-* 目录"
        err "请使用 --release VERSION 回滚到 GitHub Release 版本"
        return 1
    fi

    local backup_name
    backup_name=$(basename "$latest_backup")
    log "找到最新前端备份: ${backup_name}"

    # 确认
    echo ""
    echo -e "${YELLOW}即将回滚前端到: ${backup_name}${NC}"
    echo -e "${YELLOW}当前 .next 目录将被替换${NC}"
    read -rp "确认回滚? [y/N] " yn
    if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
        log "已取消回滚"
        exit 0
    fi

    log "正在回滚前端..."

    ssh "${SERVER_USER}@${SERVER_HOST}" "
        set -euo pipefail

        echo '[1/5] 停止 polis-web...'
        systemctl stop polis-web

        echo '[2/5] 备份当前版本 (以防万一)...'
        STAMP=\$(date +%Y%m%d-%H%M%S)
        if [ -d ${SERVER_WEB_DIR}/.next ]; then
            mkdir -p ${SERVER_WEB_DIR}/.next-backups
            mv ${SERVER_WEB_DIR}/.next ${SERVER_WEB_DIR}/.next-backups/pre-rollback-\$STAMP
            echo \"  当前版本已备份到 .next-backups/pre-rollback-\$STAMP\"
        fi

        echo '[3/5] 恢复备份 ${backup_name}...'
        cp -r ${latest_backup}/.next ${SERVER_WEB_DIR}/.next

        # 如果有对应的 public 备份，也恢复
        PUBLIC_BACKUP=\"${SERVER_WEB_DIR}/.next-backups/public-\$(echo ${backup_name} | sed 's/backup-//')\"
        if [ -d \"\$PUBLIC_BACKUP\" ]; then
            echo '  恢复 public 目录...'
            rm -rf ${SERVER_WEB_DIR}/public
            cp -r \"\$PUBLIC_BACKUP\" ${SERVER_WEB_DIR}/public
        fi

        echo '[4/5] 关键: 复制 static 和 public 到 standalone 目录...'
        rm -rf ${SERVER_WEB_DIR}/.next/standalone/.next/static
        cp -r ${SERVER_WEB_DIR}/.next/static ${SERVER_WEB_DIR}/.next/standalone/.next/static
        if [ -d ${SERVER_WEB_DIR}/public ]; then
            rm -rf ${SERVER_WEB_DIR}/.next/standalone/public
            cp -r ${SERVER_WEB_DIR}/public ${SERVER_WEB_DIR}/.next/standalone/public
        fi

        # 清理 macOS 污染文件
        find ${SERVER_WEB_DIR}/.next -name '._*' -delete 2>/dev/null || true

        echo '[5/5] 启动 polis-web...'
        systemctl start polis-web

        echo '前端回滚完成'
    " 2>&1 | while IFS= read -r line; do
        echo "  ${line}"
    done

    log "前端回滚完成!"
}

# ---- 后端回滚 ----
rollback_backend() {
    step "后端回滚"

    # 查找最新后端备份
    local latest_backup
    latest_backup=$(ssh "${SERVER_USER}@${SERVER_HOST}" '
        ls -1dt '"${SERVER_BACKUP_DIR}"'/backup-* 2>/dev/null | head -1 || echo ""
    ' 2>/dev/null)

    if [[ -z "$latest_backup" ]]; then
        err "未找到后端备份! 服务器上没有 backup-* 目录"
        err "请使用 --release VERSION 回滚到 GitHub Release 版本"
        return 1
    fi

    local backup_name
    backup_name=$(basename "$latest_backup")
    log "找到最新后端备份: ${backup_name}"

    # 检查备份中有哪些二进制
    local backup_bins
    backup_bins=$(ssh "${SERVER_USER}@${SERVER_HOST}" "ls -1 ${latest_backup}/ 2>/dev/null || echo ''")
    if [[ -z "$backup_bins" ]]; then
        err "备份目录为空: ${latest_backup}"
        return 1
    fi
    echo "  包含二进制:"
    echo "$backup_bins" | while read -r b; do echo "    - $b"; done

    # 确认
    echo ""
    echo -e "${YELLOW}即将回滚后端到: ${backup_name}${NC}"
    echo -e "${YELLOW}当前运行的二进制将被替换${NC}"
    read -rp "确认回滚? [y/N] " yn
    if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
        log "已取消回滚"
        exit 0
    fi

    log "正在回滚后端..."

    ssh "${SERVER_USER}@${SERVER_HOST}" "
        set -euo pipefail

        echo '[1/4] 停止所有后端服务...'
        for svc in ${RUST_BINARIES[*]}; do
            systemctl stop \$svc 2>/dev/null || true
            echo \"  已停止: \$svc\"
        done

        echo '[2/4] 备份当前版本...'
        STAMP=\$(date +%Y%m%d-%H%M%S)
        CURRENT_BACKUP=\"${SERVER_BACKUP_DIR}/pre-rollback-\$STAMP\"
        mkdir -p \"\$CURRENT_BACKUP\"
        for bin in ${RUST_BINARIES[*]}; do
            if [ -f ${SERVER_BIN_DIR}/\$bin ]; then
                cp ${SERVER_BIN_DIR}/\$bin \"\$CURRENT_BACKUP/\"
                echo \"  已备份: \$bin\"
            fi
        done

        echo '[3/4] 恢复备份 ${backup_name}...'
        for f in ${latest_backup}/*; do
            bin_name=\$(basename \"\$f\")
            cp \"\$f\" ${SERVER_BIN_DIR}/\$bin_name
            chmod +x ${SERVER_BIN_DIR}/\$bin_name
            echo \"  已恢复: \$bin_name\"
        done

        echo '[4/4] 重启所有服务...'
        for svc in ${RUST_BINARIES[*]}; do
            systemctl restart --no-block \$svc || true
        done
        systemctl restart --no-block polis-web || true

        sleep 2
        echo '后端回滚完成'
    " 2>&1 | while IFS= read -r line; do
        echo "  ${line}"
    done

    log "后端回滚完成!"
}

# ---- GitHub Release 回滚 ----
rollback_release() {
    step "GitHub Release 回滚"

    if [[ -z "$RELEASE_VERSION" ]]; then
        err "请指定 --release VERSION"
        exit 1
    fi

    log "回滚到 GitHub Release: ${RELEASE_VERSION}"

    # 检查 Release 是否存在
    if ! gh release view "$RELEASE_VERSION" --repo "$GITHUB_REPO" &>/dev/null; then
        err "GitHub Release ${RELEASE_VERSION} 不存在"
        echo ""
        log "可用的 Releases:"
        gh release list --repo "$GITHUB_REPO" --limit 10
        exit 1
    fi

    local dl_base="https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_VERSION}"

    echo ""
    echo -e "${YELLOW}即将从 GitHub Release 回滚到: ${RELEASE_VERSION}${NC}"
    echo -e "${YELLOW}将尝试下载并部署:${NC}"
    echo -e "  后端: ${dl_base}/polis-binaries-${RELEASE_VERSION}.tar.gz"
    echo -e "  前端: ${dl_base}/polis-web-${RELEASE_VERSION}.tar.gz"
    read -rp "确认回滚? [y/N] " yn
    if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
        log "已取消回滚"
        exit 0
    fi

    log "正在从 GitHub Release 回滚..."

    ssh "${SERVER_USER}@${SERVER_HOST}" "
        set -euo pipefail

        DL_BASE='${dl_base}'
        VERSION='${RELEASE_VERSION}'

        # === 后端回滚 ===
        echo '[后端] 停止服务...'
        for svc in ${RUST_BINARIES[*]}; do
            systemctl stop \$svc 2>/dev/null || true
        done

        echo '[后端] 备份当前版本...'
        STAMP=\$(date +%Y%m%d-%H%M%S)
        mkdir -p ${SERVER_BACKUP_DIR}/pre-rollback-\$STAMP
        for bin in ${RUST_BINARIES[*]}; do
            [ -f ${SERVER_BIN_DIR}/\$bin ] && cp ${SERVER_BIN_DIR}/\$bin ${SERVER_BACKUP_DIR}/pre-rollback-\$STAMP/
        done

        echo '[后端] 下载 Release: \${VERSION}...'
        cd /tmp
        curl -fsSL \"\${DL_BASE}/polis-binaries-\${VERSION}.tar.gz\" -o polis-rollback.tar.gz
        mkdir -p /tmp/polis-rollback
        tar -xzf polis-rollback.tar.gz -C /tmp/polis-rollback/

        echo '[后端] 安装二进制...'
        find /tmp/polis-rollback -type f -executable -name 'polis-*' | while read f; do
            cp \"\$f\" ${SERVER_BIN_DIR}/
            chmod +x ${SERVER_BIN_DIR}/\$(basename \"\$f\")
            echo \"  已安装: \$(basename \"\$f\")\"
        done

        rm -rf /tmp/polis-rollback.tar.gz /tmp/polis-rollback

        # === 前端回滚 ===
        echo '[前端] 下载 Release...'
        curl -fsSL \"\${DL_BASE}/polis-web-\${VERSION}.tar.gz\" -o /tmp/polis-web-rollback.tar.gz || {
            echo 'WARN: 前端 Release 文件不存在，跳过前端回滚'
        }

        if [ -f /tmp/polis-web-rollback.tar.gz ]; then
            mkdir -p /tmp/polis-web-rollback
            tar -xzf /tmp/polis-web-rollback.tar.gz -C /tmp/polis-web-rollback/ || {
                echo 'ERROR: 前端解压失败'
                rm -rf /tmp/polis-web-rollback.tar.gz /tmp/polis-web-rollback
            }

            if [ -d /tmp/polis-web-rollback ]; then
                # 找到实际的前端目录
                FRONTEND_DIR=\$(find /tmp/polis-web-rollback -name 'server.js' -path '*/standalone/*' 2>/dev/null | head -1 | xargs dirname || echo '')

                if [ -n \"\$FRONTEND_DIR\" ]; then
                    echo '[前端] 备份当前版本...'
                    STAMP=\$(date +%Y%m%d-%H%M%S)
                    if [ -d ${SERVER_WEB_DIR}/.next ]; then
                        mkdir -p ${SERVER_WEB_DIR}/.next-backups
                        mv ${SERVER_WEB_DIR}/.next ${SERVER_WEB_DIR}/.next-backups/pre-release-rollback-\$STAMP
                    fi

                    echo '[前端] 安装...'
                    # 提取 .next 目录 (从 standalone 向上两级)
                    NEXT_DIR=\$(echo \"\$FRONTEND_DIR\" | sed 's|/standalone||')
                    if [ -d \"\$NEXT_DIR\" ]; then
                        rm -rf ${SERVER_WEB_DIR}/.next
                        cp -r \"\$NEXT_DIR\" ${SERVER_WEB_DIR}/.next
                    fi

                    # 复制 static 和 public
                    rm -rf ${SERVER_WEB_DIR}/.next/standalone/.next/static
                    cp -r ${SERVER_WEB_DIR}/.next/static ${SERVER_WEB_DIR}/.next/standalone/.next/static
                    if [ -d ${SERVER_WEB_DIR}/public ]; then
                        rm -rf ${SERVER_WEB_DIR}/.next/standalone/public
                        cp -r ${SERVER_WEB_DIR}/public ${SERVER_WEB_DIR}/.next/standalone/public
                    fi

                    # 清理
                    find ${SERVER_WEB_DIR}/.next -name '._*' -delete 2>/dev/null || true
                fi

                rm -rf /tmp/polis-web-rollback
            fi
            rm -f /tmp/polis-web-rollback.tar.gz
        fi

        # === 重启服务 ===
        echo '[重启] 启动所有服务...'
        for svc in ${RUST_BINARIES[*]}; do
            systemctl restart --no-block \$svc || true
        done
        systemctl restart --no-block polis-web || true

        sleep 2
        echo 'GitHub Release 回滚完成'
    " 2>&1 | while IFS= read -r line; do
        echo "  ${line}"
    done

    log "GitHub Release 回滚完成!"
}

# ---- 仅检查模式 ----
check_only() {
    step "服务器状态检查"
    ssh "${SERVER_USER}@${SERVER_HOST}" "systemctl is-active ${SYSTEMD_SERVICES[*]}" 2>&1 | while IFS= read -r line; do
        if [[ "$line" == "active" ]]; then
            echo -e "  ${GREEN}✓${NC} active"
        else
            echo -e "  ${RED}✗${NC} $line"
        fi
    done

    echo ""
    log "冒烟测试..."
    curl -sk -o /dev/null -w "  HTTP %{http_code} — https://${DOMAIN}/\n" "https://${DOMAIN}/"
    curl -sk -o /dev/null -w "  HTTP %{http_code} — Trending API\n" "https://${DOMAIN}/api/spaces/trending"

    echo ""
    log "最近备份:"
    ssh "${SERVER_USER}@${SERVER_HOST}" '
        echo "前端:"
        ls -1dt '"${SERVER_WEB_DIR}"'/.next-backups/backup-* 2>/dev/null | head -3 || echo "  (无)"
        echo "后端:"
        ls -1dt '"${SERVER_BACKUP_DIR}"'/backup-* 2>/dev/null | head -3 || echo "  (无)"
    '
}

# ---- 主流程 ----
main() {
    echo ""
    echo -e "${BLUE}╔═════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Polis 一键回滚脚本               ║${NC}"
    echo -e "${BLUE}╚═════════════════════════════════════════╝${NC}"
    echo ""

    case "$MODE" in
        list)
            check_ssh
            list_backups
            ;;
        check)
            check_ssh
            check_only
            ;;
        release)
            check_ssh
            rollback_release
            health_check
            ;;
        frontend)
            check_ssh
            rollback_frontend
            health_check
            ;;
        backend)
            check_ssh
            rollback_backend
            health_check
            ;;
        full)
            check_ssh
            rollback_frontend
            rollback_backend
            health_check
            ;;
        *)
            err "未知模式: $MODE"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
    echo -e "${GREEN}  回滚操作完成!${NC}"
    echo -e "${GREEN}  https://${DOMAIN}/${NC}"
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
}

main
