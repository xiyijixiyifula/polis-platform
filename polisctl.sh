#!/usr/bin/env bash
# =============================================================================
# polisctl — Polis Platform CLI v1.0
# 
# Complete command-line interface for the Polis community platform.
# Covers: auth, profile, spaces, posts, comments, voting, polls, series, 
# tiers, files, bookmarks, notifications, search, admin operations.
#
# Designed for both human and AI agent use.
# =============================================================================
set -euo pipefail

# === Configuration ===
BASE_URL="${POLIS_BASE_URL:-https://speedtest.mzgw.com}"
CONFIG_DIR="${HOME}/.polis"
TOKEN_FILE="${CONFIG_DIR}/token"
USER_FILE="${CONFIG_DIR}/user"
ADMIN_TOKEN_FILE="${CONFIG_DIR}/admin_token"
OUTPUT_FORMAT="${POLIS_FORMAT:-json}"  # json | table | raw

# === Colors (disabled if not a TTY) ===
if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
fi

mkdir -p "$CONFIG_DIR"

# === Helpers ===
http_get()  { curl -sf "${BASE_URL}${1}" -H "Authorization: Bearer ${2:-}" "${@:3}"; }
http_post() { curl -sf -X POST "${BASE_URL}${1}" -H "Authorization: Bearer ${2:-}" -H "Content-Type: application/json" "${@:3}"; }
http_put()  { curl -sf -X PUT "${BASE_URL}${1}" -H "Authorization: Bearer ${2:-}" -H "Content-Type: application/json" "${@:3}"; }
http_del()  { curl -sf -X DELETE "${BASE_URL}${1}" -H "Authorization: Bearer ${2:-}" "${@:3}"; }

get_token() { [ -f "$TOKEN_FILE" ] && cat "$TOKEN_FILE" || echo ""; }
get_user()  { [ -f "$USER_FILE" ] && cat "$USER_FILE" || echo ""; }
get_admin_token() { [ -f "$ADMIN_TOKEN_FILE" ] && cat "$ADMIN_TOKEN_FILE" || echo ""; }

require_auth() {
    local t; t=$(get_token)
    [ -z "$t" ] && { echo '{"error":"Not logged in. Run: polisctl auth login"}' >&2; exit 1; }
    echo "$t"
}

save_session() {
    local token="$1" user="$2"
    echo "$token" > "$TOKEN_FILE"
    echo "$user" > "$USER_FILE"
    chmod 600 "$TOKEN_FILE" "$USER_FILE"
}

# Output: jq filter for clean display, or raw JSON
output() {
    local filter="${1:-.}"
    if [ "$OUTPUT_FORMAT" = "json" ] || [ ! -t 1 ]; then
        jq -c "$filter" 2>/dev/null || cat
    else
        jq "$filter" 2>/dev/null || cat
    fi
}

# === Auth Commands ===
cmd_auth() {
    local action="${1:-}"; shift || true
    case "$action" in
        register)
            local username="${1:?Usage: polisctl auth register <username> <email> <password> [display_name]}"
            local email="${2:?}"
            local password="${3:?}"
            local display="${4:-$username}"
            local resp
            resp=$(curl -sf -X POST "${BASE_URL}/api/auth/register" \
                -H "Content-Type: application/json" \
                -d "{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"$password\",\"display_name\":\"$display\"}")
            local token user
            token=$(echo "$resp" | jq -r '.data.access_token')
            user=$(echo "$resp" | jq -r '.data.user.username')
            save_session "$token" "$user"
            echo "$resp" | output '.data'
            echo -e "${GREEN}✓ Registered and logged in as @${BOLD}${user}${NC}" >&2
            ;;
        login)
            local email="${1:?Usage: polisctl auth login <email> <password>}"
            local password="${2:?}"
            local resp
            resp=$(curl -sf -X POST "${BASE_URL}/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$email\",\"password\":\"$password\"}")
            local token user
            token=$(echo "$resp" | jq -r '.data.access_token')
            user=$(echo "$resp" | jq -r '.data.user.username')
            save_session "$token" "$user"
            echo "$resp" | output '.data.user'
            echo -e "${GREEN}✓ Logged in as @${BOLD}${user}${NC}" >&2
            ;;
        whoami)
            local t; t=$(get_token)
            [ -z "$t" ] && { echo '{"error":"Not logged in"}' >&2; exit 1; }
            http_get "/api/users/me" "$t" | output '.data'
            ;;
        logout)
            rm -f "$TOKEN_FILE" "$USER_FILE"
            echo -e "${GREEN}✓ Logged out${NC}" >&2
            ;;
        token)
            get_token
            ;;
        *)
            echo "Usage: polisctl auth {register|login|whoami|logout|token}" >&2
            exit 1
            ;;
    esac
}

