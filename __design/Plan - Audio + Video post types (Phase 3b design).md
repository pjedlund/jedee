# Design increment — Audio + Video post types (Phase 3b)

**Date:** 2026-05-22
**Status:** design approved; specs to be written (`__project_docs/audio-spec.html`, `__project_docs/video-spec.html`).
**Source of truth:** `_generated/Plan - Phase 3 (10 new post types) - final.md` §"Phase 3b — heavy 5".
**Purpose:** settle the Audio + Video types' shape *before* writing their specs, so the specs assert
real decisions rather than invented detail (the failure mode the Phase 3b handoff warns against).

Audio + Video are the second heavy increment (after Photo). They are **creator-side siblings**
(locked decision: 15 types) and are designed **together** because they share the hosted-media
pattern: enclosure derivation, the RSS 2.0 media feed, bespoke media-led cards, and the
`watching.njk` layout clone. Event and Recipe each get their own later increment.

---

## Grounding (verified against the code, 2026-05-22)

These reads gate the honest framing of the specs:

- **Schema include throws on a missing template.** `src/_includes/head/schema.njk:3-4` is
  `{% if schema %}{%- include "schemas/" + schema + ".njk" -%}{% endif %}`. Only
  `src/_includes/schemas/BlogPosting.njk` and `WebSite.njk` exist — so `AudioPosting`/`VideoPosting`
  cannot be asserted as wired; the spec documents them as the planned target, to-build.
- **The whole feed layer is Atom + JSON Feed.** Every `src/feeds/*.xml.njk` includes
  `feeds/atom-body.njk` (verified `jams.xml.njk`); `*.json.njk` includes `feeds/json-body.njk`.
  Both shared bodies emit **only** `post.content` via `renderTransforms` (`atom-body.njk:37-39`,
  `json-body.njk:27`) — no frontmatter fields, no enclosure, no iTunes. A podcast RSS 2.0 feed is a
  **fundamentally new template**, not a clone.
- **No enclosure/MIME/stat filter exists.** `src/_config/filters/` holds only category, dates,
  dtcg, markdown-format, slugify, sort-alphabetic, sort-random, splitlines, striptags. The
  `<enclosure>` byte-length + MIME derivation is real build work.
- **But the RSS plugin already ships the feed date/URL filters.** `@11ty/eleventy-plugin-rss` is
  registered (`eleventy.config.js:68`) and provides `dateToRfc822` (`rssPlugin.js:21`),
  `dateToRfc3339`, `absoluteUrl`, and `getNewestCollectionItemDate`. So the RSS `pubDate` is **not**
  new work — the only feed formatter to-build is `itunes:duration` (ISO-8601 → `HH:MM:SS`).
- **Video embeds already have first-class WebC components.** `src/_includes/webc/custom-youtube.webc`
  (lite-youtube + opengraph poster, `@slug`/`@start`/`@label`/`@poster`/`@posterSize`/`@jsapi`) and
  `custom-peertube.webc` (sandboxed iframe, `@instance`/`@embed-slug`/`@slug`/`@start`/`@label`).
  Self-hosted video uses a `<video>` element.
- **WebC components render in `.njk`/`.md`.** The WebC plugin is registered with `useTransform: true`
  (`eleventy.config.js:71-74`), so `<custom-youtube>`/`<custom-peertube>` are processed in **all**
  output HTML, not only `.webc` files (proof: `src/posts/articles/2022/2022-10-31-post-with-video.md:16`
  uses `<custom-youtube>` directly in a markdown body; attrs documented in `src/posts/docs/video.md`).
  The Video layout's `video.provider` switch can render them directly.
- **Clone target.** `src/_layouts/watching.njk` — `layout: base`, `schema: BlogPosting`,
  `entry-header`, a hidden `<data class="u-watch-of">`, `.e-content`, `backlinks.njk`,
  `entry-footer`, and the hidden `h-entry` authorship div, plus a local `{% css %}` block
  (`post.css` + `footnotes.css`).

