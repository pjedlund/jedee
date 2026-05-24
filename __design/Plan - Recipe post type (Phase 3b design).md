# Design increment — Recipe post type (Phase 3b)

**Date:** 2026-05-22
**Status:** design approved; spec to be written (`__project_docs/recipe-spec.html`).
**Source of truth:** `_generated/Plan - Phase 3 (10 new post types) - final.md` §"Phase 3b — heavy 5".
**Purpose:** settle the Recipe type's shape *before* writing its spec, so the spec asserts real
decisions rather than invented detail (the failure mode the Phase 3b handoff warns against).

Recipe is the **fifth and last** heavy-type increment (after Photo, then Audio + Video, then
Event). It gets its own increment — it does not share Audio/Video's hosted-media pattern. It is the
closest sibling to **Event**: title-required, nests a real microformat **root** in `h-entry`, and is
a strong rich-results candidate. Recipe copies Event's shape; the deltas are the
ingredients/instructions data model, the ISO-8601 duration filter, and a feed (Event had none).
**This increment completes the 15/15 spec set.**

---

## Grounding (verified against the code, 2026-05-22)

Carried from the Event + Audio/Video increments (same branch, same session — re-verified there):

- **No duration filter exists.** `src/_config/filters/dates.js` holds only `toISOString` (dayjs →
  ISO-8601) and `formatDate` (dayjs format). The Audio increment flagged an `itunes:duration`
  formatter (ISO-8601 → `HH:MM:SS`) as to-build, but that is a **different output shape** from
  Recipe's need. So Recipe's duration filter — parse integer minutes *or* `PT…M`, output a
  human-readable string *and* a normalized `PT…M` — is **new build work**.
- **The schema include throws on a missing template.** `src/_includes/head/schema.njk:4` is
  `{% include "schemas/" + schema + ".njk" %}`; only `src/_includes/schemas/BlogPosting.njk` and
  `WebSite.njk` exist. So `schema: Recipe` **cannot** be set until `schemas/Recipe.njk` exists — the
  template and the frontmatter must ship together. Hard dependency, not a defer. (Same constraint
  Event documented for `schemas/Event.njk`.)
