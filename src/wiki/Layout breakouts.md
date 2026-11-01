---
description: "A named-column grid that lets an element step wider than the text column it sits in, and the direct-child constraint that makes it awkward in practice."
date: 2026-08-23
updated: 2026-10-27
---

A reading page wants one narrow column for prose and the occasional element wider than it — a diagram, a code block, a full-bleed image. The old way was negative margins, which fight the page's padding and break at small widths.

The current technique is [Ryan Mulligan's layout breakouts](https://ryanmulligan.dev/blog/layout-breakouts/): make the container a grid with several symmetric named columns, put everything in the middle one by default, and let an element opt into a wider pair of grid lines. Nothing is positioned; the element simply spans different named lines.

```css
.wrapper {
  --gap: clamp(1rem, 6vw, 3rem);
  --full: minmax(var(--gap), 1fr);
  --content: min(var(--wrapper-width, 97rem), 100% - var(--gap) * 2);
  --popout: minmax(0, 2rem);
  --feature: minmax(0, 6.25rem);

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
  <img eleventy:formats="webp,png" src="/assets/images/wiki/layout-breakouts-tracks.png" alt="A diagram of the seven grid tracks in a row, labeled from the outside in: 1fr, 6.25rem, 2rem, --wrapper-width, 2rem, 6.25rem, 1fr. Below them four stacked bars of increasing width, each centered. The narrowest is green and labeled &quot;grid-column: content (the default)&quot;. The three wider ones are blue and labeled .popout, .feature and .full, each reaching one track further out on both sides." width="2080" height="458">
  <figcaption>The seven tracks, and the four spans available across them. Every bar is a real grid item in a real <code>.wrapper</code> — nothing here is positioned, and no bar knows how wide it is.</figcaption>
</figure>

Two details do most of the work. The `[name-start]` / `[name-end]` line names mean `grid-column: popout` is a complete instruction — CSS resolves a bare name to its `-start`/`-end` pair. And `--content` is a `min()` of a maximum width and `100% - gap * 2`, so the content column is capped on a wide screen and still leaves a margin on a narrow one, with no media query anywhere.

**The catch is that these classes only work on a direct child of the grid.** `grid-column` is a property of a grid *item*, and a grid item is a direct child. Wrap the content in anything — a container element, a component's root, a plugin's output — and every breakout class inside it silently does nothing. There is no error; the element just renders at content width, which is exactly what it would do if the class were misspelled. This is the single thing that makes breakouts fiddly in real templates, and it has more than one answer depending on what did the wrapping.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/layout-breakouts-direct-child.png" alt="Three stacked panels, each showing a green content-width bar above a blue bar marked .popout. In the first, labeled &quot;.wrapper &gt; .popout — steps out&quot;, the blue bar is wider than the green one. In the second, labeled &quot;.wrapper &gt; div &gt; .popout — silently content width&quot;, the blue bar is exactly as wide as the green one. In the third, labeled &quot;.wrapper &gt; .wrapper-pass &gt; .popout — steps out again&quot;, the blue bar is wider again." width="1520" height="890">
  <figcaption>The same class, three depths. The middle panel is the failure: <code>.popout</code> is present and did nothing, which is indistinguishable from a typo.</figcaption>
</figure>

`subgrid` is the general answer where the wrapper is yours: a direct child that spans the full track and re-declares `grid-template-columns: subgrid` republishes the parent's named lines to its children, so the breakout classes work one level deeper.

### The second silent failure: a breakout doesn't exist until the content column stops growing

The technique has a second way to go quietly wrong, and it is the opposite shape of the first. Here the class is on the right element, it is a direct grid child, and it still does nothing — on most screens.

The outer tracks are sized `minmax(0, 2rem)` and `minmax(0, 6.25rem)`: a **zero** minimum and a fixed maximum. The content track, meanwhile, is `min(--wrapper-width, 100% - gap * 2)`, so below a certain width it grows with the container and takes all the space there is. Only once the container is wide enough for `--wrapper-width` to win that `min()` does any free space appear for the outer tracks to grow into. The threshold is exactly `--wrapper-width + 2 × --gap`, and **below it every breakout class renders at content width** — identical to no class at all.

Past the threshold the free space is handed to the four growable inner tracks in step, so `.popout` reaches its full `2rem` a further `4 × 2rem = 128px` up, and `.feature` keeps growing after that. Measured against the stylesheet, at a viewport wide enough to pin `--gap` at its `3rem` maximum:

| `--wrapper-width` | container | content column | `.popout` − content |
| --- | --- | --- | --- |
| 97rem | 1600 | 1504 | 0 |
| 97rem | 1648 | 1552 | 0 |
| 97rem | 1700 | 1552 | 26 |
| 97rem | 1776 | 1552 | 64 |
| 64rem | 1120 | 1024 | 0 |
| 64rem | 1160 | 1024 | 20 |
| 64rem | 1249 | 1024 | 64 |

The practical consequence: **the wider you set `--wrapper-width`, the further off-screen you push your breakouts.** At `64rem` the popout is live from 1120px, an ordinary laptop. At `97rem` it stays dead until 1648px and only reaches full width at 1776px — so on a 1440px laptop it is invisible, and on an external display it suddenly makes the element 4rem wider than the widest text on the page. A breakout in a wide container is therefore not a subtler version of a breakout in a narrow one; it is a class that does nothing most of the time and something unintended the rest.

Which says what the classes are actually for: stepping out of a **reading measure**. A container already sized for a wide layout has nothing to break out of, and the right answer there is the content column itself.

## In stomme

`src/assets/css/global/compositions/wrapper.css` is Eleventy Excellent stock, Ryan Mulligan's technique credited in the file. `--wrapper-width` is `97rem` (`variables.css`, raised from EE's `85rem` — see the grid section below) and `.prose` narrows it to `64rem`, so a post body's content column is the narrow one while the breakouts stay measured from it. That is a composition knob in the [[Configuring a layout composition]] sense — a block sets `--wrapper-width` rather than redeclaring `grid-template-columns`.

`.prose-wrapper`, which sets the same `64rem`, is EE stock. The post layouts use `.prose` instead, which does the same job on the same element; `.prose-wrapper` is for card sections that are not post bodies.

### The 12-column grid

The Penpot layout grid is 12 columns of 100px with 32px gutters, 1552px in all, and the wrapper is sized to match it: `--wrapper-width: 97rem`, raised from EE's `85rem`. The prose widths already sat on that grid. The prose column (`64rem`, 1024px) is exactly columns 3–10, and `.popout` adds one 32px gutter on each side. `.feature` was moved from `5rem` to `6.25rem` so that a prose feature spans columns 2–11 (1288px) instead of stopping halfway into a column.

The breakout offsets are shared by both wrapper widths, so only the prose breakouts land on the grid. In the 97rem wrapper a `.feature` would reach 1752px, outside the grid altogether — one more reason the classes belong to prose.

The card listings follow the same grid through `.grid`'s `data-layout` variants (`compositions/grid.css`). At 1552px, `33-33-33` gives four cards of three grid columns each, from an `18rem` minimum that is just too wide for a fifth. `50-50` gives three cards of four columns each, and a two-item `50-50` or `thirds` listing stretches to two cards of six columns each. Inside the 1024px prose column, `halves` gives two cards of four columns each; it is `auto-fill`, so a lone card keeps that width instead of stretching (`/now/`). The grid gap is `--space-s-m`, 31px at its maximum against Penpot's 32, so each card is about a pixel off the guide.

⚠ `custom-masonry.webc` must keep `webc:root="override"`: plain `webc:root webc:keep` on a tag of the component's name renders the tag nested inside itself, and the outer copy has no `data-layout`, so every listing is squeezed into its first column.

### Four ways around the direct-child rule

Every post body hits the constraint, because the mf2 `e-content` wrapper (see [[Microformats]]) is an element between `.wrapper` and the markdown. stomme's addition to the composition is the subgrid pass-through:

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

Used as `<div class="e-content | wrapper-pass flow">` in every post-type layout except `photo.njk`, and without the mf2 class in `wiki.njk`. Two things in there are deliberate. The `:where()` keeps the "default back to content" rule at zero specificity, so a single class like `.popout` still beats it — mirroring how `.wrapper > *` loses to the breakout classes at the top level. And the whole block is inside `@supports`, so a browser without subgrid gets a plain content-column container and breakouts that render at content width: narrower than intended, never broken.

The other three cases are wrappers stomme doesn't control the shape of:

- **A separate markup wrapper** — `audio.njk` and `photo.njk` put the location map in a plain `<div class="feature">`, the direct child, and let the component sit inside it.
- **A shortcode's generated markup** — the image/lightbox shortcode takes a `containerClass` parameter that lands on the outer `<div>` it emits rather than on the inner `<picture>`, for exactly this reason. The `<div>` is load-bearing anyway: markdown-it rejects a bare `<photo-lightbox @…>` line because the `@`-prefixed WebC props aren't valid HTML attributes.
- **A WebC component root** — `<place-map>` puts `webc:root` on the inner element, so a `class="popout"` on the invocation merges onto *that*, a grid grandchild under the component's `<is-land>`. The component takes a `@breakout` prop instead and applies the class to the `<is-land>` root, which is the real grid child. See [[The place map]].

The pattern across all four: find the element that is genuinely the direct child of `.wrapper`, and get the class onto it. When that element is generated by something else, the component has to expose a way in.

### A breakout needs a prose wrapper

`.prose` narrows `--wrapper-width` to `64rem`, but only when it is on the `.wrapper` element itself — the post layouts all do that, so their content column is the prose width and `.popout` is one gutter wider on each side. `partials/archive-listing.njk` puts `.prose` on a *child* instead (it is the intro paragraph's class, not the page's), so custom-property inheritance never reaches the grid and the archive wrapper stays at the wide default. A `.popout` there is wider than every line of prose on the page and only a little narrower than the `.full` header, so it competes with it instead of stepping out of the text. So a `.popout` belongs only in a layout with `.prose` on the wrapper — the post types, the wiki and the wiki's figures — which is the rule the class is worth holding to.

`--table-edge-padding` (see [[Tables]]) is tuned against the `2rem` popout track: at popout width the table's box starts a gutter outside the content column, and the padding puts the first column's text back on the content line. The markdown renderer writes `<div class="table-wrapper | popout">` around **every** table in a post, note or wiki body ([[Tables]]), and those bodies are all prose wrappers, so the comments in `table.css` that describe this apply to nearly every table. A hand-written table outside a prose body, in a wide wrapper with no breakout, gets the padding as an inset that lines up with nothing.

Both figures are `src/wiki/_sources/layout-breakouts.html`, drawn with real `.wrapper` elements against the site's compiled `global.css` — the tracks, the gap clamp and the subgrid pass-through are the stylesheet's rather than a redrawing. `--gap` is `clamp(1rem, 6vw, 3rem)`, so the gutter in a shot is the *shooter's viewport's*, not the specimen's.

Source: `src/assets/css/global/compositions/wrapper.css`. Technique and the file's credit: [Ryan Mulligan, "Layout Breakouts with CSS Grid"](https://ryanmulligan.dev/blog/layout-breakouts/).
