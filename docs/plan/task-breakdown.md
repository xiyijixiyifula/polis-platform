# Task Breakdown — mzgw.com i18n

## 24 种目标语言

| # | Code | Language | 来源 |
|---|------|----------|------|
| 1 | zh | 中文 ✅ | 当前，主语言 |
| 2 | en | English ✅ | 必选 |
| 3 | hi | हिन्दी | 印度 #1 人口 |
| 4 | es | Español | 欧洲大国 + 墨西哥 |
| 5 | ar | العربية | 中东 + 埃及 |
| 6 | fr | Français | 欧洲大国 + 刚果 |
| 7 | pt | Português | 巴西 #7 人口 |
| 8 | ru | Русский | 中国周边 + 俄罗斯 |
| 9 | ja | 日本語 | 中国周边 + 日本 |
| 10 | de | Deutsch | 欧洲大国 + 德国 |
| 11 | id | Bahasa Indonesia | 印尼 #4 人口 |
| 12 | ur | اردو | 巴基斯坦 + 中国周边 |
| 13 | bn | বাংলা | 孟加拉国 #8 人口 |
| 14 | vi | Tiếng Việt | 越南 + 中国周边 |
| 15 | tr | Türkçe | 土耳其 #18 人口 |
| 16 | th | ไทย | 泰国 + 中国周边 |
| 17 | ko | 한국어 | 中国周边 |
| 18 | it | Italiano | 欧洲大国 |
| 19 | fa | فارسی | 伊朗 + 中东 |
| 20 | tl | Filipino | 菲律宾 #13 人口 |
| 21 | my | မြန်မာ | 中国周边 (缅甸) |
| 22 | am | አማርኛ | 埃塞俄比亚 #11 人口 |
| 23 | he | עברית | 中东 (以色列) |
| 24 | mn | Монгол | 中国周边 (蒙古) |

## Phase A: 基础设施 (P0)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| A1 | Install next-intl + configure next.config.js | S | — |
| A2 | Create i18n middleware (Cookie-based locale detection) | S | A1 |
| A3 | Create i18n/request.ts (locale resolver) | S | A1 |
| A4 | Create messages/zh.json — extract all Chinese UI strings (~500 keys) | XL | — |
| A5 | Create messages/en.json — translate all keys | L | A4 |
| A6 | Update root layout: NextIntlClientProvider + lang attr | S | A2,A3 |

## Phase B: 核心组件 (P0)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| B1 | Header: i18n + language switcher (globe icon + 24 lang dropdown) | M | A6 |
| B2 | ContentCard: i18n all labels, buttons, panels | L | A6 |
| B3 | PostCard: i18n stats, management buttons, share | M | A6 |
| B4 | Sidebar: i18n navigation items | S | A6 |
| B5 | SubmitDialog: i18n module selector, search, buttons | M | A6 |
| B6 | SpaceSettings: i18n module toggles | M | A6 |
| B7 | CreationCard: i18n actions | S | A6 |
| B8 | SpaceAnalytics: i18n labels | S | A6 |
| B9 | Other components (FeedItem, PollCard, SeriesCard, etc.) | L | A6 |

## Phase C: 公开页面 (P1)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| C1 | Homepage (/) — trending, feed, CTAs | M | B1,B2 |
| C2 | /hot, /trending, /explore | M | B1,B2 |
| C3 | /search | S | B1 |
| C4 | /login, /register, /forgot-password | M | A6 |
| C5 | /about, /privacy, /research | S | A6 |

## Phase D: 空间 + 内容页面 (P1)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| D1 | /space/[...namespace] — tabs, panels, member management | XL | B1,B2,B3 |
| D2 | /post/[id] — viewer, comments, related posts | L | B1,B2 |
| D3 | /video/[id], /series/[id], /polls/* | L | B1 |
| D4 | /post/new, /polls/new | M | B1,B5 |

## Phase E: 用户页面 (P1)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| E1 | /profile/[username] — tabs, followers, creations | L | B1 |
| E2 | /settings, /notifications, /messages/* | M | B1 |
| E3 | /saved, /drafts, /export | S | B1 |

## Phase F: 创作者中心 (P1)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| F1 | /creations/* — 创作管理、编辑、新建 | L | B1,B2,B5 |
| F2 | /create-center — 内容管理 | M | B1 |

## Phase G: 管理后台 (P2)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| G1 | /admin/* — 11 个管理页面 | XL | A6 |

## Phase H: 多语言生成 (P1)

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| H1 | Generate 22 locale JSON files (machine translation from en) | L | A5 |
| H2 | Verify generated translations don't break rendering | S | H1 |

## Phase I: 构建验证 + 部署

| ID | Task | Effort | Deps |
|:---|:-----|:-------|:-----|
| I1 | Build check — verify all routes compile | S | A-H |
| I2 | Create release + deploy to server | S | I1 |

## 依赖图

```
A1 → A2 → A3 → A4 → A5 → A6
                        ↓
              B1 → B2 → B3~B9
               ↓
         C1~C5  D1~D4  E1~E3  F1~F2
                                       G1
                         H1 (after A5)

Total: 26 tasks, estimated 3-4 rounds of execution
```

## 并行泳道

Round 1: [A1, A4] (parallel)
Round 2: [A2, A3, A5] (after A1/A4)
Round 3: [A6, B1~B9] (after A2/A3/A5/A6)
Round 4: [C1~C5, D1~D4, E1~E3, F1~F2] (after B)
Round 5: [G1, H1] (parallel)
Round 6: [I1, I2]
