---
description: "How many characters a line of body text should hold, and why a max-width in ch does not set that number directly."
date: 2026-09-10
updated: 2026-10-31
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
  <img eleventy:formats="webp,png" src="/assets/images/wiki/line-length-ch.png" alt="Above, a row of fifty-four zeros exactly fills a box 54ch wide, marked with an orange rule. Below, a paragraph set in a box of the same width, with the character count of each line in orange beside it: 68, 65, 70, 67 and 64, and a last line of 19." width="1398" height="548">
  <figcaption>Fifty-four zeros are exactly <code>54ch</code>; the same box holds 64–70 characters of running text in the font the shot was taken with. The counts are measured from the rendered lines, not typed in.</figcaption>
</figure>

Baymard suggests `70ch`; in a face like Source Sans that would set lines of about 82 characters, over WCAG's 80.

`ch` also changes with the font: while a fallback face shows, the same `54ch` resolves to a different width; Arial's `ch` runs wider than a web font's even after metric matching.

On a phone in portrait the column is narrower than any sensible maximum, so the screen, not the CSS, sets the line length, and lines fall below 50 characters. Baymard treats that as the lesser problem; the maximum matters in landscape and on larger screens.

## In stomme

The measure is set in `src/assets/css/local/prose.css`:

```css
.prose :is(p, li, dl, blockquote, ul:not([class]), ol:not([class])) {
  max-inline-size: 54ch;
  text-wrap: pretty;
}
```

Eleventy Excellent ships `60ch`; stomme sets `54ch`, which lands near the middle of the 50–75 range instead of at its top (the numbers are below). Plain lists take the measure on the list itself rather than on each item, so the bullet indent comes out of the line length instead of pushing list text past the paragraphs' right edge. That follows the book typographer's text block, where indented matter sits inside the measure and never sticks out of it. A list with a class (a card grid, a row of tags) keeps the per-item rule, so the cap doesn't squeeze the whole grid.

stomme's additions reuse the number: `.intro` (the lede under a post title) in `local/post.css` is also `54ch`, and so is the wiki's caption measure in `local/wiki.css` (see [[Figures]]). The design system page's running text takes it too (`local/design-system.css`), because that page sits in a wider wrapper that would otherwise let its paragraphs run far past the measure. The webmention list in `local/webmentions.css` is `40ch`. The prose column around them is `--wrapper-width: 64rem`, so the `ch` cap, not the column, is what limits a paragraph on a tablet or desktop screen. [[Text wrapping]] covers the `text-wrap` half of the same rule.

Because that cap is narrower than the column and nothing centers it, every text block hangs from the column's start edge: a heading fills the column, a code block breaks out wider (see [[Layout breakouts]]), and a paragraph and a figcaption both stop at the measure, so a paragraph's optical center sits left of the column's center. **This is deliberate and the page is designed around it**: the full-width elements that fall between the text — a code block, a table, a figure — re-establish the column, so the page reads as balanced without the short blocks being centered. Adding `margin-inline: auto` to the rule above would center every one of them and flatten the effect, in one line.

**What `54ch` sets depends on the font.** A `ch` is the width of the `0` in the element's font, so the same cap holds a different number of characters in a different typeface. As one example, in Source Sans `54ch` came to about 1.17 characters per `ch`, so lines of about 63 characters, close to Bringhurst's 66 and in the middle of the 50–75 range; the `ch` cap applies from tablet width up, so line length stays the same as the viewport grows, and only a phone in portrait drops below 50. To check a theme's fonts, count characters per rendered line in paragraphs of plain running text over 200 characters (no inline code, last lines excluded) at a few viewport widths.

Source: Edward Scott, Baymard Institute, "Readability: The Optimal Line Length" (2022-05-10).
