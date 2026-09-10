---
description: "The book-typography rules for figures, small caps, capitals, captions, line breaks and superscripts, where they come from, and what each costs in accessibility."
date: 2026-09-10
---

Typography carries a set of conventions older than the web, most of them written down in two books. Robert Bringhurst's *The Elements of Typographic Style* (1992; 4th edition 2012) is adapted rule by rule for CSS at [webtypography.net](http://webtypography.net/). Matthew Butterick's *Practical Typography* is a free online book. The two agree more than they differ, and where they differ Butterick is the milder. This page covers the part CSS can switch on, given fonts that carry the features; the switches themselves are on [[OpenType features]].

Most of these rules are about **evenness**. A page reads as one texture when numbers, acronyms and capitals don't jump out of it. That makes them defaults on elements, not decoration added word by word.

## Figures

Digits come in two shapes. **Lining** figures are all the height of capitals. **Old-style** (or text) figures rise and descend like lowercase letters. Bringhurst ([3.2.1](http://webtypography.net/3.2.1)) uses lining figures with full capitals and old-style figures "in all other circumstances". Butterick ([alternate figures](https://practicaltypography.com/alternate-figures.html)) is milder: lining figures are the general default, and old-style figures belong only in lowercase body text, never next to capitals.

Figure *width* is a separate choice. **Tabular** figures all share one width, so columns of numbers line up. **Proportional** figures are spaced like letters. Butterick: proportional in body text, tabular in any column of numbers.

```css
.prose { font-variant-numeric: oldstyle-nums proportional-nums; }
.prose table { font-variant-numeric: lining-nums tabular-nums; }
```

⚠ `font-variant-numeric` is one property holding both choices, so a child that sets only `tabular-nums` also resets the figure style to lining. That is usually what a column wants, and it is also how a single keyword quietly undoes a parent's old-style setting.

## Small caps

Small caps are capitals drawn at about the height of lowercase letters, with strokes thickened to match. Bringhurst ([3.2.2](http://webtypography.net/3.2.2)) sets acronyms in running text in spaced small caps. Butterick ([small caps](https://practicaltypography.com/small-caps.html)) uses them sparingly, as a third kind of emphasis beside bold and italic. Both insist on real ones. A browser asked for small caps that a font lacks shrinks the capitals instead, which leaves them thin and pale.

- `font-variant-caps: small-caps` turns lowercase into small caps and leaves capitals alone, so "Robert Bringhurst" keeps a full-size R and B.
- `all-small-caps` also turns the capitals into small caps: the form for acronyms. It flattens mixed-case names, so RDFa and W3C both come out as uniform small capitals.
- `font-synthesis-small-caps: none` refuses the fake. Text in a face without small caps is shown as ordinary text instead.

`font-variant-caps` changes only the drawing, not the characters, so a screen reader reads the source text.

## Capitals and letterspacing

Bringhurst ([2.1.6](http://webtypography.net/2.1.6)): letterspace strings of capitals and small caps by 5–10% of the type size, and don't letterspace lowercase without a reason. Butterick ([all caps](https://practicaltypography.com/all-caps.html)): capitals for short text only (headings under a line, labels, small print), never whole paragraphs, and always letterspaced. Lowercase reads faster because its ascenders and descenders give each word a recognizable shape; in capitals every word is a rectangle.

⚠ `text-transform: uppercase` can reach assistive technology. [Ben Myers](https://benmyers.dev/blog/css-can-influence-screenreaders/) (2020) showed VoiceOver reading a button labelled "Add", styled uppercase, as the acronym A.D.D. Small caps made from lowercase letters don't have this problem, because the characters are unchanged.

## Captions and italic

Neither book makes captions italic. Italic captions are a book habit for telling a caption apart from the text around it, and a smaller size does the same job. The case against italic is readability. The [GOV.UK style guide](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) does not use italics at all. Rello and Baeza-Yates' eye-tracking study *Good fonts for dyslexia* (ASSETS 2013) reported that italic slowed readers with dyslexia; the paper is paywalled and was not re-read for this page. The cost grows with length, so the useful line falls between a short label under a picture and a paragraph of explanation.

Centring adds a second cost: every line starts at a different place, so the eye has to search for the next one. It suits a line or two. Check the face too. A caption in a font with no real italic gets a slant the browser synthesizes.

## Line breaks

Covered on [[Text wrapping]]. `text-wrap: balance` evens out the lines of a short block: a heading, a caption, a quotation. Chrome stops balancing above six lines ([Chrome for Developers](https://developer.chrome.com/docs/css-ui/css-text-wrap-balance), 2023). `pretty` keeps a paragraph from ending on one word. Neither changes the text or its order, so neither has a known accessibility cost, and both survive zoom and the WCAG 1.4.12 text-spacing overrides.

## Superscripts

A footnote marker is conventionally a bare superscript figure. The browser's `<sup>` fakes one with `vertical-align: super` and a smaller size, which pushes the line apart. `font-variant-position: super` uses the font's own superscript glyphs, which sit inside the line. It works in Chrome since version 117 (2023), in Firefox and in Safari.

⚠ Chrome and Safari draw nothing fake when the font has no superscript form for a character: it shows at full size on the baseline. So every character in the marker has to be covered. A font with superscript digits but no superscript brackets cannot set `[1]`.

## Accessibility

WCAG says little here directly. [1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) (level AAA) limits lines to 80 characters and rules out text justified to both margins, and says nothing about italic or capitals. The guidance comes from plain-language style guides and reading research instead:
- **Italic:** keep it for short text.
- **Capitals:** use them for labels, not paragraphs.
- **Small caps and superscripts:** these keep the text's colour. What makes them harder to read is their smaller size, not contrast.

## In jedee

Set on 2026-09-10, after a research pass and an audit of the site. The decisions are recorded in `_local/design/Plan - Typographic utility classes.md`. The `text-wrap` reset they build on is Eleventy Excellent stock; everything below is jedee's own.

- **Old-style figures in running text.** `.prose` sets `oldstyle-nums proportional-nums`. Inside it, `table`, `abbr`, and `code, kbd, samp, pre` set lining figures back. ⚠ Source Code Pro ships with old-style figures too, so without that reset code would inherit them. Outside `.prose` nothing changes: the breadcrumb, the menu's counts and the footer keep lining figures.
  - Inside an activity post, the stats' `tabular-nums` (`local/activity.css`) replaces the inherited value and keeps them lining. That is the rule [[OpenType features]] had recorded as doing nothing.
  - A photo's capture metadata ("6×17", "3:30 @ 38 °C") takes old-style figures, as running text does.
- **One class, `.small-caps`** (`global/utilities/small-caps.css`), for the opening words of an article or a name. It sets small caps, `--tracking-wide` letterspacing, and `font-synthesis-small-caps: none`.
  - Write it as `<span class="small-caps">…</span>`, or as `{.small-caps}` at the end of a markdown paragraph.
  - ⚠ Not `*text*{.small-caps}`: that is italic, and Source Sans italic has no small caps.
- **No small caps on `abbr`**, for two reasons. The glossary ([[Abbreviations]]) marks only its 31 terms (it has CLS but not CSS), so styled acronyms would sit beside unstyled ones. And `all-small-caps` would flatten RDFa.
- **Capital labels** (site logo, breadcrumb, menu button, footer, buttons) share `--tracking-wide`, raised from 0.09ch to 0.12ch. That is about 5.7% of the size, since a Source Sans digit is 0.472 em wide.
- **Captions** stay italic and centred, and are now balanced. The wiki's captions run long (a median of about 100 characters, up to 400), so `local/wiki.css` sets them upright, left-aligned and `pretty`, at 60ch.
- **Quotations** balance. The rule is in `global-styles.css`, and again in `prose.css`, whose `pretty` rule on `p` would otherwise win.
- **Footnote markers** are bare superscript figures.
  - `markdown.js` overrides markdown-it-footnote's `footnote_caption` rule to drop the brackets. The Source Sans subset has superscript digits, parentheses and colons, but no square brackets. `footnotes.css` then uses `font-variant-position: super`.
  - ⚠ The link inside the marker had `padding: 0.3ch`, sized for the old, smaller number. At full size it opened a visible gap on either side, so the padding is now top and bottom only (`padding-block`).
- **Not done:**
  - no fraction class, since there are no fractions in the content;
  - no `.figures` or `.balance` class, since the defaults cover them;
  - never `dlig`, which rewrites "he" and "she";
  - a VoiceOver check of the `uppercase` labels is on the backlog.

The style guide (`/styleguide/`) shows each of these off and on under "Type features".

Raw source: `src/_raw/dev-notes/How the typographic defaults were chosen.md`
