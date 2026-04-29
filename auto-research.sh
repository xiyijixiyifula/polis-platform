#!/bin/bash
# =============================================================================
# Polis AI Auto-Research System v2
# 每小时自动搜索热门社区/App更新/GitHub趋势，输出洞察报告
# =============================================================================

set -e
cd /root/polis

REPORT_DIR="/root/polis/research-reports"
mkdir -p "$REPORT_DIR"

TIMESTAMP=$(date '+%Y-%m-%d_%H')
DATE_NICE=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="$REPORT_DIR/report-${TIMESTAMP}.md"
SUMMARY_FILE="$REPORT_DIR/latest-summary.md"

# Find current version from changelog
CURRENT_VER=$(grep "ver === '" web/src/app/changelog/page.tsx 2>/dev/null | sed "s/.*ver === '//;s/'.*//" || echo "0.2.2")

cat > "$REPORT_FILE" << EOF
# Polis 自动洞察报告
**生成时间**: $DATE_NICE | **当前版本**: v$CURRENT_VER

---

## 🔥 GitHub 趋势项目

EOF

# ============================================================
# 1. GitHub Trending (HTML fallback)
# ============================================================
TREND_HTML=$(curl -sL --max-time 10 "https://github.com/trending" 2>/dev/null)
if [ -n "$TREND_HTML" ]; then
    echo "$TREND_HTML" | python3 -c "
import re, sys, html
content = sys.stdin.read()
# Find all repo h3 tags
pattern = r'<h2[^>]*class=\"h3 lh-condensed\"[^>]*>.*?<a[^>]*href=\"/([^\"]+)\"[^>]*>(.*?)</a>'
matches = re.findall(pattern, content, re.DOTALL)
# Also find descriptions
desc_pattern = r'<p[^>]*class=\"col-9 color-fg-muted my-1 pr-4\"[^>]*>(.*?)</p>'
descs = re.findall(desc_pattern, content, re.DOTALL)
for i, (path, name) in enumerate(matches[:10]):
    desc = ''
    if i < len(descs):
        desc = re.sub(r'<[^>]+>', '', descs[i]).strip()[:100]
    name_clean = re.sub(r'<[^>]+>', '', name).strip()
    name_clean = re.sub(r'\s+', ' ', name_clean).strip()
    path_clean = path.strip()
    print(f'{i+1}. [{name_clean}](https://github.com/{path_clean})')
    if desc:
        print(f'   > {html.unescape(desc)}')
    print()
" 2>/dev/null >> "$REPORT_FILE" || echo "- GitHub Trending 暂不可用" >> "$REPORT_FILE"
else
    echo "- GitHub Trending 暂不可用" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF
## 📱 主流社区平台更新

EOF

# ============================================================
# 2. Community changelogs
# ============================================================

