#!/bin/bash
# =====================================================
# Polis Auto Dev Script v2.0
# Fixed: test endpoints, rollback, build safety, .env protection
# =====================================================
set -e
cd /root/polis

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] ========== Auto Dev Cycle Start =========="

# ---- Phase 0: Protect .env ----
echo "[DEV] Phase 0: Protect .env..."
if [ -f /root/polis/.env ]; then
    cp /root/polis/.env /root/polis/.env.backup.$(date +%s)
    echo "[DEV] .env backed up"
fi

# ---- Phase 1: Pull latest + Selective Build ----
echo "[DEV] Phase 1: Pull & Build..."
cd /root/polis
git pull origin main 2>/dev/null || echo "[DEV] No git updates"

export PATH=$HOME/.cargo/bin:$PATH

# Backup current binaries before building
BACKUP_DIR="/root/polis/target/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for svc in polis-gateway polis-user polis-space polis-content polis-admin; do
    if [ -f "/root/polis/target/release/$svc" ]; then
        cp "/root/polis/target/release/$svc" "$BACKUP_DIR/$svc" 2>/dev/null || true
    fi
done
echo "[DEV] Binaries backed up to $BACKUP_DIR"

# Detect which services changed
CHANGED_SERVICES=""
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "crates/polis-gateway"; then CHANGED_SERVICES="$CHANGED_SERVICES polis-gateway"; fi
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "crates/polis-user\|polis-core"; then CHANGED_SERVICES="$CHANGED_SERVICES polis-user"; fi
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "crates/polis-space\|polis-core"; then CHANGED_SERVICES="$CHANGED_SERVICES polis-space"; fi
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "crates/polis-content\|polis-core"; then CHANGED_SERVICES="$CHANGED_SERVICES polis-content"; fi
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "crates/polis-admin\|polis-core"; then CHANGED_SERVICES="$CHANGED_SERVICES polis-admin"; fi
FRONTEND_CHANGED=$(git diff HEAD~1 --name-only 2>/dev/null | grep -c "web/" || echo 0)

# Build changed services (if none detected, build all)
if [ -z "$CHANGED_SERVICES" ]; then
    echo "[DEV] No changes detected, building all services..."
    CHANGED_SERVICES="polis-gateway polis-user polis-space polis-content polis-admin"
fi

BUILD_FAILED=0
for svc in $CHANGED_SERVICES; do
    echo "[DEV] Building $svc..."
    if ! cargo build -p $svc --release 2>&1 | tail -5; then
        echo "[DEV] ERROR: $svc build failed!"
        BUILD_FAILED=1
        break
    fi
done

# Build frontend if changed
if [ "$FRONTEND_CHANGED" -gt 0 ] || [ -z "$CHANGED_SERVICES" ]; then
    echo "[DEV] Building frontend..."
    cd /root/polis/web
    npm install --silent 2>/dev/null || true
    if ! npm run build 2>&1 | tail -8; then
        echo "[DEV] ERROR: Frontend build failed!"
        BUILD_FAILED=1
    fi
fi

if [ "$BUILD_FAILED" -eq 1 ]; then
    echo "[DEV] CRITICAL: Build failed! Rolling back..."
    for svc in polis-gateway polis-user polis-space polis-content polis-admin; do
        if [ -f "$BACKUP_DIR/$svc" ]; then
            cp "$BACKUP_DIR/$svc" "/root/polis/target/release/$svc"
        fi
    done
    echo "[DEV] Rollback complete. Aborting deploy."
    exit 1
fi

# ---- Phase 2: Deploy ----
echo "[DEV] Phase 2: Deploy..."
# Restart only services that were rebuilt
for svc in $CHANGED_SERVICES; do
    echo "[DEV] Restarting $svc..."
    systemctl restart $svc 2>/dev/null || echo "[DEV] Warning: $svc not found"
done
# Restart web if frontend changed
if [ "$FRONTEND_CHANGED" -gt 0 ]; then
    echo "[DEV] Restarting polis-web..."
    systemctl restart polis-web 2>/dev/null || echo "[DEV] Warning: polis-web not found"
fi
sleep 3

# ---- Phase 3: Run tests (FIXED endpoints) ----
echo "[DEV] Phase 3: Testing..."
FAILURES=0
PASS=0

echo -n "  Test  1/10: Gateway health... "
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  2/10: Frontend... "
if curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  3/10: Changelog... "
if curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/changelog 2>/dev/null | grep -q "200"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  4/10: User service... "
USER_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"hcheck","password":"Pass123!","email":"hcheck@t.com","display_name":"HC"}' 2>/dev/null)
if [ "$USER_STATUS" = "422" ] || [ "$USER_STATUS" = "200" ] || [ "$USER_STATUS" = "201" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $USER_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  5/10: Space service... "
SPACE_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3002/api/spaces 2>/dev/null)
if [ "$SPACE_STATUS" = "401" ] || [ "$SPACE_STATUS" = "200" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $SPACE_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  6/10: Content service... "
CONTENT_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3003/api/spaces/life/announcements 2>/dev/null)
if [ "$CONTENT_STATUS" = "200" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $CONTENT_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  7/10: Admin service... "
ADMIN_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3050/api/admin/login -X POST -H "Content-Type: application/json" -d '{"email":"a@a.com","admin_code":"x"}' 2>/dev/null)
if [ "$ADMIN_STATUS" = "401" ] || [ "$ADMIN_STATUS" = "200" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $ADMIN_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  8/10: Spaces API... "
SPACES_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:8080/api/spaces 2>/dev/null)
if [ "$SPACES_STATUS" = "401" ] || [ "$SPACES_STATUS" = "200" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $SPACES_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test  9/10: Registration API... "
REG_STATUS=$(curl -s -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"at_$(date +%s)\",\"display_name\":\"Auto Test\",\"email\":\"at_$(date +%s)@auto.dev\",\"password\":\"Pass123!\"}" 2>/dev/null | grep -o '"code":[0-9]*' | cut -d: -f2)
if [ "$REG_STATUS" = "0" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (code: $REG_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo -n "  Test 10/10: Announcements... "
ANN_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3003/api/spaces/life/announcements 2>/dev/null)
if [ "$ANN_STATUS" = "200" ]; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL (status: $ANN_STATUS)"; FAILURES=$((FAILURES+1))
fi

echo ""
echo "[DEV] Results: $PASS/10 passed, $FAILURES failures"

# Cleanup old backups (keep last 5)
ls -dt /root/polis/target/backup-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
echo "[DEV] Old backups cleaned (kept last 5)"

echo "[$TIMESTAMP] ========== Auto Dev Cycle Complete =========="
echo "[$TIMESTAMP] Results: $PASS/10 passed, $FAILURES failures" >> /root/polis/auto-dev-summary.log
