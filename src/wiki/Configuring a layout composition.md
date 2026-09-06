---
description: "Layout compositions are meant to be configured through published custom properties rather than overridden from outside — and the two traps that come with using a custom property as the knob: it inherits into nested instances, and it loses to a hard declaration on the same element."
date: 2026-08-23
---

A layout composition is a reusable arrangement — a row that pushes its two items apart, a group that wraps, a stack with consistent vertical rhythm — held in one file and applied by class name. [Every Layout](https://every-layout.dev) is the canonical set of them; [CUBE CSS](https://cube.fyi) makes them its **C** layer, the one that decides how elements sit relative to each other, deliberately above and before any component styling.

The point of the layer is that one file describes the layout. That only holds if components *configure* the composition rather than redeclare its properties, so compositions publish their variation points as custom properties with fallbacks:

```css
.cluster {
  display: flex;
  flex-wrap: var(--cluster-wrap, wrap);
  gap: var(--gutter, var(--space-s-m));
  justify-content: var(--cluster-horizontal-alignment, flex-start);
}
```

A component that needs a cluster that never wraps sets `--cluster-wrap: nowrap`. It does not write `flex-wrap: nowrap` at a selector that happens to reach the element. The difference is not stylistic: once two components each declare `flex-wrap` on the same composition from two files, the composition file no longer tells you what the layout does, and working out which one wins means comparing selectors across files.

Two things about custom properties make this less automatic than it sounds.

## A knob inherits; a declaration does not

Custom properties are [ordinary inherited properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties). `flex-wrap: nowrap` on a row affects that row. `--cluster-wrap: nowrap` on that row affects the row *and every descendant* — so if the same composition appears nested inside, it silently picks up the outer setting.

This is the failure mode that converting from declarations to knobs introduces, and it is invisible in the stylesheet: both files look correct, and the composition is behaving exactly as written.

Two ways out. Re-assert the value on the nested instance:

```css
.inner-cluster { --cluster-wrap: wrap; }
```

Or register the property so it does not inherit at all:

```css
@property --cluster-wrap { syntax: "*"; inherits: false; }
```

[`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) with `inherits: false` makes descendants fall to the `var()` fallback instead of the ancestor's value. Tested directly: with a plain custom property, an outer element set to `nowrap` gave a nested element `nowrap`; with the registered property, the same nesting gave `wrap`.

## A knob loses to a declaration on the same element

`flex-wrap: var(--cluster-wrap, wrap)` in the composition is still just a declaration, and it can be beaten. Under CUBE's cascade-layer order, `blocks` comes after `compositions`, so a block's `flex-wrap: nowrap` on that element wins outright regardless of specificity, and any *other* file setting `--cluster-wrap` is talking to a property nothing reads any more.

The consequence is that converting one writer accomplishes nothing. Every file that declares the property has to move to the knob in the same change, or none of them should.

## What a knob should not own

Not everything a component sets on a composition belongs in the composition's API. `flex` and `min-inline-size` on an element that *is* a cluster size it as an item of its own parent — they describe its relationship to its siblings, not the cluster's internal arrangement. Those stay plain declarations. The test is whether the composition would ever want to read the value itself.

## The residue

Once several blocks legitimately write the same knob, which one wins is decided by selector specificity, which is a property of how the selectors happen to be written rather than a recorded decision. Where the deciding condition is known at build time, the honest fix is to state it in the markup — an attribute the composition already understands — and leave CSS to arbitrate only what markup cannot know.

## In jedee

The site header row is one element: `<div class="repel ontop gutter-s breadcrumb-bar">` in `partials/header.njk`, with the breadcrumb on the left and a `.cluster` holding the nav and theme toggle on the right. Three files had opinions about it.

`main-nav.css` was rebuilding the cluster composition by hand for the no-JavaScript pill row — `display: flex`, `flex-wrap`, `justify-content` and `gap`, all four already in `cluster.css`. The `<ul>` now carries the class, using the project's existing grouping convention:

```html
<ul id="megamenu" class="megamenu | cluster" role="list" data-no-flash>
```

```css
.mainnav > .megamenu:first-child {
  --gutter: var(--space-3xs) var(--space-2xs);
  --cluster-horizontal-alignment: flex-end;
  --cluster-wrap: wrap;
  visibility: visible;
  opacity: 1;
}
```

`repel.css` is **Eleventy Excellent stock**; the `--repel-wrap` knob is jedee's, added to mirror cluster's existing `--cluster-wrap` so `breadcrumb.css` (which pins the row to one line) and `main-nav.css` (which relaxes that pin when the menu button was never injected) both configure rather than override. The stock `[data-nowrap]` exception now sets the same property, so there is one mechanism instead of two.

Both traps above were found here rather than read about. The `--cluster-wrap: nowrap` that pins the header cluster inherited straight into the pill row nested inside it, which had just become a cluster itself — hence the `--cluster-wrap: wrap` re-assert in the block above. And because `blocks` outranks `compositions`, `breadcrumb.css`'s hard `flex-wrap: nowrap` had to convert in the same commit or `main-nav.css`'s knob would have been inert.

The residue is live: `main-nav.css` wins over `breadcrumb.css` because `.site-header .repel:has(.mainnav):not(:has(.menu-toggle))` outweighs `.breadcrumb-bar`, which nobody decided. `header.njk` already evaluates `meta.navigation.breadcrumb` at build time and could emit `data-nowrap` itself, leaving CSS to handle only the "did the script run" axis that a build cannot know. Not done — there is no third writer yet.

The flex-item side of the same row is covered in [[The main menu]], including why `flex: 1 1 22rem` rather than `auto` is what keeps the breadcrumb from being crushed. For the adjacent failure where a `var()` points at nothing at all, see [[Undefined custom properties]].

Raw source: `src/_raw/dev-notes/How the header row's wrapping got a knob.md`