---

## Shared locked decisions (both types)

| Decision | Choice | Why |
|---|---|---|
| Sibling design | Audio + Video designed + spec'd in one increment | Locked 15-types decision; they share enclosure/feed/card/layout patterns. |
| Layout base | Clone `watching.njk` | Same proven base as Photo; carries µf2 `<data>` slot, `.e-content`, hidden h-entry authorship. |
| Schema (v1) | **`BlogPosting`** | The include throws on a missing template; `AudioObject`/`VideoObject` don't exist. Consistent with Photo + light types. |
| Schema (target) | `AudioPosting`/`VideoPosting` envelope embedding `AudioObject`/`VideoObject` — **documented, to-build** | The plan's intent; spec describes the shape but marks the template as not-yet-wired (a Phase-4 follow-up). |
| Permalink | **Title-optional** — `/<namespace>/{{ page.fileSlug \| slugify }}/index.html` | Plan marks only Recipe/Event title-required; consistent with Photo. Feed needs a title → computed fallback for title-less entries. |
| Feed format | **RSS 2.0** (new, not the Atom/JSON shared bodies) | A real podcast/vodcast feed needs `<enclosure>` + the `itunes:` namespace; the shared bodies emit only `post.content`. |
| Enclosure | New filter: resolve bundle-relative `src` → source file, `fs.stat` → byte length, extension→MIME | No existing filter; `length`/`type` can only come from a local file at build. |
| Poster/artwork | Reuse the `image` shortcode (`slot="image"`, `imageClass`) — the Photo pattern | `<picture slot="image">` drops straight into `<custom-card>`. |
| Cards | Bespoke media-led `card-audio.njk` / `card-video.njk` — **not** `card-response.njk` | Media types are image/player-led with a duration badge. |
| µf2 h-entry nesting | **Deferred + documented** (same caveat as every type) | Cloning `watching.njk` puts the visible `u-audio`/`u-video` outside the only h-entry (the hidden authorship div). Accepted for v1 (webmention sending not wired); fixed in the webmention milestone. |

---

## Audio (`category: audio`, namespace `/audio/`)

| Aspect | Choice |
|---|---|
| Media model | **Self-hosted file in a page bundle** — `audio: { src: ./episode.mp3, duration, episode, season }`. (Podcast `<enclosure>` requires a real local file to `stat`.) |
| µf2 | `u-audio` on the audio source |
| Layout | `src/_layouts/audio.njk` — clone `watching.njk`; render `<audio controls>` (carrying `u-audio`) above `.e-content`; episode artwork via the `image` shortcode |
| Transcript | **Co-located bundle file** (`transcript: ./episode.vtt`); surfaced on-page in a `<details>` / `<custom-details>` disclosure; emitted in the feed as `<podcast:transcript url type>` |
| Feed | `src/feeds/audio.xml.njk` → new `feeds/podcast-body.njk` (RSS 2.0): channel `itunes:author` / `itunes:image` (**required by Apple**) / `itunes:category` / `itunes:explicit` / `itunes:owner`; items `<enclosure url length type>`, `itunes:duration`, `itunes:episode`, `<podcast:transcript>` |
| Schema | `BlogPosting` v1; planned `AudioPosting` + `AudioObject` (to-build) |
| Card | `card-audio.njk` — episode artwork + duration badge |
| Permalink | `/audio/{{ page.fileSlug \| slugify }}/index.html` (title-optional; feed fallback title) |
| Nav | `{ text: 'Audio', url: '/audio/' }` in the Posts submenu |

## Video (`category: video`, namespace `/videos/`)

**The discriminator drives the layout:**

```yaml
video:
  provider: youtube     # youtube | peertube | file
  slug: dQw4w9WgXcQ     # youtube / peertube
  instance: ...         # peertube only
  embedSlug: ...        # peertube only
  src: ./clip.mp4       # file only → enclosure-able
  poster: ./poster.jpg
  duration: PT3M20S
```