# === Profile Commands ===
cmd_profile() {
    local action="${1:-view}"; shift || true
    case "$action" in
        view)
            local username="${1:-$(get_user)}"
            [ -z "$username" ] && { echo '{"error":"Specify username or login first"}' >&2; exit 1; }
            http_get "/api/users/${username}" | output '.data'
            ;;
        update)
            local t; t=$(require_auth)
            local display="${1:-}"; local avatar="${2:-}"; local bio="${3:-}"
            local body="{}"
            [ -n "$display" ] && body=$(echo "$body" | jq --arg v "$display" '.display_name=$v')
            [ -n "$avatar" ] && body=$(echo "$body" | jq --arg v "$avatar" '.avatar_url=$v')
            [ -n "$bio" ] && body=$(echo "$body" | jq --arg v "$bio" '.bio=$v')
            http_put "/api/users/me" "$t" -d "$body" | output '.data'
            ;;
        password)
            local t; t=$(require_auth)
            local old="${1:?Usage: polisctl profile password <old> <new>}"
            local new="${2:?}"
            http_put "/api/users/me/password" "$t" \
                -d "{\"old_password\":\"$old\",\"new_password\":\"$new\"}" | output
            ;;
        spaces)
            local username="${1:-$(get_user)}"
            http_get "/api/users/${username}/spaces" | output '.data[] | {namespace,title,visibility,member_count}'
            ;;
        followers)
            local username="${1:-$(get_user)}"
            http_get "/api/users/${username}/followers" | output '.data[] | {username,display_name}'
            ;;
        following)
            local username="${1:-$(get_user)}"
            http_get "/api/users/${username}/following" | output '.data[] | {username,display_name}'
            ;;
        *)
            echo "Usage: polisctl profile {view|update|password|spaces|followers|following}" >&2
            exit 1
            ;;
    esac
}

# === Follow Commands ===
cmd_follow() {
    local action="${1:-}"; shift || true
    local t; t=$(require_auth)
    case "$action" in
        user)
            local username="${1:?Usage: polisctl follow user <username>}"
            local user_id
            user_id=$(http_get "/api/users/${username}" | jq -r '.data.id')
            http_post "/api/follow" "$t" -d "{\"followee_type\":\"user\",\"followee_id\":\"$user_id\"}" | output '.data'
            ;;
        space)
            local ns="${1:?Usage: polisctl follow space <namespace>}"
            local space_id
            space_id=$(http_get "/api/spaces/${ns}" | jq -r '.data.id')
            http_post "/api/follow" "$t" -d "{\"followee_type\":\"space\",\"followee_id\":\"$space_id\"}" | output '.data'
            ;;
        *)
            echo "Usage: polisctl follow {user|space} <target>" >&2; exit 1 ;;
    esac
}

