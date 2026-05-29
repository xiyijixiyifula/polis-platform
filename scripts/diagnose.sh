#!/usr/bin/env bash
# =============================================================================
# Polis Bug 症状诊断工具 — 输入症状关键词，自动匹配已知 Pattern
# 用法:
#   ./scripts/diagnose.sh "页面白屏 map is not a function"
#   ./scripts/diagnose.sh           # 交互模式
#   ./scripts/diagnose.sh --list    # 列出所有已知 Pattern
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PATTERNS_DIR="$ROOT_DIR/docs/bugs/patterns"
RECIPES_DIR="$ROOT_DIR/docs/bugs/fix-recipes"

# ── 症状 → Pattern 映射表 ─────────────────────────────────────
# 格式: "关键词1,关键词2,...|pattern_name|置信度|严重程度|修复耗时"

declare -a SYMPTOM_MAP=(
    # URL 双重编码
    "中文,404,%25,双重编码,乱码,URL编码|url-double-encoding|95|high|5min"
    "encodeURIComponent,decodeURIComponent,双重|url-double-encoding|85|high|5min"

    # xattr 污染
    "UI错乱,CSS不一致,部署后样式,._|xattr-contamination|90|high|10min"
    "AppleDouble,md5不同,部署后UI|wrong-build-target|60|high|3min"

    # .map() 防空
    "白屏,.map,map is not a function,TypeError,undefined is not iterable|array-map-null|95|medium|2min"
    "崩溃,渲染,组件,crash,null.map|array-map-null|80|medium|2min"

    # 依赖升级
    "npm,升级,编辑器,报错,cherry,版本|dependency-auto-upgrade|90|high|15min"
    "package,依赖,不兼容,toString|dependency-auto-upgrade|80|high|15min"

    # post_count 不同步
    "帖子计数,不对,为0,不更新,post_count|post-count-sync|90|high|10min"
    "INSERT INTO posts,count,不同步|post-count-sync|80|high|10min"

    # 表单字段缺失
    "表单,提交,失败,认证,密码,缺少,input|missing-form-field|85|medium|2min"
    "useState,JSX,不匹配,字段缺失|missing-form-field|75|medium|2min"

    # Gateway 路由遗漏
    "新增API,404,直连后端,正常,网关|gateway-route-missing|90|high|10min"
    "端点,返回404,gateway,路由|gateway-route-missing|85|high|10min"

    # 部署路径不匹配
    "部署后,功能不生效,服务行为,旧版,路径|deploy-path-mismatch|85|medium|3min"
    "systemd,ExecStart,路径,不一致|deploy-path-mismatch|80|medium|3min"

    # atob base64url
    "atob,InvalidCharacterError,base64,按钮,无反应,重定向|atob-base64url|95|medium|5min"
    "JWT,解码,失败,payload,管理页|atob-base64url|90|medium|5min"

    # actions 数组遗漏
    "Space not found,新增端点,直连,后端,正常|actions-array-missing|90|high|5min"
    "actions,数组,遗漏,namespace|actions-array-missing|80|high|5min"

    # 编译目标错误
    "部署后,功能无变化,二进制,Mach-O,格式|wrong-build-target|90|high|3min"
    "ELF,交叉编译,target,不对|wrong-build-target|85|high|3min"

    # 模块Tab键值不匹配
    "模块,Tab,点击,空白,无内容,选中|module-tab-key-mismatch|90|high|5min"
    "module_key,route,渲染块,不匹配,key|module-tab-key-mismatch|85|high|5min"

    # 通用
    "部署,报错,错误,功能,不行,异常|other|40|medium|5min"
)

