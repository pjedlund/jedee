---
description: "Cumulative Layout Shift: what it measures, why the element that moves is rarely the element at fault, and how a font-size-adjust fighting a size-adjust cost this site 0.18."
date: 2026-09-06
---

A page that moves under the reader is a specific kind of broken. You go to click a link and an image finishes loading above it, so you click an ad instead. You start reading a paragraph and a font swaps in, reflowing the line you were on. Nothing failed and nothing is slow — the page simply arrived in pieces, and the later pieces pushed the earlier ones around.

**Cumulative Layout Shift** (CLS) is [Google's attempt to score that](https://web.dev/articles/cls), and it is one of the three Core Web Vitals. Each individual shift is scored as *impact fraction* × *distance fraction*: how much of the viewport the moving content occupies, multiplied by how far it moved relative to the viewport. Those are summed within a session window, and the largest window becomes the page's CLS. Under 0.1 is "good", over 0.25 is "poor".

Two properties of that formula matter more than the definition:

- **Only *unexpected* shift counts.** A shift within 500 ms of a user input — you clicked a disclosure and it opened — is excluded, via the `hadRecentInput` flag. CLS is about the page moving on its own.
- **Big movers are punished disproportionately.** The impact fraction is the *area* of what moved. A tall container nudged a few pixels scores far worse than a small element thrown across the screen, because the score is about how much of the reader's view was disturbed.

The mitigations are all versions of one instruction — reserve the space before you know what goes in it. Put `width` and `height` on every image so the browser can compute the box from the aspect ratio before a byte of image arrives. Give embeds and ads a fixed reserved box. Never insert content above content that is already on screen. And for fonts, either accept the fallback or make the fallback the same size as the real thing.

That last one is worth spelling out, because it is the subtlest. `font-display: swap` renders text immediately in a fallback and swaps the web font in when it arrives — good for reading, but the swap reflows every line if the two faces have different metrics. The usual fix is a `@font-face` block describing the *fallback* with `size-adjust`, `ascent-override` and `descent-override` tuned so it occupies the same space as the real font ([the generator at screenspan.net/fallback](https://screenspan.net/fallback) computes them).

⚠ **A `@font-face` inserted with JavaScript *after* load does not honour `size-adjust`** — which is easy to mistake for the descriptor being broken, and this page made exactly that mistake. It previously claimed `size-adjust` was silently ignored in Chromium, on the strength of a control that injected `local('Arial')` faces at 200% and 50% into an already-parsed document and measured both at exactly 1.000× Arial. Declared in the *initial* document instead, the same faces measure 2.0000× and 0.5000× — exact, in the same Chrome 152. The shipped fallback proves it in situ without any synthetic test: `Source Sans Fallback` measures 594.11 px against raw Arial's 633.72 px on the live page, a ratio of 0.9375, which is precisely its declared `size-adjust: 93.7639%`. Measure a font descriptor in a document that was parsed with it, never in one you added it to afterwards.

The other option is `font-display: optional`: the browser uses the web font only if it is ready within roughly 100 ms, otherwise it keeps the fallback for that entire pageview and quietly caches the font for the next navigation. No swap can happen, so swap-induced shift is zero by construction.

⚠ **That 100 ms is almost never met on a real network, so `optional` is a worse trade than it looks.** The window is counted from when the *font request starts*, and the font cannot be requested until the HTML referencing it has arrived. On this site's live pages that is 250–350 ms in, after which the fonts take a further 170–350 ms to land. Measured over five cold loads, unthrottled, the fallback painted every single time. So `optional` does not trade "some visitors on slow connections see the fallback" for zero shift — it trades *every first visit, on any connection*. The web font only ever appears from the second navigation onward, off the cache.

## In jedee

Eleventy Excellent ships the whole standard kit: both fonts are `rel="preload"`ed in `head/preloads.njk`, all four web `@font-face` blocks set `font-display: swap`, and `base/fonts.css` carries a metric-matched fallback face for each — `Source Serif Fallback` over Georgia, `Source Sans Fallback` over Arial, with the `size-adjust` / `ascent-override` / `descent-override` triple filled in by [Capsize](https://github.com/seek-oss/capsize). Images go through eleventy-img, which writes `width` and `height`. [[The YouTube embed]] reserves its box with a steady placeholder rather than letting the poster arrive into nothing. jedee has changed exactly one thing about the kit, and it is a *removal* — see below.

All of which makes the measured result more interesting, not less.

### The same page measures 0 locally and 0.197 in production

Lighthouse 12, mobile preset, run on 2026-09-06 against the production build served locally, and then against the live site:

Table: Lighthouse 12, mobile preset, 2026-09-06
| Run | Perf | A11y | Best practices | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` local `dist/`, desktop | 100 | 100 | 100 | 66 | 0.004 |
| `/` local `dist/`, mobile, *simulated* throttling | 99 | 100 | 100 | 66 | **0** |
| `/` local `dist/`, mobile, *devtools* throttling | 91 | 100 | 100 | 66 | **0.197** |
| `/notes/` local `dist/`, mobile | 99 | 100 | 100 | 66 | **0** |
| `/` live, mobile | 90 | 100 | 100 | 66 | **0.197** |

Same commit, same markup. The gap is the whole score — 0.197 is what holds performance at 90 instead of 100.

⚠ **The cause turned out to be a Lighthouse setting, not the local server.** Lighthouse's default `--throttling-method=simulate` loads the page at full speed and then models what a slow connection *would* have done, arithmetically, after the fact. A layout shift is a real event in a real load: if the font arrives before there is anything to reflow, no shift happens, and no amount of post-hoc modelling invents one. Re-running the identical local build with `--throttling-method=devtools`, which throttles the actual load in the browser, reproduces the live figure exactly — **CLS 0.197, the same 0.196 on the same element, the same named cause**. So a local build can measure this; the default preset simply cannot. Use `devtools` throttling for anything about layout shift.

The SEO 66 is `is-crawlable` failing on the site-wide `noindex` of the soft launch, expected, and it will clear at 1.0.0.

### The element that moves is not the element at fault

Lighthouse attributes **0.196 of the 0.197** to one element:

```
<div class="region feature">   score 0.1960   cause: Web font loaded
                                              (…/source-sans/source-sans.woff2)
```

That div is the landing page's masonry grid — `src/pages/index.njk`, wrapping a `<custom-masonry>` of demo blocks. It is 7,093 px tall in the mobile run. The *cause* Lighthouse names is the Source Sans web font loading; the *element* it names is the grid, because the grid is what visibly moved, and it is enormous, so the impact fraction is close to the whole viewport.

Two shifts from the same font swap, on the same page, show the size effect directly:

Table: Two shifts from the same font swap
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

Both point the same way, which is convenient: **remove the grid and re-measure.** That was done the same day, and the answer is below.

### The A/B: the grid was the biggest mover, not the cause

The masonry JavaScript came out on 2026-09-06 — `custom-masonry.webc` lost its `<is-land>`, its `<template>` and its script, keeping the tag and `class="grid"` so every call site and stylesheet stayed put, and `custom-masonry.js` was deleted. The landing page's demo blocks, which existed only to illustrate the grid, went with it.

Table: CLS and performance before and after the masonry script came out
| Page | CLS before | CLS after | Perf before | Perf after |
| --- | --- | --- | --- | --- |
| `/` | 0.197 | **0.180** | 91 | 92 |
| `/notes/` | (no matched baseline) | **0.003** | — | **100** |

The landing page moved by 0.017. What changed is *which element Lighthouse blames*: the 0.196 that sat on the masonry grid is now **0.179 sitting on `<footer class="site-footer">`**, a 190 px element, with the same cause — `source-sans.woff2` loaded.

That is the answer, and it is the opposite of the obvious reading of the first report. **The grid was never the cause; it was the largest thing standing downstream of the font swap.** Remove it and the swap moves the next-largest thing instead, for almost exactly the same score. The font is the whole story, and it always was — the grid was just where the damage showed up.

Which left an open question, stated plainly at the time rather than guessed at: every recommended font mitigation *is* correctly in place, including the fallback families being present in the `font-family` stacks where they actually take effect (`["Source Sans", "Source Sans Fallback", "sans-serif"]` in `fonts.json`), and the swap still moved the page far enough to score 0.18. So either the `size-adjust` / override triple was mistuned for this text, or something other than text metrics was resizing on swap. **It was the second, and the answer is in the next section.**

`/notes/` is a clean 100 either way. ⚠ It has no matched before-number — the earlier `/notes/` run used simulated throttling, which cannot be compared with these — so read it as the current state and not as an improvement this change caused.

### Lighthouse names a culprit; a PerformanceObserver names the event

Both readings above take Lighthouse's word for *what caused* each shift, and that field is a heuristic — it reports the network request that finished nearest the shift, which is a guess dressed as a finding. Two static tests built on that guess were wrong: forcing the whole page onto the fallback families after load moved the footer by **0 px at every viewport width from 360 to 1728**, and a line-count sweep across 58 widths found the intro paragraph wrapping identically in both fonts. On that evidence the font looked innocent.

The measurement that settled it installs the observer *before* navigation, under real throttling, and records what actually moves:

```js
await page.evaluateOnNewDocument(() => {
  window.__shifts = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput)
    window.__shifts.push({v: e.value, t: e.startTime, src: e.sources.map(s => s.node)});
  }).observe({type: 'layout-shift', buffered: true});
});
```

At 3G with 4× CPU throttling that reports **CLS 0.0993, of which 0.0922 lands in a single event at 4.2 s** — text nodes nudging down 3–4 px and one moving *up 46 px*, which at a 49 px line-height is a paragraph losing a line as the real font finally replaces the fallback. The font was the cause after all; the static tests could not see it because forcing a family after load is not the same sequence as a real load, where first paint happens before even the local fallback face has resolved.

### The first fix, and why it was withdrawn

All four web `@font-face` blocks went from `font-display: swap` to `optional` — one word each, no other change.

Table: CLS as the grid came out and `font-display` changed
| | CLS (observer, 3G + 4× CPU) | Lighthouse CLS | Lighthouse performance |
| --- | --- | --- | --- |
| masonry grid + `swap` | — | 0.197 | 91 |
| grid removed, still `swap` | 0.0993 | 0.180 | 92 |
| grid removed + `optional` | **0.007** | **0** | **100** |

The 0.0922 event was simply gone, and the landing page scored 100 / 100 / 100 with SEO 66 for the soft-launch `noindex`.

⚠ **It was the wrong fix, and the number that proved it was never taken.** The trade-off was checked as "does the real font apply on a fast connection", unthrottled, on a browser that had already cached the fonts from the previous run. The question that mattered is what a *first* visitor sees, and the answer, over five cold loads of the live site with no throttling at all, is the fallback — every time, for the reason in the `optional` warning above. `optional` had not reduced the shift so much as removed the thing that shifts: the web fonts were no longer being used.

### The real fix: `font-size-adjust` was fighting `size-adjust`

The shift never came from the fallback metrics. It came from one declaration Eleventy Excellent sets on `body`, added upstream in [`8536672`](https://github.com/madrilene/eleventy-excellent) (2024-08-24):

```css
font-size-adjust: from-font;
```

The two mechanisms in play match the fallback to the web font along *different axes*, and they disagree. The `@font-face` fallbacks are tuned by **average character width** (`size-adjust: 93.7639%`, from Capsize). `font-size-adjust: from-font` then re-matches the rendered text by **x-height** — and Arial's x-height ratio is 0.5186 against Source Sans's 0.4861, some 6.7% larger. So the fallback is scaled back up, the width match is undone, and the landing-page paragraph wraps to four lines where the web font takes three. Delete the line and the two faces occupy the same space again.

Measured on a local production build, cold cache, 3G + 4× CPU, observer installed before navigation:

Table: `font-display` and `font-size-adjust` combinations on four pages
| | landing, 1440 px | landing, 390 px | `/wiki/layout-shift/` | `/notes/` |
| --- | --- | --- | --- | --- |
| `optional` + `font-size-adjust` | 0 *(fallback painted)* | 0 *(fallback)* | 0 *(fallback)* | 0 *(fallback)* |
| `swap` + `font-size-adjust` | 0.1345 | 0.0589 | 0.0303 | 0.0544 |
| **`swap`, no `font-size-adjust`** | **0.0041** | **0.0012** | **0.0022** | **0.0008** |

So the site is back on `swap`, with `font-size-adjust: from-font` removed from `global-styles.css` — a deliberate divergence from Eleventy Excellent, and the only change jedee makes to Lene's font kit. Readers get the real typography on their first visit *and* a CLS an order of magnitude under the 0.1 "good" threshold. `base/fonts.css` carries a one-line warning against re-adding the declaration on the next upstream merge.

⚠ **A second mis-derivation existed and was fixed a day later, after an initial "leave it alone" call that a bad measurement had supported.** Both fallback faces were tuned to fonts this site does not ship, so both `size-adjust` values were re-derived by scoring the real page across viewport widths — `Source Serif Fallback` 110.8118% → **100.8%** (17/17 widths, was 12) and `Source Sans Fallback` 93.7639% → **92.5%** (12/13, was 10). Only `size-adjust` moved; the ascent and descent overrides are Capsize's, rescaled by the inverse ratio so the vertical box is byte-identical, since this site uses unitless line-heights and the vertical overrides are largely inert. The serif value is worth **CLS 0.0997 → 0.0020 at 720 px**, where the heading took two lines in Georgia against one in Source Serif.

The reason it was first waved off is worth keeping: a sweep reported no line-count change at any width from 360 to 1600 px, and that sweep reused one browser across 32 navigations, so every case after the first was served fonts from cache. **A measurement that says "no difference" deserves the same scrutiny as one that says "big difference"** — a broken harness returns "no difference" by default.

### Why fallback-metric tools never quite land it

The generators — [screenspan.net/fallback](https://screenspan.net/fallback), [Capsize](https://github.com/seek-oss/capsize), Malte Ubl's original — all do the same thing: pick one scalar from each font and set `size-adjust` to their ratio. That is genuinely the best a single descriptor can do, and it is why the output is never quite right.

**Three reasons, measured on this site.**

**1. One number, several requirements.** `size-adjust` matches an *average*, but any given line of text has its own letter mix. Deriving the value the heading actually needs from four different samples gives four different answers:

Table: The `size-adjust` each text sample needs
| sample | required `size-adjust` |
| --- | --- |
| the real `h1`, "Hej hej! I'm Johan." | 100.09% |
| an alphabet run | 100.12% |
| a heading-length title | 102.44% |
| a prose paragraph | 103.71% |

Nearly four points of spread. Whichever you pick is wrong for the other three.

**2. The metrics may not describe the font you ship.** Capsize's `sourceSerif4/700` records an average character width of 0.494 em. The subset actually served here measures **0.4316 em**. [[Font subsetting|Subsetting]] does not change advance widths, so this is a version or instance difference — but the generated `size-adjust: 110.8118%` was tuned to a font that is not on the site. Scored against the real page it matched 12 viewport widths out of 17, where a re-derived 100.8% matches all 17.

**3. `ch` is font-dependent, and so is anything built on it.** `1ch` is the advance of the "0" glyph, which differs per family even after `size-adjust` scales it:

Table: The width of `1ch` in each family
| | `1ch`, in em | vs its web font |
| --- | --- | --- |
| Source Sans | 0.49688 | — |
| Source Sans Fallback | 0.52141 | +4.94% |
| Source Serif | 0.54187 | — |
| Source Serif Fallback | 0.68000 | +25.49% |

So `prose.css`'s `max-inline-size: 60ch` (about 72 characters in the web font, see [[Line length]]) and the `--tracking` values in `ch` all resolve differently while the fallback shows. ⚠ **This turned out not to be the cause of any shift measured here** — converting every `ch` tracking value to `em` made letter-spacing identical between the two states and the footer still wrapped the same way, because the difference is around 1% of a sub-pixel value. Recorded because it is real and easy to assume is the culprit; it was measured and it is not.

**What is *not* a factor: font size.** `size-adjust` is a pure ratio, so it is scale-invariant — the required value for the heading is 100.119% at 32 px, 100.103% at 64 px and 100.100% at 107 px. Fluid `clamp()` type does not weaken metric matching.

### The shift no descriptor can reach

On the landing page at around 412 px the footer's link cluster wraps to **three rows in the fallback and two in the web font**, moving the footer 34 px and scoring **CLS 0.173**. That width is not arbitrary and the band is narrow — measured below. No `size-adjust` fixes it: tested down to 91.5%, 2.4% narrower than Capsize's own value, the row count never flips. A row of short uppercase link labels has a glyph mix nothing like the average the descriptor was fitted to, and the wrap sits right on a boundary at that width.

The page is short, so the footer is bottom-anchored — its top is `viewportHeight − footerHeight`, which makes the nav's height *its position*. The fix is to reserve the taller state across the band where the fonts disagree:

```css
@media (width < 27rem) {
  .site-footer .footer-links {
    min-block-size: var(--footer-links-reserve); /* 6rem */
    align-content: flex-start;
  }
}
```

`align-content` earns its line: centring the rows inside a taller box moves *every* row by half the slack when the row count changes, which is a shift of its own. Pinned to the top, only the links that actually change row move.

⚠ **Reserve in `rem`.** An earlier version used `lh` and did nothing, because `lh` is font-dependent — it grows and shrinks with the very thing being compensated for, exactly like the `ch` units above. Any reservation meant to absorb a font difference has to be written in a unit the font cannot move.

⚠ **This halves the shift, it does not remove it** — 0.1726 → 0.079. The box is stable now, but the seven links still redistribute between three rows and two when the font lands, and that redistribution is itself a layout shift. Only an identical row count in both fonts would remove it, and no CSS achieves that across every width: shrinking the link padding makes 412 px agree and 380 px disagree instead.

⚠ **Stacking the nav into a column measures worse, at 0.1055.** It was the option that looked cleanest, because it gives six rows in both fonts and the footer's *top* is then identical at every width. But impact fraction is area, and a much taller footer scores higher on the small per-row metric differences that remain. Both of these misjudgements came from the same mistake — comparing element *positions* between the two font states instead of measuring CLS. Position equality is necessary, not sufficient; the score counts every element that moved, not just the container.

### The band is 22 px wide, and Lighthouse sits inside it

Everything above measures the shift where it happens. The complementary question is where it *doesn't*, which turns out to be almost everywhere. Sweeping the landing page and forcing the fallback state directly — dropping the web family from each element's stack, leaving the rest of the declaration alone — gives this:

Table: Line counts in the web font and the fallback, by viewport width
| viewport | `h1` lines | intro lines | intro height Δ | footer rows, web / fallback |
| --- | --- | --- | --- | --- |
| 360 | 2 / 2 | 7 / 7 | 0 | 3 / 3 |
| 390 | 2 / 2 | 7 / 7 | 0 | 3 / 3 |
| 408 | — | — | — | 3 / 3 |
| **410** | — | — | — | **2 / 3** |
| **412** | 2 / 2 | 6 / 6 | 0.09 px | **2 / 3** |
| **425** | — | — | — | **2 / 3** |
| 432 | — | — | — | 2 / 2 |
| 720 | 1 / 1 | 4 / 4 | 0 | 2 / 2 |
| 1100 | 1 / 1 | 3 / 3 | 0.01 px | 1 / 1 |
| 1280 | 1 / 1 | 3 / 3 | 0 | — |

**Document height was identical in both font states at every width tested.** The heading and the intro paragraph never change line count anywhere in the range — the two fonts disagree about the footer and nothing else.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/layout-shift-font-band.png" alt="The site footer rendered six times in a three-by-two grid: at 390, 412 and 432 pixels wide, each in the web font and in the metric-matched fallback. At 390 both states take three rows of links; at 432 both take two. Only at 412 do they disagree — two rows in the web font, three in the fallback — and every one of the six reports the same 96-pixel cluster height." width="2640" height="1280">
  <figcaption>The band, re-measured rather than redrawn: each panel is the real footer in its own iframe at that viewport width, and the row counts are read back off the rendered geometry. Only the middle column disagrees. Note that all six report the same 96 px height — that is the reserve holding the box still while the links redistribute inside it, which is why the fix halves the shift instead of removing it.</figcaption>
</figure>

⚠ **The disagreement is a band roughly 409–430 px wide, and Lighthouse's mobile preset emulates 412 px** — inside it, near the lower edge. That is the whole reason the landing page carries a residual CLS on the mobile audit while measuring clean at 360, 390, 720 and up. It is not a mobile problem; it is a 22-pixel problem that the standard audit width happens to fall into. Anyone reproducing this at their own browser width will find nothing wrong.

The residual metric error after the re-derived descriptors, measured as pure advance width on one unwrapped string:

Table: The fallback faces' remaining width error
| | vs. its web font | without `size-adjust` |
| --- | --- | --- |
| Source Sans Fallback, the 207-character intro | **−1.75%** | Arial alone: +6.55% |
| Source Serif Fallback, "Hej hej! I'm Johan." | **+0.74%** | Georgia alone: +16.36% |

So `92.5%` overshoots slightly and `100.8%` undershoots slightly, which is the one-number limit from the section above, now stated as what is left rather than as what is required.

⚠ **Do not read a layout shift off two overlaid screenshots.** Superimposing the fallback and web-font states shows the words in the intro landing in visibly different places — line 1 runs 44 px longer in the fallback, line 3 runs 149 px shorter — which looks like a serious problem and costs exactly nothing, because the line *count* and the block height are the same. Narrower glyphs fit more words before the wrap, so the early lines fill closer to the edge and the last line empties out. The only thing worth reading off such a comparison is whether the number of lines changed; everything else is word-level jitter that moves nothing below it.

### Can an animation hide the swap?

A common pattern is a hero that fades and slides in on load, and on sites using it you rarely catch the font changing. Measured at 412 px on 3G with 4× CPU, cold cache:

Table: CLS and first paint, with and without a hero fade
| | CLS | FCP |
| --- | --- | --- |
| as built, no masking | 0.1614 | 568 ms |
| ungated hero fade, 0.6 s | **0.16** | 572 ms |
| reveal gated on `document.fonts.ready` (1.5 s ceiling) | **0** | 1544 ms |
| gated reveal + hero fade | **0** | 1168 ms |

⚠ **The decorative fade does nothing for the score.** A layout shift is counted whether or not the moving element is mid-animation, and here the fade had finished long before the font arrived at ~1.4 s. If those sites look smooth it is because the reader's eye is elsewhere, not because the technique fixed anything.

**Gating the reveal does zero the score** — an element at `opacity: 0` generates no `layout-shift` entry at all, which is worth knowing on its own. But it pays for that in first paint, and there is no usable middle:

Table: Gating the reveal on font load: CLS against first paint
| gate ceiling | CLS | FCP |
| --- | --- | --- |
| none | 0.1614 | 568 ms |
| 200 ms | 0.16 | 740 ms |
| 400 ms | 0.16 | 1060 ms |
| 700 ms | **0** | 1156 ms |
| 1000 ms | **0** | 1540 ms |

The ceiling has to outlast the font download before the shift disappears, and by then first paint has doubled. Below that you pay the FCP *and* still take the shift. That is the same trade `font-display: optional` made — hiding the problem rather than fixing it — just paid in blank screen instead of typography. Not adopted here.

### The established strategies, and where this site sits among them

The reference work here is Zach Leatherman's [A Comprehensive Guide to Font Loading Strategies](https://www.zachleat.com/web/comprehensive-webfonts/) — he also wrote [[is-land]] — which ranks eleven approaches. The ones worth knowing, roughly in order of effort:

Table: Font loading strategies, from Zach Leatherman's guide
| Strategy | What it does | JS? |
| --- | --- | --- |
| Unceremonious `@font-face` | A naked block and hope. Up to three seconds of invisible text. | no |
| `font-display` | Opt into a defined behaviour: `swap`, `fallback` or `optional`. Kills FOIT. | no |
| Preload | `<link rel="preload">` starts the fetch sooner. Delays first render slightly if you preload several. | no |
| Don't use web fonts | Eliminates both FOIT and FOUT outright. | no |
| Inline Data URI | Font embedded in blocking CSS. No flash of any kind, at the cost of a much later first render and one format only. | no |
| **FOUT with a class** | The web font is applied only under a class that JavaScript adds once the Font Loading API reports it loaded. Puts the swap under your control instead of the browser's. Demands discipline: every web-font rule must sit behind the class or text goes invisible. | yes |
| FOFT | Two stages — roman first, other weights after, with synthesised bold/italic in between. Less jumping than one big swap. | yes |
| **Critical FOFT** | Stage one is a tiny A–Z subset, stage two the full family. The subset arrives fast, so the reflow is small. Variants inline that subset as a Data URI or preload it. | yes |

**Every one of these controls *when* the swap happens. None of them makes a mismatched fallback stop reflowing** — that is what the `size-adjust` work above is for, and the two are complementary rather than alternatives.

**Where this site sits:** `font-display: swap` + preload + metric-matched fallback faces, all of it CSS, no JavaScript. That is the third and fifth rows of the table combined, and it is where Eleventy Excellent starts. Moving up to FOUT-with-a-class would let the swap be timed deliberately, but it makes the fonts JavaScript-dependent, which is a large concession for a site built on progressive enhancement. Critical FOFT would genuinely help — the subset is what makes its reflow small — but it needs a second build-time subsetting step per family and a two-stage loader. Neither is on the cards; recorded so the option is a decision rather than an oversight.

### A lab runner's CLS is only as real as its installed fonts

The next morning, Netlify's own Lighthouse run on the deploy that carried all of the above reported **CLS 0.305** — "poor", against 0.079 measured locally on the same build — and its first filmstrip frame showed the landing heading on **three lines**. No font state explains that from this machine: Source Serif, the matched fallback and even raw Georgia all set "Hej hej! I'm Johan." on two lines at 360 px, the width the plugin's pinned Lighthouse 9.6.8 emulates.

The fallback faces are `local()`-only — `local('Georgia')`, `local('Arial')`, `local('Courier New')` — and those are Microsoft fonts. Where one is absent the `@font-face` resolves to nothing, the family falls through to the platform generic, and every descriptor on it applies to nothing. Two platforms lack all three: **Android**, which is most real mobile traffic, and **Linux**, which is every Lighthouse runner. Netlify's build image ships only the DejaVu family ([netlify/build-image#327](https://github.com/netlify/build-image/issues/327) quotes its `fc-list`), and the audit runs in that image after the build.

So the reproduction fetched the candidate fonts *into the browser* rather than installing anything — Roboto and Noto Serif from Google Fonts, DejaVu from jsDelivr — declared each as its own family, and re-rendered the heading and the intro paragraph under every one at five widths:

Table: Line counts at 360 px with each candidate fallback font
| fallback for the heading / intro at 360 px | `h1` lines | intro lines |
| --- | --- | --- |
| Source Serif / Source Sans (the web fonts) | 2 | 7 |
| Georgia / Arial, matched (the shipped descriptors) | 2 | 7 |
| Noto Serif Bold / Roboto, raw (Android's generics, no `size-adjust`) | 2 | 7 |
| **DejaVu Serif Bold / DejaVu Sans (the build image)** | **3** | **8** |

DejaVu Serif Bold is the three-line heading — it sets "Hej hej! I'm" at 239 px against Source Serif's 197 — and DejaVu Sans adds a line to the intro. **The 0.305 measures the build container's font set.** No phone ships DejaVu as its serif, so the number describes a device that does not exist in the audience. The same caveat applies to any Linux-hosted lab run, PageSpeed Insights included; only field data ([CrUX](https://developer.chrome.com/docs/crux)) says what visitors experienced, and a `noindex` site has none yet.

The matching layer *is* inert on Android, exactly as feared — and it does not matter there. At 360, 390, 412, 720 and 1100 px, Noto Serif Bold and Roboto with no `size-adjust` at all land on the same line counts as the web fonts, for both elements. Noto Serif Bold's advance width comes out within 0.1% of the face the serif descriptor was tuned against, which is luck rather than design, but it is measured luck.

Two things worth knowing if the layer is ever extended:

- **`local('Georgia')` resolves Georgia Regular only.** The 700-weight heading fallback is Chrome's synthesised bold, and the 100.8% was tuned against that: Georgia Regular faux-bold sets the sample at 193 px, real Georgia Bold at 222. Adding `local('Georgia Bold')` for authenticity would make the fallback 14% too wide unless the descriptor is re-derived.
- **Per-platform matching has an established shape.** Capsize's [`createFontStack`](https://github.com/seek-oss/capsize) takes several fallbacks and emits one `@font-face` per fallback, each with its own `size-adjust`, chained as `'Source Serif', 'Source Serif Fallback: Georgia', 'Source Serif Fallback: Noto Serif', serif`; the browser skips any family whose `local()` finds nothing, so each platform gets its own tuned face. Liberation Sans and Liberation Mono are metric-identical to Arial and Courier New and could share the existing descriptors as extra `local()` candidates. Nothing metric-compatible with Georgia ships anywhere by default.

The decision was to change nothing: the CSS is right for the platforms that have the fonts, harmless on the one that does not, and the only "bad" number comes from a machine with neither. What changed is how the audit is read.

### The figure

`src/wiki/_sources/layout-shift.html` draws the band above. Six `srcdoc` iframes, one per width and font state, each loading the compiled `global.css` and the real footer lifted verbatim into `site-footer.js`; the row counts and heights in the labels are read out of each frame's own geometry after its fonts settle, so the picture states what it measured rather than repeating the table.

⚠ **An iframe, not a copy.** The reserve is a `@media (width < 27rem)` query and a media query reads the *viewport*, so a fixed-width `div` inside the 1400 px shooter page would never match it — and every space and type token here is `vw`-based for the same reason. `srcdoc` rather than `src`: a `srcdoc` frame inherits the parent's origin so its geometry can be read back, where a separate `file://` document is an opaque origin and `contentDocument` comes back `null`.

⚠ **The first attempt built the link row by hand, and all six columns agreed.** The real cluster sits inside `.wrapper`, whose gutter is `6vw` a side, and shares a flex container with the platform-icon nav — about 26 px of width that is the whole difference between wrapping at two rows and three. A simplified copy measures a different element and quietly reports no problem. Lift the markup.

⚠ **The bundle's own `@font-face` is unusable here**: it points at an absolute `/assets` path, dead under `file://`, and its `src` list starts with `local('Source Sans')`. Without redeclaring the face by relative path, the "web font" column renders in whatever the machine happens to have installed — which is the same class of mistake as the Netlify finding two sections up, in miniature.

### Measuring it honestly

⚠ Two ways to get a wrong number, both met on the day this page was written.

**Your own browser scores your site.** A Lighthouse run from a normal profile reported Best Practices 96 on the live site, on the strength of one console error: `cloud.umami.is/script.js — net::ERR_BLOCKED_BY_CLIENT`. That is a content blocker in the *auditing* browser refusing the analytics script. The same page from a clean headless profile scores **100** with zero console errors. The site did not change; the browser did. Run the audit in a clean profile before believing a Best Practices deduction — though note the real-world corollary, that a visitor with a blocker does see that error, and the analytics simply do not record them.

**An automated browser pane can report a zero-height viewport,** in which an `IntersectionObserver` never fires — so every [[is-land]] `on:visible` island looks permanently un-hydrated while the `on:idle` ones look fine. That produced two confident and completely false findings before the viewport was checked. See the same warning on [[is-land]].

Raw source: four Lighthouse 12 JSON reports in `src/_raw/lighthouse-2026-09-06/`, run 2026-09-06 against `dist/` on `python3 -m http.server` and against the live site, plus `src/_raw/dev-notes/How the font fallback metrics were corrected.md` (2026-09-07) and `src/_raw/dev-notes/How the Netlify Lighthouse CLS was traced to DejaVu.md` (2026-09-08).
