#!/usr/bin/env bash
# =============================================================================
# Polis Bug 统计生成器 — 从追踪文件自动生成统计数据
# 用法: ./scripts/gen-stats.sh [--json]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$ROOT_DIR"

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Bug 追踪统计报告 — $(date +%Y-%m-%d)${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""

# ── 1. 脆弱文件 Top-10 ──────────────────────────────────────

echo -e "${BLUE}▸ 脆弱文件 Top-10（修复次数降序）${NC}"
echo ""

# 从 fix-points.md 提取文件修复次数
grep -n "| \`" docs/bugs/fix-points.md | \
    grep -v "文件\|函数/位置\|------" | \
    awk -F'|' '{
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
        print $2
    }' | \
    sed 's/`//g' | \
    sort | uniq -c | sort -rn | head -10 | \
    awk '{
        printf "  %2d. %-55s %s 次\n", NR, $2, $1
    }'

echo ""

# ── 2. Pattern 频率分布 ──────────────────────────────────────

echo -e "${BLUE}▸ Pattern 频率分布${NC}"
echo ""

# 从 INDEX.md 的 Pattern 列表中提取
awk -F'|' '/^\| \[.*\]\(patterns\// {
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
    # 提取文件名
    fname = $1
    gsub(/.*\(patterns\//, "", fname)
    gsub(/\).*/, "", fname)
    gsub(/\.md$/, "", fname)
    desc = $2
    printf "  %-35s %s\n", fname, desc
}' docs/bugs/INDEX.md

echo ""

# ── 3. 月度趋势 ──────────────────────────────────────────────

echo -e "${BLUE}▸ 月度修复趋势${NC}"
echo ""

# 从 timeline 统计每月修复数
for year_file in docs/bugs/timeline/*.md; do
    year=$(basename "$year_file" .md)
    echo "  $year:"
    grep "^## 20" "$year_file" | while read -r date_line; do
        date_str=$(echo "$date_line" | sed 's/^## //')
        echo "    $date_str"
    done
done

echo ""

# ── 4. Bug DNA 分布 ──────────────────────────────────────────

echo -e "${BLUE}▸ Bug DNA 类别分布${NC}"
echo ""

awk '/^## DNA 分类体系/,/^## 如何使用/' docs/bugs/regression-map.md 2>/dev/null | \
    grep -E "^\| (RTE|DEP|UI|SEC|CFG|OTHER)" | \
    awk -F'|' '{
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $6)
        printf "  %-12s %-30s %s\n", $2, $3, $6
    }'

echo ""

# ── 5. 回归风险热力图 ────────────────────────────────────────

echo -e "${BLUE}▸ 修复影响矩阵 — 高风险修改区域${NC}"
echo ""

awk '/^## 修复影响矩阵/,/^---$/' docs/bugs/regression-map.md 2>/dev/null | \
    grep "🔴" | \
    awk -F'|' '{
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3)
        printf "  🔴 %-45s → %s\n", $2, $3
    }'

echo ""

# ── 6. 总览 ──────────────────────────────────────────────────

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  总览${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"

total_fixes=$(awk -F'|' '/总修复数/ { gsub(/[^0-9]/, "", $3); print $3 }' docs/bugs/INDEX.md)
total_patterns=$(grep -c "^| \[.*\](patterns/" docs/bugs/INDEX.md || echo "?")
total_regressions=$(awk -F'|' '/回归链总数/ { gsub(/[^0-9]/, "", $3); print $3 }' docs/bugs/regression-map.md)
total_recipes=$(grep -c "^| \[" docs/bugs/fix-recipes/INDEX.md || echo "?")
fragile_files=$(grep -c "修复次数" docs/bugs/regression-map.md || echo "?")
fix_points=$(awk -F'|' '/总修复点位/ { gsub(/[^0-9]/, "", $3); print $3 }' docs/bugs/fix-points.md)

echo ""
echo -e "  总修复数:      ${GREEN}$total_fixes${NC}"
echo -e "  Pattern 数:    ${GREEN}$total_patterns${NC}"
echo -e "  修复配方数:    ${GREEN}$total_recipes${NC}"
echo -e "  回归链数:      ${GREEN}$total_regressions${NC}"
echo -e "  修复点位:      ${GREEN}$fix_points${NC}"
echo -e "  脆弱文件:      ${GREEN}$fragile_files${NC}"
echo ""

# ── 7. JSON 输出（可选）────────────────────────────────────────

if [[ "${1:-}" == "--json" ]]; then
    echo "{"
    echo "  \"total_fixes\": $total_fixes,"
    echo "  \"total_patterns\": $total_patterns,"
    echo "  \"total_recipes\": $total_recipes,"
    echo "  \"total_regressions\": $total_regressions,"
    echo "  \"fix_points\": $fix_points,"
    echo "  \"date\": \"$(date +%Y-%m-%d)\""
    echo "}"
fi
