# Risk Assessment — mzgw.com i18n

## Summary

| Risk | Level | Mitigation |
|:-----|:------|:-----------|
| 83 files × 24 locales = massive JSON | High | Auto-generate non-en/zh translations |
| Build time increase | Medium | Lazy-load non-active locales |
| SEO metadata per locale | Medium | generateMetadata per page |
| RTL languages (Arabic, Hebrew, Urdu, Persian) | High | Tailwind RTL + CSS logical properties |
| Current `'use client'` prevents full RSC i18n | Low | Acceptable — next-intl works in both |
| Translation quality for non-en/zh | Medium | Machine translate initially, crowd-source later |
| Maintenance burden (24 JSON files to update) | Medium | Single source keys; translation workflow TBD |

## S.U.P.E.R Health Check

| Principle | Score | Notes |
|:----------|:------|:------|
| S | ⚠️ Yellow | Messages JSON = single purpose, but mixed UI vs. data text |
| U | ✅ Green | Translations flow one-way: key → locale → render |
| P | ✅ Green | Contract = JSON key schema across all locales |
| E | ✅ Green | Locale from cookie/header/config, no hardcode |
| R | ⚠️ Yellow | Swapping translation source requires key migration |

## Critical Concerns

1. **RTL Support** — 4 languages (ar, he, ur, fa) need right-to-left layout. This affects CSS in dozens of components.
2. **Module Labels** — The newly unified `module-config.ts` (v0.4.1) is a good foundation for i18n since labels are already centralized.
3. **Volume** — 3,213 lines of Chinese text. Manual translation to 24 languages is infeasible — need automation.
