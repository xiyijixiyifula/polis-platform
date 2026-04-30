# Polis Design System Test Criteria

Detailed UI/UX testing criteria based on the Polis Design System. Use this reference when conducting visual regression and design compliance testing.

## Color Token Verification

### Primary Palette (Purple)

| Token | Hex Value | Usage | Test Method |
|-------|-----------|-------|-------------|
| `--color-primary-500` | `#8b5cf6` | Primary button bg, active tabs, links | Screenshot + color picker |
| `--color-primary-600` | `#7c3aed` | Primary button hover, focus rings | Hover state screenshot |
| `--color-primary-100` | `#ede9fe` | Badge bg (root community), hover bg | Inspect element |
| `--color-primary-400` | `#a78bfa` | Secondary accents | Dark mode text |

### Neutral Palette (Gray)

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--color-gray-50` | `#f9fafb` | Light page bg alternate |
| `--color-gray-100` | `#f3f4f6` | Secondary button bg (light) |
| `--color-gray-200` | `#e5e7eb` | Card borders (light), divider lines |
| `--color-gray-400` | `#9ca3af` | Placeholder text |
| `--color-gray-500` | `#6b7280` | Secondary text, metadata |
| `--color-gray-600` | `#4b5563` | Body text |
| `--color-gray-800` | `#1f2937` | Strong text, headings (light mode) |
| `--color-gray-900` | `#111827` | Primary text (light mode) |

### Semantic Colors

| Type | Background | Text/Border | Usage |
|------|------------|-------------|-------|
| Error/Urgent | `#fef2f2` | `#dc2626` / `#991b1b` | Error messages, urgent banners, delete actions |
| Warning/Important | `#fffbeb` | `#d97706` / `#b45309` | Warning banners, rank #1 badge |
| Success | `#f0fdf4` | `#22c55e` / `#15803d` | Success states, online indicator, current version badge |
| Info | `#dbeafe` | `#2563eb` | Info badges, verified marks |

### Dark Mode Mapping

| Light Mode | Dark Mode | Element |
|------------|-----------|---------|
| `bg-white` | `dark:bg-gray-900` | Page background |
| `bg-white` | `dark:bg-gray-800` | Card background |
| `bg-gray-50` | `dark:bg-gray-800` | Input backgrounds |
| `bg-gray-100` | `dark:bg-gray-700` | Secondary button, hover states |
| `border-gray-200` | `dark:border-gray-700` | Card/input borders |
| `text-gray-900` | `dark:text-white` | Primary text |
| `text-gray-600` | `dark:text-gray-400` | Secondary text |
| `text-primary-600` | `dark:text-primary-400` | Primary colored text |
| `bg-primary-100` | `dark:bg-primary-900/30` | Primary subtle backgrounds |

**Dark Mode Test Checklist**:
- [ ] Page background: `dark:bg-gray-900` applied
- [ ] Card backgrounds: `dark:bg-gray-800` applied
- [ ] Input fields: `dark:bg-gray-800` with `dark:border-gray-600`
- [ ] Primary text: `dark:text-white`
- [ ] Secondary text: `dark:text-gray-400`
- [ ] Borders: `dark:border-gray-700`
- [ ] Hover states: `dark:hover:bg-gray-700`
- [ ] Primary button: remains `bg-primary-600` (consistent in both modes)
- [ ] Theme toggle icon: Moon in light mode, Sun in dark mode

## Typography Verification

### Font Stack
- **Primary**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Monospace**: `ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace`

### Type Scale (rem/px)

| Token | Size | Usage | Line Height |
|-------|------|-------|-------------|
| `text-xs` | 0.75rem / 12px | Labels, badges, metadata | tight |
| `text-sm` | 0.875rem / 14px | Body text, links, descriptions | normal |
| `text-base` | 1rem / 16px | Default body | normal |
| `text-lg` | 1.125rem / 18px | Subheadings, emphasized text | normal |
| `text-xl` | 1.25rem / 20px | Section titles | normal |
| `text-2xl` | 1.5rem / 24px | Page titles (h1) | tight |
| `text-3xl` | 1.875rem / 30px | Hero headings | tight |

### Font Weight

| Weight | Value | Usage |
|--------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Interactive elements, labels, buttons |
| `font-semibold` | 600 | Card titles, section headers |
| `font-bold` | 700 | Page titles, hero headings, emphasis |

## Spacing & Layout Verification

### Container
- `max-w-7xl` (1280px max width)
- `mx-auto` (centered)
- `px-4` (responsive side padding)

