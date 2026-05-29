#!/usr/bin/env bash
# =============================================================================
# Polis Bug 修复记录工具 — 一键更新所有追踪文件
# =============================================================================
# 用法:
#   交互模式:  ./scripts/bug-record.sh
#   非交互模式: ./scripts/bug-record.sh add --version v1.0.36 --type Bug \
#                --symptom "页面白屏" --pattern array-map-null \
#                --regression "所有.map()未防空" \
#                --files "web/src/components/Foo.tsx:42:?.map()防空"
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

TODAY=$(date +%Y-%m-%d)

# ── 工具函数 ──────────────────────────────────────────────────

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }
header(){ echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# 从 INDEX.md 解析 Pattern 列表
get_patterns() {
    # 提取 Pattern 列表中的文件名和描述
    awk -F'|' '/^\| \[.*\]\(patterns\/.*\.md\)/ {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3)
        # 提取文件名
        fname = $1
        gsub(/.*\(patterns\//, "", fname)
        gsub(/\).*/, "", fname)
        gsub(/\.md$/, "", fname)
        # 提取症状描述
        desc = $2
        # 提取严重程度
        sev = $3
        printf "%s|%s|%s\n", fname, desc, sev
    }' "$ROOT_DIR/docs/bugs/INDEX.md"
}

# 获取当前总修复数
get_fix_count() {
    awk -F'|' '/总修复数/ { gsub(/[^0-9]/, "", $3); print $3 }' "$ROOT_DIR/docs/bugs/INDEX.md"
}

# 追加一行到 timeline
append_timeline() {
    local version="$1" type="$2" desc="$3" pattern="$4" regression_risk="$5"
    local timeline="$ROOT_DIR/docs/bugs/timeline/2026.md"
    local pattern_cell="—"
    [[ -n "$pattern" ]] && pattern_cell="[$pattern](../patterns/$pattern.md)"
    [[ "$pattern" == "NEW" ]] && pattern_cell="—"

    # 在 "## $TODAY" 区块后（或创建）追加记录
    if grep -q "^## $TODAY" "$timeline"; then
        # 已有今天的区块，在区块的表格后追加
        local insert_line
        insert_line=$(grep -n "^## $TODAY" "$timeline" | head -1 | cut -d: -f1)
        insert_line=$((insert_line + 3))
        sed -i '' "${insert_line}i\\
| $version | $type | $desc | $pattern_cell | $regression_risk | @xiyijixiyifula |" "$timeline"
    else
        # 没有今天的区块，在 "## 20" 开头之前插入新的一天
        local first_date_line
        first_date_line=$(grep -n "^## 20" "$timeline" | head -1 | cut -d: -f1)
        sed -i '' "${first_date_line}i\\
\\
## $TODAY\\
\\
| 版本 | 类型 | 描述 | Pattern | 回归风险 | 修复人 |\\
|------|------|------|---------|----------|--------|\\
| $version | $type | $desc | $pattern_cell | $regression_risk | @xiyijixiyifula |" "$timeline"
    fi
    ok "timeline/2026.md — 已追加修复记录"
}

# 更新 INDEX.md 统计数字
update_index_stats() {
    local index="$ROOT_DIR/docs/bugs/INDEX.md"
    local old_count
    old_count=$(get_fix_count)
    local new_count=$((old_count + 1))

    # 更新总修复数
    sed -i '' "s/| 总修复数 | $old_count |/| 总修复数 | $new_count |/" "$index"

    # 更新最近更新日期
    local old_date
    old_date=$(grep "最近更新" "$index" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    sed -i '' "s/最近更新 | $old_date /最近更新 | $TODAY /" "$index"

    ok "INDEX.md — 总修复数 $old_count → $new_count, 日期更新为 $TODAY"
}

# 追加修复点位到 fix-points.md
append_fix_points() {
    local files="$1" version="$2" pattern="$3"
    local fix_points="$ROOT_DIR/docs/bugs/fix-points.md"
    local pattern_cell="—"
    [[ -n "$pattern" ]] && pattern_cell="$pattern"

    # 更新统计: 总修复点位 +1
    local old_points
    old_points=$(awk -F'|' '/总修复点位/ { gsub(/[^0-9]/, "", $3); print $3 }' "$fix_points")
    local new_points=$((old_points + 1))
    sed -i '' "s/| 总修复点位 | $old_points |/| 总修复点位 | $new_points |/" "$fix_points"
    sed -i '' "s/最近更新 | [0-9-]* (/最近更新 | $TODAY (/" "$fix_points"

    # 解析文件条目，追加到对应区域
    local remaining_files="$files"
    while IFS= read -r line; do
        [[ -z "$(echo "$line" | tr -d '[:space:]')" ]] && continue
        local file_path="${line%%:*}"
        local rest="${line#*:}"
        local line_num="${rest%%:*}"
        local desc="${rest#*:}"
        # 去掉行号部分的冒号后缀
        line_num="${line_num%%:*}"
        [[ -z "$file_path" ]] && continue

        # 追加到完整点位索引区域（在 "### 前端" 或 "### 后端" 等区块中）
        # 简化处理: 追加到 Web/前端区域的末尾
        local section="### 前端 — web"
        if echo "$file_path" | grep -q "crates/"; then
            local crate_name
            crate_name=$(echo "$file_path" | sed 's|crates/||;s|/.*||')
            section="### 后端 — polis-$crate_name"
        elif echo "$file_path" | grep -q "scripts/"; then
            section="### 脚本 — Shell"
        elif echo "$file_path" | grep -q "deploy/"; then
            section="### 部署 — infra"
        fi

        # 在当前文件已有条目中的表格中追加
        local existing_file
        existing_file=$(grep -n "| \`$file_path\` |" "$fix_points" | head -1 | cut -d: -f1 || true)
        if [[ -n "$existing_file" ]]; then
            # 在该行后追加
            sed -i '' "${existing_file}a\\
| \`$file_path\` | $desc | $version | $pattern_cell |" "$fix_points"
        else
            # 在对应 section 后追加新条目
            local section_line
            section_line=$(grep -n "^$section" "$fix_points" | head -1 | cut -d: -f1 || true)
            if [[ -n "$section_line" ]]; then
                # 找到该 section 的表格头后面的位置
                local insert_at=$((section_line + 3))
                sed -i '' "${insert_at}a\\
| \`$file_path\` | $desc | $version | $pattern_cell |" "$fix_points"
            fi
        fi
    done <<< "$files"

    ok "fix-points.md — 修复点位 $old_points → $new_points"
}

# 追加到 KNOWN-ISSUES.md
append_known_issues() {
    local version="$1" desc="$2" pattern="$3"
    local ki_file="$ROOT_DIR/docs/KNOWN-ISSUES.md"

    local entry="- **$desc ($version)**"
    if [[ -n "$pattern" && "$pattern" != "NEW" ]]; then
        entry="$entry — 见 [$pattern](bugs/patterns/$pattern.md)"
    fi

    # 在 "## 关键 Bug 修复记录" 区块的开头追加
    local section_line
    section_line=$(grep -n "^## 关键 Bug 修复记录" "$ki_file" | head -1 | cut -d: -f1)
    if [[ -n "$section_line" ]]; then
        local insert_at=$((section_line + 2))
        sed -i '' "${insert_at}a\\
$entry" "$ki_file"
    fi

    ok "KNOWN-ISSUES.md — 已追加修复记录"
}

# 更新 Pattern 文件的已修复点位
update_pattern_file() {
    local pattern="$1" version="$2" desc="$3"
    local pattern_file="$ROOT_DIR/docs/bugs/patterns/$pattern.md"

    if [[ ! -f "$pattern_file" ]]; then
        warn "Pattern 文件不存在: $pattern_file (将作为新 Pattern 处理)"
        return 0
    fi

    # 更新最近一次复发日期
    sed -i '' "s/- \*\*最近一次\*\*: .*/- **最近一次**: $version ($TODAY)/" "$pattern_file"

    # 在已修复点位表格中追加
    local table_start
    table_start=$(grep -n "^| 版本 | 文件" "$pattern_file" | head -1 | cut -d: -f1 || true)
    if [[ -n "$table_start" ]]; then
        local insert_at=$((table_start + 2))
        sed -i '' "${insert_at}a\\
| $version | — | $desc | $TODAY |" "$pattern_file"
    fi

    ok "patterns/$pattern.md — 已更新修复点位"
}

# 更新回归地图
update_regression_map() {
    local is_regression="$1" pattern="$2" desc="$3"
    local reg_file="$ROOT_DIR/docs/bugs/regression-map.md"

    if [[ "$is_regression" != "true" ]]; then
        return 0
    fi

    # 更新"总回归次数"统计
    local old_reg
    old_reg=$(awk -F'|' '/回归链总数/ { gsub(/[^0-9]/, "", $3); print $3 }' "$reg_file")
    local new_reg=$((old_reg + 1))
    sed -i '' "s/| 回归链总数 | $old_reg |/| 回归链总数 | $new_reg |/" "$reg_file"

    # 更新 INDEX.md 中对应 Pattern 的复发次数
    local index="$ROOT_DIR/docs/bugs/INDEX.md"
    # 找到 Pattern 对应的行并增加复发次数
    awk -v p="$pattern" -F'|' '
    BEGIN { OFS = "|" }
    $0 ~ p {
        for (i=4; i<=NF; i++) {
            if ($i ~ /[0-9]+/) {
                val = $i; gsub(/[^0-9]/, "", val)
                new = val + 1
                gsub(/[0-9]+/, new, $i)
                break
            }
            # "多次" 保持不变
        }
    }
    { print }
    ' "$index" > "${index}.tmp" && mv "${index}.tmp" "$index"

    ok "regression-map.md — 回归链 +1"
}

# ── 交互模式 ──────────────────────────────────────────────────

interactive_mode() {
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     Bug 修复记录工具 (v1.0)         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""

    # 获取当前版本号
    local default_version="v1.0.36"
    read -r -p "版本号 [$default_version]: " VERSION
    VERSION="${VERSION:-$default_version}"

    read -r -p "类型 (Bug/Feature/Security/Deploy/Defense) [Bug]: " TYPE
    TYPE="${TYPE:-Bug}"

    read -r -p "症状描述: " SYMPTOM
    [[ -z "$SYMPTOM" ]] && { err "症状描述不能为空"; exit 1; }

    # 显示已知 Pattern 列表
    echo ""
    echo -e "${CYAN}已知 Pattern 列表:${NC}"
    local patterns
    patterns=$(get_patterns)
    local i=1
    echo "$patterns" | while IFS='|' read -r fname desc sev; do
        printf "  %2d. %-30s %s\n" "$i" "$fname" "$desc"
        ((i++))
    done
    echo "   0. 新建 Pattern（不匹配现有）"

    read -r -p "匹配到已知 Pattern? (输入编号) [0]: " PATTERN_IDX
    PATTERN_IDX="${PATTERN_IDX:-0}"

    local PATTERN="NEW"
    if [[ "$PATTERN_IDX" != "0" ]]; then
        PATTERN=$(echo "$patterns" | sed -n "${PATTERN_IDX}p" | cut -d'|' -f1)
    fi

    read -r -p "是否为回归（修 A 导致 B 复发）? (y/n) [n]: " IS_REGRESSION
    IS_REGRESSION="${IS_REGRESSION:-n}"

    local REG_FLAG="false"
    [[ "$IS_REGRESSION" == "y" ]] && REG_FLAG="true"

    read -r -p "回归风险说明: " REG_RISK
    REG_RISK="${REG_RISK:--}"

    echo ""
    echo "修复文件及位置 (格式: 文件路径:行号:修改内容, 每行一个, 空行结束):"
    local FILES=""
    while IFS= read -r line; do
        [[ -z "$line" ]] && break
        FILES="${FILES}${line}\n"
    done
    [[ -z "$FILES" ]] && { err "至少需要一个文件条目"; exit 1; }

    # 确认
    echo ""
    echo -e "${YELLOW}══════════════════════════════════════${NC}"
    echo -e "  版本:     ${GREEN}$VERSION${NC}"
    echo -e "  类型:     ${GREEN}$TYPE${NC}"
    echo -e "  症状:     ${GREEN}$SYMPTOM${NC}"
    echo -e "  Pattern:  ${GREEN}$PATTERN${NC}"
    echo -e "  回归:     ${GREEN}$IS_REGRESSION${NC}"
    echo -e "  回归风险: ${GREEN}$REG_RISK${NC}"
    echo -e "  文件:"
    echo -e "$FILES" | while read -r f; do [[ -n "$f" ]] && echo -e "    - $f"; done
    echo -e "${YELLOW}══════════════════════════════════════${NC}"
    read -r -p "确认记录? (y/n) [y]: " CONFIRM
    CONFIRM="${CONFIRM:-y}"
    [[ "$CONFIRM" != "y" ]] && { echo "取消"; exit 0; }
}

# ── 非交互模式 ────────────────────────────────────────────────

non_interactive_mode() {
    local version="" type="" symptom="" pattern="NEW" regression_risk="-" files="" is_regression="false"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version) version="$2"; shift 2 ;;
            --type) type="$2"; shift 2 ;;
            --symptom) symptom="$2"; shift 2 ;;
            --pattern) pattern="$2"; shift 2 ;;
            --regression-risk) regression_risk="$2"; shift 2 ;;
            --files) files="$2"; shift 2 ;;
            --is-regression) is_regression="true"; shift ;;
            *) err "未知参数: $1"; exit 1 ;;
        esac
    done

    [[ -z "$version" ]] && { err "--version 是必需的"; exit 1; }
    [[ -z "$symptom" ]] && { err "--symptom 是必需的"; exit 1; }
    [[ -z "$type" ]] && type="Bug"

    VERSION="$version"
    TYPE="$type"
    SYMPTOM="$symptom"
    PATTERN="$pattern"
    REG_RISK="$regression_risk"
    FILES="$files"
    REG_FLAG="$is_regression"
}

# ── 主流程 ────────────────────────────────────────────────────

main() {
    cd "$ROOT_DIR"

    # 检查必需文件是否存在
    local required_files=(
        "docs/bugs/timeline/2026.md"
        "docs/bugs/INDEX.md"
        "docs/bugs/fix-points.md"
        "docs/KNOWN-ISSUES.md"
        "docs/bugs/regression-map.md"
    )
    for f in "${required_files[@]}"; do
        if [[ ! -f "$f" ]]; then
            err "必需文件不存在: $f"
            exit 1
        fi
    done

    header "开始更新追踪文件"

    # 1. Timeline
    append_timeline "$VERSION" "$TYPE" "$SYMPTOM" "$PATTERN" "$REG_RISK"

    # 2. INDEX.md 统计
    update_index_stats

    # 3. fix-points.md
    append_fix_points "$(echo -e "$FILES")" "$VERSION" "$PATTERN"

    # 4. KNOWN-ISSUES.md
    append_known_issues "$VERSION" "$SYMPTOM" "$PATTERN"

    # 5. Pattern 文件
    if [[ -n "$PATTERN" && "$PATTERN" != "NEW" ]]; then
        update_pattern_file "$PATTERN" "$VERSION" "$SYMPTOM"
    fi

    # 6. 回归地图
    update_regression_map "$REG_FLAG" "$PATTERN" "$SYMPTOM"

    header "更新完成"
    echo ""
    ok "所有追踪文件已更新 ✓"
    echo ""
    echo -e "  接下来:"
    echo -e "  1. ${CYAN}git add${NC} 修改的文件"
    echo -e "  2. ${CYAN}git commit${NC} 并标注 Pattern"
    echo -e "  3. 部署前运行 ${CYAN}./scripts/pre-deploy-check.sh${NC}"
    echo ""
}

# ── 入口 ──────────────────────────────────────────────────────

if [[ $# -gt 0 && "$1" == "add" ]]; then
    shift
    non_interactive_mode "$@"
else
    interactive_mode
fi

main
