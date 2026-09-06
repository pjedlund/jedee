---
description: "The unrelated stores that share the name cache — build, browser, service worker — which of them ever reach a visitor, and jedee's inlining approach to cache-busting."
date: 2026-07-31
---

*Cache* is among the most overloaded words in web development. On a single site it can name several unrelated stores, living in different places, owned by different parties and cleared in completely different ways. Conflating them makes debugging miserable, because "clear the cache" then has several possible meanings and usually only one of them is the one that would help.

The stores that commonly coexist on a static site:

- **A build cache**, on whatever machine builds the site, holding expensive intermediate work — fetched remote data, optimized images — so the next build can skip redoing it. It never reaches a visitor, and a stale entry here shows up as a build that produces the wrong output rather than as a user-visible bug.
- **The browser's HTTP cache**, governed by the `Cache-Control` and `ETag` headers the server sends. This is what makes repeat visits fast, and what can hand somebody a stale page after a deploy.
- **A service-worker cache**, written by the site's own JavaScript running in the visitor's browser. Unlike the HTTP cache it is under the site's direct control, and it is what makes a site work with no network at all.

**Cache-busting** is the counter-move to the second one: making a URL change whenever its contents change, so the browser has no cached copy to reuse. The usual technique is a content hash in the filename (`global.a1b2c3.css`), which lets the file be cached effectively forever, because a new version is by definition a new URL. For small enough assets there is another option — give it no separate URL at all and inline it into the HTML document, which is itself revalidated on every visit.

## In jedee

The word means three different things here, in three different places, and two of the three never touch a visitor.

| Layer | Lives on | Speeds up | Cleared by |
|---|---|---|---|
| Build cache | Netlify's build server | The next deploy | Nothing automatic — clear by hand |
| Browser cache | The visitor's browser | Repeat visits | A changed URL, or ETag revalidation |
| Service-worker cache | The visitor's browser | Offline + repeat visits | Every deploy — see [[The service worker's three strategies]] |

### The build cache exists so the build is polite

Each build fetches things from the open web. Re-downloading them every deploy would be slow and rude to those servers, so they're kept in `.cache/` and carried between deploys by one Netlify plugin:

```toml
[[plugins]]
package = "netlify-plugin-cache"
  [plugins.inputs]
  paths = [ ".cache" ]
```

`.cache/` is `@11ty/eleventy-fetch`'s store. Three build steps fill it: remote cover images pulled in and self-hosted by the image transform (see [[Self-hosting remote images at build time]]), webmentions fetched by `src/_data/webmentions.js`, and a static map image per photo post from Geoapify.

⚠ **The cache is excluded from Netlify's secret scanning, and it has to be.** The Geoapify URL carries `MAP_API_KEY` in its query string, and eleventy-fetch stores request URLs verbatim. Netlify scans build-generated files for leaked secrets and would flag it:

```toml
[build.environment]
  SECRETS_SCAN_OMIT_PATHS = ".cache/**"
```

Safe because `.cache/` is never deployed — only `dist/` ships, and the built output never contains the key, which lives in the Netlify UI. If a deploy is unexpectedly slow, check the build log for whether this cache was restored.

### The browser cache: only fonts get a long life

Cache headers come entirely from `netlify.toml`; there is no `_headers` file.

```toml
[[headers]]
for = "*.woff2"
  [headers.values]
  Cache-Control = "max-age=31536000,public,must-revalidate"
```

Only the fonts get a year. **Everything else** — pages, images, feeds, the favicon — falls to Netlify's default of `public, max-age=0, must-revalidate` plus an ETag. The component scripts (`/assets/scripts/components/*.js`) once shared the fonts' year-long header but no longer do; they now carry an explicit `max-age=0,public,must-revalidate`, for the reason in the next section.

`max-age=0, must-revalidate` reads like "don't cache", and isn't. The browser keeps its copy and revalidates cheaply: it sends the ETag, and the server answers `304 Not Modified` with no body if nothing changed. So an unchanged page costs a round-trip, not a download. The year-long files skip even that.

### Cache-busting by inlining, not by filename