# === Space Commands ===
cmd_space() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local slug="${1:?Usage: polisctl space create <slug> <title> [description] [visibility]}"
            local title="${2:?}"
            local desc="${3:-}"
            local vis="${4:-public}"
            http_post "/api/spaces" "$t" \
                -d "{\"slug\":\"$slug\",\"title\":\"$title\",\"description\":\"$desc\",\"visibility\":\"$vis\"}" | output '.data'
            ;;
        get)
            local ns="${1:?Usage: polisctl space get <namespace>}"
            http_get "/api/spaces/${ns}" | output '.data'
            ;;
        update)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl space update <namespace> [title] [description] [visibility]}"
            local title="${2:-}"; local desc="${3:-}"; local vis="${4:-}"
            local body="{}"
            [ -n "$title" ] && body=$(echo "$body" | jq --arg v "$title" '.title=$v')
            [ -n "$desc" ] && body=$(echo "$body" | jq --arg v "$desc" '.description=$v')
            [ -n "$vis" ] && body=$(echo "$body" | jq --arg v "$vis" '.visibility=$v')
            http_put "/api/spaces/${ns}" "$t" -d "$body" | output '.data'
            ;;
        join)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl space join <namespace>}"
            http_post "/api/spaces/${ns}/join" "$t" | output
            echo -e "${GREEN}✓ Joined${NC}" >&2
            ;;
        leave)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl space leave <namespace>}"
            http_post "/api/spaces/${ns}/leave" "$t" | output
            echo -e "${GREEN}✓ Left${NC}" >&2
            ;;
        members)
            local ns="${1:?}"
            http_get "/api/spaces/${ns}/members" | output '.data'
            ;;
        search)
            local q="${1:?Usage: polisctl space search <query> [limit]}"
            local limit="${2:-20}"
            http_get "/api/search?q=${q}&page_size=${limit}" | output '.data[] | {namespace,title,visibility,member_count,post_count}'
            ;;
        trending)
            local limit="${1:-20}"
            http_get "/api/spaces/trending?page_size=${limit}" | output '.data[] | {namespace,title,member_count}'
            ;;
        root)
            local slug="${1:?}"
            http_get "/api/root/${slug}" | output '.data'
            ;;
        subspaces)
            local slug="${1:?}"
            http_get "/api/root/${slug}/subspaces" | output '.data[] | {namespace,title}'
            ;;
        *)
            echo "Usage: polisctl space {create|get|update|join|leave|members|search|trending|root|subspaces}" >&2
            exit 1
            ;;
    esac
}

# === Post Commands ===
cmd_post() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl post create <namespace> <title> [body] [tags] [module]}"
            local title="${2:?}"
            local body="${3:-}"
            local tags="${4:-}"
            local module="${5:-forum}"
            local tags_json="[]"
            [ -n "$tags" ] && tags_json=$(echo "$tags" | jq -R 'split(",")')
            http_post "/api/spaces/${ns}/posts" "$t" \
                -d "{\"title\":\"$title\",\"body\":\"$body\",\"tags\":$tags_json,\"module_type\":\"$module\",\"content_type\":\"text\"}" | output '.data | {id, title, author_id, created_at}'
            ;;
        list)
            local ns="${1:?Usage: polisctl post list <namespace> [page] [size] [module]}"
            local page="${2:-1}"; local size="${3:-20}"; local module="${4:-}"
            local url="/api/spaces/${ns}/posts?page=${page}&page_size=${size}"
            [ -n "$module" ] && url="${url}&module=${module}"
            http_get "$url" | output '.data[] | {id: .id, title: .title, author: .author.username, is_featured: .is_featured, view_count: .view_count, like_count: .like_count, created_at: .created_at}'
            ;;
        get)
            local id="${1:?Usage: polisctl post get <post_id>}"
            http_get "/api/posts/${id}" | output '.data'
            ;;
        update)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl post update <namespace> <post_id> <title> [body] [tags]}"
            local pid="${2:?}"; local title="${3:?}"; local body="${4:-}"; local tags="${5:-}"
            local body_json="{\"title\":\"$title\"}"
            [ -n "$body" ] && body_json=$(echo "$body_json" | jq --arg v "$body" '.body=$v')
            [ -n "$tags" ] && body_json=$(echo "$body_json" | jq --arg v "$tags" '.tags=($v|split(","))')
            http_put "/api/spaces/${ns}/posts/${pid}" "$t" -d "$body_json" | output '.data'
            ;;
        delete)
            local t; t=$(require_auth)
            local ns="${1:?Usage: polisctl post delete <namespace> <post_id>}"
            local pid="${2:?}"
            http_del "/api/spaces/${ns}/posts/${pid}" "$t" | output
            echo -e "${GREEN}✓ Deleted${NC}" >&2
            ;;
        featured)
            local ns="${1:?Usage: polisctl post featured <namespace>}"
            http_get "/api/spaces/${ns}/featured" | output '.data[] | {id: .id, title: .title, author: .author.username}'
            ;;
        search)
            local q="${1:?Usage: polisctl post search <query> [limit]}"
            local limit="${2:-20}"
            http_get "/api/posts/search?q=${q}&page_size=${limit}" | output '.data[] | {id: .id, title: .title, author: .author.username, created_at: .created_at}'
            ;;
        *)
            echo "Usage: polisctl post {create|list|get|update|delete|featured|search}" >&2
            exit 1
            ;;
    esac
}

