# Reference — The build-time cover image pattern

**Status:** active convention. **Locked:** 2026-05-23 (ROADMAP "Locked decisions").
**Lives:** `_generated/` (gitignored working artifact).
**Companion handoffs:** `Handoff - 11ty build-time image downloading.md` (the discovery),
`Handoff - Uniform build-time covers.md` (the rollout to reading/watching/jam).

## What it is, in one line

Store a single hero image's URL or path in a `cover:` frontmatter field, render it as a
**plain `<img>`**, and let the always-on Eleventy Image **HTML Transform** fetch (if remote),
optimize, and self-host it at build time.

## The canonical snippet

```njk
{% if cover %}
  <img eleventy:optional="placeholder" src="{{ cover | safe }}" alt="…" loading="lazy">
{% endif %}
```

Live in: `src/_layouts/{reading,watching,jam}.njk` (detail) and
`src/_includes/partials/card-{reading,watching,jam}.njk` (archive cards).

## Why a plain `<img>`, never `{% image %}`

JEDEE has two image paths that behave **oppositely on a remote URL**:

| | `{% image %}` / `{% imageKeys %}` shortcode | HTML Transform (plain `<img>`) |
|---|---|---|
| Remote URL | **Breaks the build** — `image.js:37` prepends `./src`, so `https://…` becomes the bogus path `./srchttps://…` → `ENOENT` → exit 1 | **Fetched, optimized, self-hosted** at build time |
| Local path | Yes | Yes |

So the plain `<img>` is the *only* way to pull a remote cover into the build, and it also
handles local covers — one code path for both.

## Two non-negotiables (both can fail the build)

1. **`| safe` on the `src`.** Nunjucks escapes `&` → `&amp;`; the transform then fetches the
   mangled multi-param URL → 404 → **fatal build**. `| safe` keeps the raw URL intact (the
   transform replaces the `<img>`, so the raw URL never reaches output). Watching only worked
   before by luck — its single-param URL had no `&` to escape.
2. **`eleventy:optional="placeholder"`.** A 404 cover hard-fails the build by default (exit 1,
   page not written). With this attribute a dead cover degrades to a transparent placeholder,
   the build completes (exit 0), and the 404 is logged as a warning. (eleventy-img v6;
   global `failOnError` stays `true`.)

## Two image needs — keep them distinct

| Need | Mechanism |
|---|---|
| **(a) Single hero / cover** (remote or local) | **This pattern** — `cover:` + plain `<img>` |
| **(b) Co-located body / gallery images** (multiple) | Page-bundle + markdown / `{% image %}` (+ `gallery.njk`) |

Photo's opt-in gallery is (b); its lead photo is (a). Don't let the cover pattern bleed into galleries.

## Microformats class is type-specific

The pattern's *shape* is identical across types; only the µf2 class on the `<img>` changes.

| Type | Cover img role | Class on the `<img>` | Where the µf2 target lives |
|---|---|---|---|
| reading / watching / jam | decorative | none | separate hidden `<data class="u-read-of / u-watch-of / u-listen-of">` |
| Photo | *is* the subject | `u-photo` | the image itself |
| Recipe | dish hero | `u-photo` (inside `h-recipe`) | the image itself |
| Event | banner / flyer | (optional, decorative) | — |
| Audio | episode / podcast cover art | (decorative; distinct from the `<enclosure>` audio file) | — |
| Video | poster / thumbnail | (decorative; or `<video poster>`) | — |

## Where it applies

- **Live today:** reading, watching, jam.
- **Phase 3b (planned), all five:** Photo, Recipe, Event, Audio (cover art), Video (poster).
- **Light types (Phase 3a, shipped):** none use it. `card-response.njk` has no image slot by
  design. **Bookmark** is the only plausible opt-in (preview / og:image / favicon of the bookmarked
  page) — a future design choice, not wired.
- **article / note:** their hero goes through `entry-header.njk` → `imageKeys` (the shortcode,
  **local-only**). A *remote* hero there would break — see Option C.

## Option C — the broader alternative (DEFERRED until after Phase 3b)

**Decision (2026-05-23): defer.** The heavy types all ship fine on the plain-`<img>` pattern;
Option C is optional polish, and it touches **Lene's upstream eleventy-excellent code**
(`src/_config/shortcodes/image.js`) — see *Why defer* below. Revisit after the next
implementation phase (Phase 3b).

### The idea

Make the `{% image %}` / `{% imageKeys %}` shortcode remote-aware so the `image:` field accepts
remote URLs too. The shortcode's *only* incompatibility is the `./src` prepend at `image.js:37`:

```js
// Prepend "./src" if not present
if (!src.startsWith('./src')) { src = `./src${src}`; }
```

