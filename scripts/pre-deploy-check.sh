#!/usr/bin/env bash
# =============================================================================
# Polis 部署前预防检查脚本
# 自动执行 docs/bugs/INDEX.md 中的预防清单，防止已知 Bug 回归
# 用法: ./scripts/pre-deploy-check.sh [--strict]
#        --strict: 任何警告也视为失败（用于 CI）
# =============================================================================

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0
STRICT=false
QUICK=false
for arg in "$@"; do
    case "$arg" in
        --strict) STRICT=true ;;
        --quick) QUICK=true ;;
    esac
done

check_pass() { echo -e "  ${GREEN}✅ PASS${NC}: $1"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}❌ FAIL${NC}: $1"; FAIL=$((FAIL + 1)); }
check_warn() {
    if $STRICT; then
        echo -e "  ${RED}❌ FAIL (strict)${NC}: $1"; FAIL=$((FAIL + 1))
    else
        echo -e "  ${YELLOW}⚠️  WARN${NC}: $1"; WARN=$((WARN + 1))
    fi
}

# Quick mode: skip non-critical checks (returns 0 = skip, 1 = run)
skip_in_quick() {
    if $QUICK; then
        echo -e "${CYAN}[$1] $2${NC}"
        echo "  ⏭  快速模式跳过"
        echo ""
        return 0
    fi
    return 1
}

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Polis 部署前预防检查${NC}"
$QUICK && echo -e "${CYAN}  [快速模式 — 仅高风险检查]${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""

# ─── 1. xattr 污染 ───────────────────────────────────────────
echo -e "${CYAN}[1] macOS xattr 污染检查${NC}"

# 本地检查（打包前）
if [[ "$(uname)" == "Darwin" ]]; then
    # 检查 tar 命令是否在脚本中正确使用了 COPYFILE_DISABLE=1
    if grep -q "COPYFILE_DISABLE=1" deploy.sh 2>/dev/null || grep -q "COPYFILE_DISABLE=1" package.sh 2>/dev/null; then
        check_pass "打包脚本已设置 COPYFILE_DISABLE=1"
    else
        check_warn "打包脚本未找到 COPYFILE_DISABLE=1 — 手动打包时注意"
    fi
fi
echo ""

# ─── 2. 前端防空 — .map() 检查 ─────────────────────────────────
echo -e "${CYAN}[2] 前端 .map() 防空检查${NC}"

UNSAFE_MAP=$(grep -rn '\.map(' web/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v '?\.' | grep -v '\.\.\.' | grep -v 'Array\.from' | grep -v '//.*\.map' | grep -v 'node_modules' || true)
if [[ -z "$UNSAFE_MAP" ]]; then
    check_pass "所有 .map() 调用已防空"
else
    echo "  发现未防空 .map() 调用:"
    echo "$UNSAFE_MAP" | head -20
    check_warn "存在未使用 ?. 的 .map() 调用，可能导致白屏"
fi
echo ""

if ! skip_in_quick "3" "JWT atob() URL-safe base64 转换"; then
echo -e "${CYAN}[3] JWT atob() URL-safe base64 转换检查${NC}"

ATOB_CALLS=$(grep -rn "atob(" web/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "replace.*-.*g.*replace.*_" | true)
if [[ -z "$ATOB_CALLS" ]]; then
    check_pass "无 atob() 调用（无需检查 base64url 转换）"
else
    UNSAFE_ATOB=$(echo "$ATOB_CALLS" | grep -v "replace.*+" | grep -v "replace.*_" | true)
    if [[ -n "$UNSAFE_ATOB" ]]; then
        echo "  未做 URL-safe base64 转换的 atob() 调用:"
        echo "$UNSAFE_ATOB" | head -10
        check_fail "atob() 前缺少 base64url → standard 转换（JWT Payload 解码会失败）"
    else
        check_pass "所有 atob() 调用前已有 URL-safe base64 转换"
    fi
fi
echo ""
fi  # check #3

# ─── 4. space_routes.rs — actions 数组同步 ─────────────────────
if ! skip_in_quick "4" "space_routes.rs actions 数组同步"; then
echo -e "${CYAN}[4] space_routes.rs actions 数组同步检查${NC}"

