# Handoff — Colophon hub + per-type spec migration + SDG license

Date: 2026-05-22 · Repo: `/Users/johanedlund/Projects/JEDEE` · Branch: `feat/14-post-types`

## Why this exists (the arc)

The per-type post spec docs currently live in `__project_docs/` as **bespoke static HTML**
(`jam-spec.html` + `spec.css` + `spec.js`, the annotation UI ported verbatim from
tolstoy.life's `serve.py`). Only the **Jam** spec is written so far; it is the *approved
template* for ~14 more (`_generated/Handoff - post-type spec docs.md`: "jam-spec.html is the
approved template — replicate its shape").

We decided to **migrate this documentation into the 11ty-rendered site** under a single
**`/colophon/`** umbrella ("how this site is built"), pull the **SDG license** into the
footer + colophon, and present the existing **style guide** and **Lene's theme docs** as
siblings of the post-type specs. The colophon is the warm, IndieWeb-flavoured front door;
the detailed specs sit behind it, unlisted.

Thematic bonus: **SDG = "Soli Deo Gloria"**, which is literally the phrase Bach inscribed in
his manuscript *colophons*. Putting the dedication in a colophon is its historically exact home.

## Decisions locked — do NOT re-litigate

1. **`/colophon/` is the umbrella.** One *listed*, public, footer-linked page ("how this site
   is built": stack, IndieWeb, design-token philosophy, the SDG dedication + Bach/Tolstoy
   framing, and credits). It links into the reference children.
2. **Match the style guide's "unlisted-public" recipe** for the reference children:
   `eleventyExcludeFromCollections: true` + a real `permalink` = built and reachable in
   production, but not in nav/sitemap/tag-lists. See `src/pages/styleguide.njk` (it's at
   `/styleguide/`, ships in prod, is linked nowhere). **No env-var `ignores` toggle** — that
   stricter "dev-only, never in dist" alternative was considered and rejected in favour of
   matching the styleguide. "Make public" = add a nav/footer link, nothing more.
3. **Specs are their own collection of full markdown pages**, NOT merged into Lene's
   `collections.docs` (which is `permalink:false` `<custom-details>` disclosures rendered on
   `/get-started/` — wrong shape for large documents).
4. **Lene's docs stay at `/get-started/`** — linked from the colophon, not relocated. The
   `get-started.md` + `src/posts/docs/details.md` aggregation is wired and Lene-intentional.
   (Relocating to `/colophon/theme/` is a one-line permalink change if wanted later — cheap,
   not worth the churn now.)
5. **Annotation UI is dev-only.** It must never ship to production even when the docs are
   reachable in prod.
6. **License: adopt SDG**, mirroring `/Volumes/Graugear/Tolstoy/LICENSE`. Content under SDG
   (Soli Deo Gloria → CC0-1.0); code credited to EE (ISC) + Cube Boilerplate (MIT). JEDEE's
   `LICENSE` already carries those third-party credits — today the preamble is **The Unlicense**;
   it gets replaced by the SDG wrapper. Footer carries the dedication line.

## Target structure

```
/colophon/                       ← NEW: listed, public hub + narrative + license + credits
/colophon/specs/<type>/          ← NEW: per-type spec pages (unlisted-public)
/styleguide/                     ← existing, kept; linked from colophon as "Design system"
/get-started/                    ← existing (Lene's docs), kept; linked as "Theme internals"

src/pages/colophon.njk           ← NEW hub page (layout: base; listed; footer-linked)
src/posts/specs/
├── specs.json                   ← { layout: "spec", permalink: "/colophon/specs/{{ page.fileSlug | slugify }}/", … }
├── jam.md                       ← migrated from __project_docs/jam-spec.html (do this one first)
└── <type>.md …                  ← future specs
src/_layouts/spec.njk            ← full-page spec layout: TOC, note-callout, dev-only annotation include
src/_includes/partials/
├── indie-plumbing.njk           ← shared IndieWeb/webmention section + capability matrix
└── reference-nav.njk            ← (optional) sub-nav shared by colophon/styleguide/specs
src/_data/indiePlumbing.(js|yaml)← per-type webmention capability matrix (data-driven)
src/assets/scripts/bundle/annotations.js   ← ported from __project_docs/spec.js (dev-only)
src/assets/css/local/spec.css    ← ported from __project_docs/spec.css (cube-css skill first)

LICENSE                          ← rewrite: SDG preamble + boundaries + EE/Cube credits (keep)
package.json                     ← "license": "Unlicense" → "CC0-1.0" (SPDX; SDG is a name, not an SPDX id)
```

## Build phases (each ships independently)

### Phase A — License: adopt SDG
- **Current state:** root `LICENSE` = The Unlicense (Johan Edlund, 2024->) followed by
  **Eleventy Excellent ISC** (Lene Saile 2024) + **Cube Boilerplate MIT** (Set Studio 2024),
  full texts. `package.json` → `"license": "Unlicense"`.
- **Target:** rewrite `LICENSE` mirroring `/Volumes/Graugear/Tolstoy/LICENSE`'s structure:
  *Soli Deo Gloria* preamble (Bach/Tolstoy framing) → **Dedication** (CC0 fallback language)
  → **Licence boundaries** (by directory: all original content + code authored by Johan under
  SDG/CC0; JEDEE has **no** CC BY-SA sources, so simpler than Tolstoy's) → **Third-party
  sources and dependencies** (keep the existing EE ISC + Cube MIT credits) → **No warranty**.
- Pull the SDG + verbatim CC0 text from the **`pjedlund/sdg-license`** repo's `LICENSE` (its
  reuse terms allow copying the file as-is; CC0 text must stay verbatim, do not edit).
- Update `package.json` SPDX to `CC0-1.0`.
- **Caveat to surface to Johan (from the SDG README):** CC0 does *not* grant patent rights;
  SDG says for patent-sensitive *code* consider Apache-2.0 / MIT-0 or dual-licensing. For a
  personal site this is almost certainly fine, but it's Johan's call — do not silently decide.

### Phase B — Footer dedication line
- The creator/11ty "Made with ❤ and Eleventy" aside is **currently commented out** at
  `src/_includes/partials/footer.njk:50-58`. Do **not** restore it.
- Add a dedication line in the footer: e.g. "Soli Deo Gloria — dedicated to the public domain",
  linked `rel="license"` (matches the footer's existing `rel="me"` vocabulary). Decide the
  link target: the on-site `/colophon/` (preferred — keeps users on-site) vs the SDG repo.
- The **EE/11ty credit moves into the colophon's credits section**, not the footer.
- Follow the SDG repo's `HOW-TO-APPLY.md` *website* recipe for the exact `rel="license"` markup.

### Phase C — Colophon hub page
- `src/pages/colophon.njk` (or `.md`), `layout: base`, **listed** (add the footer link from
  Phase B). Short narrative "how this site is built": tech stack (11ty + EE), IndieWeb, the
  design-token system (link the style guide), the SDG dedication + framing, and a **credits**
  section (EE ISC/Lene, Cube MIT/Set Studio, fonts, Utopia fluid scales).
- Links to the reference children: Design system → `/styleguide/`; Content model →
  `/colophon/specs/`; Theme internals → `/get-started/`.

### Phase D — Spec collection + layout (migrate Jam first)
- `src/posts/specs/specs.json`: set `layout: spec`, `permalink: /colophon/specs/{{ page.fileSlug | slugify }}/`,
  and make the specs **unlisted** (out of nav + sitemap + tag-lists) the way the style guide is.
  **Verify the exact Eleventy mechanism** — `eleventyExcludeFromCollections: true` may also hide
  them from a custom `collections.spec` you'd use to list them on the colophon. If so, register
  a `spec` collection by glob (`getFilteredByGlob('./src/posts/specs/*.md')`, like `byCategory`
  in `src/_config/collections.js`) and keep them out of the sitemap via the existing
  `showInSitemap` filter rather than the global exclude flag. Confirm against how
  `src/pages/styleguide.njk` and the `showInSitemap` collection already behave.
- `src/_layouts/spec.njk`: renders the markdown body, a heading TOC (port `spec.js`'s TOC
  behaviour, or use build-time `markdown-it-anchor` + a `toc` filter), the note-callout style,
  the `indie-plumbing` partial where relevant, and the dev-only annotation include (Phase F).
- **Migrate `__project_docs/jam-spec.html` → `src/posts/specs/jam.md` first** to prove the
  pipeline. Conversions: HTML `<table>` → markdown tables; `<p class="note">` → a callout
  (paired shortcode `{% note %}…{% endnote %}` or a markdown-it container — decide); `<pre><code>`
  → fenced code blocks; the `§N.` headings become normal markdown headings (TOC auto-built).
  Preserve meaning verbatim. The jam-spec already has Micropub (§15) and Webmentions (§16)
  sections added this session — carry them over.

### Phase E — Indie-plumbing shared partial + capability matrix
- Johan's requirement: post types vary — some have full webmentions, some only "Like", some
  (e.g. Repost) none. So this must be **shared prose + a per-type capability matrix**, not
  copied text.
- `src/_includes/partials/indie-plumbing.njk` — the shared mechanism once (endpoint discovery,
  h-card authorship, the no-op render slot, receive/send deferral to the webmention milestone).
- `src/_data/indiePlumbing.(js|yaml)` — matrix: per type → which response types it *receives*
  vs *sends*. Render the matrix table from this data so the docs can't drift. Source it from
  real config where possible.
- Each spec's "Webmentions" section then `{% include "partials/indie-plumbing.njk" %}` and
  highlights its own row.

### Phase F — Annotation UI (dev-only)
- Port `__project_docs/spec.js` → `src/assets/scripts/bundle/annotations.js`; include via
  `{% js %}` in `spec.njk`, **gated on dev** (`ELEVENTY_RUN_MODE === 'serve'` or
  `ELEVENTY_ENV === 'development'`). The annotation popover/tooltip/bar markup (the `ann-*`
  divs at the foot of `jam-spec.html`) moves into `spec.njk`, also dev-gated.
- Port `__project_docs/spec.css` → `src/assets/css/local/spec.css` (the specs are table-heavy;
  reuse `src/assets/css/local/table.css` which the style guide already loads). **Invoke the
  `cube-css` skill before writing any CSS.**

### Phase G — Wire the hub together
- Colophon links to `/styleguide/` and `/get-started/`. Optionally add `reference-nav.njk`
  shared by all three so they read as one surface.
- Decide whether to later relocate `/styleguide/` + `/get-started/` under `/colophon/` for URL
  tidiness (default for now: keep their URLs, link from the hub).

## Source of truth — read first

- `__project_docs/jam-spec.html` — the content to migrate **and** the approved template for all
  future per-type specs.
- `src/pages/styleguide.njk` — the unlisted-public pattern (`eleventyExcludeFromCollections` +
  permalink) and the `{% css "local" %}` approach. The model to copy.
- `/Volumes/Graugear/Tolstoy/LICENSE` — the license structure to mirror (Dedication / boundaries
  by directory / third-party credits / no warranty).
- `pjedlund/sdg-license` (GitHub) — `LICENSE` (verbatim SDG + CC0 text to copy), `HOW-TO-APPLY.md`
  (website `rel="license"` recipe), README (the patent/code caveat).
- `JEDEE/LICENSE` (current) — already credits EE ISC + Cube MIT; keep those, replace the
  Unlicense preamble.
- Lene's docs model: `src/posts/docs/docs.json` (`{tags:"docs", permalink:false}`) rendered via
  `src/posts/docs/details.md` + `src/pages/get-started.md` (uses `<custom-details>` via
  `partials/details.njk`).
- `src/_includes/partials/footer.njk` — where the dedication line goes (commented-out aside at
  lines 50-58).
- Skills: **eleventy-excellent** (before any template/layout/config change), **cube-css**
  (before any CSS), **nice-permalinks** (permalinks use `{{ page.fileSlug | slugify }}`).

## Conventions / project rules to honour

- **Two different doc surfaces, two different rule-sets:** `__project_docs/*.html` is a verbatim
  serve.py-ported theme — do NOT apply cube-css/every-layout/eleventy-excellent there. But the
  **new** specs migrated into `src/` ARE first-class EE pages — cube-css / EE conventions DO
  apply to them.
- Permalinks: `{{ page.fileSlug | slugify }}` (project convention; ignore the global
  nice-permalinks skill's `{{ id }}` pattern — JEDEE has no `id:` field).
- US English in code/content.
- `_generated/` is gitignored (this handoff included) — don't `git add` it.
- **Johan commits and pushes himself.** Provide commit messages; never run `git push` /
  `gh pr create`. No `Co-Authored-By: Claude` trailer.

## Open decisions for the build session (ask Johan)

1. Relocate `/styleguide/` + `/get-started/` under `/colophon/`, or keep their URLs and link?
   (Default: keep + link.)
2. Note-callout mechanism: paired `{% note %}` shortcode vs markdown-it container.
3. TOC: port `spec.js`'s client-side TOC, or build-time `markdown-it-anchor` + `toc` filter.
4. Capability-matrix data shape, and whether to source it from real config or hand-author first.
5. Patent/code dual-license (SDG README caveat) — is CC0 fine for JEDEE's code, or pair with
   Apache-2.0 / MIT-0?
6. `rel="license"` target — on-site `/colophon/` (preferred) vs the SDG repo.
7. Fate of `__project_docs/` after migration — retire/delete once `src/` specs exist, or keep
   as the annotated source?

## Suggested first commit (Johan commits)

Phase A is self-contained and low-risk — a good first slice:

```
license: adopt SDG (Soli Deo Gloria / CC0) dedication, keep EE + Cube credits
```