| Aspect | Choice |
|---|---|
| Media model | **Both** — self-hosted `<video poster>` OR embed. Reuse existing `custom-youtube.webc` / `custom-peertube.webc`. |
| µf2 | `u-video` (self-hosted `<video>`) |
| Layout | `src/_layouts/video.njk` — clone `watching.njk`; switch on `video.provider`: `file` → `<video class="u-video" poster>`, `youtube` → `<custom-youtube>`, `peertube` → `<custom-peertube>` |
| Feed | `src/feeds/videos.xml.njk` → the shared `podcast-body.njk` (RSS 2.0). **Asymmetry:** `file` entries get an `<enclosure>`; embed entries have no local file → link to the watch/embed URL, no enclosure |
| Schema | `BlogPosting` v1; planned `VideoPosting` + `VideoObject` (to-build) |
| Card | `card-video.njk` — poster + duration badge + play affordance |
| Permalink | `/videos/{{ page.fileSlug \| slugify }}/index.html` (title-optional) |
| Nav | `{ text: 'Video', url: '/videos/' }` in the Posts submenu |

---

## New build artifacts these specs describe (none exist yet — all to-build)

- `src/_config/filters/enclosure.js` — bundle-relative `src` → source file path, `fs.stat` byte
  length + extension→MIME. (Exact path-resolution wiring is a build detail; the spec names the
  approach, not a finished solution.)
- `itunes:duration` formatter (ISO-8601 → `HH:MM:SS`) — the **only** feed date/format filter to-build;
  `dateToRfc822` + `absoluteUrl` already ship with the registered RSS plugin (see Grounding).
- Passthrough-copy rule for co-located media (`.mp3`/`.m4a`/`.mp4`/`.webm`/`.vtt`) — Eleventy Image
  only handles images, so the audio/video/transcript files need `addPassthroughCopy` for the
  on-page player + enclosure URLs to resolve.
- `src/_includes/feeds/podcast-body.njk` — RSS 2.0 + `itunes:` namespace + `<podcast:transcript>`.
  Shared by both Audio and Video feeds (Video uses enclosure-or-link per entry).
- `src/_includes/schemas/AudioObject.njk` / `VideoObject.njk` + the `AudioPosting`/`VideoPosting`
  envelopes — **documented as the planned target, not asserted as wired** (the include throws).
- `src/_includes/partials/card-audio.njk` / `card-video.njk` — media-led cards.
- `src/_layouts/audio.njk` / `video.njk` + `addLayoutAlias` for each in `eleventy.config.js`.
- `audio` / `video` added to `POST_TYPES` in `src/_config/collections.js`.
- `src/pages/audio.njk` / `videos.njk` — archive pages.
- `src/feeds/audio.xml.njk` / `videos.xml.njk`.
- `src/_data/navigation.js` — two Posts-submenu entries.
- sample page bundles (`draft: true`) per type, with co-located media + (Audio) transcript.

## Open items the specs mark as gaps (not invented)

- **Enclosure filter exact wiring** — approach named (`fs.stat` + MIME lookup, bundle-relative
  resolution); precise path resolution deferred to build.
- **`podcast-body.njk` field coverage** — the iTunes/podcast namespace is broad; v1 covers the
  required + common tags (author, image, category, explicit, owner, duration, episode, transcript);
  exhaustive coverage deferred.
- **Video feed enclosure-vs-link asymmetry** — embed entries carry no enclosure; spec documents the
  rule, exact per-entry conditional is a build detail.
- **`AudioObject` / `VideoObject` schema embed** — Phase-4 follow-up; v1 stays `BlogPosting`.
- **h-entry nesting fix** — deferred to the webmention milestone (shared caveat).
- **Channel-level podcast artwork source** — `itunes:image` requires a channel artwork URL; where
  it lives (meta vs a dedicated podcast data file) is a build detail to settle when wiring the feed.
