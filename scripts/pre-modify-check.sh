#!/usr/bin/env bash
# =============================================================================
# pre-modify-check.sh — 修改文件前的风险评估
# =============================================================================
# 用法:
#   ./scripts/pre-modify-check.sh <文件路径>
#   ./scripts/pre-modify-check.sh SpacePageClient.tsx
#   ./scripts/pre-modify-check.sh --all                    # 列出所有高危文件
#
# 功能: 在修改任何文件之前，自动输出该文件的:
#   - 历史修复记录（从 fix-points.md）
#   - 关联的 Bug Pattern
#   - 回归风险警告
#   - 修复配方链接（如果复发可直接套用）
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║  🔍 Pre-Modify Risk Assessment                       ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_separator() {
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
}

# ── 风险查询函数 ──
# 返回格式: 风险等级|关联Pattern|修复次数|预防措施
lookup_risk() {
    local key="$1"
    case "$key" in
        SpacePageClient.tsx)
            echo "🔴 CRITICAL|module-breadcrumb-hardcoded, module-tab-key-mismatch, array-map-null, url-double-encoding|11次修复|URL参数先decode再encode; 模块fallback禁用硬编码; .map()防空; 状态变更影响分析" ;;
        space_routes.rs)
            echo "🔴 CRITICAL|actions-array-missing, gateway-route-missing, wrong-build-target|7次修复|actions_suffixes+actions数组同步; DELETE路由handler检查; 编译target验证" ;;
        content_handler.rs)
            echo "🔴 CRITICAL|post-count-sync, enum-serialization-data-loss, visibility-enum-sync|5次修复|post_count+1; Visibility枚举同步; SQL参数化" ;;
        SpaceSettings.tsx)
            echo "🟡 HIGH|array-map-null, url-double-encoding|4次修复|localStorage key双格式; .map()防空; useState-JSX对齐" ;;
        content_routes.rs)
            echo "🟡 HIGH|url-double-encoding, xattr-contamination|4次修复|block_private权限检查; URL编码" ;;
        main.rs)
            echo "🔴 CRITICAL|gateway-route-missing, actions-array-missing|4次修复|is_content/is_video条件覆盖; 新space端点排除" ;;
        module-config.ts)
            echo "🔴 CRITICAL|module-breadcrumb-hardcoded|1次修复但影响全局|新函数禁止对未知key返回forum/交流; getModuleLabel透传原始值" ;;
        creations/new/page.tsx)
            echo "🟡 HIGH|module-breadcrumb-hardcoded, module-tab-key-mismatch|3次修复|MODULE_CONFIG映射完整; moduleAllowedTypes检查; submissions清除逻辑; 视频publish传module_type" ;;
        api.ts)
            echo "🟡 MEDIUM|dependency-auto-upgrade|4次修复|ApiResponse<T>包装类型; 新方法命名一致性" ;;
        PostPageClient.tsx)
            echo "🟡 MEDIUM|atob-base64url, module-breadcrumb-hardcoded|2次修复|atob URL-safe转换; 模块标签getModuleLabel()" ;;
        ManagePageClient.tsx)
            echo "🟡 MEDIUM|atob-base64url|2次修复|JWT解码用URL-safe base64" ;;
        types.rs)
            echo "🟡 MEDIUM|enum-serialization-data-loss, visibility-enum-sync|1次修复|新增DB值必须同步枚举+Display" ;;
        ContentCard.tsx)
            echo "🟡 MEDIUM|module-breadcrumb-hardcoded|2次修复|adaptCreationItem/adaptFeedItem moduleLabel传递" ;;
        PostCard.tsx)
            echo "🟡 MEDIUM|module-breadcrumb-hardcoded|2次修复|面包屑三重fallback检查" ;;
        create/page.tsx)
            echo "🟢 LOW|url-double-encoding|2次修复|title参数检查; deriveSlug正则字符集" ;;
        repo.rs)
            echo "🟡 MEDIUM|post-count-sync|3次修复|COALESCE vs CASE WHEN; post_count同步" ;;
        *)
            echo "" ;;
    esac
}

