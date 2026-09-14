---
description: "Shipping only the characters and styles a site needs from a web font, and how a missing character falls back to another font while a missing style is faked."
date: 2026-09-10
---

**Subsetting** a font means keeping only the characters a site needs and dropping the rest, so the file is a fraction of the full family's size. A complete Source Sans 3 carries Latin, Greek, Cyrillic, arrows and much more; a site written in English and Swedish needs about two hundred characters of it. The standard tool is fontTools' [`pyftsubset`](https://fonttools.readthedocs.io/en/latest/subset/), which glyphhanger and most build-time subsetting wrap. The other half of the technique is CSS [`unicode-range`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range), which tells the browser which characters a face covers, so it can skip downloading a file the page has no characters for.

The cost is a failure that never announces itself. When a character is not in the font, the browser does not show an error or an empty box: it draws **that one character** in the next family of the `font-family` stack that has it, and the rest of the word in the web font. The result is a letter or a quote mark that looks slightly off, in a slightly different weight, on pages where nobody is looking for it.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/subsetting-fallback.png" alt="The same heading, I’m in “Düsseldorf” – again…, set twice in Source Serif Bold. In the upper line, from the old subset, six characters are underlined in orange: the apostrophe, both curly quotes, the ü, the en dash and the ellipsis. They are drawn in Georgia and look slightly heavier and differently shaped. The lower line, from the current subset, is uniform." width="1422" height="528">
  <figcaption>This site's heading font before and after the 2026-09-10 fix, from the two real font files. The underlined characters were missing from the old subset and were drawn in the fallback, Georgia.</figcaption>
</figure>

The characters most likely to go missing are the ones an author never types:

- **Typographer output.** A Markdown setting like markdown-it's `typographer` turns `'` into `’`, `"…"` into `“…”`, `--` into `–`. The source file only holds the straight versions, so a subset built from the source text misses every curly one the build creates.
- **Names.** A subset cut for English and Swedish has å, ä, ö and nothing else; the first "Düsseldorf" in a heading falls back.
- **Fetched text.** Anything pulled in at build time (a video title, a book title) brings characters the author never saw.
- **Decomposed accents.** Unicode can write "ö" as one code point (NFC) or as `o` plus U+0308 COMBINING DIAERESIS (NFD); both render the same ([Unicode normalization, UAX #15](https://unicode.org/reports/tr15/)). A subset holds the precomposed letters but almost never the combining marks, so NFD text draws its accents in the fallback. [`String.prototype.normalize('NFC')`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) on the incoming string rejoins them.

Design tools add a trap of their own: they swap quotes as you type (macOS "smart quotes"), so a mockup can show `’` where the page has `'`, and the two look like a font difference when they are different characters.

## Finding fallbacks

Grepping the source cannot find them, for the reasons above: the characters that fall back are mostly created by the build. The reliable check is against the rendered pages: for every text node, the first family in its computed `font-family` names the file that should draw it, and each character is tested against that file's character map (its *cmap*, exported with fontTools).

```js
// per page, loaded in a same-origin iframe; `sets` maps a family name to its cmap as a Set of code points
const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
for (let n; (n = tw.nextNode()); ) {
  const cs = win.getComputedStyle(n.parentElement);
  const family = cs.fontFamily.split(',')[0].trim().replace(/["']/g, '');
  for (const ch of n.data) if (ch.codePointAt(0) > 0x20 && !sets[family].has(ch.codePointAt(0))) report(family, ch);
}
```

Two additions matter: an italic that is its own file needs its own cmap (check `cs.fontStyle`), and `::before`, `::after` and `::marker` string content is text too.

**While you work, one page at a time**, a script can do the same test with no cmaps at all. It measures each character in a canvas with the page's web font followed by a **blank font**: one zero-width glyph mapped to every code point (a cmap format 13 subtable, the trick behind [Adobe Blank](https://github.com/adobe-fonts/adobe-blank)). A character the web font has comes out with a width; one it lacks falls through to the blank font and measures zero. Comparing two ordinary fallbacks (`monospace` against `serif`) looks simpler and misses exactly the rare symbols: when neither fallback has `⁂`, both hand it to the same system font and the widths agree. ⚠ Chrome refuses a font whose glyph table is empty ("OTS parsing error: glyf: zero-length table" in the console), so the blank font's `.notdef` needs a real outline. ⚠ A canvas does not trigger font downloads, so a `unicode-range` face the page itself never needed measures as missing.

## Filling a gap

Rebuild the subset from the full font, keeping everything the current file has plus the additions:

```bash
pyftsubset Full-Font.otf.woff2 --unicodes-file=targets.txt --flavor=woff2 --layout-features='*' --output-file=new.woff2
```

Then check before replacing the file: nothing the old cmap had is gone, the new characters are present, and a variable font still has its `fvar` table. Don't pass `--instance`, which would flatten the weight axis. `--layout-features='*'` keeps the font's ligatures, small caps and other switches; without it they're stripped (see [[OpenType features]] for what these subsets keep). ⚠ A variable subset cannot be extended from static per-weight files: the glyphs have to come from a variable source, or the axis is lost.

⚠ Every character added is paid for on every page that loads the file. Whole blocks are tempting ("add all of Latin-1") and expensive: the full Latin-1 Supplement took this site's heading font from 33 KB to 45 KB, for letters no heading used. Add characters as pages need them.

## Missing styles

The same silent failure happens one level up, with a whole style instead of a character. When text asks for a weight or style the family has no file for (an `<em>` in a heading whose font ships only Bold, `font-weight: 700` on a font loaded at 400), the browser does not fall back to another family. It **synthesizes** the face from the one it has: a faux bold thickens the outlines, a faux italic slants the upright letters. It passes at a glance and reads worse, because a real italic is drawn separately, not a slanted roman ([Anders Norén, 2025](https://andersnoren.se/how-to-disable-faux-weights-with-css/); [Richard Rutter, "Beware the faux bold"](https://clagnut.com/blog/2438/)).

[`font-synthesis`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-synthesis) (CSS Fonts 4) turns it off:

```css
body {
  font-synthesis: none;
}
```

A missing italic then renders upright and a missing bold at the nearest real weight, so the gap shows instead of being faked. The property is inherited, so one declaration covers the page. `none` covers all four kinds of fake: weight, style, small caps and super/subscript position. The longhands (`font-synthesis-weight`, `-style`, `-small-caps`, `-position`) switch them one at a time.

Two things look like gaps and are not, both measured in Chrome and Firefox:

- **Bolder than the only bold.** `<strong>` inside a bold heading asks for 900 (`bolder`). The browser takes the 700 face as it is and synthesizes nothing.
- **A variable font with no `font-weight` descriptor.** Its `@font-face` still gives real weights along the axis, because in CSS Fonts 4 the descriptor's initial value is `auto`, the range the file declares. ⚠ Script can't see that: `FontFace.weight` reports `normal`, so a checker reading it flags every bold as fake. Writing the range out (`font-weight: 200 900`) changes nothing for the browser and fixes the reading.

The cmap scan above cannot see a missing style. It looks the family up by name, so italic text in a family with no italic file is checked against the upright cmap and passes. The check is the computed `font-style` and `font-weight` against the `@font-face` rules that exist. On a site with a handful of faces the risky combinations are few enough to grep the built HTML for, for example a heading that contains `<em>`, `<i>` or `<cite>`.

A gap found this way is filled the subsetting way: cut the missing face from the full font, with the same character list as its sibling. A browser downloads a face only when a page uses it, so a style that appears on three headings costs nothing on the other pages.

## In jedee

Eleventy Excellent ships **static, pre-subset `woff2` files** and has no subsetting step in the build. Its `@font-face` blocks have no `unicode-range`, so adding a character to a file is the whole fix: no CSS change. The full source fonts are bundled beside the subsets. The one exception is Cyrillic (below), which is its own file behind a `unicode-range`.

| file | kind | characters | source in the repo |
| --- | --- | --- | --- |
| `source-serif/source-serif.woff2` | static, Bold 700 only | 109 | `SourceSerif4-Bold.otf.woff2` |
| `source-serif/source-serif-bold-italic.woff2` | static, Bold Italic 700 only | 109 | `_source/TTF/SourceSerif4-BoldIt.ttf.woff2` |
| `source-sans/source-sans.woff2` | variable | 206 | `_source/VF/SourceSans3VF-Upright.otf.woff2` |
| `source-sans/source-sans-italic.woff2` | variable | 207 | `_source/VF/SourceSans3VF-Italic.otf.woff2` |
| `source-sans/source-sans-cyrillic.woff2` | variable, `unicode-range` | 102 | `_source/VF/SourceSans3VF-Upright.otf.woff2` |
| `source-sans/source-sans-italic-cyrillic.woff2` | variable, `unicode-range` | 102 | `_source/VF/SourceSans3VF-Italic.otf.woff2` |
| `source-code-pro/source-code-pro.woff2` | variable | 241 | none bundled |

The fallback faces behind each are the metric-matched Georgia, Arial and Courier New described on [[Layout shift]], so a fallen-back character is at least the right size.

**Cyrillic** (2026-09-14) came from one Russian word on the *A Confession* reading page, drawn letter by letter in Arial. Rather than grow the files every page loads, the two Cyrillic faces cover U+0400–045F (Russian, Ukrainian, Serbian and the rest of modern Cyrillic) plus the pre-1918 letters ѣ, ѳ and ѵ. Each is declared after its main face under the same family name with a `unicode-range`, so only a page containing Cyrillic downloads it: 22 KB upright, 16 KB italic. ⚠ Keep them after the main faces: for overlapping faces the last one declared is checked first. Source Serif has no Cyrillic, so a Russian word in a heading still falls back.

**Checking while you work.** On the dev server only (`eleventy.env.runMode === "serve"` in `base.njk`), `src/assets/scripts/bundle/font-check.js` runs the blank-font test above on every page. It greys out and dot-underlines each character drawn by a fallback, outlines any element set in a style its family has no file for, gives both a hover title, and logs a count to the console. Emoji and pictographs such as `⚠` are skipped on purpose. On this page it flags nine characters, all in code where Source Code Pro lacks them (the symbols listed below, plus `Δ`), and the code keywords' missing italic.

**The 2026-09-10 scan.** All 641 built pages, 34 characters falling back. The biggest was Source Serif having **no curly quotes at all**: with `typographer: true` in `src/_config/plugins/markdown.js`, every heading with an apostrophe drew its `’` in Georgia. Filled since: ‘ ’ “ ” – — … and `ü` in Source Serif; `~ ← ↑ → ↓ ↔ Δ` in Source Sans upright and italic. The YouTube captions on two jam pages had NFD accents from YouTube's own titles; `youtubeTitle` in `src/_config/filters/youtube-title.js` now normalizes to NFC (see [[The YouTube embed]]).

Left falling back on purpose:

- **Emoji.** No text font has them, and the system emoji font is the right one.
- **`⚠`**, on 36 wiki pages. It is in no Source font, so the wiki's own warning marker always comes from a system font. Decorative; left.
- **`⁂`, `❖`, `↩︎`** (the last is the footnote back-link). Also in no Source font.
- **Code-block symbols** (`→ ← │ ⌄ ⚠`). The code font is a trimmed variable subset with no full variable source bundled; fixing it means downloading Source Code Pro's variable release first.

⚠ Source Serif was deliberately kept small: the Latin-1 block was added and taken back out the same day. Add accented letters to it one at a time, when a heading actually needs one. ⚠ Add each one to the Bold Italic too: the two files share one character list, and a character in only one of them falls back in the other.

**Styles.** Since 2026-09-13 `body` sets `font-synthesis: none` (`global/base/global-styles.css`). Until then only `.small-caps` refused fakes. Checking the shipped files against the CSS turned up two faux italics and no faux bold:

- **Italic in a serif heading.** Source Serif ships Bold only, so an `<em>` in an `h1`–`h3` was a slanted Bold: the RSVP card's "RSVP *yes*" (`partials/card-response.njk`; all three RSVPs are drafts for now) and one heading on [[The interlinker's second render pass]]. Both now use a real Bold Italic, `source-serif-bold-italic.woff2`, cut from the bundled `SourceSerif4-BoldIt` to the Bold's 109 characters: 17 KB, against 33 KB for the Bold. It is not preloaded, so only a page with italic in a heading downloads it.
- **Italic in code.** The syntax theme sets `.token.keyword { font-style: italic }` (`global/blocks/code.css`), and there is no Source Code Pro italic, so the keywords on 31 pages were slanted. They are now upright and still violet. A real italic needs Source Code Pro's italic downloaded first, like the code-block symbols above.
- **Source Sans** is variable 200–900 in upright and italic, so every weight and style in body text is real. The breadcrumb's connector words use Source Sans rather than the serif for this reason (`global/blocks/breadcrumb.css`).

The recipe itself needs a Python with fontTools and brotli; on this machine that is the python.org framework install, not the default `python3`.

Raw sources: `src/_raw/dev-notes/How missing glyphs were found and filled.md`, `src/_raw/How to disable faux weights with CSS and font synthesis.md`
