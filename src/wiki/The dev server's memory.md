---
description: "Telling a JS-heap leak from native memory, and from a one-off spike: what heapUsed, external and RSS each mean, why GC must be forced before reading them, and jedee's two unrelated out-of-memory crashes."
date: 2026-08-02
---

A build that dies of memory exhaustion says `JavaScript heap out of memory` and nothing else. The message names one place — the JavaScript heap — but the pressure that filled it frequently came from somewhere else, so the same words cover several unrelated problems: a genuine leak, memory held outside the heap by native image code, and an ordinary workload spike. They are fixed in completely different ways, which makes telling them apart the first job rather than a detail.

Treating that one message as one diagnosis is how debugging goes wrong. Node reports the crash when V8's *heap* hits its ceiling, but the memory that pushed a machine to that point is frequently not on the heap at all — native allocations by libraries like sharp/libvips, or buffers held as ArrayBuffers, count toward the process's footprint while barely touching heap. So the message can be a symptom of pressure that originates elsewhere.

`process.memoryUsage()` separates them:

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

**The per-rebuild leak** happens in `eleventy --serve`, on an edit, with the server already idle and warm — and it is Eleventy's own. With GC forced twice before each reading, `heapUsed` climbs about 368 MB per rebuild and never comes back:

```
build 1  heapUsed  574 MB   heapTotal  829   external 41   rss 1473
build 2            949 MB              1389           43       1944
build 3           1319 MB              1829           48       2667
build 4           1682 MB              2247           50       2801
build 5           2051 MB              2576           52       3081
```

`external` and `arrayBuffers` stay at 40–60 MB throughout, so this is plain JS objects — not sharp, and therefore not the same problem as the cold-build spike. A snapshot at build 2 held 4.4M anonymous `Object` and 5.4M concatenated strings: a retained copy of the whole build.

The bisect exonerated everything jedee controls. Slope stayed within ±10 MB of ~368 MB with the CSS/JS `eleventy.before` hook off, the image transform plugin off, the interlinker off, the wiki dial at `private`, and with `--incremental`. `html-minifier-terser` only runs under `ELEVENTY_ENV=production`, and `svgToJpeg` is a no-op once the OG images exist. What remains is Eleventy 3.1.5 holding the previous build's render graph.

Mitigated, not cured, by raising the ceiling in `package.json`:

```json
"dev:11ty": "cross-env ELEVENTY_ENV=development NODE_OPTIONS=--max-old-space-size=8192 eleventy --serve"
```

Verified at 14 consecutive CSS edits without a crash, where it had died at 10. That is roughly 20 edits per session before the dev server wants restarting.

**Why a CSS edit is the expensive one, and two wrong answers.** It is *not* that the CSS is inlined into every page — `src/_includes/head/css-inline.njk` branches on `eleventy.env.runMode` and serves external stylesheets in development on purpose, inlining only in production (see [[Three things called cache]], where that inlining is the cache-busting strategy). It is also not the content-hashed bundle URL: hardcoded stable URLs plus `--incremental` still wrote all 538 files. The real reason is that `addWatchTarget('./src/assets/**/*.{css,js,svg,png,jpeg}')` performs no dependency analysis, so any matching file rebuilds every page.

That points at the real cure, not implemented: compile CSS into the output directory with its own watcher and drop `*.css` from `addWatchTarget`, so a CSS edit costs zero Eleventy rebuilds. It needs a standalone watcher — `buildAllCss` only runs from `eleventy.before` today — and diverges from Eleventy Excellent's wiring.

Both crashes are separate again from [[Watch loops]], which multiplied this leak: nine self-triggered rebuilds at ~370 MB apiece arrive as 3.3 GB at once, which is why a single keystroke could kill the server outright rather than merely bringing it nearer the wall.

Raw source: `src/_raw/dev-notes/How the dev server was made survivable.md`