jedee takes the second option above and gets the guarantee for free, because in a production build the CSS and JS **ride inside the HTML**. `head/css-inline.njk` inlines the whole stylesheet as a `<style>` block; the site's JavaScript is inlined the same way. There is no stylesheet request to go stale. Since the HTML revalidates on every visit, so does everything inlined in it.

⚠ **The `/bundle/<hash>.css` paths are dev-only.** Eleventy's bundle plugin can emit content-hashed files and does — but `css-inline.njk` only *links* them under `npm start`, so a refresh picks up edits. A production build emits no `/bundle/` directory at all. That's why there's no `[[headers]]` rule for it: in production there is nothing at that path.

### A long cache on an unhashed URL is a time bomb

The year-long cache is only safe on a URL whose contents never change under it. Fonts qualify, and they change identity by filename anyway. The component scripts did **not**: esbuild builds them to stable, unhashed names (`dist/assets/scripts/components/<name>.js`) and the `.webc` components reference them unhashed, so a returning visitor holds the *old* file for up to a year after any edit. This inherited EE header shipped for months as a real bug — the [[The place map|route-line place-map update]] hit it exactly.

The reasoning that once excused it — "`must-revalidate` stops it being served stale" — is wrong about *when*. `must-revalidate` only forces a revalidation *after* `max-age` has lapsed; while the entry is still fresh (inside the year) the browser serves the cached copy without asking. So a long `max-age` and an unhashed URL together mean stale-until-expiry, and `must-revalidate` does nothing about it.

Worse, **changing the header does not retroactively fix already-cached copies.** The browser won't refetch to learn the new, shorter `max-age` until the *old* year-long entry expires. Only a change to the *URL* (a content hash) busts an existing cache entry. That's why the fix is forward-looking — new visitors get the corrected header immediately, but anyone still holding a year-long copy needs a hard refresh.

There are only two correct shapes, and the bug was mixing them:

- **Content-hashed filename + long immutable cache** — a new version is a new URL, so the old one can be cached forever.
- **Unhashed / stable filename + `max-age=0, must-revalidate`** — every load revalidates cheaply against the ETag and picks up a change at once.

The component scripts took the second shape (`netlify.toml`, with a comment). They load lazily on idle, so the conditional request isn't on the critical path, and an unchanged file still costs only a 304. **If they ever get content-hashed filenames, the 1-year immutable cache can come back.**

Note that for a visitor with the service worker active, these headers never come into play on repeat views: the worker holds the component scripts cache-first and answers before the network is consulted (see [[The service worker's three strategies]]), so the corrected header only serves the no-worker audience — first visits, private windows, cleared storage.

### What each path actually costs

Measured on the live site on 2026-08-30 with `place-map.js` (156 KB), navigating between two pages that both use the component. The browser's own resource timings report `deliveryType` and `transferSize`, so "bytes over the network" is observed rather than inferred.

| Visitor | Answered by | Bytes over the network | Time |
|---|---|---|---|
| Service worker active | `cache-storage` — the worker's cache | 0 | ~1 ms |
| No worker, holds an ETag | `304 Not Modified` from the edge | 0 | ~115 ms |
| No cached copy at all | `200 OK` from the edge | 159,631 | ~240 ms |

The middle row is what `max-age=0, must-revalidate` costs: one small round-trip per page load, not a re-download. The top row is the common case, and it is why the header choice matters less than it looks — most repeat views never reach the network at all. Both non-zero timings sit off the critical path anyway, because the scripts load on idle inside an `<is-land>`.

⚠ **A committed header is not a live header.** This fix was committed on 2026-08-11 but production went on serving the old year-long value until 2026-08-30, because a stale `netlify.toml` was riding along in Netlify's build cache. Two ordinary deploys did not dislodge it; only *Clear cache and deploy site* did. When a header does not match the file, check what the deploy is actually serving (`curl -sI`) before assuming the config is wrong — and note that a cache-cleared deploy also reinstalls every dependency from scratch, which is its own risk if any of them have gone stale.

Source: `_local/project_docs/build-and-browser-caching.html` (written 23 Jun 2026), re-verified against `netlify.toml` on 2026-07-31; corrected 2026-08-11 when the component-script header was fixed from a year to `max-age=0, must-revalidate`; measured against production and confirmed live on 2026-08-30.
