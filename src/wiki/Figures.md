---
description: "The figure and figcaption elements, images that follow the site's light or dark theme, and where a caption sits relative to the text around it."
date: 2026-09-29
updated: 2026-11-09
---

A `<figure>` holds content that the text refers to but that could move elsewhere without breaking the reading order: an image, a diagram, a code listing, a table. Its `<figcaption>` labels it, and becomes the figure's accessible name, so a screen reader announces the caption when it reaches the figure ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure)). The caption is not a replacement for the image's `alt`: the alt says what the image shows, the caption says why it is there. See [[Alt text]].

## Images that follow the theme

A screenshot taken in a light theme sits on a dark page as a bright rectangle. HTML's answer is `<picture>` with a media query on the source:

```html
<picture>
  <source srcset="shot-dark.png" media="(prefers-color-scheme: dark)">
  <img src="shot.png" alt="…">
</picture>
```

That follows the operating system's setting, and only that. A site with its theme switch (see [[The theme toggle]]) can be in dark mode on a light system, and the `<picture>` still picks the light image: a media query inside `srcset` selection cannot see an attribute on the page.

The alternative is two ordinary `<img>` elements and CSS that hides one, keyed on the same selectors the theme itself uses. A lazy-loaded image that is not rendered is not fetched, so the hidden one should cost nothing; that has not been measured on this site.

## Where the caption sits

A caption is secondary text, and the usual typographic advice is to keep it in the text's family and on the text's edges rather than centering it under the image. [[Typographic conventions]] covers the italic question and its readability cost; [[Line length]] covers why a text block's width is set in `ch`.

## In jedee

Eleventy Excellent ships one `figcaption` rule in `global/base/global-styles.css`: centered, italic, one step smaller, `text-wrap: balance`. Since 2026-10-02 jedee's version of that rule is left-aligned and wraps with `pretty`, and since 2026-10-05 it is upright rather than italic; the [[Text wrapping]] reasoning for `balance` went with the centering. The rest of this section is jedee's, and it covers every caption on the site: the markdown image title, the `{% image %}` shortcode, the lightbox component, a post's `credit:` under its featured image, and a `<figcaption>` written by hand.

### Muted text, no icon

Since 2026-11-13 a caption has no icon: it was an info glyph drawn in CSS and floated at the start of the first line, and it is gone. The caption is set in `--color-text-subdued` instead, which reads as secondary text in both themes. The YouTube and PeerTube links under a video keep their own filled icons ([[The YouTube embed]]), set in their own files.

```css
figcaption {
  margin-block-start: var(--space-s);
  font-size: var(--size-step-min-1);
  color: var(--color-text-subdued);
  text-align: start;
  text-wrap: pretty;
}
```

Inline `code` in a caption is sized in `em`, at 0.8 of the caption's text, the same ratio it has to body text. The chip used to be a fixed `--size-step-min-1`, which is the caption's own size, so in a caption it came out a fifth too big. The rule lives in `local/code.css` and covers every inline chip: body, caption, heading, table cell.

### As wide as the image

A figure whose content is an image is only as wide as that image, and the caption wraps inside that width instead of widening the figure:

```css
figure:has(> picture, > img, > a > picture):not(.popout, .feature, .full, :is(.popout, .feature, .full) *) {
  inline-size: fit-content;
}

figure:has(> picture, > img, > a > picture) > figcaption {
  contain: inline-size;
}
```

`contain: inline-size` gives the caption no width when the browser works out how wide `fit-content` is, so the image alone decides. A 400px image in a 1024px column gets a 400px figure and a 400px caption. A large image is unaffected: `fit-content` never exceeds the space available, and the reset's `max-inline-size: 100%` already holds the image there. The `:has()` keeps the rule off figures that hold a video or a table, which have no width and would shrink to nothing. Breakouts are excluded because they are a column width by definition. A small image used to be centered with a `text-center` class on the figure; it now sits on the left edge with its caption.

### Breakout captions on the prose edge

A figure at `.popout`, `.feature` or `.full` width starts left of the text, and so would its caption. The figure passes the wrapper's named columns down through subgrid and puts the caption back in `content` ([[Layout breakouts]] covers the columns). The featured image at the top of a post is a lightbox, and its `.feature` class sits on a wrapper three elements above the figure, so each element in between passes the columns on as well:

