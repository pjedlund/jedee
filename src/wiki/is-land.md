---
description: "Partial hydration as a custom element: markup that works on its own, with the JavaScript that upgrades it held back until a condition is met."
date: 2026-09-06
---

Most JavaScript on a page is not needed when the page arrives. A lightbox matters when someone clicks a photo, a map when it scrolls into view, a search field when the browser has nothing better to do. Loading all of it up front is the arrangement that produces a page which looks finished and does nothing for another second and a half.

**Partial hydration** is the general answer: ship the markup, and attach the behavior later, per component rather than per page. The word comes from the framework world, where "hydration" means a server-rendered page being taken over by client-side JavaScript, and "partial" means only some of it, only when warranted. The idea does not require a framework, though. It requires a way to say *this piece of the page, under this condition*.

[is-land](https://github.com/11ty/is-land) is that, as one custom element. It comes from the [Eleventy](https://www.11ty.dev/) project ([Zach Leatherman](https://www.zachleatherman.com/), MIT), but it depends on nothing — no build step, no Eleventy, no framework. You wrap a region in `<is-land>`, give it a condition, and the element holds back whatever you put inside a nested `<template data-island>` until that condition is met.

```html
<is-land on:visible>
  <p>Visible before anything loads.</p>
  <template data-island>
    <script type="module" src="/heavy-thing.js"></script>
  </template>
</is-land>
```

Five conditions ship, and they can be combined on one element:

| Condition | Fires when |
| --- | --- |
| `on:visible` | the element intersects the viewport |
| `on:idle` | the browser reports itself idle (`requestIdleCallback`) |
| `on:interaction` | the user touches it — `click` and `touchstart` by default, overridable with a value |
| `on:media` | a media query matches, e.g. `on:media="(min-width: 64em)"` |
| `on:save-data` | the visitor is *not* asking to save data |

Three attribute conventions carry the rest of it. `data-island="once"` on the template deduplicates, so twenty lightboxes on one page load the stylesheet and script exactly once. The element sets a `ready` attribute on itself after hydrating, which is the CSS hook for anything that should only appear once the behavior exists. And `is-land:not(:defined)` is the mirror image — it matches only *before* the element upgrades, which is how you hide a control that cannot work yet.

The honest limit is that the technique costs a decision per component and gives nothing automatically. Something has to be a genuinely deferrable island for this to pay, and a page made of twenty small islands is worse off than one that loaded a small script.

## In jedee

The dependency (`@11ty/is-land` 4.0.1), the bundle entry, and the inlining are all Eleventy Excellent stock. `src/assets/scripts/bundle/is-land.js` is a single `import` line — EE ships two, and the second was dropped here for a measured reason (below); esbuild bundles and minifies it to `src/_includes/scripts/is-land.js`, and `head/js-inline.njk` inlines that into the head of **every page**, so the runtime is never a request. It is 4,054 bytes minified.

Eight elements use it, all with one of two conditions — `on:idle` for anything in the page chrome, `on:visible` for anything embedded in a post's body.

| Island | Condition | Origin |
| --- | --- | --- |
| `webc/place-map.webc` | `on:idle` | jedee — see [[The place map]] |
| `webc/photo-lightbox.webc` | `on:idle` | jedee — see [[The PhotoSwipe lightbox]] |
| `partials/search.njk` | `on:idle` | jedee — see [[Site search]] |
| `partials/theme-toggle.njk` | `on:idle` | jedee's rewrite of EE's `theme-switch.njk` — see [[The theme toggle]] |
| `webc/custom-youtube.webc` | `on:visible` | EE stock — see [[The YouTube embed]] |
| `webc/custom-peertube.webc` | `on:visible` | EE stock |
| `webc/custom-masonry.webc` | `on:visible` | EE stock |
| `partials/gallery.njk` | `on:idle` | EE stock, **dead source** — nothing includes it |

None of the eight uses `on:interaction`, `on:media` or `on:save-data`, and none combines conditions.

### The template boundary is a layout-shift trap

Anything inside `<template data-island>` does not exist until hydration — which is the point for scripts, and a bug for anything that reserves space. `custom-youtube.webc` carries the warning in a comment: its `lite-youtube { max-inline-size: 100% }` rule has to stay *outside* the template, because inside it the box collapses to zero height until the island wakes up, and the page jumps when it does. The rule of thumb is that the template holds behavior, and the sizing that stops the page moving stays out of it.

### Two ways to hide a control that cannot work yet, and they are not equivalent

`is-land:not(:defined)` is the natural hook and it is what [[The theme toggle]] and [[Site search]] use — the element is undefined until the runtime defines it, so the control never flashes up dead. Both are pure enhancement with no no-JS story, so hiding them is the whole design.

⚠ [[The YouTube embed]] tried the same rule and had to move it to `<noscript>` instead. The difference is that the embed *is* reserving space: `is-land:not(:defined)` matches during exactly the window the reservation exists to cover, so the rule hid the box for the moment it was most needed. `<noscript>` applies only when scripting is genuinely off, which is the condition that was actually meant. Worth knowing which of the two you want, because the selectors read as interchangeable and are not.

### The breakout has to go on the `<is-land>`, not the component

A WebC component whose template is `<is-land …><my-thing webc:root>` puts the island between the grid and the component, so `webc:root` merging a class onto the invocation lands it on a grid *grand*child. [[Layout breakouts]] only work on a direct child. `place-map.webc` routes the class onto the `<is-land>` through a prop instead; the full trap, including why the fallback has to be `|| ''` and not `|| false`, is on [[The place map]].

### The autoinit import, measured and then dropped

Eleventy Excellent's bundle entry imports `is-land-autoinit.js` alongside the element itself. Autoinit exists to mount a framework component — its type table holds `petite-vue`, `vue`, `svelte`, `svelte-ssr` and `preact` — and it only does anything for an island carrying an `import=` attribute. No island here has one, and the site uses none of those frameworks, so the code path could never run.

The entry is one line now, and the inlined bundle went **4,592 → 4,054 bytes**: 538 bytes off the head of every page. This is a small deliberate divergence from EE stock, not a fix to anything broken — the measurement is the reason, and if a future EE upgrade restores the second import line, nothing breaks by leaving it.

```js
// src/assets/scripts/bundle/is-land.js
import '@11ty/is-land/is-land';
```

Checked in the browser rather than by byte count alone: both `on:idle` islands still reach `ready` on load, and the theme toggle still switches. ⚠ Worth knowing separately — the homepage's `on:visible` masonry island did **not** hydrate on scroll in either version, before or after this change, so something there is worth a look on its own terms.

Raw source: `src/assets/scripts/bundle/is-land.js`, `src/_config/events/build-js.js`, the five `webc/` and three `partials/` files above, and `node_modules/@11ty/is-land/` at 4.0.1, read on 2026-09-06.
