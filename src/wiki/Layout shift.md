---
description: "Cumulative Layout Shift: what it measures, why the element that moves is rarely the element at fault, and the 0.197 measured on this site's landing page."
date: 2026-09-06
---

A page that moves under the reader is a specific kind of broken. You go to click a link and an image finishes loading above it, so you click an ad instead. You start reading a paragraph and a font swaps in, reflowing the line you were on. Nothing failed and nothing is slow — the page simply arrived in pieces, and the later pieces pushed the earlier ones around.

**Cumulative Layout Shift** (CLS) is [Google's attempt to score that](https://web.dev/articles/cls), and it is one of the three Core Web Vitals. Each individual shift is scored as *impact fraction* × *distance fraction*: how much of the viewport the moving content occupies, multiplied by how far it moved relative to the viewport. Those are summed within a session window, and the largest window becomes the page's CLS. Under 0.1 is "good", over 0.25 is "poor".

Two properties of that formula matter more than the definition:

- **Only *unexpected* shift counts.** A shift within 500 ms of a user input — you clicked a disclosure and it opened — is excluded, via the `hadRecentInput` flag. CLS is about the page moving on its own.
- **Big movers are punished disproportionately.** The impact fraction is the *area* of what moved. A tall container nudged a few pixels scores far worse than a small element thrown across the screen, because the score is about how much of the reader's view was disturbed.

The mitigations are all versions of one instruction — reserve the space before you know what goes in it. Put `width` and `height` on every image so the browser can compute the box from the aspect ratio before a byte of image arrives. Give embeds and ads a fixed reserved box. Never insert content above content that is already on screen. And for fonts, either accept the fallback or make the fallback the same size as the real thing.

That last one is worth spelling out, because it is the subtlest. `font-display: swap` renders text immediately in a fallback and swaps the web font in when it arrives — good for reading, but the swap reflows every line if the two faces have different metrics. The fix is a `@font-face` block that describes the *fallback* with `size-adjust`, `ascent-override` and `descent-override` tuned so it occupies the same space as the real font ([the generator at screenspan.net/fallback](https://screenspan.net/fallback) computes them). Done properly the swap is invisible in layout terms.

## In jedee

Eleventy Excellent ships the whole standard kit and jedee has not changed it: both fonts are `rel="preload"`ed in `head/preloads.njk`, both `@font-face` blocks set `font-display: swap`, and `base/fonts.css` carries a metric-matched fallback face for each — `Source Serif Fallback` over Georgia, `Source Sans Fallback` over Arial, with the `size-adjust` / `ascent-override` / `descent-override` triple filled in. Images go through eleventy-img, which writes `width` and `height`. [[The YouTube embed]] reserves its box with a steady placeholder rather than letting the poster arrive into nothing.

All of which makes the measured result more interesting, not less.

### The same page measures 0 locally and 0.197 in production

Lighthouse 12, mobile preset, run on 2026-09-06 against the production build served locally, and then against the live site:

| Run | Perf | A11y | Best practices | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` local `dist/`, desktop | 100 | 100 | 100 | 66 | 0.004 |
| `/` local `dist/`, mobile | 99 | 100 | 100 | 66 | **0** |
| `/notes/` local `dist/`, mobile | 99 | 100 | 100 | 66 | **0** |
| `/` live, mobile | 90 | 100 | 100 | 66 | **0.197** |

Same commit, same markup. The local run is not wrong, it is *unloaded* — everything arrives instantly from `python3 -m http.server` on the same machine, so the font is there before there is anything to reflow. Production has real latency, the fallback paints first, and the swap lands after. **A local Lighthouse run cannot see a shift that needs network latency to exist.** The gap here is the whole score: 0.197 is what holds performance at 90 instead of 100.

The SEO 66 is `is-crawlable` failing on the site-wide `noindex` of the soft launch, expected, and it will clear at 1.0.0.

### The element that moves is not the element at fault

Lighthouse attributes **0.196 of the 0.197** to one element:

```
<div class="region feature">   score 0.1960   cause: Web font loaded
                                              (…/source-sans/source-sans.woff2)
```

That div is the landing page's masonry grid — `src/pages/index.njk`, wrapping a `<custom-masonry>` of demo blocks. It is 7,093 px tall in the mobile run. The *cause* Lighthouse names is the Source Sans web font loading; the *element* it names is the grid, because the grid is what visibly moved, and it is enormous, so the impact fraction is close to the whole viewport.

Two shifts from the same font swap, on the same page, show the size effect directly:

| Element | Score |
| --- | --- |
| `<div class="region feature">` — the masonry grid, 7,093 px tall | 0.1960 |
| `<span lang="sv">` — the "Hej hej!" greeting ([[The lang attribute]]) | 0.0013 |
| `<span class="breadcrumb-caret">` — the header breadcrumb's caret, 1×15 px | 0.0000 |

One font load, three elements, a 150× spread in what it cost. The greeting and the caret reflow too; they are simply too small to matter. This is why "which element moved" is a poor guide to what to fix — everything downstream of a late font moves, and the ranking is by size, not by blame.

⚠ So the honest reading is that the fault is shared, and the report alone does not settle it. The font is what Lighthouse names, and every standard font mitigation is *already in place*, which is the puzzle. What is unusual about this block is that its layout is computed in JavaScript from measured positions. `custom-masonry` waits a frame after hydrating, then walks its children and sets an explicit `margin-top` on each one, pulling it up under the item in the column above:

```js
const previousItemBottom = previousItem.offsetTop + previousItem.offsetHeight + rowGap;
item.style.marginTop = `${previousItemBottom - item.offsetTop}px`;
```

That is a real layout change applied after first paint, to a 7,000 px block, and it is recomputed only on `resize` — not when a font finishes loading. So there are two candidate mechanisms and the report cannot tell them apart: the font swap reflowing a very large block, or the masonry pass applying its margins a frame after hydration. They are also not exclusive.

Both point the same way, which is convenient: **remove the grid and re-measure.** That is planned anyway, and it is the clean A/B — if CLS drops to near zero the grid was the mover, and if it does not, the font is, and the fallback metrics want another look.

### Measuring it honestly

⚠ Two ways to get a wrong number, both met on the day this page was written.

**Your own browser scores your site.** A Lighthouse run from a normal profile reported Best Practices 96 on the live site, on the strength of one console error: `cloud.umami.is/script.js — net::ERR_BLOCKED_BY_CLIENT`. That is a content blocker in the *auditing* browser refusing the analytics script. The same page from a clean headless profile scores **100** with zero console errors. The site did not change; the browser did. Run the audit in a clean profile before believing a Best Practices deduction — though note the real-world corollary, that a visitor with a blocker does see that error, and the analytics simply do not record them.

**An automated browser pane can report a zero-height viewport,** in which an `IntersectionObserver` never fires — so every [[is-land]] `on:visible` island looks permanently un-hydrated while the `on:idle` ones look fine. That produced two confident and completely false findings before the viewport was checked. See the same warning on [[is-land]].

Raw source: four Lighthouse 12 JSON reports in `src/_raw/lighthouse-2026-09-06/`, run 2026-09-06 against `dist/` on `python3 -m http.server` and against the live site.
