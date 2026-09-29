---
description: "The figure and figcaption elements, images that follow the site's light or dark theme, and where a caption sits relative to the text around it."
date: 2026-09-29
---

A `<figure>` holds content that the text refers to but that could move elsewhere without breaking the reading order: an image, a diagram, a code listing, a table. Its `<figcaption>` labels it, and becomes the figure's accessible name, so a screen reader announces the caption when it reaches the figure ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure)). The caption is not a replacement for the image's `alt`: the alt says what the image shows, the caption says why it is there. See [[Alt text]].

## Images that follow the theme

A screenshot taken in a light theme sits on a dark page as a bright rectangle. HTML's own answer is `<picture>` with a media query on the source:

```html
<picture>
  <source srcset="shot-dark.png" media="(prefers-color-scheme: dark)">
  <img src="shot.png" alt="…">
</picture>
```

That follows the operating system's setting, and only that. A site with its own theme switch (see [[The theme toggle]]) can be in dark mode on a light system, and the `<picture>` still picks the light image: a media query inside `srcset` selection cannot see an attribute on the page.

The alternative is two ordinary `<img>` elements and CSS that hides one, keyed on the same selectors the theme itself uses. A lazy-loaded image that is not rendered is not fetched, so the hidden one should cost nothing; that has not been measured on this site.

## Where the caption sits

A caption is secondary text, and the usual typographic advice is to keep it in the text's family and on the text's edges rather than centering it under the image. [[Typographic conventions]] covers the italic question and its readability cost; [[Line length]] covers why a text block's width is set in `ch`.

## In jedee

Everything here is jedee's own and applies to the wiki only (`src/assets/css/local/wiki.css`). Eleventy Excellent's stock `figcaption` rule, centered, italic and one step smaller, still styles captions in posts.

### Wiki captions

Wiki captions are italic and one type step smaller than the prose, start on the prose's left edge, and stop at the paragraphs' `60ch` measure, so a caption's right edge lines up with the paragraphs above it rather than with the figure. Most wiki figures break out to `.popout` width (see [[Layout breakouts]]), so without help the caption would start at the figure's edge, 2rem left of the text. The figure passes the wrapper's named columns down through subgrid and puts the caption back in `content`:

```css
.prose figure:is(.popout, .feature) {
  display: grid;
  grid-template-columns: subgrid;
}

.prose figure:is(.popout, .feature) > * { grid-column: 1 / -1; }
.prose figure:is(.popout, .feature) > figcaption { grid-column: content; }
```

⚠ `60ch` in the caption's own rule would be 60 of the *caption's* smaller characters, and the edge would silently land short of the paragraphs'. The measure is registered as a length, so it resolves once on `.prose`, at the body size, and inherits as pixels:

```css
@property --wiki-prose-measure {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

.prose { --wiki-prose-measure: 60ch; }
.prose figcaption { max-inline-size: var(--wiki-prose-measure); }
```

At a 1440px window both the paragraphs and the captions run from x = 201 to 1035, inside a figure from 169 to 1257. Three versions came before this one on the same day: a hanging info icon after Smashing Magazine's captions, a caption spanning the whole content column, and a dimmed color. All three were dropped.

### Dark twins

The wiki's figures are shot from HTML mockups in `src/wiki/_sources/` by `npm run mockups`. A mockup opts into a dark version with one attribute:

```html
<html lang="en" data-theme="light" data-dark-shot>
```

The shooter then loads it a second time with `?theme=dark` and saves each `[data-shot]` again as `<name>-dark.png`. The mock server does the switching: for that query it rewrites every `data-theme="light"` in the served file to `dark`, which also reaches mockups that build an iframe from a `srcdoc` template.

On the site, a markdown preprocessor in `eleventy.config.js` (`wiki-dark-figures`) finds each wiki `<img>` whose PNG has a `-dark` twin on disk, marks it `data-wiki-light`, and adds a copy pointing at the twin, marked `data-wiki-dark`. Nothing changes in the page source, and the pair goes through eleventy-img like any other image. `wiki.css` shows one of the two by the same rule `variables.css` uses for the theme: the system setting unless the page's `data-theme` says otherwise.

```css
[data-wiki-dark] { display: none; }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) [data-wiki-light] { display: none; }
  :root:not([data-theme='light']) [data-wiki-dark] { display: revert; }
}

:root[data-theme='dark'] [data-wiki-light] { display: none; }
:root[data-theme='dark'] [data-wiki-dark] { display: revert; }
```

This only works for a mockup whose colors come from the site's stylesheet. A color written into the mockup by hand stays a light-theme color in the dark shot. The accent tokens are a subtler case: in dark mode `--color-accent-blue` and `--color-accent-green` become muted surface colors that disappear as text, so the breakouts, tooltips and layout-shift mockups carry a dark-only rule that swaps their labels to `--color-blue-vivid` and `--color-green-vivid`, about 5:1 on the dark page. A caption dimmed with `opacity` also dims any colored word inside it, so those captions dim by mixing their color with the background instead. Look at every dark PNG before opting a mockup in.

Eleven shots have twins: both [[The place map]] figures, both [[Layout breakouts]] figures, both [[The PhotoSwipe lightbox]] figures, the reveal filmstrip on [[Choreographing CSS animations]], [[Syntax highlighting]], [[Tooltips]], [[Layout shift]] and the poster fade on [[The YouTube embed]]. The theme toggle's figure shows both themes on purpose and stays as it is. The eleven mockups with their own hand-picked palettes, mostly specimen cards like the one on [[OpenType features]], have none; a light card reads as a deliberate object on a dark page.

Raw source: `src/_raw/dev-notes/How wiki figures get dark twins.md`