if [[ -f "crates/polis-space/src/routes/space_routes.rs" ]]; then
    # 检查是否最近修改了 space_routes.rs
    if git diff --name-only HEAD~5 2>/dev/null | grep -q "space_routes.rs"; then
        echo "  space_routes.rs 最近 5 个 commit 内有修改"
        # 提取 actions 数组内容供人工检查
        echo "  当前 actions 数组内容:"
        awk '/let actions = \[/,/\]/' crates/polis-space/src/routes/space_routes.rs | grep '"' | head -20
        check_warn "space_routes.rs 最近有修改 — 确认 actions 数组已同步"
    else
        check_pass "space_routes.rs 近期无修改，actions 数组风险低"
    fi
else
    check_warn "space_routes.rs 文件未找到"
fi
echo ""
fi  # check #4

# ─── 5, 6, 7, 8, 11: Non-critical checks (skipped in quick mode) ──
if ! skip_in_quick "5-8,11" "非关键检查 (Gateway路由/post_count/JWT安全/SQL注入/Visibility)"; then

# ─── 11. Visibility 枚举同步 ──────────────────────────────────
echo -e "${CYAN}[11] Visibility 枚举同步检查${NC}"

if [[ -f "crates/polis-core/src/types.rs" ]]; then
    echo "  Visibility 枚举变体:"
    grep -A 20 "pub enum Visibility" crates/polis-core/src/types.rs | grep "^\s\+\w\+" | sed 's/^[[:space:]]*//' || echo "  (无法解析)"
    check_pass "Visibility 枚举已定义 (手动检查 DB visibility 值是否同步)"
fi
echo ""

# ─── 5. Gateway 路由覆盖 ─────────────────────────────────────
echo -e "${CYAN}[5] Gateway 路由覆盖检查${NC}"

if [[ -f "crates/polis-gateway/src/main.rs" ]]; then
    NEW_ROUTES=$(git diff --name-only HEAD~3 2>/dev/null | grep -E "routes\.rs$" || true)
    if [[ -n "$NEW_ROUTES" ]]; then
        echo "  最近修改的路由文件:"
        echo "$NEW_ROUTES" | while read f; do echo "    - $f"; done
        check_warn "近期有路由修改 — 确认 Gateway 路由表已同步"
    else
        check_pass "近期无路由文件修改，Gateway 路由风险低"
    fi
fi
echo ""

# ─── 6. post_count 同步 ──────────────────────────────────────
echo -e "${CYAN}[6] post_count 同步检查${NC}"

POST_INSERTS=$(grep -rn "INSERT INTO posts" crates/ 2>/dev/null | grep -v "ON CONFLICT" | grep -v "migration" | true)
POST_COUNT_UPDATES=$(grep -rn "post_count" crates/ 2>/dev/null | grep -v "migration" | grep -v "//.*post_count" | true)
POST_INSERT_COUNT=$(echo "$POST_INSERTS" | grep -c "INSERT" || true)
POST_COUNT_UPDATE_COUNT=$(echo "$POST_COUNT_UPDATES" | grep -c "post_count" || true)

echo "  INSERT INTO posts 位置数: $POST_INSERT_COUNT"
echo "  post_count UPDATE 位置数: $POST_COUNT_UPDATE_COUNT"

if [[ "$POST_INSERT_COUNT" -gt "$POST_COUNT_UPDATE_COUNT" ]]; then
    echo "  INSERT INTO posts 路径:"
    echo "$POST_INSERTS" | head -20
    check_warn "INSERT INTO posts 位置数 ($POST_INSERT_COUNT) > post_count 更新数 ($POST_COUNT_UPDATE_COUNT)"
else
    check_pass "post_count 同步检查正常"
fi
echo ""

# ─── 7. JWT 安全 ─────────────────────────────────────────────
echo -e "${CYAN}[7] JWT exp 校验检查${NC}"

