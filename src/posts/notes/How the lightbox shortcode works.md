---
title: How the lightbox shortcode works
description: A dev note on the lightbox shortcode — responsive PhotoSwipe images in any post or page, with code excerpts from the shortcode, the WebC component, and the JavaScript.
date: 2026-07-05
tags:
  - eleventy
  - photography
draft: true
---

This site's photo pages have always had a PhotoSwipe lightbox. As of today the same functionality is available anywhere — any note, article, or page — through a `lightbox` shortcode. The shortcode reuses the existing Eleventy Image pipeline (AVIF/WebP/JPEG in multiple widths), so one line in a markdown file produces a responsive picture on the page *and* a responsive zoomable image in the lightbox.

## Usage

{% raw %}

The basic form takes a source path and alt text:

```jinja2
{% lightbox "/assets/images/photos/asturias-coast.jpg", "A rocky stretch of the Asturian coast" %}
```

The positional arguments are identical to the `image` shortcode: `src, alt, caption, loading, containerClass, imageClass, widths, sizes, formats`. Pass `null` to skip one. A caption renders in a `<figcaption>` *outside* the clickable area:

```jinja2
{% lightbox "/assets/images/photos/asturias-coast.jpg", "Alt text", "A caption below the image" %}
{% lightbox "/assets/images/photos/asturias-coast.jpg", "Alt text", null, "eager" %}
```

The `containerClass` argument takes the wrapper breakout classes, so an image can be wider than the text column — `popout`, `feature`, or `full`:

```jinja2
{% lightbox "/assets/images/photos/asturias-coast.jpg", "Alt text", "A caption", null, "feature" %}
```

This works from inside a post body because the `e-content` container passes the wrapper's named grid columns through to its children (the `wrapper-pass` composition in `wrapper.css`, built on CSS subgrid). In browsers without subgrid the image simply stays at content width.

`loading: "eager"` is for above-the-fold images only; it also adds `fetchpriority="high"`, which is the current cross-browser recommendation for the likely LCP image (it replaces `rel="preload"` for images that are present in the initial HTML).

For everything else — `containerClass`, `imageClass`, `formats`, or just named arguments — use `imageKeys` with `"lightbox": true`:

```jinja2
{% imageKeys {
  "src": "/assets/images/photos/asturias-coast.jpg",
  "alt": "Alt text",
  "caption": "A caption",
  "lightbox": true,
  "imageClass": "grayscale",
  "widths": [400, 800],
  "sizes": "(min-width: 30em) 50vw, 100vw"
} %}
```

Two things that do **not** trigger the lightbox: plain markdown images (`![alt](path)`, with or without `{attrs}`) and raw `<img>` tags. Those go through the Image HTML transform and stay ordinary images. The lightbox needs the shortcode, because the wrapper element has to be generated around the picture.

Featured images need nothing at all: any post with an `image:` field in its frontmatter gets the lightbox automatically — `entry-header.njk` renders it through the same mechanism, with the `credit:` field as the caption.

{% endraw %}

## What it renders

The shortcode emits the responsive `<picture>` wrapped in a `<photo-lightbox>` component invocation. After the WebC transform runs, the output is a figure with a link around the picture:

```html
<figure>
  <a href="/assets/images/asturias-coast-2000w.jpeg"
     data-pswp-width="2000" data-pswp-height="1500"
     data-pswp-srcset="/assets/images/asturias-coast-650w.jpeg 650w, … 2000w"
     target="_blank" rel="noopener" style="display: block" class="no-indicator">
    <picture>…avif/webp/jpeg sources…</picture>
  </a>
  <figcaption>A caption below the image</figcaption>
</figure>
```

Three details worth noting:

- **Without JavaScript this is just a link.** The `href` points at the largest generated JPEG, so the no-JS (and pre-hydration) experience is an ordinary link that opens the image.
- **`data-pswp-srcset` makes the lightbox itself responsive.** PhotoSwipe 5 reads it, picks the right candidate for the screen, recalculates `sizes` when zooming, and never swaps back down to a smaller file. Phone visitors zoom into the 650w or 960w file, not the 2000w one.
- The largest JPEG doubles as the slide dimensions (`data-pswp-width/height`), which PhotoSwipe needs up front for the zoom math.