# ── 列出所有已知脆弱文件 ──
list_all_risks() {
    local files=(
        "SpacePageClient.tsx"
        "space_routes.rs"
        "content_handler.rs"
        "SpaceSettings.tsx"
        "content_routes.rs"
        "main.rs (gateway)"
        "module-config.ts"
        "creations/new/page.tsx"
        "api.ts"
        "PostPageClient.tsx"
        "ManagePageClient.tsx"
        "types.rs (Visibility)"
        "ContentCard.tsx"
        "PostCard.tsx"
        "create/page.tsx"
        "repo.rs (space)"
    )
    printf "%-10s %-40s %-15s %s\n" "风险等级" "文件" "修复次数" "关联 Pattern"
    printf "%-10s %-40s %-15s %s\n" "--------" "----" "--------" "--------------"
    for f in "${files[@]}"; do
        local info
        info=$(lookup_risk "$f")
        if [ -n "$info" ]; then
            local risk_level="${info%%|*}"
            local rest="${info#*|}"
            local patterns="${rest%%|*}"
            local rest2="${rest#*|}"
            local fix_count="${rest2%%|*}"
            printf "%-10s %-40s %-15s %s\n" "$risk_level" "$f" "$fix_count" "$patterns"
        fi
    done
}

print_recipe_for_pattern() {
    local pattern="$1"
    case "$pattern" in
        module-breadcrumb-hardcoded)
            echo -e "  ${BOLD}模块标签硬编码回退:${NC}"
            echo "    配方: docs/bugs/fix-recipes/module-breadcrumb-hardcoded.md"
            echo "    核心: 替换所有 'forum'/'交流' 硬编码 → getModuleLabel() + 后端返回 module_name"
            echo "    影响: 8文件20+点位"
            ;;
        module-tab-key-mismatch)
            echo -e "  ${BOLD}模块Tab键值不匹配:${NC}"
            echo "    配方: docs/bugs/fix-recipes/module-tab-key-mismatch.md"
            echo "    核心: tab id 改用 MODULE_CONFIG[key]?.route || key"
            ;;
        array-map-null)
            echo -e "  ${BOLD}.map() 防空防御:${NC}"
            echo "    配方: docs/bugs/fix-recipes/array-map-null.md"
            echo "    核心: .map( → (arr ?? []).map( 或 ?.map("
            ;;
        url-double-encoding)
            echo -e "  ${BOLD}URL 双重编码:${NC}"
            echo "    配方: docs/bugs/fix-recipes/url-double-encoding.md"
            echo "    核心: decodeURIComponent → encodeURIComponent"
            ;;
        atob-base64url)
            echo -e "  ${BOLD}atob URL-safe base64:${NC}"
            echo "    配方: docs/bugs/fix-recipes/atob-base64url.md"
            echo "    核心: atob(token.replace(/-/g,'+').replace(/_/g,'/'))"
            ;;
        actions-array-missing)
            echo -e "  ${BOLD}Actions 数组遗漏:${NC}"
            echo "    配方: docs/bugs/fix-recipes/actions-array-missing.md"
            echo "    核心: actions 数组追加新端点后缀"
            ;;
        gateway-route-missing)
            echo -e "  ${BOLD}Gateway 路由遗漏:${NC}"
            echo "    配方: docs/bugs/fix-recipes/gateway-route-missing.md"
            echo "    核心: is_content/is_video 条件补充新路由前缀"
            ;;
        wrong-build-target)
            echo -e "  ${BOLD}编译目标错误:${NC}"
            echo "    配方: docs/bugs/fix-recipes/wrong-build-target.md"
            echo "    核心: --target x86_64-unknown-linux-gnu"
            ;;
        post-count-sync)
            echo -e "  ${BOLD}post_count 不同步:${NC}"
            echo "    配方: docs/bugs/fix-recipes/post-count-sync.md"
            echo "    核心: 新增 INSERT INTO posts 后追加 post_count + 1"
            ;;
        enum-serialization-data-loss)
            echo -e "  ${BOLD}枚举序列化数据丢失:${NC}"
            echo "    配方: docs/bugs/fix-recipes/enum-serialization-data-loss.md"
            echo "    核心: #[serde(untagged)] 或保留原始字符串"
            ;;
        visibility-enum-sync)
            echo -e "  ${BOLD}Visibility 枚举不同步:${NC}"
            echo "    配方: 查 regression-map.md Chain #5"
            echo "    核心: 新增 DB visibility 值 → 同步 Visibility enum + Display"
            ;;
        dependency-auto-upgrade)
            echo -e "  ${BOLD}依赖自动升级:${NC}"
            echo "    配方: docs/bugs/fix-recipes/dependency-auto-upgrade.md"
            echo "    核心: 锁定精确版本号，禁用 ^"
            ;;
        xattr-contamination)
            echo -e "  ${BOLD}macOS xattr 部署污染:${NC}"
            echo "    配方: docs/bugs/fix-recipes/xattr-contamination.md"
            echo "    核心: COPYFILE_DISABLE=1 tar + 清理 ._*"
            ;;
        *)
            echo -e "  ${YELLOW}$pattern${NC}: 查 docs/bugs/fix-recipes/INDEX.md"
            ;;
    esac
}

