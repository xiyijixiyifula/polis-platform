# Project Overview — mzgw.com i18n

## Tech Stack

| Layer | Technology | Version |
|:------|:-----------|:--------|
| Framework | Next.js (App Router) | 14.2.35 |
| UI | React | 18.3 |
| Build | Standalone output | next.config.js |
| Styling | Tailwind CSS | 3.x |
| Icons | lucide-react | latest |
| Editor | cherry-markdown | latest |

## Project Scale

| Metric | Count |
|:-------|:------|
| Source files (.tsx/.ts) | 83 |
| Routes (pages) | 51 |
| Components | 29 |
| Lines with Chinese text | 3,213 |
| Unique Chinese UI strings | ~500+ (estimated) |

## Current State

- **No i18n framework** installed
- **All 83 files** contain hardcoded Chinese UI strings
- Root layout: `<html lang="zh-CN">` hardcoded
- Metadata (title, description, OG) all in Chinese
- `'use client'` directive used extensively — most components are client-side

## Target

- 24 languages (Chinese + English + top 20 populous countries + neighbors + Middle East + EU majors)
- Manual language switcher in UI
- Browser/IP-based auto-detection as initial language hint
- User content (post title/body) NOT translated — only UI framework text