# GitHub Blog
GH_BLOG=$(curl -sL --max-time 10 "https://github.blog/changelog/" 2>/dev/null)
if [ -n "$GH_BLOG" ]; then
    GH_ITEMS=$(echo "$GH_BLOG" | python3 -c "
import re, sys
html = sys.stdin.read()
# Find changelog entries
entries = re.findall(r'<a[^>]*href=\"https://github\.blog/changelog/[^\"]+\"[^>]*>(.*?)</a>', html)
for e in entries[:3]:
    print(f'- {e.strip()[:100]}')
" 2>/dev/null)
    echo "**GitHub Blog 更新:**" >> "$REPORT_FILE"
    echo "$GH_ITEMS" >> "$REPORT_FILE"
else
    echo "- GitHub Blog: 暂不可用" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Rust Blog
RUST_BLOG=$(curl -sL --max-time 10 "https://blog.rust-lang.org/" 2>/dev/null)
if [ -n "$RUST_BLOG" ]; then
    RUST_ITEMS=$(echo "$RUST_BLOG" | python3 -c "
import re, sys
html = sys.stdin.read()
entries = re.findall(r'<a[^>]*href=\"(https://blog\.rust-lang\.org/[0-9]+/[0-9]+/[0-9]+/[^\"]+)\"[^>]*>(.*?)</a>', html)
for url, title in entries[:3]:
    t = re.sub(r'<[^>]+>', '', title).strip()[:80]
    print(f'- [{t}]({url})')
" 2>/dev/null)
    echo "**Rust 官方动态:**" >> "$REPORT_FILE"
    echo "$RUST_ITEMS" >> "$REPORT_FILE"
else
    echo "- Rust 官方: 暂不可用" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Next.js releases
NEXT_RELEASES=$(curl -sL --max-time 10 "https://api.github.com/repos/vercel/next.js/releases?per_page=3" 2>/dev/null)
if [ -n "$NEXT_RELEASES" ]; then
    echo "$NEXT_RELEASES" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for r in data:
            tag = r.get('tag_name', '')
            name = r.get('name', '')[:80]
            print(f'- [{name}]({r.get(\"html_url\", \"\")})')
    else:
        print('- Next.js: 暂不可用')
except:
    print('- Next.js: 解析失败')
" 2>/dev/null >> "$REPORT_FILE" || echo "- Next.js: 暂不可用" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF
## 💡 功能推荐 (可集成到 Polis)

### 从社区对标分析中提取

EOF

# ============================================================
# 3. Feature recommendations from COMMUNITY_ANALYSIS
# ============================================================
if [ -f COMMUNITY_ANALYSIS.md ]; then
    python3 -c "
with open('COMMUNITY_ANALYSIS.md') as f:
    lines = f.readlines()

in_table = False
for line in lines:
    if '功能优先级矩阵' in line:
        in_table = True
        continue
    if in_table and line.startswith('|---'):
        # Skip separator line, next lines are data
        continue
    if in_table and '|' in line and not line.strip().startswith('#'):
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 4 and parts[0] and '功能' not in parts[0] and '---' not in parts[0]:
            feat = parts[0]
            value = parts[1] if len(parts) > 1 else '-'
            cost = parts[2] if len(parts) > 2 else '-'
            pri = parts[3] if len(parts) > 3 else '-'
            if feat.strip():
                print(f'- **{feat}** | 价值: {value} | 成本: {cost} | 优先级: {pri}')
" 2>/dev/null >> "$REPORT_FILE" || echo "- 未找到对标分析" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

### 从 GitHub 搜索社区相关项目

EOF

# Search for community-related projects
python3 << 'PYEOF' 2>/dev/null >> "$REPORT_FILE" || echo "- GitHub API 搜索暂不可用 (可能达到速率限制)" >> "$REPORT_FILE"
import json, urllib.request, sys

queries = ['rust community platform', 'nextjs forum', 'social network rust', 'real-time chat websocket', 'notification system microservice']
found = []

for q in queries:
    try:
        url = f"https://api.github.com/search/repositories?q={q.replace(' ', '+')}+stars:>50&sort=stars&per_page=2"
        req = urllib.request.Request(url, headers={'User-Agent': 'Polis-Research', 'Accept': 'application/vnd.github.v3+json'})
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read())
        for item in data.get('items', [])[:2]:
            found.append({
                'name': item['full_name'],
                'desc': (item.get('description') or 'No description')[:100],
                'stars': item['stargazers_count'],
                'url': item['html_url'],
                'lang': item.get('language') or 'N/A'
            })
    except:
        pass

seen = set()
for f in found:
    if f['name'] not in seen:
        seen.add(f['name'])
        print(f"- [{f['name']}]({f['url']}) ⭐{f['stars']} ({f['lang']})")
        if f['desc'] != 'No description':
            print(f"  > {f['desc']}")
        print()

if not found:
    print("- GitHub API 速率限制或网络问题，暂无法搜索")
PYEOF

cat >> "$REPORT_FILE" << EOF
## 🏥 系统健康状态

EOF

# ============================================================
# 4. System health
# ============================================================
for svc in polis-gateway polis-user polis-space polis-content polis-admin; do
    STATUS=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "active" ]; then
        echo "- ✅ **$svc**: 运行中" >> "$REPORT_FILE"
    else
        echo "- ❌ **$svc**: $STATUS" >> "$REPORT_FILE"
    fi
done

if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "- ✅ **Frontend** (port 3000): 运行中" >> "$REPORT_FILE"
else
    echo "- ❌ **Frontend** (port 3000): 异常" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF

## 🎯 当前开发进度

- **当前版本**: v$CURRENT_VER
- **生成时间**: $DATE_NICE

### 建议下一步开发

1. **文件分享系统** — 类似百度网盘/知识星球，用户可在社区上传/分享文件
2. **实时通知** — WebSocket + NATS 实现实时消息推送
3. **用户关注系统** — 关注/粉丝/动态流
4. **暗黑模式** — 提升夜间使用体验
5. **Markdown 编辑器增强** — 拖拽上传、实时预览、粘贴图片

---

*🤖 由 Polis AI 自动研究系统生成 | 每小时自动更新*
EOF

# Update symlink
cp "$REPORT_FILE" "$SUMMARY_FILE"

echo "[RESEARCH] ✅ Report saved: $REPORT_FILE"
echo "[RESEARCH] $(date '+%Y-%m-%d %H:%M:%S')" >> /root/polis/research-log.txt

# Cleanup old reports (keep 7 days)
find "$REPORT_DIR" -name "report-*.md" -mtime +7 -delete 2>/dev/null
