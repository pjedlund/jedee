---
description: "How many characters a line of body text should hold, and why a max-width in ch does not set that number directly."
date: 2026-09-10
updated: 2026-09-20
---

**Line length** (typography's *measure*) is the number of characters on one line of running text, spaces included. Too long, and the eye loses its place on the way back to the start of the next line; too short, and it has to jump back so often that the reading rhythm breaks. [Baymard Institute's usability research](https://baymard.com/blog/line-length-readability) (Edward Scott, 2022) puts the comfortable range at **50–75 characters per line**, and reports test users either leaving a page of over-long lines or skimming it without taking it in.

The range is old and consistent across sources:

- [Emil Ruder](https://en.wikipedia.org/wiki/Emil_Ruder)'s *Typographie* (1967) gives 50–60 characters.
- Bringhurst's *The Elements of Typographic Style*, as quoted in [The Elements of Typographic Style Applied to the Web](http://webtypography.net/2.1.2), calls 45–75 satisfactory and 66 ideal.
- [WCAG 1.4.8 Visual Presentation](https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html) (level AAA) sets a ceiling of **80 characters**, 40 for Chinese, Japanese and Korean.

Baymard also lists a set of spacing values (letter spacing 0.12 em, word spacing 0.16 em, paragraph spacing 2× the font size) as accessibility requirements. In WCAG those numbers are [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html): a user must be able to *apply* them without content breaking. They are a tolerance to design for, not values to set.

**Age note.** The article is from 2022-05, and none of it has aged: the range comes from mid-twentieth-century print typography, and the CSS advice still holds.

## Setting it in CSS

Line length is set with a maximum width in a font-relative unit, so it scales with the type:

```css
p { max-inline-size: 60ch; }
```

⚠ **`60ch` is not 60 characters.** `1ch` is the advance width of the "0" glyph, and digits are wider than the average character in running text, which is full of narrow `i`, `l`, `t` and spaces. A `ch` measure therefore holds *more* characters than its number. How many more depends on the face: measure it rather than assume it.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/line-length-ch.png" alt="Above, a row of sixty zeros in Source Sans exactly fills a box 60ch wide, marked with an orange rule. Below, a paragraph set in a box of the same width, with the character count of each line in orange beside it: 68, 70, 74, 67, 67, and a last line of 7." width="1480" height="656">
  <figcaption>Sixty zeros are exactly <code>60ch</code>; the same box holds 67–74 characters of running text in Source Sans. The counts are measured from the rendered lines, not typed in.</figcaption>
</figure> Baymard suggests `70ch`; in this site's face that would set lines of about 84 characters, over WCAG's 80.

`ch` also changes with the font: while a fallback face shows, the same `60ch` resolves to a different width (see [[Layout shift]], where Arial's `ch` runs about 5% wider than Source Sans's even after metric matching).

On a phone in portrait the column is narrower than any sensible maximum, so the screen, not the CSS, sets the line length, and lines fall below 50 characters. Baymard treats that as the lesser problem; the maximum matters in landscape and on larger screens.

## In jedee

The measure is Eleventy Excellent's stock rule in `global/blocks/prose.css`:

```css
.prose :is(p, li, dl, blockquote) {
  max-inline-size: 60ch;
  text-wrap: pretty;
}
```

jedee's own additions reuse the number: `.intro` (the lede under a post title) in `local/post.css` is also `60ch`, and the webmention list in `local/webmentions.css` is `40ch`. The prose column around them is `--wrapper-width: 64rem`, so the `ch` cap, not the column, is what limits a paragraph on a desktop screen. [[Text wrapping]] covers the `text-wrap` half of the same rule.

Because that cap is narrower than the column and nothing centers it, every text block hangs from the column's start edge and the right edge steps in as the type gets smaller. Measured on [[Layout breakouts]] in a 946 px column: the band runs 48–898 px, a code block and an `h2` fill it at 850 px, a paragraph stops at 804.8 px at 24.5 px type, and a figcaption at 654.5 px at 19.7 px type (its `60ch` comes from the wiki's own caption rule, not the one above) — the same number at two type sizes, with the uncapped elements filling the band. A paragraph's optical center therefore sits about 47 px left of the band's center, a caption's about 122 px. **This is deliberate and the page is designed around it**: the full-width elements that fall between the text — a code block, a table, a figure — re-establish the band, so the page reads as balanced without the short blocks being centered. Adding `margin-inline: auto` to the rule above would center every one of them and flatten the effect site-wide, in one line.

**What `60ch` actually sets**, measured on 2026-09-10 in the built site: characters per rendered line in paragraphs of plain running text (no inline code), last lines excluded, in Source Sans.

Table: Characters per line set by `60ch`, by viewport
| viewport | font size | paragraph width | characters per line (median, 10th–90th percentile) |
| --- | --- | --- | --- |
| 1920 px | 28 px | 835 px | 72 (67–75) |
| 1280 px | 27.3 px | 813 px | 72 (67–75) |
| 768 px | 22.8 px | 657 px | 70 (63–74) |
| 390 px | 19.5 px | 325 px | 39 (36–42) |

So `60ch` in Source Sans holds about **1.2 characters per `ch`**: lines of about 72 characters, at the top of the 50–75 range rather than in its middle, and inside WCAG's 80. At 768 px the viewport is already narrower than `60ch`, and at 390 px lines drop to about 39. Nothing has been changed on the strength of this; a measure aimed at the middle of the range would be about `52ch` in this face.

Raw source: `src/_raw/Readability The Optimal Line Length.md` (Edward Scott, Baymard Institute, 2022-05-10). The clip captured only Baymard's site navigation, not the article; this page was written from the live article.