- **The shared feed bodies emit only `post.content`.** Every `src/feeds/*.atom.njk` includes
  `feeds/atom-body.njk`; `*.json.njk` includes `feeds/json-body.njk`. Both shared bodies emit **only**
  `post.content` via `renderTransforms` (`atom-body.njk:37`, `json-body.njk:27`) — no frontmatter
  fields. Since Recipe's ingredients/instructions live in **frontmatter**, a naive notes-feed clone
  would drop them. A recipe feed therefore needs a **recipe-aware body** (Photo's lesson).
- **Collections don't partition.** `src/_config/collections.js` registers each type via
  `byCategory(cat)` → `getFilteredByGlob('./src/posts/**/*.md').filter(category===cat).reverse()`.
  Recipe needs no archive partition (chronological, unlike Event's upcoming/past), so the standard
  `byCategory('recipe')` collection plus a plain archive page suffices.
- **Clone target.** `src/_layouts/watching.njk` — `layout: base`, `entry-header`, a hidden µf2
  `<data>` slot, `.e-content`, `backlinks.njk`, `entry-footer`, the hidden `h-entry` authorship
  div, and a local `{% css %}` block (`post.css` + `footnotes.css`). Same proven base as Photo /
  Audio / Video / Event.
- **The RSS plugin already ships the feed date/URL filters.** `@11ty/eleventy-plugin-rss`
  (`eleventy.config.js:68`) provides `dateToRfc3339`, `absoluteUrl`, `getNewestCollectionItemDate` —
  so the Atom/JSON feed scaffolding reuses the existing helpers; only the **recipe-aware body** is
  new.

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Layout base | Clone `watching.njk` | Same proven base as Photo / Audio / Video / Event; carries the µf2 `<data>` slot, `.e-content`, hidden h-entry authorship. |
| Permalink | **Title-required** — `/recipes/{{ page.fileSlug \| slugify }}/index.html` | Plan marks Recipe title-required. Slug still comes from `page.fileSlug` (shipped convention); `title \| slugify` is the fragile Article-only path TODO.md §2 flags. Title-required = the *type* requires a title (= recipe name), not that the slug derives from it. |
| Plural namespace | `/recipes/` (post page + archive + feed) | Matches the shipped `/notes/`, `/jams/` convention. |
| Frontmatter | **Nested object** `recipe: { yield, prepTime?, cookTime?, totalTime?, ingredients[], instructions[], image? }` + top-level `title` (= `p-name`) + `description` (= `p-summary`) | Groups the recipe data; matches the Photo/Audio/Video/Event nested-object convention. `title` carries `p-name` (no redundant `recipe.name`); `description` (existing site-wide field) carries `p-summary`. |
| Ingredients / instructions | **Frontmatter string arrays** — `recipe.ingredients: []`, `recipe.instructions: []` (plain strings) | Johan's call. Structured enough to trivially emit µf2 `p-ingredient` + schema `recipeIngredient`/`recipeInstructions[]`; `HowToStep` objects (per-step image/time) deferred. |
| Schema | **Real `schema.org/Recipe`** as the v1 target — new `schemas/Recipe.njk` (to-build) | Johan's call — mirrors Event, breaks the "BlogPosting v1" pattern Photo/Audio/Video set. Recipe is an even stronger rich-results candidate (Google recipe rich cards: image, time, ingredients). The include throws on a missing template, so `schemas/Recipe.njk` ships **with** `schema: Recipe`. |
| Dish photo | **Optional but encouraged** — reuse the `image` shortcode (`slot="image"`, `imageClass` → `u-photo`) | Johan's call. Present → drives card image, `u-photo`, schema `image`; absent → card, feed, schema degrade gracefully. |
| Card | Bespoke **`card-recipe.njk`** — image-led with a duration/yield badge | Johan's call. Not the shared `card-response.njk`. |
| Archive | **One page, standard chronological grid** at `/recipes/` | Johan's call. No special split (unlike Event's upcoming/past or a Photo masonry); cards in a regular grid, newest-first. |
| Feed | **Yes** — Atom + JSON Feed (like Photo), with a **recipe-aware body** | Johan's call. Recipes don't expire → genuinely followable. The shared bodies emit only `post.content`, so frontmatter ingredients/instructions need a recipe-aware body, not a notes-feed clone. |
| Duration filter | **New filter (to-build)** — accept integer minutes *or* `PT…M`; output (a) human-readable string + (b) normalized `PT…M` | `dates.js` has no duration helper (verified); Audio's `itunes:duration` formatter is a different output shape. The plan's headline mechanism for Recipe. |
| µf2 h-entry nesting | **Deferred + documented** (same caveat as every type) | Johan's call (consistent with Event). Cloning `watching.njk` puts the visible `h-recipe` outside the only h-entry (hidden authorship div). **Sharper here** — Recipe nests a microformat *root* (like Event), not just `u-*` properties — but the fix lands holistically in the webmention milestone, not as a one-off. |
| Nav | Add `{ text: 'Recipe', url: '/recipes/' }` to the Posts submenu | Substantive content type, not a firehose — discoverable like Event (and feed-bearing). |

---

## Frontmatter → microformats2 / schema mapping

```yaml
title: "Sourdough focaccia"          # p-name / name (required — title-required type)
description: "Olive-oil rich, dimpled flatbread."   # p-summary / description
date: 2026-05-22
recipe:
  yield: "8 servings"                # p-yield / recipeYield
  prepTime: 30                       # integer minutes OR PT…M → schema prepTime
  cookTime: 25                       # integer minutes OR PT…M → schema cookTime
  totalTime: PT4H                    # optional; drives dt-duration / schema totalTime
  ingredients:                       # p-ingredient (repeated) / recipeIngredient[]
    - "500 g bread flour"
    - "12 g fine sea salt"
  instructions:                      # e-instructions / recipeInstructions[] (plain text v1)
    - "Mix flour, water, salt; autolyse 1 hr."
    - "Fold every 30 min, 4 times; proof; bake."
  image: ./focaccia.jpg              # optional → u-photo / schema image
```

| Frontmatter | µf2 (h-recipe) | schema.org Recipe | Notes |
|---|---|---|---|
| `title` | `p-name` | `name` | Required (title-required type). |
| `description` | `p-summary` | `description` | Reuses existing site-wide field. |
| `recipe.yield` | `p-yield` | `recipeYield` | Plain text. |
| `recipe.totalTime` | `dt-duration` | `totalTime` | Normalized `PT…M` via the duration filter. |
| `recipe.prepTime` | — | `prepTime` | schema-only; normalized via filter. |
| `recipe.cookTime` | — | `cookTime` | schema-only; normalized via filter. |
| `recipe.ingredients[]` | `p-ingredient` ×n | `recipeIngredient[]` | String array. |
| `recipe.instructions[]` | `e-instructions` | `recipeInstructions[]` | Plain-text v1; `HowToStep` objects deferred. |
| `recipe.image` | `u-photo` | `image` | Optional. |
| (site author) | `p-author` | `author` | From `personal.yaml`. |
| `date` | `dt-published` | `datePublished` | Existing post date. |

**Time model rule (v1):** `recipe.totalTime` drives `dt-duration` (µf2's single total) + schema
`totalTime`; `prepTime`/`cookTime` are schema-only enrichment. Deriving `totalTime = prepTime +
cookTime` when omitted is a build detail (it means summing two normalized durations) — see gaps.

---

## Duration filter (`src/_config/filters/` — the headline to-build)

The plan wants a filter accepting **both** integer minutes *and* `PT…M`. New build work (no
duration filter exists). Two outputs from one input (`30` or `PT4H`):

- **(a) Human-readable** for the page/card — `"4 hr"`, `"55 min"`, `"1 hr 30 min"`.
- **(b) Normalized `PT…M`** for `dt-duration` (µf2) and schema `prepTime`/`cookTime`/`totalTime`.

Likely shape: a `duration.js` filter module exporting `formatDuration` (→ human-readable) +
`toISODuration` (→ `PT…M`), or a single helper returning both. Registered in `eleventy.config.js`
alongside the other filters. The spec names the approach and marks it planned/to-build — it does
**not** present a finished filter.

---

## Layout (`src/_layouts/recipe.njk`)

Clone `watching.njk`. Render the visible `h-recipe` block above `.e-content`: `p-name` (title),
`p-summary` (description), `p-yield`, the durations via `<time datetime>` (`dt-duration` from
`totalTime`; prep/cook rendered human-readable), the ingredients as a `<ul>` of `p-ingredient`
items, the instructions as an `<ol>` carrying `e-instructions`, and the optional dish photo
(`u-photo` via the `image` shortcode). Keep the hidden `h-entry` authorship block, `entry-header` /
`entry-footer`, and the local `{% css %}` block. Set `schema: Recipe` (requires `schemas/Recipe.njk`
— see Grounding).

**µf2 h-entry nesting caveat (deferred, documented — sharper than the media types):** cloning
`watching.njk` puts the visible `h-recipe` *outside* the only `h-entry` (the hidden authorship div).
Recipe nests a microformat *root* (like Event), so a strict mf2 parser sees an orphaned `h-recipe`
rather than one tied to the post's `h-entry`. Accepted for v1 (webmention sending isn't wired yet);
fixed holistically in the webmention milestone, not as a Recipe-only one-off.

---

## Archive (`src/pages/recipes.njk`)

One page at `/recipes/`, a single chronological list rendered from `collections.recipe`
(`byCategory('recipe')`, newest-first). Cards render `card-recipe.njk` in a standard grid — no
masonry, no upcoming/past split.

---

## Feed (`src/feeds/recipes.xml.njk` + `recipes.json.njk`)

Atom + JSON Feed (the followable-type pattern, like Photo) — **not** the Audio/Video RSS 2.0 podcast
shape. Because ingredients/instructions live in **frontmatter**, the feeds use a **new recipe-aware
body** (`src/_includes/feeds/recipe-body.njk`) that emits `post.content` **plus** the structured
ingredients/instructions (and yield/time), so subscribers get the whole recipe — a notes-feed clone
of `atom-body.njk`/`json-body.njk` would emit only `post.content` and drop them (verified). Feed
date/URL formatting reuses the registered RSS plugin's helpers (`dateToRfc3339`, `absoluteUrl`,
`getNewestCollectionItemDate`).