# ── 主逻辑 ──

print_banner

# 模式 1: --all 列出所有高危文件
if [ "${1:-}" = "--all" ]; then
    echo -e "${BOLD}所有脆弱文件及其风险等级:${NC}"
    echo ""
    list_all_risks
    echo ""
    exit 0
fi

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
    echo "用法: $0 <文件路径或文件名>"
    echo "      $0 --all   列出所有脆弱文件"
    echo ""
    echo "示例:"
    echo "  $0 SpacePageClient.tsx"
    echo "  $0 web/src/app/creations/new/page.tsx"
    echo "  $0 module-config.ts"
    exit 1
fi

# 提取文件名并匹配
FILENAME=$(basename "$TARGET")
MATCHED_KEY=""
for key in "SpacePageClient.tsx" "space_routes.rs" "content_handler.rs" "SpaceSettings.tsx" "content_routes.rs" "main.rs" "module-config.ts" "creations/new/page.tsx" "api.ts" "PostPageClient.tsx" "ManagePageClient.tsx" "types.rs" "ContentCard.tsx" "PostCard.tsx" "create/page.tsx" "repo.rs"; do
    if [[ "$TARGET" == *"$key"* ]] || [[ "$FILENAME" == "$key" ]]; then
        MATCHED_KEY="$key"
        break
    fi
done

if [ -z "$MATCHED_KEY" ]; then
    echo -e "${GREEN}✅ 文件 \"$FILENAME\" 不在已知脆弱文件清单中。${NC}"
    echo ""
    echo "但仍建议进行以下通用检查："
    echo "  [ ] .map() 调用是否有防空 (?. 或 ?? [])"
    echo "  [ ] URL 参数编码是否正确 (先 decode 再 encode)"
    echo "  [ ] 新增 API 调用是否处理了异常"
    echo "  [ ] useState 字段是否与 JSX input 一一对应"
    echo "  [ ] 新增后端端点: Gateway路由表 + actions数组 是否同步"
    echo ""
    echo "如果是新文件，完成修复后请更新 fix-points.md 和本脚本的 lookup_risk() 函数。"
    exit 0
fi

RISK_INFO=$(lookup_risk "$MATCHED_KEY")

if [ -z "$RISK_INFO" ]; then
    echo -e "${GREEN}✅ 文件 \"$FILENAME\" 未找到详细风险记录。${NC}"
    exit 0
fi

RISK_LEVEL="${RISK_INFO%%|*}"
REST="${RISK_INFO#*|}"
PATTERNS="${REST%%|*}"
REST2="${REST#*|}"
FIX_COUNT="${REST2%%|*}"
PREVENTION="${REST2#*|}"

echo -e "${BOLD}文件:${NC} ${CYAN}$TARGET${NC}"
echo -e "${BOLD}匹配键:${NC} ${YELLOW}$MATCHED_KEY${NC}"
echo -e "${BOLD}风险等级:${NC} $RISK_LEVEL"
echo -e "${BOLD}历史修复次数:${NC} $FIX_COUNT"
echo -e "${BOLD}关联 Pattern:${NC} ${RED}$PATTERNS${NC}"

print_separator
echo -e "${RED}${BOLD}⚠️  修改此文件前的强制检查清单${NC}"
print_separator
echo ""

IFS=';' read -ra CHECKS <<< "$PREVENTION"
for check in "${CHECKS[@]}"; do
    echo -e "  ${YELLOW}[ ]${NC} ${check# }"
done

print_separator
echo -e "${BLUE}${BOLD}📋 如果此文件的 Bug 复发，直接参考以下配方:${NC}"
print_separator
echo ""

IFS=',' read -ra PAT_ARR <<< "$PATTERNS"
for p in "${PAT_ARR[@]}"; do
    print_recipe_for_pattern "$(echo "$p" | xargs)"
    echo ""
done

print_separator
echo -e "${GREEN}${BOLD}💡 建议流程:${NC}"
print_separator
echo ""
echo "  1. 完成上述检查清单中的所有项"
echo "  2. 修改代码后运行: ./scripts/bug-record.sh"
echo "  3. 部署前运行: ./scripts/pre-deploy-check.sh"
echo "  4. 如果引入了新的回归: 更新 docs/bugs/regression-map.md"
echo ""
