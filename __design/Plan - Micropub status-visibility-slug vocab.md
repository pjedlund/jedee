# Design spec — Micropub status / visibility / slug vocabulary

> **Status: SPEC (approved 2026-06-01, not yet implemented).** This is the durable design record.
> Implementation is a separate lean-execution session on branch `feat/micropub-frontmatter-vocab`.
> On implementation, the canonical translation table graduates to
> `__project_docs/micropub-pattern.html` (§5/§9). Source handoff:
> `_generated/Handoff - Micropub status-visibility-slug vocab.md`.

## Context

Sparkles' note composer exposes **slug · status · visibility** (Advanced section), per the
[Micropub-extensions](https://indieweb.org/Micropub-extensions) de-facto standard. JEDEE today models
only `draft`. The deeper issue: JEDEE has **three authoring paths into one `.md` content layer**
(hand-written · Obsidian Web Clipper · Micropub), and they should share **one documented frontmatter
contract per type**. This work (a) fixes two real endpoint gaps, (b) decides the genuinely-open
`visibility` semantics for a public static site, and (c) documents the shared contract.

**Guiding principle:** keep JEDEE's native vocabulary; translate Micropub-extension properties at the
endpoint boundary (exactly as `post-status` already is). Does **not** block 1.0.0 — post-launch polish.

## What the exploration settled (grounding)

- **`mp-slug` is already honored by the engine.** `@benjifs/micropub` `src/content.js:14-27`
  (`generateSlug`) gives a client `mp-slug` top priority over title/content, so it reaches the
  filename. A **titled** post → kebab slug, no timestamp. A **title-less** post with no mp-slug → a
  **bare unix timestamp** (`^\d+$`, no trailing hyphen). A cite post (watch/read/listen) → e.g.
  `1234-star-wars-1977`, and `formatSlug` strips the `^\d+-` prefix → `star-wars-1977`.
- **The clobber bug is in JEDEE's store, not the engine.** `netlify/functions/micropub.js:193` re-slugs
  on `if (!data.title)` — too broad. A **note** (no title) carrying a user `mp-slug` gets its slug
  recomputed from content and **overwritten**. The bare-timestamp test cleanly separates "engine had
  nothing to name from" (re-slug wanted) from "user/engine already named it" (leave alone).
- **The `visibility` leak is real.** `visibility` is unmapped, so the catch-all `out[key] = value` at
  `micropub.js:147` writes a stray `visibility: …` line into frontmatter.
- **Mechanisms for the visibility semantics already exist** (this is why "native key, central interp"
  is cheap):
  - `draft: true` → **no public output at all** (`permalink:false` + excluded from collections), via
    `eleventyComputed` in `src/_config/plugins/drafts.js`. Drafts still render in `serve`/`watch`
    (`BUILD_DRAFTS`).
  - `eleventyExcludeFromCollections: true` → **URL resolves, but out of every collection** → dropped
    from archives **and** per-type feeds (feeds/`byCategory()` read `collections.*`, which honor the
    exclusion) and from the sitemap. This *is* "unlisted."
  - `excludeFromSitemap: true` → honored by `src/common/sitemap.njk`.
  - **Per-post `noindex` does NOT exist** — `src/_includes/head/meta-info.njk:16-17` hard-codes
    site-wide `noindex,nofollow` for the soft-launch. This is the only net-new piece.
- The 15 per-type directory-data files (`src/posts/*/*.json`) are uniform (`layout`/`tags`/`category`/
  `permalink`) — **no churn needed there**; the "one contract" work is documentation + the central
  interpreter + the endpoint.

## Decisions (confirmed with Johan)

| Axis | Micropub input | JEDEE frontmatter (the contract) | Where decided |
|---|---|---|---|
| **status** | `post-status: draft` | `draft: true` | endpoint (unchanged) |
| | `post-status: published` (or absent) | *(omit — publishes)* | endpoint (unchanged) |
| **visibility** | `visibility: unlisted` | `visibility: unlisted` (native key) | endpoint → build interprets |
| | `visibility: private` | `draft: true` | endpoint (reuse draft mechanism) |
| | `visibility: public` (or absent/other) | *(drop — no stray key)* | endpoint |
| **slug** | `mp-slug: x` | filename `x` (engine honors; re-slug guarded off) | engine + store guard |

- **Unlisted = native key, central interpretation.** One `visibility` key, interpreted in one place
  (mirroring how `drafts.js` interprets `draft`). All three authoring paths write the same key.
- **Private = unpublished.** Collapse to the existing `draft` mechanism (no public output). Document
  the limitation explicitly: on a static public site "private" means **not published**, not
  encrypted/authenticated-private. The contract reserves `visibility` for `unlisted`; "private" is
  expressed as `draft: true` on every path.
- **Per-post noindex: build now**, so `unlisted` is genuinely complete at 1.0.0 (when the site-wide
  noindex is dropped).

## The design

### 1. Endpoint — `netlify/functions/micropub.js`

**(a) Plug the leak + apply visibility.** In `rewriteFrontmatter`, add a `visibility` special case
*before* the `KEY_MAP`/catch-all (alongside the existing `post-status` case at `:139-142`):

```js
if (key === 'visibility') {
  if (value === 'unlisted') out.visibility = 'unlisted'
  else if (value === 'private') out.draft = true   // reuse draft mechanism; "private" = unpublished
  // 'public' / anything else -> dropped (never leak a stray key)
  continue
}
```

**(b) Guard the title-less re-slug.** At `:193`, tighten the condition so it fires only when the
engine produced a bare timestamp (i.e. had nothing to name from):

```js
if (!data.title && /^\d+$/.test(slug)) {   // was: if (!data.title)
```

This honors a user `mp-slug` on note-type posts, and incidentally protects cite-derived
(`star-wars-1977`) slugs too — neither matches `^\d+$`.

**(c) Testability refactor (small).** The slug-decision currently lives inline in
`JedeeStore.createFile` (untested — does I/O via `this.inner.createFile`). Extract a pure helper, e.g.
`resolveFilename(filename, data, content) → finalName` (plus the `onLocation` URL it implies), and
have `createFile` call it. This lets the guard be unit-tested without mocking GitHub. Keeps the unit
well-bounded.

### 2. Central visibility interpreter — extend `src/_config/plugins/drafts.js`

Extend the existing `eleventyComputed` functions (do **not** invent a parallel mechanism):

- `eleventyComputed.eleventyExcludeFromCollections`: also return `true` when
  `data.visibility === 'unlisted'` (always, not build-mode-gated — it's a permanent property), in
  addition to the existing draft rule. Result: unlisted posts drop from archives **and** every
  per-type feed (which read `collections.*`), while keeping their permalink (URL resolves).
- `eleventyComputed.excludeFromSitemap`: return `true` when `data.visibility === 'unlisted'`, else
  pass through the explicit value. *(Likely redundant once excluded from collections — confirm how
  `collections.showInSitemap` is built during implementation — but explicit and harmless.)*
- `eleventyComputed.noindex` (**new**): return `true` when `data.visibility === 'unlisted'`, else pass
  through any explicit per-post `noindex`.
- `private` needs nothing new here — the endpoint already wrote `draft: true`, which the existing
  draft rules handle.

*(Consider renaming the plugin file's concept from "drafts" to "post-status/visibility" during
implementation, or leave the filename and just broaden it — low stakes, decide at build time.)*

### 3. Per-post noindex hook — `src/_includes/head/meta-info.njk`

Replace the hard-coded site-wide tag (`:16-17`) with a flag-driven conditional:

```njk
{% if meta.noindexSite or noindex %}
  <meta name="robots" content="noindex,nofollow" />
  <meta name="googlebot" content="noindex,nofollow" />
{% endif %}
```

Add `noindexSite: true` to `src/_data/meta.js` (preserves today's soft-launch behavior).

> **Touches the 1.0.0 go-live mechanism.** The documented launch step ("drop noindex in
> `meta-info.njk:16-17`") becomes "set `meta.noindexSite = false`" — an *improvement* (flip a flag vs
> delete lines), and it means `unlisted` posts keep their `noindex` after launch via the per-post
> flag. **Update the go-live checklist (`TODO.md` / `project_jedee_go_live` memory) to reference the
> flag** so the launch procedure stays accurate.

### 4. Tests — `_tests/micropub.test.js` (local-only, gitignored)

Add cases (`npm run test:unit`, Node 22 via `.nvmrc`):
- `rewriteFrontmatter({ visibility: 'unlisted' })` → `{ visibility: 'unlisted' }`
- `rewriteFrontmatter({ visibility: 'private' })` → `{ draft: true }`
- `rewriteFrontmatter({ visibility: 'public' })` → `{}` *(no leak)*
- Re-slug guard via the extracted helper: title-less + bare-timestamp slug → re-slugs from
  content/target; title-less + non-timestamp slug (simulating `mp-slug`) → preserved; titled → never
  re-slugs.

### 5. Documentation — the "one contract" deliverable

- **`__project_docs/micropub-pattern.html`** (canonical ledger): add the three-axis status/visibility/
  slug **translation table** above (to §5 "As built" / §9 "resolved decisions"), plus the re-slug
  guard and the private-limitation note.
- **`micropub` skill** (primary to update): same table; note the re-slug guard refines the title-less
  slug strategy already described.
- **`indieweb` skill** (touch — visibility affects feeds): note `visibility: unlisted` excludes a post
  from collections **and** per-type feeds, plus the new per-post `noindex`.
- **`web-clipper` skill / `web-clipper-pattern.html`**: light note that a clip *may* carry
  `draft`/`visibility: unlisted`; no template changes required (clips default public).
- **`microformats` skill**: one-line note that status/visibility are build-level, not mf2 classes
  (no class change).

## Critical files

| File | Change |
|---|---|
| `netlify/functions/micropub.js` | `visibility` special case; re-slug guard `/^\d+$/`; extract `resolveFilename` helper |
| `src/_config/plugins/drafts.js` | broaden `eleventyComputed` for `visibility: unlisted` (excludeFromCollections + excludeFromSitemap + new `noindex`) |
| `src/_includes/head/meta-info.njk` | flag-driven robots meta (`meta.noindexSite or noindex`) |
| `src/_data/meta.js` | add `noindexSite: true` |
| `_tests/micropub.test.js` (local-only) | visibility + re-slug-guard cases |
| `__project_docs/micropub-pattern.html` | translation table + decisions |
| Skills: `micropub` (primary), `indieweb`, `web-clipper`, `microformats` | doc updates per §5 |

**No change needed:** `src/posts/*/*.json` (already uniform); `src/_config/collections.js`
(`byCategory()` already honors `eleventyExcludeFromCollections` via `collections.*`).

## Verification (for the implementation session)

1. `npm run test:unit` green (on Node 22 — `source ~/.nvm/nvm.sh && nvm use`).
2. Local build, both `BUILD_DRAFTS` off/on:
   - **unlisted** post → URL resolves; absent from `/its-section/` archive; absent from its feed;
     absent from sitemap; emits `noindex` meta.
   - **private** (→ draft) post → no output in production; renders in `serve`.
3. Sparkles round-trip against the **branch deploy preview**: post with `status=draft`, an `mp-slug`,
   and each `visibility` value; inspect the committed `.md` shape each time. *(Real client auth
   presupposes the live `me` domain with bidirectional `rel=me` — see the `micropub` skill's
   domain-coupling caveat; a crafted `h-entry` + token POST tests the endpoint without a live client.)*

## Process notes

- New branch `feat/micropub-frontmatter-vocab`. `gh` → always `--repo pjedlund/jedee`.
- Commits welcome (no `Co-Authored-By` trailer); **never push** — provide the command + PR body, Johan
  pushes himself.
- Invoke the `eleventy-excellent` skill before editing the config/plugin/template files; `cube-css`
  only if any CSS is touched (none expected).