---

## New build artifacts the spec describes (none exist yet — all to-build)

- `src/posts/recipe/recipe.json` — data file (`layout: recipe`, `category: recipe`, `schema: Recipe`,
  permalink `/recipes/{{ page.fileSlug | slugify }}/index.html`).
- `src/_layouts/recipe.njk` — clone of `watching.njk` + the visible `h-recipe` block.
- `addLayoutAlias('recipe','recipe.njk')` in `eleventy.config.js`.
- `recipe` added to `POST_TYPES` in `src/_config/collections.js`.
- `src/pages/recipes.njk` — single chronological archive.
- `src/_includes/partials/card-recipe.njk` — image-led card (dish photo, title, duration/yield badge).
- `src/_includes/schemas/Recipe.njk` — **real schema.org Recipe JSON-LD** (v1 target, not deferred).
  Hard prerequisite for `schema: Recipe` (the include throws on a missing template).
- **Duration filter** in `src/_config/filters/` (e.g. `duration.js` exporting `formatDuration` /
  `toISODuration`) — accepts integer minutes *or* `PT…M`; outputs human-readable + normalized
  `PT…M`. Registered in `eleventy.config.js` like the other filters.
- `src/feeds/recipes.xml.njk` + `src/feeds/recipes.json.njk` — Atom + JSON Feed (the verified `jams.xml.njk` Atom convention).
- `src/_includes/feeds/recipe-body.njk` — recipe-aware feed body (content + ingredients/instructions).
- `src/_data/navigation.js` — one Posts-submenu entry (`Recipe` → `/recipes/`).
- Duration/yield-badge CSS — small block (likely `src/assets/css/global/blocks/` or a local
  `{% css %}`), to-build. Specs are doc-only; the spec names it as a gap, doesn't write it.
