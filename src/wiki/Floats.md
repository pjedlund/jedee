---
description: "The one job floats are still for, letting text wrap around an image, what a float needs from its container, and deciding with a container query when it should stop floating."
date: 2026-10-23
---

Before flexbox and grid, [`float`](https://developer.mozilla.org/en-US/docs/Web/CSS/float) was how whole pages were laid out, and the clearfix hacks of that era are why floats got a bad name. Layout has moved on, but the job floats were designed for has not: taking a box out of the line of text so the text wraps around it, beside it first and then underneath once it has passed. Neither flexbox nor grid can do that, and [Every Layout](https://every-layout.dev) has no primitive for it, because it is part of how text flows rather than how a page is arranged.

```css
.figure {
  float: inline-end;               /* right in a left-to-right language */
  inline-size: 35%;
  margin-inline-start: 1.5rem;     /* space between the box and the text */
  margin-block-end: 1rem;          /* space before the text that runs under it */
}
```

`inline-end` is the logical value: right in English and Swedish, left in Arabic or Hebrew.

## What the container has to provide

A float wraps the line boxes of the text that follows it in the same block formatting context, so the box and the text it wraps must be in the same ordinary block.

⚠ A float on a grid item or a flex item does nothing: the item stays where the grid or the flex row puts it, and no text wraps around it. In a post body laid out as a grid, every paragraph is a separate grid item, so a floated image between paragraphs simply sits in its row. The fix is a plain wrapper block holding the floated box and the text that should wrap around it.

The container also has to hold the float in. A float taller than its text otherwise hangs out of the bottom of its block and over whatever comes next. [`display: flow-root`](https://developer.mozilla.org/en-US/docs/Web/CSS/display#flow-root) on the wrapper makes it contain its floats, the modern replacement for a clearfix. A grid item already contains its floats, since it starts its formatting context, but `flow-root` keeps that true wherever the wrapper ends up.

## When to stop floating

A float has no intrinsic way to give up: in a narrow column it keeps its width and squeezes the text beside it into a ribbon of one or two words. Something has to decide when the text would get too narrow and drop the float. Since the decision depends on the width of the block the float sits in, not the viewport, a [container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) on that block is the right tool:

```css
:has(> .figure) {
  container: figure-flow / inline-size;
  display: flow-root;
}

@container figure-flow (inline-size >= 46rem) {
  .figure { float: inline-end; inline-size: 35%; }
}
```

The `:has()` rule lets the floated component set up its wrapper, so the page using it only has to put it first inside the block of text. The threshold follows from the widths: if the text beside the float should keep at least 28rem and the float takes 35 % plus a gutter, the block needs about 28 ÷ 0.61 = 46rem. Below that the box sits above the text, which is also where it belongs on a phone.

## Why not a two-column layout

A sidebar layout (text in one column, the image in another) looks the same as a float as long as the text is short. The difference shows with longer text: in two columns the text stays in its strip and leaves the space under the image empty, while a float lets it run on underneath. Bending a sidebar into a fixed-proportion two-column grid also needs a hand-kept breakpoint, because percentages on both sides never wrap by themselves. A float plus one container query is less code and the right model. See [[Configuring a layout composition]] for when a composition is the right tool.

## In jedee

Post bodies are a subgrid: `.e-content` has `.wrapper-pass`, which exposes the wrapper's named columns to each block (see [[Layout breakouts]]). That makes each paragraph a grid item, so a float needs a wrapper block. On the *Bethink Yourselves!* note that block is the `<div lang="sv">` that already marks the Swedish text, and the pamphlet partial (see [[CSS 3D transforms]]) is its first child.

The pamphlet floats across 2 of the prose grid's 8 columns, never under 13rem, one gutter from the text: `max(calc(100% * 14.5 / 64), 13rem)` wide with a `calc(100% * 2 / 64)` margin, where a column is 6.25 and a gutter 2 of the 64 units of the 64rem prose. Its CSS gives the parent block `container: pamphlet-flow / inline-size; display: flow-root` through `:has(> .pamphlet)`, the same pattern as `is-land:has(> .site-search)` in the search CSS. One container query at 42.32rem (28rem of text and the 13rem minimum ÷ 62/64) decides both the float and the pamphlet's tilt. Measured at the edge on the design system page: at a 769 px viewport the block is 42.29rem and the pamphlet sits flat above the text; at 770 px it is 42.35rem and the pamphlet floats.

Under the float, lines only reach the site's prose measure (see [[Line length]]), so the text running under the pamphlet is just a little wider than beside it.

The first version used the Sidebar composition instead. A percentage row gap there (`gap: calc(100% * 2 / 64)`) let the text spill 20 px out of the sidebar on a phone: in a flex container whose height is not fixed, a percentage row gap is not counted in the height. Only the column gap can safely be a percentage.

Raw source: `src/_raw/dev-notes/How the pamphlet and book mock-ups work.md`
