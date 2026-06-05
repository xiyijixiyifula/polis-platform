#!/bin/bash
set -euo pipefail

## ============================================================
## Polis 一键部署脚本
## 用法: ./deploy.sh [选项]
##
## 选项:
##   --full            全量部署 (默认)
##   --backend         仅部署后端
##   --frontend        仅部署前端
##   --check           仅检查服务器状态
##   --version VERSION 指定版本号 (默认自动生成)
##   --dry-run         仅本地构建+打包，不上传/部署
##   --help            显示帮助
##
## 示例:
##   ./deploy.sh                          # 全量部署 (自动版本号)
##   ./deploy.sh --backend                # 仅部署后端
##   ./deploy.sh --version v1.0.0         # 指定版本号
##   ./deploy.sh --dry-run                # 仅本地构建打包，不部署
## ============================================================

# ---- 配置 ----
SERVER_HOST="speedtest.mzgw.com"
SERVER_USER="root"
GITHUB_REPO="xiyijixiyifula/polis-platform"
RUST_BINARIES=(polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate)
RUST_TARGET="x86_64-unknown-linux-gnu"
WEB_DIR="web"
SERVER_BIN_DIR="/usr/local/bin"
SERVER_WEB_DIR="/root/polis/web"
SERVER_ENV_FILE="/root/polis/.env"
SYSTEMD_SERVICES=(polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-web)

# 自动生成版本号: v0.3.YYYYMMDD-HHMM
VERSION="v0.3.$(date +%Y%m%d-%H%M)"
MODE="full"
DRY_RUN=false

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
        --full)    MODE="full"; shift ;;
        --backend) MODE="backend"; shift ;;
        --frontend) MODE="frontend"; shift ;;
        --check)   MODE="check"; shift ;;
        --version) VERSION="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help)    head -20 "$0" | grep '^##' | sed 's/^## //; s/^##$//'; exit 0 ;;
        *) err "未知选项: $1"; head -20 "$0" | grep '^#' | sed 's/^# \?//'; exit 1 ;;
    esac
done

# ---- 函数 ----

preflight_check() {
    step "阶段 0: 前置检查"

    # 检查本地依赖
    for cmd in git cargo npm gh ssh curl; do
        if ! command -v "$cmd" &>/dev/null; then
            err "缺少命令: $cmd"
            exit 1
        fi
    done

    # 检查 zig cc (交叉编译 linker)
    if ! command -v zig &>/dev/null; then
        warn "未安装 zig，交叉编译可能失败。安装: brew install zig"
    fi

    # 检查 GitHub CLI 认证
    if ! gh auth status &>/dev/null; then
        err "GitHub CLI 未认证，请先执行 gh auth login"
        exit 1
    fi

    # 检查 SSH 连接
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SERVER_USER}@${SERVER_HOST}" "echo ok" &>/dev/null; then
        err "无法 SSH 连接服务器 ${SERVER_HOST}"
        exit 1
    fi

    # 检查有未提交的变更
    if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
        warn "有未提交的变更，请先提交或暂存"
        git status --short
        read -rp "继续部署? [y/N] " yn
        if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
            exit 1
        fi
    fi

    log "前置检查通过"
}

build_rust() {
    step "阶段 1: 交叉编译 Rust 后端"

    log "目标: ${RUST_TARGET}"
    log "待编译: ${RUST_BINARIES[*]}"

    export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER="$(pwd)/deploy/zig-cc-linker.sh"
    export CC_x86_64_unknown_linux_gnu="zig cc"
    export CARGO_NET_RETRY=3

    for bin in "${RUST_BINARIES[@]}"; do
        # 检查是否有对应 crate
        local crate_dir="crates/${bin}"
        if [[ ! -d "$crate_dir" ]]; then
            warn "跳过 ${bin}: 目录 ${crate_dir} 不存在"
            continue
        fi

        log "编译 ${bin}..."
        cargo build --release --target "${RUST_TARGET}" -p "${bin}" 2>&1 | tail -3
        local binary_path="target/${RUST_TARGET}/release/${bin}"
        if [[ ! -f "$binary_path" ]]; then
            err "${bin} 编译失败"
            exit 1
        fi
        log "${bin} 编译完成 ($(du -h "$binary_path" | cut -f1))"
    done

    log "Rust 编译全部完成"
}

build_frontend() {
    step "阶段 2: 构建前端"

    cd "$WEB_DIR"

    log "安装依赖..."
    npm install --silent 2>&1 | tail -1

    log "构建 Next.js (standalone 模式)..."
    npm run build 2>&1 | tail -5

    if [[ ! -d ".next/standalone" ]]; then
        err "Next.js standalone 构建失败: .next/standalone 目录不存在"
        exit 1
    fi

    cd ..
    log "前端构建完成 ($(du -sh "$WEB_DIR/.next" | cut -f1))"
}

