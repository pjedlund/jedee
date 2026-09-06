---
description: "What a service worker intercepts, the five conventional caching strategies, and the roughly 25 hand-written lines that make jedee offline-capable using three of them."
date: 2026-07-31
---

A [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) is a script the browser runs in the background, separate from any page, able to intercept the site's own network requests. That interception is what makes offline browsing possible: the worker answers from a cache it controls when the network is gone or slow.

Three lifecycle events matter. `install` fires once per version, and is where a worker usually pre-caches the few files it needs to be useful offline at all. `activate` fires when the new version takes over, and is where old caches get deleted. `fetch` fires for every request a page makes, and is where the strategy actually lives.

Those strategies are conventionally listed as five: **cache-first** (fast, risks staleness), **network-first** (fresh, falls back to cache), **cache-only**, **network-only**, and **stale-while-revalidate** (serve the cached copy, refresh it in the background). Choosing between them is a question asked per resource rather than per site — content a reader expects to be current wants network-first, while fingerprinted assets that never change under a given URL want cache-first.

It is small enough to hand-write. Libraries like [Workbox](https://developer.chrome.com/docs/workbox) exist because the edge cases multiply once a site wants precache manifests, expiry policies and background sync; a site that only wants "pages fresh, assets cached, everything wiped on deploy" is a few dozen lines and no dependency.

## In jedee

jedee is an installable PWA, and a visited page is served back fully styled when the network is gone. That's about 25 lines of hand-written JavaScript in `src/pages/serviceworker.njk`, registered by a six-line inline script at the foot of `base.njk`. No Workbox, no npm package, no build step. Of the five strategies, it uses three.

| Strategy | Behavior | Used for |
|---|---|---|
| Network only | Always the network, never cached | Non-GET and cross-origin requests |
| Network first | Try the network, fall back to cache | Page navigations |
| Cache first | Serve from cache, fetch on a miss | CSS, JS, fonts, images |
| Stale-while-revalidate | Serve cached, refresh in background | Not used |
| Cache only | Always cache, never network | Not used |

Nothing is truly cache-only: the precached files still fall back to the network on a miss, which makes them cache-*first*.

### The router is one if/else, read top to bottom

```js
// Dev bypass
if (IGNORED_HOSTS.includes(url.hostname)) return

// Network only
if (request.method !== 'GET' || url.origin !== self.location.origin) return

// Network first
if (request.mode === 'navigate') { /* fetch, cache a copy, fall back on error */ }

// Cache first — everything else
```

**Pages are network-first** so content is never stale online, using navigation preload where the browser supports it, and a copy goes into the cache in the background. Offline, the handler returns the cached page — and only falls back to `/offline/` for a URL you have genuinely never opened.

**Assets are cache-first.** This is what makes an offline page render *styled* rather than as bare markup — though in production most of "styled" isn't an asset at all: the CSS is inlined into the HTML, so it arrives with the cached page rather than from a separate cached file. What runtime caching actually holds is fonts, images and the component scripts.

⚠ **Not the `/bundle/<hash>.css` paths.** A comment in `serviceworker.njk` used to claim runtime caching picks those up on first load. It can't: `css-inline.njk` only links them when `runMode === "serve"`, and a production build emits no `/bundle/` directory at all — while in dev, where they do exist, `IGNORED_HOSTS` makes this worker intercept nothing. The comment was corrected on 2026-07-31. See [[Three things called cache]], which had it right.

⚠ **The dev bypass matters.** `IGNORED_HOSTS` (`localhost`, `127.0.0.1`) makes the handler return before any branch, so the worker caches nothing under `npm start` and can't mask a freshly-edited asset behind a stale copy. The worker still *registers* on localhost — browsers allow that over plain http — it just intercepts nothing. This restores the original guard from [Max Böck's worker](https://github.com/maxboeck/eleventastic/blob/master/src/serviceworker.njk), which the first runtime-caching version had dropped. Developing on a LAN IP or a custom host means adding it to the array.

### The cache resets itself every deploy

```js
const CACHE_NAME = 'cache-{{ buildTime|toIsoString }}'
```

The name is stamped at build time, and `activate` deletes every cache whose name isn't the current one. **A new deploy therefore wipes the whole cache**, which is what makes aggressive cache-first storage of un-hashed assets safe here — there's no long-lived staleness to manage, so the versioned-filename problem never arises. `skipWaiting()` and `clients.claim()` make the new worker take over immediately instead of waiting for every tab to close.

There's a known ceiling, marked in the source: the runtime cache is unbounded within a build, with no count or age cap. For a personal site browsed a few hundred pages between deploys that's a non-issue, and each deploy clears it. Per-entry expiry is the upgrade path, not a present need.

Two entries fill the cache. **Precache on install** is a small stable set — `/`, the favicon and app icons, and `/offline/`, so the shell and fallback exist before the first offline visit. **Runtime** is everything else, as it's first requested, because the CSS arrives at hashed or query-busted paths that can't be listed by hand.

### Why not Workbox

Google's library is the standard answer, and it's deliberately not here. The whole need is 25 lines of vanilla JavaScript, and the one genuinely awkward thing to do by hand — precaching hashed paths with generated revisions — **stops being a problem the moment runtime caching exists**, since cache-first grabs hashed assets on first load anyway.

Workbox earns its keep where a precache manifest has to expand automatically as a forker adds post types across many sites. That's a template-reuse problem a single site doesn't have.

Related: [[Three things called cache]] — the SW cache sits in front of the browser cache. [[Progressive web apps]] — the manifest and the installability half, and where this worker came from.

Source: `_local/project_docs/pwa-caching-pattern.html` (runtime caching shipped 23 Jun 2026, commit `0275458`), re-verified against `src/pages/serviceworker.njk` on 2026-07-31.