### Card Spacing
- Default padding: `p-4` or `px-4 py-3`
- Section gaps: `space-y-4` (vertical), `gap-4` (grids)
- Layout sections: `gap-6`

### Page Padding
- Top-level pages: `py-6` or `py-8`

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 8px | Buttons, inputs, badges |
| `rounded-xl` | 12px | Cards, dropdowns |
| `rounded-2xl` | 16px | Hero avatars |
| `rounded-full` | 9999px | Pills, user avatars, search input, toggle buttons |

## Component Specification Tests

### Button System

#### Primary Button
```
background: bg-primary-600
hover: hover:bg-primary-700
text: text-white
padding: px-5 py-2 (default) / px-3 py-1.5 (small) / px-6 py-2.5 (large)
border-radius: rounded-lg
font: font-medium text-sm
transition: transition-colors
```

**States to Verify**:
1. Default: `bg-primary-600 text-white`
2. Hover: `hover:bg-primary-700` (darker purple)
3. Focus: `focus:ring-2 focus:ring-primary-100`
4. Disabled: `opacity-50 cursor-not-allowed` (if applicable)
5. Loading: Spinner inside button, text hidden

#### Secondary Button
```
background: bg-gray-100 (light) / dark:bg-gray-700 (dark)
hover: hover:bg-gray-200 / dark:hover:bg-gray-600
text: text-gray-700 / dark:text-gray-300
padding: same as primary
border-radius: rounded-lg
```

#### Ghost/Icon Button
```
background: transparent
hover: hover:bg-gray-100 / dark:hover:bg-gray-700
text: text-gray-500 / dark:text-gray-400
padding: p-2
border-radius: rounded-full
```

### Card Component

#### Base Card
```
background: bg-white (light) / dark:bg-gray-800 (dark)
border: border border-gray-200 / dark:border-gray-700
border-radius: rounded-xl
padding: p-4
shadow: none (default)
```

#### Interactive Card (clickable)
```
cursor: cursor-pointer
group: group
hover: hover:shadow-md hover:border-gray-300 / dark:hover:border-gray-600
transition: transition-all
```

### Input Field

#### Text Input
```
width: w-full
background: bg-white / dark:bg-gray-800
border: border border-gray-300 / dark:border-gray-600
border-radius: rounded-lg
padding: px-3 py-2
text: text-sm text-gray-900 / dark:text-white
placeholder: placeholder-gray-400 / dark:placeholder-gray-500
focus: focus:border-primary-500 focus:ring-2 focus:ring-primary-100
```

#### Search Input (Hero/Header)
```
border: border-gray-200 / dark:border-gray-600
border-radius: rounded-full
background: bg-gray-50 / dark:bg-gray-800
padding: py-2 pl-10 pr-4
icon: absolute left-3 top-1/2 -translate-y-1/2 text-gray-400
```

### Badge System

| Badge Type | Light Mode | Dark Mode | Usage |
|------------|------------|-----------|-------|
| Root Community | `bg-primary-100 text-primary-700` | `dark:bg-primary-900/30 dark:text-primary-400` | "根社区" tag |
| Current Version | `bg-green-100 text-green-700` | `dark:bg-green-900/30 dark:text-green-400` | "当前版本" on changelog |
| Verified | text-blue-600 | `dark:text-blue-400 font-medium` | Verified user/space |
| Urgent Banner | `bg-red-50 border-red-200 text-red-800` | Adapted red tints | Emergency announcements |
| Important Banner | `bg-amber-50 border-amber-200 text-amber-800` | Adapted amber tints | Important announcements |

### Avatar/Icon Container

#### User Avatar (Small)
```
size: h-8 w-8 / h-10 w-10
border-radius: rounded-full
background: bg-gradient-to-br from-primary-400 to-primary-600
text: text-white font-bold (initials)
```

#### Community Icon
```
size: h-12 w-12 / h-16 w-16
border-radius: rounded-xl / rounded-2xl
background: bg-gradient-to-br from-primary-500 to-primary-700
text: text-white font-bold text-lg / text-2xl
```

### Tab Navigation

```
container:
  border-bottom: border-b border-gray-200
  gap: gap-0.5

tab-button:
  padding: px-4 py-3
  font: text-sm font-medium
  border-bottom: border-b-2
  transition: transition-colors
  
  active: border-primary-600 text-primary-600
  inactive: border-transparent text-gray-500 hover:text-gray-700
```

