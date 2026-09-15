---
description: "A systematic inventory of what jedee keeps unchanged from Eleventy Excellent and where it has deliberately diverged."
date: 2026-07-31
---

jedee is a fork of [Eleventy Excellent](https://eleventy-excellent.netlify.app/) by Lene Saile. Every other page in this wiki states EE-stock-versus-jedee where it happens to matter locally; this page states it systematically, so a claim on another page can be checked against one inventory.

The source is Lene's own documentation collection, `src/docs/` in the upstream checkout at `/Users/johanedlund/Projects/eleventy-excellent` — 22 files, about 3,800 words, read in place and never edited. The checkout sits on tag `4.6.1`; jedee merged **4.6.0** in May 2026, one patch behind. Since then jedee has also merged 4.7.0 (August 2026) and 4.8.0 (15 September 2026); [Taking a new release](#taking-a-new-release) covers what the 4.8.0 merge showed about upgrading a fork.

⚠ **The docs are dated 30 March 2026 and are already stale in Lene's own repo.** `details.md` describes a `<custom-details>` WebC component at length — and the string `custom-details` appears nowhere in the 4.6.1 source tree except inside that doc file. The component was folded back into a plain `<details>`/`<summary>` partial and the doc was never updated. Treat every claim here as verified against code on **2026-07-31**, not as a transcription of Lene's prose.

## Stock and untouched

These are EE's, unchanged, and this wiki should not describe them as jedee inventions:

- **The config module layout.** `src/_config/` splits into `collections.js`, `events.js`, `filters.js`, `plugins.js`, `shortcodes.js`, each a barrel over a folder of the same name, plus `setup/` and `utils/`. jedee's tree is file-for-file identical to EE's. `eleventy.config.js` only registers; the logic lives in the modules.
- **The cascade layer order**, byte-identical in both `global/global.css`:

  ```css
  @import 'tailwindcss/base' layer(tailwindBase);
  @import 'base/reset.css' layer(reset);
  @import 'base/fonts.css' layer(fonts);
  @import 'tailwindcss/components' layer(tailwindComponents);
  @import 'base/variables.css' layer(variables);
  @import 'base/global-styles.css' layer(global);
  @import-glob 'compositions/*.css' layer(compositions);
  @import-glob 'blocks/*.css' layer(blocks);
  @import-glob 'utilities/*.css' layer(utilities);
  @import 'tailwindcss/utilities' layer(tailwindUtilities);
  ```

  Including the consequence Lene spells out in `css.md`: the "local" bundle uses no layers, so a per-page stylesheet outranks the whole global bundle regardless of selector specificity.
- **Two CSS streams, not three.** `css.md` documents a third destination, `src/assets/css/components/`, for stylesheets a WebC component references from the output folder — and `_config/events/build-css.js` does glob it, identically in both repos. But the folder exists in **neither** checkout: not in jedee, and not in vanilla 4.6.1 either. It is a wired-up route with nothing routed through it, on both sides.
- **[[Tailwind]] as a token pipeline, not a utility framework.** No utility classes in the markup on either side.
- **The two JS bundles** (`js-inline.njk`, `js-defer.njk`) and the two source folders behind them — `scripts/components/` ships to the output folder for custom elements to load directly, `scripts/bundle/` ships to `_includes/scripts/` for the `{% js %}` shortcode.
- **The three image routes** (HTML Transform, markdown syntax, `{% image %}` / `{% imageKeys %}`) — see [[Self-hosting remote images at build time]] for the one place jedee leans on a route Lene documents but does not use much.
- **OG image generation, favicon generation, the pa11y config generator, the `_redirects` template** — all four still the stock pipelines. See [[The accessibility test]] for what jedee changed in how pa11y is *run*.
- **`<custom-card>`, `<custom-masonry>`, `<custom-youtube>`, `<custom-peertube>`, `<custom-svg>`** — the five WebC components EE 4.6.1 actually ships, all still present. (The folder holds seven `.webc` files; `custom-youtube-link.webc` and `custom-peertube-link.webc` are the no-JS fallback partners of the two embeds, not components in their own right. Counts on this page exclude them on both sides.)

## Extended

Table: What jedee extended from the stock starter
| Area | EE stock | jedee |
|---|---|---|
| Post types | two (`articles`, `notes`), typed through `tags` | sixteen, typed through `category` with `tags` reserved for the public vocabulary — see [[Anatomy of a post type]] |
| Design tokens | nine files in `designTokens/`, two-step `colorsBase.json` → `colors.json` via `npm run colors` | the same two-step color pipeline, plus `semanticColors.json` and `typography.json` — eleven files, with Utopia fluid scales, a Penpot export (`npm run penpot:tokens`) and a generated `DESIGN.md` |
| Fonts | two families (Red Hat Display, Atkinson Hyperlegible) | six (adds Figtree, Source Sans, Source Serif, Source Code Pro) |
| WebC components | five | seven — adds `photo-lightbox.webc` ([[The PhotoSwipe lightbox]]) and `place-map.webc` |
| Header chrome | `navigation.drawerNav` and `navigation.subMenu` booleans in `meta.js` | neither key exists; replaced by `breadcrumb` and `hideNav`, and one `nav-menu.js` in place of EE's `nav-drawer.js` + `nav-sub.js` |
| Wikilinks | not shipped at all | `@photogabble/eleventy-plugin-interlinker` — see [[Wikilinks]] |
| Per-page CSS | ten files in `css/local/` | sixteen |
| npm scripts | adds `screenshots` | drops `screenshots`; adds `design:md`, `penpot:tokens`, `fallback-font-style`, `test:unit` |

**The interlinker is the consequential addition.** Vanilla EE does not ship it, which is exactly what made a vanilla checkout the decisive control when jedee's navigation rendered blank — see [[The interlinker's second render pass]]. Any oddity that only reproduces here and not upstream should be tested against that checkout before anything else.