The zoom target prefers JPEG for maximum compatibility in a plain link; if `formats` is set without `"jpeg"` (say `["webp"]`), it falls back to the last requested format.

## The WebC component

`src/_includes/webc/photo-lightbox.webc` is the whole structural layer:

```html
<is-land on:idle>
  <photo-lightbox webc:root webc:keep>
    <figure>
      <a
        class="no-indicator"
        style="display: block"
        :href="href"
        :data-pswp-width="width"
        :data-pswp-height="height"
        :data-pswp-srcset="srcset"
        target="_blank"
        rel="noopener"
      >
        <slot name="image"></slot>
      </a>
      <figcaption webc:if="caption" @text="caption"></figcaption>
    </figure>

    <template data-island="once" webc:raw>
      <link rel="stylesheet" href="/assets/components/photoswipe.css" />
      <style>
        is-land[ready] photo-lightbox a { cursor: zoom-in; }
      </style>
      <script type="module" src="/assets/scripts/components/photo-lightbox.js"></script>
    </template>
  </photo-lightbox>
</is-land>
```

Pointers:

- **`<is-land on:idle>` defers everything.** PhotoSwipe's CSS and JavaScript load only after the browser goes idle. Until then the markup is a working link.
- **`<template data-island="once">`** holds the assets inert until hydration, and the `once` keyword deduplicates: a post with ten lightbox images loads the stylesheet and script exactly once.
- **The `@`-prefixed attributes** (`@href`, `@width`, `@srcset`, `@caption`) are WebC props — consumed at build time, never shipped in the HTML. The `:data-pswp-*` bindings on the `<a>` are what actually reach the browser. An omitted prop (the photo pages pass no `@srcset`, since their zoom target is a single off-site original) simply drops the attribute.
- **The zoom cursor is gated on `is-land[ready]`**, so the cursor only advertises zooming once the JavaScript is actually there. Before hydration it stays an honest link pointer.
- The `slot="image"` convention comes from the image shortcodes themselves — they set it on their container element precisely so they can be dropped into WebC components like this one.
- One markdown quirk: the shortcode wraps its output in a `<div>`, because markdown-it rejects `@href`-style attributes as invalid HTML and would otherwise escape the whole tag into visible text. A chunk that starts with a known block tag is passed through untouched.

## The JavaScript

`src/assets/scripts/components/photo-lightbox.js` is a small custom element that wires PhotoSwipe to the link:

```js
import PhotoSwipeLightbox from 'photoswipe/lightbox';

class PhotoLightbox extends HTMLElement {
  connectedCallback() {
    this.lightbox = new PhotoSwipeLightbox({
      gallery: this,
      children: 'a',
      pswpModule: () => import('photoswipe'),
      initialZoomLevel: 'fit',
      secondaryZoomLevel: 1,
      maxZoomLevel: 1,
      wheelToZoom: true
    });
    this.lightbox.init();
  }

  disconnectedCallback() {
    this.lightbox?.destroy();
    this.lightbox = null;
  }
}

customElements.define('photo-lightbox', PhotoLightbox);
```

Pointers:

- **Each `<photo-lightbox>` element is its own gallery** (`gallery: this, children: 'a'`). Multiple images in a post open independently; there is no prev/next between them. Grouping them into one gallery would be a `children` / shared-gallery change in this file, if ever wanted.
- **`pswpModule: () => import('photoswipe')`** is PhotoSwipe's code-splitting hook: the small lightbox shell (~14 KB min) initializes up front, the core (~52 KB min) loads only when an image is actually opened. esbuild bundles both into this one file at build time, so the dynamic import resolves instantly from the same bundle — the split that matters here is the is-land one (nothing loads until idle).
- **The zoom levels are tuned for large scans**: open fitted to the screen, second tap/click goes to 1:1 native pixels, scroll wheel zooms between the two.
- PhotoSwipe handles the loading choreography on its own: it grabs the thumbnail's `currentSrc` (whichever candidate the browser already loaded from the `<picture>`) as a placeholder, plays the open animation with it, decodes the large image off-screen, then crossfades. No blank frames while the big file arrives.

## A live example

{% lightbox "/assets/images/photos/asturias-coast.jpg", "A rocky stretch of the Asturian coast, green cliffs meeting the sea", "Click or tap the image to zoom. Scroll to zoom further; a second click goes to 1:1 pixels.", null, "popout" %}
