---
description: "Icon sets, outline versus filled styles, inline SVG colored by currentColor, labeling icons for assistive technology, and the filled Phosphor set this site uses."
date: 2026-10-14
updated: 2026-10-27
---

An icon on a web page is a small picture standing in for a word: a type of post, an action, a place to go. Almost every site takes its icons from a published **icon set** rather than drawing them, because a set is drawn to one grid, one corner radius and one line weight, and those shared rules are what make thirty unrelated pictures read as a family.

## Outline and filled

Sets come in two broad styles. **Outline** icons are strokes on an empty ground; [Lucide](https://lucide.dev/), Feather and Tabler's default style are of this kind. **Filled** icons are solid shapes, often with details cut out of them. Neither is better. The choice follows what the icons sit beside: lines next to light, airy type and line drawings, solid shapes next to a solid logo or heavy type.

A filled style is not always a separate set. Some families draw every icon in several **weights**, so an icon can change style without leaving the family:

- [Phosphor](https://phosphoricons.com/) — six weights per icon (thin, light, regular, bold, fill, duotone).
- Material Symbols and Fluent — every icon has a filled twin.
- Tabler, Heroicons, Remix Icon, Boxicons and Eva Icons — a filled style that covers part of the set, from about 245 icons (Eva) to about 1,500 (Remix).

That partial coverage is what usually decides between sets. A set is only as good as its worst match for the icons a site actually needs, and a missing icon either gets drawn by hand or replaced by a loose stand-in (a medal for a dumbbell, a map for footprints). Comparing candidates by name against a real list is quicker than browsing their sites: [Iconify](https://iconify.design/) publishes over 200 sets in one JSON format (`@iconify-json/<prefix>` on npm), so one script can look up the same names across all of them.

**A filled weight only fills closed shapes.** An icon that is only open strokes — an arrow, a pulse line, a repeat loop — has nothing to fill, so its filled version looks close to the outline. Every filled set has a few of these.

**Brand logos** are a separate problem. A company's mark is not redrawn to a set's style; it is the mark. [Simple Icons](https://simpleicons.org/) collects brand marks as single-color SVG paths, each on a 24 grid, edge to edge.

## Inline SVG and currentColor

Icons used to ship as an icon font, one glyph per icon. Inline SVG replaced it: it renders crisply at any size, cannot be swapped for a fallback font, and is styled with ordinary CSS. Chris Coyier's [Inline SVG vs Icon Fonts](https://css-tricks.com/icon-fonts-vs-svg/) (2014) sets out the comparison; it still holds.

The convention that makes inline SVG easy is `currentColor`. An icon drawn with `fill="currentColor"` (or `stroke="currentColor"` for an outline) takes the text color of whatever contains it, so a link's hover color, a dark theme or an active state reaches the icon with no rule of its own. Sizing it in `em` (`width="1em" height="1em"`) does the same for size.

## Labels

An icon next to a text label that says the same thing is decoration: it gets `aria-hidden="true"` so a screen reader does not announce it twice ([[Alt text]]). An icon-only control needs its name from somewhere else, usually a visually hidden span inside the button. Sara Soueidan's [Accessible Icon Buttons](https://www.sarasoueidan.com/blog/accessible-icon-buttons/) (2019) covers the techniques and which ones fail. A [[Tooltips|tooltip]] can show the name to sighted users as well, but is not the accessible name.

## In jedee

The site's icons are filled, to match the solid logo mark. Until 2026-10-14 they were Lucide outlines; eight filled sets were compared against the 28 icons in use, and [Phosphor](https://phosphoricons.com/)'s fill weight was the only one with a real match for all 28. Phosphor's rounded shapes are also the closest to the logo's.

The files live in `src/assets/svg/`, by role:

Table: The icon folders
| Folder | Holds | Source |
| --- | --- | --- |
| `posts/` | One icon per post type, used by the main menu, the meta line and search results | Phosphor fill |
| `misc/` | Interface glyphs: gallery arrows, the menu caret, search, clear, the feed | Phosphor fill; search and clear are Phosphor regular |
| `activity/` | One icon per activity type, in the activities table and on the design system page; the meta line uses the `posts/` glyphs instead | Phosphor fill |
| `platform/` | Footer platform logos, the GitHub mark beside "Revised", the video-link icons | Simple Icons |

Each Phosphor file is the icon's path in a `viewBox="0 0 256 256"` with `width="1em" height="1em" fill="currentColor"`. `{% svg 'posts/camera' %}` inlines one, runs it through svgo and adds `aria-hidden="true"` unless an accessible name is passed, in which case it adds `role="img"` and the name as `aria-label` ([[The interlinker's second render pass]] covers why the shortcode must stay synchronous). Eleventy Excellent ships the shortcode and the folder; the choice of set is jedee's.

The files kept their Lucide names when their contents changed, so no template or data file had to change, and `src/_data/navigation.js` still names a post type's icon by the old word. Several no longer describe what they draw: `chef-hat.svg` is a cooking pot, `dumbbell.svg` a barbell, `repeat-2.svg` Phosphor's repeat, `reply.svg` a bent arrow. The design system page lists every icon with its file name.

**Search and clear are the two outline icons**, a choice made on seeing their filled versions in place. Both use Phosphor's regular weight, which keeps them in the family; filled, the clear button's X is cut out of a rounded square.

**Platform logos come from Simple Icons**, not Phosphor. Phosphor has no mark for Bluesky, Flickr, Ko-fi, PeerTube or Strava, and the two sets differ in size side by side: Phosphor pads a logo inside its 256 grid, Simple Icons runs it to the edge of 24. The X link shows the old Twitter bird, which Simple Icons still carries, rather than the X wordmark.

Three post types sit uneasily in the filled set because their icons are open strokes: Reposts, Replies and Activities. They read as outlines in the menu.

⚠ **A `stroke-width` rule on a filled icon does nothing, without warning.** Phosphor files have no stroke, so any CSS that set a line weight on the old outlines now has no effect: `.menu-toggle svg { stroke-width: 3 }` in `main-nav.css`, and the `stroke-width: var(--caption-icon-stroke)` plus `vector-effect: non-scaling-stroke` that matched the YouTube and PeerTube link icons to the caption icon ([[Figures]]). Changing those values changes nothing on the page.

Two icon-like graphics are not files and were not part of the change: the theme toggle's sun and moon, drawn as SVG shapes that animate ([[The theme toggle]]), and the info icon on figure captions, drawn with CSS borders and gradients ([[Figures]]). Both are still lines.

Raw source: `src/_raw/dev-notes/How the icon set was chosen.md`