JWT_DEFAULT=$(grep -rn "Validation::default()" crates/ 2>/dev/null | true)
if [[ -z "$JWT_DEFAULT" ]]; then
    check_pass "无 Validation::default() 调用 (JWT exp 校验已覆盖)"
else
    echo "  Validation::default() 位置:"
    echo "$JWT_DEFAULT"
    check_fail "存在 Validation::default() 调用 — 可能跳过 JWT exp 校验"
fi
echo ""

# ─── 8. SQL 注入预防 ─────────────────────────────────────────
echo -e "${CYAN}[8] SQL 注入风险检查${NC}"

SQL_FORMAT=$(grep -rn 'format!(".*SELECT\|format!(".*INSERT\|format!(".*UPDATE\|format!(".*DELETE' crates/*/src/ 2>/dev/null | grep -v "//.*format" | grep -i "repo" | true)
if [[ -z "$SQL_FORMAT" ]]; then
    check_pass "repo 层无 SQL 字符串拼接"
else
    echo "$SQL_FORMAT" | head -10
    check_warn "repo 层存在 format!() SQL 拼接 — 确认已参数化"
fi
echo ""

fi  # non-critical checks block

# ─── 9. 二进制格式 ───────────────────────────────────────────
echo -e "${CYAN}[9] 交叉编译目标检查${NC}"

if [[ -d "target/x86_64-unknown-linux-gnu/release/" ]]; then
    ELF_COUNT=0
    MACHO_COUNT=0
    for bin in target/x86_64-unknown-linux-gnu/release/polis-*; do
        if [[ -f "$bin" ]]; then
            FILETYPE=$(file "$bin" 2>/dev/null || echo "unknown")
            if echo "$FILETYPE" | grep -q "ELF"; then
                ELF_COUNT=$((ELF_COUNT + 1))
            elif echo "$FILETYPE" | grep -q "Mach-O"; then
                echo "  ⚠️  $bin 是 Mach-O，非 ELF"
                MACHO_COUNT=$((MACHO_COUNT + 1))
            fi
        fi
    done
    if [[ "$MACHO_COUNT" -gt 0 ]]; then
        check_fail "x86_64 target 目录中有 $MACHO_COUNT 个 Mach-O 二进制，需重新交叉编译"
    elif [[ "$ELF_COUNT" -gt 0 ]]; then
        check_pass "所有 Linux 二进制格式正确 (ELF x86-64, 共 $ELF_COUNT 个)"
    else
        check_warn "target/x86_64-unknown-linux-gnu/release/ 目录为空 — 需先编译"
    fi
else
    check_warn "x86_64-unknown-linux-gnu target 目录不存在 — 需先交叉编译"
fi
echo ""

# ─── 10. 部署前验证 ──────────────────────────────────────────
echo -e "${CYAN}[10] 部署流程风险检查${NC}"

# 检查是否有未提交的更改（防止遗漏修复）
UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNSTAGED" -gt 0 ]]; then
    check_warn "有 $UNSTAGED 个未暂存的修改文件 — 确认都已包含在部署中"
fi
if [[ "$UNTRACKED" -gt 0 ]]; then
    check_warn "有 $UNTRACKED 个未跟踪的文件 — 确认无需部署"
fi
if [[ "$UNSTAGED" -eq 0 && "$UNTRACKED" -eq 0 ]]; then
    check_pass "工作区干净，无遗漏风险"
fi
echo ""

# ─── 12, 13, 14: Doc integrity checks (skipped in quick mode) ───
if ! skip_in_quick "12-14" "文档完整性检查 (表单/Pattern/统计一致性)"; then

# ─── 12. Form 字段完整性 ──────────────────────────────────────
echo -e "${CYAN}[12] 表单字段完整性检查${NC}"

# 检查最近修改的表单文件
RECENT_FORMS=$(git diff --name-only HEAD~10 2>/dev/null | grep -E "page\.tsx$" | grep -E "login|register|create|settings|admin" || true)
if [[ -n "$RECENT_FORMS" ]]; then
    echo "  最近修改的表单页面:"
    echo "$RECENT_FORMS" | while read f; do echo "    - $f"; done
    check_warn "近期有表单修改 — 确认 useState key 数量 == JSX input 数量"
else
    check_pass "近期无表单文件修改"
fi
echo ""

# ─── 13. Pattern frontmatter 完整性 ────────────────────────────
echo -e "${CYAN}[13] Pattern frontmatter 完整性检查${NC}"

MISSING_FM=0
for pf in docs/bugs/patterns/*.md; do
    if head -1 "$pf" | grep -q "^---$"; then
        continue
    else
        echo "  缺少 frontmatter: $pf"
        MISSING_FM=$((MISSING_FM + 1))
    fi
done

if [[ "$MISSING_FM" -eq 0 ]]; then
    check_pass "所有 Pattern 文件包含 frontmatter"
else
    check_warn "$MISSING_FM 个 Pattern 文件缺少 frontmatter (diagnose.sh 依赖)"
fi
echo ""

# ─── 14. fix-points 统计一致性 ──────────────────────────────────
echo -e "${CYAN}[14] fix-points 统计一致性检查${NC}"

if [[ -f "docs/bugs/fix-points.md" ]] && [[ -f "docs/bugs/INDEX.md" ]]; then
    FP_COUNT=$(awk -F'|' '/总修复点位/ { gsub(/[^0-9]/, "", $3); print $3 }' docs/bugs/fix-points.md 2>/dev/null || echo "0")
    # 计算 fix-points.md 中实际条目数
    FP_ACTUAL=$(grep -c "| \`" docs/bugs/fix-points.md 2>/dev/null || echo "0")

    echo "  fix-points 声明修复点数: $FP_COUNT"
    echo "  fix-points 实际条目数: $FP_ACTUAL"

    if [[ "$FP_COUNT" -lt "$FP_ACTUAL" ]]; then
        check_warn "fix-points 声明点数 ($FP_COUNT) < 实际条目 ($FP_ACTUAL)，统计不准确"
    else
        check_pass "fix-points 统计与 INDEX 一致"
    fi
else
    check_warn "fix-points.md 或 INDEX.md 未找到"
fi
echo ""

fi  # checks 12-14 block

# ─── 15. Argon2 spawn_blocking 检查 ──────────────────────────────
echo -e "${CYAN}[15] Argon2 spawn_blocking 异步化检查${NC}"

SYNC_ARGON2=$(grep -rn "Argon2::default()" crates/ --include="*.rs" 2>/dev/null | grep -v "spawn_blocking" | grep -v "hash_password_async" | grep -v "verify_password_async" | grep -v "mod test" || true)
if [[ -n "$SYNC_ARGON2" ]]; then
    echo "  发现可能阻塞 tokio worker 的同步 Argon2 调用:"
    echo "$SYNC_ARGON2" | while read line; do echo "    - $line"; done
    check_warn "存在未包裹 spawn_blocking 的 Argon2 调用 — 高并发下会阻塞 async runtime"
else
    check_pass "所有 Argon2 调用已使用 spawn_blocking 异步化"
fi
echo ""

# ─── 16. Gateway 连接池配置检查 ──────────────────────────────────
echo -e "${CYAN}[16] Gateway 连接池配置检查${NC}"

if grep -q "pool_max_idle_per_host(0)" crates/polis-gateway/src/main.rs 2>/dev/null; then
    check_fail "Gateway pool_max_idle_per_host=0 — 每次请求新建 TCP 连接，高并发下性能极差"
else
    check_pass "Gateway HTTP 连接池已启用 (pool_max_idle_per_host > 0)"
fi

# 检查需要 DB 的服务是否配置了 acquire_timeout
MISSING_TIMEOUT=""
for svc in polis-user polis-space polis-content polis-admin polis-video polis-aggregate polis-notify polis-pay polis-code polis-store polis-plugin-engine; do
    svc_file="crates/${svc}/src/main.rs"
    if [[ -f "$svc_file" ]]; then
        if ! grep -q "acquire_timeout" "$svc_file" 2>/dev/null; then
            MISSING_TIMEOUT="$MISSING_TIMEOUT $svc"
        fi
    fi
done
if [[ -n "$MISSING_TIMEOUT" ]]; then
    check_warn "以下服务 DB pool 未配置 acquire_timeout:$MISSING_TIMEOUT — 高并发下可能永久阻塞"
else
    check_pass "所有服务 DB pool 已配置 acquire_timeout"
fi
echo ""

# ─── 17. creations_to_batch N+1 查询检查 ──────────────────────────
echo -e "${CYAN}[17] N+1 批量查询检查${NC}"

BATCH_FN=$(grep -c "creations_to_batch" crates/polis-content/src/handlers/creation.rs 2>/dev/null || echo "0")
echo "  creations_to_batch 函数: $([[ "$BATCH_FN" -gt 0 ]] && echo '存在' || echo '缺失!')"
if [[ "$BATCH_FN" -eq 0 ]]; then
    check_warn "creations_to_batch 函数缺失 — 作品列表可能仍在逐条 N+1 查询"
else
    check_pass "批量查询函数 creations_to_batch 存在"
fi
echo ""

# ─── 18. NATS 事件丢失风险检查 ──────────────────────────────────
echo -e "${CYAN}[18] NATS 事件丢失风险检查${NC}"

# 检查是否有 publish_event 调用但没有直接 DB fallback 的代码
EVENT_CALLS=$(grep -rn "publish_event(" crates/ --include="*.rs" 2>/dev/null | grep -v "//.*publish_event" | grep -v "let _" | true)
EVENT_COUNT=$(echo "$EVENT_CALLS" | grep -c "publish_event" || true)

if [[ "$EVENT_COUNT" -gt 0 ]]; then
    echo "  发现 $EVENT_COUNT 处 publish_event 调用:"
    echo "$EVENT_CALLS" | head -15
    check_warn "存在 publish_event 调用 — 确认生产服务器 NATS 已部署，或有直接 DB fallback"
else
    check_pass "无 publish_event 调用风险"
fi
echo ""

# ─── 19. 服务器基础设施检查 ──────────────────────────────────────
echo -e "${CYAN}[19] 服务器基础设施检查${NC}"

# 检查是否能 SSH 到服务器并验证关键服务
if command -v ssh &>/dev/null; then
    SERVER="root@47.253.123.3"
    if ssh -o ConnectTimeout=5 "$SERVER" "echo ok" &>/dev/null; then
        # 检查 NATS
        NATS_RUNNING=$(ssh "$SERVER" "ps aux | grep -c '[n]ats-server' || echo 0" 2>/dev/null | tr -d '\n\r ')
        NATS_RUNNING=${NATS_RUNNING:-0}
        if [[ "$NATS_RUNNING" -gt 0 ]]; then
            check_pass "NATS Server 正在运行"
        else
            check_warn "NATS Server 未运行 — 所有 publish_event 调用静默失效，需直接 DB fallback"
        fi

        # 检查所有 polis 服务状态
        echo "  服务运行状态:"
        for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-video polis-web; do
            STATUS=$(ssh "$SERVER" "systemctl is-active $svc 2>/dev/null" || echo "unknown")
            case "$STATUS" in
                active) echo -e "    ${GREEN}$svc: active${NC}" ;;
                *) echo -e "    ${YELLOW}$svc: $STATUS${NC}" ;;
            esac
        done
    else
        check_warn "无法连接到服务器 $SERVER — 跳过远程基础设施检查"
    fi
else
    check_warn "ssh 命令不可用 — 跳过远程基础设施检查"
fi
echo ""

# ─── 汇总 ─────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + WARN))
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${CYAN}  检查结果汇总${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"
echo -e "  ${YELLOW}WARN: $WARN${NC}"
echo -e "  TOTAL: $TOTAL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
    echo -e "${RED}❌ 部署阻断: $FAIL 项检查失败，请在部署前修复${NC}"
    exit 1
elif [[ "$WARN" -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  部署警告: $WARN 项需人工确认，建议检查后再部署${NC}"
    $STRICT && exit 1 || exit 0
else
    echo -e "${GREEN}✅ 全部检查通过，可以部署${NC}"
    exit 0
fi
