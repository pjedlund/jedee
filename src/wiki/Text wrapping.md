---
description: "The two CSS text-wrap values that prevent widows in headings and paragraphs without JavaScript."
date: 2026-08-01
---

A **widow** (typography's term, loosely used) is a very short last line — usually one lone word — at the end of a paragraph or, most visibly, a heading. For most of the web's history there was no CSS for this; the standard fix was JavaScript that swapped the last space for a `&nbsp;` (the approach in [css-tricks' 2013 article](https://css-tricks.com/preventing-widows-in-post-titles/)). Two values of the CSS `text-wrap` property now solve it natively:

```css
h1 { text-wrap: balance; } /* even line lengths — headings, short blocks */
p  { text-wrap: pretty; }  /* better paragraph endings — running text */
```

- **`balance`** distributes words so every line of the block is roughly the same length. Browsers cap it at a handful of lines (~6–10), so it is for headings, pull quotes, and captions — not paragraphs. Especially good for centered headings.
- **`pretty`** optimizes where lines break with particular attention to the *end* of the block, preventing the lone last word. WebKit's implementation goes further and evaluates the whole paragraph ([their 2025 write-up](https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/)); Chromium's focuses on the last few lines. Use it on body copy.

Both, rendered in the site's own faces at the same measure. Each pair is one string set twice; the only thing that differs between the columns is the property.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/textwrap-balance.png" alt="The same heading twice at equal width. On the left, greedy wrapping leaves the word Machine alone on a third line. On the right, balance redistributes the words so all three lines are close to the same length." width="1398" height="398">
  <figcaption><code>balance</code> on a heading. Greedy wrapping strands <em>Machine</em>; balance evens the three lines instead.</figcaption>
</figure>

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/textwrap-pretty.png" alt="The same paragraph twice at equal width. On the left, greedy wrapping leaves the word entity alone on a fourth line. On the right, pretty pulls the preceding word down so the last line reads space entity." width="1398" height="386">
  <figcaption><code>pretty</code> on running text. Greedy strands <em>entity.</em>; pretty pulls a word down onto the last line, at the same line count.</figcaption>
</figure>

⚠ **A comparison like this is only worth anything if both columns are exactly the same width.** The first version of the specimen gave the right-hand column 24px of extra padding, which produced a confident-looking difference that was entirely the narrower measure — with the widths equalized, the two columns rendered identically. The pair widths above are swept rather than chosen: 300px is where these two strings actually diverge in Chrome 151, and changing the text means sweeping again. The mockup is `src/wiki/_sources/text-wrapping.html`; `npm run mockups` re-shoots it.

**Age note on the source.** The raw clip below dates from **2024-04**, when `balance` was everywhere except Safari and `pretty` existed only in Chrome and Opera. Those caveats are the article's main hedge and are obsolete: `balance` finished landing across the major browsers during 2024, `pretty` during 2025 ([caniuse](https://caniuse.com/?search=text-wrap)). Both are safe to ship unconditionally — where unsupported, text simply wraps the old greedy way, which is the state you were in anyway.

## In jedee

Both values are shipped, at four places in the cascade:

- `global/base/reset.css` — the broad defaults, in the `reset` layer: `* { text-wrap: pretty }` and `h1, h2, h3, h4 { text-wrap: balance }`. This is the whole site's baseline.
- `global/blocks/prose.css:39` — `.prose :is(p, li, dl, blockquote)` repeats `text-wrap: pretty` alongside the `60ch` measure. Redundant with the reset in effect, but it keeps the prose block's typographic decisions self-contained.
- `local/post.css:9` — `.intro` (the lede under a post title) gets `text-wrap: balance`: a short, display-adjacent block, so it takes the heading treatment rather than the paragraph one.
- `global/blocks/breadcrumb.css:68` — **the gotcha.** The current-page crumb must stay on one line, but the global `* { text-wrap: pretty }` reset re-enables wrapping *even against an explicit `white-space: nowrap`*. The block clamps with `-webkit-line-clamp: 1` instead, which wins where `nowrap` loses. Any future single-line truncation on this site has the same fight ahead of it — the reset's universal selector reaches everything.

**EE stock vs jedee:** the reset and `prose.css` declarations are Eleventy Excellent's stock typography. jedee's own additions are the `.intro` balance and the breadcrumb line-clamp workaround.

Related: [[Microformats]] — the other page where a universal-selector reset interacts with a specific block in a non-obvious way (there `margin: 0`, here `text-wrap`).

Raw source: `src/_raw/Prevent Widows in Post Titles with CSS.md` (Josh Crain, 2024-04-24) — the wiki's first external clip.