- sample page (`draft: true`) with `recipe:` frontmatter (ingredients, instructions, a time, optional
  dish photo), so the page + card + feed render.

## Open items the spec marks as gaps (not invented)

- **Duration filter exact wiring** — `PT…M` parse scope (hours + minutes; days/seconds?), summing
  `prepTime + cookTime` into `totalTime` when omitted (means adding two normalized durations), and
  exact registration are build details. The spec names the approach, not a finished filter.
- **`HowToStep` instruction objects** — v1 is plain-text `recipe.instructions[]`; per-step
  image/time/name (`HowToStep`) deferred.
- **Structured nutrition** — `p-nutrition` / schema `nutrition` (`NutritionInformation`) deferred.
- **`recipe-body.njk` field coverage** — exact rendering of ingredients/instructions in the feed
  (HTML list appended to `post.content` vs structured) is a build detail; v1 names the recipe-aware
  approach.
- **`schemas/Recipe.njk` field coverage** — v1 covers `name`/`description`/`recipeYield`/`prepTime`/
  `cookTime`/`totalTime`/`recipeIngredient`/`recipeInstructions`/`image`/`author`/`datePublished`;
  `aggregateRating`, `video`, `keywords`, `recipeCategory`, `recipeCuisine` deferred.
- **Duration/yield-badge CSS** — named as to-build; exact tokens/markup a build detail.
- **h-entry nesting fix** — deferred to the webmention milestone (shared caveat, sharper for Recipe
  as it nests a microformat root).