# === Comment Commands ===
cmd_comment() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local pid="${1:?Usage: polisctl comment create <post_id> <body> [parent_id]}"
            local body="${2:?}"; local parent="${3:-}"
            local body_json="{\"body\":\"$body\"}"
            [ -n "$parent" ] && body_json=$(echo "$body_json" | jq --arg v "$parent" '.parent_id=$v')
            http_post "/api/posts/${pid}/comments" "$t" -d "$body_json" | output '.data'
            ;;
        list)
            local pid="${1:?Usage: polisctl comment list <post_id>}"
            http_get "/api/posts/${pid}/comments" | output '.data[] | {id: .id, author_id, body: .body, like_count: .like_count, created_at: .created_at}'
            ;;
        *)
            echo "Usage: polisctl comment {create|list}" >&2; exit 1 ;;
    esac
}

# === Vote Commands (upvote/downvote) ===
cmd_vote() {
    local action="${1:-}"; shift || true
    case "$action" in
        up)
            local t; t=$(require_auth)
            local type="${1:-post}"; local id="${2:?Usage: polisctl vote up <type> <target_id>}"
            http_post "/api/vote" "$t" -d "{\"target_type\":\"$type\",\"target_id\":\"$id\",\"value\":1}" | output '.data'
            ;;
        down)
            local t; t=$(require_auth)
            local type="${1:-post}"; local id="${2:?}"
            http_post "/api/vote" "$t" -d "{\"target_type\":\"$type\",\"target_id\":\"$id\",\"value\":-1}" | output '.data'
            ;;
        score)
            local type="${1:-post}"; local id="${2:?Usage: polisctl vote score <type> <target_id>}"
            http_get "/api/vote?target_type=${type}&target_id=${id}" | output '.data'
            ;;
        *)
            echo "Usage: polisctl vote {up|down|score} <type> <target_id>" >&2; exit 1 ;;
    esac
}

# === Like Commands ===
cmd_like() {
    local t; t=$(require_auth)
    local ns="${1:?Usage: polisctl like <namespace> <post_id>}"
    local pid="${2:?}"
    http_post "/api/spaces/${ns}/posts/${pid}/like" "$t" | output '.data'
}

# === Bookmark Commands ===
cmd_bookmark() {
    local action="${1:-}"; shift || true
    local t; t=$(require_auth)
    case "$action" in
        add)
            local ns="${1:?}"; local pid="${2:?}"
            http_post "/api/spaces/${ns}/posts/${pid}/bookmark" "$t" | output '.data'
            ;;
        list)
            http_get "/api/bookmarks" "$t" | output '.data'
            ;;
        *)
            echo "Usage: polisctl bookmark {add|list}" >&2; exit 1 ;;
    esac
}

