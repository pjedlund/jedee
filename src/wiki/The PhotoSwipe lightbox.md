---
description: "What a lightbox has to get right — a no-JS fallback, trapped focus, a responsive zoom target — and jedee's PhotoSwipe shortcode built on the Eleventy Image pipeline."
date: 2026-07-31
---

A lightbox shows a larger version of an image in an overlay above the page. The pattern is old and easy to do badly, and the failures share one root: the overlay is a piece of application UI assembled out of elements that were never a dialog.

What one has to get right:

- **It must work without JavaScript.** The underlying markup should be a plain link to the image, so a reader whose script failed — or never ran — still reaches the picture. A `<div>` with a click handler leaves that person with nothing at all.
- **Focus must move into the overlay, stay trapped there, and return to the trigger on close**, with Escape closing it. This is the argument for building on [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) and `showModal()`: the browser handles focus trapping and makes the rest of the page inert without any of it being hand-written.
- **The zoomed image should be responsive too.** Serving one enormous original into the overlay quietly undoes the optimization work done on the page image.

[PhotoSwipe](https://photoswipe.com/) is the common library for the gesture and zoom behavior. The progressive-enhancement question above is independent of it — whichever library animates the overlay, the no-JS fallback is the site's own responsibility.

## In jedee

A `{% lightbox %}` shortcode puts a zoomable PhotoSwipe image in any note, article, or page. It reuses the Eleventy Image pipeline, so one line of markdown produces a responsive `<picture>` on the page *and* a responsive zoomable image in the lightbox.

**jedee's own** — Eleventy Excellent ships no lightbox component. Built on `photo-lightbox.webc` + `photo-lightbox.js`.

⚠ **`{% bento %}` is not on `main`.** The grouped-gallery shortcode that reuses this lightbox lives on `feat/bento-gallery`, **parked 2026-07-31** — and parked blocked: the branch's draft articles carry an incomplete `{% bento %}` call that fatally aborts the build. It is described below as the worked example of grouping, because that is what it does, but nothing on the live site calls it and the branch can't be merged as it stands.

### Usage

Positional arguments are identical to the `image` shortcode (`src, alt, caption, loading, containerClass, imageClass, widths, sizes, formats`); pass `null` to skip one. A caption renders in a `<figcaption>` *outside* the clickable area. `containerClass` takes the wrapper breakout classes so an image can exceed the text column:

```jinja2
{% lightbox "/assets/images/photos/asturias-coast.jpg", "Alt text", "A caption", null, "feature" %}
```

That works inside a post body only because `e-content` passes the wrapper's named grid columns through via subgrid — see [[Microformats]]. For named arguments or `formats`, use `imageKeys` with `"lightbox": true`.

**Two things deliberately do not trigger it:** plain markdown images and raw `<img>` tags. Those go through the Image HTML transform and stay ordinary — the lightbox needs the shortcode, because a wrapper element has to be generated around the picture.

**Two surfaces get it without asking for it**, both by calling the shortcode from a template rather than a post body:

- any post with an `image:` field, via `entry-header.njk`, with `credit:` as the caption;
- an activity's `cover:` — the photographed race map — via `activity.njk`. See [[The activities archive]].

The shortcode is local-only: it prepends `./src` to its source and breaks on a remote URL (see [[Self-hosting remote images at build time]]). That rules it out for the reading / watching / jam / recipe covers, which are remote service URLs, and is why activity covers — always local scans — were for a while the only cover with a lightbox. The constraint belongs to the shortcode rather than to the lightbox, though: a layout can invoke the component directly with any URL, which is what the photo and jam pages do.

### The clickable area is the wrapper's job, not the image's

A lightbox trigger that is narrower than its column needs the **width cap on the shortcode's generated wrapper**, not only on the `<img>`. The component's `<a>` is `display: block`, so an image capped at 14 rem inside an uncapped wrapper leaves a full-column-wide clickable strip: clicking empty space beside the picture opens it.

```css
/* cover.css — the same cap on the image and on the wrapper the shortcode generates */
.cover,
.cover-zoom {
  --cover-max-inline-size: 14rem;

  max-inline-size: var(--cover-max-inline-size);
}
```

`containerClass` goes on that outer wrapper and `imageClass` on the `<img>`, so one call sets both. This does not arise for feature-width images, whose wrapper is the column.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/photoswipe-hit-area.png" alt="The same photographed race map twice, both capped to the same width. Around the left one, a tinted dashed rectangle extends well past the picture to the full width of the column; around the right one, the same rectangle hugs the picture." width="1460" height="806">
  <figcaption>The tint is the <code>&lt;a&gt;</code>'s own box, not a drawn annotation — the picture paints over it, so what shows is exactly the clickable emptiness beside it. Left, the cap is on the image alone; right, <code>.cover-zoom</code> puts it on the wrapper too.</figcaption>
</figure>

### Without JavaScript it is a link

```html
<a href="/assets/images/asturias-coast-2000w.jpeg"
   data-pswp-width="2000" data-pswp-height="1500"
   data-pswp-srcset="…650w, …2000w" target="_blank" rel="noopener">
  <picture>…avif/webp/jpeg…</picture>
</a>
```

- The `href` points at the largest generated JPEG, so the no-JS and pre-hydration experience is an ordinary link that opens the image. JPEG is preferred for compatibility in a plain link; if `formats` excludes it, the last requested format wins.
- **`data-pswp-srcset` makes the lightbox itself responsive.** PhotoSwipe 5 reads it, picks the right candidate for the screen, recalculates `sizes` when zooming, and never swaps back down. Phone visitors zoom into the 650w file, not the 2000w one.
- The largest JPEG doubles as the slide dimensions, which PhotoSwipe needs up front for its zoom math.

### The component

`photo-lightbox.webc` wraps everything in an [[is-land]] island set to `on:idle`, so PhotoSwipe's CSS and JS load only after the browser goes idle — until then the markup is a working link. `<template data-island="once">` holds the assets inert until hydration, and `once` deduplicates: a post with ten lightbox images loads the stylesheet and script exactly once.

- **`@`-prefixed attributes are WebC props**, consumed at build time and never shipped; the `:data-pswp-*` bindings are what reach the browser. An omitted prop simply drops the attribute — the photo pages pass no `@srcset` because their zoom target is a single off-site original.
- **The zoom cursor is gated on `is-land[ready]`**, so the cursor only advertises zooming once the JS is actually there. Before hydration it stays an honest link pointer.
- **One markdown quirk:** the shortcode wraps its output in a `<div>`, because markdown-it rejects `@href`-style attributes as invalid HTML and would otherwise escape the whole tag into visible text. A chunk starting with a known block tag passes through untouched.

### The JavaScript

```js
this.lightbox = new PhotoSwipeLightbox({
  gallery: this, children: 'a',
  pswpModule: () => import('photoswipe'),
  initialZoomLevel: 'fit', secondaryZoomLevel: 1, maxZoomLevel: 1, wheelToZoom: true
});
```

- **Each `<photo-lightbox>` is its own gallery** (`gallery: this, children: 'a'`), so multiple images in a post open independently with no prev/next. Grouping them is a `children`/shared-gallery change — which is exactly what the parked `{% bento %}` shortcode does, by putting several `<a>`s inside one element rather than rewriting the lightbox.
- **`pswpModule: () => import(…)`** is PhotoSwipe's code-splitting hook: the ~14 KB shell initializes up front, the ~52 KB core loads only when an image opens. esbuild bundles both into one file, so the split that actually matters here is the is-land one — nothing loads until idle.
- **Zoom levels are tuned for large scans**: open fitted, second click goes to 1:1 native pixels, wheel zooms between.
- PhotoSwipe handles the loading choreography itself — it grabs the thumbnail's `currentSrc` as a placeholder, plays the open animation, decodes the large image off-screen, then crossfades. No blank frames.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/photoswipe-overlay.png" alt="A browser-sized frame showing the lightbox open: the page dimmed behind a dark scrim, the full race map scan fitted to the height of the frame, and a zoom and a close button in the top right corner." width="1500" height="1032">
  <figcaption>The overlay open over the page it came from. The image opens fitted, and the scrim leaves the page faintly visible rather than replacing it.</figcaption>
</figure>

⚠ Adding a component that keeps its custom-element tag (`webc:root webc:keep`) requires a **single top-level node** in the `.webc` file, or the element renders doubled and initializes twice. Keep component styles in a `local` bundle, not a sibling `<style>`.

### Invoking the component directly from a layout

Skipping the shortcode lifts the local-only restriction, at the cost of assembling by hand what the shortcode assembles for you: the `<a>`'s zoom target, its pixel dimensions, and the wrapper that carries the width cap.

```jinja2
<div class="cover-zoom">
  <photo-lightbox @href="{{ coverZoom.url }}" @width="{{ coverZoom.width }}" @height="{{ coverZoom.height }}">
    <div slot="image">
      <img class="cover" eleventy:optional="placeholder" src="{{ cover | safe }}" eleventy:widths="160,224,448" sizes="auto">
    </div>
  </photo-lightbox>
</div>
```

**The dimensions have to be read at build time**, because PhotoSwipe needs them up front. That read pays for itself: once `eleventy-img` has opened the remote file to measure it, self-hosting it costs nothing extra, so the zoomed view never touches the vendor's CDN — the same bargain [[The YouTube embed]] strikes with its poster. `src/_config/utils/cover-zoom.js` returns `{url, width, height}`, or `null` when the artwork is no bigger than the displayed cover and there is nothing to zoom into.

**It has to run as computed data, not as a filter.** Nunjucks cannot await an async filter inside `{% set %}` or `{% if %}`, and a layout that decides *whether* to wrap the image needs a plain value to test. `jams.11tydata.js` computes it before the template runs; `photos.11tydata.js` does the same for EXIF.

⚠ **`slot="image"` must sit on a wrapper, never on the `<img>` itself.** WebC drops a slotted node carrying `eleventy:`-namespaced attributes, and the failure is silent — clean build, no warning, an `<a>` with correct `href` and `data-pswp-*` and nothing inside it. Wrap the image in a `<div slot="image">` and let the `<img>` keep its transform directives. This never arises through the shortcode, whose `{% image %}` output is a `<picture slot="image">` with the directives already consumed.

See also [[Hosting large originals off-repo]] for how the photo pages point this at an 11 MB file that never enters the build.

Raw sources: `src/_raw/dev-notes/How the lightbox shortcode works.md`, `src/_raw/dev-notes/How jam covers reach the lightbox.md`
