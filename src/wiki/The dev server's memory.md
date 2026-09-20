---
description: "Telling a JS-heap leak from native memory, and from a one-off spike: what heapUsed, external and RSS each mean, why GC must be forced before reading them, and jedee's two unrelated out-of-memory crashes."
date: 2026-08-02
updated: 2026-09-20
---

A build that dies of memory exhaustion says `JavaScript heap out of memory` and nothing else. The message names one place — the JavaScript heap — but the pressure that filled it frequently came from somewhere else, so the same words cover several unrelated problems: a genuine leak, memory held outside the heap by native image code, and an ordinary workload spike. They are fixed in completely different ways, which makes telling them apart the first job rather than a detail.

Treating that one message as one diagnosis is how debugging goes wrong. Node reports the crash when V8's *heap* hits its ceiling, but the memory that pushed a machine to that point is frequently not on the heap at all — native allocations by libraries like sharp/libvips, or buffers held as ArrayBuffers, count toward the process's footprint while barely touching heap. So the message can be a symptom of pressure that originates elsewhere.

`process.memoryUsage()` separates them:

Table: What each `process.memoryUsage()` field holds
| Field | What it holds |
| --- | --- |
| `heapUsed` | live JS objects — where a genuine leak in JS code shows |
| `heapTotal` | heap V8 has reserved; grows when `heapUsed` won't fit |
| `external` / `arrayBuffers` | memory owned by C++/native bindings and typed-array backing stores |
| `rss` | the whole resident process, native allocations included |

**Two rules make the numbers trustworthy.** First, force garbage collection before every reading (run with `--expose-gc` and call `global.gc()`), otherwise you are measuring collection timing, not retention — an uncollected-garbage sawtooth and a real leak look identical in an unforced sample. Second, take readings at the same point in a repeating cycle, so successive numbers are comparable.

Read together, they classify the problem quickly. `heapUsed` climbing on a straight line across cycles while `external` stays flat is a JS leak. `rss` and `external` spiking while `heapUsed` stays modest is native memory — the crash message will still say "heap", misleadingly. A single spike that recovers is a workload peak, not a leak, and is fixed by throttling concurrency rather than by hunting retainers.

**Isolating the owner** is elimination, not intuition. Disable one component per run and compare slopes; anything that leaves the slope unchanged is exonerated. A heap snapshot (`v8.writeHeapSnapshot()`) tells you *what* is retained, though on a large heap the answer is often an ocean of anonymous `Object` and string nodes with no single named owner, which points at a framework holding a whole build rather than at any one call site. Snapshots above ~512 MB also exceed Node's maximum string length, so they have to be parsed as a stream rather than with `JSON.parse`.

## In jedee

The site has hit two out-of-memory crashes with the same message and entirely different causes. Telling them apart by *when* they fire is the fastest triage.

**The cold-build spike** happens during an initial build, and is the image pipeline: eleventy-img and sharp processing ~370 images, worst on a cold cache when about 100 remote covers download at once. Measured, a cold build peaks around 2.1 GB RSS while the V8 heap stays under 900 MB — it builds fine even when the heap is capped at 900 MB, which is the proof that the memory is native rather than JS. The lever is concurrency, set once at module scope:

```js
import Image from '@11ty/eleventy-img';
Image.concurrency = 4;   // default is CPU count
```

It is a module global, so the single line covers every eleventy-img path: the transform plugin, the `{% image %}` and `{% lightbox %}` shortcodes, OG-image generation and YouTube posters.

**The per-page leak** happens in `eleventy --serve`, on an edit, with the server already idle and warm — and it is Eleventy's own. It is paid per page *rendered*, not per rebuild, which is what decides how long a session lasts. With GC forced twice before each reading, one content edit — 159 of 681 pages rebuilt — gives a dead-straight line:

```
build 1  heapUsed 1042 MB   external 38   rss 2101
build 2           1199 MB              38       2165
build 3           1354 MB              38       2474
build 4           1510 MB              38       2640
build 5           1666 MB              38       2820
build 6           1822 MB              38       2986
build 7           1977 MB              38       3075
build 8           2133 MB              38       3073
```

+156 MB each time, eight times running, never varying by more than a megabyte. On the same server, editing a template that invalidates only itself costs +1 MB. So the figure to carry is about **1 MB of retained heap per page rendered**, and the cost of a save is whatever it rebuilds:

Table: What one save costs, on a 681-page site
| Saving this | Pages rebuilt | Heap kept | Saves before the 8 GB ceiling |
| --- | --- | --- | --- |
| one page template | 1 | +1 MB | thousands |
| any content file | 159 | +156 MB | ~47 |
| any global CSS file | 681 | +607 MB | ~12 |

`external` and `arrayBuffers` stay at 38–60 MB throughout, so this is plain JS objects — not sharp, and therefore not the same problem as the cold-build spike. A snapshot held 4.4M anonymous `Object` and 5.4M concatenated strings: a retained copy of the whole build.

The bisect exonerated everything jedee controls. Measured before `--incremental` was in the dev script, when every rebuild was the whole site, the slope stayed within ±10 MB of ~368 MB with the CSS/JS `eleventy.before` hook off, the image transform plugin off, the interlinker off, the wiki dial at `private`, and with `--incremental`. `html-minifier-terser` only runs under `ELEVENTY_ENV=production`, and `svgToJpeg` is a no-op once the OG images exist. What remains is Eleventy holding the previous build's render graph; 3.1.6 is still the latest release and still does it.