# === Report Commands ===
cmd_report() {
    local t; t=$(require_auth)
    local ns="${1:?Usage: polisctl report <namespace> <post_id> <reason>}"
    local pid="${2:?}"; local reason="${3:?}"
    http_post "/api/spaces/${ns}/posts/${pid}/report" "$t" -d "{\"reason\":\"$reason\"}" | output
    echo -e "${GREEN}✓ Reported${NC}" >&2
}

# === Poll Commands ===
cmd_poll() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local space_id="${1:?}"; local title="${2:?}"; local type="${3:-single}"
            shift 3 || true
            local options_json
            options_json=$(printf '%s\n' "$@" | jq -R . | jq -s .)
            http_post "/api/polls" "$t" \
                -d "{\"space_id\":\"$space_id\",\"title\":\"$title\",\"poll_type\":\"$type\",\"options\":$options_json}" | output '.data'
            ;;
        get)
            local id="${1:?}"
            http_get "/api/polls/${id}" | output '.data'
            ;;
        vote)
            local t; t=$(require_auth)
            local poll_id="${1:?}"; local option_id="${2:?}"
            http_post "/api/polls/${poll_id}/vote" "$t" -d "{\"option_id\":\"$option_id\"}" | output
            ;;
        list)
            local ns="${1:?}"
            http_get "/api/spaces/${ns}/polls" | output '.data'
            ;;
        *)
            echo "Usage: polisctl poll {create|get|vote|list}" >&2; exit 1 ;;
    esac
}

# === Series Commands ===
cmd_series() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local ns="${1:?}"; local title="${2:?}"; local desc="${3:-}"
            http_post "/api/series/space/${ns}" "$t" \
                -d "{\"title\":\"$title\",\"description\":\"$desc\"}" | output '.data'
            ;;
        list)
            local ns="${1:?}"
            http_get "/api/series/space/${ns}" | output '.data[] | {id,title,post_count,created_at}'
            ;;
        get)
            local id="${1:?}"
            http_get "/api/series/${id}" | output '.data'
            ;;
        update)
            local t; t=$(require_auth)
            local id="${1:?}"; local title="${2:?}"
            http_put "/api/series/${id}" "$t" -d "{\"title\":\"$title\"}" | output
            ;;
        delete)
            local t; t=$(require_auth)
            local id="${1:?}"
            http_del "/api/series/${id}" "$t" | output
            echo -e "${GREEN}✓ Series deleted${NC}" >&2
            ;;
        add-post)
            local t; t=$(require_auth)
            local series_id="${1:?}"; local post_id="${2:?}"
            http_post "/api/series/${series_id}/posts" "$t" -d "{\"post_id\":\"$post_id\"}" | output
            ;;
        remove-post)
            local t; t=$(require_auth)
            local series_id="${1:?}"; local post_id="${2:?}"
            http_del "/api/series/${series_id}/posts/${post_id}" "$t" | output
            ;;
        *)
            echo "Usage: polisctl series {create|list|get|update|delete|add-post|remove-post}" >&2; exit 1 ;;
    esac
}

# === Tier Commands (Paid Community) ===
cmd_tier() {
    local action="${1:-}"; shift || true
    case "$action" in
        create)
            local t; t=$(require_auth)
            local ns="${1:?}"; local name="${2:?}"; local price="${3:?}"; local desc="${4:-}"
            http_post "/api/tiers/space/${ns}" "$t" \
                -d "{\"name\":\"$name\",\"price_cents\":$price,\"description\":\"$desc\"}" | output '.data'
            ;;
        list)
            local ns="${1:?}"
            http_get "/api/tiers/space/${ns}" | output '.data[] | {id,name,price_cents,is_active}'
            ;;
        update)
            local t; t=$(require_auth)
            local id="${1:?}"; local name="${2:?}"
            http_put "/api/tiers/${id}" "$t" -d "{\"name\":\"$name\"}" | output
            ;;
        delete)
            local t; t=$(require_auth)
            local id="${1:?}"
            http_del "/api/tiers/${id}" "$t" | output
            ;;
        *)
            echo "Usage: polisctl tier {create|list|update|delete}" >&2; exit 1 ;;
    esac
}

