#!/usr/bin/env bash
# =============================================================================
# Polis Admin Control CLI — adminctl.sh v1.0
# CLI tool for managing Polis admin backend CRUD operations
#
# Usage: ./adminctl.sh <command> [args...]
#   login                           Login and cache token
#   dashboard                       Show dashboard
#   users list [page] [size]        List users
#   users get <id>                  User detail
#   users ban <id> [reason]         Ban user
#   users unban <id>                Unban user
#   spaces list [page] [size]       List spaces
#   spaces get <id>                 Space detail
#   spaces status <id> <status>     Update space status
#   posts list [page] [size]        List posts
#   posts get <id>                  Post detail
#   posts delete <id>               Delete post
#   posts feature <id>              Feature post
#   posts unfeature <id>            Unfeature post
#   comments list [page] [size]     List comments
#   comments delete <id>            Delete comment
#   reports list [page] [size]      List reports
#   reports resolve <id>            Resolve report
#   reports dismiss <id>            Dismiss report
#   transactions [page] [size]      List transactions
#   analytics users [days]          User growth trend
#   analytics posts [days]          Post growth trend
#   stats                           Platform stats
# =============================================================================

set -euo pipefail

BASE_URL="${POLIS_BASE_URL:-http://localhost:8080}"
TOKEN_FILE="${HOME}/.polis_admin_token"
ADMIN_EMAIL="${POLIS_ADMIN_EMAIL:-admin@polis.app}"
ADMIN_PASSWORD="${POLIS_ADMIN_PASSWORD:?Error: POLIS_ADMIN_PASSWORD is required. Set it before running adminctl.}"
ADMIN_CODE="${POLIS_ADMIN_CODE:-polis2026}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

usage() {
    head -20 "$0" | grep -A 30 '^# Usage'
    exit 0
}

require_token() {
    if [ ! -f "$TOKEN_FILE" ]; then
        echo -e "${RED}Not logged in. Run: $0 login${NC}" >&2
        exit 1
    fi
    cat "$TOKEN_FILE"
}

api_get() {
    local path="$1"; shift
    curl -sf "${BASE_URL}${path}" -H "Authorization: Bearer $(require_token)" "$@"
}

api_post() {
    local path="$1"; shift
    curl -sf -X POST "${BASE_URL}${path}" -H "Authorization: Bearer $(require_token)" -H "Content-Type: application/json" "$@"
}

api_put() {
    local path="$1"; shift
    curl -sf -X PUT "${BASE_URL}${path}" -H "Authorization: Bearer $(require_token)" -H "Content-Type: application/json" "$@"
}

api_delete() {
    local path="$1"; shift
    curl -sf -X DELETE "${BASE_URL}${path}" -H "Authorization: Bearer $(require_token)" "$@"
}

cmd_login() {
    echo -e "${BLUE}Logging in to Polis Admin...${NC}"
    local resp
    resp=$(curl -sf -X POST "${BASE_URL}/api/admin/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"admin_code\":\"${ADMIN_CODE}\"}")
    
    local token user
    token=$(echo "$resp" | jq -r '.data.access_token')
    user=$(echo "$resp" | jq -r '.data.user.display_name')
    
    echo "$token" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    echo -e "${GREEN}Logged in as: ${BOLD}${user}${NC}"
    echo "Token saved to $TOKEN_FILE"
}

cmd_dashboard() {
    echo -e "${BLUE}Admin Dashboard${NC}"
    api_get "/api/admin/dashboard" | jq '.data'
}

cmd_stats() {
    echo -e "${BLUE}Platform Stats${NC}"
    api_get "/api/admin/stats" | jq '.data'
}

cmd_users() {
    local action="${1:-list}"; shift || true
    case "$action" in
        list)
            local page="${1:-1}"; local size="${2:-20}"
            api_get "/api/admin/users?page=${page}&page_size=${size}" | \
                jq -r '.data[] | [.username, .display_name, .email, .verified, .created_at[0:10]] | @tsv' | \
                column -t -s $'\t' -N "USER,DISPLAY,EMAIL,OK,CREATED" -o "  "
            ;;
        get)
            api_get "/api/admin/users/${1}" | jq '.data'
            ;;
        ban)
            local id="$1"; local reason="${2:-violation}"
            api_post "/api/admin/users/${id}/ban" -d "{\"reason\":\"${reason}\"}" | jq .
            echo -e "${GREEN}Banned user ${id}${NC}"
            ;;
        unban)
            api_post "/api/admin/users/${1}/unban" | jq .
            echo -e "${GREEN}Unbanned user ${1}${NC}"
            ;;
        *) echo "Usage: $0 users {list|get|ban|unban} ..." >&2; exit 1 ;;
    esac
}

cmd_spaces() {
    local action="${1:-list}"; shift || true
    case "$action" in
        list)
            local page="${1:-1}"; local size="${2:-20}"
            api_get "/api/admin/spaces?page=${page}&page_size=${size}" | \
                jq -r '.data[] | [.title, .namespace, .visibility, .status, .member_count, .post_count, .created_at[0:10]] | @tsv' | \
                column -t -s $'\t' -N "TITLE,NAMESPACE,VIS,STATUS,MEMBERS,POSTS,CREATED" -o "  "
            ;;
        get)
            api_get "/api/admin/spaces/${1}" | jq '.data'
            ;;
        status)
            api_put "/api/admin/spaces/${1}/status" -d "{\"status\":\"${2:-active}\"}" | jq .
            echo -e "${GREEN}Space status updated${NC}"
            ;;
        *) echo "Usage: $0 spaces {list|get|status} ..." >&2; exit 1 ;;
    esac
}

