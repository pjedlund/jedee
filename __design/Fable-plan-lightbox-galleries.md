# Fable plan — Photo galleries in the lightbox (PhotoSwipe prev/next)

**Goal:** several photos in one post, opening in the existing PhotoSwipe lightbox with prev/next navigation between them. Authored via a `gallery:` frontmatter array on photo posts, rendered as a thumbnail grid.

**Context:** the `{% lightbox %}` shortcode shipped 2026-07-05 (read `_generated/Handoff - Lightbox galleries.md` first — it contains the traps section this plan builds on). The handoff left one design fork open; this plan closes it.

**Decision (made here — don't re-open):** build on the **PhotoSwipe path**, not EE's dormant `<dialog>` gallery. Reasons: it matches the site's existing lightbox behavior (zoom, swipe, responsive srcset), and `photo-lightbox.js` already supports multi-image galleries — `children: 'a'` matches every anchor inside the element, so one wrapper with N picture-links is already a navigable gallery. EE's dialog machinery (`partials/gallery.njk`, `dialog.js`, `local/gallery.css`) **stays in the repo, dormant — do not delete it**; retiring it is Johan's later call. After building, reconcile the gallery paragraphs in `__project_docs/photo-spec.html` (§13 area, ~lines 53/239/243/263) to record what was actually built.

---

## House rules

- Invoke before starting: `eleventy` (WebC + is-land), `eleventy-excellent`; before any CSS/class work: `cube-css`, `every-layout` (Grid for the thumbnail wall), `lean-web`; before touching µf2 classes: `microformats`.
- Branch (suggested `feat/lightbox-galleries`), commit freely, merge `--no-ff` to `main` when green. **Never push.** No `Co-Authored-By` trailer. US English.
- Node 22 via `source ~/.nvm/nvm.sh && nvm use`. Update `TODO.md` §9 + `LOG.md` (gitignored — edit only).

## The mechanism (read carefully — this is the part that goes wrong)

The single-image component chain today:

- `src/_config/shortcodes/image.js` → `processImage({lightbox: true})` emits `<div><photo-lightbox @href @width @height @srcset @caption><picture slot="image">…</picture></photo-lightbox></div>`.
- `src/_includes/webc/photo-lightbox.webc` → expands that into `<is-land on:idle><photo-lightbox><figure><a data-pswp-*>…` — note the WebC template hardcodes **exactly one** `<a>`.
- `src/assets/scripts/components/photo-lightbox.js` → `customElements.define('photo-lightbox', PhotoLightbox)`; inits `PhotoSwipeLightbox({gallery: this, children: 'a', …})`.

Therefore: **you cannot build a gallery by nesting N `<photo-lightbox>` components** (each would init its own PhotoSwipe — no prev/next across them), and **you cannot reuse `photo-lightbox.webc` as the gallery wrapper** (its template wraps the slot in a single fixed anchor). The gallery needs:

1. **A new WebC component** `src/_includes/webc/photo-gallery.webc` — same is-land shell, but the root just slots N ready-made anchor+picture children and loads the same CSS/JS:
   ```html
   <is-land on:idle>
     <photo-gallery webc:root webc:keep>
       <slot></slot>
       <template data-island="once" webc:raw>
         <link rel="stylesheet" href="/assets/components/photoswipe.css" />
         <style>
           is-land[ready] photo-gallery a { cursor: zoom-in; }
         </style>
         <script type="module" src="/assets/scripts/components/photo-lightbox.js"></script>
       </template>
     </photo-gallery>
   </is-land>
   ```
2. **One line in `photo-lightbox.js`** to register the second tag name. ⚠️ `customElements.define('photo-gallery', PhotoLightbox)` **throws** ("constructor already used") — a constructor can only be registered once. Use a trivial subclass:
   ```js
   customElements.define('photo-gallery', class extends PhotoLightbox {});
   ```
3. **A gallery shortcode** in `image.js`: export `galleryShortcode(images)` (register as `gallery` in `eleventy.config.js`, right next to the existing `lightbox` registration — grep for `lightboxShortcode` to find the spot). It maps the array to anchor+picture units inside one `<photo-gallery>`:
   - Extract the anchor-building bits of `processImage`'s lightbox branch into a small internal helper both paths use: for each image, run the same `Image()` pipeline, then emit
     `<figure><a class="no-indicator" href="{lowsrc.url}" data-pswp-width data-pswp-height data-pswp-srcset target="_blank" rel="noopener"><picture>…sources…<img …></picture></a>{caption ? <figcaption>…</figcaption> : ''}</figure>`
     — plain HTML, **no per-image WebC component**. Mirror the attribute set from `photo-lightbox.webc`'s anchor exactly (that markup is what PhotoSwipe reads).
   - Each visible `<img>` gets `class="u-photo"` via the existing `imageClass` mechanism (multiple images in one h-entry → each is a `u-photo`; confirm against the `microformats` skill before changing anything else classy).
   - Wrap the lot: `<div class="…optional containerClass…"><photo-gallery class="gallery">…figures…</photo-gallery></div>`. The outer `<div>` is **load-bearing in markdown** (markdown-it escapes `@`-prefixed props and mangles unknown-tag blocks; a chunk starting with `<div>` is taken as one raw html_block — same reason `processImage` does it, see its comment).
   - Accept per-image fields `{ image (or src), alt, caption }` — the field name `image` matches EE's documented `gallery:` frontmatter shape from `photo-spec.html`; accept `src` as an alias so body usage feels like `{% lightbox %}`.
   - Reuse the lightbox widths default `[650, 960, 1400, 2000]` and keep the `fallbackFormat` guard (`metadata.jpeg` may not exist when `formats` excludes jpeg — don't reintroduce that crash).
4. **Layout wiring** in `src/_layouts/photo.njk`: after the `e-content` block (photo body), add
   ```njk
   {% if gallery %}
     <div class="feature">{% gallery gallery %}</div>
   {% endif %}
   ```
   Direct call in the layout — do **not** put it inside an `{% include %}` wrapped in `{% if %}` (the interlinker trap silently blanks partials containing async shortcodes).
5. **Thumbnail grid CSS:** put the grid on the `photo-gallery` element itself via the existing `.grid` composition class if it fits (`class="grid"`, tune with `--grid-min-item-size`), or a small new **local** block `src/assets/css/local/gallery-lightbox.css` added to photo.njk's `{% css "local" %}` list. Consult `cube-css` + `every-layout` first; do NOT edit EE's `local/gallery.css` (that belongs to the dormant dialog gallery).

## Files to touch (summary)

1. `src/assets/scripts/components/photo-lightbox.js` — add the `photo-gallery` custom-element registration (one line + comment).
2. `src/_includes/webc/photo-gallery.webc` — new.
3. `src/_config/shortcodes/image.js` — internal anchor-unit helper + exported `galleryShortcode`.
4. `eleventy.config.js` — register the `gallery` shortcode (mirror how `lightbox` is registered).
5. `src/_layouts/photo.njk` — the `{% if gallery %}` block.
6. CSS: `.grid` reuse or new `src/assets/css/local/gallery-lightbox.css` (+ its `{% css "local" %}` include line in photo.njk).
7. `__project_docs/photo-spec.html` — reconcile the gallery paragraphs **after** the build works (docs-only commit).
8. A throwaway `draft: true` photo post with a 3-image `gallery:` for verification (see below; can stay as a dev fixture or be deleted before merge — say which in the commit).

## Steps, in order

1. Read the handoff + invoke the skills. 2. JS registration line. 3. `photo-gallery.webc`. 4. `image.js` helper + shortcode + config registration. 5. `photo.njk` wiring. 6. CSS. 7. Verify (below). 8. Photo-spec reconcile. 9. TODO/LOG, merge `--no-ff`.

## Verification recipe (from the handoff — follow exactly)

- Create a `draft: true` photo post with `gallery:` of 3 local images (reuse existing assets under `src/assets/images/`).
- `BUILD_DRAFTS=1 npm run build`, then inspect `dist/photos/<slug>/index.html`: one `<photo-gallery>` containing three `<a data-pswp-…>` anchors, each with `<picture>` + `u-photo` img; **zero** nested `<photo-lightbox>` elements inside it.
- Serve `dist/` (the `jedee-dist` launch config, port 8766 — port 8080 may be held by a stale dev server) and click-test: thumbnail grid renders; clicking any photo opens PhotoSwipe; **arrow keys / on-screen arrows move between the three photos**; zoom + wheel-zoom still work; Esc closes.
- Confirm the single-image `{% lightbox %}` path is unchanged: build any existing note using it and diff the emitted markup against `main`'s output.
- A `tail`-piped build hides failures — grep the build log for `Wrote` / `Error`.
- `npm run test:unit` (105 passing; there are no lightbox unit tests — build inspection is the verification).

## Edge cases a weaker model would miss

- The `customElements.define` double-registration throw (mechanism §2 above).
- Nested `<photo-lightbox>` components each init their own PhotoSwipe — the gallery's per-image markup must be plain anchors, no component.
- The `<div>` wrapper for markdown-safety on any shortcode that may be used in a post body.
- The interlinker trap: async shortcodes inside conditionally-included partials silently blank — keep the `{% gallery %}` call directly in the layout.
- `metadata.jpeg` can be absent — keep the `fallbackFormat` pattern.
- Breakout widths (`.feature`) only work on **direct children** of `.wrapper`; anything else needs the `.wrapper-pass` subgrid (already applied in post.njk/note.njk, **not** in photo.njk — photo.njk's existing `.feature` div pattern is the model to copy).
- If a new child rule risks specificity fights with `.wrapper > *`, use `:where()` (the `.wrapper-pass` lesson: a (0,2,0) rule silently beat `.feature`).
- Captions **inside the PhotoSwipe UI** are out of scope (needs the separate dynamic-caption plugin, not vendored). Captions render on the page under thumbnails only. Don't try to bolt it on.
- Jam/watching/reading covers deliberately do NOT get lightboxed — decided 2026-07-05; don't extend the gallery there.

## Acceptance criteria

1. A draft photo post with `gallery: [{image, alt, caption} ×3]` builds (with `BUILD_DRAFTS=1`) into one `<photo-gallery>` with three PhotoSwipe anchors; prev/next works in the browser; zoom/swipe/Esc work.
2. Each gallery `<img>` carries `u-photo`; no nested `photo-lightbox` elements; single-image `{% lightbox %}` output is byte-identical to before.
3. Thumbnail grid is responsive (three columns → one on narrow), styled per CUBE conventions, no edits to `local/gallery.css` or `gallery.njk`.
4. `npm run test:unit` green; production build (without `BUILD_DRAFTS`) green and free of the draft fixture.
5. `photo-spec.html` gallery paragraphs updated to describe the built mechanism; EE dialog machinery untouched.
6. Merged `--no-ff` to `main`, unpushed; `TODO.md` §9 + `LOG.md` updated.