package() {
    step "阶段 3: 打包"

    local release_dir="polis-release-${VERSION}"

    rm -rf "$release_dir" "polis-binaries-${VERSION}.tar.gz" "polis-web-${VERSION}.tar.gz"

    # --- 打包后端 ---
    if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
        log "打包后端二进制..."
        mkdir -p "${release_dir}/rust"

        for bin in "${RUST_BINARIES[@]}"; do
            local src="target/${RUST_TARGET}/release/${bin}"
            if [[ -f "$src" ]]; then
                cp "$src" "${release_dir}/rust/"
            fi
        done

        cd "$release_dir"
        COPYFILE_DISABLE=1 tar -czf "../polis-binaries-${VERSION}.tar.gz" rust/
        cd ..
        log "后端打包完成: polis-binaries-${VERSION}.tar.gz ($(du -h "polis-binaries-${VERSION}.tar.gz" | cut -f1))"
    fi

    # --- 打包前端 ---
    if [[ "$MODE" == "full" || "$MODE" == "frontend" ]]; then
        log "打包前端..."
        mkdir -p "${release_dir}/frontend"

        cp -r "${WEB_DIR}/.next" "${release_dir}/frontend/.next"
        cp -r "${WEB_DIR}/public" "${release_dir}/frontend/public"

        # 清理 macOS 污染文件
        find "${release_dir}" -name '._*' -delete 2>/dev/null || true
        find "${release_dir}" -name '.DS_Store' -delete 2>/dev/null || true

        cd "$release_dir"
        COPYFILE_DISABLE=1 tar -czf "../polis-web-${VERSION}.tar.gz" frontend/
        cd ..
        log "前端打包完成: polis-web-${VERSION}.tar.gz ($(du -h "polis-web-${VERSION}.tar.gz" | cut -f1))"
    fi

    rm -rf "$release_dir"
}

upload() {
    step "阶段 4: 上传 GitHub Release"

    # 构建 release notes
    local notes
    notes=$(git log --oneline -10 | sed 's/^/- /')

    # 构建文件列表
    local files=()
    if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
        files+=("polis-binaries-${VERSION}.tar.gz")
    fi
    if [[ "$MODE" == "full" || "$MODE" == "frontend" ]]; then
        files+=("polis-web-${VERSION}.tar.gz")
    fi

    log "创建 Release: ${VERSION}"
    gh release create "$VERSION" "${files[@]}" \
        --repo "$GITHUB_REPO" \
        --title "$VERSION" \
        --notes "$notes"

    log "Release 上传完成: https://github.com/${GITHUB_REPO}/releases/tag/${VERSION}"
}