**Saves cannot be batched while `--incremental` is on.** ⚠ `setWatchThrottleWaitTime(ms)` looks like the lever and is accepted without complaint, but it cannot make one rebuild cover several saves: it is a debounce on when the first build *starts*, and under `--incremental` Eleventy then drains its watch queue one file per build. Five files saved inside a 500 ms window still produced five rebuilds. Eleventy says so in a comment at the top of `EleventyWatch.js` — "Incremental builds don't batch changes, they queue. Nonincremental builds batch." — and `getActiveQueue()` returns `[this.activeQueue[0]]` when incremental. The countdown in "You saved while Eleventy was running, let's run again. (4 changes)" is that queue draining, not Eleventy absorbing a burst. Dropping `--incremental` does batch, at the price of every rebuild being all 681 pages.

**Why one content save rebuilds 159 pages.** 134 of them are the paginated tag and genre indexes. Both collections are built with `collection.getAll()`, so any template changing anywhere dirties them, and every page they paginate into is rebuilt. Narrowing the source looks like the fix and is not: `tagList` pointed at `getFilteredByGlob('./src/posts/**/*.md')` and `genreList` at the jams folder — both correct on their own terms, since tags and genres only ever come from posts — and a content edit still wrote exactly 159 files. Eleventy does not track which templates a custom collection actually read, so a custom collection is dirty whenever anything is. Reverted.

The ceiling is raised in `package.json`, and `npm start` now relaunches the server rather than leaving a dead port when the ceiling is reached anyway:

```json
"dev:11ty": "cross-env ELEVENTY_ENV=development NODE_OPTIONS=--max-old-space-size=8192 eleventy --serve --incremental",
"start": "until npm run dev:11ty; do echo '↻ dev server ran out of memory — restarting'; sleep 2; done",
"dev:mem": "cross-env ELEVENTY_ENV=development MEMLOG=1 NODE_OPTIONS='--max-old-space-size=8192 --expose-gc' eleventy --serve --incremental"
```

`dev:mem` prints retained heap after each build, so the slope above can be re-measured without building the instrumentation again.

**Why a CSS edit is the expensive one, and two wrong answers.** It is *not* that the CSS is inlined into every page — `src/_includes/head/css-inline.njk` branches on `eleventy.env.runMode` and serves external stylesheets in development on purpose, inlining only in production (see [[Three things called cache]], where that inlining is the cache-busting strategy). It is also not the content-hashed bundle URL: hardcoded stable URLs plus `--incremental` still wrote all 538 files. The real reason is that `addWatchTarget('./src/assets/**/*.{css,js,svg,png,jpeg}')` performs no dependency analysis, so any matching file rebuilds every page.

**The cure, implemented 2026-09-20.** The global CSS left that watch target, and the dev server was pointed at the compiled file instead:

```js
eleventyConfig.watchIgnores.add('src/assets/css/global/**');
eleventyConfig.setServerOptions({watch: ['dist/assets/css/global.css']});
```

`watchIgnores`, not `ignores` — the same distinction as the fix above, watch-only, so template discovery and include resolution are untouched. Serving also writes the compiled global CSS to `dist/` as a plain file alongside the include copy production inlines, keyed on `ELEVENTY_RUN_MODE === 'serve'` so the condition stays in step with the `runMode` branch in `head/css-inline.njk` that links it. A recompile-on-save watcher runs *inside* the Eleventy process — `node:fs`'s recursive `watch`, started once from the existing `eleventy.before` hook — so there is no second process, no extra terminal and no new dependency, which is what the August note had assumed a standalone watcher would cost. It catches its own errors, because a half-typed rule mid-edit would otherwise take the server down with it.

The result is a CSS save that Eleventy declines to build for at all:

```
[css] global.css rebuilt
[11ty] File changed: dist/assets/css/global.css (skips build)
```

Eight consecutive CSS saves: zero rebuilds, memory flat, 0.79 s from save to compiled file against 12 s for the full rebuild it replaces. The dev server swaps the stylesheet in place rather than reloading the page. Production is unaffected — `dist/index.html`, a wiki page and the compiled `global.css` are byte-identical to a build from before the change, and `dist/assets/css/` does not exist after a production build. The divergence from Eleventy Excellent's wiring is dev-only and narrow: one bundle's URL goes unused while serving, so a mistake in it would surface on the next production build rather than in the browser. The `{% css "global" %}` block still runs in dev, so a broken include still fails in front of you.

Only the *global* CSS moves. `local/*.css` is per-page by definition — which local files a page carries depends on its partials — so it stays on the bundle, and saving one still rebuilds the pages that use it.

Both crashes are separate again from [[Watch loops]], which multiplied this leak: nine self-triggered rebuilds at ~370 MB apiece arrive as 3.3 GB at once, which is why a single keystroke could kill the server outright rather than merely bringing it nearer the wall.

Raw sources: `src/_raw/dev-notes/How the dev server was made survivable.md`, `src/_raw/dev-notes/How a CSS save stopped rebuilding the site.md`
