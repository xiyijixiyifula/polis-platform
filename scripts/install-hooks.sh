#!/usr/bin/env bash
# =============================================================================
# Polis Git Hooks 安装脚本
# 安装 pre-push hook: push 前自动运行 pre-deploy-check.sh
# 用法: ./scripts/install-hooks.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.git/hooks"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${CYAN}安装 Git Hooks...${NC}"

# 检查 .git 目录
if [[ ! -d "$ROOT_DIR/.git" ]]; then
    echo "错误: 未找到 .git 目录，请在 git 仓库根目录运行此脚本"
    exit 1
fi

# Pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/usr/bin/env bash
# Pre-push hook: 推送前自动运行部署前检查

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
CHECK_SCRIPT="$ROOT_DIR/scripts/pre-deploy-check.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ ! -f "$CHECK_SCRIPT" ]]; then
    echo -e "${YELLOW}⚠ pre-deploy-check.sh 未找到，跳过检查${NC}"
    exit 0
fi

echo -e "${CYAN}━━━ Pre-push: 运行部署前检查 ━━━${NC}"

if "$CHECK_SCRIPT" --strict; then
    echo -e "${GREEN}✅ 检查通过，允许推送${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ 部署前检查失败，推送被阻断${NC}"
    echo -e "${YELLOW}修复上述问题后重新推送，或使用 --no-verify 跳过（不推荐）${NC}"
    exit 1
fi
HOOK

chmod +x "$HOOKS_DIR/pre-push"

echo -e "${GREEN}✅ pre-push hook 已安装到 .git/hooks/pre-push${NC}"
echo ""
echo "现在每次 git push 前会自动运行 pre-deploy-check.sh --strict"
echo ""
echo -e "如需临时跳过:  ${YELLOW}git push --no-verify${NC}"
echo -e "如需卸载 hook: ${YELLOW}rm .git/hooks/pre-push${NC}"
