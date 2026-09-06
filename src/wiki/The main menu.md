---
description: "A disclosure menu built so the fallback is the base layer: the button is injected from a template, and the CSS detects its absence structurally rather than asking whether scripts can run."
date: 2026-08-03
---

A site menu that collapses behind a button is one of the few interface patterns that genuinely needs JavaScript, which makes it a standing test of whether a site's enhancement layers are real. The robust arrangement, set out in [Manuel Matuzović's *Building the main navigation for a website*](https://web.dev/articles/website-navigation), is to build the list first and add the button last: plain `<a>` elements, wrapped in `<ul role="list">`, inside a labelled `<nav>` landmark, with the toggle **injected by script from a `<template>`**. Nothing hides the list except a button that, by construction, only exists when the script that operates it has run.

Which leaves the question of how CSS knows. There are two mechanisms and they answer different questions.

[`@media (scripting: none)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/scripting) asks whether the browser can run scripts. It is the only option when the rule has to apply *before* any script has run — hiding a panel that would otherwise flash open on load.

A structural selector asks whether this particular script actually did its work:

```css
.thing:not(:has(.injected-control)) { /* the fallback layout */ }
```

That covers more ground: JavaScript disabled, blocked by an extension, failed on the network, or loaded and threw. It is also testable — delete the injected element in DevTools and the fallback appears — where `scripting: none` can only be exercised by turning JavaScript off for real.

The fallback that a hidden menu falls back *to* should not be the hidden layout with the hiding removed. A panel designed as a dropdown is sized, positioned and columned for a dropdown; dropped into normal flow it can be worse than useless while remaining, technically, visible.

## In jedee

One disclosure: a `MENU ⌄` button drops a two-column, table-of-contents-style panel of every post type — icon, name, leader dots, count. It replaced a burger drawer. The markup is `partials/main-nav.njk`; the button lives in a `<template id="menu-template">` and is cloned by `scripts/bundle/nav-menu.js`, which inserts it **before** the list so tab order matches visual order. [[Site search]]'s panel anchors to the same header row, so each trigger closes the other.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/main-menu-open.png" alt="A browser window at 1280 pixels. In the header, a breadcrumb trail on the left and a MENU button on the right; below the button, an open panel listing sixteen post types in two columns, each row an icon, a name, a row of leader dots and a count." width="1392" height="718">
  <figcaption>The disclosure open. Each row is icon, name, leader dots, count; the trigger fills with the panel's own surface so the two read as one sheet.</figcaption>
</figure>

**Diverges from Eleventy Excellent**, whose nav is a horizontal link list with an optional drawer.

The critical-path file `css/local/nav-menu-cls.css` is the one place `scripting` is used, and it is used inverted:

```css
@media (scripting: enabled) {
  .mainnav > ul { display: none; }
}
```

Everything else keys off the button's absence, so it also holds if the script fails.

### The no-JS layout

Without the button the panel keeps its `<ul>` but becomes a right-aligned row of wrapping pills in normal flow — three rows at 1280px, six at 375px. The leader dots are dropped (an empty flexible spacer only reads as a leader when every row shares a width) and the padding tightens.

<figure class="feature" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/main-menu-no-js.png" alt="Two browser windows side by side, both without JavaScript. At 1280 pixels the post-type links form a right-aligned row of pills wrapping onto three lines beside the breadcrumb. At 375 pixels the same links wrap onto six lines under the breadcrumb." width="1832" height="692">
  <figcaption>The fallback at both ends. No button, so the panel is a plain row of pills in normal flow — right-aligned, no leader dots, and wrapping to fit.</figcaption>
</figure>

Before that, the panel kept its dropdown layout: two columns of `minmax(15rem, 1fr)` inside a header row with nowhere near 30rem to give, so `auto-fit` collapsed to one column and the header became a sixteen-row list that pushed the page content most of a screen down.

### The flexbox trap next to it

The header row is a `.repel` holding the breadcrumb and a cluster with the nav and theme toggle. `breadcrumb.css` pins that cluster with `flex: none`, because with JavaScript on it holds only a small button and a moon. Relaxing that pin to `flex: 1 1 auto` for the fallback truncated the breadcrumb to a letter and an ellipsis.

**Flexbox distributes shrinkage in proportion to base size.** With `flex-basis: auto` the pill row's base is its max-content — roughly 2000px — against the trail's ~200px, so the deficit was split in that ratio and the breadcrumb surrendered nearly half its width despite having none to spare.

```css
.site-header .repel:has(.mainnav):not(:has(.menu-toggle)) {
  --repel-wrap: wrap;
}

.site-header .repel > .cluster:has(.mainnav):not(:has(.menu-toggle)) {
  --cluster-wrap: nowrap;
  flex: 1 1 22rem;
  min-inline-size: 0;
}
```

A fixed basis makes the row grow into what the trail leaves on a wide screen and wrap onto its own full-width line on a narrow one. The trail's own truncation is the `-webkit-line-clamp` described in [[Text wrapping]].

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/main-menu-breadcrumb-crush.png" alt="Two browser windows stacked, identical except for the header row's flex declarations. In the upper one the breadcrumb reads Photos then a single truncated letter; in the lower one it reads Photos then Pier 4, Ribersborg in full." width="1392" height="1114">
  <figcaption>The same markup, the same width. Above, the cluster's pin relaxed to <code>flex: 1 1 auto</code> with the row still pinned to one line; below, the shipped pair. The trail is what pays for it.</figcaption>
</figure>

The two wrap values go through the compositions' own custom properties rather than declaring `flex-wrap` from outside; `flex` and `min-inline-size` stay plain declarations because they size the element as an item of the row, not the cluster's internals. That distinction, and the two traps in converting a declaration to a knob, are in [[Configuring a layout composition]] — which is also where the no-JS pill row's `.cluster` class comes from, since this page's fallback row used to rebuild that composition by hand.

The `:has(.mainnav)` guard is load-bearing: during the soft launch the header omits the nav entirely in production, which also means no button, and without it the cluster grew to 22rem around nothing but the theme toggle.

### Contrast is a property of the pairing, not the color

The count numbers are `color-mix(in oklab, var(--color-text) 80%, var(--color-bg))`, calibrated against the panel's lifted surface. The pills sit on the plain page background, where that same mix measures **4.43:1** in light mode. The fallback overrides it to 88% — 5.29:1 light, 8.52:1 dark. No color value changed; the surface under it did, and that was enough to fail AA.

### Accessibility details worth copying

- The panel closes with `visibility: hidden`, never `opacity` or `transform` alone, so its links are not tab-focusable while closed.
- The open/closed state lives on the button's `aria-expanded`; the CSS selects `[aria-expanded='true'] + .megamenu` rather than toggling a class on the list.
- `role="list"` stays on the `<ul>` after `list-style: none`, which WebKit otherwise takes as licence to drop list semantics.
- A focused row gets `position: relative; z-index: 1` so its offset ring is not clipped by the next row's background — the same failure mode as [[Focus rings and paint containment]].
- The reveal transition is inside `@media (prefers-reduced-motion: no-preference)`, the same opt-in-to-motion idiom as [[The theme toggle]].

Raw source: `src/_raw/dev-notes/How the main menu degrades without JavaScript.md`
