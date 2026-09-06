---
description: "Searching a static site without a server or a search library: a JSON index written at build time, fetched once and filtered in the browser."
date: 2026-09-02
---

A static site has no server to ask, so search has to happen somewhere else. Three places are available, and the choice is mostly about how many entries there are.

**A hosted service** (Algolia, Pagefind's cloud tier, a site-search widget) crawls the site and answers queries over the network. It scales to any size and costs a dependency on someone else's uptime, plus a privacy question — every query a visitor types leaves the page.

**A search library over a prebuilt index** ([lunr](https://lunrjs.com/), [Fuse.js](https://fusejs.io/), [Pagefind](https://pagefind.app/)) puts stemming, fuzzy matching and ranking in the browser. Pagefind additionally shards its index so a large site only downloads the fragments a query touches — the right answer somewhere in the thousands of pages.

**A plain JSON file and `Array.filter`** is the third, and for a few hundred entries it is not a compromise. A substring scan over a few hundred strings completes in well under a millisecond; the library would cost more bytes than the index it searches. The work is entirely in deciding what goes into the index.

The build-time-index technique for Eleventy is written up in Ariel Salminen's [Building Search Index with Eleventy](https://arielsalminen.com/2025/building-search-index-with-eleventy/) (2025). Her version assembles the JSON through a Nunjucks template piping a collection into a custom filter, and much of the code is regex stripping characters — quotes, backslashes, pipes, newlines — that would otherwise break the JSON being interpolated as a string. That is a symptom of the template, not of the problem: write the index as a JavaScript template instead and `JSON.stringify` escapes all of it correctly by construction.

## Getting the body text out of a page

The hard part is not the search, it is reaching a page's prose while the collection is being built.

`templateContent` is the rendered output, and it is not available at collection time — reading it throws *"Tried to use templateContent too early"*. That error is what pushes most implementations into defining a separate collection just for the index, so the body has been rendered by the time the index template runs.

Eleventy sets **`page.rawInput`** on every template ([`src/Template.js`](https://github.com/11ty/eleventy)), and it is populated on collection items. It is the page's raw source with the front matter already removed:

```js
const body = item.data.page?.rawInput ?? '';
```

No premature-use error, no separate collection, and no HTML to strip out afterwards. The cost is the mirror image: `rawInput` is the source *before* rendering, so everything the template layer would have resolved or removed is still sitting in it — template expressions, HTML comments, shortcode calls. Whatever the site's authors write has to be stripped by hand.

## In jedee

One dial in `src/_data/features.yaml` switches the whole feature:

```yaml
search:
  enabled: true
  types: [article, note, reading, watching, jam, photo, recipe, event, audio, video, activity, searchable]
  only:
    activity:
      activityType: orienteering
```

`enabled: false` does three things at once and only one of them is written anywhere: the index template's `permalink` returns `false` so no `/search.json` is emitted; one `{% if %}` in `partials/header.njk` skips the partial; and because the partial is what pulls in its own CSS and JS through `{% css "local" %}` and `{% js "defer" %}`, skipping it is what actually stops both from shipping. That last point is why the panel is a plain Nunjucks partial rather than a WebC component — the same reason [[The main menu]] is one.

`types` is a curated list, not every collection. The response types (likes, replies, reposts, RSVPs, bookmarks) stay out because they would drown prose results. ⚠ The keys are **collection keys, and they are singular** — `article`, not `articles`; the plurals are archive URLs and produce an empty index with a green build. See [[Anatomy of a post type]].

Activities are the one type where the whole collection is the wrong unit, so `only` narrows them by a front-matter key: 112 of 180 are orienteering, with real event and forest names worth looking up months later, while the rest carry Strava's defaults including 24 posts called "Morning Run". `only` is deliberately a general key/value match rather than an orienteering flag — it is the same few lines either way, and it keeps the answer to "what is searchable?" inside the dial.

Standalone prose pages are not in any post collection, so they opt in with `tags: ["searchable"]`, which gives a real `collections.searchable` the index can list beside the post types. ⚠ `searchable` has to join `SYSTEM_TAGS` in `src/_config/collections.js` in the same edit — every other tag on this site is a public page, and without that one word `/tags/searchable/` quietly appears in the tag index.

### The index

`src/search.json.11ty.js` is a thin wrapper; all the logic is in `src/_config/search-index.js` as pure functions, so it is unit-testable without Eleventy. Two wrinkles in the template are worth knowing:

```js
permalink: data => (data.features.search.enabled ? '/search.json' : false),
eleventyImport: {collections: search.types}
```

`permalink` as a function receives the **data object**, so it is `data.features`, not a bare `features`. And `eleventyImport.collections` is resolved *before* the data cascade runs, so the type list cannot come from `data` — the template reads `features.yaml` off disk at module load, the same way `eleventy.config.js` already does for the wiki dial.

Each entry carries `url`, `title`, `type`, `date`, a ~140-character `text` excerpt, and a lowercased `keywords` string holding title, description, tags and the whole body. Only `keywords` is matched against; the rest is for rendering.

### What `rawInput` still contains

Both of these shipped into the index before being caught, and both are the general trap above in concrete form:

```js
.replace(/<!--[\s\S]*?-->/g, ' ')      // authoring TODOs made /about/ findable by searching "todo"
.replace(/\{[{%][\s\S]*?[}%]\}/g, ' ') // /imprint/ indexed "{{ personal.address }}" verbatim
```

The rest of the strip is ordinary markdown: fenced code and images before links, or their inner brackets are eaten as link syntax first; `[[wikilinks]]` reduced to their label ([[Wikilinks]]); heading markers and emphasis to spaces; whitespace collapsed. The excerpt cuts at the last word boundary rather than mid-word.

### The panel

`partials/search.njk` sits in the header between the MENU trigger and the theme toggle, inside `<is-land on:idle>` — a control that cannot work never appears, and there is no no-JS fallback by design, exactly like [[The theme toggle]]. The input is a `role="combobox"` over a `role="listbox"`, so ↑↓ move the highlight through results via `aria-activedescendant` without focus ever leaving the field. Escape closes and returns focus to the magnifier; a click outside closes. `data-tooltip="Search"` on the magnifier reuses the block described in [[Tooltips]], suppressed while the panel is open so it cannot sit on top of it.

Result rows are built client-side, so their per-type icons cannot be rendered per result. The partial emits one `<template data-search-icon="<type>">` per searchable type and the script clones the matching one.

⚠ Over half the index has no body at all — 153 of 289 entries, mostly jams (82) and orienteering activities (63), which carry a title and front matter and nothing else. A row with only an icon and a title is therefore the common case, not the edge case, so the row omits the excerpt element entirely rather than rendering an empty one that leaves a ragged gap in the list. Design a result row against the body-less majority, not against the posts that happen to have prose.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/site-search-panel.png" alt="A browser window with the search panel open under the header. The field holds the word night; below it six results, each an icon and a bold title. The first two, both orienteering activities, are a single line with no excerpt; the four below them carry two lines of grey excerpt text." width="1392" height="838">
  <figcaption>Six real hits for <code>night</code>. The top two rows are the common shape — icon and title, nothing else — and the row simply omits the excerpt element rather than leaving an empty one.</figcaption>
</figure>

⚠ The include in `header.njk` is wrapped in an `{% if %}`, and the partial calls `{% svg %}`. That is the exact shape that once blanked the entire nav — see [[The interlinker's second render pass]]. It is safe only because `{% svg %}` is synchronous. If the panel ever renders empty with a green build, that is the first thing to check, not a template typo.

### Opening it, and clearing it

Focusing the field on open reads like one line and depends on a second one two files away. `input.focus()` did nothing at all — no error, no rejected promise, `document.activeElement` simply unchanged — because of the panel's own transition:

```css
transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s linear;
```

⚠ A transitioned `visibility` is still `hidden` on the frame the transition starts, and `focus()` on a hidden element is a silent no-op. `visibility` is in that list for two good reasons — a closed panel's links must not be Tab-focusable, and the panel has to stay visible through its own fade out — and both survive flipping it instantly one way and delaying it the other:

```css
.search-panel { transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear; }
.search-toggle[aria-expanded='false'] + .search-panel { transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s; }
```

The bug hid behind its own fade: reopening the panel *within* the closing 200ms worked, because `visibility` had not reached `hidden` yet, so only the very first open of a page session failed — the case you stop testing once you are iterating. The reduced-motion branch never had it, having no transition to be mid-way through.

The clear button was the same shape of mistake one property along. It ships with a `hidden` attribute that the script toggles, and it rendered regardless:

```css
.search-clear { display: inline-flex; }   /* an author rule */
.search-clear[hidden] { display: none; }  /* the line that was missing */
```

⚠ `[hidden]` is a *UA* rule of `display: none`, and an author rule beats a UA rule at equal specificity — the class does not have to outrank it, only to exist. Any component that sets `display` on its own class has to restate `[hidden]`, or its `hidden` attribute is decoration. Here it meant a dead X sat in the field from the moment the panel opened, clearing an already-empty input.

`input[type=search]` draws WebKit's own cancel button as well, once there is a value. It works, but it is painted at a fixed pixel size and stops matching the row the moment the page is zoomed, while the styled button — sized in `em` — scales with everything else. Hiding it needs its own rule, not a shared selector list: Firefox does not know `::-webkit-search-cancel-button`, and an unknown pseudo-element invalidates every selector it is grouped with.

```css
.search-input::-webkit-search-cancel-button { display: none; }
```

### Two panels, one anchor

The search panel and the mega-menu both anchor to the header row (`.repel.ontop`) with `inset-inline-end: 0`, so open together they sit on top of each other. Each trigger's click handler sets the other's `aria-expanded` to `false`.

⚠ `search.css` redeclares the panel surface rather than reading the nav's `--megamenu-surface`, because that property is declared on `.mainnav` — which does not exist at all in a production build while the soft-launch dial hides the nav. An inherited custom property that is only sometimes in scope is the failure in [[Undefined custom properties]].

The panel also had no `font-size` of its own at first, so it inherited the header's ~26px and every `em`-sized icon scaled off that: the magnifier rendered at 34px beside the theme toggle's 21px. It now sits on `--size-step-min-1` with `0.95em` icons throughout, which is what the mega-menu uses, so the two read as the same object.

### Contrast on a lifted panel

⚠ The excerpt color cleared 4.5:1 against the panel at `color-mix(… 80%, …)` and then failed at **4.31** on the *highlighted* row, whose own 4% tint darkens the ground beneath it. A `color-mix()` is only valid on the surface it was tuned on, and a row that changes background on hover is two surfaces. Shipped 84% in light, 72% in dark — light and dark run out of headroom at different percentages, so one number does not fix both.

⚠ Measure these with an oklab→sRGB conversion, not a regex over `getComputedStyle().color`. Chromium serializes an oklab mix as `oklab(L a b)`, and a parser expecting `rgb()` reads those three floats as channels and reports a confident pass — it scored the failing values above as 1.00 and 2.73 before the conversion went in.

pa11y only ever sees the panel closed, since it does not click ([[The accessibility test]]). The combobox, the listbox and the options exist only in the open state and have to be checked by hand.

Related: [[The main menu]] — the other header disclosure, whose surface, shadow, drop distance and reduced-motion gate this one reuses. [[The activities archive]] — the type the `only` map exists for, and where the 112 orienteering entries come from.

Raw sources: `src/_raw/Building Search Index with Eleventy.md`, `src/_raw/dev-notes/How the search panel opens and clears.md`
