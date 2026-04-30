# Polis Design System

## Design Philosophy

Polis is a community platform where "人人都是城主" (everyone is a city lord). The design reflects this with:
- **Warmth + Authority**: Purple primary with warm gradients conveys both creativity and trust
- **Clean + Structured**: Card-based layouts with clear hierarchy for community content
- **Developer-Friendly**: Dark mode support, monospace accents, and code-friendly typography
- **Accessible**: High contrast ratios, clear interactive states, keyboard navigable

---

## Design Tokens

### Color System

```
// Primary Palette — Purple/Indigo (Creativity + Trust)
--color-primary-50:  #f5f3ff    // Lightest purple bg
--color-primary-100: #ede9fe    // Hover state bg
--color-primary-200: #ddd6fe    // Borders
--color-primary-300: #c4b5fd    // Focus rings
--color-primary-400: #a78bfa    // Secondary accents
--color-primary-500: #8b5cf6    // Primary base
--color-primary-600: #7c3aed    // Primary hover / active
--color-primary-700: #6d28d9    // Text on light bg
--color-primary-800: #5b21b6    // Deep accent
--color-primary-900: #4c1d95    // Darkest purple bg

// Neutral Palette — Gray (Structure)
--color-gray-50:  #f9fafb
--color-gray-100: #f3f4f6
--color-gray-200: #e5e7eb
--color-gray-300: #d1d5db
--color-gray-400: #9ca3af    // Placeholder text
--color-gray-500: #6b7280    // Secondary text
--color-gray-600: #4b5563    // Body text
--color-gray-700: #374151    // Headings light
--color-gray-800: #1f2937    // Strong text
--color-gray-900: #111827    // Primary text light

// Semantic Colors
--color-red-50:  #fef2f2     // Error bg / urgent banner
--color-red-100: #fee2e2
--color-red-500: #ef4444     // Error / delete / badge dot
--color-red-600: #dc2626     // Error hover
--color-red-800: #991b1b     // Error text
--color-amber-50:  #fffbeb   // Warning bg / important banner
--color-amber-500: #f59e0b   // Warning / rank #1
--color-amber-600: #d97706   // Warning text
--color-amber-700: #b45309   // Rank #3
--color-green-50:  #f0fdf4   // Success bg
--color-green-100: #dcfce7   // Success badge bg
--color-green-400: #4ade80   // Success dot
--color-green-500: #22c55e   // Success / online
--color-green-700: #15803d   // Success text
--color-blue-100:  #dbeafe   // Info badge bg
--color-blue-400: #60a5fa    // Info dot
--color-blue-600: #2563eb    // Verified badge

// Dark Mode Overrides (via Tailwind dark:)
// Backgrounds invert: gray-900 → body, gray-800 → card, gray-700 → hover
// Text inverts: gray-100 → primary text, gray-400 → secondary text
// Primary adjusts: purple-400 for text, purple-900/30 for subtle bg
```

### Typography

```
Font Stack:
  Primary: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
  Monospace: ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace

Scale:
  text-xs:    0.75rem (12px)  — Labels, badges, metadata
  text-sm:    0.875rem (14px) — Body text, links, descriptions
  text-base:  1rem (16px)     — Default body
  text-lg:    1.125rem (18px) — Subheadings, emphasized text
  text-xl:    1.25rem (20px)  — Section titles
  text-2xl:   1.5rem (24px)   — Page titles (h1)
  text-3xl:   1.875rem (30px) — Hero headings

Weights:
  font-normal:  400 — Body text
  font-medium:  500 — Interactive elements, labels
  font-semibold: 600 — Card titles, section headers
  font-bold:     700 — Page titles, emphasis
```

### Spacing & Layout

```
Container: max-w-7xl mx-auto px-4 (1280px max, responsive padding)
Card padding: p-4 or px-4 py-3 (comfortable reading density)
Section gap: space-y-4 (cards), gap-4 (grids), gap-6 (layout sections)
Page padding: py-6 or py-8 (top-level pages)

Border Radius:
  rounded-lg    — Buttons, inputs, badges (8px)
  rounded-xl    — Cards, dropdowns (12px)
  rounded-2xl   — Hero avatars (16px)
  rounded-full  — Pills, user avatars, search input, toggle buttons

Shadows (Tailwind):
  shadow-sm  — Subtle elevation (cards on white bg)
  shadow-md  — Hover state (cards, buttons)
  shadow-lg  — Dropdowns, modals
```

---

## Component Patterns

### Button System

