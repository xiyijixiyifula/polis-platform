#!/usr/bin/env bash
# =============================================================================
# weekly-bug-report.sh — 周度 Bug 统计报告生成器
# =============================================================================
# 用法:
#   ./scripts/weekly-bug-report.sh              # 最近 7 天
#   ./scripts/weekly-bug-report.sh 2026-05-26   # 从指定日期起 7 天
#   ./scripts/weekly-bug-report.sh --monthly    # 本月
#
# 输出: Markdown 格式周报，可追加到 docs/bugs/reports/ 或直接查看
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUGS_DIR="$PROJECT_ROOT/docs/bugs"
TIMELINE_FILE="$BUGS_DIR/timeline/2026.md"
INDEX_FILE="$BUGS_DIR/INDEX.md"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 参数解析 ──
MODE="weekly"
START_DATE=""
if [ "${1:-}" = "--monthly" ]; then
    MODE="monthly"
    START_DATE=$(date -v-1m +%Y-%m-%d 2>/dev/null || date -d '1 month ago' +%Y-%m-%d)
elif [ -n "${1:-}" ]; then
    START_DATE="$1"
else
    START_DATE=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
fi

END_DATE=$(date +%Y-%m-%d)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  📊 Polis Bug 周度统计报告                            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "报告周期: ${CYAN}$START_DATE${NC} → ${CYAN}$END_DATE${NC}"
echo -e "模式: ${YELLOW}$MODE${NC}"
echo ""

# ── 从 timeline 提取数据 ──
echo -e "${BOLD}━━━ 本期修复记录 ━━━${NC}"
echo ""

# Parse timeline file for entries in date range
CURRENT_DATE=""
FIX_COUNT=0
REGRESSION_COUNT=0
NEW_PATTERN_COUNT=0
PATTERN_MAP=""