cmd_posts() {
    local action="${1:-list}"; shift || true
    case "$action" in
        list)
            local page="${1:-1}"; local size="${2:-20}"
            api_get "/api/admin/posts?page=${page}&page_size=${size}" | \
                jq -r '.data[] | [.id[0:8], .title[0:45], .module_type, .is_featured, .is_deleted, .view_count, .created_at[0:10]] | @tsv' | \
                column -t -s $'\t' -N "ID,TITLE,TYPE,STAR,DEL,VIEWS,CREATED" -o "  "
            ;;
        get)
            api_get "/api/admin/posts/${1}" | jq '.data | {id,title,author_username,space_title,body: (.body[:200] // ""),tags,view_count,like_count,comment_count}'
            ;;
        delete)
            echo -e "${RED}Delete post ${1}?${NC}"
            read -p "Confirm [y/N]: " -r
            [[ $REPLY =~ ^[Yy]$ ]] || exit 0
            api_delete "/api/admin/posts/${1}" | jq .
            echo -e "${GREEN}Post deleted${NC}"
            ;;
        feature)
            api_post "/api/admin/posts/${1}/feature" | jq .
            echo -e "${GREEN}Post featured${NC}"
            ;;
        unfeature)
            api_post "/api/admin/posts/${1}/unfeature" | jq .
            echo -e "${GREEN}Post unfeatured${NC}"
            ;;
        *) echo "Usage: $0 posts {list|get|delete|feature|unfeature} ..." >&2; exit 1 ;;
    esac
}

cmd_comments() {
    local action="${1:-list}"; shift || true
    case "$action" in
        list)
            local page="${1:-1}"; local size="${2:-20}"
            api_get "/api/admin/comments?page=${page}&page_size=${size}" | \
                jq -r '.data.items[] | [.id[0:8], .author_username, .body[0:50], .like_count, .created_at[0:10]] | @tsv' | \
                column -t -s $'\t' -N "ID,AUTHOR,CONTENT,LIKES,CREATED" -o "  "
            ;;
        delete)
            api_delete "/api/admin/comments/${1}" | jq .
            echo -e "${GREEN}Comment deleted${NC}"
            ;;
        *) echo "Usage: $0 comments {list|delete} ..." >&2; exit 1 ;;
    esac
}

cmd_reports() {
    local action="${1:-list}"; shift || true
    case "$action" in
        list)
            local page="${1:-1}"; local size="${2:-20}"
            api_get "/api/admin/reports?page=${page}&page_size=${size}" | \
                jq -r '.data.items[] | [.id[0:8], .reporter_username, .target_type, .reason[0:40], .status, .created_at[0:10]] | @tsv' | \
                column -t -s $'\t' -N "ID,REPORTER,TYPE,REASON,STATUS,CREATED" -o "  "
            ;;
        resolve)
            api_post "/api/admin/reports/${1}/resolve" -d '{"action":"resolve"}' | jq .
            echo -e "${GREEN}Report resolved${NC}"
            ;;
        dismiss)
            api_post "/api/admin/reports/${1}/resolve" -d '{"action":"dismiss"}' | jq .
            echo -e "${GREEN}Report dismissed${NC}"
            ;;
        *) echo "Usage: $0 reports {list|resolve|dismiss} ..." >&2; exit 1 ;;
    esac
}

cmd_transactions() {
    local page="${1:-1}"; local size="${2:-20}"
    api_get "/api/admin/transactions?page=${page}&page_size=${size}" | \
        jq -r '.data.items[] | [.id[0:8], (.from_username // "N/A"), (.to_username // .space_title // "N/A"), (.amount_cents/100), .tx_type, .status, .created_at[0:10]] | @tsv' | \
        column -t -s $'\t' -N "ID,FROM,TO,AMOUNT,TYPE,STATUS,DATE" -o "  "
}

cmd_analytics() {
    local type="${1:-users}"; local days="${2:-30}"
    case "$type" in
        users)
            api_get "/api/admin/analytics/users?days=${days}" | jq -r '.data[] | [.date, .count] | @tsv' | \
                column -t -s $'\t' -N "DATE,NEW_USERS" -o "  "
            ;;
        posts)
            api_get "/api/admin/analytics/posts?days=${days}" | jq -r '.data[] | [.date, .count] | @tsv' | \
                column -t -s $'\t' -N "DATE,NEW_POSTS" -o "  "
            ;;
        *) echo "Usage: $0 analytics {users|posts} [days]" >&2; exit 1 ;;
    esac
}

main() {
    local cmd="${1:-}"
    [ -z "$cmd" ] && { usage; exit 0; }
    
    case "$cmd" in
        help|--help|-h)   usage ;;
        login)             shift; cmd_login "$@" ;;
        dashboard|dash)    shift; cmd_dashboard "$@" ;;
        stats)             shift; cmd_stats "$@" ;;
        users)             shift; cmd_users "$@" ;;
        spaces)            shift; cmd_spaces "$@" ;;
        posts)             shift; cmd_posts "$@" ;;
        comments)          shift; cmd_comments "$@" ;;
        reports)           shift; cmd_reports "$@" ;;
        transactions|tx)   shift; cmd_transactions "$@" ;;
        analytics)         shift; cmd_analytics "$@" ;;
        *)
            echo -e "${RED}Unknown command: ${cmd}${NC}"
            echo "Run '$0 help' for usage"
            exit 1
            ;;
    esac
}

main "$@"