```
Primary Button (.btn-primary):
  background: bg-primary-600
  hover: hover:bg-primary-700
  text: text-white
  padding: px-5 py-2 (default), px-3 py-1.5 (small), px-6 py-2.5 (large)
  rounded: rounded-lg
  font: font-medium text-sm
  transition: transition-colors

Secondary Button (.btn-secondary):
  background: bg-gray-100 (light) / dark:bg-gray-700 (dark)
  hover: hover:bg-gray-200 / dark:hover:bg-gray-600
  text: text-gray-700 / dark:text-gray-300
  Same padding and rounding as primary

Ghost/Icon Button:
  background: transparent
  hover: hover:bg-gray-100 / dark:hover:bg-gray-700
  text: text-gray-500 / dark:text-gray-400
  padding: p-2
  rounded: rounded-full
```

### Card Component (.card)

```
Base Card:
  background: bg-white (light) / dark:bg-gray-800
  border: border border-gray-200 / dark:border-gray-700
  rounded: rounded-xl
  padding: p-4 (default content)
  shadow: none (default), hover:shadow-md (interactive)

Interactive Card (links):
  group cursor-pointer
  hover:shadow-md hover:border-gray-300 / dark:hover:border-gray-600
  transition-all

Animated Card (skeleton/loading):
  animate-pulse
  bg-gray-200 / dark:bg-gray-700 placeholder shapes
```

### Input Field (.input-field)

```
Input:
  width: w-full
  background: bg-white / dark:bg-gray-800
  border: border border-gray-300 / dark:border-gray-600
  rounded: rounded-lg
  padding: px-3 py-2
  text: text-sm text-gray-900 / dark:text-white
  placeholder: placeholder-gray-400 / dark:placeholder-gray-500
  focus: focus:border-primary-500 focus:ring-2 focus:ring-primary-100
  transition: transition-colors

Textarea:
  Same as input + resize-none rows={3-6}

Search Input (Hero/Prominent):
  border: border-gray-200 / dark:border-gray-600
  rounded: rounded-full
  background: bg-gray-50 / dark:bg-gray-800
  padding: py-2 pl-10 pr-4
  icon: absolute left-3 top-1/2 -translate-y-1/2 text-gray-400
```

### Badge System

```
Status Badge:
  padding: px-2 py-0.5 | px-1.5 py-0.5 (small)
  rounded: rounded | rounded-full
  font: text-xs font-medium

  Root Community: bg-primary-100 text-primary-700 / dark:bg-primary-900/30 dark:text-primary-400
  Current Version: bg-green-100 text-green-700 / dark:bg-green-900/30 dark:text-green-400
  Verified: text-blue-600 / dark:text-blue-400 font-medium
  Urgent: bg-red-50 border-red-200 / text-red-800
  Important: bg-amber-50 border-amber-200 / text-amber-800
```

### Tab Navigation

```
Tab Container:
  border-bottom: border-b border-gray-200
  gap: gap-0.5

Tab Button:
  padding: px-4 py-3
  font: text-sm font-medium
  border-bottom: border-b-2
  transition: transition-colors

  Active: border-primary-600 text-primary-600
  Inactive: border-transparent text-gray-500 hover:text-gray-700
```

### Avatar / Icon Container

```
User Avatar (small):
  height/width: h-8 w-8 / h-10 w-10
  rounded: rounded-full
  background: bg-gradient-to-br from-primary-400 to-primary-600
  text: text-white font-bold (initials)

Community Icon:
  height/width: h-12 w-12 / h-16 w-16
  rounded: rounded-xl / rounded-2xl
  background: bg-gradient-to-br from-primary-500 to-primary-700 (default) / to-purple-600 (hero)
  text: text-white font-bold text-lg/text-2xl
```

### Announcement Banner

```
Urgent (urgent):
  background: bg-red-50 border-red-200
  icon: text-red-500
  title: text-red-800
  body: text-red-600

Important (important):
  background: bg-amber-50 border-amber-200
  icon: text-amber-500
  title: text-amber-800
  body: text-amber-600

Normal (normal):
  card + text-sm font-medium
  icon: Megaphone h-3 w-3
```

### Rank Badge (Trending/Hot)

```
Position indicators (numeric):
  #1: bg-amber-500 text-white
  #2: bg-gray-400 text-white
  #3: bg-amber-700 text-white
  #4+: text-gray-300 / dark:text-gray-600 (muted)
  Size: h-8 w-8 rounded-full flex items-center justify-center
  Font: text-sm font-bold
```

---

