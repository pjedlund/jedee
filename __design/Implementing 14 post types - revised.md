# Implementing 15 post types (revised)

> ⚠ **Legacy design reference.** Superseded by `_generated/Plan - Phase 3 (10 new post types).md`
> (the authoritative plan) on the **collection mechanism** — `byCategory()` filtering `data.category`,
> **not** `eleventyComputed.tags` — and on **field naming** — camelCase `bookmarkOf`, **not** `bookmark-of`.
> The count is now **15 types** (Video accepted as Audio's creator-side sibling). Kept for design
> rationale; **do not follow its per-type snippets verbatim.** Filename keeps "14" for link stability.
>
> **Source:** `src/posts/articles/-drafts/Implementing 14 post types.md`
> **Revised:** 2026-05-19 — incorporates decisions from a four-round review session.
> **Status:** Legacy reference (demoted 2026-05-21). Decisions locked; open questions deferred to follow-up sessions.

## Brief

Extend the current installation of JEDEE with more post types so they become 14 in total. Leave the `src/posts/docs` folder where it is — that's Lene's `get-started` page loader, not a post type.

**v1 scope (this milestone):**

- All 14 post types ship and are always-on. Feature-flag gating (`src/_data/features.yaml`) is deferred; once it lands, defaults per type can switch on/off.
- Webmention rendering is stub-only in v1: every post layout includes `partials/webmentions.njk` (initially a no-op) and a `<link rel="webmention" ...>` in `<head>`, so a webmention endpoint can be discovered. Webmention.io fetch wiring is a later task.
- Micropub endpoints are a later task. The plan assumes Micropub-style frontmatter shapes for compatibility with any Micropub client, but no endpoint ships in v1.

We don't need special archive pages for each post type; this is handled already where e.g. a note is at https://jedee.netlify.app/notes/affinity-studio/ and the archive for all notes is at https://jedee.netlify.app/notes/, so that the collection name becomes the archive.

Each post-type folder uses a `<type>.json` data file (e.g. `src/posts/notes/notes.json`) for folder-static values: `tags: "posts"` (a string — EE convention, restored in Phase 1.5), `category: "<type>"`, `layout`, and the permalink template. The tag-cascade computation that makes per-type collections auto-exist (`collections.posts` plus per-type collections like `collections.note`) is registered centrally in `src/_config/collections.js` via a `byCategory()` helper and explicit `addCollection` calls — not per-folder. JSON for folder data matches vanilla EE convention; no per-folder JS is required.

For each type: collection name, frontmatter schema, default layout, feed, and microformats2 notes. Every post-type template renders the (v1-stubbed) webmentions partial and a "respond on your own site" block.

A note on vocabulary: **µf2** is microformats2 — the IndieWeb HTML-class vocabulary (`h-entry`, `p-name`, `u-url`, `dt-published`, etc.) that webmention parsers and IndieWeb readers consume. The spec lives at [microformats.org/wiki/microformats2](https://microformats.org/wiki/microformats2); per-post-type property names are documented at [indieweb.org/Posts](https://indieweb.org/Posts).

## Decisions captured in this revision

1. **The 14 types are:** Note, Article, Bookmark, Like, Photo, Audio, Reply, Repost, RSVP, Event, Watching, Reading, Jam, **Recipe** (new — the 14th). `docs/` is Lene's get-started page loader, not a post type. Watching and Reading use the gerund form for both type name and URL slug; the music type is **Jam** (after *This Is My Jam*) — a strong endorsement, not a passive scrobble of whatever's playing on the radio (see §§15–16 below).
2. **`features.yaml` is deferred.** All 14 ship always-on in v1. The "default on/off" matrix below documents intended future defaults for when gating lands.
3. **State-tracking trimmed in v1:**
   - **Reading** loses `read-status` / `dateStarted` / `dateFinished`. A Reading post means "I read this book" (finished). The to-read → reading → finished workflow is deferred — it needs a product decision about whether transitions should bump posts to the top of feeds via `<updated>`.
   - **Event** keeps `status: scheduled | cancelled | postponed | rescheduled` (cheap, ~15 lines of template/JSON-LD work, and "is this still happening?" is the first thing a reader needs to know).
   - **RSVP** keeps `rsvp: yes | no | maybe | interested` — it's the post type's payload, not metadata.
4. **Webmentions:** stub partial + `<link rel="webmention">` in v1; webmention.io fetch wiring later.
5. **Recipe** uses the full schema.org `Recipe` shape (prepTime / cookTime / recipeYield / recipeIngredient[] / recipeInstructions[] etc.) with an `h-entry` envelope + nested `h-recipe` (mirrors Event's `h-entry` + `h-event` pattern). JSON-LD: `Recipe`.
6. **Tag placeholders dropped from every snippet.** The rule "post-type names are NOT user tags" stays — documented once in the tag-taxonomy section instead of repeated in every snippet.
7. **Bookmark gets both `.xml` and `.json` feeds** like the other feed-on types (no special-case).
8. **All post-type folders are flat** — articles included. The earlier intent to bucket articles by `{YYYY}/` is dropped. Pre-existing articles still live in `src/posts/articles/{YYYY}/` subfolders; no migration is planned, and new articles can land at the folder root. Folder structure doesn't drive URLs (permalinks are template-driven), so the mix is cosmetic.
9. **Permalink slug source** is intentional and consistent: title-required types (Article, Event, Recipe) use `{{ title | slugify }}`; title-optional types use `{{ page.fileSlug | slugify }}`. The `| slugify` filter is what kebab-cases filenames like `310 to Yuma.md` → `/watching/310-to-yuma/` — without it URLs contain literal spaces. The global `nice-permalinks` skill's `{{ id }}` pattern is Tolstoy-specific and does not apply to JEDEE (no `id:` frontmatter convention exists here).
10. **Sparkles references stripped throughout.** The plan refers to **Micropub clients** in general — any compliant client can author any type. Micropub endpoints themselves are a later task.
11. **Cross-references to §7, §11, M4, M9 removed** — those belong to the parent plan (`_generated/jedee-template-plan.md`) this doc was split out of.
12. **POSSE `syndication:` field** stays in common frontmatter and renders `.u-syndication` when present. No fetcher ships in v1; Bridgy / brid.gy is the leading direction for later automation.
13. **µf2 verification tool:** [indiewebify.me](https://indiewebify.me/). Workflow (manual spot-check vs CI fetch) is an open question — see below.
14. **Build-time strategy:** ship all per-type feeds in v1, measure baseline, drop firehose-y ones (Bookmark / RSVP / Watching / Reading / Jam are the candidates) only if measurement shows feed templates as a class cost more than a few hundred ms.
15. **Reading and Watching keep the gerund form.** Folder slugs `reading/` and `watching/` are kept — IndieWeb conformance lives in the µf2 property names (`u-read-of`, `u-watch-of`), not the URL slug. The gerund form is also what Jeremy Keith (`/notes/reading/`) and other long-running IndieWeb sites use. Internal collection/layout names match (`allReading` / `allWatching`; `reading.njk` / `watching.njk`).
16. **Music type is Jam — semantic loading wins over symmetry with Reading/Watching.** IndieWeb distinguishes Listen (passive scrobbles) from Jam (curated picks, after *This Is My Jam*). The repo's existing `listening/` posts are curated commentary — Jam-shaped — so the type name is **Jam** and the URL slug becomes `/jams/`. The asymmetry with `reading/` and `watching/` is deliberate: "Jam" carries the endorsement; "Listening" reads as scrobble-shaped (what happens to be playing). Phase 2 renames `src/posts/listening/` → `src/posts/jams/` and adds Netlify `_redirects` for the old URLs. If a future scrobble feed lands, it can be a separate `Listen` type at `/listening/` without colliding with Jam.

## Open questions for follow-up sessions

- **Audio / Video / Jam / Watching overlap.** The IndieWeb split at indieweb.org/Posts is creator vs consumer:

  | Media | Creator | Consumer log |
  |---|---|---|
  | Image | Photo | — |
  | Audio | Audio (podcasts I host) | Jam |
  | Video | Video (videos I host / embed) | Watching |
  | Text | (Note / Article) | Reading |

  Adding Video for symmetry would push the total to 15. Three resolution paths to evaluate in a dedicated session:

  a) **Accept 15** — fight the number, not the taxonomy. The creator/consumer media axis becomes symmetric and explainable.
  b) **Stay at 14 by merging** Audio + Video into one "Media" type with a `mediaType:` field. Simpler folder layout, fuzzier µf2/JSON-LD per item.
  c) **Stage Video for v1.1** — ship 14 with Recipe now; add Video later. Card-mapping section keeps a "Video coming later" note instead of a real snippet.

- **µf2 verification workflow.** indiewebify.me is the tool. Open: manual spot-check during authoring, or a CI step that fetches the production URL after each deploy?

- **Per-type feed pruning by build cost.** Measure baseline; firehose-y candidates (Bookmark, RSVP, Watching, Reading, Jam) only get dropped if measurements justify it.

- **Reading state-tracking** (`read-status` + `dateStarted` / `dateFinished`). Deferred because of the unresolved feed-bump-on-transition product question, not because the schema is hard.

- **Feature-flag system** (`src/_data/features.yaml`). Scope, defaults table, and gating mechanism need their own task.

## Common frontmatter fields (all post types)

These fields are valid on **every** post type. They're documented once here so the 14 per-type snippets below can stay focused on type-specific frontmatter. Per-type fields like `photo:` / `poster:` / `cover:` / `albumArt:` take precedence over the generic `image:` for type-specific rendering.

```yaml
# Always-available fields. `title` and `date` are required for everything that should appear in
# feeds and archives; the rest are optional unless flagged.
title:         ""                # Post title. Required for title-required types (Article, Event,
                                 # Recipe); optional for title-optional types (Note, Reading,
                                 # Watching, Jam, ...). Drives <title>, archive card headline,
                                 # OG <meta>, µf2 .p-name.
date:          2026-05-15        # Publish date (ISO-8601). Drives Atom <published>, µf2
                                 # .dt-published, archive ordering. REQUIRED — without it,
                                 # Eleventy uses the file's modified time, which is brittle.
tags:                            # User topic tags ONLY (e.g. [indieweb, eleventy]). Post-type
  - indieweb                     # names are NOT user tags — they come from the folder's
  - eleventy                     # `<type>.json` via `tags: "posts"` (string) and the central
                                 # cascade in `collections.js` appending `data.category`. See
                                 # *Tag taxonomy* below.
category:      ""                # Set by the folder data file (e.g. category: "article"). Do
                                 # not set per-post. Used by feed templates, card partials, and
                                 # the entry-footer to filter the per-type tag out of the
                                 # visible tag cluster.
schema:        "BlogPosting"     # JSON-LD @type. Default is set per-type in <type>.json
                                 # (see the JSON-LD / Schema.org mapping table at the end).
                                 # Override per-file when the post is an unusual shape for its type.
draft:         true              # Excluded from collections in production. Every sample ships
                                 # with this set; omit from the snippets below to keep them focused.
description:   ""                # Short summary. Drives OG <meta>, RSS <description>, JSON-LD
                                 # description, and µf2 .p-summary. Auto-derived from the body
                                 # excerpt if omitted (except Article where it's REQUIRED).
image:         ""                # Featured / preview image. Drives OG <meta property="og:image">,
                                 # the archive card's image slot, and µf2 .u-featured. Per-type
                                 # primary-media fields (photo / poster / cover / albumArt) take
                                 # precedence — set image: only when no type-specific media field fits.
alt:           ""                # Alt text for `image:`. Consumed by the {% imageKeys %}
                                 # shortcode in entry-header.njk. Required when image is set.
credit:        ""                # Photo credit / source attribution string for `image:`.
                                 # Rendered next to or below the feature image.
discover:                        # Overrides for share/discovery surfaces when the post body
  title:       ""                # uses markdown the meta layer can't reproduce (e.g. a code-
  description: ""                # heavy `description`). Read by meta-info.njk and the JSON-LD
  image:       ""                # template. All three fields are optional and fall back to
                                 # the top-level `title` / `description` / `image`.
syndication:                     # POSSE/PESOS — URLs where this post was also published.
  - https://mastodon.social/@you/123  # Rendered as µf2 .u-syndication (IndieWeb readers consume).
  - https://bsky.app/profile/.../post/...  # Fetcher/automation deferred — manual or Bridgy later.
updatedDate:   2026-05-16        # ISO-8601 date or datetime. Rendered in entry-header.njk
                                 # ("Updated: ..."), µf2 .dt-updated, and Atom <updated>.
                                 # Distinct from `date:` which is .dt-published. Spec previously
                                 # called this `updated:` — the wired field name is `updatedDate`.
```

Two consistency notes for the per-type snippets that follow:

- **`draft: true` is implicit on every sample.** It's omitted from each per-type snippet below so the type-specific fields read clearly; in the actual sample file on disk, `draft: true` is present.
- **No `tags:` array in per-type samples.** The rule "post-type names are NOT user tags" is enforced by not showing tag placeholders in any per-type snippet — that way nobody copy-pastes `tags: [note]` etc. and accidentally pollutes the `/tags/` index. Authors add real topic tags consciously (e.g. `tags: [indieweb, eleventy]`) when publishing. See *Tag taxonomy* later in this section.

### Note
- **Collection:** `notes` · **Folder:** `src/posts/notes/` · **Layout:** `note.njk`
- **Permalink:** `/notes/{{ page.fileSlug | slugify }}/`
- **Archive:** `/notes/` · **Feeds:** `/notes/feed.xml`, `/notes/feed.json`
```yaml
title: ""              # optional — notes are often title-less
date: 2026-05-15
```
- **µf2:** `.h-entry` with `.p-name` (or `.p-summary` if no title), `.e-content`, `.dt-published`, `.u-author h-card`. No `.u-in-reply-to`.

### Article
- **Collection:** `articles` · **Folder:** `src/posts/articles/` · **Layout:** `post.njk`
- **Permalink:** `/articles/{{ title | slugify }}/`
- **Archive:** `/articles/` · **Feeds:** `/articles/feed.xml`, `/articles/feed.json`
```yaml
title: ""              # required
description: ""        # required
date: 2026-05-15
draft: false
image: ""              # optional cover
```
- **µf2:** `.h-entry` + `.p-name`, `.p-summary` (description), `.e-content`, `.dt-published`, `.u-author h-card`.

### Bookmark
- **Collection:** `bookmarks` · **Folder:** `src/posts/bookmarks/` · **Layout:** `bookmark.njk`
- **Permalink:** `/bookmarks/{{ page.fileSlug | slugify }}/`
- **Archive:** `/bookmarks/` · **Feeds:** `/bookmarks/feed.xml`, `/bookmarks/feed.json`
```yaml
title: ""              # auto-fetched from target page title
date: 2026-05-15
bookmark-of: "https://example.com/article"
```
- **µf2:** `.h-entry` + `.p-name`, `.u-bookmark-of` (anchor to target), `.e-content` (commentary), `.dt-published`, `.u-author h-card`.

### Like
- **Collection:** `likes` · **Folder:** `src/posts/likes/` · **Layout:** `like.njk`
- **Permalink:** `/likes/{{ page.fileSlug | slugify }}/`
- **Archive:** `/likes/` · No feed (low-value firehose; can be re-enabled per project).
```yaml
date: 2026-05-15T10:30:00+02:00
like-of: "https://example.com/post"
```
- **µf2:** `.h-entry` + `.u-like-of` (anchor), `.dt-published`, `.u-author h-card`. No `.p-name`.

### Photo
- **Collection:** `photos` · **Folder:** `src/posts/photos/` · **Layout:** `photo.njk`
- **Permalink:** `/photos/{{ page.fileSlug | slugify }}/`
- **Archive:** `/photos/` (grid) · **Feeds:** `/photos/feed.xml`, `/photos/feed.json`
```yaml
title: ""              # optional
date: 2026-05-15
photo: "./image.jpg"   # auto-optimised via Eleventy Image
alt: ""                # required for a11y
```
- **µf2:** `.h-entry` + `.u-photo` on `<img>`, optional `.p-name`, `.e-content`, `.dt-published`, `.u-author h-card`.
- **Multi-image photo posts** can opt in to EE's existing gallery pattern: set `gallery: [{ image, alt, caption }, ...]` in frontmatter and include `{% include "partials/gallery.njk" %}` in the layout. EE renders a button-grid where each thumbnail opens a `<dialog>` modal (styled by `gallery.css`, behaviour in `gallery.js`). Each image gets its own `.u-photo` inside the `.h-entry`. The single-`photo:` field above is the default for one-shot posts; the gallery is the multi-image variant — no new post type needed.

### Audio
- **Collection:** `audio` · **Folder:** `src/posts/audio/` · **Layout:** `audio.njk`
- **Permalink:** `/audio/{{ page.fileSlug | slugify }}/`
- **Archive:** `/audio/` · **Feeds:** `/audio/feed.xml` (podcast-shaped — RSS 2.0 with `<enclosure>` + iTunes podcast namespace)
```yaml
title: ""              # optional
date: 2026-05-15
audio: "./episode.mp3" # local file, served from /audio/<slug>/episode.mp3
duration: 0            # seconds
alt: ""                # description for accessibility
# Podcast-RSS extras (all optional — episode-level overrides; channel defaults in meta.js):
explicit: false        # iTunes <itunes:explicit>
episode: 0             # iTunes <itunes:episode>
season: 1              # iTunes <itunes:season> — omit for non-seasonal podcasts
episodeImage: ""       # per-episode artwork; falls back to channel image from meta.js
transcript: ""         # URL or co-located file path; rendered as <podcast:transcript> + linked from layout
```
- **µf2:** `.h-entry` + `.u-audio` on `<audio>`, optional `.p-name`, `.e-content`, `.dt-published`, `.u-author h-card`.
- **RSS `<enclosure>` derivation:** the `length` (bytes) and `type` (MIME) attributes required by RSS 2.0 are **derived at build time** by `src/_config/events/build-feed-audio.js` (planned) by `stat`-ing the audio file and inferring MIME from extension — no per-file frontmatter for those two fields.

> **Open question** (see *Audio / Video / Jam / Watching overlap* above): Audio in this plan means **podcasts / audio I host**. A symmetric creator-side "Video" type is unresolved.

### Reply
- **Collection:** `replies` · **Folder:** `src/posts/replies/` · **Layout:** `reply.njk`
- **Permalink:** `/replies/{{ page.fileSlug | slugify }}/`
- **Archive:** `/replies/` · **Feeds:** `/replies/feed.xml`, `/replies/feed.json`
```yaml
date: 2026-05-15T10:30:00+02:00
in-reply-to: "https://example.com/post"
```
- **µf2:** `.h-entry` + `.u-in-reply-to` (anchor), `.e-content`, `.dt-published`, `.u-author h-card`.

### Repost
- **Collection:** `reposts` · **Folder:** `src/posts/reposts/` · **Layout:** `repost.njk`
- **Permalink:** `/reposts/{{ page.fileSlug | slugify }}/`
- **Archive:** `/reposts/` · No feed by default.
```yaml
date: 2026-05-15T10:30:00+02:00
repost-of: "https://example.com/post"
```
- **µf2:** `.h-entry` + `.u-repost-of`, `.dt-published`, `.u-author h-card`.

### RSVP
- **Collection:** `rsvps` · **Folder:** `src/posts/rsvps/` · **Layout:** `rsvp.njk`
- **Permalink:** `/rsvps/{{ page.fileSlug | slugify }}/`
- **Archive:** `/rsvps/` · **Feeds:** `/rsvps/feed.xml`, `/rsvps/feed.json`
```yaml
date: 2026-05-15
in-reply-to: "https://example.com/event"   # the event being RSVPed to
rsvp: "yes"                                 # yes | no | maybe | interested
```
- **µf2:** `.h-entry` + `.u-in-reply-to`, `.p-rsvp` (value `yes`/`no`/`maybe`/`interested`), `.dt-published`, `.u-author h-card`.

### Event
- **Collection:** `events` · **Folder:** `src/posts/events/` · **Layout:** `event.njk`
- **Permalink:** `/events/{{ title | slugify }}/`
- **Archive:** `/events/` (split into upcoming + past; cancelled events stay visible) · **Feeds:** `/events/feed.xml`, `/events/feed.json`
```yaml
title: ""              # required
date: 2026-05-15       # publish date
start: 2026-06-12T18:00:00+02:00
end: 2026-06-12T22:00:00+02:00
location: ""           # plaintext or { name, geo: { lat, lng } } — schema.org Place
description: ""
url: ""                # canonical/registration URL for the event (different from the post permalink)
image: ""              # poster/flyer — schema.org Event.image + OG preview
status: "scheduled"    # scheduled | cancelled | postponed | rescheduled (schema.org eventStatus).
                       #   Cancelled/postponed events stay published — readers need the update.
attendanceMode: "offline"  # offline | online | mixed (schema.org eventAttendanceMode)
```
- **µf2:** `.h-event` (note: not `.h-entry`) with `.p-name`, `.dt-start`, `.dt-end`, `.p-location`, `.p-summary`. Wrap inside an `.h-entry` envelope so the publishing act is still discoverable; the event itself is `.h-event` nested in `.e-content`. Status changes (cancelled/postponed) get a `.p-event-status` span in the layout so it's visually prominent on the event page.
- **Event `status:` implementation footprint** (~15 lines total):
  - `event.njk` adds a conditional `.p-event-status` badge near the date/location block (~3 lines).
  - `card-event.njk` mirrors the same badge so archive cards convey the state.
  - `Event.njk` JSON-LD maps to `eventStatus: "https://schema.org/EventCancelled"` etc. (~5 lines).
  - Archive-split logic explicitly keeps cancelled/postponed events visible in the past list (1 line).

### Watching (movies / shows)
- **Collection:** `watching` · **Folder:** `src/posts/watching/` · **Layout:** `watching.njk`
- **Permalink:** `/watching/{{ page.fileSlug | slugify }}/`
- **Archive:** `/watching/` · **Feeds:** `/watching/feed.xml`, `/watching/feed.json`
```yaml
date: 2026-05-15
watch-of: "https://www.themoviedb.org/movie/12345"   # canonical URL (TMDB, etc.)
title: ""              # film / episode title
year: 2026             # optional release year
rating: ""             # optional — "5/5", "★★★★☆", or omit
poster: ""             # poster URL — required for archive card image
director: ""           # optional, single name or array — schema.org Movie.director
genres: []             # optional array — schema.org Movie.genre
runtime: 0             # optional, minutes — schema.org Movie.duration (ISO-8601 derived at build)
dateWatched: ""        # optional ISO date — distinct from `date:` (which is the post-publish date)
mediaType: "movie"     # movie | tv-episode | tv-series — picks schema.org @type
cast:                  # optional array — schema.org Movie.actor. Each entry can be a plain
                       #   string (just the actor name) or an Obsidian-wikilinked form like
                       #   `[[Glenn Ford]]` so the cast graph becomes navigable in the vault.
  - ""
plot:                  # optional — short plot summary. Distinct from `description:` (drives
                       #   OG/RSS) and from the post body (your commentary). Layouts may render
                       #   this as an "About this film" block above the body.
```
- **µf2:** `.h-entry` + `.u-watch-of` (anchor to canonical URL), `.p-name` (title), `.e-content` (optional commentary), `.dt-published`, `.u-author h-card`, `.u-featured` on the poster image. If `rating` is set, wrap the body in `.h-review` with `.p-rating`.
- **Authoring:** any Micropub client capable of producing an `h-entry` with `category: ["watching"]` and `watch-of: <canonical URL>` works. Rich metadata (poster, director, genres, runtime) can be filled by a TMDB-backed Micropub client, by a build-time fetcher (deferred), or by hand.
- **Importer-emitted extras you may see in real sample files:** `cover` (≈ `poster`), `genre[]` (≈ `genres[]`), `url` + `myUrl` (Letterboxd canonical + personal review URL — one of these becomes `watch-of`; `myUrl`-as-`personalUrl` is an open question for the Clipper work), `scoreLB`, `scoreMy` / `myRating` (≈ `rating`). These come from earlier Letterboxd ingest scripts. (`cast[]` and `plot` were promoted to canonical first-class fields above in the step-2 rework.) The Clipper-as-CMS work (see `_generated/Handoff - Clipper as CMS and co-located covers.md`) will emit canonical-shaped frontmatter going forward and normalize the two existing Watching samples (`310 to Yuma.md`, `Birth.md`).

### Reading (books)
- **Collection:** `reading` · **Folder:** `src/posts/reading/` · **Layout:** `reading.njk`
- **Permalink:** `/reading/{{ page.fileSlug | slugify }}/`
- **Archive:** `/reading/` · **Feeds:** `/reading/feed.xml`, `/reading/feed.json`
```yaml
date: 2026-05-15
title: ""                 # required — book title. Drives the derived h-cite .p-name and
                          #   schema.org Book.name. (A Reading post can be title-optional in
                          #   theory, but every book has a title — treat as required in practice.)
author: ""                # required — primary author. Drives the derived h-cite .p-author
                          #   and schema.org Book.author.
authors: []               # optional — full author list when a book has multiple. If set, the
                          #   first entry should duplicate `author:`. Layouts render the full list.
isbn13: ""                # optional — drives the derived h-cite .u-uid (prefixed `isbn:`)
                          #   and schema.org Book.isbn.
publisher: ""             # optional — schema.org Book.publisher
publishedYear: 0          # optional — original publication year (schema.org Book.datePublished)
pages: 0                  # optional — schema.org Book.numberOfPages
genre: []                 # optional array — schema.org Book.genre
rating: ""                # optional — wraps the body in .h-review with .p-rating when set
cover: ""                 # book cover URL — required for archive card image. Drives µf2 .u-featured
                          #   and schema.org Book.image.
```
- **µf2:** `.h-entry` + `.u-read-of` containing a *derived* `.h-cite`. The `.h-cite` is assembled by the layout from the flat frontmatter fields: `.p-name` from `title`, `.p-author` from `author` (and additional authors from `authors[]`), `.u-uid` from `isbn13` (prefixed `isbn:`). Authors only fill the flat fields above — the nested h-cite is rendered, not authored. Also: `.dt-published`, `.u-author h-card` (the post author, distinct from the book author), `.u-featured` on the cover image. If `rating` is set, wrap in `.h-review` with `.p-rating`.
- **v1 scope:** a Reading post represents "I read this book" (the post existing is the signal). `read-status` / `dateStarted` / `dateFinished` are deferred to a follow-up session that resolves the feed-bump question (does a state transition push the post back to the top of subscriber feeds via `<updated>`, or stay quiet?).
- **Authoring:** any Micropub client capable of producing an `h-entry` with `category: ["reading"]` plus a nested `read-of` `h-cite`. Rich metadata (cover, pages, genre) can be filled by an Open Library / Google Books–backed Micropub client, by a build-time fetcher (deferred), or by hand.
- **Importer-emitted extras you may see in real sample files:** `subtitle`, `publishDate`, `totalPage`, `coverUrl`, `coverSmallUrl`, `link`, `previewLink`, `isbn10`. After step 2's flat-shape decision, the previously-nested fields (`title`, `author`, `authors`, `publisher`, `publishedYear`, `pages`, `cover`, `isbn13`) are now first-class — earlier Google Books / Open Library ingest scripts already emit most of these, just under different names: `coverUrl` ≈ `cover`, `totalPage` ≈ `pages`, `publishDate` ≈ `publishedYear`. The Clipper-as-CMS work (see `_generated/Handoff - Clipper as CMS and co-located covers.md`) will emit canonical-shaped frontmatter going forward and normalize the existing Reading samples (`Anna Karenina - Leo Tolstoy.md`, `The Kingdom of God is Within You - Leo Tolstoy.md`, `Drottningar i Kungahalla/`).

### Jam (a song I'm really into)
- **Collection:** `jams` · **Folder:** `src/posts/jams/` · **Layout:** `jam.njk`
- **Permalink:** `/jams/{{ page.fileSlug | slugify }}/`
- **Archive:** `/jams/` · **Feeds:** `/jams/feed.xml`, `/jams/feed.json`
- **Semantics:** named after *[This Is My Jam](https://thisismyjam.com/)*. A Jam is a strong endorsement — "this is what I'm into right now" — not a passive scrobble of whatever happens to be playing. A separate IndieWeb-style `Listen` type for actual scrobbles could land later at `/listening/` without colliding with Jam.
```yaml
date: 2026-05-15
listen-of: "https://example.com/track"   # canonical URL of track (or album, if albumArt is set)
artist: ""
title: ""
album: ""              # optional — when this post is about an album rather than a single track
favoriteTrack: ""      # optional — when posting about an album, the standout track to feature.
                       #   On single-track posts (album: empty), leave blank.
albumArt: ""           # cover image URL — required for archive card; from a MusicBrainz / Apple Music /
                       #   Spotify oEmbed lookup or any Micropub client that resolves the URL
year: 0                # optional release year — schema.org MusicRecording.datePublished
genre: []              # optional array — schema.org MusicRecording.genre
dateListened: ""       # optional ISO date — distinct from `date:` (post-publish date)
```
- **µf2:** `.h-entry` + `.u-listen-of` (anchor to track URL), `.p-name` (artist — track), `.e-content` (optional commentary), `.dt-published`, `.u-author h-card`, `.u-featured` on the album art image.
- **Existing `jams/` sample files still use the Bandcamp-import shape** (carried over from the pre-rename `listening/` era): `artist`, `album`, `title`, `source` (≈ `listen-of`), `image` (≈ `albumArt`), `released` (release date — closer to `year` but more precise). Some samples also include `odeslico` (an Apple-Music / Odesli cross-platform link — open question for the Clipper work: formalize as a `crossPlatformUrl` field, or fold into `syndication[]`?). The Clipper-as-CMS work (see `_generated/Handoff - Clipper as CMS and co-located covers.md`) will emit canonical-shaped frontmatter going forward and normalize the existing Jam samples.

### Recipe (NEW — the 14th)
- **Collection:** `recipes` · **Folder:** `src/posts/recipes/` · **Layout:** `recipe.njk`
- **Permalink:** `/recipes/{{ title | slugify }}/`
- **Archive:** `/recipes/` · **Feeds:** `/recipes/feed.xml`, `/recipes/feed.json`
```yaml
title: ""              # required — recipe name
date: 2026-05-15
description: ""        # optional short summary
image: ""              # hero image — schema.org Recipe.image + OG preview + µf2 .u-featured
prepTime: 0            # minutes — converted to ISO-8601 PT15M at build for schema.org
cookTime: 0            # minutes — converted to ISO-8601 PT30M at build for schema.org
totalTime: 0           # optional — derived from prepTime + cookTime when absent
recipeYield: ""        # "4 servings", "1 loaf" — schema.org Recipe.recipeYield + µf2 .p-yield
recipeCategory: ""     # "Dessert" | "Main course" | "Breakfast" — schema.org Recipe.recipeCategory
recipeCuisine: ""      # "Italian" | "Swedish" | "Thai" — schema.org Recipe.recipeCuisine
recipeIngredient:      # array of strings — schema.org Recipe.recipeIngredient + µf2 .p-ingredient
  - "200 g flour"
  - "2 eggs"
  - "1 tsp salt"
recipeInstructions:    # array of strings in v1. HowToStep objects (step images, per-step links)
                       # are deferred to v1.1 if a real authoring need surfaces.
  - "Mix dry ingredients in a bowl."
  - "Whisk eggs and add gradually, stirring continuously."
nutrition:             # optional — schema.org NutritionInformation (any subset)
  calories: ""         # "350 kcal"
  servingSize: "1 slice"
```
- **µf2:** `.h-entry` envelope + nested `.h-recipe` (mirrors how Event uses `.h-entry` + `.h-event`). `.h-recipe` contains `.p-name`, `.p-yield`, `.p-ingredient` per item, `.e-instructions`, `.p-summary`, optional `.u-photo` on the hero image. JSON-LD `Recipe` is rendered side-by-side via `schemas/Recipe.njk` (NEW).
- **Authoring:** the structured array fields (`recipeIngredient[]`, `recipeInstructions[]`) make Recipe slightly heavier to author by hand than free-prose types — any Micropub client that can serialize a properties object handles it; pure-markdown authoring works with the YAML above.

## Client / server support matrix

The default-on/off column documents intended future defaults for when `features.yaml` lands. **In v1 all 14 types are always-on.**

| Type | Default once features.yaml lands | µf2 root |
|---|---|---|
| Note | on | h-entry |
| Article | on | h-entry |
| Bookmark | on | h-entry |
| Like | on | h-entry |
| Photo | on | h-entry |
| Reply | on | h-entry |
| RSVP | on | h-entry |
| Jam | on | h-entry |
| Recipe | on | h-recipe in h-entry |
| Audio | off | h-entry |
| Repost | off | h-entry |
| Event | off | h-event in h-entry |
| Watching | off | h-entry (h-review when rated) |
| Reading | off | h-entry (h-review when rated) |

The nine default-on types are the **IndieWeb common set** — the post types most personal sites publish first: short notes, long articles, replies, likes, photos, bookmarks, RSVPs, jams, and (in JEDEE specifically) recipes. The five default-off types are scaffolded but disabled — flip the flag in `features.yaml` (once it ships) to turn any of them on. Every type is authorable by any Micropub-compliant client that can craft the right `h-entry` shape, including hand-rolled `curl`.

## Archive rendering — `<custom-card>` (inherited)

EE ships a `<custom-card>` WebC component at `src/_includes/webc/custom-card.webc` with named slots for `image`, `date`, `tag`, `headline`, `content`, `footer` and attribute variants `img-square`, `clickable`, `no-padding`. Every JEDEE archive page (one per post type plus the aggregate `/feed/` page) uses `<custom-card>` for list items, with each post type filling the slots its frontmatter provides:

- **Note / Reply / Like / Repost / Bookmark / RSVP / Watching / Reading / Jam:** date + content; no `image` slot.
- **Article:** image (cover) + date + headline + content excerpt + tags.
- **Photo:** image + date; the Photo archive wraps the cards in `<custom-masonry>` for a fall-back-to-grid masonry layout (also inherited from EE — no JS required).
- **Audio:** poster image (if present) + date + headline; the layout uses native `<audio>` for local files. Video-embedded notes (using `<custom-youtube>` / `<custom-peertube>` inside a Note or Article body) render with whatever card the parent post type uses.
- **Event:** date + headline + location + start/end times in the `content` slot. Cancelled / postponed events show a `.p-event-status` badge.
- **Recipe:** image (hero) + date + headline + a content slot showing `recipeYield` and prep/cook time at a glance.

> **Open question:** a dedicated **Video** post type (creator-side video, symmetric to Audio) is unresolved — see *Audio / Video / Jam / Watching overlap* above.

Archive design lives in **`<custom-card>` + per-type Nunjucks partials in `_includes/partials/card-<type>.njk`**, not in 14 hand-rolled layouts. Lene's pattern: *WebC defines structure, Nunjucks fills slots.*

## Tag taxonomy — post-type names are NOT user tags

EE's `/tags/` page is non-hierarchical: every value in any post's `tags:` array becomes a tag-archive entry. With 14 post types, putting type-name tags in posts (`[note]`, `[article]`, etc.) would pollute the `/tags/` page with type names alongside user-chosen topic tags.

**Rule for JEDEE:** the `tags:` array carries *user topic tags only* (e.g. `[indieweb, eleventy]`). Post-type routing uses the file's folder + tag-driven collections (the `"posts"` tag funnels everything into the firehose; the per-type `data.category` value — added by `eleventyComputed.tags` — funnels each post into its per-type collection like `collections.article`, `collections.note`). The per-type snippets above intentionally omit `tags:` so nobody copy-pastes the wrong pattern.

**Dual-purpose `tags:` field — how the cascade merges.** Every post ends up with a final `tags:` array assembled from three sources:

1. **Folder data file** sets `tags: "posts"` (a *string*, EE convention). This is what makes `collections.posts` exist.
2. **Page-level `tags:`** is the author's array of *topic tags only* — e.g. `tags: [indieweb, eleventy]`. Eleventy merges a folder string with a page-level array into a single array: `["posts", "indieweb", "eleventy"]`.
3. **`eleventyComputed.tags`** (configured centrally in `src/_config/collections.js` via the `byCategory()` helper and explicit per-type `addCollection` calls — not per-folder) then appends `data.category` (e.g. `"article"`), producing the final array `["posts", "indieweb", "eleventy", "article"]`. The cascade does NOT use `setDataDeepMerge(true)` — that would deep-merge every other array field in the data cascade (`syndication`, `gallery`, `recipeIngredient`, …) as a side effect.

System tags (`"posts"`, every category name, plus a few others) are filtered out of the public `/tags/` index by the `SYSTEM_TAGS` exclude list in `src/_config/collections.js`'s `tagList` function. Add new category names to that list whenever a new post type ships.

## Webmention rendering (common to all post types)

**v1 ships only the receiving-side scaffolding:**

- Every post layout includes `{% include "partials/webmentions.njk" %}` near the foot. In v1 this partial is a no-op (renders nothing); when the webmention.io fetcher lands, the partial gets the grouping logic below.
- Every base layout includes `<link rel="webmention" href="https://webmention.io/<your-domain>/webmention">` in `<head>` so a future endpoint is discoverable.
- A short "respond on your own site" block renders at the foot of every post:

  ```
  Want to respond? Reply on your own site (Mastodon, blog, …) and link to this URL.
  The reply will appear here automatically.
  ```

**Once fetch wiring lands** (later milestone), the partial groups `webmentions` by type:

- **Likes + Reposts:** rendered as facepile (avatars + count)
- **Replies + Mentions:** rendered with author h-card, dt-published, e-content
- **RSVPs:** rendered with `p-rsvp` value
- Empty types collapse silently — no "0 likes" shown

## Aggregate feeds (the IndieWeb firehose)

Each post type ships its own per-type RSS/JSON feed (see each section above). On top of those, **`/feed.xml` and `/feed.json` aggregate every enabled post type into one subscribable URL** — the firehose readers like Aperture, Yarr, and Inoreader want.

**Post-Phase-1 reality:** `src/common/feed-atom.njk` and `src/common/feed-json.njk` read `collections.posts`, which is now auto-created by the tag-driven cascade — every post type's folder data file sets `tags: "posts"` (string) and `eleventyComputed.tags` appends `data.category`, so Eleventy implicitly registers a `posts` collection from any post carrying the `"posts"` tag. The hand-written `getAllPosts` / `getAllArticles` / `getAllNotes` / `getAllReading` / `getAllListening` exports were removed in Phase 1; only `showInSitemap` and `tagList` remain in `src/_config/collections.js`. `eleventy.config.js` adds no `addCollection` calls for these — the cascade handles it.

What Phase 2 still owes the firehose:

1. **Per-type feeds via a shared template.** Build on top of the unused `src/_includes/feeds/atom-body.njk` and `json-body.njk` partials that Phase 1 added. Parameterise over `collection` + `title`. Add 5 thin per-type feed wrappers (articles, notes, reading, jams, watching).
2. **No per-type collection registration needed.** `collections.article`, `collections.note`, `collections.reading`, `collections.listening`, `collections.watching` all auto-exist via `eleventyComputed.tags` appending `data.category`. Phase 3's 9 new types inherit the same pattern.
3. **Future `features.yaml` gating** — a disabled type's folder data file could omit `tags: "posts"`, dropping it from the firehose without removing the type. Not in scope for Phase 2.

A top-level **h-feed** at `/` (microformats2 firehose for Microsub readers like Aperture) is a future addition that reuses `collections.posts` but with µf2 markup instead of Atom/JSON.

## JSON-LD / Schema.org (extends Lene's pattern)

EE already ships JSON-LD for `BlogPosting` (article-shaped posts) and `WebSite` (root) via `src/_includes/schemas/`. Lene's `src/docs/schema.md` documents the convention: set `schema: <TypeName>` in frontmatter and the template at `src/_includes/schemas/<TypeName>.njk` is included. JEDEE extends this with one schema template per post type so structured data and µf2 are emitted side-by-side (search engines + IndieWeb readers both fed). Mapping:

| Post type | µf2 root | JSON-LD `@type` | Schema template |
|---|---|---|---|
| Note, Reply, Like, Repost, Bookmark | h-entry | `SocialMediaPosting` | `SocialMediaPosting.njk` (NEW) |
| Article | h-entry | `BlogPosting` | `BlogPosting.njk` (inherited from EE — verbatim) |
| Photo | h-entry | `BlogPosting` with embedded `ImageObject` | `PhotoPosting.njk` (NEW) |
| Audio | h-entry | `BlogPosting` with embedded `AudioObject` | `AudioPosting.njk` (NEW) |
| Event | h-event in h-entry | `Event` (with `eventStatus`) | `Event.njk` (NEW — uses Lene's example template from `schema.md`) |
| RSVP | h-entry | `RsvpAction` | `RsvpAction.njk` (NEW) |
| Watching | h-entry (h-review when rated) | `WatchAction` w/ `itemReviewed: Movie\|TVEpisode\|TVSeries` | `WatchAction.njk` (NEW) |
| Reading | h-entry (h-review when rated) | `ReadAction` w/ `itemReviewed: Book` | `ReadAction.njk` (NEW) |
| Jam | h-entry | `ListenAction` w/ `itemReviewed: MusicRecording\|MusicAlbum` | `ListenAction.njk` (NEW) |
| Recipe | h-recipe in h-entry | `Recipe` | `Recipe.njk` (NEW) |

Position: **dual emission, µf2 primary.** µf2 drives webmention parsing and IndieWeb tooling; JSON-LD is added because it's already in the inherited template, costs almost nothing, and helps search engines render rich results. If a project decides JSON-LD isn't worth the bytes, deleting the `schemas/` folder + removing the `head/schema.njk` include is one commit (no `features.yaml` flag for this — the dual emission is small enough that toggling it is overkill).

### Field derivations (build-time)

Several JSON-LD fields are *not* authored verbatim — they are derived at build time from the human-friendly frontmatter shape:

- **ISO-8601 durations.** `prepTime`, `cookTime`, and `totalTime` (Recipe) plus `runtime` (Watching) are authored as integer minutes. The build emits schema.org `PT<N>M` (e.g. `30` → `PT30M`). Authoring as `PT30M` directly also works.
- **Type discriminators.** Watching's `mediaType` (`movie` | `tv-episode` | `tv-series`) maps to schema.org `@type` (`Movie` | `TVEpisode` | `TVSeries`). Reading uses `Book` unconditionally. Jam uses `MusicRecording` (single track) or `MusicAlbum` (when `album:` is the canonical entity).
- **Event `status:` enum → URL.** `scheduled` | `cancelled` | `postponed` | `rescheduled` map to schema.org `eventStatus` URL form: `https://schema.org/EventScheduled` | `…/EventCancelled` | `…/EventPostponed` | `…/EventRescheduled`. Rendered into the JSON-LD `eventStatus` field (and surfaced visually via the `.p-event-status` badge — see the Event implementation footprint).
- **Event `attendanceMode:` enum → URL.** `offline` | `online` | `mixed` map to schema.org `eventAttendanceMode` URL form: `https://schema.org/OfflineEventAttendanceMode` | `…/OnlineEventAttendanceMode` | `…/MixedEventAttendanceMode`.
- **RSVP `rsvp:` enum → URL.** `yes` | `no` | `maybe` map to schema.org `rsvpResponse` URL form: `https://schema.org/RsvpResponseYes` | `…/RsvpResponseNo` | `…/RsvpResponseMaybe`. **`interested` has no schema.org mapping** — when `rsvp: interested`, the `RsvpAction` JSON-LD emits with `agent` + `event` but **omits the `rsvpResponse` property entirely**. µf2 `.p-rsvp` still carries the literal `interested` string faithfully; IndieWeb tooling sees the full IndieWeb-flavoured value, schema.org consumers see a partial action rather than a coerced lie.
- **`<enclosure>` derivation** (Audio podcast feed). The `length` (bytes) and `type` (MIME) attributes are derived by `stat`-ing the local audio file and inferring MIME from extension — see the Audio section above.

These conversions live in `src/_config/filters/` (planned, Phase 4) or inline in the per-template JSON-LD snippet — implementation choice is per-template. The spec just declares the convention.

## Verification (open question)

The recommended µf2 verification tool is **[indiewebify.me](https://indiewebify.me/)** — paste a post URL, get a report on which µf2 properties parsed correctly. Open question for a follow-up session: integrate it as a CI step that fetches each published URL after deploy, or keep it as a manual spot-check during authoring?

## Build-time strategy (open question)

The plan adds ~14 collections, ~12 per-type feed templates (Atom + JSON Feed each, except Like / Repost), 2 aggregate feed templates, and ~10 new schema templates. Expectation: this is cheap compared to EE's existing per-build costs (Eleventy Image variant generation, OG image SVG→JPEG, the markdown-it plugin chain, pa11y). 11ty caches rendered post content, so per-type and aggregate feeds share the same render cost.

Recommended approach: **measure before pruning.** Ship all per-type feeds in v1, capture a baseline build time, drop firehose-y per-type feeds (Bookmark / RSVP / Watching / Reading / Jam are the candidates) only if measurement shows feed templates as a class cost more than a few hundred ms. The dominant argument for dropping per-type feeds isn't perf, it's reader fatigue: per-type feeds are for power users, and any feed nobody subscribes to is dead weight regardless of cost.

## Repo baseline (after Phase 1 + 1.5)

Snapshot of the JEDEE working directory after Phase 1 + 1.5, so the implementation phases below land on a known starting point. **Layouts live in `src/_layouts/` in this repo** (EE convention — `eleventy.config.js` sets it as the layouts directory), not in `src/_includes/layouts/` as some EE forks do.

| Folder | Data file | Layout | Card partial | Archive page (`src/pages/`) | Per-type feed |
|---|---|---|---|---|---|
| `articles/` | `articles.json` | `post.njk` | `card-blog.njk` | `articles.njk` (wraps `archive-listing.njk`) | — |
| `notes/` | `notes.json` | `note.njk` | `card-notes.njk` | `notes.njk` (wraps `archive-listing.njk`) | — |
| `reading/` | `reading.json` | `reading.njk` | `card-reading.njk` | `reading.njk` (wraps `archive-listing.njk`) | — |
| `listening/` (Phase 2 renames to `jams/`) | `listening.json` | `listening.njk` | `card-blog.njk` (reused) | `listening.njk` (Phase 2 renames to `jams.njk`) | — |
| `watching/` | `watching.json` | `reading.njk` (reused; Phase 2 adds dedicated `watching.njk`) | — (none yet) | — (Phase 2 adds `watching.njk`) | — |
| `docs/` | (custom; not a post type) | — | `card.njk` | — | — |

Other facts the implementation phases assume:

- `<link rel="webmention">` lives in `src/_includes/head/meta-info.njk` (Phase 1). The webmention endpoint URL is parameterised from `meta.js`.
- `src/_includes/partials/webmentions.njk` exists as a no-op stub (Phase 1). It is included from `entry-footer.njk`.
- `src/_includes/partials/entry-header.njk` and `entry-footer.njk` exist (Phase 1.5.B). All 4 post layouts (`post.njk`, `note.njk`, `reading.njk`, `listening.njk`) include them and are now ~15 lines around their type-specific body slot.
- `src/_includes/partials/archive-listing.njk` exists (Phase 1.5.C). All 4 archive pages (`articles.njk`, `notes.njk`, `reading.njk`, `listening.njk`) are thin wrappers that set `archiveDescription`, `cardPartial`, `masonryLayout`, `collectionToPaginate`, `paginationMetaKey` and include it.
- `src/_config/collections.js` is the single source of truth for the tag cascade: it defines `byCategory()` and registers per-type `addCollection` calls. The `_post-tags.js` helper that the Phase 1.5 plan originally drafted was simplified out — its work is done by the central registration instead, matching the vanilla EE pattern. (`src/posts/_post-tags.js` does not exist in the working repo.)
- `src/_data/features.yaml` does **not** exist. Feature gating is deferred — all 14 types ship always-on in v1.
- `src/common/feed-atom.njk` and `src/common/feed-json.njk` read `collections.posts`, which is now auto-created via the tag-driven cascade (see *Aggregate feeds*).
- `src/_config/collections.js` exports only `showInSitemap` and `tagList`. The hand-written `getAllPosts` / `getAllArticles` / `getAllNotes` / `getAllReading` / `getAllListening` were removed in Phase 1 — the cascade replaces them. `collections.article`, `collections.note`, `collections.reading`, `collections.listening`, `collections.watching` all auto-exist via `eleventyComputed.tags` appending `data.category`.
- `src/_includes/schemas/` contains only `BlogPosting.njk` + `WebSite.njk`. The 8 NEW templates in the *JSON-LD / Schema.org* table above are all greenfield (Phase 4).
- `src/_includes/feeds/atom-body.njk` and `feeds/json-body.njk` are Phase 1 stubs that Phase 2's per-type feeds will wire.
- µf2 status: only the author `h-entry` envelope (`h-entry`, `h-card`, `p-name`, `u-url`, `u-author`) is emitted today. Every property-specific class (`dt-published`, `e-content`, `u-photo`, `u-bookmark-of`, `u-syndication`, `u-featured`, etc.) is absent and gets added per layout in Phase 2.
- `<custom-card>` (WebC), `<custom-masonry>`, `<custom-youtube>`, `<custom-peertube>`, the gallery partial + dialog.js + gallery.css are all already present and reusable.
- `_originals/+watching/` is still present but unused. Cleanup is deferred — flagged but not removed automatically (it may hold parking-lot content).
- The `SYSTEM_TAGS` exclude list in `src/_config/collections.js`'s `tagList` is currently `['notes', 'posts', 'reading', 'docs', 'all', 'article', 'note', 'listening', 'watching']`. Phase 2 adds `'jam'`; Phase 3 adds the 8 new category names. Consider deriving from a single `POST_TYPES` constant in `collections.js`.

## Implementation phases

Work breaks into five phases — Phase 1 and 1.5 are complete; Phases 2–4 remain.

### Phase 1 — Foundation (shipped)

Tag-driven auto-collections + Webmention discovery + Watching scaffold. Specifically:

- `<link rel="webmention">` added to `src/_includes/head/meta-info.njk` (endpoint URL from `meta.js`).
- `src/_includes/partials/webmentions.njk` exists as a no-op stub (included from `entry-footer.njk` in Phase 1.5).
- Watching folder scaffolded: `src/posts/watching/` + `watching.json` + sample content files (drafts).
- Feed templates (`src/common/feed-atom.njk`, `feed-json.njk`) read `collections.posts`, which is auto-created by the tag-driven cascade — every post-type folder data file sets `tags: "posts"` (string), and `eleventyComputed.tags` (added in Phase 1.5.A) appends `data.category`.
- Hand-written `getAllPosts` / `getAllArticles` / `getAllNotes` / `getAllReading` / `getAllListening` collection helpers removed from `src/_config/collections.js`. Per-type collections (`collections.article`, etc.) auto-exist via the cascade.
- Phase 1 stub partials added: `src/_includes/feeds/atom-body.njk`, `feeds/json-body.njk` (wired by Phase 2's per-type feeds).

### Phase 1.5 — Foundation hardening (shipped — see `_generated/Plan - 14 post types phase 1.5 + 2 unified.md`)

Bug fixes + shared chrome partials + archive consolidation + spec edits (this section).

- **A — Bug fixes.** Tag-merge mechanism converted from array-tag override to string + computed (E6 pattern). `listening.json` layout fix. `listening.njk` tag filter copy-paste fix. Permalink slugs corrected per Decision 9 (title-optional types use `page.fileSlug | slugify` for clean URLs from filename-shaped titles). Archive page copy errors fixed.
- **B — Chrome partials.** `entry-header.njk` (title, draft badge, image via `imageKeys`, date, optional `updatedDate`) and `entry-footer.njk` (filtered tag cluster, "respond on your own site" block, `webmentions.njk`, `edit-on.njk`) added. 4 post layouts (`post.njk`, `note.njk`, `reading.njk`, `listening.njk`) refactored to thin wrappers around the partials. Backlinks include kept on note/reading/listening only.
- **C — Archive consolidation.** `archive-listing.njk` added. 4 archive pages refactored to thin wrappers passing per-type parameters (collection, card partial, masonry variant, prose copy).
- **D — Spec edits.** This document updated inline (~12 sub-edits): common-frontmatter coverage, per-type field-gap notes for Reading/Watching/Jam, JSON-LD field-derivation subsection, Decision 8 amended to flat folders, Tag taxonomy dual-purpose-tags clarification, Aggregate feeds rewrite for Phase 1 reality, this Repo-baseline rewrite, this Phases rewrite.

### Phase 2 — Align the 6 existing types with the spec

Smaller than originally scoped because Phase 1.5 cleared the foundation work.

- **listening → jams rename.** Move `src/posts/listening/` → `src/posts/jams/`; rename `listening.njk` (layout) → `jam.njk`; rename `src/pages/listening.njk` → `jams.njk`; update `category: "listening"` → `"jam"` in `jams.json`; update `SYSTEM_TAGS` accordingly. Add Netlify `_redirects`: `/listening/* /jams/:splat 301`.
- **Dedicated `watching.njk` layout.** ~15 lines using the chrome partials. Update `watching.json` `layout: "reading"` → `"watching"`.
- **`src/pages/watching.njk` archive.** Thin wrapper around `archive-listing.njk` (parameters: `collections.watching`, card partial, masonry variant).
- **Shared per-type feed template.** Build on top of the Phase 1 `feeds/atom-body.njk` and `feeds/json-body.njk` partials. Parameterise over `collection` + `title`. Add 5 thin per-type feed wrappers (articles, notes, reading, jams, watching).
- **Per-type card partials.** Decide consciously whether to create `card-jam.njk` and `card-watching.njk` or keep reusing `card-blog.njk`. Recommend deferring until visual design wants something distinct.
- **µf2 properties in chrome partials.** Add `dt-published` (on date in entry-header), `e-content` (wrapper around the per-type body slot), `u-syndication` (rendered in entry-footer when `syndication:` is present), `u-author h-card` (link to author in entry-footer). Per-type µf2 lands in per-type body sections: `u-watch-of` (watching), `u-read-of` containing nested `h-cite` (reading), `u-listen-of` (jams).
- **`SYSTEM_TAGS` consolidation.** Currently `['notes', 'posts', 'reading', 'docs', 'all', 'article', 'note', 'listening', 'watching']`. Tidy as `'jam'` joins and the 9 new types arrive. Consider deriving from a single `POST_TYPES` constant in `collections.js`.

### Phase 3 — Add the 8 new post types

Order: simplest → richest, so each step proves the pattern incrementally.

1. **Bookmark** — `bookmark-of` + commentary
2. **Like** — minimal (no `p-name`, no feed)
3. **Reply** — `in-reply-to` + body
4. **Repost** — `repost-of`, no feed
5. **RSVP** — `in-reply-to` + `p-rsvp` value
6. **Photo** — `u-photo` + alt + gallery opt-in
7. **Audio** — podcast-shaped RSS, per-episode metadata, build-time enclosure derivation
8. **Event** — `h-event` nesting, status badge, archive split (upcoming/past)
9. **Recipe** — `h-recipe` nesting, ISO-8601 duration conversion, structured ingredient arrays

For each: folder + `<type>.json` (setting `tags: "posts"`, `category: "<type>"`, `layout: "<type>"`, permalink per Decision 9) + a one-line registration in `src/_config/collections.js` via `byCategory()` + `addCollection` + per-type layout (~15 lines using the chrome partials from 1.5.B) + card partial (or reuse `card-blog.njk`) + per-type feed wrapper (where applicable per spec) + JSON-LD schema template + a sample content file. Archive URLs (`/<type>/`) handled by a thin wrapper around `archive-listing.njk` per type. Total work per type is small thanks to the 1.5 foundation.

### Phase 4 — JSON-LD schema templates

Currently only `BlogPosting.njk` + `WebSite.njk` exist. Add 9 NEW templates: `SocialMediaPosting.njk`, `PhotoPosting.njk` (BlogPosting envelope with embedded ImageObject), `AudioPosting.njk` (BlogPosting envelope with embedded AudioObject), `Event.njk`, `RsvpAction.njk`, `WatchAction.njk`, `ReadAction.njk`, `ListenAction.njk`, `Recipe.njk`. Build-time field derivations (durations to ISO-8601, type discriminators, enum→URL conversions for Event status / attendanceMode and RSVP rsvpResponse) live in `src/_config/filters/` or per-template per the *Field derivations* subsection above. The include logic in `src/_includes/head/schema.njk` already supports `schema:` frontmatter pointing at any template name, so no glue changes needed — Photo posts set `schema: "PhotoPosting"`, Audio posts set `schema: "AudioPosting"`.
