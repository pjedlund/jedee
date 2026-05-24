# Step 4 — Obsidian Web Clipper layer design

Date: 2026-05-20 (session 8 — step 4 of the 4-step spec rework)
Repo: `/Users/johanedlund/Projects/JEDEE`
Branch: `feat/14-post-types` (clean working tree at HEAD `1ccde7d`)
Status: **Design draft.** No code changes proposed in this doc; it sets the contract for the implementation phase that follows.

---

## AMENDMENT (2026-05-23) — Cover images: build-time fetch only; colocate machinery dropped

**Decision (Johan, this session):** covers/posters are sourced by letting the **Eleventy Image HTML
Transform fetch + optimize + self-host the remote URL at build time** — proven for Watching
(commit `ae78277`; see `_generated/Handoff - 11ty build-time image downloading.md`). The
download-and-commit apparatus this doc designed is **not built**.

**Supersedes in this doc:**

- **"Cover image localization mechanism"** (steady-state + backfill + per-file script logic) — dropped.
- **`src/_config/setup/normalize-posts.js`** and **`src/_config/setup/lib/colocate-cover.js`** — **not created.** (Confirmed this session: neither exists, no `normalize-posts` npm script.)
- **"Page bundles — when and how":** reading/watching/jams are **no longer bundle-by-default for covers.** A cover needs no local home, so it stops forcing a bundle. Bundles become **opt-in**, only when a post has co-located *body* images (still handled by local-images-plus). Flat `.md` files are fine for all three types.
- **`coverSource:`** field — unnecessary; the `cover:` field holds the remote URL directly.
- **Phasing:** 4.B / 4.C (write + run the script) drop. 4.G (layout cover render) stays but simplifies to one plain `<img>` per layout.
- **Micropub forward-compat move #2** (factor out `colocate-cover.js`) — moot.

