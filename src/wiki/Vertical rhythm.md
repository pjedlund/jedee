---
description: "Spacing a page in fractions of its body text's line-height, how far CSS can hold headings, lists, figures, tables and small text to that beat, its musical side, Ariel Salminen's Scale.css, and a quarter-line system for jedee tried on the style guide."
date: 2026-09-30
---

**Vertical rhythm** is spacing a page in measured intervals of one unit, the line-height of its body text, so that the text resumes on the same beat after every interruption: a heading, a list, a figure, a table. Bringhurst puts it as a musical analogy: "Space in typography is like time in music. It is infinitely divisible, but a few proportional intervals can be much more useful than a limitless choice of arbitrary quantities." His rule for it is to [add and delete vertical space in measured intervals](http://webtypography.net/2.2.2).

There are two schools, and the difference is how much each one holds to the unit:

- **A baseline grid** puts every line of every element on a fixed lattice, as in print. Richard Rutter carried it to CSS in [Compose to a vertical rhythm](https://24ways.org/2006/compose-to-a-vertical-rhythm/) (24 ways, 2006): line-height is the unit, smaller text gets a line-height that fits the unit, and borders are paid for out of padding. Vincent Bernat's [CSS & vertical rhythm for text, images, and tables](https://vincent.bernat.ch/en/blog/2026-css-vertical-rhythm) (2026) does it with the `rlh` unit, JavaScript padding for images, and [incremental leading](https://markboulton.co.uk/journal/incremental-leading/) for tables. With all three in place his text returns after each intrusion "precisely on beat and in phase", and he ends: "None of this is necessary. But once you start looking, you can't unsee it." Ariel Salminen's Scale.css (2012) belongs here too, with its proportions taken from music (see its section below).
- **A spacing system** keeps every gap on one scale and in one direction, without promising that lines land on a grid. Harry Roberts' [single-direction margin declarations](https://csswizardry.com/2012/06/single-direction-margin-declarations/) (2012) is the classic statement: "This isn't just about something as pretentious as vertical rhythm, this is about spacing in general." The flow utility that jedee uses is this school (see [[Microformats]], where its one rule is quoted).

## The unit

The unit is one line of body text: its line-height as a length. At jedee's body size and its site-wide leading of 1.45 that is 28.16px on a phone and 40.56px at 1360px and wider, because the body size is fluid, 19px to 28px ([[Design token sync]]). The rhythm's own leading is fluid too (below), so in rhythm pages it is 27px and 42px.

CSS has two units for it, both [Baseline widely available](https://web-platform-dx.github.io/web-features/) since May 2026 (Chrome 109/111, Firefox 120, Safari 16.4):

- `lh` is the line-height of the element it is used on.
- `rlh` is the line-height of the root element, `<html>`.

Each has a trap on a site built like this one:

- ⚠ **`lh` resolves on every element separately.** `--flow-space: 1lh` gives a paragraph one of its own lines and a blockquote, set larger, one of *its* lines. jedee tried exactly that on 2026-09-21 and a blockquote got 61px above it against 31px for a paragraph ([[Typographic conventions]]).
- ⚠ **`rlh` is only the body line if the body type is set on the root.** Bernat sets `html { font-size: 112.5%; line-height: 1.5 }`. jedee sets its type on `body` and leaves the root at the browser's 16px, which every `rem`-based token assumes. `1rlh` here is the `normal` line-height of the browser's default serif, 18px in Chromium: not a body line, and not even the site's font.

A **registered custom property** gives the unit without either trap. A property registered as a `<length>` computes to pixels on the element that sets it, and descendants inherit the pixels, not the expression. The wiki's caption measure is built the same way ([[Figures]]).

```css
@property --line {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

.prose { --line: 1lh; }  /* 28.16px, inherited as 28.16px by a blockquote too */
```

⚠ **The initial value must not depend on anything.** `initial-value: 1.5rem` is refused because a `rem` depends on the root's font size, and a refused `@property` rule is dropped whole, silently. `--line` then stays an ordinary custom property holding the text `1lh`, and every element resolves it again: the first trap, back in place. Found while building the prototype below; `0px` works.

⚠ **A fractional line drifts.** Layout stores lengths in 1/64px steps, so a 28.16px line box is stored as 28.156px and a three-quarter line as 21.109px. Each block comes out a few hundredths of a pixel off the lattice, and it adds up: about 0.6px by the end of the style guide sample. Rounding the unit to a whole pixel and setting it as the line-height too makes every quarter line a multiple of 0.25px, which layout stores exactly:

```css
.prose {
  --line: round(clamp(1.4em, 1.3635rem + 1.4951vw, 1.5em), 1px);  /* 27px, 42px */
  line-height: var(--line);
}
```

It is computed from the font size rather than from `1lh`, which on this element would read the line-height it is setting. Rounding moves the leading by up to half a pixel.

**Leading by measure.** Longer lines need looser leading, as Salminen's 2013 post and Scale.css's widest step argue (below). jedee's prose lines run from about 40 characters on a phone to the 54ch measure on a wide screen, so the line is fluid: 1.4 of the body size at 320px, 1.5 at 1350px, the two ends of the Utopia type scale. The middle term of the `clamp()` is a straight line between 1.4 × 19px and 1.5 × 28px, the body size at those two widths; the `em` bounds hold the ratio between 1.4 and 1.5 whatever happens in between. ⚠ The middle term is tuned to `--size-step-0`'s two ends and has to be worked out again if they change. A fluid number (`1.4 + 0.1 × progress`) would need a length divided by a length, which not every browser does yet. Every step of the lattice is a fraction of the line, so the whole rhythm opens up with it.

## Strict grid or soft rhythm

Holding every element to a baseline grid costs something at each kind of interruption:

- **Images** have a height the CSS does not know. Bernat measures each one with a `ResizeObserver` and pads it to the next line. [CSS Rhythmic Sizing](https://www.w3.org/TR/css-rhythm-1/) would do it natively with `block-step-size`, but it is still a Working Draft (2026-02-17) with no implementation.
- **Tables** at one line a row feel cramped and at two lines waste space, Bernat found; his rows align one in five, with `:has()` rules that pad the table by how many rows it has.
- **Small text** needs a leading chosen for the grid rather than for the text.
- **Borders** add their width to the height: a 1px frame pushes everything after it off by 2px.

`text-box-trim` does not help with any of this. It trims the space above the capitals and below the baseline off a text box ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-box-trim); in every engine since Firefox 154, 2026-08-18), which is how a button's label is centered (jedee's `global/blocks/button.css` uses it). A rhythm counts whole line boxes, and trimming cuts the first and last of them short.

In a single column of prose nobody compares baselines: there is no second column to compare them with. What the eye sees is proportion, whether a gap after a heading is always the same fraction of a line and whether a caption's leading sits right against the text's. Alignment only becomes visible where columns stand side by side.

**Recommendation: a soft rhythm on a quarter-line lattice.** Every gap and every line box that is not body text is a whole number of quarter lines. That is strict wherever CSS makes it free: spacing, headings, small text, rules, tables, code. It lets an image of unknown height sit off the lattice by its remainder; everything after it keeps the same beat from a shifted start. Snapping images is possible without JavaScript, from the ratio the image's own attributes give (below), so it is an option, not a requirement.

## Element by element

Measured in the mockup below at 375px and 1360px, on the same prose sample under the site's CSS and under the prototype.

Table: What each element takes now and in the quarter-line prototype (375px / 1360px)
| element | now | prototype | how |
| --- | --- | --- | --- |
| gap between paragraphs | 14.9 / 31.0 px | 20.25 / 31.5 px (¾ line) | `--flow-space` |
| space above an `h3` | 41.8 / 65.9 px | 40.5 / 63 px (1½ lines) | `--flow-space` on the heading |
| space under a heading | 14.9–19.7 / 31.0 px | 13.5 / 21 px (½ line) | `:is(h1, h2, h3, h4) + *` |
| heading line | 1.2 × its size | nearest quarter line to 1.2 × its size | `round()` |
| caption, meta, code, footnote line | 23.6 / 31.9 px (1.45) | 20.25 / 31.5 px (¾ line) | `line-height` |
| list items | `--space-s` apart | ¼ line apart | `padding-block-start` |
| table body row | 48.6–49.6 / 68.5–69.5 px | 40.5 / 63 px (1½ lines) | cell padding ¼ line |
| space above and below a rule | 15 and 30 / 32 and 62 px | 35 and 35 / 51 and 51 px | a one-line `hr`, rule painted in its middle |
| blocks on the lattice | 4 / 2 of 20 | 20 / 20 of 20 | |

### Headings

More space above than below, so a heading binds to the text it opens: two lines above an `h2`, one and a half above an `h3`, one above an `h4`, half a line under all of them. A heading's line box is rounded to the nearest quarter line, so a heading of any size and any number of lines keeps the lattice:

```css
h2 { line-height: round(nearest, 1.2em, var(--line-quarter)); }
```

At 375px an `h2` of 41.4px gets 47.25px lines (1.14) and an `h3` of 27.9px gets 33.75px (1.21); at 1360px, 84px (1.24) and 52.5px (1.20). `round()` has been Baseline since 2024.

⚠ The result is a length, and a length line-height inherits as a length, not as a ratio. Anything inside the heading at another size, such as inline `code`, sits in the heading's line box. That is what a heading wants.

### Lists

Items a quarter line apart. jedee gives a list, a code block and a rule more space below than above on purpose ([[Typographic conventions]]); the prototype keeps that as an explicit half line under a list or code block instead of the browser's `1em`, which is neither on the lattice nor the same at every size.

### Small text

Captions, the meta line, table heads and captions, code blocks and footnotes are set a step smaller (16px on a phone, 22px wide). A three-quarter line fits them: 20.25px on a phone (1.25, the tight end of what text takes) and 31.5px wide (1.43). Four of their lines take exactly three body lines, so where small text stands beside body text the two meet every third body line. That is Mark Boulton's incremental leading, at a ratio of 4:3.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/vertical-rhythm-lattice.png" alt="Three columns side by side over faint horizontal rules at every body line, with a stronger rule every three body lines. Each column has orange ticks at the top of each of its lines. Left, body text, ticked every line. Middle, an italic caption in smaller type, ticked every three-quarter line: its fifth tick meets the body text's fourth on the strong rule. Right, four table rows, ticked every one and a half lines: the third tick lands on the same strong rule." width="2116" height="760">
  <figcaption>Body text, caption and table rows under the prototype. Each column is ticked at the top of every one of its own lines, and all three meet on the strong rule, three body lines down.</figcaption>
</figure>

### Figures and images

A figure gets a line above it and a line and a half after its caption; the caption is a quarter line under the image. The image itself is where the lattice gives way: its height is its width times its ratio, and nothing makes that a multiple of anything.

Given the ratio, CSS can pad it out. A percentage margin is measured against the width of the box the image fills, its `<picture>` or else the figure, so `100%` times the ratio is the image's rendered height, and the padding is the difference between that and the next quarter line:

```css
:is(figure, picture) img {
  --img-block-size: calc(100% * var(--img-ratio, attr(height type(<number>)) / attr(width type(<number>))));
  margin-block-end: calc(round(up, var(--img-block-size), var(--line-quarter)) - var(--img-block-size));
}
```

The ratio is read from the image's own `width` and `height` attributes with typed `attr()`, which eleventy-img always writes, so no figure needs a hand-set ratio. Typed `attr()` is in Chrome and Edge 133 and Firefox 155, not yet in Safari. There the margin is invalid, falls back to 0, and the figure sits off the lattice by its remainder: the soft default. The pad is at most a quarter line, 4.7px under the sample's photo on a phone. `--img-ratio` on a figure still overrides, for an embed with a fixed ratio such as a 16:9 video. The first version measured the figure as a size container (`100cqi`), which went wrong as soon as a wiki caption sat beside a narrower image on a phone; the percentage follows the image wherever it sits. A `<picture>` outside a figure is padded the same way; a bare `<img>` in a paragraph is not.

⚠ The caption's quarter line under the image is padding, not margin. eleventy-img wraps the image in a block `<picture>`, and a margin on the caption would collapse with the pad under the picture: the larger of the two wins and the pad disappears. A bare `<img>` is inline and hides this, which is how the mockup missed it and the built style guide caught it.

⚠ It holds only while the image is as wide as the figure. An image narrower than its container, at its own intrinsic width, would need `min()` against that width.

⚠ The prose's 1px hairline around images is a border, and it adds 2px to the height. The prototype draws it as an outline with a negative offset, on the image's own edge.

### Tables

A body row is one line and two quarter-line paddings, one and a half lines. That is tighter than now (40.5px against 48.6px on a phone) and looser than Bernat's rows. The head and the caption are small text, a three-quarter line with the same padding, so a table of any length ends on the lattice without counting its rows. jedee already paints its row rules into the cells instead of bordering them, for their two-tone look ([[Tables]]), so they cost no height; the prototype paints the thicker band rules around the head and the last row the same way.

### Blockquotes, code and rules

- **Blockquote.** Its larger lines keep the standard leading, 1.45 × its size rounded to the nearest quarter line (40.5px on a phone, 63px wide). Its padding is three-quarters of a line, and the source line under the quote goes back to one body line.
- **Code block.** Small text at a three-quarter line, padded by the same. Its 1px frame is an inset box-shadow instead of a border.
- **Rule.** An `hr` is a box one line tall with the hairline painted across its middle. The space on both sides is then the same, 33.75px on a phone, where now it is 15px above and 30px below.

### Meta lines, disclosures and footnotes

- **Meta line.** The date and revision line under a title is small text on a three-quarter line, half a line under the title, with a quarter line between rows if it wraps.
- **Media metadata.** The capture details under a photograph (`local/media-meta.css`) keep their rule, painted, a half line of padding under it, and a quarter line between rows.
- **Disclosure.** A `<details>` puts half a line between its summary and what it opens.
- **Footnotes.** Small text again, a quarter line apart.

## Pitch and time

A musical scale says which pitches a piece may use; its rhythm says when they fall. Type has the same two layers: a type scale sets the sizes, and a vertical rhythm sets the space around them. Bringhurst's rule for the first ([3.1.1](http://webtypography.net/3.1.1)) could be a composer's: "Use the old familiar scale, or use new scales of your own devising, but limit yourself, at first, to a modest set of distinct and related intervals."

**Pitch.** Type scales step by the same ratios that tune musical intervals:

- jedee's scale (Utopia, inherited from Eleventy Excellent) steps by 1.2 on a phone and by 1.25 on a wide screen: a minor third (6:5) opening out to a major third (5:4).
- Every Layout's ratio of 1.5 is a perfect fifth (3:2).
- Ariel Salminen's Scale.css (below) takes its sizes from the Pythagorean chromatic scale, where every interval is built from stacked fifths.

**Time.** jedee has had the pitch layer from the start. What it lacks is the time layer: a beat. In the prototype the body line is the beat and the quarter line is its subdivision, and every other element is a note value or a rest counted in it.

Table: The prototype's intervals read as rhythm
| element | lines | as rhythm |
| --- | --- | --- |
| body text | 1 | the beat |
| quarter line | ¼ | the subdivision everything is counted in |
| gap between paragraphs | ¾ | a short rest |
| space under a heading | ½ | a breath that ties the heading to its phrase |
| space above an `h2` | 2 | a longer rest before a new section |
| caption, meta, code or footnote line | ¾ | four against three: four lines in three beats |
| table row | 1½ | three against two, a hemiola: two rows in three beats |
| image of any height | any | a fermata: held as long as it needs, then the beat resumes |

A strict baseline grid is playing to a click track: every note on the grid, nothing held longer than the grid allows. A soft rhythm is closer to a band keeping time together: every interval is measured, and a held note may run long without the band losing the beat. The figure under Small text shows the two cross-rhythms meeting every three beats.

The words are an analogy, not a proof. A scale and a beat say what is in tune and in time; whether a page reads well is still decided by eye, the way a player decides by ear.

## CUBE CSS, Every Layout and Eleventy Excellent

None of the three sets out to hold a vertical rhythm, and none has a unit for it.

Table: How the three sources space a page vertically
| | spacing unit | tied to the line-height | non-text elements | rhythm |
| --- | --- | --- | --- | --- |
| CUBE CSS | the flow utility's `1em`: the font size of each element it spaces | no | left to each block | consistent, not measured |
| Every Layout | a modular scale whose ratio is the line-height | from `--s1` to `--s3` | left to each layout | closest in intent |
| Eleventy Excellent | Utopia's fluid space scale | no | stock styles at the body's leading | none |

- **CUBE CSS.** Andy Bell's [flow utility](https://piccalil.li/quick-tip/flow-utility/) spaces siblings by `--flow-space`, `1em` by default: the font size of the element being spaced, so a larger element gets more room. Its rhythm is consistency: one rule, one direction, one custom property to override. The fluid [Utopia](https://utopia.fyi/) scales that CUBE projects use derive space from the font size at each end of the viewport range; line-height is not one of their inputs.
- **Every Layout.** Its [modular scale](https://every-layout.dev/rudiments/modular-scale/) takes the line-height as the basis for white space: with a ratio of 1.5 and a line-height of 1.5, `--s1` is exactly one line and `--s2` one and a half. The scale is geometric, though: `--s3` is 2.25 lines, `--s4` 3.375, and the steps below `--s1` are ⅔, 4/9 and 8/27 of `--s1`, so only three steps sit on a quarter-line lattice. The [Stack](https://every-layout.dev/layouts/stack/) is the flow utility under another name.
- **Eleventy Excellent.** It has no rhythm unit. Its Utopia tokens run in pixels between two viewport widths, body text is at leading 1.4, and the paragraph gap `--space-m-l` is about half a line on a phone and four-fifths of one on a desktop. Heading space is `1.5em` of the heading's own size, and smaller text keeps the body's leading ratio, so its line boxes are not fractions of a body line. Table cells are padded by `--space-s` with 1px borders between rows. jedee inherited all of it and has since changed the leading to 1.45 and the table rules ([[What jedee kept from Eleventy Excellent]]).

The `every-layout` skill used to write this site's compositions maps `--s1` to `--space-m`, 14–21px, which is about half a body line. Whatever Every Layout's scale has of a rhythm is lost in that translation. If the prototype below is adopted, the `cube-css` and `every-layout` skills should both name the line tokens.

## Ariel Salminen's Scale.css

Ariel Salminen's [On Typography](https://arielsalminen.com/2012/on-typography/) (2012) set out to make "a typographic scale out of a musical scale that would not only be very readable, but also aesthetically pleasing". It grew out of a [24 ways article on music, harmony and proportion](http://24ways.org/2011/composing-the-new-canon) (2011), and it credits [Iain Lamb](http://lamb.cc/typograph/) and [Alex Charchar](http://retinart.net/typography/typographicscale/). Salminen chose the Pythagorean chromatic scale and found that every combination tried came out "very similar to the centuries old Typographic Scale". Then came the space: "I added a 1.5em baseline grid into the mix and with the help of that calculated optimal white space needed for the headings, paragraphs and other elements." That is both layers, pitch and time.

The result is [Scale.css](https://github.com/arielsalminen/Scale), set entirely in ems so that its breakpoints change little more than the body's font size: 12px, then 14, 16 and 18px. Its README tabulates the Pythagorean ratios the CSS draws on. In `css/scale.css`:

- **The unit is the line**, `line-height: 1.5em` on the body. Paragraphs, lists, definition lists, blockquotes and images all end with `margin-bottom: 1.5em`, exactly one line under every block.
- **Headings are tuned so their line boxes land on the line.** From 250px up an `h2` is set at 81/64 of the body with a line-height of 16/9, and 81/64 × 16/9 = 9/4: a 2.25em line box, one and a half lines. An `h3` (3/2 at a line-height of 1.5) comes to the same. The `h1` grows from 1½ lines to 2¼ and then 3. The heading margins are in the heading's own ems and do not land on the line.
- **Code gets more room**: a code block ends with `3em` of its smaller type, about 1.9 lines.
- **Lists** are indented by one line (`1.5em`) on the narrowest screens and hang in the margin from 479px, with `list-style-type: circle`. A blockquote is indented by 1.80203em, the A♯ of the ratio table.
- **At the widest step, 1599px and up, the grid gives way.** The leading opens to `1.75em` while the gaps stay at `1.5em`, so long lines read looser instead of staying on the grid. A background grid image (`grid.gif`) is still in the file, commented out.

Table: Scale.css, jedee now, and the prototype
| | Scale.css (2012) | jedee now | prototype |
| --- | --- | --- | --- |
| unit | the line, 1.5em | none: Utopia space tokens | a quarter of the body line |
| gap between paragraphs | 1 line | 0.53–0.76 line | ¾ line |
| list indent | 1 line, hanging from 479px | 1 line (`1lh`) | as now |
| unordered list marker | hollow circle | hollow ring (◦) | as now |
| space under code | about 1.9 lines | the gap + 1em of code | the gap + ½ line |
| heading line | ratios that multiply out to 1½, 2¼ or 3 lines | 1.2 × its size | the nearest quarter line |
| sizes | Pythagorean ratios, in ems | Utopia, fluid | as now |
| leading | 1.5, 1.75 from 1599px | 1.45 | 1.4 to 1.5 with the width (a whole-pixel line) |
| responsive by | the body's font size per breakpoint | `clamp()` tokens | as now |

jedee already shares three of its choices: the one-line list indent, the hollow ring, and more space under code than above it. The prototype is closest to Scale.css in method: one unit for all the space, with the heading line boxes brought onto it, by ratios there and by `round()` here. It differs in the gap, which it keeps below a full line, and in counting in quarters, so that small text and table rows can run their own cross-rhythms. Scale.css's own widest step makes the case for a soft rhythm: faced with long lines, it chose the leading over the grid.

**Later writing.** No newer piece on vertical rhythm turned up. The article points to a follow-up, "Scaling with EM units", which could not be found. [Prototyping Responsive Typography](https://arielsalminen.com/2013/prototyping-responsive-typography/) (2013) adds that leading should tighten on a narrow measure and loosen on a wide one, with media queries or Mat Marquis's Molten Leading plugin. [Typography for User Interfaces](https://arielsalminen.com/2016/typography-for-user-interfaces/) (2016) is about typefaces, x-height and system fonts. After that the practice shows in design-system tokens rather than articles, and there the space comes from the type scale on a pixel grid, not from the line:

- [Vue Design System](https://github.com/arielsalminen/vue-design-system) (2018): space in steps of 4, 8, 16, 24, 48, 64 and 128px, line-heights of 1.6, 1.3 and 1, sizes from 11 to 64px.
- Duet, the design system Salminen led from 2019 to 2021 ([`@duetds/tokens`](https://www.npmjs.com/package/@duetds/tokens) 2.2.2, June 2021): space from 2 to 72px, six of its steps the same numbers as font sizes (12, 16, 20, 36, 48 and 72px), line-heights of 1.5, 1.25 and 1.1. The body line, 16 × 1.5 = 24px, is not one of the space steps. Its documentation says the space scale is based on the type scale.

That is the Utopia approach, the one jedee inherited: space from the sizes, not from the line.

arielsalminen.com could not be opened from the session. The 2012 article is quoted from Johan's clip, the later posts are summarized from search results, and the tokens were read from GitHub and npm.

## In jedee

### Before

Until 2026-10-01 everything vertical came from one rule, `.flow > * + *` in `global/compositions/flow.css`, fed by Eleventy Excellent's Utopia tokens and the element rules in `global/blocks/prose.css`. Nothing was measured in lines.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/vertical-rhythm-drift-top.png" alt="Two copies of the same prose sample, 375 pixels wide, side by side over blue rules at every body line and fainter ones at every quarter line. A label beside each block gives its distance in pixels from the nearest quarter line. Left, the site's current CSS: the heading 0, meta line +1.3, the two paragraphs −2.5 and −1.6, the h3 −2.1, the list +1.8, the paragraph after it 0, the figure +1.0, the paragraph after the figure −1.5; two of nine blocks on the lattice. Right, the prototype: every label reads 0, nine of nine." width="2152" height="2302">
  <figcaption>The first half of the sample on a phone. Each label is how far that block's top edge is from the nearest quarter line; half a pixel or less counts as on it.</figcaption>
</figure>

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/vertical-rhythm-drift-end.png" alt="The second half of the same comparison. Left, the current CSS: table −0.7, blockquote −2.7, code block −3.1, paragraph −0.6, rule 0, numbered list +2.8, disclosure −1.9, photo metadata −1.1, paragraph 0, footnote rule +0.9, footnotes −3.4; four of twenty blocks on the lattice over the whole page. Right, the prototype: every label 0, twenty of twenty. The prototype's table rows, code block and rule are visibly more even." width="2152" height="2534">
  <figcaption>The second half, from the table on. The lattice is still counted from the page's first block.</figcaption>
</figure>

Four of the sample's twenty blocks start on a quarter line at 375px, and two at 1360px, where the misses reach 4.3px. A quarter line is 7–10px, so no block can be more than 3.5–5px off, and a miss this size is not visible on its own. What is visible is the spread: the gap between paragraphs, the space around a rule, the height of a table row each follow their own token.

Both figures are `src/wiki/_sources/vertical-rhythm.html`, frozen since the old CSS left the site: re-shot now, both halves would be the same page. It fetches the style guide's sample (`src/_includes/partials/rhythm-sample.njk`), renders it in 375px iframes, once plain and once under the prototype, with the built `global.css` and the same local stylesheets on both, and measures every block's top from the page's first. `?w=1360` measures the widest step instead. Those runs are where the numbers on this page come from.

### The system

Prose is the system: `src/assets/css/global/blocks/prose-rhythm.css` holds every rule above, scoped to `.prose`, beside `prose.css`, whose old spacing rules it replaced. Every page that sets `.prose` runs on it, which is every post type, wiki page, plain page, listing page and the webmentions box. It was built as a scoped prototype (`[data-rhythm]`, a page-level stylesheet, a dev-only `?rhythm=off` switch with scroll-synced tabs for comparing) and folded in on 2026-10-01 once it covered everything. The unit and its steps:

```css
.prose {
  --line: round(clamp(1.4em, 1.3635rem + 1.4951vw, 1.5em), 1px);
  line-height: var(--line);

  --line-quarter: calc(var(--line) / 4);
  --line-half: calc(var(--line) / 2);
  --line-3q: calc(var(--line) * 0.75);
  --line-1h: calc(var(--line) * 1.5);
  --line-2: calc(var(--line) * 2);

  --rhythm-gap: var(--line-3q);
  --rhythm-after-heading: var(--line-half);
  --rhythm-small-leading: var(--line-3q);
  --flow-space: var(--rhythm-gap);
}
```

It changes no token, and `flow.css` is untouched: it works through `--flow-space`, the published property of the flow composition ([[Configuring a layout composition]]).

⚠ **Global CSS is in cascade layers; page-level stylesheets are not, so they win whatever their selector.** A component whose own stylesheet sets the same property as the rhythm keeps its own value, so each such component takes the line steps in its own file, with the old value as the fallback outside prose: `table.css` (cell and caption padding, band rules painted into the cells), `media-meta.css`, `activity.css`, `event-status.css`, `post.css` (the subtitle and the 16:9 featured image), and the two video-link components. The `--line` registration still works from inside a layer.

⚠ **A length line-height inherits as a length.** Anything inside prose that sets its own font size without a line-height gets the body's line: the wiki's eyebrow and the entry footer's `text-step-min-*` lines came out at 1.9. They are on the small-text list now; a new small element inside an article needs the same.

⚠ **Inline code stretches its line.** `code`, `kbd`, `samp`, `sup` and `sub` are another font or size, and on a length line-height their inline boxes push the line box a fraction of a pixel taller. The wiki's own page was 17 of 91 blocks on the lattice until they were given `line-height: 0`; then 91 of 91.

⚠ **A code block inside a list item** keeps the browser's 1em above it, since a list item is not a flow container. It gets the paragraph gap instead. The wiki log's compact headings had their own leading, padding and border, and are on quarter lines in `wiki.css` now.

⚠ **Components bring their own spacing.** The other post types surfaced the rest, each now on quarter lines: pills (the post-type pill in the meta line, tags, genre chips, download buttons) snapped to the nearest quarter line, with wrapped rows a quarter line apart and a pill in a list item made a flex item, since its text line added 2px under it; the rating's 16px row of stars given a small-text line; lists of pills stripped of a utility's or the browser's own margin; the footnote list's 1em bottom margin; the activity stats, the event status badge and the subtitle under a title; the external-link arrow, once a 1em inline-block that stretched small-text lines by 0.75px, now an inline box on the prose's own line-height, which can't. Video embeds are 16:9, so their pad goes into the gap above the credit line; Chrome's 54px audio player is set to the nearest quarter line; a featured image is cropped to 16:9 whatever the file's own ratio, so it is padded as 16:9.

Measured on 2026-10-01 after the fold, at 375px and 1360px with a headless sweep of 147 pages (every wiki page and article, two to four posts of each other type, every plain and listing page, and posts with webmentions): 291 of 294 clean. Every block lands on the lattice or follows an image, map or embed; the favicons page's icon grid shifts the text after it, and the style guide's smallest labels are loose at the widest step, since no quarter-line leading suits that size at both ends.

The paragraph gap is three-quarters of a line, chosen over half a line on 2026-10-01: half a line kept the phone at today's 14px but made the space under a heading the same as the gap between paragraphs, so headings stopped sitting closer to their own text.

⚠ The heading rules come last in the file. A heading's space above then wins over the space set by the element before it (a figure's line and a half, say), and the half line under a heading wins over the next element's own.

### On the style guide

`/styleguide/` has a **Vertical rhythm** section with the prose sample (`partials/rhythm-sample.njk`) and a checkbox that paints the lattice behind it (a checkbox and `:has()`, no script).

### Not done

- **Page-level space.** Region padding, the header and the footer stay on the Utopia tokens. They frame the text rather than interrupt it.

Source: research session 2026-09-30. jedee's CSS was audited in the repository, and Eleventy Excellent's read from [its repository](https://github.com/madrilene/eleventy-excellent). Bernat's article and Roberts' post were read from their sources on GitHub, and the browser support dates are from the web-features data. The Every Layout and Piccalilli pages could not be fetched from the session; they are paraphrased, not quoted.

Raw source: `src/_raw/On Typography.md` (Ariel Salminen, 2012, clipped 2026-09-30).
