#!/bin/bash
# =====================================================
# Polis Auto Build Script v2.0
# Added: .env protection, selective build, rollback support
# =====================================================
set -e
cd /root/polis

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Build Start =========="

# 0. Protect .env from accidental modification
if [ -f /root/polis/.env ]; then
    # Verify critical values are present
    if ! grep -q "DATABASE_URL=postgres://" /root/polis/.env 2>/dev/null; then
        echo "[BUILD] ERROR: DATABASE_URL missing or invalid in .env! Restoring from backup..."
        LATEST_BACKUP=$(ls -t /root/polis/.env.backup.* 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            cp "$LATEST_BACKUP" /root/polis/.env
            echo "[BUILD] .env restored from $LATEST_BACKUP"
        else
            echo "[BUILD] FATAL: No .env backup found. Cannot proceed."
            exit 1
        fi
    fi
    echo "[BUILD] .env validated OK"
fi

# 1. Pull latest code
echo "[BUILD] Pulling latest code..."
git pull origin main 2>/dev/null || echo "[BUILD] No updates from git"

# 2. Build Rust services
export PATH=$HOME/.cargo/bin:$PATH
echo "[BUILD] Building Rust services..."
cd /root/polis

# Build each service
BUILD_FAILED=0
for svc in polis-gateway polis-user polis-space polis-content polis-admin; do
    echo "[BUILD] Building $svc..."
    if cargo build -p $svc --release 2>&1 | tail -3; then
        echo "[BUILD]   $svc: OK"
    else
        echo "[BUILD]   $svc: FAILED"
        BUILD_FAILED=1
    fi
done

if [ "$BUILD_FAILED" -eq 1 ]; then
    echo "[BUILD] CRITICAL: One or more services failed to build!"
    exit 1
fi

# 3. Build frontend
echo "[BUILD] Building frontend..."
cd /root/polis/web
npm install --silent 2>/dev/null || true
npm run build 2>&1 | tail -5
FRONTEND_EXIT=$?

if [ $FRONTEND_EXIT -ne 0 ]; then
    echo "[BUILD] CRITICAL: Frontend build failed!"
    exit 1
fi

# 4. Record build version
echo "v$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD) @ $(date '+%Y-%m-%d %H:%M:%S')" > /root/polis/target/release/VERSION.txt

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Build Complete =========="
