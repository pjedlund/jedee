---
description: "Shipping only the characters and styles a site needs from a web font, and how a missing character falls back to another font while a missing style is faked."
date: 2026-09-10
updated: 2026-10-31
---

**Subsetting** a font means keeping only the characters a site needs and dropping the rest, so the file is a fraction of the full family's size. A complete Source Sans 3 carries Latin, Greek, Cyrillic, arrows and much more; a site written in English and Swedish needs about two hundred characters of it. The standard tool is fontTools' [`pyftsubset`](https://fonttools.readthedocs.io/en/latest/subset/), which glyphhanger and most build-time subsetting wrap. The other half of the technique is CSS [`unicode-range`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range), which tells the browser which characters a face covers, so it can skip downloading a file the page has no characters for.

The cost is a failure that never announces itself. When a character is not in the font, the browser does not show an error or an empty box: it draws **that one character** in the next family of the `font-family` stack that has it, and the rest of the word in the web font. The result is a letter or a quote mark that looks slightly off, in a slightly different weight, on pages where nobody is looking for it.

The characters most likely to go missing are the ones an author never types:

- **Typographer output.** A Markdown setting like markdown-it's `typographer` turns `'` into `’`, `"…"` into `“…”`, `--` into `–`. The source file only holds the straight versions, so a subset built from the source text misses every curly one the build creates.
- **Names.** A subset cut for English and Swedish has å, ä, ö and nothing else; the first "Düsseldorf" in a heading falls back.
- **Fetched text.** Anything pulled in at build time (a video title, a book title) brings characters the author never saw.
- **Decomposed accents.** Unicode can write "ö" as one code point (NFC) or as `o` plus U+0308 COMBINING DIAERESIS (NFD); both render the same ([Unicode normalization, UAX #15](https://unicode.org/reports/tr15/)). A subset holds the precomposed letters but almost never the combining marks, so NFD text draws its accents in the fallback. [`String.prototype.normalize('NFC')`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize) on the incoming string rejoins them.

Design tools add a trap too: they swap quotes as you type (macOS "smart quotes"), so a mockup can show `’` where the page has `'`, and the two look like a font difference when they are different characters.

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

Two additions matter: an italic that is a separate file needs a separate cmap (check `cs.fontStyle`), and `::before`, `::after` and `::marker` string content is text too.

**While you work, one page at a time**, a script can do the same test with no cmaps at all. It measures each character in a canvas with the page's web font followed by a **blank font**: one zero-width glyph mapped to every code point (a cmap format 13 subtable, the trick behind [Adobe Blank](https://github.com/adobe-fonts/adobe-blank)). A character the web font has comes out with a width; one it lacks falls through to the blank font and measures zero. Comparing two ordinary fallbacks (`monospace` against `serif`) looks simpler and misses exactly the rare symbols: when neither fallback has `⁂`, both hand it to the same system font and the widths agree. Chrome refuses a font whose glyph table is empty ("OTS parsing error: glyf: zero-length table" in the console), so the blank font's `.notdef` needs a real outline. A canvas does not trigger font downloads, so a `unicode-range` face the page itself never needed measures as missing.

## Filling a gap

Rebuild the subset from the full font, keeping everything the current file has plus the additions:

```bash
pyftsubset Full-Font.otf.woff2 --unicodes-file=targets.txt --flavor=woff2 --layout-features='*' --output-file=new.woff2
```

Then check before replacing the file: nothing the old cmap had is gone, the new characters are present, and a variable font still has its `fvar` table. Don't pass `--instance`, which would flatten the weight axis. `--layout-features='*'` keeps the font's ligatures, small caps and other switches; without it they're stripped (see [[OpenType features]] for what these subsets keep). A variable subset cannot be extended from static per-weight files: the glyphs have to come from a variable source, or the axis is lost.

Every character added is paid for on every page that loads the file. Whole blocks are tempting ("add all of Latin-1") and expensive: the full Latin-1 Supplement took one heading font from 33 KB to 45 KB, for letters no heading used. Add characters as pages need them.

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
- **A variable font with no `font-weight` descriptor.** Its `@font-face` still gives real weights along the axis, because in CSS Fonts 4 the descriptor's initial value is `auto`, the range the file declares. Script can't see that: `FontFace.weight` reports `normal`, so a checker reading it flags every bold as fake. Writing the range out (`font-weight: 200 900`) changes nothing for the browser and fixes the reading.

The cmap scan above cannot see a missing style. It looks the family up by name, so italic text in a family with no italic file is checked against the upright cmap and passes. The check is the computed `font-style` and `font-weight` against the `@font-face` rules that exist. On a site with a handful of faces the risky combinations are few enough to grep the built HTML for, for example a heading that contains `<em>`, `<i>` or `<cite>`.

A gap found this way is filled the subsetting way: cut the missing face from the full font, with the same character list as its sibling. A browser downloads a face only when a page uses it, so a style that appears on three headings costs nothing on the other pages.

## In stomme

Which fonts a site loads is a theme's choice, so no font file belongs to the shared code. A theme's `fonts.css` holds its `@font-face` rules, and the files in its `fonts/` folder (`src/_includes/themes/<theme>/fonts/`) are published at `/assets/fonts/`; a theme with no fonts has no such folder and nothing is published. The `sample` theme is one of those: it uses system fonts and its `fonts.css` is empty. What the shared code does carry is the dev-server font checker (`src/assets/scripts/bundle/font-check.js`), `typographer: true` in `src/_config/plugins/markdown.js`, NFC normalizing in `src/_config/filters/youtube-title.js`, and the never-italic code rule in `src/assets/css/local/code.css`.

Eleventy Excellent ships **static, pre-subset `woff2` files** and has no subsetting step in the build, so a theme that ships subsets works the way the sections above describe: adding a character to a file is the whole fix, as long as its `@font-face` blocks have no `unicode-range`. A second alphabet such as Cyrillic is the exception, and is better as a separate file behind a `unicode-range`.

**Cyrillic** is the case for a separate, range-limited face: one Cyrillic word on a page is otherwise drawn letter by letter in a fallback such as Arial. Rather than grow the files every page loads, a theme that needs Cyrillic would cut one extra face per style covering U+0400–045F (Russian, Ukrainian, Serbian and the rest of modern Cyrillic), plus the pre-1918 letters ѣ, ѳ and ѵ if old texts matter. Declare each after its main face under the same family name with a `unicode-range`, so only a page containing Cyrillic downloads it. Keep them after the main faces: for overlapping faces the last one declared is checked first. A family with no Cyrillic glyphs still falls back for a Russian word, so check the family before relying on it.

**Checking while you work.** On the dev server only (`eleventy.env.runMode === "serve"` in `base.njk`), `src/assets/scripts/bundle/font-check.js` runs the blank-font test above on every page. It grays out and dot-underlines each character drawn by a fallback, outlines any element set in a style its family has no file for, gives both a hover title, and logs a count to the console. Emoji and pictographs such as `⚠` are skipped on purpose. It reads the `@font-face` rules the page actually loaded, so it checks whichever theme is active, and a theme with no font files gives it nothing to flag.

**What a scan finds.** Typographer output is the usual first gap: with `typographer: true`, every heading with an apostrophe asks its font for `’`, so a subset cut from the source text alone misses the curly quotes, dashes and ellipsis the build creates. Characters that no web font carries, such as emoji and most symbols, are best left to the system font.

**Styles.** `body` does not set `font-synthesis: none`: refusing a fake turns a missing italic upright, so the emphasis is lost, and a fallback font loaded as Regular only loses its bold while the web fonts load. `.small-caps` (`src/assets/css/global/utilities/small-caps.css`) does refuse fake small caps by itself. The dev-server checker shows fakes instead of forbidding them. Two cases are worth knowing:

- **Italic in a heading.** If a theme ships a heading font in Bold only, an `<em>` in an `h1`–`h3` is a slanted Bold. The fix is a real Bold Italic file cut from the full font to the Bold's character list. Leave it out of the preload list, so only a page with italic in a heading downloads it.
- **Italic in code.** A syntax theme often sets keywords in italic, but `code, pre` in `src/assets/css/local/code.css` set `font-style: normal`, so code is never italic, even inside an `<em>`, unless the code font has a real italic. Bold code stays, because a variable code font has real bold.

The recipe itself needs a Python with fontTools and brotli.
