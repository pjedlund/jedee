---
description: "CSS scroll-behavior for in-page links: why the common html:focus-within version keeps find-on-page instant, why it silently does nothing for jump links to headings, and the tabindex fix that also helps keyboard users."
date: 2026-10-29
---

[`scroll-behavior: smooth`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) on the scrolling element makes the browser animate a jump instead of cutting to it: a click on a `#fragment` link, and programmatic scrolls such as `scrollIntoView()` that don't set a behavior of their own. For a reader it keeps a sense of where on the page they landed. People who ask for reduced motion should get the instant jump, so the rule belongs behind `prefers-reduced-motion`.

## The find-on-page problem

Set on `html` without conditions, it also animates the browser's own find-on-page (Ctrl/⌘F): each hit glides into view, which feels sluggish when stepping through results. Chris Coyier took the rule off CSS-Tricks for that reason and published Christian Schaefer's fix in [Fixing Smooth Scrolling with Find-on-Page](https://css-tricks.com/?p=332473) (2021):

```css
html:focus-within {
  scroll-behavior: smooth;
}
```

Typing in the find bar leaves focus outside the document, so the condition is false and find jumps instantly. The fix is about usability rather than an accessibility rule, and it has been copied widely into CSS resets.

## ⚠ It does nothing for a jump link to a heading

The condition has to be true when the scroll happens, and a click on a fragment link does not leave focus anywhere in the document when its target cannot take focus. In Chrome (measured 2026-10-29) `document.activeElement` is `<body>` straight after the click and `html` never matches `:focus-within`, so a link to a plain `<h2 id="…">` jumps in one frame. Safari never focuses a link on click in the first place. No error, no warning; the rule just never applies. Coyier's post already names the cost.

The fix it suggests is to make each target focusable without putting it in the Tab order:

```html
<h2 id="grid" tabindex="-1">Grid</h2>
```

The fragment navigation now focuses the heading, the condition holds, and the jump animates. It also helps keyboard users: the next Tab continues from the section they jumped to, not from the link they left. After a mouse click `:focus-visible` stays false, so no focus ring appears; after a keyboard jump the heading gets the normal ring.

## Measuring it

Whether a scroll animated cannot be told from where it ended, only from the frames on the way. Recording `scrollY` on every `requestAnimationFrame` after a real click, in headless Chrome, shows it: one jump is two distinct values, a smooth scroll is dozens. A browser pane or tab running in the background may not paint frames at all and is no use for this.

## In jedee

`html:focus-within { scroll-behavior: smooth }` is Eleventy Excellent's stock `src/assets/css/global/base/reset.css`, with `scroll-behavior: auto` under `prefers-reduced-motion: reduce`. jedee keeps it, so find-on-page stays instant.

The section buttons at the top of `/design-system/` link to eight `<h2>`s, each with `tabindex="-1"` (`src/pages/design-system.njk`). Measured after the change: Grid animated over 90 frames, Patterns, about 21 500px down, over 81, with focus on the heading. Before, both cut straight to the target.

Headings rendered from markdown elsewhere on the site have no `tabindex`, so a jump link to one, such as a hand-made table of contents in a wiki page, still cuts instead of scrolling. Doing it site-wide would mean adding `tabindex="-1"` where the markdown headings are rendered.

Raw source: `src/_raw/dev-notes/How smooth scrolling to jump links works.md`