### Rank Badge (Trending)

```
#1: bg-amber-500 text-white
#2: bg-gray-400 text-white
#3: bg-amber-700 text-white
#4+: text-gray-300 / dark:text-gray-600 (muted)
size: h-8 w-8 rounded-full flex items-center justify-center
font: text-sm font-bold
```

## Shadow System

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle card elevation on white bg |
| `shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Hover state (cards, buttons) |
| `shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Dropdowns, modals |

## Animation & Motion

### Transition Timing
```
Colors: transition-colors (default)
All properties: transition-all (cards with shadow, scale)
Duration: 150ms (fast, instant-feel), 300ms (modals)
```

### Hover Effects
```
Cards: hover:shadow-md hover:border-gray-300
group-hover: group-hover:scale-105 (icon containers)
```

### Loading States
```
Skeleton: animate-pulse
Spinner: h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin
```

## Responsive Breakpoint Tests

| Breakpoint | Width | Expected Changes |
|------------|-------|-------------------|
| `sm` | 640px | 2-column grids appear, inline buttons |
| `md` | 768px | Desktop nav visible, search bar expands |
| `lg` | 1024px | 3-column grids, sidebar becomes visible |
| `xl` | 1280px | Full sidebar + content layout |
| `2xl` | 1536px | Extra wide content area |

### Mobile (< 640px) Checklist
- [ ] Single column layout for all grids
- [ ] Header: hamburger menu or simplified nav
- [ ] Community grid: 1 column, cards stack
- [ ] Post cards: full width
- [ ] Sidebar: hidden or bottom sheet
- [ ] Search: collapsible or icon-only
- [ ] Font sizes remain readable (min 14px body)
- [ ] Touch targets min 44px height

## Iconography Standards

- **Library**: lucide-react
- **Sizes**: `h-4 w-4` (inline), `h-5 w-5` (standalone), `h-6 w-6` (hero/title)
- **Color**: Inherits from parent text color (`currentColor`)

### Common Icons to Verify

| Context | Expected Icon | lucide Name |
|---------|---------------|-------------|
| Navigation - Home | Home | `Home` |
| Navigation - Explore | Compass | `Compass` |
| Navigation - Trending | TrendingUp | `TrendingUp` |
| Navigation - Hot | Flame | `Flame` |
| Action - Create | Plus | `Plus` |
| Action - Write | PenLine | `PenLine` |
| Action - Search | Search | `Search` |
| Action - Share | Share2 | `Share2` |
| Action - Bell | Bell | `Bell` |
| Content - Comment | MessageCircle | `MessageCircle` |
| Content - Post | FileText | `FileText` |
| Social - Heart | Heart | `Heart` |
| Social - Bookmark | Bookmark | `Bookmark` |
| Status - Megaphone | Megaphone | `Megaphone` |
| Status - Chart | BarChart3 | `BarChart3` |
| Feedback - Check | Check | `Check` |
| Feedback - Alert | AlertTriangle | `AlertTriangle` |

## Empty State Pattern

```
Container: card py-12 text-center
Icon: h-10 w-10 mx-auto mb-3 opacity-30 (lucide icon)
Title: text-gray-900 dark:text-white (if explicit) / text-gray-400 (default)
Subtitle: text-sm mt-1 text-gray-500 dark:text-gray-400
```

## Common Pages Layout Check

### Homepage (`/`)
- [ ] Hero section centered, max-width container
- [ ] CTA buttons: primary (purple) + secondary (white/gray outline)
- [ ] Feature cards: 3-column grid on desktop, 1-column on mobile
- [ ] Footer text centered, gray-500

### Space Overview (`/space/{ns}`)
- [ ] Header card with icon, name, namespace, stats
- [ ] Tab bar with active indicator
- [ ] Main content: about card + featured + latest posts
- [ ] Right sidebar: about community metadata + cluster info (if applicable)
- [ ] Responsive: sidebar hidden on mobile, stacks below content

### Post Detail (`/post/{id}`)
- [ ] Content area max-width readable (prose or max-w-3xl)
- [ ] Author info bar: avatar + name + timestamp
- [ ] Vote buttons: left side or below title
- [ ] Comments: indented threading, reply buttons
- [ ] Related posts: bottom section, card grid

### Profile (`/profile/{username}`)
- [ ] Header: large avatar, name, username, join date
- [ ] Stats: follower/following as clickable buttons
- [ ] Communities: grid of SpaceCards
- [ ] Empty states for no communities/no activity