# === Subscribe Commands ===
cmd_subscribe() {
    local action="${1:-}"; shift || true
    local t; t=$(require_auth)
    case "$action" in
        join)
            local ns="${1:?}"; local tier_id="${2:?}"
            http_post "/api/subscribe/space/${ns}" "$t" -d "{\"tier_id\":\"$tier_id\"}" | output '.data'
            echo -e "${GREEN}✓ Subscribed${NC}" >&2
            ;;
        cancel)
            local ns="${1:?}"
            http_del "/api/subscribe/space/${ns}" "$t" | output
            echo -e "${GREEN}✓ Unsubscribed${NC}" >&2
            ;;
        status)
            local ns="${1:?}"
            local resp; resp=$(http_get "/api/subscribe/space/${ns}" "$t")
            local sub; sub=$(echo "$resp" | jq -r '.data')
            if [ "$sub" = "null" ] || [ -z "$sub" ]; then
                echo -e "${GREEN}No active subscription${NC}" >&2
                echo 'null'
            else
                echo "$resp" | output '.data'
            fi
            ;;
        *)
            echo "Usage: polisctl subscribe {join|cancel|status}" >&2; exit 1 ;;
    esac
}

# === File Commands ===
cmd_file() {
    local action="${1:-}"; shift || true
    case "$action" in
        list)
            local ns="${1:?}"
            http_get "/api/spaces/${ns}/files" | output '.data'
            ;;
        upload)
            local t; t=$(require_auth)
            local ns="${1:?}"; local filepath="${2:?}"; local filename="${3:-$(basename "$filepath")}"
            local mime; mime=$(file --mime-type -b "$filepath" 2>/dev/null || echo "application/octet-stream")
            local b64; b64=$(base64 -i "$filepath" 2>/dev/null || base64 "$filepath")
            http_post "/api/spaces/${ns}/files" "$t" \
                -d "{\"filename\":\"$filename\",\"data_base64\":\"$b64\",\"mime_type\":\"$mime\"}" | output '.data'
            ;;
        *)
            echo "Usage: polisctl file {list|upload}" >&2; exit 1 ;;
    esac
}

# === Draft Commands ===
cmd_draft() {
    local action="${1:-}"; shift || true
    local t; t=$(require_auth)
    case "$action" in
        save)
            local space_id="${1:-null}"; local title="${2:?}"; local body="${3:?}"
            local module="${4:-forum}" 
            http_post "/api/drafts" "$t" \
                -d "{\"space_id\":$space_id,\"title\":\"$title\",\"body\":\"$body\",\"module_type\":\"$module\"}" | output '.data'
            ;;
        list)
            http_get "/api/drafts" "$t" | output '.data'
            ;;
        *)
            echo "Usage: polisctl draft {save|list}" >&2; exit 1 ;;
    esac
}

# === Notification Commands ===
cmd_notify() {
    local action="${1:-}"; shift || true
    local t; t=$(require_auth)
    case "$action" in
        list)
            http_get "/api/notifications" "$t" | output '.data'
            ;;
        unread)
            http_get "/api/notifications/unread-count" "$t" | output '.data'
            ;;
        read-all)
            http_post "/api/notifications/read-all" "$t" | output
            echo -e "${GREEN}✓ All marked read${NC}" >&2
            ;;
        *)
            echo "Usage: polisctl notify {list|unread|read-all}" >&2; exit 1 ;;
    esac
}

# === Announcement Commands ===
cmd_announce() {
    local ns="${1:?Usage: polisctl announce <namespace>}"
    http_get "/api/spaces/${ns}/announcements" | output '.data'
}

