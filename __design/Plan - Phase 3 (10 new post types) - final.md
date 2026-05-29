# Plan — Phase 3: the 10 new post types

## Context

Five post types are live (article, note, reading, watching, jam), shipped through Phases 1, 1.5,
and 2. Phase 3 adds the remaining 10 by replicating the established per-type pattern. The
Clipper-layer implementation is gated *behind* this phase (it needs the type folders to exist first).

**Slicing:** the 10 types are not uniform. Five are trivial "response" posts; five carry real
per-type complexity. This plan covers **Phase 3a (the light 5)** in execution detail and
**Phase 3b (the heavy 5)** as an outline — each heavy type becomes its own increment.

- **Phase 3a — light:** Bookmark, Like, Reply, Repost, RSVP
- **Phase 3b — heavy:** Photo, Audio, Video, Event, Recipe (Audio + Video are creator-side siblings, built together)

### The collection mechanism

`src/_config/collections.js` registers per-type collections with a `byCategory()` filter on the
`item.data.category` field; category names never enter `tags`. Therefore:

- No `eleventyComputed` block is needed in any folder data file.
- `SYSTEM_TAGS` (`['posts', 'docs', 'all']`) does **not** need per-category additions.

## Conventions & decisions (Phase 3a)

| Decision | Choice | Why |
|---|---|---|
| URL field naming | **camelCase** (locked) — `bookmarkOf`, `likeOf`, `inReplyTo`, `repostOf`, `rsvp` | Nunjucks can't read hyphenated top-level keys (`bookmark-of` parses as subtraction). Existing types already use no-hyphen fields. IndieWeb semantics live in the µf2 *class*, not the key. Clipper maps to these. |
| Registration | **`POST_TYPES` array** drives `byCategory()` + `addCollection` | Removes the duplicated category list across `collections.js` and `eleventy.config.js`. NB: only *collection registration* collapses to one array entry — a new type is still ~6 files + a layout alias (see *Per-type footprint* below). |
| Visible target | Light types render a **visible** verb + anchor (µf2 class on the `<a>`) | Like/Repost have no body — the target *is* the content, so it can't be a `<data hidden>` element. |
| Feeds | Bookmark, Reply, RSVP **yes**; Like, Repost **no** | Like/Repost are a low-value firehose — no dedicated feed. |
| Cards | one shared **`card-response.njk`** for all 5 | `card-notes.njk` assumes a title; these are often title-less. |
| Schema | keep **`schema: BlogPosting`** | `schemas/SocialMediaPosting.njk` doesn't exist yet; the include glue throws on a missing template. Phase 4 swaps it. |
| Nav | add Bookmark, Reply, RSVP to the Posts submenu; leave Like, Repost out | Avoids nav bloat for the pure-firehose, feedless types (still reachable at their archive URL). |
| Permalink | `/<plural>/{{ page.fileSlug | slugify }}/index.html` (plural namespace — see *Plural map*) | All five are title-optional (Decision 9). Shipped convention: per-post page **and** archive share one plural namespace (`/notes/<slug>/` + `/notes/`; `/jams/…`). |

### Plural map (URL namespace = explicit plural, **not** mechanical `<type>+s`)

`bookmark→bookmarks · like→likes · reply→`**`replies`**`· repost→reposts · rsvp→rsvps`

Only `reply` is irregular — do **not** auto-append `s` (that yields `replys`). The per-post page,
the archive, and the feed all live under this plural namespace.

### Per-type footprint (~6 files + 1 alias — "one array entry" covers *registration* only)

