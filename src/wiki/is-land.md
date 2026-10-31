---
description: "Partial hydration as a custom element: markup that works by itself, with the JavaScript that upgrades it held back until a condition is met."
date: 2026-09-06
updated: 2026-10-18
---

Most JavaScript on a page is not needed when the page arrives. A lightbox matters when someone clicks a photo, a map when it scrolls into view, a search field when the browser has nothing better to do. Loading all of it up front is the arrangement that produces a page which looks finished and does nothing for another second and a half.

**Partial hydration** is the general answer: ship the markup, and attach the behavior later, per component rather than per page. The word comes from the framework world, where "hydration" means a server-rendered page being taken over by client-side JavaScript, and "partial" means only some of it, only when warranted. The idea does not require a framework, though. It requires a way to say *this piece of the page, under this condition*.

[is-land](https://github.com/11ty/is-land) is that, as one custom element. It comes from the [Eleventy](https://www.11ty.dev/) project ([Zach Leatherman](https://www.zachleat.com/), MIT), but it depends on nothing — no build step, no Eleventy, no framework. You wrap a region in `<is-land>`, give it a condition, and the element holds back whatever you put inside a nested `<template data-island>` until that condition is met.

```html
<is-land on:visible>
  <p>Visible before anything loads.</p>
  <template data-island>
    <script type="module" src="/heavy-thing.js"></script>
  </template>
</is-land>
```

Five conditions ship, and they can be combined on one element:

Table: The five loading conditions
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

The dependency (`@11ty/is-land` 5.0.1) and the way it loads are Eleventy Excellent stock since EE 4.9.1 (merged 2026-10-18). The package's minified file is copied to `/assets/components/is-land.min.js` (a passthrough copy in `eleventy.config.js`), and `head/js-defer.njk` loads it with `<script type="module">`: 5,151 bytes, 2,103 gzipped. Until then esbuild bundled it and `head/js-inline.njk` inlined it into the head of every page (4,054 bytes, see below). It is now a request, but one the browser caches across pages. A module script waits for the page to finish parsing, which changes nothing here: every island waits for `on:idle` or `on:visible` anyway.

Seven elements use it, all with one of two conditions — `on:idle` for anything in the page chrome, `on:visible` for anything embedded in a post's body.

Table: The islands in jedee: condition and origin
| Island | Condition | Origin |
| --- | --- | --- |
| `webc/place-map.webc` | `on:visible on:idle` | jedee — both must hold: `on:visible` alone fired before the template below the slotted table was parsed; see [[The place map]] |
| `webc/sortable-table.webc` | `on:idle` | jedee — inside the place map's island on `/activities/`; see [[Tables]] |
| `webc/photo-lightbox.webc` | `on:idle` | jedee — see [[The PhotoSwipe lightbox]] |
| `partials/search.njk` | `on:idle` | jedee — see [[Site search]] |
| `partials/theme-toggle.njk` | `on:idle` | jedee's rewrite of EE's `theme-switch.njk` — see [[The theme toggle]] |
| `webc/custom-youtube.webc` | `on:visible` | EE stock — see [[The YouTube embed]] |
| `webc/custom-peertube.webc` | `on:visible` | EE stock |

None of the seven uses `on:interaction`, `on:media` or `on:save-data`, and only the place map combines two. EE's `partials/gallery.njk` was an eighth until it was deleted as dead source on 2026-10-17. The sortable table is the one nested island; is-land's documentation says an island inside another inherits its parent's conditions as well as the ones it sets.

`webc/custom-masonry.webc` was an eighth, EE stock and `on:visible`, until its masonry script was removed on 2026-09-06 because it shifted the layout ([[Layout shift]]). The `<custom-masonry>` tag stays, never defined, as a CSS hook ([[Web components]]).

### The template boundary is a layout-shift trap

Anything inside `<template data-island>` does not exist until hydration — which is the point for scripts, and a bug for anything that reserves space. `custom-youtube.webc` carries the warning in a comment: its `lite-youtube { max-inline-size: 100% }` rule has to stay *outside* the template, because inside it the box collapses to zero height until the island wakes up, and the page jumps when it does. The rule of thumb is that the template holds behavior, and the sizing that stops the page moving stays out of it.

### Two ways to hide a control that cannot work yet, and they are not equivalent

`is-land:not(:defined)` is the natural hook and it is what [[The theme toggle]] and [[Site search]] use — the element is undefined until the runtime defines it, so the control never flashes up dead. Both are pure enhancement with no no-JS story, so hiding them is the whole design.

⚠ [[The YouTube embed]] tried the same rule and had to move it to `<noscript>` instead. The difference is that the embed *is* reserving space: `is-land:not(:defined)` matches during exactly the window the reservation exists to cover, so the rule hid the box for the moment it was most needed. `<noscript>` applies only when scripting is genuinely off, which is the condition that was actually meant. Worth knowing which of the two you want, because the selectors read as interchangeable and are not.

### The breakout has to go on the `<is-land>`, not the component

A WebC component whose template is `<is-land …><my-thing webc:root>` puts the island between the grid and the component, so `webc:root` merging a class onto the invocation lands it on a grid *grand*child. [[Layout breakouts]] only work on a direct child. `place-map.webc` routes the class onto the `<is-land>` through a prop instead; the full trap, including why the fallback has to be `|| ''` and not `|| false`, is on [[The place map]].

### The autoinit import, now gone everywhere

Up to EE 4.8, the bundle entry also imported `is-land-autoinit.js`, which mounts a framework component (`petite-vue`, `vue`, `svelte`, `preact`) for an island with an `import=` attribute. No island here has one and the site uses none of those frameworks, so on 2026-09-06 the import was dropped here, taking the inlined bundle from 4,592 to 4,054 bytes. is-land 5 then removed autoinit itself (frameworks now register through `Island.addInitType()`), and EE 4.9.1 stopped bundling is-land at all, so the bundle entry and this divergence are both gone. is-land 5 also made `on:idle` much cheaper and its interaction listeners passive.

After the 4.9.1 upgrade every island was checked in a production build: search, theme toggle and lightbox reach `ready` on load, the place map on scroll, and the theme toggle still switches.

A note on checking `on:visible` at all, because it cost two false findings here: an automated browser pane can report `innerHeight` as **0**, and an IntersectionObserver in a zero-height viewport never fires, so every `on:visible` island looks permanently un-hydrated while every `on:idle` one looks fine. Set a real viewport size and re-read before believing it. The second false finding was pure timing — the island had hydrated a moment after the check ran. Both the masonry and the YouTube islands did reach `ready` on scroll in a production build, verified at 1280×900 on 2026-09-06, before the masonry island was removed.

Raw source: `src/_config/events/build-js.js`, the four `webc/` and two `partials/` files above, and `node_modules/@11ty/is-land/` at 4.0.1, read on 2026-09-06; the island list rechecked on 2026-09-14; the loading and version updated from EE 4.9.1 and the is-land 5.0.0 release notes on 2026-10-18.
