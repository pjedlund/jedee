---
description: "What 100vw measures, why it is wider than the page whenever a scrollbar takes up room, and why a headless browser test will not show the difference."
date: 2026-10-27
---

Viewport-percentage lengths size things against the browser window rather than against any element: `1vw` is a hundredth of the viewport's width, `1vh` of its height, with the `svh`/`lvh`/`dvh` family added for mobile toolbars that come and go ([MDN: viewport-percentage lengths](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths), [CSS Values 4](https://www.w3.org/TR/css-values-4/#viewport-relative-lengths)). They are the only lengths that reach past every container to the window itself, which is what makes them useful for a full-bleed band and risky for anything that has to line up with the page.

**`100vw` includes the vertical scrollbar.** With the root's `overflow` at its default, the spec measures the viewport as if scrollbars did not exist, so `100vw` is the full window width while the page's content box is that width minus the scrollbar. Whether the two differ depends on the visitor's machine, not the stylesheet:

- **Overlay scrollbars** float over the page and take no room. macOS uses them by default with a trackpad, as do phones; `100vw` and `100%` of the body then agree.
- **Classic scrollbars** sit beside the page and take 15–17px of it. Windows uses them by default, and macOS switches to them when *Show scroll bars* is set to *Always* or a mouse is plugged in.

So a layout built on `100vw` can be right on the developer's laptop and a scrollbar's width off for a large share of visitors. The usual symptom is a horizontal scrollbar under a `width: 100vw` band; a quieter one is any calculation that mixes `vw` with `%`, where the two disagree by exactly that width.

The alternatives measure the space the content actually has: a percentage of the containing block, or [container query units](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries#container_query_length_units) (`cqi`), which resolve against a container's content box and so exclude the scrollbar. Better still is not to measure at all: a capped width like `min(40rem, 100%)` and a layout that adapts inside it, the intrinsic approach [Every Layout](https://every-layout.dev) argues for.

### Tests run without scrollbars

⚠ Headless Chrome hides scrollbars. Puppeteer passes `--hide-scrollbars` among its default launch arguments, so every page it renders behaves as if it had overlay scrollbars: `100vw` equals the content width and a scrollbar bug cannot appear, at any viewport size. A sweep that finds nothing has only tested the overlay case. To test the classic case, drop that argument:

```js
const browser = await puppeteer.launch({
  ignoreDefaultArgs: ['--hide-scrollbars'],
});
```

The scrollbar then takes 15px on macOS Chrome, and `innerWidth - document.documentElement.clientWidth` reports it. The same default applies to anything built on Puppeteer that does not override it, which includes the [[The accessibility test|pa11y run]].

## In jedee

On 2026-10-26 the [[The main menu|mega-menu]] and the [[Site search|search panel]] were sized and positioned from the dev grid: a column unit of `min(64rem, 100vw - var(--gap) * 2) / 64`, with each panel's right edge snapped back to the nearest column edge by a `round()` against `50%` of the header row. The unit came from `100vw`; the row it was snapped against did not include the scrollbar. With a classic scrollbar the grid came out 15px wider than the row, the rounding landed on a different column, and the panels moved by up to a column:

| Window | Panel | Header row |
|---|---|---|
| 480px | −18 to 389px | 29 to 436px |
| 900px | 248 to 741px | 48 to 837px |

Past the left edge of the window at every width from 360 to 734px, and up to 96px short of the row's right edge above that. A headless sweep from 375 to 2560px the same evening had found nothing, for the reason above; the same sweep without `--hide-scrollbars` found 188 widths where the mega-menu spilled off the row.

The fix removed the grid from both panels rather than correcting its unit. Each is now a capped width, flush with the row's right edge:

```css
.menu-toggle + .megamenu {
  --megamenu-width: min(40rem, 100%);
  inset-inline-end: 0;
}

.search-panel {
  --search-panel-width: min(30rem, 100%);
  inset-inline-end: 0;
}
```

Checked from 320 to 1600px with real scrollbars: both panels stay inside the row at every width. How the mega-menu's columns fit inside the 40rem is on [[The main menu]].

Raw source: `src/_raw/dev-notes/How the header panels' width broke on classic scrollbars.md`