data file `<type>.json` · layout `<type>.njk` (clone of `note.njk`) · **layout alias** in
`eleventy.config.js` (`addLayoutAlias('<type>','<type>.njk')` — every shipped type has one; the data
file's extensionless `layout: "<type>"` needs it) · archive wrapper `src/pages/<plural>.njk` · sample
`.md` · *plus* a feed pair + nav entry for Bookmark/Reply/RSVP. (There is **no** `article.njk` — article
reuses `post.njk` — so even the `layout: "<type>"` convention isn't universal across shipped types.)

### Per-type specifics

| Type | category | µf2 property | URL field | Extra | Feed | Nav |
|---|---|---|---|---|---|---|
| Bookmark | `bookmark` | `u-bookmark-of` | `bookmarkOf` | — | ✅ | ✅ |
| Reply | `reply` | `u-in-reply-to` | `inReplyTo` | — | ✅ | ✅ |
| RSVP | `rsvp` | `u-in-reply-to` + `p-rsvp` | `inReplyTo` | `rsvp` (yes/no/maybe/interested) | ✅ | ✅ |
| Like | `like` | `u-like-of` | `likeOf` | — | ❌ | ❌ |
| Repost | `repost` | `u-repost-of` | `repostOf` | — | ❌ | ❌ |

## Phase 3a — execution

### Step 0 — `POST_TYPES` refactor (do first, verify before adding types)

1. In `src/_config/collections.js`: add `export const POST_TYPES = ['article','note','reading','jam','watching'];`
   and add `export` to the existing `byCategory` (it is currently a local `const`, not exported). Keep `SYSTEM_TAGS`,
   `tagList`, `showInSitemap`. The per-type named exports (`article`, `note`, `reading`, `jam`, `watching`) become
   redundant once config loops over `POST_TYPES` — remove them (only `eleventy.config.js` imports them).
2. In `eleventy.config.js`: swap the import on line 18 from
   `{ showInSitemap, tagList, article, note, reading, jam, watching }` to `{ POST_TYPES, byCategory, showInSitemap, tagList }`.
   Replace the five hand-written `addCollection('article', article)` … lines with
   `POST_TYPES.forEach(t => eleventyConfig.addCollection(t, byCategory(t)));` (keep the `showInSitemap` + `tagList` registrations).
   **Do NOT fold the layout aliases into this loop:** `POST_TYPES` includes `article`, which has no `article.njk`
   (it uses `layout: post` — see `articles.json`), so a generic alias loop would emit a bogus
   `addLayoutAlias('article','article.njk')`. Aliases stay explicit, added per new type in Step 2.
3. **Verify:** `npm run build` is green and the 5 existing archives + feeds still render. This proves the
   refactor before any new type is added. (Nothing should change in `dist/` for the existing 5.)

### Step 1 — shared `card-response.njk`

Create `src/_includes/partials/card-response.njk`: a `<custom-card>` (no image slot) rendering date,
a verb-prefixed target link (verb derived from `item.data.category`), and `description` excerpt if present.
Model on `card-notes.njk`; drop the title-headline assumption. Include `css/custom-card.css`.

### Steps 2–6 — add each type (order: Bookmark → Reply → RSVP → Like → Repost)

For each type create the file set below, then `npm run build` and eyeball the archive + a sample page:

1. **Data file** `src/posts/<type>/<type>.json`:
   ```json
   { "layout": "<type>", "tags": "posts", "category": "<type>", "permalink": "/<plural>/{{ page.fileSlug | slugify }}/index.html" }
   ```
   `<plural>` comes from the *Plural map* (e.g. reply → `/replies/…`), matching the shipped `/notes/`, `/jams/` namespaces.
2. **Add `<type>` to `POST_TYPES`** in `collections.js` (the only *collection* registration touch, thanks to Step 0).
   Then add the **layout alias** `addLayoutAlias('<type>','<type>.njk')` explicitly in `eleventy.config.js`
   (alongside the shipped aliases) — the `POST_TYPES.forEach` loop only wires `addCollection`, and the data file's
   extensionless `layout: "<type>"` needs the alias. Don't loop aliases over `POST_TYPES`: it includes `article`,
   which has no `article.njk` (see Step 0).
3. **Layout** `src/_layouts/<type>.njk` — clone `note.njk`; replace the body with the visible target block, e.g. for Like:
   ```njk
   <p>Liked <a class="u-like-of" href="{{ likeOf }}">{{ likeOf }}</a></p>
   <div class="e-content">{{ content | safe }}</div>
   ```
   RSVP adds `<data class="p-rsvp" value="{{ rsvp }}">RSVP: {{ rsvp }}</data>` and uses `u-in-reply-to` on `inReplyTo`.
   Keep the hidden `h-entry` authorship block and the `entry-header`/`entry-footer` includes. Keep `schema: BlogPosting`.
   Cloning `note.njk` verbatim also carries its `backlinks.njk` include and its local `{% css %}` block (`post.css` +
   `footnotes.css`); both are harmless for response posts (backlinks just render empty) — keep or drop deliberately.
   *µf2 caveat (deferred — see Decisions):* cloning `note.njk` puts the visible `u-*` target outside the only
   `h-entry` (the hidden authorship div), so a strict parser won't tie the property to the response's h-entry.
   Accepted for v1; flagged below.
4. **Archive wrapper** `src/pages/<plural>.njk` (Plural map — e.g. `replies.njk`, **not** `replys.njk`) — clone `notes.njk`; set `pagination.data: collections.<type>`,
   `cardPartial = "card-response.njk"`, `masonryLayout = "50-50"`, `collectionToPaginate = collections.<type>`,
   pagination size ~10, permalink `'<plural>/…'`.
5. **Feeds (Bookmark/Reply/RSVP only)** — clone `src/feeds/notes.json.njk` + `notes.xml.njk` to
   `src/feeds/<plural>.{json,xml}.njk` (Plural map). **Update the `permalink:` frontmatter** to `/<plural>/feed.xml`
   (and `/<plural>/feed.json`) — this, *not* the filename, controls the output path. Leaving the cloned
   `permalink: /notes/feed.xml` collides with the Notes feed and **errors the build** (duplicate permalink), so
   `dist/<plural>/feed.xml` is never written and the verification `test -f dist/bookmarks/feed.xml` fails. Then set
   `feedCollection = collections.<type>`, title, description, and `selfUrl` (= `/<plural>/feed.xml`).
   *Wrinkle:* title-less entries produce empty `<title>` — give the feed a computed fallback title
   (e.g. "Reply to <host>") or accept empty for v1.
6. **Nav (Bookmark/Reply/RSVP only)** — add `{ text: '<Type>', url: '/<plural>/' }` (Plural map) to the Posts submenu in `src/_data/navigation.js`.
7. **Sample** `src/posts/<type>/<sample>.md` — one `draft: true` file with the type's frontmatter so the page + card render.

## Phase 3b — heavy 5 (outline; each its own increment)

Each needs its own short plan; do not batch. **Audio + Video are creator-side siblings**
(decision: accept 15 types) — plan and build them in the same increment so they share the
hosted-media pattern (enclosure derivation, embed handling, feed shape).

**Cover images (cross-cutting).** All five heavy types carry a hero image, and all five reuse the
**build-time cover pattern** already live on reading/watching/jam: store the URL or path in `cover:`,
render a plain `<img eleventy:optional="placeholder" src="{{ cover | safe }}">`, and let the Eleventy
Image HTML Transform fetch + optimize + self-host it (`| safe` and `eleventy:optional` are mandatory —
full pattern + gotchas in `_generated/Reference - cover image pattern.md`). **Two image needs, kept
distinct:** (a) the single hero/cover → this pattern; (b) co-located body or gallery images → page-bundle
+ markdown / `{% image %}` (+ `gallery.njk`). Photo's gallery is (b); its lead photo is (a). **µf2 class is
type-specific:** on reading/watching/jam the cover is decorative (the target is a separate hidden
`<data class="u-read-of">`), but on Photo/Recipe the image *is* the subject, so the `<img>` itself carries
`class="u-photo"`. If you'd rather not repeat the per-template plain-`<img>`, decide **Option C** (make
`{% image %}` remote-aware) before building these.

- **Photo** — `u-photo` + `alt`; single-photo default + opt-in gallery (`gallery.njk` + `<dialog>`, already in EE);
  archive wraps cards in `<custom-masonry>` grid. New `card-photo.njk` (image-led). Lead photo = cover pattern with `class="u-photo"` on the `<img>`.
- **Recipe** — `h-recipe` nested in `h-entry`; structured `recipeIngredient[]`/`recipeInstructions[]`;
  ISO-8601 duration filter (accept integer minutes *and* `PT…M`). Title-required permalink. Dish hero photo = cover pattern (`u-photo` inside `h-recipe`).
- **Event** — `h-event` nested in `h-entry`; `status` badge; archive split into upcoming/past (cancelled stay visible).
  Title-required permalink. New `card-event.njk`. Optional banner/flyer = cover pattern.
- **Audio** — podcast-shaped RSS 2.0 with `<enclosure>` byte/MIME derivation (`stat` the file) + iTunes
  namespace + transcript. Schema `AudioPosting` (BlogPosting envelope + `AudioObject`). Episode/podcast cover art = cover pattern (distinct from the `<enclosure>` audio file).
- **Video** — self-hosted/embedded video; `u-video` µf2 + `<video>`/embed in the layout; enclosure-shaped
  feed mirroring Audio. Schema `VideoPosting` (BlogPosting envelope + `VideoObject`). The 15th type. Poster/thumbnail = cover pattern (`<video poster>` or embed still).

## Verification (Phase 3a)

```bash
npm run build                                   # green
ls dist/bookmarks/ dist/likes/ dist/replies/ dist/reposts/ dist/rsvps/   # archives exist
test -f dist/bookmarks/feed.xml && test -f dist/replies/feed.xml && test -f dist/rsvps/feed.xml
! test -e dist/likes/feed.xml                   # Like/Repost have NO feed
grep -l 'u-bookmark-of' dist/bookmarks/*/index.html   # µf2 property emitted on a sample
ls dist/tags/                                   # category names NOT present (still only real topic tags)
```
Then spot-check one rendered page per type in the browser (target link visible, date, draft badge),
the archive cards, and run a sample URL through indiewebify.me for µf2 sanity.

## Files touched (Phase 3a)

- **Refactor (2):** `src/_config/collections.js`, `eleventy.config.js`
- **New shared partial (1):** `src/_includes/partials/card-response.njk`
- **Per type ×5:** `src/posts/<type>/<type>.json`, `src/_layouts/<type>.njk`, `addLayoutAlias` in `eleventy.config.js`, `src/pages/<plural>.njk`, one sample `.md`
- **Feeds ×3 (Bookmark/Reply/RSVP):** `src/feeds/<plural>.json.njk` + `.xml.njk`
- **Nav (1):** `src/_data/navigation.js`

## Decisions locked / flagged

- **Field naming — LOCKED: camelCase** (`bookmarkOf`, `likeOf`, `inReplyTo`, `repostOf`, `rsvp`).
  Data files stay plain `.json`; no `eleventyComputed` aliasing.
- **Video — LOCKED: accept 15 types.** Audio + Video are creator-side siblings, built together in Phase 3b.
- **µf2 h-entry nesting — DEFERRED + documented (v1).** Response layouts clone `note.njk`, whose only `h-entry`
  is the hidden authorship div; the visible `u-*` target (and `.e-content`) sit *outside* it, so a strict mf2
  parser won't tie the response property to the h-entry. Accepted for v1 because webmention *sending* isn't wired
  up yet. Fix in the webmention milestone — either give the response layouts a proper self-contained
  `h-entry`, or restructure `note.njk` + shared chrome (the latter also fixes the existing types).
  - **Parse-verified 2026-05-29** (`microformats-parser` + `mf2py` on rebuilt `like.njk` markup): the visible
    `u-like-of` / `dt-published` / `e-content` are **dropped entirely**, not merely "orphaned at top level" —
    mf2 only collects properties that descend from a root, and `.region`/`.wrapper`/`base.njk` carry no `h-*`.
    The parsed `h-entry` contains only author + url, so an outbound like/reply would be received as a generic
    `mention-of`, never a typed like/reply. Three secondary warts in the hidden block: entry `p-name` resolves
    to the *author's* name (not the post title); the entry carries two `u-url`s (permalink + home, from the
    `p-name u-url` author anchor); and the author `h-card` has name + photo but no `url`. Inbound *attribution*
    still works (webmention.io's authorship algorithm finds the nested `u-author h-card`), so this stays moot
    while receiving is a stub (`partials/webmentions.njk`) and sending is unwired.
  - **Recommendation (for the webmention milestone): take option b — promote the visible `.wrapper` to the
    `h-entry` root in the shared chrome** (`<h1>` → `p-name`, one hidden `u-author h-card` *with* a `u-url`
    inside the root, entry `u-url` = permalink only). One change fixes all 15 types and clears the three warts,
    versus option a which re-solves it per-layout and leaves the existing types' warts. Bonus: this also lets the
    event `h-event` nest inside `h-entry` as already specified above (Phase 3b Event). Sequence the work as
    restructure-chrome → re-parse one built page per type (php.microformats.io / pin13 / indiewebify.me) →
    then wire outbound sending. When chosen, flip this entry from DEFERRED to the resolution.
- **Feed title fallback** for title-less Reply/RSVP entries — computed fallback vs accept empty. *(still open)*
- **Nav inclusion** of Like/Repost — currently excluded; include if you want them discoverable. *(still open)*
