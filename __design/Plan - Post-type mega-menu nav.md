# Plan — Post-type mega-menu navigation

**Status:** Design decided 2026-06-18, **not yet built**. Build in a fresh session.
**Branch:** continues on `feat/logo-breadcrumb` (the header work lives here).

## Why

The top nav today is just `About` + a `Posts` dropdown listing all 15 post types
(`src/_data/navigation.js`). The landing page's masonry is still a placeholder
(colored `<div>`s in `src/pages/index.njk`). The goal: turn navigation into a calm,
index-like **mega-menu** of the post types — the way you'd open the table of contents
of a book — while protecting the site's signature: the **breadcrumb** in the top-left.

This is **direction A** from the 2026-06-18 research (mega-menu nav). Direction B
(a filterable landing grid) is **deferred** — partly because Maggie Appleton's own
garden filter doesn't work well, which is a tell that the filter route isn't worth it.

## The decided design

### Header layout
```
◍ › Section › Page  ………………………………………  [ moon ]  [ MENU ⌄ ]
```
- **Left — the breadcrumb stays.** It's the site's signature ("never seen anyone do
  it like that") — do NOT swap it for a logo + wordmark. Unchanged from today.
- **Right — always:** the theme toggle (moon) + a bordered **`MENU ⌄`** trigger. The
  border/button around MENU is deliberate — it reads as a control. The chevron rotates
  180° when open.
- **Full-width bar, content-aligned contents.** Make the header *bar* span the viewport
  (a clean modern band) but keep its contents — and the dropdown panel — aligned to the
  centered content column. Use the `.wrapper` breakout grid: bar = `full`, inner row =
  `content`. This gives the full-width feel without abandoning the centered editorial
  column.

### The mega-menu
- **Opens top-down**, as a dropdown attached under the `MENU` trigger (NOT a right
  slide-in). Reasons: the panel appears attached to what you clicked (universal
  mega-menu logic — Maggie's "The Garden", GitHub, Stripe); it lives inside JEDEE's
  centered editorial world rather than reading as app-shell chrome; it's the simpler,
  more accessible disclosure; and the "open downward = flip to the contents page"
  metaphor matches the leader dots.
- **Two columns, flat list** (no group headers) of **all 15 post types**.
- Each row: **icon · name · leader dots · count** — e.g. `♪  Jams · · · · · · · · 119`.
  - **Leader dots** (dotted line connecting name → right-aligned count): the
    table-of-contents/index typographic move. Pure CSS (a dotted bottom-border on a
    flexible spacer — no images, no JS). **Sit them on the text baseline** and keep
    them **faint** (low-contrast guide, not a rule).
  - **Counts** included (they double as a "what's here" signal). Derive per type from
    the collections.
  - **Icons:** the **lucide** set (Johan's Obsidian temp icons are lucide). Pull the 15
    matching SVGs into `src/assets/svg/` so the `{% svg %}` shortcode can render them.
  - **Hover:** row background lifts, icon goes orange, count brightens.
  - Icon tint: soft-blue in the mock — open tuning item (soft-blue vs the orange/green/blue
    accents).
- **Mobile:** the panel goes full-width and collapses to a single column.

### Type → lucide icon (starting map, tune in build)
articles→article · notes→notes · reading→book-2 · watching→film/movie · jams→music ·
photos→camera · recipes→chef-hat/utensils · events→calendar · bookmarks→bookmark ·
replies→reply/corner-up-left · reposts→repeat · likes→heart · rsvps→calendar-check ·
audio→mic/podcast · videos→video/tv.

### About + Now → the footer
- Move `About` out of the top nav into the footer nav (`navigation.js` `bottom`,
  alongside Imprint / Privacy / Accessibility).
- `Now` doesn't exist yet — add it to the footer when the page exists.
- The mega-menu makes adding top-level items back easy if ever wanted.

### The H1 stays (already shipped, `a8019d5`)
The Source Serif `<h1>` is always visible. Two reasons: it's the page's **visual
showpiece** (the serif is a design element, not just text), and it's the **anchor for
planned view transitions** (see Future). With the breadcrumb on, the page name shows
in both the trail leaf and the H1 — Johan chose to keep the full trail (standard
breadcrumb + heading pattern).

### Toggles unchanged
`meta.navigation.breadcrumb` (left side: breadcrumb vs logomark+wordmark) and
`meta.navigation.hideNav` (nav on/off, dev-revealed in `eleventy --serve`) still apply.

## What it replaces / build notes
- **Reworks the nav.** The mega-menu replaces today's `Posts` submenu + mobile drawer:
  `src/_includes/partials/main-nav.njk`, and the scripts `nav-drawer.js` / `nav-sub.js`.
  **Invoke the `nav-accessible` skill before touching any of this** — it's a disclosure
  pattern (button with `aria-expanded` / `aria-controls`, Escape to close, focus
  handling), and JEDEE's nav is built on Manuel Matuzović's progressive-enhancement
  pattern. ⚠ The breadcrumb is a second `<nav>` before `#mainnav`, so nav scripts must
  target `#mainnav` explicitly (see [[project_jedee_breadcrumb]]).
- **Progressive enhancement:** the menu must work as a plain list of links without JS;
  the dropdown toggle + dots are CSS/tiny-JS on top.
- **CSS (CUBE):** a new block for the mega-menu; leader dots (baseline-aligned, faint
  token); the full-width bar via the `.wrapper` `.full` breakout; a top-down reveal
  (CSS / view-transition friendly). Header chrome → `global/blocks/` is fine (site-wide).
- **Counts:** compute per-type collection sizes (Eleventy collections already exist per type).
- ⚠ Keep `{% svg %}` synchronous and avoid the interlinker async-include trap (see
  [[project_jedee_breadcrumb]] / the `eleventy-excellent` skill).
- Consult the CSS/markup trio first: `cube-css`, `every-layout`, `eleventy-excellent`,
  plus `nav-accessible` and `lean-web`.

## Bonus consistency — leader dots also unify the Jam metadata
The same dot-leader style fits the visible Jam metadata block Johan is designing
(`Artist · · · · · · Tom Waits`) — "Job 2C" in [[project_jedee_thisismyjam_import]].
One typographic idea, two places.

## Deferred / future (mentioned, not in this build)
- **Direction B** — a filterable landing grid (color chips). Deferred.
- **Fill the landing masonry** with real per-type, color-coded cards (the masonry is a
  visual sampler in direction A, not filtered).
- **View transitions** — CSS-only cross-document (MPA) transitions
  (`@view-transition { navigation: auto }` + `view-transition-name`s). Headline idea:
  navigating *back* to the landing page makes **"JOHAN EDLUND"** bloom in briefly — the
  logo/wordmark concept survives as a transition flourish, not a permanent element.
- **Search** — a magnifying-glass affordance in the style of `arielsalminen.com`
  (a centered cmd-K overlay is the natural home for a more app-like gesture). Lean-web:
  pagefind or a tiny client index, not a heavy lib.
- **Keyboard-shortcuts modal** — also Ariel's pattern.

## References
- Mockups produced in the 2026-06-18 session (leader-dot mega-menu + chevron trigger).
- Maggie Appleton — <https://maggieappleton.com> (the "Garden" mega-menu; her filter is
  the cautionary tale for direction B).
- Ariel Salminen — <https://arielsalminen.com> (search + shortcuts inspiration).
- Skills: `nav-accessible`, `cube-css`, `every-layout`, `eleventy-excellent`, `lean-web`.
- Header state so far: [[project_jedee_breadcrumb]] (toggles `breadcrumb` + `hideNav`,
  always-visible H1, restored `site-logo.css`).