The design-token divergence is narrower than it looks from the file count: jedee kept Lene's `colorsBase.json` → `colors.json` generation step and her `npm run colors` script verbatim, and added a semantic layer and composite typography tokens on top. It did not replace the pipeline.

## Deleted

`what-delete.md` is Lene's own list of what a fork can safely remove, which makes it a fair measure of how much of the starter jedee actually kept. Against that list:

Table: Lene Saile's list of removable files, against jedee
| Lene's item | jedee |
|---|---|
| `src/_data/github.js` | deleted |
| `src/_data/builtwith.json` | deleted |
| the `src/docs/` directory | deleted |
| `src/assets/images/screenshots` | deleted |
| all files in `src/posts` | replaced wholesale |
| all pages in `src/pages` | replaced wholesale |
| `blocks/code.css` ([[Syntax highlighting]]) | kept |
| `src/assets/images/blog`, `gallery`, `template` | kept |

So jedee removed almost exactly the set Lene marks as optional, and nothing beyond it. The starter's own structure survived the fork intact.

## ⚠ Left behind by those deletions

Two pieces of EE machinery are still in the tree with nothing referencing them. Both are the residue of a deletion, not a decision:

- **`partials/details.njk` + `scripts/bundle/details.js`** — the disclosure UI that rendered the `src/docs/` collection into `/get-started/`. The collection is gone; no template includes the partial. `meta.details` (the expand/collapse button labels) is still in `meta.js` too.
- **`partials/gallery.njk` + `scripts/bundle/dialog.js`** — EE's `<dialog>`-based lightbox, superseded by PhotoSwipe. No layout includes it.
Each is a handful of kilobytes of source that compiles but ships to no page — the JS-and-partial equivalent of the orphan `local/*.css` problem. Nothing is broken; the note exists so the next reader doesn't take their presence as evidence the features are in use.

`scripts/components/custom-easteregg.js` was a third until 2026-09-11, when the easter egg was switched on in `settings.yaml` (`easteregg: true`). `base.njk` gates it behind `{% if meta.easteregg %}` (stock EE behavior), so it now loads on every page.

## Taking a new release

jedee takes an EE release as a git merge of upstream's `main` into a branch, following Lene's own procedure. [[Themes and starters]] makes the case for this over a theme system: a merge conflict names the file and shows both versions, where a stale override says nothing. The 4.8.0 merge on 2026-09-15 showed where that stops being true.

**Files upstream adds merge in without a conflict.** A file that is new upstream and absent from the fork is simply added; git has nothing to compare it with. 4.8.0 added six. One of them, `src/common/llms.11tydata.js`, is a directory data file that sets the permalink of `src/common/llms.njk` through `eleventyComputed`:

```js
export default {
  eleventyComputed: {
    permalink(data) {
      return data.meta.robots.generateLlmsTxt ? '/llms.txt' : false;
    }
  }
};
```

jedee already had its own `llms.njk`, sectioned by post type and fed from `settings.yaml`. Computed data outranks front matter, so this file would have taken over the address of jedee's page, and it reads `meta.robots`, a key jedee's `meta.js` doesn't have. Nothing in the merge output flagged it. The check that does is reading the `A ` lines in `git status` before committing. That time they also held a speculation-rules include, a view-transitions stylesheet (jedee has its own, gated on reduced motion), an `escapeHtml` filter that only upstream's new `svg.js` calls, a demo GIF and a doc page. All six were removed.

**A file upstream changes back looks like any other conflict.** Keeping jedee's side is usually right, but the conflict looks the same whether upstream fixed a bug or undid something jedee changed on purpose. In 4.8.0, EE's `svg.js` became `async` again; jedee keeps it synchronous, because an async shortcode inside a conditional include renders empty under the interlinker ([[The interlinker's second render pass]]). The same merge showed the opposite case in `theme-toggle.js`: upstream fixed swapped dark and light `theme-color` values that jedee's reworked single-button toggle still carried, so that fix was merged in by hand rather than dropped with the rest of upstream's file.

**Orphans keep taking upstream's changes.** The details partial and script listed above were both rewritten by the 4.8.0 merge, with nothing on the site to show for it. Since the partial auto-merged to new button attributes, jedee's older script would have stopped matching it; upstream's script was taken too, to keep the unused pair consistent.

The ordinary merge also depends on the fork still sharing history with upstream. Between 4.6.0 and 4.7.0 upstream rewrote its history (same file trees, new commits), so 4.7.0 was applied as a diff by hand and recorded with `git merge -s ours`, which gave 4.8.0 a normal merge base again.

Source: `/Users/johanedlund/Projects/eleventy-excellent/src/docs/` at tag `4.6.1` (docs dated 2026-03-30), every claim checked against both checkouts on 2026-07-31.

Raw source: src/_raw/dev-notes/How the Eleventy Excellent 4.8 upgrade went.md (the "Taking a new release" section and the easter egg update, 2026-09-15)
