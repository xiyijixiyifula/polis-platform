#!/bin/bash
set -e
cd /root/polis

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Dev Cycle Start =========="

# Phase 1: Pull latest + Build
echo "[DEV] Phase 1: Build..."
bash /root/polis/auto-build.sh 2>&1

# Phase 2: Deploy (restart services)
echo "[DEV] Phase 2: Deploy..."
for svc in polis-gateway polis-user polis-space polis-content polis-admin polis-web; do
    echo "[DEV] Restarting $svc..."
    systemctl restart $svc 2>/dev/null || echo "[DEV] Warning: $svc not found"
done
sleep 3

# Phase 3: Run tests
echo "[DEV] Phase 3: Testing..."
FAILURES=0
PASS=0

# Test 1: Gateway health
echo -n "  Test 1/10: Gateway health... "
if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (gateway may have different health endpoint)"; FAILURES=$((FAILURES+1))
fi

# Test 2: Frontend
echo -n "  Test 2/10: Frontend... "
if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

# Test 3: Changelog page
echo -n "  Test 3/10: Changelog... "
if curl -sf http://localhost:3000/changelog > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

# Test 4: User service
echo -n "  Test 4/10: User service... "
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (user may not have health endpoint)"; FAILURES=$((FAILURES+1))
fi

# Test 5: Space service
echo -n "  Test 5/10: Space service... "
if curl -sf http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (space may not have health endpoint)"; FAILURES=$((FAILURES+1))
fi

# Test 6: Content service
echo -n "  Test 6/10: Content service... "
if curl -sf http://localhost:3003/api/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (content may not have health endpoint)"; FAILURES=$((FAILURES+1))
fi

# Test 7: Admin service
echo -n "  Test 7/10: Admin service... "
if curl -sf http://localhost:3050/api/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (admin may not have health endpoint)"; FAILURES=$((FAILURES+1))
fi

# Test 8: Spaces API via gateway
echo -n "  Test 8/10: Spaces API... "
if curl -sf http://localhost:8080/api/spaces > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

# Test 9: User registration API
echo -n "  Test 9/10: Registration API... "
if curl -sf http://localhost:8080/api/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"test_auto","password":"Test123!","email":"test@auto.dev"}' > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (may need different payload)"; FAILURES=$((FAILURES+1))
fi

# Test 10: Announcements endpoint
echo -n "  Test 10/10: Announcements... "
if curl -sf http://localhost:3003/api/announcements > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (content service announcements endpoint)"; FAILURES=$((FAILURES+1))
fi

echo ""
echo "[DEV] Results: $PASS/10 passed, $FAILURES failures"

# Phase 4: Research & feature planning (if dev cycle)
echo "[DEV] Phase 4: Running research..."
bash /root/polis/auto-research.sh 2>&1 || echo "[DEV] Research done (no new findings)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Dev Cycle Complete =========="
echo "Results: $PASS/10 passed" >> /root/polis/auto-dev-summary.log
