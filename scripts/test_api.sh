#!/bin/bash
set -e
BASE_URL="${API_BASE_URL:-http://localhost:8080}"
PASS=0
FAIL=0
TOKEN=""

echo "=============================================="
echo "  Polis API 集成测试"
echo "  Base URL: $BASE_URL"
echo "=============================================="

assert_ok() {
    local label="$1"
    local response="$2"
    if echo "$response" | grep -q '"code":0'; then
        echo "  [PASS] $label"
        PASS=$((PASS + 1))
    else
        local msg=$(echo "$response" | grep -o '"message":"[^"]*"' | head -1)
        echo "  [FAIL] $label: $msg"
        FAIL=$((FAIL + 1))
    fi
}

# 1. Health check
echo "--- 1. 健康检查 ---"
HTTP_CODE=$(curl -s -o /tmp/polis_health.json -w "%{http_code}" "${BASE_URL}/health")
if [ "$HTTP_CODE" = "200" ]; then PASS=$((PASS+1)); echo "  [PASS] Health check"; else FAIL=$((FAIL+1)); echo "  [FAIL] Health check"; fi

# 2. Register test user
echo "--- 2. 用户注册 ---"
REGISTER_RESP=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"inttest_'$(date +%s)'","display_name":"集成测试","email":"inttest_'$(date +%s)'@polis.test","password":"test123456"}')
assert_ok "用户注册" "$REGISTER_RESP"
TOKEN=$(echo "$REGISTER_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 3. Login
echo "--- 3. 用户登录 ---"
if [ -z "$TOKEN" ]; then
    LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"zhangsan@test.com","password":"test123456"}')
    assert_ok "用户登录" "$LOGIN_RESP"
    TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

# 4. Query user
echo "--- 4. 查询用户 ---"
USER_RESP=$(curl -s "${BASE_URL}/api/users/zhangsan")
assert_ok "查询用户 zhangsan" "$USER_RESP"

# 5. Create space
echo "--- 5. 创建社区 ---"
if [ -n "$TOKEN" ]; then
    SPACE_SLUG="inttest-$(date +%s)"
    SPACE_RESP=$(curl -s -X POST "${BASE_URL}/api/spaces" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"slug\":\"${SPACE_SLUG}\",\"title\":\"集成测试社区\",\"description\":\"API 测试创建\"}")
    assert_ok "创建社区 /${SPACE_SLUG}" "$SPACE_RESP"
fi

# 6. Trending spaces
echo "--- 6. 热门社区 ---"
TRENDING_RESP=$(curl -s "${BASE_URL}/api/spaces/trending")
assert_ok "获取热门社区" "$TRENDING_RESP"

# 7. Create post
echo "--- 7. 发帖 ---"
if [ -n "$TOKEN" ]; then
    POST_RESP=$(curl -s -X POST "${BASE_URL}/api/spaces/zhangsan/rust-lab/posts" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"title":"API 测试：异步编程","body":"测试内容","tags":["Rust","测试"]}')
    assert_ok "创建帖子" "$POST_RESP"

    LIST_RESP=$(curl -s "${BASE_URL}/api/spaces/zhangsan/rust-lab/posts")
    assert_ok "帖子列表" "$LIST_RESP"
fi

# 8. Comments
echo "--- 8. 评论 ---"
if [ -n "$TOKEN" ]; then
    COMMENT_RESP=$(curl -s -X POST "${BASE_URL}/api/spaces/zhangsan/rust-lab/posts/d1000000-0000-0000-0000-000000000001/comments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"body":"集成测试评论"}')
    assert_ok "创建评论" "$COMMENT_RESP"
fi

# 9. Root space
echo "--- 9. 根社区 ---"
ROOT_RESP=$(curl -s "${BASE_URL}/api/root/tech")
assert_ok "根社区 /tech" "$ROOT_RESP"

# 10. Search
echo "--- 10. 搜索 ---"
SEARCH_RESP=$(curl -s "${BASE_URL}/api/search?q=Rust")
echo "  Search result: $(echo $SEARCH_RESP | head -c 100)"

# Summary
echo ""
echo "=============================================="
echo "  通过: $PASS  失败: $FAIL"
echo "=============================================="
exit $FAIL