# === Admin Commands ===
cmd_admin() {
    local action="${1:-}"; shift || true
    case "$action" in
        login)
            local email="${1:-admin@polis.app}"; local code="${2:-polis2024}"
            local resp
            resp=$(curl -sf -X POST "${BASE_URL}/api/admin/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$email\",\"password\":\"admin123\",\"admin_code\":\"$code\"}")
            echo "$resp" | jq -r '.data.access_token' > "$ADMIN_TOKEN_FILE"
            chmod 600 "$ADMIN_TOKEN_FILE"
            echo -e "${GREEN}✓ Admin logged in${NC}" >&2
            ;;
        dashboard)
            local t; t=$(get_admin_token)
            [ -z "$t" ] && { echo "Run: polisctl admin login first" >&2; exit 1; }
            http_get "/api/admin/dashboard" "$t" | output '.data'
            ;;
        stats)
            local t; t=$(get_admin_token)
            http_get "/api/admin/stats" "$t" | output '.data'
            ;;
        users)
            local t; t=$(get_admin_token)
            local sub="${1:-list}"; shift || true
            case "$sub" in
                list)
                    http_get "/api/admin/users?page=${1:-1}&page_size=${2:-20}" "$t" | \
                        output '.data[] | {id,username,display_name,email,verified,created_at}'
                    ;;
                get)
                    http_get "/api/admin/users/${1}" "$t" | output '.data'
                    ;;
                ban)
                    http_post "/api/admin/users/${1}/ban" "$t" -d "{\"reason\":\"${2:-violation}\"}" | output
                    ;;
                unban)
                    http_post "/api/admin/users/${1}/unban" "$t" | output
                    ;;
                *) echo "Usage: polisctl admin users {list|get|ban|unban}" >&2; exit 1 ;;
            esac
            ;;
        spaces)
            local t; t=$(get_admin_token)
            local sub="${1:-list}"; shift || true
            case "$sub" in
                list)
                    http_get "/api/admin/spaces?page=${1:-1}&page_size=${2:-20}" "$t" | \
                        output '.data[] | {id,title,namespace,visibility,status,member_count,post_count}'
                    ;;
                get)
                    http_get "/api/admin/spaces/${1}" "$t" | output '.data'
                    ;;
                status)
                    http_put "/api/admin/spaces/${1}/status" "$t" -d "{\"status\":\"${2:-active}\"}" | output
                    ;;
                *) echo "Usage: polisctl admin spaces {list|get|status}" >&2; exit 1 ;;
            esac
            ;;
        posts)
            local t; t=$(get_admin_token)
            local sub="${1:-list}"; shift || true
            case "$sub" in
                list)
                    http_get "/api/admin/posts?page=${1:-1}&page_size=${2:-20}" "$t" | \
                        output '.data[] | {id,title,module_type,is_featured,is_deleted,view_count}'
                    ;;
                get)
                    http_get "/api/admin/posts/${1}" "$t" | output '.data'
                    ;;
                delete)
                    http_del "/api/admin/posts/${1}" "$t" | output
                    ;;
                feature)
                    http_post "/api/admin/posts/${1}/feature" "$t" | output
                    ;;
                unfeature)
                    http_post "/api/admin/posts/${1}/unfeature" "$t" | output
                    ;;
                *) echo "Usage: polisctl admin posts {list|get|delete|feature|unfeature}" >&2; exit 1 ;;
            esac
            ;;
        comments)
            local t; t=$(get_admin_token)
            local sub="${1:-list}"; shift || true
            case "$sub" in
                list)
                    http_get "/api/admin/comments?page=${1:-1}&page_size=${2:-20}" "$t" | \
                        output '.data.items[] | {id: .id, author_id, body: .body, like_count: .like_count}'
                    ;;
                delete)
                    http_del "/api/admin/comments/${1}" "$t" | output
                    ;;
                *) echo "Usage: polisctl admin comments {list|delete}" >&2; exit 1 ;;
            esac
            ;;
        reports)
            local t; t=$(get_admin_token)
            local sub="${1:-list}"; shift || true
            case "$sub" in
                list)
                    http_get "/api/admin/reports?page=${1:-1}&page_size=${2:-20}" "$t" | \
                        output '.data.items[] | {id,reporter_username,target_type,reason,status}'
                    ;;
                resolve)
                    http_post "/api/admin/reports/${1}/resolve" "$t" -d '{"action":"resolve"}' | output
                    ;;
                dismiss)
                    http_post "/api/admin/reports/${1}/resolve" "$t" -d '{"action":"dismiss"}' | output
                    ;;
                *) echo "Usage: polisctl admin reports {list|resolve|dismiss}" >&2; exit 1 ;;
            esac
            ;;
        transactions)
            local t; t=$(get_admin_token)
            http_get "/api/admin/transactions?page=${1:-1}&page_size=${2:-20}" "$t" | \
                output '.data.items[] | {id,from_username,amount_cents,tx_type,status}'
            ;;
        analytics)
            local t; t=$(get_admin_token)
            local type="${1:-users}"; local days="${2:-30}"
            http_get "/api/admin/analytics/${type}?days=${days}" "$t" | output '.data'
            ;;
        *)
            echo "Usage: polisctl admin {login|dashboard|stats|users|spaces|posts|comments|reports|transactions|analytics}" >&2
            exit 1
            ;;
    esac
}

