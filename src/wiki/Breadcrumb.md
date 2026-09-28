---
description: "A breadcrumb trail as an ordered list of links in a labeled nav, the BreadcrumbList structured data that mirrors it, and how jedee builds both from one computed list."
date: 2026-09-28
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

The breadcrumb is jedee's own; Eleventy Excellent has none. It replaced the logo in the top-left of the header, with the logomark as the home crumb, and the classic logo comes back when `breadcrumb: false` is set in `settings.yaml`.

**One list, two outputs.** `breadcrumbs` in `src/_data/eleventyComputed.js` derives the trail from the page URL: home first, one crumb per path segment, and the page's `title` as the last label. Pagination segments (`page-2`) are dropped. Every post URL is a single segment under a section that has an archive, so the trail never invents a crumb that would be a dead link. `partials/breadcrumb.njk` renders the visible trail from it, and `schemas/BreadcrumbList.njk` renders the JSON-LD from the same entries, skipping the home page, whose trail is only the home crumb. Labels go through `dump` so a title with quotes cannot break the JSON. See [[One JSON-LD envelope for sixteen types]] for the other structured data.

**The leaf is enriched, the data is not.** `partials/breadcrumb-leaf.njk` decorates only the visible last crumb, by post type: a jam reads "Nine *by* Russian Circles", a like or bookmark reads "Title *on* example.com", an activity is prefixed with its type. The connector words are set in the body face's regular italic against the uppercase trail. The label in the structured data stays the plain title. An activity's Swedish title gets `lang="sv"` on its own span; see [[The lang attribute]].

**One line, always.** The trail shares the header row with the menu and theme toggle, and the row never wraps: the ancestors keep their size and only the current-page crumb shrinks, ending in an ellipsis. That clamp uses `-webkit-line-clamp: 1` rather than `white-space: nowrap`, because the global `text-wrap: pretty` reset turns wrapping back on even against an explicit `nowrap`; [[Text wrapping]] has the details. How the row divides its width between the trail and the menu is in [[Configuring a layout composition]] and [[The main menu]].

**Separators and focus.** The chevrons are rotated open borders on `li + li::before`, because the `›` glyph is not in the font subset ([[Font subsetting]]). Each link's box carries the same padding as the header buttons and hands it back with a negative margin, so every crumb shows the same focus ring as the controls beside it without making the row taller. Hover changes contrast only, with no underline: every item in a breadcrumb is a link, so position already says what is clickable.

⚠ The `{%-` whitespace trims around each `<li>` in `breadcrumb.njk` look cosmetic but are not. Without them the whitespace text nodes either side of a crumb paint as a stray highlighted block past the link when the trail is drag-selected.

**The name reveal.** On the home page the site name types itself out beside the logomark and disappears again. That animation is a decorative, `aria-hidden` copy of the name (the real one is a visually hidden label on the home link), loaded as a local stylesheet on the home page only, and switched with `nameReveal` in `settings.yaml`. [[Choreographing CSS animations]] covers how it is sequenced.

Raw source: `src/_raw/dev-notes/How the breadcrumb works.md`