while IFS= read -r line; do
    # Track date headers
    if [[ "$line" =~ ^##\ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
        CURRENT_DATE="${BASH_REMATCH[1]}"
        continue
    fi

    # Skip if date not in range
    if [[ -z "$CURRENT_DATE" ]]; then continue; fi
    if [[ "$CURRENT_DATE" < "$START_DATE" ]]; then continue; fi
    if [[ "$CURRENT_DATE" > "$END_DATE" ]]; then continue; fi

    # Count fixes (lines with | 版本 |)
    if [[ "$line" =~ ^\|\ (v[0-9]+\.[0-9]+\.[0-9]+)\ \|\ (Fix|Bug|修复|复发) ]]; then
        FIX_COUNT=$((FIX_COUNT + 1))
        VER="${BASH_REMATCH[1]}"
        TYPE="${BASH_REMATCH[2]}"

        # Check for regression markers
        if [[ "$line" =~ 复发 ]]; then
            REGRESSION_COUNT=$((REGRESSION_COUNT + 1))
        fi

        # Extract pattern
        if [[ "$line" =~ \[([a-z0-9_-]+)\] ]]; then
            PATTERN="${BASH_REMATCH[1]}"
            PATTERN_MAP="$PATTERN_MAP$PATTERN "
        fi

        echo "  $line" | sed 's/^  //'
    fi
done < "$TIMELINE_FILE"

echo ""

# ── 统计汇总 ──
echo -e "${BOLD}━━━ 统计汇总 ━━━${NC}"
echo ""

echo "| 指标 | 数值 |"
echo "|------|------|"
echo "| 本期修复数 | $FIX_COUNT |"
echo "| 本期复发数 | $REGRESSION_COUNT |"

if [ $FIX_COUNT -gt 0 ]; then
    REGRESSION_RATE=$(echo "scale=1; $REGRESSION_COUNT * 100 / $FIX_COUNT" | bc)
    echo "| 复发率 | ${REGRESSION_RATE}% |"
else
    echo "| 复发率 | 0% |"
fi

# Top patterns this period
if [ -n "$PATTERN_MAP" ]; then
    echo "| 涉及 Pattern | $(echo "$PATTERN_MAP" | tr ' ' '\n' | sort | uniq -c | sort -rn | head -5 | awk '{printf "%s(%s次) ", $2, $1}') |"
fi

echo ""

# ── 从 INDEX.md 提取累计数据 ──
echo -e "${BOLD}━━━ 累计统计 (截至 $END_DATE) ━━━${NC}"
echo ""

# Parse total fixes from INDEX.md
TOTAL_FIXES=$(grep "总修复数" "$INDEX_FILE" | grep -o '[0-9]\+' | head -1)
TOTAL_PATTERNS=$(grep "已归类 Pattern" "$INDEX_FILE" | grep -o '[0-9]\+' | head -1)
TOTAL_REGRESSIONS=$(grep "回归链数" "$INDEX_FILE" | grep -o '[0-9]\+' | head -1)
TOTAL_RECURRENCES=$(grep "总复发次数" "$INDEX_FILE" | grep -o '[0-9]\+' | head -1)

echo "| 指标 | 数值 |"
echo "|------|------|"
echo "| 累计修复数 | ${TOTAL_FIXES:-N/A} |"
echo "| 已归类 Pattern | ${TOTAL_PATTERNS:-N/A} |"
echo "| 回归链数 | ${TOTAL_REGRESSIONS:-N/A} |"
echo "| 累计复发次数 | ${TOTAL_RECURRENCES:-N/A} |"
echo ""

# ── 脆弱文件变更检测 ──
echo -e "${BOLD}━━━ 本期脆弱文件变更 ━━━${NC}"
echo ""

FRAGILE_FILES=(
    "SpacePageClient.tsx"
    "space_routes.rs"
    "content_handler.rs"
    "SpaceSettings.tsx"
    "content_routes.rs"
    "main.rs"
    "module-config.ts"
    "api.ts"
    "ContentCard.tsx"
    "PostCard.tsx"
    "creations/new/page.tsx"
    "PostPageClient.tsx"
    "ManagePageClient.tsx"
)

CHANGED_FRAGILE=""
for f in "${FRAGILE_FILES[@]}"; do
    # Check git log for changes in the period
    if git log --since="$START_DATE" --until="$END_DATE" --oneline -- "*$f*" 2>/dev/null | grep -q .; then
        CHANGES=$(git log --since="$START_DATE" --until="$END_DATE" --oneline -- "*$f*" 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  ${RED}⚠ $f${NC} — $CHANGES 次修改"
        CHANGED_FRAGILE="$CHANGED_FRAGILE$f "
    fi
done

if [ -z "$CHANGED_FRAGILE" ]; then
    echo -e "  ${GREEN}✅ 本期无脆弱文件变更${NC}"
fi

echo ""

# ── 预警建议 ──
echo -e "${BOLD}━━━ 预警建议 ━━━${NC}"
echo ""

WARNINGS=0

# Check for regression patterns
if [ "$REGRESSION_COUNT" -gt 0 ]; then
    echo -e "  ${RED}⚠ 本期发生 $REGRESSION_COUNT 次复发${NC}"
    echo "    建议: 检查复发 Pattern 是否需要升级到架构层修复 (Stage 4)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if fragile files were changed
if [ -n "$CHANGED_FRAGILE" ]; then
    echo -e "  ${YELLOW}⚠ 脆弱文件在本期被修改${NC}"
    echo "    建议: 运行 ./scripts/pre-deploy-check.sh 确认无回归"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if any Pattern is at Stage 2 with frequent recurrence
if [ "$REGRESSION_COUNT" -ge 2 ]; then
    echo -e "  ${RED}⚠ 复发频率偏高 ($REGRESSION_COUNT 次)${NC}"
    echo "    建议: 启动根除项目，将 Pattern 从 Stage 2 升级到 Stage 3/4"
    WARNINGS=$((WARNINGS + 1))
fi

if [ "$WARNINGS" -eq 0 ]; then
    echo -e "  ${GREEN}✅ 本期无特别预警${NC}"
fi

echo ""
echo -e "${BOLD}━━━ 报告结束 ━━━${NC}"
echo ""
echo "完整修复记录: docs/bugs/timeline/2026.md"
echo "Pattern 成熟度: docs/bugs/INDEX.md#模式成熟度模型"
echo "修复配方索引: docs/bugs/fix-recipes/INDEX.md"
echo "回归追踪: docs/bugs/regression-map.md"
echo ""
