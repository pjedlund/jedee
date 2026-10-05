---
description: "How many characters a line of body text should hold, and why a max-width in ch does not set that number directly."
date: 2026-09-10
updated: 2026-10-01
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
p { max-inline-size: 54ch; }
```

⚠ **`54ch` is not 54 characters.** `1ch` is the advance width of the "0" glyph, and digits are wider than the average character in running text, which is full of narrow `i`, `l`, `t` and spaces. A `ch` measure therefore holds *more* characters than its number. How many more depends on the face: measure it rather than assume it.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/line-length-ch.png" alt="Above, a row of fifty-four zeros in Source Sans exactly fills a box 54ch wide, marked with an orange rule. Below, a paragraph set in a box of the same width, with the character count of each line in orange beside it: 62, 63, 68, 62, 64, and a last line of 34." width="1260" height="556">
  <figcaption>Fifty-four zeros are exactly <code>54ch</code>; the same box holds 62–68 characters of running text in Source Sans. The counts are measured from the rendered lines, not typed in.</figcaption>
</figure>

Baymard suggests `70ch`; in this site's face that would set lines of about 82 characters, over WCAG's 80.

`ch` also changes with the font: while a fallback face shows, the same `54ch` resolves to a different width (see [[Layout shift]], where Arial's `ch` runs about 5% wider than Source Sans's even after metric matching).

On a phone in portrait the column is narrower than any sensible maximum, so the screen, not the CSS, sets the line length, and lines fall below 50 characters. Baymard treats that as the lesser problem; the maximum matters in landscape and on larger screens.

## In jedee

The measure is set in `global/blocks/prose.css`:

```css
.prose :is(p, li, dl, blockquote, ul:not([class]), ol:not([class])) {
  max-inline-size: 54ch;
  text-wrap: pretty;
}
```

Eleventy Excellent ships `60ch`. On 2026-10-01 Johan tried several widths and settled on `54ch`, which lands near the middle of the 50–75 range instead of at its top (the numbers are below). Plain lists take the measure on the list itself rather than on each item, so the bullet indent comes out of the line length instead of pushing list text past the paragraphs' right edge. That follows the book typographer's text block, where indented matter sits inside the measure and never sticks out of it. A list with a class (a card grid, a row of tags) keeps the per-item rule, so the cap doesn't squeeze the whole grid.

jedee's own additions reuse the number: `.intro` (the lede under a post title) in `local/post.css` is also `54ch`, and so is the wiki's caption measure in `local/wiki.css` (see [[Figures]]). The style guide's running text takes it too (`local/styleguide.css`), since 2026-10-05, when the 97rem wrapper let its paragraphs run about 170 characters a line. The webmention list in `local/webmentions.css` is `40ch`. The prose column around them is `--wrapper-width: 64rem`, so the `ch` cap, not the column, is what limits a paragraph on a tablet or desktop screen. [[Text wrapping]] covers the `text-wrap` half of the same rule.

Because that cap is narrower than the column and nothing centers it, every text block hangs from the column's start edge. Measured on [[Layout breakouts]] at a 1280 px viewport: the content band runs 128–1152 px, and an `h2` fills it; a code block breaks out to 96–1184 px; a paragraph and a figcaption both stop at 860.2 px. A paragraph's optical center therefore sits about 146 px left of the band's center. **This is deliberate and the page is designed around it**: the full-width elements that fall between the text — a code block, a table, a figure — re-establish the band, so the page reads as balanced without the short blocks being centered. Adding `margin-inline: auto` to the rule above would center every one of them and flatten the effect site-wide, in one line.

**What `54ch` actually sets**, measured on 2026-10-01 on the dev server: characters per rendered line in paragraphs of plain running text over 200 characters long (no inline code), last lines excluded, across eight wiki pages, in Source Sans.

Table: Characters per line set by `54ch`, by viewport
| viewport | font size | paragraph width | characters per line (median, 10th–90th percentile) |
| --- | --- | --- | --- |
| 1920 px | 28 px | 751 px | 63 (58–67) |
| 1280 px | 27.3 px | 732 px | 63 (58–67) |
| 768 px | 22.8 px | 613 px | 63 (58–67) |
| 390 px | 19.6 px | 343 px | 41 (37–44) |

So `54ch` in Source Sans holds about **1.17 characters per `ch`**: lines of about 63 characters, close to Bringhurst's 66 and in the middle of the 50–75 range. The cap now applies from tablet width up, so the line length is the same at 768 px as at 1920 px; only a phone in portrait drops below 50, to about 41. The old `60ch`, measured on 2026-09-10 in the built site, set lines of about 72 characters, and at 768 px the screen was already narrower than the cap.

Raw source: `src/_raw/Readability The Optimal Line Length.md` (Edward Scott, Baymard Institute, 2022-05-10). The clip captured only Baymard's site navigation, not the article; this page was written from the live article.
