# Project LOOP — Calm UI/UX & Frontend Experience Specification

## 1. Purpose

This replaces File 05 with the same intent — a professional SaaS interface
that makes the path from feedback → AI analysis → insight → action obvious
— but leans deliberately toward **calm and minimal**, not dense or
decorative. Where the original file left visual decisions open, this file
closes them with concrete, low-effort defaults so the UI stays simple to
build and simple to look at.

Dependencies remain the same as before: Files 01–04 are authoritative for
product, architecture, schema, and API behavior. This file only defines how
that behavior is presented.

---

## 2. Design Philosophy

- Quiet interface, loud data. The UI should get out of the way of the
  feedback and the numbers.
- One accent color, used sparingly, for primary actions and key signals only.
- No dashboards trying to show everything at once. Fewer, clearer widgets.
- No animation beyond simple fades/transitions. Nothing bounces, slides in
  dramatically, or draws attention to itself.
- When in doubt, remove an element rather than add one.

---

## 3. Design Tokens

Keep this as a single source of truth (e.g. Tailwind config / CSS variables)
so nothing is improvised page-by-page.

### Color

```text
--background:      neutral-50   (off-white, not pure white)
--surface:          white
--border:            neutral-200
--text-primary:      neutral-900
--text-secondary:    neutral-500
--accent:            one muted brand color (e.g. indigo-600)
--accent-soft:       accent at low opacity, for backgrounds/badges

--positive:          green-600
--negative:          red-600
--neutral-sentiment: neutral-400
--warning:           amber-600
```

Sentiment colors are used only on small indicators (dots, badges, chart
segments) — never as full-page backgrounds.

### Typography

```text
Font: one system/sans font, no more than 2 weights (regular, semibold)

H1  24px semibold   — page titles only
H2  18px semibold   — section headers
Body 14px regular   — default text
Small 12px regular  — metadata, timestamps, captions
```

### Spacing & Shape

```text
Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
Radius: 8px for cards/inputs, 6px for badges/buttons
Shadow: one subtle shadow token, used only on cards and dialogs
Border: 1px solid var(--border) — preferred over shadow for separation
```

Using a fixed scale like this means no page invents its own spacing, which
is what usually makes a UI feel inconsistent or "busy" even when no single
screen is wrong.

---

## 4. Application Shell

Left sidebar (desktop), collapsible drawer (mobile):

```text
Dashboard
Feedback
Themes
Ask LOOP
Reports
Settings
```

Top bar: workspace name, user menu (profile/logout). No secondary toolbar,
no breadcrumbs — the sidebar is the only navigation surface needed for an
app this size.

---

## 5. Page Specs

Each page below lists: **layout**, **data source**, and **required states**
(loading / empty / error / permission-denied, plus AI states where relevant).
States are not optional polish — they're listed because File 04's error
envelope and File 06's checklist both depend on them existing.

### 5.1 Dashboard

Layout: 4 small KPI cards in a row (Total feedback, % positive, % negative,
Actionable count), one volume-over-time line chart, one sentiment
breakdown chart, a short "Top themes" list, a short "Recent feedback" list.

Source: `GET /api/analytics/summary`.

States: skeleton cards while loading; "No feedback yet" empty state with a
link to import/create; generic error card with retry if the summary call
fails.

### 5.2 Feedback Inbox

Layout: single filter bar (search + 3 dropdown filters: sentiment, status,
feature area), a plain table/list below it, pagination footer.

Source: `GET /api/feedback` (server-side filtered/paginated).

States: skeleton rows while loading; "No results" when filters return
nothing (with a "clear filters" action); disabled create/import buttons
for VIEWER role rather than hidden ones with a tooltip explaining why.

### 5.3 Feedback Detail

Layout: feedback text at the top, metadata row (source, date, status)
underneath, sentiment + themes as small badges, a status-change control
for ADMIN/ANALYST.

Source: `GET /api/feedback/:id`.

States: if classification is still pending, show a plain "Analyzing…"
badge, not a spinner over the whole page — the original feedback must stay
fully visible and readable at all times. If classification failed, show a
small inline "Retry analysis" action instead of an error banner.

