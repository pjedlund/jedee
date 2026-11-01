---
description: "Why a link checker that scans source instead of rendered output reports things that were never links, and how an all-false-positive report hid a real defect on stomme."
date: 2026-08-03
updated: 2026-10-31
---

A link checker finds the links in a site and verifies that their targets exist. There are two places to do it, and the choice decides which mistakes the checker is capable of making.

**Scanning the rendered output** — the built HTML, or a crawl of the live site — sees exactly what a reader sees. Every match is a real anchor that a real person can click. The costs are that it needs a finished build, it is slower, and it runs too late to feed anything back into the build: you cannot compute a backlink graph from output that has already been written.

**Scanning the source** is what build-time plugins do, because it is cheap and it happens early enough to be useful. Finding every link before rendering is what makes backlinks possible at all — once you know every link, you also know every page pointing at a given page, for free.

The catch is that **raw source is not the final document**, and two things in it look like links without being links:

- **Code samples.** A technical site quotes configuration and code, and those routinely contain the exact character sequences a link matcher looks for. `[[plugins]]` is a TOML array-of-tables. `[['default', fn]]` is a nested JavaScript array. An HTML example contains `href="/…"` attributes that were never meant to resolve. A page explaining a link syntax is the worst case, because its examples are by definition well-formed links.
- **Template expressions.** `href="/tags/{{ tag }}/"` is not a path yet. At scan time it is a literal string containing braces, and there is no page at that literal path — nor will the checker ever see the real one, since rendering happens later.

Neither is a bug in the matcher. Both are structural consequences of reading source rather than output, and any source-scanning checker will hit them.

## The report is the whole product

A checker's value is entirely signal-to-noise, and this is easy to get backwards. A report that is 100% false positives is not a *weak* report. It is **equivalent to having no report**, and strictly worse than none, because it is usually documented somewhere as the safety net for exactly the mistake it is failing to catch. Nobody reads the fourteenth line of a list whose first thirteen lines are known to be wrong.

The sharper danger is that false positives conceal false negatives. If detection is producing phantom links, those phantom links are also feeding whatever *else* detection drives — a backlink graph, a sitemap, a redirect map — and a wrong entry there is a real defect sitting quietly behind a wall of warnings everyone has learned to ignore. This is not hypothetical; see below.

**So the fix for a noisy checker is not to lower its severity or filter its output at the reading end.** It is to stop detecting the things that were never links, so that the report returns to zero and the next line to appear in it is worth acting on.

## In stomme

`@photogabble/eleventy-plugin-interlinker` scans source, with two separate parsers and two regexes:

```js
wikiLinkRegExp    = /(?<!!)(!?)\[\[([^|\n]+?)(\|([^\n]+?))?]]/g   // wikilink-parser.js
internalLinkRegex = /href="\/(.*?)"/g                             // html-link-parser.js
```

Left alone, the plugin's regexes report false positives in the console: TOML tables and JS arrays quoted in fenced blocks, prose examples such as those on [[Wikilinks]], an href inside a fenced HTML example, and the un-rendered `href="/tags/{{ tag | slugify }}/"` from `src/common/tags.njk`.

**Rendering was never wrong.** markdown-it resolves backticks before the plugin's inline rule, so a wikilink inside a code span never reaches the renderer and comes out as literal `[[text]]`, which is what an example should be. Only detection was wrong — which is why nothing looked broken.

### The defect it was hiding

Detection also drives backlinks. A wikilink written inside backticks as a code example must not count: if detection ignores the backticks, it is taken for a real link, and the page it points to renders a Backlinks nav pointing at a wiki URL. The warning count alone cannot show this, so diff the whole built site against a baseline.

### The fix

`src/_config/plugins/interlinker-ignore-code.js` removes what cannot be a link before either parser runs:

```js
export const stripCode = markdown =>
  markdown.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '\n').replace(/(`+)[^`\n]*?\1/g, ' ');

export const stripTemplatedHrefs = markdown =>
  markdown.replace(/href="\/[^"]*\{[{%][^"]*"/g, 'href="#"');
```

Three details carry weight. Fences are stripped first, so the inline pass cannot chew into one. Inline spans are bounded to a **single line** — an unpaired backtick in prose would otherwise pair with the next one paragraphs away and silently swallow every real wikilink in between, costing backlinks with nothing to show for it. And replacements are whitespace rather than deletions, so text on either side cannot be glued into a match nobody wrote.

**This is a monkey-patch of plugin internals, not a supported hook.** Three things about it are worth knowing before touching it:

1. **The resolver is the wrong place**, which is where the work started. A resolving function decides how to *render* a link that has already been found — it runs after detection and after the dead link has been recorded, so it cannot suppress anything. See [[Wikilinks]] for what the resolver legitimately does.
2. **A deep import throws.** `import … from '@photogabble/eleventy-plugin-interlinker/src/wikilink-parser.js'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`: the package's `exports` map publishes only `./index.js`, which does not re-export the parser classes. Loading them by *file path* works, because `exports` constrains package specifiers and not file URLs — and it resolves to the same absolute path the plugin imports internally, so it is the same module instance and the prototype patch is visible to the plugin.
3. **There are two parsers.** Patching only the wikilink one took 13 warnings to 3; the rest were `href=` matches from `HTMLLinkParser`, blind in exactly the same way.

The patch throws a named error if `find` is ever missing, so an interlinker upgrade fails loudly rather than quietly reverting to noise. **Re-check it on any version bump.** Covered by `tests/wikilink-ignore-code.test.js`.

### Verification, and one standing caveat

The built output was the check, not the warning count: after code stripping, every page should be byte-identical to the baseline except a page that had gained backlinks from wikilinks inside code, which lose them; after templated hrefs, every page should be identical, and tag links still render and resolve. The dead-link warnings should go to 0.

⚠ **The plugin reads a page's *body* only — front matter is never scanned.** So wikilinks in front matter (a jam's artist or genre, for instance) are not detected, produce no backlink and never appear in the report. Counting "wikilinks on the site" by grepping files overstates what the plugin actually sees.

See also [[The interlinker's second render pass]] — the same plugin's other structural surprise, where link resolution is coupled to render timing.
