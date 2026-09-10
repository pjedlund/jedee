---
description: "The optional typographic behaviors built into a font file (ligatures, small caps, figure styles, alternates) and how CSS switches them on."
date: 2026-09-10
---

A modern font file carries more than one shape per character. **OpenType features** are named switches inside the file, each a four-letter tag, that substitute or reposition glyphs: `liga` joins "f" and "i" into one ligature, `smcp` swaps lowercase for small capitals, `onum` swaps lining figures for old-style ones. The tags are defined in the [OpenType feature registry](https://learn.microsoft.com/en-us/typography/opentype/spec/featuretags); which of them a given font implements is up to its designer.

A few are on by default in every browser, because text looks broken without them: `kern` (kerning), `liga` (standard ligatures), `calt` (contextual alternates), `ccmp` and `locl` (glyph composition and language-specific forms). Everything else is off until CSS asks for it.

## Switching them on

CSS has two levels. The **`font-variant-*` properties** name the effect, and are the ones to reach for:

```css
.caps     { font-variant-caps: small-caps; }                 /* smcp */
.figures  { font-variant-numeric: oldstyle-nums; }           /* onum */
.table    { font-variant-numeric: tabular-nums slashed-zero; } /* tnum + zero */
.fraction { font-variant-numeric: diagonal-fractions; }      /* frac */
.fancy    { font-variant-ligatures: discretionary-ligatures; } /* dlig */
```

([MDN: `font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric), [`font-variant-caps`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-caps), [`font-variant-ligatures`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures).)

**`font-feature-settings`** is the low-level escape hatch for tags with no named property, chiefly stylistic sets (`ss01`–`ss20`) and character variants (`cv01`–`cv99`), whose meaning differs per font:

```css
.alt { font-feature-settings: 'ss01', 'ss10'; }
```

⚠ **`font-feature-settings` is one property holding a list, so a later declaration replaces the whole list rather than adding to it.** A rule setting `'ss01'` on a child silently turns off a `'ss10'` its parent set. The `font-variant-*` properties don't have this problem, since each controls its own features.

⚠ **Asking for a feature the font lacks does not fail visibly.** For small caps the browser *synthesizes* them, shrinking the capitals, which gives thin, pale letters next to real ones; `font-synthesis-small-caps: none` turns that off. For most other features nothing happens at all. The only way to know what a font can do is to look inside it (fontTools lists a file's GSUB features) or render every feature on and off.

⚠ **Subsetting removes features along with glyphs.** A subset keeps a feature's rules only for the characters it keeps, so small caps exist only for the letters in the subset, and a stylistic set that acts only on dropped characters disappears. With `pyftsubset`, `--layout-features='*'` is what keeps features at all; see [[Font subsetting]].

## In jedee

The site sets **no OpenType features of its own** beyond the browser defaults, apart from `font-variant-numeric: tabular-nums` in two places: the menu's post counts (`global/blocks/main-nav.css:204`) and the activity figures (`local/activity.css:21`). ⚠ **Both are no-ops in these fonts:** Source Serif and Source Sans already have tabular figures by default, every digit the same advance width (542 units in Serif, 472 in Sans upright, 456 italic). The rules cost nothing and say what the numbers need, so they stay.

What the shipped subsets can do, checked by rendering each feature on and off from the site's own files (every pair verified by `npm run mockups:check` to render differently) and by comparing glyph outlines:

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/opentype-serif.png" alt="A table of Source Serif Bold features, each shown off and on. Common ligatures join the f-i and f-f-i in office and affine. Small caps turns Small Caps into small capitals. Old-style figures change 1984 and 2026 only slightly. Proportional figures tighten 1111. Diagonal fractions turn 1/2, 3/4 and 7/8 into single fraction glyphs. Ordinals raise the a and o after 1 and 2. Slashed zero puts a slash through each zero." width="2048" height="1032">
  <figcaption>Source Serif 700 as shipped: the headings' face. Old-style figures differ only slightly in this design.</figcaption>
</figure>

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/opentype-sans.png" alt="A table of Source Sans features, each shown off and on. Ligatures join ff and ft. Small caps, old-style figures, diagonal fractions and slashed zero behave as in the serif. Stylistic set 1 gives the capital I serifs; set 2 swaps a, g and l for single-story, simpler forms; set 6 gives the a a serif; set 10 puts a dot in the zero. Discretionary ligatures turn thorn-a-t into a single barred thorn, and turn she, he, her and his each into one invented glyph." width="2048" height="1492">
  <figcaption>Source Sans as shipped: the body face. The last row is real: <code>dlig</code> replaces English pronouns with a single glyph.</figcaption>
</figure>

**Source Serif** (`source-serif.woff2`, Bold 700, 109 characters):

- **On by default:** `liga` covers ff, fi, fl, ffi, ffl, fj, ffj, ft, fft, so headings get ligatures already. Plus `kern` and `locl`.
- **Opt-in, working:** small caps (`smcp` covers a–z, å ä ö ü and the digits; `c2sc` turns capitals into small caps too), old-style (`onum`) and proportional (`pnum`) figures, diagonal fractions (`frac`, with `numr`/`dnom`), superscript and subscript (`sups`, `subs`, `sinf`), ordinals (`ordn`), slashed zero (`zero`), and case-sensitive forms (`case`, which raises brackets, hyphens and dashes for all-caps text).
- **Dropped by the subset:** the full font's two stylistic sets, which turn out to be Cyrillic alternates (Bulgarian, and Serbian/Macedonian), with nothing to act on here. The accent-positioning features (`mark`, `mkmk`, `ccmp`) went too, since the subset has no combining marks.

**Source Sans** (`source-sans.woff2` and `-italic.woff2`, variable, 206/207 characters):

- **On by default:** `liga` covers only ff, ft and fft. There is no fi or fl ligature because Source Sans' f is drawn so it doesn't collide. `ccmp` joins l·l (the Catalan *ela geminada*).
- **Opt-in, working:** small caps across Latin-1 (`smcp`, `c2sc`), `onum`, `pnum`, titling figures (`titl`), `frac`, `sups`/`subs`/`sinf`, `ordn`, `zero`, `case`.
- **Stylistic sets, working:** `ss01` serifed I, `ss02` simple a g l, `ss03` simple a, `ss04` simple g, `ss05` simple l, `ss06` serifed a, `ss09` capital figures, `ss10` dotted zero. `cv01`–`cv05` and `cv17`–`cv19` offer the same alternates one character at a time, and `salt` offers them together. The full font's `ss07`, `ss08` and `cv06`–`cv16` act only on characters outside the subset and are gone.
- **Discretionary ligatures (`dlig`):** þ + at/æt/et becomes the medieval abbreviation ꝥ ("that"), and Þ the same as Ꝥ. `hlig` offers the same thorn ligatures on their own. And **"she" and "he" become one glyph the font names `t_h_e_y`, "her", "his" and "hers" another named `t_h_e_i_r`**: an invented, single character, not the spelled-out word. It is a gender-neutral third-person pronoun, the same idea as Swedish [*hen*](https://en.wikipedia.org/wiki/Hen_(pronoun)), but one that exists only in writing. Designer Sarah Gephart drew it in 2018 as an independent project on Source Sans Pro, set to replace he, she, his, her and hers automatically; Paul Hunt, the Adobe designer of Source Sans, then added it to the family as a discretionary ligature ([AIGA Eye on Design](https://eyeondesign.aiga.org/do-gender-neutral-pronouns-need-their-own-glyphs/)). Four punctuation sequences (`.-(`, `.-)`, `!-)`, `?-(`) are also ligated under `dlig`; what they are meant for isn't identified here. Nothing on the site enables `dlig`, and turning it on over running text would rewrite every "he" and "she".
- ⚠ **Source Sans italic has no small caps at all**, in the subset or in the full italic font. `font-variant-caps: small-caps` on italic text gives synthesized small caps, unless `font-synthesis-small-caps: none` is set.

One consequence of the fallback faces ([[Layout shift]]): Georgia, behind Source Serif, has **old-style figures by default**, so a heading's digits change style, not just font, for the moment before the web font arrives.

Raw source: `src/_raw/dev-notes/How the fonts' OpenType features were inventoried.md`
