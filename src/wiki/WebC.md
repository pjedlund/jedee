---
description: "Eleventy's single-file component format — what it emits, how its attributes and slots differ from a browser custom element, and the root rule that decides whether the host tag survives."
date: 2026-09-19
---

[WebC](https://github.com/11ty/webc) is a single-file component format for [Eleventy](https://www.11ty.dev/docs/languages/webc/): a `.webc` file holds markup, optional `<style>` and `<script>`, and is invoked from a template by writing its filename as a tag. It is easy to mistake for a browser [[Web components|web component]], and the confusion is worth clearing up first, because the two answer different questions.

A browser custom element is a **runtime** thing: a class registered with `customElements.define()`, upgraded by the browser when the tag appears in the DOM, doing its work in the visitor's browser. WebC is a **build-time** thing: it runs during the site build, expands the tag into ordinary HTML, and by default the tag itself disappears. Nothing about WebC requires JavaScript in the browser, and nothing about a custom element requires a build step. They compose well — a WebC component is a convenient way to write the markup a custom element will later upgrade — but a component that does its job entirely at build time never needs the runtime half at all.

## What a component emits

The interesting question with any WebC component is what survives into the HTML, and the answer is a short set of rules.

By default the invocation tag is **replaced** by the component's contents. `<my-thing>` in a template does not appear in the output; what appears is whatever `my-thing.webc` contained. Three attributes change that:

- `webc:root` on an element inside the component marks it as the component's root, and the attributes from the invocation are **merged onto it** — `class` and `style` merge by concatenation, everything else is set.
- `webc:keep` keeps a tag in the output that would otherwise be dropped. This is what you need when a `customElements.define()` script has to find the tag later.
- `webc:nokeep` is the opposite, for an element you want to disappear once its job is done.

Data comes in as attributes and is read in the component with prefixes rather than a templating syntax: `:attr` binds an expression to an attribute, `@attr` is a *prop* (it feeds the component and is not emitted), `@text` and `@html` set an element's contents, and `webc:if` drops an element when an expression is falsy. `<slot>` works as it does in the browser, named or not. `webc:setup` declares helper functions for the file, and `webc:raw` stops WebC processing a subtree — needed whenever a component contains markup that only means something later, such as an island's `<template>`.

**The root rule is the one that bites.** A component with a single top-level element has an obvious root. A component with **several** top-level elements has none, so WebC keeps the invocation tag as a wrapper around them. That is usually harmless — and it is why a component of loose fragments still comes out nested sensibly — but combined with `webc:keep` on an inner element of the same name it produces the element **twice**, once as the kept inner tag and once as the wrapper. Any script that upgrades the tag then runs twice on the same children. ⚠ An HTML comment at the top of the file does **not** count as a top-level element; a `<style>` block does, which is the usual way a component acquires a second root by accident.

## In jedee

The plugin is `@11ty/eleventy-plugin-webc` 0.11, registered in `eleventy.config.js` with two options:

```js
eleventyConfig.addPlugin(plugins.webc, {
  components: ['./src/_includes/webc/**/*.webc'],
  useTransform: true
});
```

`components` makes every file in that folder available as a tag without importing it. `useTransform: true` is the load-bearing one: it runs WebC as a transform over the *output* of the other template languages, which is why a `<custom-card>` written in a Nunjucks layout expands at all. Without it, WebC components only work inside `.webc` templates, and this site has none — every page is Nunjucks or markdown. Both settings are Eleventy Excellent stock.

Ten components live in `src/_includes/webc/`. Seven came from Eleventy Excellent, three of them still byte-identical to upstream (`custom-card`, `custom-peertube`, `custom-peertube-link`) and four diverged (`custom-masonry`, `custom-svg`, `custom-youtube`, `custom-youtube-link`). Three are jedee's own, and all three are the same shape: an [[is-land]] wrapping a kept custom element, for behaviour that should not load until the browser is idle.

| Component | Whose | Emits | Upgraded by |
| --- | --- | --- | --- |
| `custom-card` | EE stock, identical | `<custom-card>` with merged attributes | nothing — pure markup |
| `custom-masonry` | EE, diverged | `<custom-masonry class="grid">` | nothing since 2026-09-06 |
| `custom-svg` | EE, diverged | the optimized SVG itself | nothing |
| `custom-youtube` | EE, diverged | `<custom-youtube>` + an island | lite-yt-embed |
| `photo-lightbox` | jedee | `<is-land><photo-lightbox>` | PhotoSwipe, see [[The PhotoSwipe lightbox]] |
| `place-map` | jedee | `<is-land><place-map>` | MapLibre |
| `sortable-table` | jedee | `<is-land><sortable-table>` | its own script |

Two of those rows say something. `custom-svg` is the clearest case of build-time-only: it uses `webc:type="render"` to run eleventy-img and svgo during the build and returns the optimized SVG source, so the component leaves no trace at all — no tag, no script, no runtime. And `custom-masonry` is the opposite end: its JavaScript was removed over layout shift (see [[Layout shift]]), but the tag and its `webc:keep` stayed so call sites and CSS would not have to move. It is now a `<div class="grid">` wearing a custom element's name.

### The root rule in practice

All three of jedee's own components are written the same way, and the comment at the top of each says why: **`<is-land>` is the sole root, with the kept custom element inside it.**

```html
<!-- sortable-table.webc -->
<is-land on:idle>
  <sortable-table webc:root webc:keep>
    <slot></slot>
    <template data-island="once" webc:raw>
      <script type="module" src="/assets/scripts/components/sortable-table.js"></script>
    </template>
  </sortable-table>
</is-land>
```

Checked in the built HTML: `<place-map` and `<sortable-table` each appear exactly once on `/activities/`, despite both files opening with an explanatory HTML comment. The comment is not an element and does not trigger the wrapper.

**The breakout consequence.** Because `webc:root` is on the *inner* element, a `class="popout"` written on the invocation merges onto that inner element — a grid *grand*child, since the `<is-land>` wraps it, and [[Layout breakouts|breakout classes]] only work on a direct grid child. So the class silently does nothing. `place-map` takes a `@breakout` prop instead and applies it to the `<is-land>`, which is the real grid child. The `|| ''` in `:class="breakout || ''"` is load-bearing in a way worth remembering: a bare `:class="breakout"` throws at build time for every caller that omits the prop, and `|| false` renders a literal `class="false"`, because WebC stringifies a falsy `:class` rather than dropping the attribute. Only `''` omits it cleanly. Measured and written up on [[The place map]].

### Where a component's CSS goes, and the one that got away

EE's own `custom-youtube.webc` puts its styles in a top-level `<style>` block, and that block ships **inline in the body of every page that embeds a video**, un-minified, having reached neither named CSS bundle.

The part that matters is not where it ends up. `head/css-inline.njk` inlines the global and local bundles into the `<head>` in a production build and only links them in `--serve`, so **in production every stylesheet on this site is inline anyway** — a video page carries 43 kB of global and 8.6 kB of local CSS in its head. Against that, the component's 2.9 kB in the body is not the outlier it first looks like, and the usual argument for a shared file — one cacheable fetch across many pages — does not apply, because the bundles are not fetched either.

**A comment in a component's `<style>` is shipped to visitors.** Everywhere else on the site cssnano strips them; here nothing does. Cutting the two YouTube components' comments to one line each on 2026-09-19 took them from 1,458 to 819 bytes — paid once per embed, so three times on a three-video page.

What the component's block does lose is the pipeline: no cssnano, no autoprefixer, and **no deduplication**. On `/jams/nine/`, which embeds three videos, the same rules are emitted three times — 8.4 kB of body `<style>` where one copy would be 2.9 kB. Identical copies compress almost perfectly, so the cost over the wire is small, but it is repetition a bundle would not produce. A top-level `<style>` is also exactly the second top-level element that turns the host tag into a wrapper, so this pattern and the doubling trap are the same fact seen twice.

The alternative the project already uses everywhere else is a `local` CSS bundle included by the consuming layout, which is minified and loaded once. `place-map`, `sortable-table` and `photo-lightbox` all do it that way, and each names its stylesheet in the comment at the top of the file (`CSS: css/place-map.css · JS: place-map.js`). It is also the safer choice for the root rule, since a top-level `<style>` is exactly the second top-level element that turns the host tag into a wrapper. Moving `custom-youtube`'s block is not done; it is recorded here because the pattern is inherited rather than chosen, and the cost is measurable.

### What `webc:setup` cannot do

`webc:setup` runs synchronously. A component that needs an async build-time result — an image through eleventy-img, a fetch — cannot do it there. `custom-youtube` hits this: its fallback poster URL points straight at Google's CDN, and the self-hosted, build-time-optimized poster the page actually uses is computed by a Nunjucks filter in the layout and passed in as `@poster`. The general shape: do the async work in a filter or in computed data, and hand the component a plain string. See [[The YouTube embed]].

### Attribute merging, seen

`custom-card` is EE stock and byte-identical to upstream. It is also the plainest demonstration of `webc:root` without `webc:keep`:

```html
<custom-card class="flow no-indicator" webc:root>
  <slot name="image"></slot>
  …
</custom-card>
```

Invoked as `<custom-card clickable img-square>`, it emits `<custom-card clickable img-square class="flow no-indicator">` — the boolean attributes set, the classes concatenated rather than replaced. The tag survives here not because of `webc:keep` but because it *is* the root, and no script upgrades it; the attributes are CSS hooks, and they are attributes rather than modifier classes because that is how a CUBE CSS exception is written.

Source: `src/_includes/webc/*.webc` and `eleventy.config.js`, checked against the built HTML and against upstream Eleventy Excellent at `/Users/johanedlund/Projects/eleventy-excellent`, 2026-09-19. Format documentation: [WebC on 11ty.dev](https://www.11ty.dev/docs/languages/webc/) and the [WebC readme](https://github.com/11ty/webc).
