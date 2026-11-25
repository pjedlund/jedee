---
description: "A breadcrumb trail as an ordered list of links in a labeled nav, the BreadcrumbList structured data that mirrors it, and how jedee builds both from one computed list."
date: 2026-09-28
updated: 2026-11-09
---

A breadcrumb shows where the current page sits in the site's hierarchy: home, then each section above the page, then the page itself. It is secondary navigation, never the only way to reach a page, and on a shallow site it is mostly orientation: it tells a visitor who arrived from a search result or a shared link what kind of page this is and where its siblings live.

The accessible markup is settled. The [WAI-ARIA Authoring Practices breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) puts the trail in a `<nav>` landmark with an `aria-label` (so it is distinguishable from the main navigation), uses an ordered list because the order carries meaning, and marks the last item with `aria-current="page"`. The separators between crumbs are decoration: drawn in CSS they never reach the accessibility tree, where a `›` or `/` typed into the markup would be read aloud between every link.

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/jams/">Jams</a></li>
    <li><span aria-current="page">Nine</span></li>
  </ol>
</nav>
```

Search engines read a breadcrumb from structured data rather than from the visible trail: a [schema.org `BreadcrumbList`](https://schema.org/BreadcrumbList) of `ListItem`s, each with a `position`, a `name` and an `item` URL. [Google shows it](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) in place of the raw URL in results. The two versions have to agree, which is easiest when both are generated from the same list.

## In jedee

The breadcrumb is jedee's; Eleventy Excellent has none. It replaced the logo in the top-left of the header, with the logomark as the home crumb, and the classic logo comes back when `breadcrumb: false` is set in `settings.yaml`.

**One list, two outputs.** `breadcrumbs` in `src/_data/eleventyComputed.js` derives the trail from the page URL: home first, one crumb per path segment, and the page's `title` as the last label. Pagination segments (`page-2`) are dropped. Every post URL is a single segment under a section that has an archive, so the trail never invents a crumb that would be a dead link. `partials/breadcrumb.njk` renders the visible trail from it, and `schemas/BreadcrumbList.njk` renders the JSON-LD from the same entries, skipping the home page, whose trail is only the home crumb. Labels go through `dump` so a title with quotes cannot break the JSON. See [[One JSON-LD envelope for sixteen types]] for the other structured data.

**The leaf is enriched, the data is not.** `partials/breadcrumb-leaf.njk` decorates only the visible last crumb, by post type: a jam reads "Nine *by* Russian Circles", a like or bookmark reads "Title *on* example.com", an activity is prefixed with its type. The connector words are set in the body face's regular italic against the uppercase trail. The label in the structured data stays the plain title. An activity's Swedish title gets `lang="sv"` on a separate span; see [[The lang attribute]].

**One line, always.** The trail shares the header row with the menu and theme toggle, and the row never wraps: the ancestors keep their size and only the current-page crumb shrinks, ending in an ellipsis. That clamp uses `-webkit-line-clamp: 1` rather than `white-space: nowrap`, because the global `text-wrap: pretty` reset turns wrapping back on even against an explicit `nowrap`; [[Text wrapping]] has the details. How the row divides its width between the trail and the menu is in [[Configuring a layout composition]] and [[The main menu]].

**Separators and focus.** The chevrons are rotated open borders on `li + li::before`, because the `›` glyph is not in the font subset ([[Font subsetting]]). Each link's box carries the same padding as the header buttons and hands it back with a negative margin, so every crumb shows the same focus ring as the controls beside it without making the row taller. Hover changes contrast only, with no underline: every item in a breadcrumb is a link, so position already says what is clickable.

⚠ The `{%-` whitespace trims around each `<li>` in `breadcrumb.njk` look cosmetic but are not. Without them the whitespace text nodes either side of a crumb paint as a stray highlighted block past the link when the trail is drag-selected.

**The logomark.** The home crumb is not an inline SVG but a `<span>` carrying two copies of the gradient logo as background images: the resting one (slate in light, grey in dark) on the span, and the orange one on its `::before`. The orange copy is revealed with the same fill as the map preloader in [[The place map]]: a conic gradient that sweeps clockwise from 30°, with the stem wiped in as the last step. Here that fill is a mask rather than a paint, so each copy keeps its own gradients. One registered custom property, `--breadcrumb-fill`, runs it from 0 to 100. Registering it with `@property` as a `<number>` is what makes it animatable; an unregistered custom property can't be interpolated, so it would jump straight to the end value.

```css
@property --breadcrumb-fill {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}

.breadcrumb-mark::before {
  background: var(--breadcrumb-mark-lit) center / contain no-repeat;
  mask:
    linear-gradient(to right, #000 calc(var(--breadcrumb-stem) * 100%), transparent 0) calc(var(--breadcrumb-mark) * 0.5) 0 / 10.3% 31% no-repeat,
    conic-gradient(from 30deg, #000 calc(var(--breadcrumb-fill) * 1%), transparent 0),
    linear-gradient(#000 0 0) calc(var(--breadcrumb-mark) * 0.5) 0 / 10.3% 31% no-repeat,
    linear-gradient(#000 0 0);
  mask-composite: add, intersect, exclude, add;
}
```

⚠ The four mask layers are there because a mask can't let a top layer hide what is under it, as a background can. Read from the bottom: a full square, minus the stem's box (`exclude`), cut to the sweep (`intersect`), plus the stem's straight wipe (`add`). Without the cut-out the stem would show the sweep's slanted edge.

On inner pages the mark rests in slate or grey and the orange sweeps in on hover or keyboard focus (0.6 s), then back out on leave (0.35 s). On the home page it stays orange, and the same sweep plays once on load, timed to finish just as the name reveal below starts typing. Hovering the home mark lowers the orange to 82% opacity, so the resting logo shows through: deeper in light, lighter in dark. With reduced motion the end state shows at once. Forced-colors mode drops background images, so there the mark is painted solid in `CanvasText` through `--logo-mask`. The gradient logos are data URIs in `breadcrumb.css`, copies of `logo-gradient-*.svg` in the theme folder; the flat outline, `--logo-mask` in `variables.css`, is still what the map preloader and forced colors use.

**The name reveal.** On the home page the site name types itself out beside the logomark and disappears again. That animation is a decorative, `aria-hidden` copy of the name (the real one is a visually hidden label on the home link), loaded as a local stylesheet on the home page only, and switched with `nameReveal` in `settings.yaml`. [[Choreographing CSS animations]] covers how it is sequenced.

Raw source: `src/_raw/dev-notes/How the breadcrumb works.md`, `src/_raw/dev-notes/How the breadcrumb logomark fills.md`