deploy() {
    step "阶段 5: 服务器部署"

    local deploy_cmds=""

    # --- 部署后端 ---
    if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
        local dl_url="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/polis-binaries-${VERSION}.tar.gz"

        deploy_cmds+="
# === 备份 ===
BACKUP_DIR=\"/root/polis/target/release/backup-\$(date +%Y%m%d-%H%M%S)\"
mkdir -p \"\$BACKUP_DIR\"
for svc in ${RUST_BINARIES[*]}; do
  [ -f \"${SERVER_BIN_DIR}/\$svc\" ] && cp \"${SERVER_BIN_DIR}/\$svc\" \"\$BACKUP_DIR/\"
done

# === 下载 ===
cd /tmp
curl -fsSL '${dl_url}' -o polis-binaries.tar.gz
mkdir -p /tmp/polis-binaries
tar -xzf polis-binaries.tar.gz -C /tmp/polis-binaries/

# === 安装 ===
cp /tmp/polis-binaries/rust/* ${SERVER_BIN_DIR}/
chmod +x ${SERVER_BIN_DIR}/polis-*

# === 清理 ===
rm -rf /tmp/polis-binaries.tar.gz /tmp/polis-binaries

echo '后端部署完成'
"
    fi

    # --- 部署前端 ---
    if [[ "$MODE" == "full" || "$MODE" == "frontend" ]]; then
        local web_dl_url="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/polis-web-${VERSION}.tar.gz"

        deploy_cmds+="
# === 下载前端 ===
cd /tmp
curl -fsSL '${web_dl_url}' -o polis-web.tar.gz
mkdir -p /tmp/polis-web-deploy
tar -xzf polis-web.tar.gz -C /tmp/polis-web-deploy/

# === 清空旧前端 ===
rm -rf ${SERVER_WEB_DIR}/.next ${SERVER_WEB_DIR}/public

# === 安装新前端 ===
cp -r /tmp/polis-web-deploy/frontend/.next ${SERVER_WEB_DIR}/.next
cp -r /tmp/polis-web-deploy/frontend/public ${SERVER_WEB_DIR}/public

# === 清理 macOS 污染 ===
find ${SERVER_WEB_DIR}/.next -name '._*' -delete 2>/dev/null || true
rm -rf ${SERVER_WEB_DIR}/.next/cache

# === 关键: 复制 static 和 public 到 standalone 目录 ===
# Next.js standalone server 从 .next/standalone/.next/static 提供 JS/CSS
# 不执行 → /_next/static/* 全部 404 → 页面白屏
rm -rf ${SERVER_WEB_DIR}/.next/standalone/.next/static
cp -r ${SERVER_WEB_DIR}/.next/static ${SERVER_WEB_DIR}/.next/standalone/.next/static
cp -r ${SERVER_WEB_DIR}/public ${SERVER_WEB_DIR}/.next/standalone/public

# === 清理 ===
rm -rf /tmp/polis-web.tar.gz /tmp/polis-web-deploy

echo '前端部署完成'
"
    fi

    # --- 同步 systemd 服务文件 (防止路径不一致) ---
    deploy_cmds+="
# === 同步 polis-web systemd 服务文件 ===
cat > /etc/systemd/system/polis-web.service << 'SVC_EOF'
[Unit]
Description=Polis Web Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${SERVER_WEB_DIR}/.next/standalone
ExecStartPre=/bin/bash -c \"cp -rn ${SERVER_WEB_DIR}/.next/static ${SERVER_WEB_DIR}/.next/standalone/.next/static 2>/dev/null; cp -rn ${SERVER_WEB_DIR}/public ${SERVER_WEB_DIR}/.next/standalone/public 2>/dev/null; true\"
ExecStart=/usr/bin/node ${SERVER_WEB_DIR}/.next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
StandardOutput=append:/root/polis/web.log
StandardError=append:/root/polis/web.log

[Install]
WantedBy=multi-user.target
SVC_EOF
systemctl daemon-reload
echo 'systemd 服务文件已同步'
"

    # --- 重启服务 ---
    deploy_cmds+="
# === 重启服务 ===
"
    if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
        deploy_cmds+="systemctl restart --no-block ${RUST_BINARIES[*]} polis-web || true
"
    elif [[ "$MODE" == "frontend" ]]; then
        deploy_cmds+="systemctl restart --no-block polis-web || true
"
    fi

    deploy_cmds+="
sleep 3
"

    log "执行远程部署..."
    echo "$deploy_cmds" | ssh "${SERVER_USER}@${SERVER_HOST}" "bash -s" 2>&1 | while IFS= read -r line; do
        echo "  ${line}"
    done

    log "远程部署完成"
}

verify() {
    step "阶段 6: 验证"

    log "检查服务状态..."
    ssh "${SERVER_USER}@${SERVER_HOST}" "systemctl is-active ${SYSTEMD_SERVICES[*]}" 2>&1 | while IFS= read -r line; do
        if [[ "$line" == "active" ]]; then
            echo -e "  ${GREEN}✓${NC} active"
        else
            echo -e "  ${RED}✗${NC} $line"
        fi
    done

    log "冒烟测试..."
    local http_code
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" "https://www.mzgw.com/" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} HTTP ${http_code} — https://www.mzgw.com/"
    else
        echo -e "  ${RED}✗${NC} HTTP ${http_code} — 前端可能异常"
    fi

    # 测试 API
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" "https://www.mzgw.com/api/spaces/trending" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} HTTP ${http_code} — Trending API"
    else
        echo -e "  ${RED}✗${NC} HTTP ${http_code} — Trending API"
    fi
}

cleanup_local() {
    step "阶段 7: 清理本地文件"
    rm -f "polis-binaries-${VERSION}.tar.gz" "polis-web-${VERSION}.tar.gz"
    log "清理完成"
}

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
    curl -sk -o /dev/null -w "  HTTP %{http_code} — https://www.mzgw.com/\n" "https://www.mzgw.com/"
    curl -sk -o /dev/null -w "  HTTP %{http_code} — Trending API\n" "https://www.mzgw.com/api/spaces/trending"
}

# ---- 主流程 ----
main() {
    echo ""
    echo -e "${BLUE}╔═════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Polis 一键部署 v${VERSION}     ║${NC}"
    echo -e "${BLUE}╚═════════════════════════════════════════╝${NC}"
    echo ""

    if [[ "$MODE" == "check" ]]; then
        check_only
        exit 0
    fi

    preflight_check

    if [[ "$MODE" == "full" || "$MODE" == "backend" ]]; then
        build_rust
    fi

    if [[ "$MODE" == "full" || "$MODE" == "frontend" ]]; then
        build_frontend
    fi

    package

    if [[ "$DRY_RUN" == true ]]; then
        log "Dry-run 模式: 跳过上传和部署"
        log "本地构建+打包完成, 文件:"
        ls -lh polis-*-"${VERSION}.tar.gz" 2>/dev/null
        exit 0
    fi

    # 推送代码
    step "推送代码"
    git push origin main

    upload
    deploy
    verify
    cleanup_local

    echo ""
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
    echo -e "${GREEN}  部署完成! 版本: ${VERSION}${NC}"
    echo -e "${GREEN}  https://www.mzgw.com/${NC}"
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
}

main
