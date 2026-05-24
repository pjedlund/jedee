# Design increment — Photo post type (Phase 3b)

**Date:** 2026-05-22
**Status:** design approved; spec to be written (`__project_docs/photo-spec.html`).
**Source of truth:** `_generated/Plan - Phase 3 (10 new post types) - final.md` §"Phase 3b — heavy 5".
**Purpose:** settle the Photo type's shape *before* writing its spec, so the spec asserts real
decisions rather than invented detail (the failure mode the Phase 3b handoff warns against).

This is the first of the five heavy-type design increments. Audio + Video, Event, Recipe each get
their own — Photo does not establish their field shapes.

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Image model | **Single photo only**; gallery deferred | Ships the one-shot default now; the gallery half of the plan's bullet is documented as a future opt-in, not invented. |
| Single-photo field | **Nested object** `photo: { src, alt, caption }` | Groups the photo's data; maps 1:1 to the `image` shortcode's positional `(src, alt, caption)`. |
| `alt` | **Required by convention** (the photo *is* the content) | EE's `image` shortcode does **not** enforce alt — it defaults `alt = ''` and only throws on missing `src` (`src/_config/shortcodes/image.js:21,93`). So the requirement is a Photo-type rule, not an EE guarantee — the spec must say so plainly. |
| Permalink | **Title-optional** — `/photos/{{ page.fileSlug \| slugify }}/index.html` | Photo posts are often captionless. The plan marks only Recipe/Event title-required, not Photo. |
| Plural namespace | `/photos/` (post page + archive + feed) | Matches the shipped `/notes/`, `/jams/` convention. |
| µf2 | `u-photo` on the `<img>`, with `alt` | Plan's Photo bullet. |
| Card | **New `card-photo.njk`** (image-led), *not* `card-response.njk` | The `image` shortcode emits `<picture slot="image">`, so the photo fills `<custom-card>`'s image slot. |
| Archive | Masonry grid of `card-photo` cards via `archive-listing.njk` + `<custom-masonry>` | Mirrors the `watching.njk` page pattern. |
| Feed | **Yes** — `/photos/feed.{xml,json}` | Photo posts are followable ("photoblog"). |
| Schema | **`BlogPosting`** (unchanged) | The plan gives only Audio/Video the embedded-object treatment; Photo isn't called out. `ImageObject` embed is a possible Phase-4 follow-up. |
| Nav | Add `{ text: 'Photo', url: '/photos/' }` to the Posts submenu | Consistent with how feed-bearing types are surfaced. |

## Layout (`src/_layouts/photo.njk`)

Clone `watching.njk`. Render the photo above `.e-content` via the `image` shortcode, carrying
`u-photo` + `alt`. Keep the hidden `h-entry` authorship block, `entry-header` / `entry-footer`,
and `schema: BlogPosting`.

**µf2 h-entry nesting caveat (deferred, documented — same as Phase 3a):** cloning `watching.njk`
puts the visible `u-photo` / `.e-content` *outside* the only `h-entry` (the hidden authorship div),
so a strict mf2 parser won't tie the photo to the response's h-entry. Accepted for v1 (webmention
sending isn't wired yet); fixed in the webmention milestone.

## Feed wrinkle (the one real implementation detail)

The shared feed bodies emit **only** `post.content` (the rendered markdown body via
`renderTransforms`) — they render no frontmatter fields (`src/_includes/feeds/atom-body.njk:37-39`,
`src/_includes/feeds/json-body.njk:27`). Because the photo lives in `photo:` frontmatter, a naive
clone of the notes feed would emit Photo entries **with the image missing**.

The Photo feed therefore needs a **photo-aware body** that renders the photo as an
**absolute-URL `<img>`** (alt included) ahead of `post.content`. Recommended: a small photo-feed
body variant rather than editing the shared body that 5 shipped feeds depend on. The exact
mechanism is a Phase-3b implementation detail — the spec flags it as a gap, it does not assert a
finished solution.

## Per-type footprint (when built — for reference, not built now)

- `src/posts/photo/photo.json` — data file (`layout: photo`, `category: photo`, permalink).
- `src/_layouts/photo.njk` — clone of `watching.njk` + photo block.
- `addLayoutAlias('photo','photo.njk')` in `eleventy.config.js`.
- `photo` added to `POST_TYPES` in `src/_config/collections.js`.
- `src/pages/photos.njk` — masonry archive.
- `src/_includes/partials/card-photo.njk` — image-led card.
- `src/feeds/photos.{json,xml}.njk` — photo-aware feed (see wrinkle).
- `src/_data/navigation.js` — Posts submenu entry.
- sample `.md`.

## Open items the spec marks as gaps (not invented)

- **Gallery frontmatter shape** — deferred; future opt-in reusing EE's existing `gallery:` verbatim.
- **Photo-feed body mechanism** — recommended approach named; exact wiring deferred to build.
- **h-entry nesting fix** — deferred to the webmention milestone.
- **`ImageObject` schema embed** — possible Phase-4 follow-up; not specified now.
