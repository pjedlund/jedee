---
description: "The abbr element and the markdown syntax for it; in jedee one glossary in directory data feeds every wiki page, and why the data key must not be called `abbreviations`."
date: 2026-09-07
---

`<abbr title="Cumulative Layout Shift">CLS</abbr>` marks a shortened form and carries its expansion. The element is old and uncontroversial; what it is worth is not.

The expansion rides in a `title` attribute, and `title` is the least reliable way to say anything on the web — it never appears on touch, most browsers never surface it to keyboard users, and its delay, styling and truncation belong to the operating system. [[Tooltips]] covers that in full. So `<abbr>` is a convenience for someone with a pointer, not a mechanism anyone can depend on. [WCAG 3.1.4 Abbreviations](https://www.w3.org/WAI/WCAG22/Understanding/abbreviations.html) (Level AAA) asks for *a* mechanism to find the expanded form, and expanding on first use in the prose is the one that always works. `<abbr>` is the cheap second layer under it, not a substitute.

There is no `<abbr>` in markdown. [markdown-it-abbr](https://github.com/markdown-it/markdown-it-abbr) adds the PHP Markdown Extra syntax — a definition line anywhere in the document, and every matching word in the body is wrapped:

```markdown
FOFT is a font-loading strategy.

*[FOFT]: Flash of Faux Text
```

Two properties of that plugin decide how it is best used. It rewrites only `text` tokens, so a code span or a fenced block is never touched — `process.env.TZ` in a sample stays plain while `TZ` in a sentence does not. And it wraps *every* occurrence, not the first, which makes a common abbreviation a row of dotted underlines down the page. The selection of what to define is therefore the whole design decision.

## In jedee

`markdown-it-abbr` is Eleventy Excellent stock: it is already in the markdown pipeline (`src/_config/plugins/markdown.js`), and `abbr[title]` is already styled in `base/global-styles.css` with a 2px dotted underline and `cursor: help`. Neither had ever been used by the wiki. The only definition in the repo was a `*[WAV]:` line at the bottom of one audio post.

Definitions are per-document, which is the wrong shape for a wiki of fifty pages and growing. jedee's addition is one glossary in the wiki's directory data, `src/wiki/wiki.11tydata.js`:

```js
glossary: {
  ARIA: 'Accessible Rich Internet Applications',
  BCP: 'Best Current Practice',
  CLS: 'Cumulative Layout Shift',
  // … 31 in total
}
```

and one preprocessor in `eleventy.config.js` that turns it into definition lines on the way past:

```js
eleventyConfig.addPreprocessor('glossary', 'md', (data, content) => {
  if (!data.glossary) return;
  const defs = Object.entries(data.glossary).map(([short, long]) => `*[${short}]: ${long}`);
  return `${content}\n\n${defs.join('\n')}`;
});
```

It is registered for all markdown but gated on `data.glossary`, and only `src/wiki/` sets that key. Appending at the end is safe: `abbr_def` is a block rule and the replacement is a core rule that runs after every block is parsed, so a definition never has to precede its use.

The glossary holds opaque jargon only — FOFT, POSSE, PESOS, DTCG, CUBE, EXIF, RDFa, BCP, OOM, FIT and the rest. CSS, HTML, JS, JSON, API, URL and DOM are deliberately left out, and so is EE: "CSS" alone appears 192 times across these pages, and 192 dotted underlines is noise rather than help. 31 terms produce 179 elements across the built wiki.

### ⚠ The data key must not be called `abbreviations`

The first version of this named the key `abbreviations`. The build was green and most abbreviations were correct, but [[Layout shift]] also carried fifteen of these:

```html
<abbr title="undefined">A</abbr> tall container nudged a few pixels …
```

Eleventy's markdown engine calls `md.render(str, data)`, so **the page's whole data object is markdown-it's `env`**. markdown-it-abbr keeps its definitions in `env.abbreviations`, prefixing every key with `:` to avoid `Object.prototype` collisions. A data key of that name is not merely visible to the plugin — it *is* the plugin's store.

The replacement step builds its match pattern by stripping that prefix back off, then looks each match up again with the prefix restored:

```js
Object.keys(state.env.abbreviations).map(x => x.substr(1))   // ':CLS' → 'CLS'
// …
token_o.attrs = [['title', state.env.abbreviations[':' + m[2]]]]
```

Against an unprefixed glossary, every key is read one character short: `UA` becomes the pattern `A`, `TZ` becomes `Z`, `OG` becomes `G`. The lookup then misses, and the title serializes as the string `undefined`. Every standalone "A" in the prose was wrapped.

What made it hard to see is that the site's own definitions still worked. The preprocessor's `*[FOFT]: …` lines were parsed into the same object *with* the `:` intact, so FOFT, CLS and the rest resolved correctly next to the broken single letters, and the page looked mostly right.

Renaming the key is the whole fix. The general form is worth carrying: **a markdown-it plugin's per-render state shares an object with the page data**, so a front-matter or directory-data key can silently drive a plugin that never heard of it. Check which `env.*` keys a plugin claims before naming a data key. It is the same class of surprise as [[The interlinker's second render pass]] — a markdown-it plugin reaching further into the build than its own syntax suggests.

Raw source: `src/_raw/dev-notes/How the wiki gets its abbr elements.md`
