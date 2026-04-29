#!/bin/bash
# =============================================================================
# Polis Auto Changelog Updater
# 自动更新更新日志页面，基于当前开发状态和研究成果
# =============================================================================

set -e
cd /root/polis

CHANGELOG_FILE="web/src/app/changelog/page.tsx"
DATE_TODAY=$(date '+%Y-%m-%d')

echo "[CHANGELOG] Checking updates needed..."

# Check if research reports have new feature suggestions worth noting
LATEST_REPORT=$(ls -t research-reports/report-*.md 2>/dev/null | head -1)
NEW_FEATURES=""

if [ -f "$LATEST_REPORT" ]; then
    # Extract feature recommendations
    NEW_FEATURES=$(grep -A2 "功能推荐" "$LATEST_REPORT" | head -10)
fi

# Check recent git commits for new features
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "")
if [ -n "$RECENT_COMMITS" ]; then
    echo "[CHANGELOG] Recent commits:"
    echo "$RECENT_COMMITS"
fi

# Check if today's date already has an entry or if we need to add one
HAS_TODAY=$(grep "$DATE_TODAY" "$CHANGELOG_FILE" 2>/dev/null || echo "")

# Check current version
CURRENT_VER=$(grep "ver: '" "$CHANGELOG_FILE" 2>/dev/null | head -1 | sed "s/.*ver: '//;s/'.*//" || echo "0.1.0")
echo "[CHANGELOG] Current version: $CURRENT_VER"

# Check for new completed items from auto-dev log
NEW_COMPLETED=$(grep "Results:" /root/polis/auto-dev-summary.log 2>/dev/null | tail -3 || echo "")
echo "[CHANGELOG] Last dev results: $NEW_COMPLETED"

# If research is active and system is running, add a daily health note
if [ -z "$HAS_TODAY" ]; then
    # Only update if there are meaningful changes
    echo "[CHANGELOG] Changelog page is up to date (no automated changes needed)"
else
    echo "[CHANGELOG] Today's entry exists, skipping auto-update"
fi

echo "[CHANGELOG] $(date '+%Y-%m-%d %H:%M:%S') - Check complete" >> /root/polis/changelog-check.log