# ── 工具函数 ──────────────────────────────────────────────────

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 从 Pattern 文件 YAML frontmatter 提取信息
parse_pattern_frontmatter() {
    local pattern_file="$1"
    local pattern_name
    pattern_name=$(basename "$pattern_file" .md)

    if grep -q "^---$" "$pattern_file" 2>/dev/null; then
        # 提取 YAML frontmatter 中的字段
        local symptoms severity recipe fix_time diagnosis_cmd
        symptoms=$(awk '/^---$/{f=1;next} /^---$/{f=0} f && /^symptoms:/{gsub(/.*\[|\].*/, ""); print}' "$pattern_file" 2>/dev/null || echo "")
        severity=$(awk '/^---$/{f=1;next} /^---$/{f=0} f && /^severity:/{gsub(/.*: /, ""); print}' "$pattern_file" 2>/dev/null || echo "unknown")
        recipe=$(awk '/^---$/{f=1;next} /^---$/{f=0} f && /^recipe:/{gsub(/.*: /, ""); print}' "$pattern_file" 2>/dev/null || echo "")
        fix_time=$(awk '/^---$/{f=1;next} /^---$/{f=0} f && /^fix_time:/{gsub(/.*: /, ""); print}' "$pattern_file" 2>/dev/null || echo "?min")
        diagnosis_cmd=$(awk '/^---$/{f=1;next} /^---$/{f=0} f && /^diagnosis_cmd:/{gsub(/.*: /, ""); print}' "$pattern_file" 2>/dev/null || echo "")
        echo "$symptoms|$severity|$recipe|$fix_time|$diagnosis_cmd"
    else
        echo "|unknown||?min|"
    fi
}

# 计算关键词匹配度（0-100）
calc_confidence() {
    local input="$1"
    local keywords="$2"
    local input_lower
    input_lower=$(echo "$input" | tr '[:upper:]' '[:lower:]')

    local total=0 matched=0
    IFS=',' read -ra KW_ARRAY <<< "$keywords"
    total=${#KW_ARRAY[@]}

    for kw in "${KW_ARRAY[@]}"; do
        kw_lower=$(echo "$kw" | tr '[:upper:]' '[:lower:]' | xargs)
        if echo "$input_lower" | grep -qi "$kw_lower"; then
            matched=$((matched + 1))
        fi
    done

    if [[ $total -eq 0 ]]; then echo 0; return; fi
    echo $(( matched * 100 / total ))
}

# 严重程度中文映射
sev_cn() {
    case "$1" in
        high) echo "🔴 高" ;;
        medium) echo "🟡 中" ;;
        low) echo "🟢 低" ;;
        *) echo "❓ 未知" ;;
    esac
}

# ── 主诊断逻辑 ──────────────────────────────────────────────────

