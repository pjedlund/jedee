# Fable plan — CLS-free front-page masonry + Lighthouse mobile pass

**Goal:** the front page (`/`) keeps its masonry-style tile wall but produces **zero cumulative layout shift (CLS)**, by replacing the JavaScript layout pass with pure CSS. Then run a Lighthouse mobile audit against a production build and fix what surfaces (knowing SEO is capped by the deliberate soft-launch `noindex`).

**Origin:** Johan's question in `_generated/Handoff - Lighthouse 400 mobile + CLS-free masonry.md` — read it before starting. This plan supersedes its "options to evaluate" section with a decision: **CSS multi-column** for the front page.

---

## House rules (apply to every step)

- Before writing or changing ANY CSS or template `class` attribute, invoke the `cube-css`, `every-layout`, and `eleventy-excellent` skills (project CLAUDE.md requirement). Also invoke `lean-web` — this task is exactly its subject (removing JS a native feature covers).
- US English in code/content.
- Commit freely on a feature branch (suggested: `fix/masonry-cls`); when green, merge into `main` locally with `--no-ff`. **Never `git push` — Johan pushes himself.** No `Co-Authored-By` trailer in commit messages.
- Node 22: run `source ~/.nvm/nvm.sh && nvm use` before builds (Claude's shell defaults to Node 23).
- `npm run build` cleans and writes `dist/` — the same directory `npm start` serves. If a dev server is running, a build blanks its nav until restart. For a servable verify build, build to a temp `--output` dir or just restart the dev server afterwards.
- Update `TODO.md` (§ the Lighthouse handoff item) and `LOG.md` when done. They are gitignored — edit them, don't try to commit them.

## Why CSS columns (decision, already made — don't re-litigate)

- The CLS root cause is confirmed: `src/assets/scripts/components/custom-masonry.js` lays items out as a normal grid, then after first paint (`connectedCallback` → `requestAnimationFrame` → `layoutMasonry()`) sets a `margin-top` on every item to pull it up. That post-paint move IS the layout shift, by construction. It re-runs on resize.
- CSS `columns` gives a true masonry look with zero JS and zero CLS, and — unlike the row-span-per-aspect-ratio technique — it **preserves each tile's `aspect-ratio` exactly at every viewport width** (tile width = column width; no height quantization).
- Known trade-off, accepted for now: reading order runs top-to-bottom per column instead of left-to-right. The front-page wall is currently **decorative placeholder `<div>`s** (real cards await the Penpot card-system design), so order is irrelevant today. When real cards land, revisit order as a design call — the row-span technique is the fallback if left-to-right order becomes a requirement (see Appendix).

## Scope guard — read this twice

`<custom-masonry>` is used in **five** templates:

- `src/pages/index.njk` (front page — placeholder divs) ← **only this one changes**
- `src/_includes/partials/archive-listing.njk`
- `src/common/tagList.njk`
- `src/common/tags.njk`
- `src/pages/events.njk` (twice)

The archive/tag/event usages wrap real text cards with **unknowable heights** — the aspect-ratio-free CSS techniques there are a different problem. **Do not touch them in this pass.** The component (`custom-masonry.webc` + `custom-masonry.js`) therefore stays in the codebase; you are only removing it from the front page.

## Files to touch

1. `src/pages/index.njk` — replace the `<custom-masonry>` block and its inline `<style>`.
2. `src/assets/css/global/compositions/masonry.css` — **new file**, the columns composition.
3. Whatever pulls compositions into the global bundle — find it by grepping for how `compositions/grid.css` is included (likely a CSS bundle template or `global-styles.css` import list) and mirror it for `masonry.css`. Do not guess; look.

## Steps, in order

1. **Baseline measurement.** `source ~/.nvm/nvm.sh && nvm use && npm run build`, serve `dist/` statically (e.g. `npx http-server dist -p 8766` or the `jedee-dist` launch config), run Lighthouse **mobile** on `/` and one content page (e.g. an article). Record all four category scores + the CLS value + the list of failing audits. Real Chrome lives at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` if you drive it via puppeteer/CLI. Expect: SEO < 100 because of the deliberate site-wide `noindex` (`meta.noindexSite` — soft-launch; do NOT "fix" it).
2. **Create the composition** `src/assets/css/global/compositions/masonry.css` (invoke the three skills first). Shape, following the house comment style of `grid.css` (configurable custom properties, documented at top):
   ```css
   .masonry {
     columns: var(--masonry-column-size, 16rem);
     gap: var(--gutter, var(--space-s-m));
   }
   .masonry > * {
     break-inside: avoid;
     margin-block-end: var(--gutter, var(--space-s-m));
   }
   ```
   Notes: `columns: <width>` auto-fits the count like `auto-fill` grids do; the child `margin-block-end` is the row gutter (multi-column `gap` only spaces the columns themselves). `break-inside: avoid` stops a tile splitting across columns.
3. **Wire the file into the global CSS bundle** the same way `grid.css` gets there. Verify afterwards that the served page actually has the `.masonry` rules (remember: the served global CSS is `/bundle/<hash>.css`, not `/assets/css/global.css` — grep the linked bundle in `dist`).
4. **Rework `src/pages/index.njk`:** replace `<custom-masonry>…</custom-masonry>` with `<div class="masonry">…same child divs…</div>` (keep the `region feature` wrapper). Keep the inline `<style>` block but drop anything the composition now owns; the per-tile `inline-size: min(30rem, 100%)` rule is obsolete (column width governs) — the remaining per-tile rules are `aspect-ratio: 1` default + `background-color`. Tiles keep their inline `aspect-ratio`/color styles as-is.
5. **Build + eyeball.** `BUILD_DRAFTS` not needed here. Build, serve `dist/`, confirm: wall still looks like a masonry (staggered column bottoms), no `<custom-masonry>` element and **no `custom-masonry.js` request** on `/` (view source / network). The component JS must still load on `/articles/` etc. — check one archive page still works.
6. **Re-run Lighthouse mobile on `/`.** CLS must now be **0** (or ≤ 0.02 if fonts contribute a hair). Compare all four scores to the baseline.
7. **Fix cheap surfaced items** from the report, one commit each, ONLY if low-risk (e.g. an image missing explicit dimensions, a meta description). Log anything non-trivial as a TODO item instead of fixing it here — especially anything touching Lene's upstream EE files.
8. **Tests:** `npm run test:unit` (105 tests; `_tests/` is gitignored — run them, don't commit them) and `npm run test:a11y` (pa11y tests light mode only; the 4 configured paths include `/`).
9. Update `TODO.md` §9-adjacent Lighthouse item + `LOG.md` with the before/after scores. Merge `--no-ff` to `main`. Do not push.

## Edge cases a weaker model would miss

- **Multi-column `gap` does not space rows.** In a `columns` layout, `gap` is column-gap only; vertical rhythm needs `margin-block-end` on children (step 2). Forgetting this makes tiles touch vertically.
- **The last child's bottom margin** adds phantom space under the wall. If it bothers, `.masonry > *:last-child { margin-block-end: 0 }` is NOT reliable in multicol (last child ≠ bottom of every column) — just leave the margin; it's inside the region's spacing anyway.
- **Don't delete `custom-masonry.js` / `custom-masonry.webc`** — four other templates still use them (scope guard above).
- **`grid.css` line 26 already declares `grid-template-rows: masonry`** as a progressive enhancement on `.grid[data-rows='masonry']`. Leave it; it belongs to the archive usages. But note: in a browser that ships native masonry, that rule + the JS `margin-top` pass can fight each other on archives — out of scope here, worth a TODO line.
- **Lighthouse must run against the production build**, never `npm start` (dev serves drafts, unminified assets, and reveals the hidden nav — `hideNav` is dev-revealed, prod-hidden).
- **A perfect 400 is impossible until 1.0.0** — the SEO category fails "page is blocked from indexing" while `meta.noindexSite: true`. That is deliberate. Target: Performance/Accessibility/Best-Practices at 100, SEO's only failure = the indexing audit.
- **The placeholders are temporary by design.** Real cards arrive with the Penpot card-system work. Don't build card markup here; just make the wall technique CLS-free so cards can drop in.
- The dev server (`eleventy --serve`) can die or stall mid-session — `npm run clean` + restart resets it.

## Acceptance criteria (verify each, with evidence)

1. Lighthouse mobile on `/` (production build, served statically): **CLS contribution from the wall = 0**; Performance ≥ baseline; the only SEO failure is the indexing audit.
2. `dist/index.html` contains no `custom-masonry` tag and does not load `custom-masonry.js`; `dist/articles/index.html` (or any archive) still contains both.
3. The wall renders as staggered columns with the same tile colors/ratios as before (screenshot both themes).
4. `npm run test:unit` → 105 passing; `npm run test:a11y` → green (the known pre-existing styleguide icon-link error is acceptable if it appears — it predates this work).
5. Work merged to `main` with `--no-ff`, **not pushed**; `TODO.md` + `LOG.md` updated with before/after Lighthouse numbers.

## Appendix — the row-span alternative (only if columns is later rejected)

Grid with `grid-auto-rows: 8px; gap: G` and per-item `grid-row: span N` where `N = round((H + G) / (8 + G))` and `H` = the item's intended pixel height. Caveats: heights are quantized; `aspect-ratio` no longer controls height (the span does — remove it or use `object-fit: cover` on images); ratios only hold at one column width. Preserves left-to-right DOM order, which is its sole advantage over columns.
