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

---

## Enrichment increment (2026-06-09)

Enriched after reviewing the master file for **Pier 4, Ribersborg** against the rendered
page. Built + verified in-browser; the map is dormant until a key is set.

**Added (authored capture facts):** `photo.format` (e.g. "6×17") and `photo.exposure`
(e.g. "60 seconds") — the *real* pinhole exposure, distinct from the scanner's shutter
(which the page already labels "scan"). Both surfaced under Capture.

**Removed:** the "Pinhole: Lower" display row (redundant with the camera model); `exif.js`
no longer returns `pinhole`/`lens`.

**Downloads reshaped** from a single object to a **labeled list** `[{label, url, format,
width?, height?, bytes}]`. Convention: the **first** entry is the full-size raster (carries
width/height) and drives both the lightbox (`photo.njk`) and the Resolution row — Nunjucks
has no `selectattr`. Pier 4 now offers two self-hosted tiers: Full-size JPEG (11 MB) + the
true Original scan TIFF (146 MB), fixing the "original" misnomer. Sizes shown in decimal MB.

**Static map** — `partials/photo-map.njk`: a build-time Geoapify static-map image self-hosted
by the eleventy-img transform (the remote-cover pattern), placed right of the capture details
via `.sidebar[data-direction="rtl"]` (stacks on mobile). Gated on `MAP_API_KEY` →
`meta.mapApiKey`. `eleventy:optional="placeholder"` ⇒ a failed/absent key degrades to a
placeholder with **no key leak**; the place name links to OSM whenever the map is absent.

**Two constraints discovered during build (recorded so they aren't re-litigated):**

1. **The committed web asset is a stripped export.** It keeps IPTC `Keywords` +
   camera/place/GPS/dates, but Lightroom dropped XMP `aux:IsMergedPanorama` and `dc:subject`.
   So the planned **panorama row + clean keyword line were dropped** — they can't be read from
   the build's source image (only the original on the drive has them). Revisit only by changing
   the export to preserve XMP, or by authoring the fields.
2. **The eleventy-img HTML transform runs BEFORE the WebC transform.** A WebC-emitted remote
   `<img>` is therefore never seen by it and ships the **raw keyed URL** unprocessed (verified
   with a dummy key). The map must be **Nunjucks-emitted** (a `<photo-map>` WebC was built first,
   then replaced). Self-hosted remote images in this stack must be a plain `<img … | safe>` in a
   template, never inside a WebC component.

**Follow-up refinements (same day):** the frontmatter `description` now renders as a visible lede
(`<p class="intro | text-step-1">`, new `.intro` block in `post.css`); the photo breaks out wider
than the prose column via `.feature` (a `<div class="feature">` wrapper around the lightbox; `sizes`
bumped to `(min-width: 82rem) 78rem, 100vw` so retina still gets the 2000w candidate); and an
authored `photo.scanner` (e.g. "Sony a7") shows in the technical block — the scanner *body* isn't in
clean EXIF because `Make`/`Model` were overwritten to the film camera (only the scan *lens* survives).
The `format` value stays bare `6×17` — centimetres (120 medium format); inch marks would misread as
large-format.

**Still open:** sign up for a Geoapify free key + set `MAP_API_KEY` (.env + Netlify) to activate
the map. Optional later: authored `photo.angleOfView`; panorama/keywords (pending an export
change); slug-align the TIFF filename.
