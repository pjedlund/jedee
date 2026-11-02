---
description: "What forces a browser to lay the page out in the middle of a script, why doing it in a loop freezes the page, and how to record a page load well enough to find the line responsible."
date: 2026-10-07
---

A browser normally batches its work. A script changes the DOM or a style, the browser notes that layout is out of date, and it recalculates styles and layout once, just before the next frame is painted. **Forced layout** (also called forced synchronous layout, or a reflow) is when a script asks a question that can only be answered with up-to-date layout — an element's size, its position, its computed style — while layout is out of date. The browser has to stop and do the whole recalculation right there, inside the script, before it can answer.

One forced layout is usually harmless. The damage comes from a loop that alternates writing and reading: change the DOM, read a computed value, change the DOM again, read again. Every read pays for a full recalculation, because every write made the previous one stale. This is **layout thrashing**, and on a large page each recalculation can cost several milliseconds, so a loop over a hundred items freezes the page for a second while nothing is painted.

The reads that force layout are many and not obvious from their names: `offsetWidth` and the other `offset*`/`client*`/`scroll*` properties, `getBoundingClientRect()`, `getComputedStyle()` followed by reading a value, `innerText`, `focus()`, and more. [Paul Irish's list of what forces layout](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) is the reference. web.dev's [Avoid large, complex layouts and layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) covers the fixes, which come down to three:

- **Read everything first, then write.** Batch the reads before any DOM change, so only the first read pays.
- **Don't read what you already know.** If many elements resolve to the same few values, work each value out once and remember it.
- **Keep reads off the page.** A measurement done in a detached or offscreen element still forces style, but not a layout of the whole document.

## Finding it

A forced-layout freeze looks like a slow network from the outside: something on the page stays blank. The network tools can rule that out, but only the Performance panel shows the cause. In a Chromium browser (Chrome, Edge, Helium), these are the recordings that matter, roughly in the order they narrow things down:

- **Network → Capture screenshots** (the gear in the Network panel) adds a filmstrip above the waterfall. It only adds a frame when the screen changes, and the overview's time-range selection hides frames outside it — double-click the overview to see the whole load.
- **A screen recording** (<kbd><kbd>⌘</kbd><kbd>⇧</kbd><kbd>5</kbd></kbd> on macOS) films the real load on the real connection. Stepping it in QuickTime with the arrow keys shows one frame at a time. macOS only writes a frame when the screen changes, so a 60 fps file can hold far fewer frames than its length suggests.
- **A HAR export** (the Network panel's download icon) is every request with its timings, readable by a script. A long stretch with no requests while the page still looks unfinished means the wait is not the network.
- **A Performance trace** (record-and-reload, with Screenshots ticked, then the download icon) puts the network, the screenshots and the main thread on one timeline. A long task on the Main row with a single very long entry on the Frames row is a page that could not paint. The Summary splits that time into Scripting and Rendering; when Rendering dwarfs Scripting inside a script's task, the script is forcing layout. The trace file is JSON: each forced `Layout` and `UpdateLayoutTree` event carries the stack trace of the line that caused it, so counting them by stack names the culprit.

In a running page, the [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames) reports the same thing per script: each entry's `scripts[].forcedStyleAndLayoutDuration`. It only reports frames that were actually rendered, so a background tab or a hidden automated browser reports nothing at all.

## In jedee

The activities page showed an empty map box for over a second before [[The place map]]'s preloader appeared. A HAR showed `place-map.js` downloaded at 535 ms and the first tile request at 1,985 ms, with nothing in between — so the gap was not the network. The Performance trace showed one 1,233 ms task evaluating the module, a single 1,283 ms frame, and 1,201 ms of Rendering against 204 ms of Scripting. Grouping the trace's forced layouts by stack put **280 of the 286** on two lines of `cssColor()`, called once per activity row from `initPlaces()`.

`cssColor()` turns a CSS color MapLibre can't parse (`color-mix()`, `oklab()`) into `rgba()`: it appends a `<span>` with that color, reads the span's computed color, removes it, and paints the result into a 1×1 canvas. The append makes layout stale and the read forces it — twice per row, 140 rows, about 4 ms each on a page this size. There are only three activity colors.

The fix remembers each resolved value:

```js
const probed = new Map(); // ⚠ each probe forces a page layout; keyed by the resolved value, so a theme flip misses the cache instead of going stale
function cssColor(el, prop) {
  const value = getComputedStyle(el).getPropertyValue(prop).trim();
  if (!value) return undefined;
  if (!probed.has(value)) probed.set(value, probeColor(el, value));
  return probed.get(value);
}
```

The cache key is the custom property's value with its `var()`s already substituted, so a theme switch that changes a color produces a new key rather than a stale hit. That holds only while no `--place-color` or `--map-*` value contains `currentColor` or `light-dark()`, which stay unresolved in the value text. Timed on the live page against the same 140 rows: **1,600 ms before, 31 ms after**, identical colors out. On a production build the whole map setup dropped to about 103 ms of script, 39 ms of it forced layout.

Raw source: `src/_raw/dev-notes/How the map preloader delay was traced to forced layout.md` (the session of 2026-10-07), with the HAR, screen recording and Performance trace in `_local/generated/preloader/`.