```css
@supports (grid-template-columns: subgrid) {
  :is(.wrapper, .wrapper-pass) > figure:is(.popout, .feature, .full),
  :is(.wrapper, .wrapper-pass) > :is(.popout, .feature, .full):has(> is-land > photo-lightbox > figure),
  /* …is-land, photo-lightbox and the figure inside them… */ {
    display: grid;
    grid-template-columns: subgrid;
  }

  /* each level in between, and everything in the figure but the caption: */ { grid-column: 1 / -1; }
  /* the caption: */ { grid-column: content; }
}
```

⚠ A subgrid item with no `grid-column` takes the first track only, with no error. The lightbox figure missed the `1 / -1` rule for a moment and rendered its image 80px wide, the width of the `feature` track. Measured on an article at a 1440px window: the paragraphs, the caption under a `.feature` image and the caption under the featured lightbox image all start at x = 200.5, while the images start at 88.5. Videos take the popout width the same way, with their link in `content`.

### Wiki captions

Wiki captions also stop at the paragraphs' `54ch` measure, so a caption's right edge lines up with the paragraphs above it rather than with the figure. `54ch` in the caption's rule would be 54 of the caption's smaller characters, so the measure is registered as a length, resolves once on `.prose` at the body size, and inherits as pixels:

```css
@property --wiki-prose-measure {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

.prose { --wiki-prose-measure: 54ch; }
.prose figcaption { max-inline-size: var(--wiki-prose-measure); }
```

Measured on [[Layout breakouts]] at a 1440px window on 2026-10-01: both the paragraphs and the captions run from x = 208 to 959, inside a figure from 176 to 1264.

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

A mockup with its hand-picked palette, like the specimen cards on [[OpenType features]], can still have a twin: its palette variables get a second set of values under `[data-theme="dark"]`, taken from the site's dark tokens, and the rewrite flips them like anything else. A shot whose subject is the light theme itself opts back out with `data-light-only` on its `[data-shot]`: the sun colors on [[The theme toggle]], measured against the light page, and three of the phones on [[Favicons]]. The splash stays light because the manifest has one `background_color` for both themes, and the running-light and running-dark pair are already one shot per theme. The other drawn phones, including both on [[Progressive web apps]], show the site in the theme the reader is using.

### The panel behind a shot

A wiki figure marked `data-wiki-mockup` sits on a panel the color of a code block (`--color-code-bg`), with no border or outline. The panel is drawn by `wiki.css`, not baked into the PNG: `shoot-mockups.js` strips each `.specimen`'s paper, border, padding and radius before shooting, so the shot is transparent around its content and the panel follows the theme like a code block does.

In a popout figure the shot sits in the `content` track of the breakout subgrid, so its left edge meets the prose at every width, and a `::before` in the same grid row reaches past it by a fixed inset:

```css
figure[data-wiki-mockup] { --wiki-mockup-inset: min(2rem, var(--gap)); }

figure[data-wiki-mockup]::before {
  grid-column: content;
  grid-row: 1;
  margin-inline: calc(-1 * var(--wiki-mockup-inset));
}

figure[data-wiki-mockup] > :not(figcaption) {
  grid-column: content;
  grid-row: 1;
}
```

2rem is the popout gutter at full width, so on a wide screen the panel fills the popout figure exactly. The cap at `--gap` keeps a phone from scrolling sideways; at 375px the panel reaches the screen edges. A feature figure spans its whole width instead and pads the shot by the same inset, since a shot that wide can't line up with the text anyway. Measured on [[The main menu]] on 2026-10-04: the shot and the paragraphs both start at x = 19, 22, 36, 48 and 199 for windows of 320, 375, 600, 900 and 1440px.

⚠ A mockup loads the site's compiled stylesheets by name, so splitting a stylesheet breaks the mockups that load it without an error: they keep the first file and lose the rest. The search and place-map mockups ran on half their CSS for a day after one such split, and it only showed when they were re-shot.

Raw sources: `src/_raw/dev-notes/How wiki figures get dark twins.md`, `src/_raw/dev-notes/How captions work.md`
