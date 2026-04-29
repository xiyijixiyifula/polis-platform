#!/bin/bash
set -e
cd /root/polis

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Build Start =========="

# 1. Pull latest code
echo "[BUILD] Pulling latest code..."
git pull origin main 2>/dev/null || echo "[BUILD] No updates from git"

# 2. Build Rust services
export PATH=$HOME/.cargo/bin:$PATH
echo "[BUILD] Building Rust services..."
cd /root/polis

# Build each service
for svc in polis-gateway polis-user polis-space polis-content polis-admin; do
    echo "[BUILD] Building $svc..."
    cargo build -p $svc --release 2>&1 | tail -3
done

# 3. Build frontend
echo "[BUILD] Building frontend..."
cd /root/polis/web
npm install --silent 2>/dev/null
npm run build 2>&1 | tail -5

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ========== Auto Build Complete =========="