## Layout Patterns

### Page Layout (with Sidebar)

```
Container:
  max-w-7xl mx-auto px-4 py-6

Main Content:
  flex-1 max-w-3xl (on pages with sidebar)

Sidebar:
  w-72 shrink-0 hidden xl:block
  sticky top-20
  space-y-4 (card within sidebar)
```

### Grid Layouts

```
Community Grid:  grid gap-4 sm:grid-cols-2 lg:grid-cols-3
Post List:       space-y-3 (single column, stacked cards)
Featured Top 3:  grid gap-4 sm:grid-cols-2 lg:grid-cols-3
User Content:    grid gap-3 sm:grid-cols-2
```

### Header / Navigation

```
Sticky Header:
  sticky top-0 z-50
  border-b border-gray-200 / dark:border-gray-700
  background: bg-white/95 dark:bg-gray-900/95 backdrop-blur
  height: h-14
  padding: px-4

Nav Links (Desktop):
  padding: px-3 py-2
  font: text-sm
  color: text-gray-600 hover:text-gray-900
  rounded: rounded-lg
  hover background: hover:bg-gray-100

Nav Links (Dark):
  color: dark:text-gray-400 dark:hover:text-gray-200
  hover background: dark:hover:bg-gray-700

Mobile Nav:
  border-t border-gray-200
  full-width: px-4 py-3
  stacked links: space-y-1 or flex flex-col gap-1
```

### Empty State

```
Container:
  card py-12 text-center

Icon:
  h-10 w-10 mx-auto mb-3 opacity-30 (lucide icon)

Title:
  text-gray-900 dark:text-white (when needed)
  text-gray-400 (default empty)

Subtitle:
  text-sm mt-1 text-gray-500 dark:text-gray-400
```

### Loading State

```
Skeleton:
  card animate-pulse
  bg-gray-200 / dark:bg-gray-700 placeholder bars
  h-5 w-2/3 (title), h-4 w-full (body), h-20 w-20 rounded-full (avatar)

Spinner:
  h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin
  Used inside buttons during async actions
```

---

## Iconography

```
Icon Library: lucide-react (https://lucide.dev)
Size: h-4 w-4 (inline), h-5 w-5 (standalone), h-6 w-6 (hero/title)
Color: inherit from parent text color

Common icons:
  Navigation: Home, Compass, TrendingUp, Flame
  Actions: Plus, PenLine, Search, Share2, Bell, User
  Content: MessageCircle, FileText, Heart, Bookmark
  Social: Users, UserPlus, UserCheck, Calendar
  Status: Megaphone, BarChart3, Sparkles, ArrowRight
  Feedback: Check, X, AlertTriangle
```

---

## Responsive Breakpoints

```
sm:  640px   — 2-column grids, inline buttons
md:  768px   — Desktop nav visible, search bar
lg:  1024px  — 3-column grids, sidebar visible
xl:  1280px  — Full sidebar + content layout
2xl: 1536px  — Extra wide content
```

---

## Motion & Interaction

```
Transitions:
  Colors: transition-colors (default)
  All: transition-all (cards with shadow, scale)
  Duration: 150ms (fast, instant-feel), 300ms (modals)

Hover Effects:
  Cards: hover:shadow-md hover:border-gray-300
  Buttons: hover:bg-{color}-700 (primary), hover:bg-gray-200 (secondary)
  Links: hover:text-primary-600 (group-hover on cards)
  Scale: group-hover:scale-105 (icon containers)

Focus:
  outline-none focus:ring-2 focus:ring-primary-100 (inputs)
  focus-visible:ring-2 (keyboard navigation)
```

---

## Dark Mode Implementation

```
Strategy: Tailwind dark: variant + CSS custom properties

Root Variables (via :root / Tailwind config):
  --bg-primary: color values
  --text-primary: color values

Classes always used:
  Backgrounds: bg-white dark:bg-gray-900 (page), dark:bg-gray-800 (card)
  Text: text-gray-900 dark:text-white, text-gray-600 dark:text-gray-400
  Borders: border-gray-200 dark:border-gray-700
  Inputs: bg-gray-50 dark:bg-gray-800
  Hover: hover:bg-gray-100 dark:hover:bg-gray-700

Primary colors in dark:
  Text: dark:text-primary-400 (instead of primary-600)
  Backgrounds: dark:bg-primary-900/30 (instead of primary-100)

Theme toggle:
  Moon icon → dark mode, Sun icon → light mode
  Preference saved to localStorage key: 'polis-theme'
```