# === Main Entry Point ===
main() {
    local cmd="${1:-}"; shift || true
    [ -z "$cmd" ] && { echo "Usage: polisctl <command> [args...]"; echo "Run: polisctl help"; exit 0; }

    case "$cmd" in
        help|--help|-h)
            echo "Polis Platform CLI — polisctl v1.0"
            echo ""
            echo "COMMANDS:"
            echo "  auth      {register|login|whoami|logout|token}"
            echo "  profile   {view|update|password|spaces|followers|following}"
            echo "  follow    {user|space} <target>"
            echo "  space     {create|get|update|join|leave|search|trending|root|subspaces}"
            echo "  post      {create|list|get|update|delete|featured|search}"
            echo "  comment   {create|list}"
            echo "  like      <namespace> <post_id>"
            echo "  vote      {up|down|score} <type> <target_id>"
            echo "  bookmark  {add|list}"
            echo "  report    <namespace> <post_id> <reason>"
            echo "  poll      {create|get|vote|list}"
            echo "  series    {create|list|get|update|delete|add-post|remove-post}"
            echo "  tier      {create|list|update|delete}"
            echo "  subscribe {join|cancel|status}"
            echo "  file      {list|upload}"
            echo "  draft     {save|list}"
            echo "  notify    {list|unread|read-all}"
            echo "  announce  <namespace>"
            echo "  admin     {login|dashboard|stats|users|spaces|posts|comments|reports|transactions|analytics}"
            echo ""
            echo "ENV: POLIS_BASE_URL (default: https://speedtest.mzgw.com)"
            echo "     POLIS_FORMAT (json|table, default: json)"
            echo ""
            echo "AI AGENTS: Set POLIS_FORMAT=json and pipe through jq for structured output."
            echo "See docs/CLI-GUIDE.md for full AI agent integration guide."
            ;;
        auth)       cmd_auth "$@" ;;
        profile)    cmd_profile "$@" ;;
        follow)     cmd_follow "$@" ;;
        space)      cmd_space "$@" ;;
        post)       cmd_post "$@" ;;
        comment)    cmd_comment "$@" ;;
        like)       cmd_like "$@" ;;
        vote)       cmd_vote "$@" ;;
        bookmark)   cmd_bookmark "$@" ;;
        report)     cmd_report "$@" ;;
        poll)       cmd_poll "$@" ;;
        series)     cmd_series "$@" ;;
        tier)       cmd_tier "$@" ;;
        subscribe)  cmd_subscribe "$@" ;;
        file)       cmd_file "$@" ;;
        draft)      cmd_draft "$@" ;;
        notify)     cmd_notify "$@" ;;
        announce)   cmd_announce "$@" ;;
        admin)      cmd_admin "$@" ;;
        *)
            echo "Unknown command: $cmd. Run: polisctl help" >&2; exit 1 ;;
    esac
}

main "$@"