### 5.4 Themes

Layout: simple grid or list of theme cards — name, feedback count, small
sentiment bar. Clicking a theme opens its filtered feedback list (reuses
the Inbox component with a fixed filter).

Source: `GET /api/themes`.

### 5.5 Ask LOOP

Layout: single centered input at the top ("Ask a question about your
feedback…"), 2–3 suggested-question chips beneath it, answer appears below
as a plain text block with a small "Sources" section listing citation
snippets.

Source: `POST /api/ask`.

States: loading state is a short text placeholder ("Reading feedback…"),
not a spinner overlay; `insufficient_evidence` renders as a plain
explanatory sentence, not an error; failed requests get one retry button.

### 5.6 Reports

Layout: report list (title, period, created date) → detail view with a
clearly separated "Stats" block (numbers, computed by the app) above a
"Summary" block (Claude's narrative), visually distinguished by a label,
not by heavy styling — e.g. a small "AI-generated" tag next to the
narrative heading is enough.

Source: `GET /api/reports`, `GET /api/reports/:id`, `POST /api/reports`.

### 5.7 Settings / Workspace

Layout: workspace name, and (ADMIN only) a simple user list with role
badges and an invite/edit action.

Source: `GET /api/workspace`, `GET/POST/PATCH/DELETE /api/workspace/users`.

---

## 6. Component Library (minimum set)

Only build what's actually used above — resist adding variants "for
later":

```text
Button (primary, secondary, ghost, destructive)
Input, Select, SearchInput
Badge (sentiment, status, role)
Card
Table / List row
Pagination
Skeleton (row + card variants)
EmptyState (icon optional, title, one-line description, optional action)
ErrorState (message + retry button)
Dialog (confirmations only — deletes, destructive actions)
```

That's the full set. If a screen seems to need something not on this list,
that's a signal to simplify the screen rather than grow the component set.

---

## 7. Motion

```text
Duration: 120–180ms for all transitions
Easing: ease-out
Use for: hover states, dialog open/close, tab/filter switches
Never use for: page load, data arriving, chart rendering
```

No skeleton-to-content "reveal" animations, no staggered list animations,
no page-transition effects. Content simply appears when ready.

---

## 8. Responsive Behavior

```text
Mobile   (<640px):  single column, drawer nav, cards instead of tables
Tablet   (640–1024px): two-column where it fits, sidebar collapses to icons
Desktop  (>1024px): full sidebar, table layouts, side-by-side charts
```

Feedback Inbox on mobile becomes a stacked card list (same data, no
horizontal scroll needed) rather than a shrunk table.

---

## 9. Accessibility (unchanged from File 05, kept as a hard requirement)

- Semantic HTML, real form labels, visible focus states
- Keyboard-operable nav, filters, and dialogs
- Sentiment never communicated by color alone — pair with a label/icon
- Sufficient text contrast against the neutral-50 background

---

## 10. What to Deliberately Avoid

This section exists because the default direction for "professional SaaS"
specs tends to drift toward more — more charts, more color, more motion.
For this project, prefer less:

- No dense multi-chart dashboards — 2 charts + KPI cards is enough
- No color-coded everything — reserve color for sentiment and primary actions
- No modals for non-destructive actions — inline editing where possible
- No custom illustration/branding work — plain, clean, functional
- No animation libraries — CSS transitions are sufficient

---

## 11. Definition of Done

The UI is complete when:

- [ ] Every page in §5 is built against real API responses (no mock data
      left in the frontend)
- [ ] Every required state (loading/empty/error/permission/AI) from §5 exists
- [ ] Design tokens from §3 are the only source of color/spacing/type —
      no one-off values in components
- [ ] Role-based UI hides/disables per File 04's permission matrix, with
      server authorization as the real boundary
- [ ] Responsive behavior from §8 verified on mobile/tablet/desktop
- [ ] Accessibility checks from §9 pass
- [ ] No animation exceeds 180ms; no unused component variants exist
