---
description: "Styling data tables with modern CSS: markup that reads correctly unstyled, the browser defaults worth overriding, alignment and sticky headers, and the scroll container a wide table needs, which is inaccessible unless it is focusable and named."
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

The wrapper carries `.popout`, not the table, because the breakout classes only work on a direct grid child ([[Layout breakouts]]) and the wrapper is the element between the table and the grid. Post, note and wiki bodies sit in `.wrapper-pass`, so a table there lines up exactly with the code blocks, which break out the same way: both measured 913px wide from the same edge at a 1024px viewport. In a body without the pass-through the class does nothing and the table stays at content width. The style guide's Spacing section was one until 2026-09-15, which left its table 32px narrower on each side than the Sizes table above it; the section now carries `.wrapper-pass`.

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

- Stripes instead of rules between rows, and no column rules. The header row is tinted with `--color-bg-accent`, and the header and footer get a doubled rule. The wrapper carries the border and the rounded corners, which a collapsed table cannot have.
- ⚠ The rules use `--color-bg-accent-2`, not `--stroke`. `--stroke` is drawn in `--color-bg-accent`, which is white in the light theme and disappears against the off-white page; the old stacked file used it, so its row rules were invisible in light mode.
- The scroll shadows and covers are mixed from `--color-bg` and `--color-text` rather than the article's white, so they follow the theme.
- The caption and first-column text line up with the prose beside the table, not with the box. A spacing token cannot do this: the popout track is 0 on narrow screens, grows to its `2rem` maximum over a band of window widths, and stays there, while every token scales with the viewport. The wrapper is a container instead, and since it is the content column plus two popout tracks, half the difference is one track:

```css
.table-wrapper :is(caption, tr > :first-child) {
  padding-inline-start: max(var(--space-s), (100cqi - var(--wrapper-width, 85rem)) / 2);
}
```

Measured: text and prose start at the same pixel at 1440px and 1200px; at 1024px and below the track is 0 and the cell keeps its ordinary padding. ⚠ The formula assumes the wrapper spans `popout` in a `.wrapper` sized by `--wrapper-width`; in any other context it can indent the first column by mistake.
- The wrapper's focus ring is the site's global `:focus-visible` ring; nothing here is table-specific.
- Row headers stick when a table has a `<th>` in its body, detected with `table:has(tbody th)`. With no column rules, Barker's `::after` repair is not needed.
- ⚠ Below the `sm` breakpoint `prose.css` sets `word-break: break-word` and `hyphens: auto` on everything in a post body, for long URLs. In a table that lowers every column's minimum width, so columns shrank to single characters ("P / e / rf", "0. / 00 / 4") instead of the table scrolling. The wrapper resets both. Measured at 375px on [[Layout shift]]: before the reset none of its 13 tables scrolled and the scores broke mid-number; after it, 7 scroll and the page itself still does not.
- The stripe is a translucent image on the cells of every even body row, `linear-gradient(var(--table-stripe) 0 0)`, with `--table-stripe` at 4% of `--color-text`. A background on the row would be hidden by the sticky row header's opaque background, since cells paint above rows; on the cells, the row header keeps its opaque color under the tint and the scroll shadows still show through the other cells. Measured text contrast on a striped row: 6.58:1 in the light theme (6.97:1 unstriped) and 10.25:1 in the dark theme (11.03:1).
- Every value that sets the look is a custom property at the top of `.table-wrapper`: the colors, the rules, the paddings, the cell alignment, the caption's size and style. The cells inherit them, and every table on the site sits in a wrapper. `--table-row-rule` is `none`; setting it to `var(--table-rule)` brings the rules between rows back alongside the stripes.
- Equal-width columns are opt-in: `data-table-layout="fixed"` on the wrapper sets `table-layout: fixed` and `inline-size: max(var(--table-fixed-min-inline-size), 100%)`, 40rem by default, so a narrow screen scrolls the table instead of squeezing it. Only the style guide's two token tables use it. Wiki tables mix one-word columns with one-sentence columns, and content-sized columns are the point; a markdown table could not carry the attribute anyway (see above).
- The style guide sets `--table-cell-align: middle`. Its sample cells are taller than the text beside them, and baseline alignment sank the token name and range to the sample's baseline. Wiki tables keep `baseline`.
- Not adopted: `caption-side: bottom`, since a table's title conventionally sits above it.

Every wiki table has had a `Table:` caption since 2026-09-15. Naming a region after its column headers is the fallback for a table written without one.

Raw source: `src/_raw/Styling Tables the Modern CSS Way.md` (Michelle Barker, Piccalilli, 2024-07-18). Also: Adrian Roselli, [Under-Engineered Responsive Tables](https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html) (2020) and [Fixed Table Headers](https://adrianroselli.com/2020/01/fixed-table-headers.html) (2020).
