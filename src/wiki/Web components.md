---
description: "Custom elements, and the case for building them in two layers: HTML and CSS that render on their own, then JavaScript that upgrades them."
date: 2026-09-14
---

A **web component** is an HTML element the page author defines. The browser supplies three separate pieces: the Custom Elements API (`customElements.define('my-thing', MyThing)` registers a class for a tag name, which must contain a hyphen), Shadow DOM (a private subtree with its own scoped styles), and `<template>` / `<slot>` for markup to stamp out. None of the three needs the others. A tag with a hyphen in it is valid HTML whether or not anything ever defines it; until it is defined it is an unknown element that CSS can still style.

The promise is portability: one component works in React, Vue, a static site or no framework at all, because it is built on the platform rather than on a library. The recurring complaints come from how most component libraries build them, rendering everything from JavaScript into a shadow root:

- an empty or unstyled flash until the script runs, and layout shift when it does;
- nothing to render on the server, because the markup only exists after the class runs;
- accessibility trouble at the shadow boundary, which labels, `aria-*` ID references and form participation do not cross by default.

## Progressive web components

[Ariel Salminen](https://arielsalminen.com/2026/progressive-web-components/) (2026-03-25) names the alternative. A *progressive web component* is designed in two layers: HTML and CSS that render immediately without JavaScript, and a JavaScript layer that adds reactivity and event handling on top. She sorts them into three kinds:

Table: Ariel Salminen's three kinds of progressive web component
| Kind | Where its HTML comes from | Where its CSS lives |
| --- | --- | --- |
| Composite | wraps and enhances HTML written inside it | light DOM |
| Primitive | renders its own HTML, but the base markup for the first state ships with the page | light DOM |
| Declarative | a hybrid, using Declarative Shadow DOM (`<template shadowrootmode>`) so a shadow root can be in the server's HTML | shadow DOM |

The composite kind is what Jeremy Keith called [HTML web components](https://adactio.com/journal/20618) in 2023: the custom element adds behavior to markup that already works. She presents the three as a design stance rather than a library feature.

Her library, [Elena](https://elenajs.com/), is the worked example: 2.6 kB, no dependencies, at `v1.0.0-rc.7` when the article was published. Its server-rendering rule follows from the two layers. A component with no `render()` method is fully server-renderable, because it *is* its HTML; one with `render()` renders its first state without JavaScript and needs the script for interaction. ⚠ The article announces a release candidate, so the package list and API may have moved since.

## In jedee

jedee uses no component library. Every custom element on the site is of Ariel's composite kind, and there is **no Shadow DOM anywhere**: the only `attachShadow` in the shipped JavaScript is inside `is-land`, which recreates declarative shadow roots for its children, and no child here has one.

Counted in a production build on 2026-09-14, the custom tags split three ways:

Table: The custom tags in jedee and what their JavaScript does
| Tag | Defined by | What its JavaScript does |
| --- | --- | --- |
| `<is-land>` | `@11ty/is-land`, EE stock | holds back other scripts until a condition is met — see [[is-land]] |
| `<place-map>` | jedee | reads the place list and route JSON rendered inside it and draws a Leaflet map — see [[The place map]] |
| `<photo-lightbox>` | jedee | wires PhotoSwipe to the single `<a>` inside it — see [[The PhotoSwipe lightbox]] |
| `<lite-youtube>` | `lite-youtube-embed`, EE stock | swaps the poster for the player on click — see [[The YouTube embed]] |
| `<custom-easteregg>` | EE stock | listens for a typed keyword; renders nothing itself |
| `<custom-card>`, `<custom-youtube>`, `<custom-masonry>` | nothing | never defined — tag names kept as CSS hooks |

The first four are composite components by the book: without JavaScript the place map is a list of places, the lightbox is a link to the full image, and the YouTube embed is a link to the video. The last row is the base layer with no enhancement layer at all. `<custom-masonry>` got there by subtraction: its masonry script was removed on 2026-09-06 because it shifted the layout ([[Layout shift]]), and the tag stayed so call sites and CSS did not have to change.

⚠ The `.webc` files in `src/_includes/webc/` are not web components, despite the name. WebC is Eleventy's build-time component syntax and outputs plain HTML; whether a browser custom element exists afterwards depends only on whether some script calls `customElements.define` for that tag.

Raw source: `src/_raw/Progressive Web Components.md`, plus the custom tags in a production `dist/` and the `customElements.define` calls in `src/assets/scripts/components/` and `node_modules/`, read on 2026-09-14.
