---
description: "Styling data tables with modern CSS: markup that reads correctly unstyled, the browser defaults worth overriding, alignment and sticky headers, the scroll container a wide table needs, and rules painted as a gradient because a collapsed border gives one colour per edge."
date: 2026-09-15
---

A table is for tabular data: values that relate along two axes at once, read across a row and down a column. That relationship is what `<table>` gives a screen reader, which announces the row and column headers as the reader moves from cell to cell, and it is lost the moment the grid is rebuilt from `div`s. A timetable, a price list or a comparison is tabular; a page layout is not.

What follows is [Michelle Barker's "Styling Tables the Modern CSS Way"](https://piccalil.li/blog/styling-tables-the-modern-css-way/) (Piccalilli, 2024-07-18), with the accessibility of the scroll container from [Adrian Roselli](https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html). None of it has been overtaken since.

## Markup first

A well-marked-up table reads correctly before any CSS arrives: browsers bold `<th>`, and the caption names the table.

```html
<table>
  <caption>Morning trains, Uppsala to Stockholm</caption>
  <thead>
    <tr><th scope="col">Train</th><th scope="col">Departs</th><th scope="col">Arrives</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">SJ 551</th><td>07:12</td><td>07:51</td></tr>
    <tr><th scope="row">SJ 553</th><td>07:42</td><td>08:21</td></tr>
  </tbody>
  <tfoot>
    <tr><th scope="row">Journey time</th><td colspan="2">39 minutes</td></tr>
  </tfoot>
</table>
```

- `<caption>` must be the **first child** of `<table>`. It is the table's accessible name; the [WAI tables tutorial](https://www.w3.org/WAI/tutorials/tables/caption-summary/) covers longer summaries.
- `<thead>`, `<tbody>` and `<tfoot>` group the rows. `<tfoot>` is for summary rows, such as a total or an average.
- `<th>` marks headers on both axes, and `scope` says which axis each one governs. ⚠ The valid keywords are `row`, `col`, `rowgroup` and `colgroup`. Barker's article writes `scope="column"`, which is none of them; an invalid value falls back to the automatic state, so it happens to work in a simple table and quietly means nothing in a complex one.

## The defaults worth overriding

```css
table { border-collapse: collapse; }
th, caption { text-align: start; }
th, td { padding: 0.25rem 0.75rem; }
```

- `border-collapse` defaults to `separate`: every cell draws its own border with `border-spacing` between them, and a `<tr>` cannot take a border at all. `collapse` makes neighbouring cells share one border and lets whole rows carry rules.
- `<th>` and `<caption>` are centred by default. Start alignment reads better, and the logical keyword follows the writing direction. Barker found `text-align: start` on `<table>` itself unreliable across browsers, so it goes on the cells.
- Cells get no padding from the browser.

## Alignment

Text aligns to the start and numbers to the end, so place values line up and can be compared against each other and against a total. Vertically, `vertical-align: baseline` keeps the first lines of a wrapped row level with each other, and `bottom` on the column headers stops a short heading from floating high above its column when a neighbouring heading wraps.

## Telling the bands apart

The header and footer rows should read as different from the body: a heavier rule, a background, or both. Between body rows, either lighter rules or alternating backgrounds (zebra striping), not both. Column rules are rarely needed, because aligned content already implies the columns. Barker derives the stripe from one custom property, so there is only one color to change:

```css
tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--table-color), transparent 60%);
}
```

`caption-side: bottom` moves the caption under the table visually. It stays first in the markup, and first for a screen reader.

## A table wider than the page

A table with many columns, or almost any table on a phone, pushes the whole page sideways. The fix is to let the table scroll on its own inside a wrapper with `overflow-x: auto`.

⚠ **That wrapper is inaccessible on its own.** A keyboard user cannot scroll a box they cannot focus, and a screen reader has nothing to announce. Roselli's pattern makes it focusable and a named landmark, and the three attributes only work together:

```html
<div class="table-wrapper" role="region" tabindex="0" aria-labelledby="trains">
  <table>
    <caption id="trains">Morning trains, Uppsala to Stockholm</caption>
    …
  </table>
</div>
```

Roselli styles the scroll box through the attribute selector `[role="region"][aria-labelledby][tabindex]` rather than a class, so a table only gets clipped when its markup is accessible. Some platforms hide scrollbars until you scroll, so he adds scroll shadows, after [Lea Verou's `background-attachment: local` technique](https://lea.verou.me/blog/2012/04/background-attachment-local/) (2012): two shadows pinned to the box's edges, and two page-colored covers that scroll with the content and slide over a shadow once that edge is reached. See [Fixed Table Headers](https://adrianroselli.com/2020/01/fixed-table-headers.html) for the full version.

## Sticky row headers

When a wide table scrolls, the row labels scroll away with it. `position: sticky; inset-inline-start: 0` on the first column keeps them in view. ⚠ A sticky cell needs its own background, or the cells scrolling underneath show through it. Under `border-collapse: collapse` the rule between the sticky column and the next one does not travel with the sticky cell; Barker repaints it with an absolutely positioned `::after`.

## Column widths

By default each column is as wide as its content, so the longest heading or cell decides. `table-layout: fixed` sizes columns from the first row and any explicit widths instead, and shares the remaining space evenly. ⚠ It does nothing without an explicit `width` on the table. Barker's `width: max(65rem, 100%)` keeps a dense table at least 65rem wide, which is fine inside a scrolling wrapper.

Table: The techniques above, one line each
| Goal | Technique |
| --- | --- |
| Shared borders, rules on rows | `border-collapse: collapse` |
| Alignment that follows the writing direction | `text-align: start` / `end` |
| Stripes from one color | `color-mix()` on `tbody tr:nth-child(even)` |
| Caption under the table | `caption-side: bottom` |
| The table scrolls, not the page | a wrapper with `overflow-x: auto`, `tabindex="0"`, `role="region"` and a name |
| Row labels stay in view | `position: sticky` plus a background |
| Even, predictable columns | `table-layout: fixed` plus a `width` |

## In jedee

Until 2026-09-15 the only table CSS was Eleventy Excellent's stock `local/table.css`: the stacked pattern, which hides `<thead>` on small screens and labels each cell with `td::before { content: attr(data-label) }`. Nothing in jedee writes `data-label`, and only the style guide included the file, so the 40 markdown tables across 18 wiki pages had no table styling at all beyond their lining, tabular figures ([[Typographic conventions]]). The stacked rules are gone and `local/table.css` is now jedee's own.

### The markup comes from the markdown renderer

Tables here are written in markdown, and a markdown table has no caption, no row headers and no wrapper. `src/_config/plugins/markdown.js` adds what it can:

- Every table is wrapped in `<div class="table-wrapper | popout" role="region" tabindex="0" …>`.
- The region is named by the caption when there is one, and otherwise by an `aria-label` listing the column headers ("File, Where it shows").
- A paragraph starting `Table:` directly before or after a table becomes its `<caption>`. This is pandoc's convention, and in Obsidian it reads as an ordinary line. The table of techniques above is written this way:

```markdown
Table: The techniques above, one line each
| Goal | Technique |
| --- | --- |
| Shared borders, rules on rows | `border-collapse: collapse` |
```

- Header cells get `scope="col"`, and a column aligned with `---:` gets `text-align: end` instead of markdown-it's physical `right`.

⚠ Markdown cannot mark a row header: the first column is always `<td>`. A table that needs row headers, like the style guide's two token tables, is written as HTML with the wrapper by hand.

⚠ The caption is a paragraph and not an attribute because markdown-it 14 reads a line directly under a table as one more row. markdown-it-attrs' `{.class}`-under-the-table syntax therefore renders here as a table row with the braces in it.

### Popout width

The wrapper carries `.popout`, not the table, because the breakout classes only work on a direct grid child ([[Layout breakouts]]) and the wrapper is the element between the table and the grid. Post, note and wiki bodies sit in `.wrapper-pass`, so a table there lines up exactly with the code blocks, which break out the same way: both measured 913px wide from the same edge at a 1024px viewport. In a body without the pass-through the class does nothing and the table stays at content width. The style guide's Spacing section was one until 2026-09-15, which left its table 32px narrower on each side than the Sizes table above it; the section carries `.wrapper-pass` now. ⚠ Both style-guide tables are hand-written HTML and lost their `.popout` on 2026-09-19, because the style guide's wrapper is the stock 85rem one and a breakout there steps out from a column that is already wide — see [[Layout breakouts]]. They sit at content width, equal to each other; the markdown tables in post, note and wiki bodies are the ones still in a breakout.

### One include for every layout

`base.njk` adds the file to the page's local bundle only when the rendered page contains a table:

```njk
{%- if content and content.includes('<table') -%}
  {%- css "local" -%}{%- include 'css/table.css' -%}{%- endcss -%}
{%- endif -%}
```

⚠ **The `content and` guard is load-bearing.** Written as a bare `content.includes('<table')`, the build still succeeded, but every wikilink on the site rendered as literal `[[…]]` text: `content` is undefined in at least one render of the layout, the call throws there, and the interlinker's link lookup is lost without an error. Measured by building with and without the change: 8 links on [[Layout breakouts]] with the guard, none without. Another member of the family described in [[The interlinker's second render pass]].

Every layout passes through `base.njk`, so no post type has to remember the include, and a page without a table ships none of it: 19 built pages have one. A table in a code sample is escaped (`&lt;table`) and does not match. Eleventy Excellent's own pattern is an include in each layout's `{% css "local" %}` block.

### What the stylesheet chose

- No box around the table (`--table-border: none`) and no column rules. Body rows are separated by a stamped pair, below. The header and footer get a doubled rule in `--table-rule-color`, and so does the last body row: without a box the table would otherwise trail off. The wrapper keeps its rounded corners, which now only round the header's tint. Stripes are off.
- The header row is tinted with `--color-bg-head` and set in normal case at `--size-step-min-1`, a step below the body text, in the regular weight, letterspaced by `--tracking-wide`. Real small caps (`font-variant-caps: all-small-caps`) at the text size were the choice until 2026-09-19 — Bringhurst letterspaces capitals and small caps alike, Butterick treats small caps as an alternative to bold rather than an addition, and small caps drawn from lowercase letters avoid the screen-reader risk of `text-transform: uppercase` ([[Typographic conventions]]) — and letterspaced capitals at `--size-step-min-2` were tried before those. The size and weight now come from the design's `type.table.header` token, which carries no letter-spacing of its own; `--tracking-wide` resolves to 1.67px, which is exactly the value sitting on the design's own text shapes. The caption is italic at `--size-step-min-1`. Body cells keep the size of the text around the table: Rutter warns against shrinking table text to fit more in, and a step smaller was tried and reverted. Cells have `--space-s` above and below.
- ⚠ The rules use `--color-rule`, not `--stroke`. `--stroke` is drawn in `--color-bg-accent`, which is white in the light theme and disappears against the off-white page; the old stacked file used it, so its row rules were invisible in light mode. They were `--color-bg-accent-2` until 2026-09-19, when the design moved them onto a warmer hairline of their own.
- The scroll shadows and covers are mixed from `--color-bg` and `--color-text` rather than the article's white, so they follow the theme.
- The caption and first-column text sit `--table-edge-padding` in from the box, set to the fluid token `--space-m-l` (14px at a 320px window, 31px from 1350px up). ⚠ Its 31px maximum is the `2rem` popout track in `wrapper.css` minus the border, so at full popout width the text lands on the prose's edge. Once the window is too narrow for the popout, the box sits flush with the prose and the text keeps an inset that shrinks with the window. Measured on this page: the text starts at the prose's pixel at 1600px, 2px short of it at 1280px, and 22px and 15px inside it at 768px and 375px. The closing edge takes the same inset, so an end-aligned last column ends as far from the box as the first column starts, and a sort chevron drawn outside its head's box has room to sit in. ⚠ `:last-child` is the last cell in the markup, not the last one showing, so a table that drops columns has to hand the closing inset on by name — the activities table gives it to Time once Heart rate goes. The inset is two tokens, not one: `--table-edge-padding` is what the rules read and is a free choice, and `--table-popout-edge-padding` is the one pinned to the popout track, swapped in by `.table-wrapper.popout` — the class the markdown renderer writes on every table in a prose body. A standalone table (activities, the style guide) is in no popout track, so it can take any inset it likes without sliding a prose table's text off the prose's edge. Both tokens hold `--space-m-l` today, so nothing has moved yet.
- Until 2026-09-15 a container-query formula, `max(var(--space-s), (100cqi - var(--wrapper-width, 85rem)) / 2)`, kept the text on the prose's edge for as long as any popout track was left, then dropped to the ordinary cell padding. Johan wanted the popout's inset kept on narrow screens instead. A fixed `2rem` was tried first and was too much on a phone, so the inset now scales with the token. The wrapper no longer needs `container-type` for this; only a table whose columns drop sets it (see *The activities table* below).
- The wrapper's focus ring is the site's global `:focus-visible` ring; nothing here is table-specific.
- Lining, tabular figures are set on `.table-wrapper` itself, so a table outside `.prose` gets them too; inside `.prose`, `.prose table` already set the same values.
- Row headers stick when a table has a `<th>` in its body, detected with `table:has(tbody th)`. With no column rules, Barker's `::after` repair is not needed. A table whose rows are links turns this off (below).
- ⚠ Below the `sm` breakpoint `prose.css` sets `word-break: break-word` and `hyphens: auto` on everything in a post body, for long URLs. In a table that lowers every column's minimum width, so columns shrank to single characters ("P / e / rf", "0. / 00 / 4") instead of the table scrolling. The wrapper resets both. Measured at 375px on [[Layout shift]]: before the reset none of its 13 tables scrolled and the scores broke mid-number; after it, 7 scroll and the page itself still does not.
- Stripes are off (`--table-stripe: transparent`). Rutter advises against fills, keeping a light tint only where the layout cannot guide the eye, and Barker says rules or stripes, not both. They were on for part of 2026-09-15. When on, the stripe is a translucent image on the cells of every even body row, `linear-gradient(var(--table-stripe) 0 0)`, with `--table-stripe` at 4% of `--color-text`. A background on the row would be hidden by the sticky row header's opaque background, since cells paint above rows; on the cells, the row header keeps its opaque color under the tint and the scroll shadows still show through the other cells. Measured text contrast on a striped row: 6.58:1 in the light theme (6.97:1 unstriped) and 10.25:1 in the dark theme (11.03:1).
- Every value that sets the look is a custom property at the top of `.table-wrapper`: the colors, the rules, the paddings, the cell alignment, the caption's size and style. The cells inherit them, and every table on the site sits in a wrapper. `--table-border: var(--table-rule)` brings the box back, and a tint in `--table-stripe`, such as `color-mix(in oklab, var(--color-text) 4%, transparent)`, brings the stripes back.
- Equal-width columns are opt-in: `data-table-layout="fixed"` on the wrapper sets `table-layout: fixed` and `inline-size: max(var(--table-fixed-min-inline-size), 100%)`, 40rem by default, so a narrow screen scrolls the table instead of squeezing it. Only the style guide's two token tables use it. Wiki tables mix one-word columns with one-sentence columns, and content-sized columns are the point; a markdown table could not carry the attribute anyway (see above).
- The style guide sets `--table-cell-align: middle`. Its sample cells are taller than the text beside them, and baseline alignment sank the token name and range to the sample's baseline. Wiki tables keep `baseline`.
- Not adopted: `caption-side: bottom`, since a table's title conventionally sits above it.

Every wiki table has had a `Table:` caption since 2026-09-15. Naming a region after its column headers is the fallback for a table written without one.

### The stamped rule

Between body rows the single hairline became a pair on 2026-09-19: a dark 1px line with a lighter one directly under it, which reads as pressed into the page. The order carries the illusion — dark above light implies a light source above, so the surface is cut in rather than raised.

⚠ **A collapsed border paints one colour per edge**, so the pair cannot be a border at all. It is painted as a background gradient on the cells of every row after the first:

```css
tbody tr + tr > * {
  --table-rule-layer: linear-gradient(
    to bottom,
    var(--table-rule-shadow) 0 var(--border-thickness),
    var(--table-rule-highlight) var(--border-thickness) calc(var(--border-thickness) * 2),
    transparent calc(var(--border-thickness) * 2)
  );
}
```

The stripe already occupied `background-image` on the same cells, so both are custom properties composed in one declaration, rule over stripe, each defaulting to `none` ([[Undefined custom properties]] covers what a missing one does):

```css
tbody tr > * {
  background-image: var(--table-rule-layer, none), var(--table-stripe-layer, none);
  background-repeat: no-repeat;
}
```

It is on the cells rather than the row for the reason the stripe already was: a row background is hidden by the sticky row header's opaque background.

⚠ **An engraved rule cannot be mirrored into a dark theme by swapping the colours.** Each half needs its own role — `--color-rule-shadow` and `--color-rule-highlight` — because the band colour that works as the shadow on a light page is *lighter* than a near-black one, which inverts the groove. Measured on the first attempt: both halves above the page, 1.16 and 1.61. Recolouring the shared rule instead would have taken the 2px band rules to near-black and made the table's frame invisible.

There is a floor. Against a `#141619` page, pure black is only 1.16 below it, where the light theme gets 1.33 below and 1.10 above. Dark cannot match that ratio, and pushing its highlight below 1.16 would put it within a unit of the band colour, so the two halves are balanced instead (1.16 down, 1.33 up) and the dark-over-light order carries the engraving on its own.

### An icon column

Type leads the table as one icon per activity type, with the type name beside it in a `.visually-hidden` span — that span is what a screen reader announces and what the column sorts on, so the icon can be `aria-hidden`. `data-icon` centres a head and its cells together, so the label and the icon under it share the column's centre without either knowing the other's width, and holds the column at `inline-size: 1%` so it keeps the label's own width. Without that last part the column takes a share of whatever width the table has spare once every column is served, and the shared centre — and with it the first column's inset — slides right by half the slack: 37px in from the box instead of 31px at a 1440px window, against 31px at the closing edge.

The icons carry `stroke="currentColor"` and take their colour from the row's existing `data-activity`, which keeps the SVGs theme-agnostic and the colours in CSS where the palette is.

⚠ **A design tool's SVG export is not a web asset.** Penpot fakes an inner stroke by doubling the stroke width and clipping half of it away: the geometry is repeated three times and every file carries `clipPath` ids of `a` and `b`. Inlined across 180 rows that is 180 duplicate ids in one document, and the files ran 7–30 KB each. Rebuilt as a single path at the real stroke width they are a few hundred bytes. The same trap applies to any tool that emulates a stroke alignment CSS and SVG do not have.

A type with no icon file fails the build by name. Deliberate: a silent fallback hides a new type instead of asking for its icon.

### Two surfaces that converge

⚠ **A tinted header and a hover tint drawn the same way will meet.** Both mixed a neutral into the page colour, so both moved along the same grey line, and darkening either one slid it toward the other. Measured at the point it was noticed: header `#e7e7e5`, a hovered row compositing to `#e7e8e7` — zero, one and two units apart.

Separating them means separating by something other than weight. A cream header (`#EEEAE0`) did it by hue and worked numerically. The settled answer is a cool wash instead, `color-mix(in srgb, var(--color-base-dark) 35%, var(--color-bg))`, against a neutral hover.

- Mixed `in srgb`, not oklab, because it stands in for an alpha wash and CSS composites alpha in sRGB.
- Kept as an opaque mix rather than real alpha: a sticky head cell shows the scrolled rows through a translucent background, and wiki tables use a sticky first column.
- ⚠ The dark theme needs its own percentage, not the same one. `--color-base-dark` is a light colour, so 40% of it over a near-black page is a mid-grey band; at 10% it landed on the hover again. It sits at 15%, above the hover, the head being the most-lifted surface in dark as it is the heaviest in light.

⚠ **The head text's contrast is then bounded by the gap between those two surfaces, not by either colour alone.** With the head at `#e0e1e4` the body text colour itself only reaches 5.75 on it, so contrast can only be bought by moving the subdued colour toward body text — at which point it stops being subdued. Lightening the head instead runs into the hover: five units lighter and they are a unit apart again. The settled `#576374` gives 4.67, an AA pass, with the head's smaller size carrying the secondary reading rather than the colour.

### A hover that snaps on and decays off

The row tint arrives on the frame the pointer does and fades over a second. The asymmetry needs no JavaScript and no second class: **a rule's transition plays on the way into its state**, so the resting rule times the fade-out and the `:hover` rule the fade-in.

```css
@media (prefers-reduced-motion: no-preference) {
  .table-wrapper[data-table-rows='link'] tbody th a::after {
    transition: opacity var(--table-row-hover-out) var(--table-row-hover-ease);
  }
  .table-wrapper[data-table-rows='link'] tbody :is(tr:hover a, a:focus-visible)::after {
    transition-duration: var(--table-row-hover-in);
  }
}
```

`--ease-out-quad: cubic-bezier(0.5, 1, 0.89, 1)`, a global variable since this table needed it. Ease-*out* specifically: opacity falling 1→0 drops fast and then lingers, which reads as decay; ease-in would hold at full and vanish at the end, which over a second reads as a glitch. Sampled on a real pointer, the tint is at 0.54 after 190ms and 0.12 after 570ms — front-loaded enough to keep the decay character rather than becoming a linear dissolve.

Both rules sit inside the `prefers-reduced-motion` guard, so a reduced-motion visitor gets an instant toggle rather than a one-second one — the opt-in idiom [[Choreographing CSS animations]] describes.


### The activities table

`/activities/` is the one table here not written in markdown: the partial `place-map-activities.njk` writes one row per activity, 180 of them, and four additions to `table.css` came from it. The table is also the page's map data. `<place-map>` reads the `<tr data-lat data-lon>` rows and names each dot after the row's first link ([[The place map]]), so the activity's link has to stay the first link in its row.

**Rows that link.** `data-table-rows="link"` on the wrapper stretches each row header's link over its row: `tr { position: relative }` plus an `a::after` with `inset: 0`, the pattern `custom-card[clickable]` uses. The row tints on hover and when its link has keyboard focus. The tint is that overlay's background going from `opacity: 0` to 1, so the fade is an opacity transition and a theme switch never animates a color. Three traps came with it, all met on this table:

- ⚠ A sticky first column breaks it. A sticky cell is a positioned box, so it becomes the `::after`'s containing block and the click area shrinks to that one cell. Linked rows turn the sticky column off (`position: static`).
- ⚠ In Firefox the rules between rows disappeared under the names only. The row header's opaque background, there for sticky cells, covered them: Firefox paints a positioned row's cell backgrounds above the table's collapsed borders. Linked rows drop that background.
- ⚠ In Safari the first click on a column head scrolled the page and sorted nothing. The likely cause, not yet confirmed in Safari: Safari does not focus a button on click, so focus goes to the nearest focusable ancestor, the wrapper with its `tabindex="0"`; focusing it scrolls the page, and the release lands off the button. This table's wrapper has no `tabindex`, since its head buttons and row links already let a keyboard scroll it. Markdown tables keep theirs, and whether a link inside one triggers the same jump in Safari has not been checked.

**Columns that drop.** `data-table-priority` on a column's head and cells lets the column drop out as the table narrows, through container queries on the wrapper, highest number first: Pace below 55rem, Heart rate below 50rem, Distance below 42rem, Time below 35rem. Type, Date and Activity stay at every width. Each threshold is measured rather than estimated — the table is forced to its min-content floor with each column set hidden, and the breakpoint sits just above the width at which the remaining columns stop fitting. ⚠ **Record the method, not the numbers.** They moved twice in one session as the head changed: seven columns needed 65.5rem with the unit lines and a 1em head, 62.6rem once the units came out, and 54.2rem once the head dropped to `--size-step-min-1`. Long Swedish compound names set the floor. At the text size no four columns fit a phone, so a phone shows the date and the name. Dropping columns suits only rows that link, because every hidden number is one tap away on the activity's own page. Row headers hyphenate (`hyphens: auto`; Swedish titles carry `lang="sv"`), and a date in a `<time>` stays on one line: wrapped onto three lines in a narrow column it tripled the row's height.

**Units in the head, until 2026-09-19.** A unit or qualifier sat on its own line under the column head, in a `<small>`: `km`, `min/km`, `avg/max`. They came out to match the design, which carries none. ⚠ Four numeric columns now state no unit anywhere on the page — `3.5`, `7:05` and `142/165` are bare, and what they measure lives only on each activity's own page. The `<small>` support stays in the stylesheet for any table that wants it. Number columns are still end-aligned through `data-numeric` on the head and its cells, and column heads still do not wrap: a two-word head plus its unit made a ragged three-line band. A tooltip was never the alternative — it would not show on a phone and must never be the only place something is said ([[Tooltips]]).

**Sorting.** `<sortable-table>` (`webc/sortable-table.webc`, an [[is-land]] island inside the map's own) turns each column head into a button, after Adrian Roselli's [Sortable Table Columns](https://adrianroselli.com/2021/04/sortable-table-columns.html) (2021, updated 2024): the button sits inside the `<th>`, `aria-sort` goes on the sorted head only, and the caption gains a visually hidden "column headings with buttons are sortable". A cell's `data-sort` holds its raw value (seconds, km, a timestamp, or text where the cell shows something else — an icon); cells without one sort by their text. ⚠ **A non-numeric `data-sort` used to become `NaN`.** `keyOf` ran every one of them through `Number()`, and a NaN comparator returns NaN for every pair, so the rows kept their order while the arrow moved to the head — a sort that looks like it ran and did nothing. Found when the Type column started sorting on a type name; it now falls back to text when `Number()` cannot read the value, covered by a regression test. Numbers start biggest first and text A→Z, and a head's `data-sort-first="ascending"` overrides that for pace, so the fastest comes first. Empty cells go last in both directions, and ties keep the server's order. Without JavaScript the heads stay plain text and the table stays newest first, which is the order the server marks with `aria-sort`.

The sorted column shows a CSS-drawn chevron, as in the breadcrumb, placed absolutely after the label so nothing moves when it appears. It is set on the measured middle of the x-height, `--sort-arrow-middle: 0.8em` below the line's top; the drawn V of a rotated square sits 0.354 of its side off the square's centre, which is where the 0.854 and 0.146 in the offsets come from. ⚠ **A chevron on the cap-height middle reads high.** The value was 0.75em, measured against small caps, and after those came off it sat within 0.3px of the cap middle — centred by the numbers, and visibly high beside a word with descenders, which "Type" is. Cap middle is 0.712em and the x-height's is 0.797em. Two parts of Roselli's pattern were not taken: he draws filled triangles rather than a chevron, and adds an optional live region announcing the new order.

Raw source: `src/_raw/Styling Tables the Modern CSS Way.md` (Michelle Barker, Piccalilli, 2024-07-18); the activities table, `src/_raw/dev-notes/How the activities table works.md` and `src/_raw/dev-notes/How the activities table matched the Penpot design.md`. Also: Adrian Roselli, [Under-Engineered Responsive Tables](https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html) (2020) and [Fixed Table Headers](https://adrianroselli.com/2020/01/fixed-table-headers.html) (2020).