**The lean mechanism:** Clipper writes `cover: <remote-URL>`. The layout renders
`<img src="{{ cover }}" alt="…">` — a **plain `<img>`, never the `{% image %}` shortcode**
(it's local-only and *errors* on a remote URL). The HTML Transform fetches via eleventy-fetch
(cached), resizes, and self-hosts into `dist/`.

**Accepted trade (the lean path's one cost):** a cover is "self-hosted" only per-build; on a
fetch-cache miss the build needs network, and if the remote URL rots after the cache expires the
image is gone. Mitigate with an explicit long `cacheOptions: { duration: … }` on the transform
plugin (`eleventy.config.js:79-92`) so refetches are rare and the cache survives longer.
Maximal-durability committed covers are a **deferred, optional later pass** — not v1.

**What still survives from this doc (unchanged by the decision):**

- **Clipper templates** (the 9-template matrix) — still the authoring path; they just emit `cover: <URL>` and stop there.
- **local-images-plus** for *body* images — still configured (Phase 4.A).
- **Field-name normalization** — still wanted, but now a *separate, smaller* concern: rename the cover field to `cover` and the `u-*` target fields to canonical, over ~5 sample files. A one-time hand edit or tiny rename script — **not** the colocate apparatus. Current drift (verified this session): Reading uses `coverUrl` + `coverSmallUrl`; Jam uses `image`; the µf2 target fields are `link` (Reading) / `source` (Jam) vs the canonical `read-of` / `listen-of`.
- **Duration filter** (4.F) — unrelated to covers; still needed for Recipe / Watching.

**Note — existing covers are already mixed (verified this session):** Watching `cover:` is remote
(lean already, rendered in detail + card). But **Jam ×2 (`image:`) and Reading "Kingdom of God"
(`coverUrl:`) are committed local files**; the other 2 Reading samples (Anna Karenina,
Drottningar) are remote Google Books URLs. The transform renders local *and* remote paths fine,
so the existing local covers can stay as-is (an accidental durability win) or be normalized to
remote — either renders. The lean decision removes only the *requirement* to download; it does
not force ripping out covers that already happen to be local.

---

## Context (read this if picking up cold)

This is the final step of the 4-step rework that started from the archived `indiee` plan:

1. ✅ 14-vs-13 reconciliation
2. ✅ Per-type frontmatter audit (`_generated/Step 2 - per-type frontmatter audit.md`)
3. ✅ JSON-LD schema mapping audit (`_generated/Step 3 - JSON-LD schema mapping audit.md`)
4. **This document** — the Obsidian Web Clipper layer. Fresh ground: the indiee plan didn't cover Clipper, and the existing Watching template (`_resources/letterboxd-clipper.json`) is the only working precedent.

The canonical spec lives at `_generated/Implementing 14 post types - revised.md`. This design references it but doesn't repeat it.

## Goals

1. Obsidian Web Clipper becomes JEDEE's primary CMS for browser-shaped post types (rich-media Watching/Reading/Jam, plus Bookmark, RSVP, and Recipe). Authoring is "right-click in browser → save to vault." No per-post manual work.
2. Each rich-media post is a **page bundle** (`<note-name>/<note-name>.md` + colocated assets) so the post is self-contained — covers, body images, supplementary files all live next to the markdown.
3. Existing samples are normalized to the canonical field shape by a one-shot script that's idempotent and safe to re-run. Concretely: 2 Watching (`310 to Yuma`, `Birth`) and 2 Reading (`Anna Karenina`, `Kingdom of God`) currently flat → become bundles; 1 Reading (`Drottningar i Kungahalla`) is already a bundle and only needs any field renames; 2 Jam (`EP1`, `Of Violence`) currently flat → become bundles. One Jam file (`2025030.md`) is a placeholder draft with lorem-ipsum content; the script handles it correctly but it isn't real content.
4. The shape is **Micropub-aware** — Watching uses `watch-of`, Reading uses `read-of`, Jam uses `listen-of`, etc. So when a Micropub endpoint lands later, it writes the same fields Clipper does, and the layouts don't have to branch by source.

## Non-goals

- The Micropub endpoint itself. The shape is Micropub-aware; the endpoint is deferred.
- Webmention fetch wiring. Stub partial + `<link rel="webmention">` only, per the spec.
- A dedicated Articles Clipper template. JEDEE's Article type is for self-authored long-form; article clippings of someone else's work go into `posts/notes/_sources/` via the existing `note-to-_sources-clipper.json` (which is mature).
- A `Listen` post type for passive scrobbles. Jam is curated picks only, per spec decision 16. If scrobble logging ever lands it's a separate type.

## The three-actor model

Three components collaborate. Knowing which one owns what makes every other decision fall out.

| Actor | What it owns | How it's configured |
|---|---|---|
| **Obsidian Web Clipper** (browser extension + CLI) | Reading source-site JSON-LD/meta tags and writing a shape-correct `.md` into the vault, with `cover: <remote-URL>` in frontmatter | Per-source-site JSON templates in `_resources/<source>-clipper.json` |
| **obsidian-local-images-plus** (community plugin, already in Johan's vault) | Downloading **body** images (`![](URL)`, `<img src>`, base64) to a folder *named after the note*. Automatic, MD5-named files, idempotent | Plugin settings: **automatic mode on**, **placement: "next to note in folder named after note"** |
| **`src/_config/setup/normalize-posts.js`** (new — EE setup-script convention) | Downloading the **frontmatter** `cover:` URL, promoting flat `.md` to a bundle if needed, renaming drift fields to canonical shape | `npm run normalize-posts [-- --dry-run] [-- --type reading\|watching\|jams\|all]` |

**Critical insight on division of labor:** local-images-plus doesn't process YAML frontmatter, only body content. We don't move covers into the body to "let the plugin handle it" — covers are data (cards, OG meta, JSON-LD), and inverting the data/content separation to save a script is a bad trade. The script's job is narrow and stable: the one frontmatter image field, plus bundle/drift mechanics. The plugin and the script don't overlap.

## Cover image localization mechanism

### Steady state (new clip)

1. User clips a Letterboxd / Open Library / Bandcamp page via the Web Clipper extension.
2. Clipper writes `posts/<type>/<Title>/<Title>.md` (bundle path, see below) with `cover: <remote-URL>` in frontmatter and any body content rendered as markdown.
3. local-images-plus sees body images (none yet for the typical clip — could be an embedded album-art `<img>` in a Bandcamp clip, etc.) and colocates them next to the note. No-op for clips that only have frontmatter media.
4. User runs `npm run normalize-posts` periodically (or once before pushing). The script walks `posts/{reading,watching,jams}/`, detects any post with a remote `cover:` URL, downloads it via `@11ty/eleventy-fetch`, writes `cover.<ext>` next to the .md, rewrites the frontmatter (`cover: ./cover.<ext>`, original URL preserved as `coverSource:`).

### Backfill (existing drifty samples)

Same `normalize-posts` script, run once with `--type all`. Two passes per file:
1. **Bundle promotion** — if the .md is flat (not in a same-named folder), create `<basename>/`, move the .md into it.
2. **Cover colocation + drift rename** — download remote cover URL fields, rewrite to local `./cover.<ext>`, rename drifted field names to canonical shape (table below).

### Why a setup script and not an Eleventy build event

`src/_config/events/svg-to-jpeg.js` runs at build time and is appropriate for derived artifacts (OG images). Cover colocation is a one-shot mutation of source content — it changes what's on disk, not what's rendered. Setup scripts (`src/_config/setup/generate-favicons.js`, Lene's `generate-screenshots.js`) are the matching precedent: ESM file, `@11ty/eleventy-fetch` for buffer-mode downloads, `fs.promises` for writes, `try/catch` per item so one bad URL doesn't bail. Run via `npm run <name>`, never auto-executed by the build.

### Script logic per file (idempotent)

```
for each .md in src/posts/{reading,watching,jams}/:
  1. Parse frontmatter (gray-matter or equivalent)
  2. If already in a bundle (parent folder name === .md basename, sans extension): skip the move
  3. Otherwise: mkdir <basename>/, move .md inside
  4. Detect remote URL field — try, in order: cover, coverUrl, image, albumArt
     (Skip if no field matches OR if value already starts with `./` or `/`.)
  5. eleventy-fetch (type: 'buffer', duration: '1d')
  6. Detect extension from response content-type (image/jpeg → .jpg, etc.)
  7. fs.writeFile <basename>/cover.<ext>
  8. Rewrite frontmatter:
     - <whichever URL field> → coverSource (paper trail / re-fetch reference)
     - Add cover: ./cover.<ext>
     - Drop coverSmallUrl (Eleventy Image generates widths from one source)
     - Apply field-rename table (see § Field-name lockdown)
  9. Write the updated .md
  Per-item try/catch — log and continue; never abort the run.
```

Output:
- `--dry-run` prints proposed changes, writes nothing.
- Default mode applies changes and prints a short summary (N moved, N covers downloaded, N renames, N skipped, N errored).

## Page bundles — when and how

Per Johan's bundles-by-default-when-multi-file rule, and the EE skill's existing guidance, post types split as follows:

| Type | Bundle default | Reason |
|---|---|---|
| `articles/` | Yes (already) | Long-form, image-heavy, evolves |
| `reading/`, `watching/`, `jams/` | **Yes** (this design) | Every post has a cover; colocate by default |
| `photos/`, `audio/`, `recipes/`, `events/` (Phase 3) | Yes | Always media-bearing |
| `notes/` | No | Mostly title-less text; promote on demand when a note grows media |
| `bookmarks/`, `likes/`, `replies/`, `reposts/`, `rsvps/` (Phase 3) | No | No media payload by design |

**Folder-naming rule (the open call from the brainstorm — resolved A):** the page-bundle folder name matches the `.md` basename verbatim. `310 to Yuma.md` becomes `310 to Yuma/310 to Yuma.md`. Spaces and title-case preserved. Eleventy slugifies for the permalink at build time (`{{ page.fileSlug | slugify }}` → `/watching/310-to-yuma/`), so the URL is unaffected. The Obsidian wikilink graph stays intact (`[[310 to Yuma]]` from any other note still resolves). Filesystem-tidy is not a value worth trading the wikilink graph for.

**Note-name sanitation:** filenames pass through Clipper's `safe_name` filter at clip time to strip filesystem-illegal characters (colons, slashes) that JSON-LD `name` properties sometimes carry — e.g. `3:10 to Yuma` → `310 to Yuma`. This is not kebab-casing, it's OS-level safety. The Letterboxd template already implicitly does this; Reading/Jam templates will too.

## Per-type Clipper templates

### The complete matrix

Not every post type has — or needs — a Clipper template. Some are vault-authored (Note, Article), some are phone-first via Micropub (Photo, Audio), some are authored locally (Event). The matrix below covers all 14 types so the boundary is explicit.

| Post type | Template? | Source(s) | Trigger style | Tier | Notes |
|---|---|---|---|---|---|
| Note | No | — | — | — | Vault-authored; Obsidian's "new note" is the path |
| Article | No | — | — | — | Self-authored long-form; not a clip target |
| **Bookmark** | Yes | Generic web | Manual (any URL) | **v1** | Universal; the most Clipper-shaped of all the types |
| Like | Yes (minimal) | Generic web | Manual | v2 | No body; ~5 properties; cheap to add when needed |
| Photo | No (v1) | — | — | — | Phone-first → Micropub later; not a browser-clip path |
| Audio | No | — | — | — | Self-hosted podcasts; not a clip target |
| Reply | Yes | Generic web | Manual | v2 | Same shape as Bookmark, different intent |
| Repost | Optional | Generic web | Manual | defer | Edge case — reposts typically happen within their host platform |
| **RSVP** | Yes | Anything with `@type: Event` | schema.org-based | **v1** | Schema-triggered, source-agnostic — fires on any event page |
| Event | No | — | — | — | Authored locally for events you host |
| **Watching** | Yes ×4 | Letterboxd + IMDB ×3 | URL prefix | **v1** | See § Watching split below |
| **Reading** | Yes | Open Library | URL prefix | **v1** | Standard Ebooks / Bokus / Adlibris deferred |
| **Jam** | Yes | Bandcamp | URL regex | **v1** | Apple Music as a fallback deferred |
| **Recipe** | Yes | Any site with `@type: Recipe` | schema.org-based | **v1** | One source-agnostic template — JSON-LD `Recipe` is widely deployed |

Plus the existing `_resources/note-to-_sources-clipper.json` for article-clippings-into-notes — already mature, doesn't change.

**v1 ships nine templates total** — one edit (Letterboxd) plus eight new (Open Library + Bandcamp + IMDB Movie + IMDB TVEpisode + IMDB TVSeries + Bookmark + RSVP + Recipe). See Watching split below for why IMDB is three. **v2 adds two** (Reply + Like). The deferred ones are awaiting a real authoring need before they're worth maintaining.

### Watching — `_resources/letterboxd-clipper.json` (existing, needs two edits)

Edits required:
1. **Wikilink cast and genres.** Change `cast` from `{{schema:actors[*].name|slice:0,5}}` to `{{schema:actors[*].name|slice:0,5|wikilink}}`. Change `genre` similarly. Confirmed: Clipper's `wikilink` filter is documented and already in use in `_resources/note-to-_sources-clipper.json`.
2. **Add `personalUrl` field** alongside `url` for the Letterboxd "my review" URL — promoted from the spec's open question, per Q3 resolution. Authored manually for now (Letterboxd doesn't expose the personal-review URL in JSON-LD); the template leaves it empty as the existing `myUrl` did.
3. **Field-name retiring** — the template's `myUrl` becomes `personalUrl`. (One-time rename; backfill rewrites the existing samples.)

`noteNameFormat` and trigger stay as-is. `path` stays `posts/watching/` (Clipper writes a flat `.md`; the normalize-posts script promotes to a bundle on first run — or, optionally, Clipper writes flat and the next `npm run normalize-posts` promotes).

### Watching — `_resources/imdb-movie-clipper.json` + `imdb-tv-episode-clipper.json` + `imdb-tv-series-clipper.json` (new, three files)

Letterboxd is movie-only; IMDB covers movies + TV episodes + TV series. The spec's `mediaType: movie | tv-episode | tv-series` discriminator (line 279) needs to be set per clip — but Clipper's template syntax doesn't support inline conditionals (not in the documented filter list). So the cleanest expression is **three IMDB templates**, each triggered by a different schema.org `@type`, each hard-coding `mediaType:` to the matching string. Each is ~12 properties, ~90% shared shape — verbose on disk but trivial to author once the first one's written.

Triggers (schema-org-based, since IMDB's URL prefix doesn't discriminate between movies and TV):
- `imdb-movie-clipper.json` → `@type: Movie`
- `imdb-tv-episode-clipper.json` → `@type: TVEpisode`
- `imdb-tv-series-clipper.json` → `@type: TVSeries`

Each emits the canonical Watching shape (`title`, `year`, `director`, `cast`, `cover`, `watch-of`, `genre`, `mediaType`). The personal-review-URL field (`personalUrl`) is Letterboxd-specific and left empty on IMDB clips.

Verify against actual IMDB markup during implementation — Schema.org `TVEpisode` exposes `partOfSeries` which is the natural path to the parent series; lock down whether to capture it as a wikilink (`[[Series Name]]`) or as a sibling field.

### Reading — new `_resources/open-library-clipper.json`

Source site: **Open Library** (`openlibrary.org/works/…` or `/books/…`). Reasons over alternatives:
- Has clean JSON-LD `Book` markup
- No login or API-key required
- Stable rate limits (non-profit, open-data org)
- ISBN-indexed, so the same Book is reachable from multiple paths
- Ethically aligned with JEDEE's IndieWeb posture
- Google Books works too but JSON-LD is thin and covers are watermarked; Goodreads is hostile to clippers (it actively obfuscates)

Mirror Letterboxd's structure:

```jsonc
{
  "schemaVersion": "0.1.0",
  "name": "Open Library",
  "behavior": "create",
  "noteContentFormat": "",
  "properties": [
    { "name": "title",         "value": "{{schema:@Book:name}}",                  "type": "text" },
    { "name": "draft",         "value": "true",                                   "type": "checkbox" },
    { "name": "date",          "value": "{{date}}",                               "type": "text" },
    { "name": "author",        "value": "{{schema:@Book:author.name|first}}",     "type": "text" },
    { "name": "authors",       "value": "{{schema:@Book:author[*].name|wikilink}}", "type": "multitext" },
    { "name": "publisher",     "value": "{{schema:@Book:publisher.name}}",        "type": "text" },
    { "name": "publishedYear", "value": "{{schema:@Book:datePublished|date:\"YYYY\"}}", "type": "number" },
    { "name": "pages",         "value": "{{schema:@Book:numberOfPages}}",         "type": "number" },
    { "name": "isbn13",        "value": "{{schema:@Book:isbn}}",                  "type": "text" },
    { "name": "genre",         "value": "{{schema:@Book:genre|wikilink}}",        "type": "multitext" },
    { "name": "cover",         "value": "{{schema:@Book:image}}",                 "type": "text" },
    { "name": "url",           "value": "{{url}}",                                "type": "text" }
  ],
  "triggers": ["https://openlibrary.org/works/", "https://openlibrary.org/books/"],
  "noteNameFormat": "{{schema:@Book:name|safe_name}}",
  "path": "posts/reading/"
}
```

(Exact selector strings may need tuning against actual Open Library markup; lock down during implementation.)

### Jam — new `_resources/bandcamp-clipper.json`

Source site: **Bandcamp** (`<artist>.bandcamp.com/album/<slug>`). Existing samples come from there; clean JSON-LD `MusicAlbum`; indie-friendly. **Apple Music** as a fallback for non-Bandcamp releases (it has schema and works without login; defer the template until a need surfaces).

Field shape mirrors the spec's Jam frontmatter:

```jsonc
{
  "schemaVersion": "0.1.0",
  "name": "Bandcamp",
  "behavior": "create",
  "noteContentFormat": "",
  "properties": [
    { "name": "title",       "value": "{{schema:@MusicAlbum:name}}",                       "type": "text" },
    { "name": "draft",       "value": "true",                                              "type": "checkbox" },
    { "name": "date",        "value": "{{date}}",                                          "type": "text" },
    { "name": "artist",      "value": "{{schema:@MusicAlbum:byArtist.name|wikilink}}",     "type": "text" },
    { "name": "album",       "value": "{{schema:@MusicAlbum:name}}",                       "type": "text" },
    { "name": "listen-of",   "value": "{{url}}",                                           "type": "text" },
    { "name": "cover",       "value": "{{schema:@MusicAlbum:image}}",                      "type": "text" },
    { "name": "year",        "value": "{{schema:@MusicAlbum:datePublished|date:\"YYYY\"}}", "type": "number" },
    { "name": "genre",       "value": "{{schema:@MusicAlbum:genre|wikilink}}",             "type": "multitext" },
    { "name": "syndication", "value": "",                                                  "type": "multitext" }
  ],
  "triggers": ["https?://[^/]+\\.bandcamp\\.com/album/"],
  "noteNameFormat": "{{schema:@MusicAlbum:name|safe_name}}, by {{schema:@MusicAlbum:byArtist.name|safe_name}}",
  "path": "posts/jams/"
}
```

`syndication: []` is left empty for the author to paste an `album.link` / Apple Music link manually if desired (replacing the previous `odeslico` ad-hoc field).

### Bookmark — new `_resources/bookmark-clipper.json`

The most universal template — no source-site trigger, fires manually when the user picks "Bookmark" from Clipper's template menu on any URL. Captures the target page's title and description, leaves the body blank for optional commentary, sets `bookmark-of:` to the canonical URL.

```jsonc
{
  "schemaVersion": "0.1.0",
  "name": "Bookmark",
  "behavior": "create",
  "noteContentFormat": "",
  "properties": [
    { "name": "title",        "value": "{{title}}",                "type": "text" },
    { "name": "draft",        "value": "true",                     "type": "checkbox" },
    { "name": "date",         "value": "{{date}}",                 "type": "text" },
    { "name": "bookmark-of",  "value": "{{url}}",                  "type": "text" },
    { "name": "description",  "value": "{{description}}",          "type": "text" }
  ],
  "triggers": [],
  "noteNameFormat": "{{title|safe_name}}",
  "path": "posts/bookmarks/"
}
```

No body content captured by default (the spec's Bookmark µf2 has `.e-content` for *your* commentary, not the bookmarked page's content). Bundle-promotion happens via `normalize-posts` only if the post acquires media later; most bookmarks stay flat.

### RSVP — new `_resources/rsvp-clipper.json`

Schema.org-triggered on `@type: Event`. Fires on event pages (Eventbrite, Meetup, anywhere with `Event` JSON-LD). Captures the event URL into `in-reply-to:` (per the spec's RSVP shape — line 235) and leaves `rsvp:` for the user to fill in (`yes` / `no` / `maybe` / `interested`). Clipper supports prompting the user for a value at clip time via a property without a default — verify the exact mechanism during implementation, since the docs don't cover this explicitly; the fallback is to set `rsvp: "maybe"` as a placeholder and edit after.

```jsonc
{
  "schemaVersion": "0.1.0",
  "name": "RSVP",
  "behavior": "create",
  "noteContentFormat": "",
  "properties": [
    { "name": "date",          "value": "{{date}}",                                        "type": "text" },
    { "name": "draft",          "value": "true",                                            "type": "checkbox" },
    { "name": "in-reply-to",    "value": "{{url}}",                                         "type": "text" },
    { "name": "rsvp",           "value": "maybe",                                           "type": "text" },
    { "name": "event-title",    "value": "{{schema:@Event:name}}",                          "type": "text" },
    { "name": "event-start",    "value": "{{schema:@Event:startDate}}",                     "type": "text" },
    { "name": "event-location", "value": "{{schema:@Event:location.name}}",                 "type": "text" }
  ],
  "triggers": ["schema:@Event"],
  "noteNameFormat": "RSVP to {{schema:@Event:name|safe_name}}",
  "path": "posts/rsvps/"
}
```

The captured `event-title`/`event-start`/`event-location` are informational paper-trail (so the post is readable even if the source URL rots) — they're not the canonical event record (that's whatever lives at `in-reply-to:`).

### Recipe — new `_resources/recipe-clipper.json`

Schema.org-triggered on `@type: Recipe`. Source-agnostic: fires on NYT Cooking, AllRecipes, Bon Appetit, BBC Food, Serious Eats, Food52, random food blogs — any page with `Recipe` JSON-LD. Maps the spec's full `Recipe` shape (line 346–368) 1:1 from the JSON-LD properties.

```jsonc
{
  "schemaVersion": "0.1.0",
  "name": "Recipe",
  "behavior": "create",
  "noteContentFormat": "",
  "properties": [
    { "name": "title",             "value": "{{schema:@Recipe:name}}",                          "type": "text" },
    { "name": "draft",             "value": "true",                                             "type": "checkbox" },
    { "name": "date",              "value": "{{date}}",                                         "type": "text" },
    { "name": "description",       "value": "{{schema:@Recipe:description}}",                   "type": "text" },
    { "name": "image",             "value": "{{schema:@Recipe:image}}",                         "type": "text" },
    { "name": "prepTime",          "value": "{{schema:@Recipe:prepTime}}",                      "type": "text" },
    { "name": "cookTime",          "value": "{{schema:@Recipe:cookTime}}",                      "type": "text" },
    { "name": "totalTime",         "value": "{{schema:@Recipe:totalTime}}",                     "type": "text" },
    { "name": "recipeYield",       "value": "{{schema:@Recipe:recipeYield}}",                   "type": "text" },
    { "name": "recipeCategory",    "value": "{{schema:@Recipe:recipeCategory}}",                "type": "text" },
    { "name": "recipeCuisine",     "value": "{{schema:@Recipe:recipeCuisine}}",                 "type": "text" },
    { "name": "recipeIngredient",  "value": "{{schema:@Recipe:recipeIngredient}}",              "type": "multitext" },
    { "name": "recipeInstructions","value": "{{schema:@Recipe:recipeInstructions[*].text}}",    "type": "multitext" },
    { "name": "source",            "value": "{{url}}",                                          "type": "text" }
  ],
  "triggers": ["schema:@Recipe"],
  "noteNameFormat": "{{schema:@Recipe:name|safe_name}}",
  "path": "posts/recipes/"
}
```

**Duration handling.** Schema.org emits `prepTime: "PT15M"` (ISO-8601). The spec authors as `prepTime: 15` (integer minutes) with build-time `PT15M` conversion. Recommend extending the build-time filter to **accept both formats** — `PT15M` from Clipper passes through unchanged; a human authoring `15` gets converted at build. That avoids running an inverse `duration` filter at clip time (which would lose precision for non-minute-aligned durations) and keeps the Clipper template trivially correct.

`recipeInstructions[*].text` extracts the `text` field from each `HowToStep` object — the spec's v1 takes plain strings; if upstream emits `HowToStep` objects with images / per-step links the data is preserved but flattened to text for now.

### Types with no Clipper template

The spec's other six types are intentionally not Clipper-shaped:

| Type | Why no template |
|---|---|
| **Note** | Vault-authored. Obsidian's native "new note" is the path. |
| **Article** | Self-authored long-form. The existing `note-to-_sources-clipper.json` handles *clipping* third-party articles into `posts/notes/_sources/`; JEDEE Articles are first-person, not clipped. |
| **Photo** | Phone-first authoring path — Micropub clients like Indigenous handle this once the endpoint lands. A browser clip of an Instagram/Flickr page isn't the natural flow. |
| **Audio** | Self-hosted podcasts. Audio files arrive from recording / RSS pipelines, not browser pages. |
| **Event** | Authored locally for events you host. Clipping a third-party event page is an RSVP, not an Event. |
| **Reply / Like / Repost** | Deferred to v2 (Reply / Like — same shape as Bookmark) or "when a need surfaces" (Repost — most reposts happen within their host platform anyway). |

### Templates as code: fork vs generator vs JSON

v1 ships nine JSON files in `_resources/` (the existing two plus seven new). That's manageable but the JSON-of-strings-containing-templating-syntax format is awkward to author at scale. Three forward-looking paths, in order of preference:

1. **JSON as-is (v1).** Each template is small, the format is documented, and Clipper reads them natively. Import via Clipper's settings UI on a one-time setup. Cost: hand-editing escaped strings; mitigated by the fact that the templates rarely change once written.

2. **Generator script (v2 if pain bites).** Write the templates in a more authoring-friendly TypeScript source at `src/_config/setup/clipper-templates/<name>.ts` — typed property definitions, shared fragments (e.g. the common `{ name: "draft", value: "true", type: "checkbox" }` line), one place for the wikilink rule. A `build-clipper-templates.js` setup script emits the JSON files into `_resources/`. Clipper still reads JSON; JEDEE authors TypeScript. One-day project, no ongoing maintenance burden.

3. **Upstream PR (if a missing Clipper feature is dealbreaker).** Frontmatter URL processing or bundle-mode save would be generally useful, not JEDEE-specific. Contribute upstream — floor rises for everyone, JEDEE doesn't carry distribution. Reserved for concrete features, not speculative ones.

**Explicitly rejected (for now): forking Clipper into a JEDEE-specific extension.**
The cost-benefit math doesn't work yet: active-project fork divergence, three browser-extension-store publishing flows, security-patch responsibility, scope creep risk. Revisit when there's a concrete distribution need (collaborator workflow, "deploy your own JEDEE-shaped site" product, JEDEE-specific in-extension UI). Not v1, not v2.

## Field-name lockdown (and the drift table)

Three normalization decisions land here. The setup script applies them during backfill.

### Watching

| Old field (samples) | Canonical | Notes |
|---|---|---|
| `rating: 3.925` | `scoreLB` | "Letterboxd score" — already used in `Birth.md` and the template |
| `myRating: 4` | `scoreMy` | "My score" — already used in `Birth.md` and the template |
| `myUrl: …` | `personalUrl: …` | First-class personal-review URL field; Reading/Jam can adopt later when needed |
| `cover: <URL>` | `cover: ./cover.<ext>` + `coverSource: <URL>` | Local file canonical; remote preserved for re-fetch |
| `genre: [plain, …]` | `genre: ["[[X]]", …]` | Wikilinked at template level going forward; backfill rewrites |
| `cast: [plain, …]` | `cast: ["[[X]]", …]` | Same |

### Reading

| Old field (samples) | Canonical | Notes |
|---|---|---|
| `coverUrl: <URL>` | `cover: ./cover.<ext>` + `coverSource: <URL>` | |
| `coverSmallUrl` | (dropped) | Eleventy Image generates responsive widths from one source |
| `totalPage: 898` | `pages: 898` | |
| `publishDate: 2014-08-28` | `publishedYear: 2014` | Year is what schema.org wants for `datePublished` in Book context; full date is overkill |
| `subtitle: …` | (kept as-is if present) | Not in spec but harmless; flat schema |
| `link`, `previewLink` | (dropped) | Google Books artifacts; the spec's Reading frontmatter doesn't need them |
| `isbn10: …` | (dropped if `isbn13` present) | The spec uses `isbn13` only |
| `authors: "Leo Tolstoy"` (string) | `authors: ["[[Leo Tolstoy]]"]` (wikilinked array) | Multi-author awareness + graph |

### Jam

| Old field (samples) | Canonical | Notes |
|---|---|---|
| `source: <URL>` | `listen-of: <URL>` | µf2 / spec name |
| `image: <URL>` | `cover: ./cover.<ext>` + `coverSource: <URL>` | **Rename `albumArt` and old `image` to `cover` (Q3 resolution)** for symmetry across the three rich-media types |
| `released: 2026-01-13` | `year: 2026` | Spec uses year; precise release date isn't load-bearing here |
| `published: 2019-04-05` | `year: 2019` | Same |
| `odeslico: <URL>` | `syndication: [<URL>]` | An album.link/Odesli URL is by definition a syndication link |
| `artist: "X"` | `artist: "[[X]]"` | Wikilinked |

### Spec edits this entails

The canonical spec at `_generated/Implementing 14 post types - revised.md` needs the following updates (apply when this design ships):

- **Watching frontmatter (lines 268–287):** add `personalUrl: ""` as a documented optional field; add a one-line note that `genres` (and the already-documented `cast`) values may be wikilinked. The "Authoring" paragraph (line 289) gains "or Obsidian Web Clipper using the Letterboxd template for movies, IMDB templates for TV / movies."
- **Reading frontmatter (lines 296–314):** no schema changes; the drift fields the script renames are already documented as "Importer-emitted extras" (line 318) — that paragraph should reference this design doc. The "Authoring" paragraph (line 317) gains "or Obsidian Web Clipper using the Open Library template." Add a one-line note that `genre` values may be wikilinked.
- **Jam frontmatter (lines 325–338):** rename `albumArt:` to `cover:` throughout; the "Per-type primary-media fields (photo / poster / cover / albumArt)" sentence in common-frontmatter (line 105) collapses to `(photo / poster / cover)`. The "Importer-emitted extras" paragraph (line 340) gains "Going forward, the Obsidian Web Clipper Bandcamp template emits canonical-shaped frontmatter." Add a one-line note that `artist` and `genre` values may be wikilinked.
- **Recipe / Field derivations (line 481):** extend the "ISO-8601 durations" bullet to say the build-time filter accepts both ISO-8601 strings (`PT15M`, from Clipper) and integer minutes (from hand-authored posts). Same applies to Watching's `runtime`.
- **Common frontmatter (line 105):** the photo / poster / cover / albumArt sentence collapses to photo / poster / cover (Jam's field rename above is the reason).

## Wikilinks — what got confirmed

Clipper's `wikilink` filter is documented and supports both single values and arrays. Already in use in `note-to-_sources-clipper.json` for `author`. Drops cleanly into:
- Watching: `cast`, `genre`, `director`
- Reading: `author`, `authors`, `genre`
- Jam: `artist`, `genre`

Layouts render the wikilink as plain text (Obsidian's wikilink syntax doesn't need to leak to HTML). The graph value is in the source.

## Layouts — minimal changes

Once covers are local, the three layouts that render covers (`src/_layouts/reading.njk`, `watching.njk`, `jam.njk`) and their card partials need:

- Replace remote-URL `<img>` with `<img src="{{ cover }}" alt="Cover for {{ title }}" eleventy:widths="320,640,960">`. EE's HTML Transform resolves the `./cover.<ext>` relative path against the post's bundle folder.
- No new shortcodes, no new partials. The work is one `<img>` per file.

Drop `coverSmallUrl` references where they exist in card partials — Eleventy Image is the only thing that should generate responsive widths.

**Card-partial scope note.** `card-reading.njk` is Reading-only. `card-blog.njk` is currently shared by Articles, Watching, and Jam (per Phase 1.5's "reuse `card-blog.njk` until visual design wants something distinct" guidance). Editing `card-blog.njk` to render `{{ cover }}` from a relative path is harmless for Articles (Articles already use page bundles with local images per EE convention) but it does touch their archive cards. If the change is awkward, the alternative is to fork per-type card partials now — but the spec's Phase 2 recommendation is to defer that. Default: edit `card-blog.njk` in place; revisit per-type cards when visual design diverges.

## Micropub forward-compat

Three forward-compat moves keep the design clean when a Micropub endpoint lands later:

1. **The field shape is already Micropub-aware.** Watching uses `watch-of`, Reading `read-of`, Jam `listen-of`. The spec was designed this way; this step doesn't change that.
2. **Factor the cover-colocate function into a small library file** at `src/_config/setup/lib/colocate-cover.js`. The setup script imports it. The future Micropub endpoint can import the same module (or copy it verbatim), so the "download a remote image URL and rewrite frontmatter to point at the local path" contract is one function, with one set of tests, used by both authoring paths.
3. **Bundle layout is friendly to Micropub.** A Micropub endpoint that knows the post's slug at write time can write directly into `posts/<type>/<slug>/<slug>.md` and save photo uploads (multipart) as `posts/<type>/<slug>/photo-N.<ext>`. No retrofit step.

No conflicts. The shape Clipper emits, the shape Micropub clients send, and the shape the setup script normalizes existing samples to are the same shape.

## Implementation phasing

**Prerequisite:** spec Phase 3 (the 8 new post types) must be complete — all 14 `posts/<type>/` folders + `<type>.json` data files + per-type layouts in place. See the sequencing note below for why this order.

Suggested order — each step ships independently and the next builds on it.

| Phase | Work | Risk |
|---|---|---|
| **4.A** | Configure local-images-plus (one-time setup in vault) — automatic mode, "in folder named after note" placement. No JEDEE code changes. | Trivial; one settings change |
| **4.B** | Write `src/_config/setup/lib/colocate-cover.js` + `src/_config/setup/normalize-posts.js` + add `normalize-posts` npm script. Test against the existing samples in `--dry-run`. | Low; pattern matches `generate-screenshots.js` exactly. Idempotent |
| **4.C** | Run `npm run normalize-posts -- --type all` for real. Existing samples become canonical-shaped bundles. Commit on a per-type basis (3 commits) for clean history. | Low; backfill is reversible — git revert + re-run |
| **4.D** | Edit `_resources/letterboxd-clipper.json` for wikilinks + `personalUrl`. Test against a fresh Letterboxd clip. | Low; one-template-file change |
| **4.E** | Write the new Clipper templates: `open-library-clipper.json`, `bandcamp-clipper.json`, `imdb-movie-clipper.json`, `imdb-tv-episode-clipper.json`, `imdb-tv-series-clipper.json`, `bookmark-clipper.json`, `rsvp-clipper.json`, `recipe-clipper.json`. Test each against one real clip from the source site. | Medium; selectors need verification against actual JSON-LD markup, and the schema-org-based trigger mechanism (RSVP, Recipe, IMDB ×3) needs confirming against Clipper's current implementation |
| **4.F** | Extend the build-time duration filter (in `src/_config/filters/` per the spec's Field-derivations subsection) to accept both ISO-8601 (`PT15M`, from Clipper) and integer minutes (from hand-authored Recipe / Watching `runtime`). | Low; ~10-line filter |
| **4.G** | Update layouts (`reading.njk`, `watching.njk`, `jam.njk`) + card partials for local-cover rendering. Drop `coverSmallUrl` references. | Low; replaces existing img tags |
| **4.H** | Edit canonical spec (`_generated/Implementing 14 post types - revised.md`) per "Spec edits this entails" above. Move this design doc's "what changed" decisions into the spec the way steps 1–3 did. | Low; small textual edits |

Phase 4.A is a per-machine setup (Johan's vault), not a code change — call it out in the implementation plan so it doesn't get missed.

**Sequencing relative to spec Phase 3 — locked.** Three of the v1 Clipper templates (Bookmark, RSVP, Recipe) target post-type folders that the spec's Phase 3 creates: `posts/bookmarks/`, `posts/rsvps/`, `posts/recipes/`. **Spec Phase 3 ships first; then Step 4 implements against the now-existing infrastructure.** This matches the spec's own implementation order (Phase 3 before Phase 4), avoids any "ship a Clipper template that writes to an inert folder" intermediate state, and removes the pull-forward-scaffolding step entirely. The Clipper layer lands as one coherent feature against a complete set of post-type folders.

Practical implication for the phasing below: 4.A–4.H assume `posts/{bookmarks,rsvps,recipes}/` + their `<type>.json` + their layouts + JSON-LD schema templates already exist when Step 4 implementation starts. The setup script in 4.B and the templates in 4.E don't need to know about Phase 3 at all — they treat all 14 post-type folders as present.

**Verification gates before claiming any phase complete:**
- 4.B: dry-run output reviewed against expected mutations (cover URLs identified, drift renames listed, bundle moves listed)
- 4.C: `npm run build` succeeds; spot-check three migrated posts render with local covers
- 4.D–4.E: each template tested with one real clip from its source; emitted frontmatter matches canonical shape
- 4.F: filter accepts `PT15M`, `15`, `"15"` and produces correct schema.org output for each
- 4.G: archives render local covers; no broken images
- 4.H: spec file's mapping/derivation tables stay internally consistent after edits

## Open items deferred (explicitly out of scope here)

- **v2 Clipper templates** — Reply, Like (~5 properties each, generic-URL trigger, mirror Bookmark shape). Cheap to add when a real authoring need surfaces.
- **Repost Clipper template.** Defer indefinitely — most reposts happen within their host platform (boost on Mastodon, retweet, etc.), not from-the-browser-as-CMS.
- **Alternate source templates per type.** Apple Music for Jam, Standard Ebooks / Bokus / Adlibris for Reading, NYT-specific recipe layout, etc. The v1 templates are sufficient; add when a real clip of a non-supported source happens often enough to be worth maintaining.
- **TV-episode `partOfSeries` capture.** IMDB's `TVEpisode` schema exposes the parent series; whether to capture it as a wikilink or sibling field is a lock-down for implementation, not design.
- **Reading-state tracking** (`read-status`, `dateStarted`, `dateFinished`). Spec defers this pending the feed-bump-on-transition product decision.
- **Video post type.** Open question from the spec; deferred to a later session.
- **Webmention fetch wiring.** Stub partial only in v1; webmention.io fetcher is a separate task.
- **Micropub endpoint.** Forward-compat moves in this design unblock it; the endpoint itself is its own milestone.
- **CI automation.** `npm run normalize-posts` is manual. Could be a pre-commit hook later if drift becomes a habit.
- **A Clipper-CLI-driven batch backfill.** The CLI exists (`src/cli.ts` in the obsidian-clipper repo) and accepts URL + template + output, one URL per invocation. Useful if a corpus of bookmarks/imports ever needs re-clipping in bulk — shell-loop wrapper. Out of scope for now: local-images-plus + the normalize-posts script cover the immediate need.
- **Templates-as-code generator** (`src/_config/setup/build-clipper-templates.js` + TypeScript template sources). See § Templates as code above — tier-2 path if hand-editing nine JSON files becomes painful.
- **Forking Clipper into a JEDEE-specific extension.** Cost-benefit doesn't work yet; see § Templates as code for the conditions under which this would be reconsidered.

## Files touched / created (summary)

**Created — Clipper templates (8 new):**
- `_resources/open-library-clipper.json`
- `_resources/bandcamp-clipper.json`
- `_resources/imdb-movie-clipper.json`
- `_resources/imdb-tv-episode-clipper.json`
- `_resources/imdb-tv-series-clipper.json`
- `_resources/bookmark-clipper.json`
- `_resources/rsvp-clipper.json`
- `_resources/recipe-clipper.json`

**Created — setup tooling:**
- `src/_config/setup/lib/colocate-cover.js`
- `src/_config/setup/normalize-posts.js`
- `package.json` script: `"normalize-posts": "node src/_config/setup/normalize-posts.js"`

**Created or extended — build-time filter:**
- `src/_config/filters/duration.js` (per the spec's Phase 4 — accept both ISO-8601 and integer minutes)

**Edited:**
- `_resources/letterboxd-clipper.json` (wikilinks, `personalUrl`)
- `src/_layouts/{reading,watching,jam}.njk` (local-cover render)
- `src/_includes/partials/card-reading.njk` + `card-blog.njk` (local-cover render; card-blog touches Articles harmlessly — see § Layouts)
- `_generated/Implementing 14 post types - revised.md` (spec edits per § Field-name lockdown)

**Mutated by the script (one-time backfill):**
- `src/posts/watching/310 to Yuma.md` → `src/posts/watching/310 to Yuma/310 to Yuma.md` + `cover.jpg`
- `src/posts/watching/Birth.md` → `src/posts/watching/Birth/Birth.md` + `cover.jpg`
- `src/posts/reading/Anna Karenina - Leo Tolstoy.md` → `…/Anna Karenina - Leo Tolstoy/…md` + `cover.jpg`
- `src/posts/reading/The Kingdom of God is Within You - Leo Tolstoy.md` → bundle + cover
- (`Drottningar i Kungahalla/` is already a bundle — just field renames if any)
- `src/posts/jams/EP1, by The Supervoid Choral Ensemble.md` → bundle + cover
- `src/posts/jams/Of Violence, by Town Portal.md` → bundle + cover
- `src/posts/jams/2025030.md` → bundle + cover

## Pitfalls / project rules to re-honour

- `_generated/` is gitignored — this design doc lives there; don't `git add`.
- Don't push, don't `gh pr create` — Johan pushes himself.
- No `Co-Authored-By: Claude` trailer in commits.
- `gh` calls need `--repo pjedlund/JEDEE`.
- US English in any code/content edits this design produces.
- Permalinks use `{{ page.fileSlug | slugify }}` — no `id:` pattern.
- When implementing, invoke the `cube-css` skill before writing CSS and the `eleventy-excellent` skill before touching templates/layouts/config.
