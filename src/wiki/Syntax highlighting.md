---
description: "How a static site colors its code blocks at build time with Prism, and what happens to a fence whose language the highlighter has never heard of."
date: 2026-08-23
---

Syntax highlighting on a static site is a build-time job. The markdown processor hands each fenced code block to a highlighter, which wraps the interesting substrings in `<span class="token …">` elements; a stylesheet colors those classes. No JavaScript reaches the browser, and the highlighting is part of the HTML.

[Prism](https://prismjs.com) is the usual choice for this. Two things about how it is packaged matter more than they look:

- **Every language is a separate component.** `prismjs` on its own knows almost nothing; `prism-ruby`, `prism-toml`, and the rest are loaded individually. Integrations like [`markdown-it-prism`](https://github.com/jGleitz/markdown-it-prism) do this on demand, so naming a language in a fence is all the registration a language needs.
- **A language Prism doesn't have fails quietly.** There is no error and no warning. The integration falls back to a configured default, and the block renders as escaped text in a `<pre>` that looks deliberate. This is the failure mode to watch for, because an unhighlighted block and a block you chose not to highlight are indistinguishable on the page.

Some Prism languages are more than a grammar. The [markup-templating](https://prismjs.com/plugins/markup-templating/) mechanism handles languages that interleave a template syntax with HTML — PHP, EJS, Handlebars, Django/Jinja2. It registers a `before-tokenize` hook that lifts the template delimiters out into placeholders, tokenizes **the remainder as markup**, and puts them back. That hook is keyed on the language *name*, not the grammar object, so borrowing such a grammar under a different name silently gets you the worse half of it: the `{% … %}` highlighted, the surrounding HTML not.

## Auditing which blocks are highlighted

Counting fence tags across a content tree is a one-liner, with one trap in it:

```
grep -rhoE '^```[a-zA-Z0-9+-]*' src/posts src/wiki | sort | uniq -c | sort -rn
```

A closing fence is also a line of three backticks, so the count for the empty tag is mostly *closers*, not untagged blocks. Track the open/close state to count real bare fences.

An untagged block is often correct. Terminal sessions mixing a command with its output, ASCII diagrams with pointer lines, error text, and tabular data all render worse tagged than bare — `bash` colors the output as if it were commands, and a diagram's `│` and `←` tokenize as operators.

## In jedee

Markdown fences go through `markdown-it-prism`, configured in `src/_config/plugins/markdown.js` with `defaultLanguage: 'plaintext'`. `plaintext` is not a Prism grammar either, so the fallback path emits `class="language-plaintext"` and no tokens at all — deliberate for bare fences, invisible when it happens by accident.

It happened by accident to every ` ```njk ` fence, 15 of them, almost all on wiki pages quoting layouts. **Prism has no Nunjucks grammar.** Every one of them had been rendering flat while the `js` and `css` blocks beside them were colored.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/syntax-njk-vs-jinja2.png" alt="The same three lines of Nunjucks in two code panels, laid out identically. The upper panel is a single flat gray, every character the same color. In the lower panel the if and endif keywords are violet italics, the variable names and the h2 tag name are crimson, the class attribute name is blue, and the braces and percent signs are gray." width="1400" height="638">
  <figcaption>The same fence, above as it rendered for fifteen blocks and below after the rewrite. The upper panel is not broken-looking — it is simply a code block, which is why nobody noticed.</figcaption>
</figure>

That is the whole difficulty in one picture. Nothing about the flat block says *failure*; it says *plaintext*, which is a legitimate thing for a fence to be. The two are only distinguishable side by side, and only ever became visible because a colored `js` block happened to sit next to one.

The mockup is `src/wiki/_sources/syntax-highlighting.html`. Its two panels are the literal output of `markdownLib.render()` for the same source string, pasted in, and it links the site's compiled `global.css` so the token colors are `code.css`'s own rather than a copy of them. Regenerate the two panels with the one-liner at the foot of this page; `npm run mockups` re-shoots it. ⚠ The size and `white-space` have to be forced onto every descendant of both `<pre>`s: `code.css` sizes `code` as well as `pre`, and left alone the highlighted half wrapped where the flat half did not — a difference in line breaks that has nothing to do with the finding.

The fix leans on `jinja2` (an alias of Prism's `django`), whose delimiters are Nunjucks' delimiters. Aliasing the grammar directly — `prism.languages.njk = prism.languages.jinja2` — is the version that looks right and reads wrong, because it skips the markup-templating hook described above and leaves the HTML around the tags as undifferentiated `token operator` / `token variable`. What works is rewriting the fence's language before Prism sees it, so the name stays `jinja2`:

```js
// Prism has no Nunjucks grammar, so ```njk fences are rendered as jinja2 — close enough, and it highlights the surrounding HTML too. Must run before markdown-it-prism.
.use(md => {
  md.core.ruler.push('njk_as_jinja2', state => {
    for (const token of state.tokens) {
      if (token.type === 'fence' && token.info.trim() === 'njk') token.info = 'jinja2';
    }
  });
})
```

The block's class becomes `language-jinja2`; nothing depends on the language class, since `code.css` styles `.token.*` generically.

The audit behind the fix found every other tag in use — `js`, `css`, `json`, `html`, `markdown`, `yaml`, `toml`, `python`, `bash`, `jinja2` — already mapped to a real grammar, and the 13 genuinely bare fences all correctly bare.

**EE stock vs jedee:** `markdown-it-prism`, the `plaintext` default, and the `.token.*` colors in `code.css` are Eleventy Excellent stock. The `njk_as_jinja2` core rule is jedee's own. `@11ty/eleventy-plugin-syntaxhighlight` is also registered (EE stock) but serves the `{% highlight %}` template shortcode, which nothing in the repo uses; markdown fences never touch it.

**Verify by rendering, not by reading.** The markdown pipeline is importable on its own, so a change can be checked in a second without a build:

```
node -e "import('./src/_config/plugins/markdown.js').then(m => console.log(m.markdownLib.render('\`\`\`njk\n{% if x %}<a href=\"{{ y }}\">z</a>{% endif %}\n\`\`\`')))"
```

Related: [[The interlinker's second render pass]] — the other thing in this pipeline that rewrites content mid-build, and a reminder that markdown plugin order is load-bearing. [[Wikilinks]] — the interlinker deliberately ignores wikilinks inside code blocks, the other place fenced content gets special treatment.

Raw source: `src/_raw/dev-notes/How njk code blocks got syntax highlighting.md`