A remote `src` becomes the bogus path `./srchttps://…` → `ENOENT` → build dies. The core fix is
to skip the prepend for URLs:

```js
const isRemote = /^https?:\/\//.test(src);
if (!isRemote && !src.startsWith('./src')) { src = `./src${src}`; }
```

`@11ty/eleventy-img`'s `Image()` already fetches + caches remote URLs natively (same engine the
HTML Transform uses), so once the path stops being corrupted the rest of `processImage` just works.

### …but a complete version is more than one line

1. **`filenameFormat` (`image.js:46-50`) assumes a clean local filename** — it does
   `path.basename(src)`. A query-string URL (`…/content?id=abc&printsec=…`) yields garbage or
   colliding names; a remote branch must fall back to eleventy-img's default hash naming.
2. **No 404 resilience.** `await Image(src)` *throws* on a dead URL → failed build. The
   plain-`<img>` path gets `eleventy:optional="placeholder"` for free; matching it means a
   try/catch + placeholder inside the shortcode.
3. **The `| safe` gotcha disappears** (the one upside) — the URL is a JS argument, never an HTML
   attribute, so Nunjucks never escapes `&`→`&amp;`.

### What it would unlock (blast radius)

The shortcode is the path behind two shared chrome pieces:

- **`entry-header.njk:11`** — `imageKeys` on `image:`, the shared hero for the `post`/`note`
  layouts (dormant on reading/watching/jam, which set `cover:` instead).
- **`card-blog.njk:9`** — `{% image item.data.image %}`, the article/note archive card.
  (`gallery.njk` also calls it, but is local-only by nature.)

So one shared change would let **`article`/`note` carry a remote hero via the existing `image:`
field** — the one place remote is currently *impossible* without Option C or duplicating the
header — and it would auto-slot into `<custom-card>` (the shortcode stamps `slot="image"`).

### Trade-off, head to head

| | Per-template plain `<img>` (current) | Option C (remote-aware shortcode) |
|---|---|---|
| **Scope** | Additive, one template at a time, near-zero risk | One shared file; touches `entry-header` + `card-blog` + every `{% image %}` caller |
| **`&`-escaping** | Must remember `\| safe` per img | Gone — URL is an arg, not an attribute |
| **404 resilience** | Free via `eleventy:optional` | Must add try/catch + placeholder |
| **Remote filenames** | Transform hashes per page automatically | Must add a hash branch to `filenameFormat` |
| **WebC slot** | Manual `<div slot="image">` wrapper | Auto `slot="image"` |
| **`avif` output** | No (transform = webp/jpeg) | Yes (shortcode default) |
| **Per-type µf2 class** | Trivial — your own `<img>` | Needs an `imageClass` arg threaded through |

### How to decide

The two aren't competing for the same job:

- **Plain `<img>`** wins where the image *is* the content and carries microformats (Photo's
  `u-photo`, covers/posters) — you want direct control over the element and its class.
- **Option C** earns its keep only for the **`article`/`note` hero via `entry-header.njk`** — the
  one place remote is otherwise impossible. If covers/posters/photos are the only remote images
  JEDEE will ever have, the plain-`<img>` pattern already covers them and Option C is optional.

### Why defer (the upstream consideration)

`src/_config/shortcodes/image.js` is **Lene Saile's upstream eleventy-excellent code**, and JEDEE
is a fork. Editing it in place diverges from upstream and invites merge friction on future EE
syncs. If Option C is ever adopted, prefer a route that keeps the upstream file clean — a thin
JEDEE-specific wrapper shortcode that normalizes the remote case before delegating, or an
upstream-friendly PR to Lene — rather than patching `image.js` directly. Until then, the
plain-`<img>` pattern keeps the divergence confined to JEDEE's own templates, where it belongs.

## Caveats

- **Build-time network dependency.** A cache miss must reach the remote host; offline/CI builds
  rely on the eleventy-fetch cache. A cold cache with no network stalls or fails.
- **Cache duration is the plugin default** — no `cacheOptions: { duration }` set yet
  (`eleventy.config.js:79-92`). Set one for resilience against refetch / link-rot.
- **`dist/` is gitignored** — localized images are regenerated each build, not committed.
- **Detail-page placeholder is invisible** (no width/height → no box). Cards get a clean box via
  aspect-ratio CSS; a one-line `min-block-size` would give the detail `<img>` a visible box.

## Reference files

- `eleventy.config.js:79-92` — HTML Transform plugin config
- `src/_config/shortcodes/image.js:37` — the local-only `./src` prepend
- `src/_layouts/{reading,watching,jam}.njk`, `src/_includes/partials/card-{reading,watching,jam}.njk`
- `src/assets/css/local/custom-card.css` — `[data-poster]` / `img-square` aspect-ratio variants
