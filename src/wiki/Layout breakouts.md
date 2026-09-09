---
description: "A named-column grid that lets an element step wider than the text column it sits in, and the direct-child constraint that makes it awkward in practice."
date: 2026-08-23
---

A reading page wants one narrow column for prose and the occasional element wider than it — a diagram, a code block, a full-bleed image. The old way was negative margins, which fight the page's own padding and break at small widths.

The current technique is [Ryan Mulligan's layout breakouts](https://ryanmulligan.dev/blog/layout-breakouts/): make the container a grid with several symmetric named columns, put everything in the middle one by default, and let an element opt into a wider pair of grid lines. Nothing is positioned; the element simply spans different named lines.

```css
.wrapper {
  --gap: clamp(1rem, 6vw, 3rem);
  --full: minmax(var(--gap), 1fr);
  --content: min(var(--wrapper-width, 85rem), 100% - var(--gap) * 2);
  --popout: minmax(0, 2rem);
  --feature: minmax(0, 5rem);

  display: grid;
  grid-template-columns:
    [full-start] var(--full)
    [feature-start] var(--feature)
    [popout-start] var(--popout)
    [content-start] var(--content) [content-end]
    var(--popout) [popout-end]
    var(--feature) [feature-end]
    var(--full) [full-end];
}

.wrapper > * { grid-column: content; }
.popout      { grid-column: popout; }
.feature     { grid-column: feature; }
.full        { grid-column: full; }
```

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/layout-breakouts-tracks.png" alt="A diagram of the seven grid tracks in a row, labelled from the outside in: 1fr, 5rem, 2rem, --wrapper-width, 2rem, 5rem, 1fr. Below them four stacked bars of increasing width, each centred. The narrowest is dark and labelled &quot;grid-column: content (the default)&quot;. The three wider ones are orange and labelled .popout, .feature and .full, each reaching one track further out on both sides." width="2164" height="534">
  <figcaption>The seven tracks, and the four spans available across them. Every bar is a real grid item in a real <code>.wrapper</code> — nothing here is positioned, and no bar knows how wide it is.</figcaption>
</figure>

Two details do most of the work. The `[name-start]` / `[name-end]` line names mean `grid-column: popout` is a complete instruction — CSS resolves a bare name to its `-start`/`-end` pair. And `--content` is a `min()` of a maximum width and `100% - gap * 2`, so the content column is capped on a wide screen and still leaves a margin on a narrow one, with no media query anywhere.

**The catch is that these classes only work on a direct child of the grid.** `grid-column` is a property of a grid *item*, and a grid item is a direct child. Wrap the content in anything — a container element, a component's own root, a plugin's output — and every breakout class inside it silently does nothing. There is no error; the element just renders at content width, which is exactly what it would do if the class were misspelled. This is the single thing that makes breakouts fiddly in real templates, and it has more than one answer depending on what did the wrapping.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/layout-breakouts-direct-child.png" alt="Three stacked panels, each showing a dark content-width bar above an orange bar marked .popout. In the first, labelled &quot;.wrapper &gt; .popout — steps out&quot;, the orange bar is wider than the dark one. In the second, labelled &quot;.wrapper &gt; div &gt; .popout — silently content width&quot;, the orange bar is exactly as wide as the dark one. In the third, labelled &quot;.wrapper &gt; .wrapper-pass &gt; .popout — steps out again&quot;, it is wider once more." width="1604" height="958">
  <figcaption>The same class, three depths. The middle panel is the failure: <code>.popout</code> is present and did nothing, which is indistinguishable from a typo.</figcaption>
</figure>

`subgrid` is the general answer where the wrapper is yours: a direct child that spans the full track and re-declares `grid-template-columns: subgrid` republishes the parent's named lines to its own children, so the breakout classes work one level deeper.

## In jedee

`src/assets/css/global/compositions/wrapper.css` is Eleventy Excellent stock, Ryan Mulligan's technique credited in the file. `--wrapper-width` defaults to `85rem` (`variables.css`) and `.prose` narrows it to `64rem`, so a post body's content column is the narrow one while the breakouts stay measured from it. That is a composition knob in the [[Configuring a layout composition]] sense — a block sets `--wrapper-width` rather than redeclaring `grid-template-columns`.

`.prose-wrapper`, which sets the same `64rem`, is EE stock that nothing in jedee uses: `.prose` does the job on the same element. One more entry for [[What jedee kept from Eleventy Excellent]]'s list of machinery left behind.

### Four ways around the direct-child rule

Every post body hits the constraint, because the mf2 `e-content` wrapper (see [[Microformats]]) is an element between `.wrapper` and the markdown. jedee's own addition to the composition is the subgrid pass-through:

```css
@supports (grid-template-columns: subgrid) {
  .wrapper > .wrapper-pass {
    grid-column: full;
    display: grid;
    grid-template-columns: subgrid;
  }

  :where(.wrapper > .wrapper-pass) > * { grid-column: content; }
}
```

Used as `<div class="e-content | wrapper-pass flow">` in `post.njk` and `note.njk`, and without the mf2 class in `wiki.njk`. Two things in there are deliberate. The `:where()` keeps the "default back to content" rule at zero specificity, so a single class like `.popout` still beats it — mirroring how `.wrapper > *` loses to the breakout classes at the top level. And the whole block is inside `@supports`, so a browser without subgrid gets a plain content-column container and breakouts that render at content width: narrower than intended, never broken.

The other three cases are wrappers jedee doesn't control the shape of:

- **A markup wrapper of your own** — `audio.njk` and `photo.njk` put the location map in a plain `<div class="popout">`, the direct child, and let the component sit inside it.
- **A shortcode's generated markup** — the image/lightbox shortcode takes a `containerClass` parameter that lands on the outer `<div>` it emits rather than on the inner `<picture>`, for exactly this reason. The `<div>` is load-bearing anyway: markdown-it rejects a bare `<photo-lightbox @…>` line because the `@`-prefixed WebC props aren't valid HTML attributes.
- **A WebC component root** — `<place-map>` puts `webc:root` on the inner element, so a `class="popout"` on the invocation merges onto *that*, a grid grandchild under the component's own `<is-land>`. The component takes a `@breakout` prop instead and applies the class to the `<is-land>` root, which is the real grid child. See [[The place map]].

The pattern across all four: find the element that is genuinely the direct child of `.wrapper`, and get the class onto it. When that element is generated by something else, the component has to expose a way in.

Both figures are `src/wiki/_sources/layout-breakouts.html`, drawn with real `.wrapper` elements against the site's compiled `global.css` — the tracks, the gap clamp and the subgrid pass-through are the stylesheet's rather than a redrawing. ⚠ `--gap` is `clamp(1rem, 6vw, 3rem)`, so the gutter in a shot is the *shooter's viewport's*, not the specimen's; at 1400px it sits at the `3rem` maximum, which is the gutter a desktop reader gets.

Source: `src/assets/css/global/compositions/wrapper.css`, checked against live code 2026-08-23. Technique and the file's own credit: [Ryan Mulligan, "Layout Breakouts with CSS Grid"](https://ryanmulligan.dev/blog/layout-breakouts/).