diagnose() {
    local query="$1"

    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  症状诊断工具${NC}"
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  查询: ${BOLD}$query${NC}"
    echo ""

    # 存储匹配结果: confidence|name|severity|fix_time|desc
    local results_file
    results_file=$(mktemp)

    # 遍历映射表计算匹配度
    for entry in "${SYMPTOM_MAP[@]}"; do
        IFS='|' read -r keywords pattern_name base_conf severity fix_time <<< "$entry"
        local match_conf
        match_conf=$(calc_confidence "$query" "$keywords")

        if [[ $match_conf -gt 30 ]]; then
            # 综合置信度 = 基础关键词匹配 × 0.6 + 特定关键词频次 × 0.4
            local final_conf=$(( (match_conf * 6 + base_conf * 4) / 10 ))
            # 从 INDEX.md 获取描述
            local desc
            desc=$(awk -F'|' -v p="$pattern_name" '
                $0 ~ p {
                    gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3)
                    print $3
                    exit
                }' "$ROOT_DIR/docs/bugs/INDEX.md" 2>/dev/null || echo "未知")
            echo "$final_conf|$pattern_name|$severity|$fix_time|$desc" >> "$results_file"
        fi
    done

    if [[ ! -s "$results_file" ]]; then
        echo -e "${YELLOW}未找到匹配的已知 Pattern。${NC}"
        echo ""
        echo "  建议:"
        echo "  1. 用更具体的症状描述重试"
        echo "  2. 查看所有 Pattern: ./scripts/diagnose.sh --list"
        echo "  3. 如果是新类型 Bug，修复后运行 bug-record.sh 创建新 Pattern"
        rm -f "$results_file"
        return 0
    fi

    # 按置信度排序输出
    echo -e "${GREEN}诊断结果:${NC}"
    echo ""

    sort -t'|' -k1 -rn "$results_file" | \
        awk -F'|' -v GREEN="$GREEN" -v YELLOW="$YELLOW" -v CYAN="$CYAN" -v BLUE="$BLUE" -v NC="$NC" -v BOLD="$BOLD" '
        {
            rank = NR
            conf = $1
            name = $2
            severity = $3
            fix_time = $4
            desc = $5

            if (conf >= 80) color = GREEN
            else if (conf >= 50) color = YELLOW
            else color = CYAN

            printf "  %s%d. %s%s%s (置信度: %s%d%%%s)\n", BOLD, rank, color, name, NC, color, conf, NC
            printf "     症状: %s\n", desc
            printf "     严重程度: %s | 修复耗时: %s\n", severity, fix_time
            printf "     配方: docs/bugs/fix-recipes/%s.md\n", name
            printf "\n"
        }'

    # 给出诊断命令
    local top_match
    top_match=$(sort -t'|' -k1 -rn "$results_file" | head -1 | cut -d'|' -f2)
    echo -e "${BLUE}── 建议诊断命令 ──${NC}"
    echo ""

    case "$top_match" in
        array-map-null)
            echo "  grep -rn '\.map(' web/src/ --include='*.tsx' --include='*.ts' | grep -v '?\.' | grep -v node_modules"
            ;;
        url-double-encoding)
            echo "  # 在浏览器 Network 面板检查 API URL 是否含 %25"
            echo "  grep -rn 'encodeURIComponent' web/src/ --include='*.tsx' | grep -v node_modules"
            ;;
        xattr-contamination)
            echo "  find /opt/polis-web/.next -name '._*' | wc -l"
            echo "  md5sum <local-file> vs <server-file>"
            ;;
        atob-base64url)
            echo "  grep -rn 'atob(' web/src/ --include='*.tsx' | grep -v 'replace.*-.*g' | grep -v node_modules"
            ;;
        actions-array-missing)
            echo "  grep -A 30 'let actions' crates/polis-space/src/routes/space_routes.rs | grep '\"'"
            ;;
        gateway-route-missing)
            echo "  grep -n 'api/' crates/polis-gateway/src/main.rs | grep route"
            ;;
        wrong-build-target)
            echo "  file target/x86_64-unknown-linux-gnu/release/polis-*"
            ;;
        deploy-path-mismatch)
            echo "  for s in polis-gateway polis-space polis-user polis-content polis-video polis-admin; do"
            echo "    systemctl cat \$s 2>/dev/null | grep ExecStart"
            echo "  done"
            ;;
        post-count-sync)
            echo "  grep -rn 'INSERT INTO posts' crates/ | grep -v migration"
            echo "  grep -rn 'post_count' crates/ | grep -v migration"
            ;;
        module-tab-key-mismatch)
            echo "  grep -n 'activeTab' web/src/app/space/\[...namespace\]/SpacePageClient.tsx"
            echo "  grep -n 'MODULE_CONFIG' web/src/app/space/\[...namespace\]/SpacePageClient.tsx"
            ;;
        missing-form-field)
            echo "  # 对比 useState 初始化和 JSX 中的 input 数量"
            ;;
        dependency-auto-upgrade)
            echo "  npm list | grep -E 'cherry|markdown'"
            echo "  cat package.json | grep -E 'cherry|markdown'"
            ;;
        *)
            echo "  # 查看修复配方: docs/bugs/fix-recipes/$top_match.md"
            ;;
    esac
    echo ""

    rm -f "$results_file"
}

# ── 列出所有 Pattern ────────────────────────────────────────────

list_patterns() {
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  已知 Bug Pattern${NC}"
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo ""

    awk -F'|' '/^\| \[.*\]\(patterns\// {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4)
        fname = $1
        gsub(/.*\(patterns\//, "", fname)
        gsub(/\).*/, "", fname)
        gsub(/\.md$/, "", fname)
        desc = $2
        sev = $3
        printf "  %-35s %-20s %s\n", fname, sev, desc
    }' "$ROOT_DIR/docs/bugs/INDEX.md"

    echo ""
    echo "  使用 ./scripts/diagnose.sh \"<症状描述>\" 进行诊断"
}

# ── 入口 ──────────────────────────────────────────────────────────

if [[ $# -eq 0 ]]; then
    # 交互模式
    echo -e "${CYAN}请输入症状描述（Ctrl+C 退出）:${NC}"
    read -r query
    [[ -z "$query" ]] && { echo "输入为空，退出。"; exit 0; }
    diagnose "$query"
elif [[ "$1" == "--list" ]]; then
    list_patterns
elif [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "用法:"
    echo "  ./scripts/diagnose.sh \"<症状描述>\"   诊断症状"
    echo "  ./scripts/diagnose.sh                  交互模式"
    echo "  ./scripts/diagnose.sh --list           列出所有已知 Pattern"
else
    diagnose "$*"
fi
