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

**EE stock vs jedee:** `markdown-it-prism`, the `plaintext` default, and the `.token.*` rules in `code.css` are Eleventy Excellent stock; the color values they point at are jedee's (see Colors). The `njk_as_jinja2` core rule is jedee's own. `@11ty/eleventy-plugin-syntaxhighlight` is also registered (EE stock) but serves the `{% highlight %}` template shortcode, which nothing in the repo uses; markdown fences never touch it.

**Verify by rendering, not by reading.** The markdown pipeline is importable on its own, so a change can be checked in a second without a build:

```
node -e "import('./src/_config/plugins/markdown.js').then(m => console.log(m.markdownLib.render('\`\`\`njk\n{% if x %}<a href=\"{{ y }}\">z</a>{% endif %}\n\`\`\`')))"
```

### Colors

The token colors are Eleventy Excellent's palette with jedee's lightness. EE's `code.css` names its variables by hue: orange 30°, indigo 260°, violet 314°, pink 350°, a gray, and a blue borrowed from `--color-secondary`. The `.token.*` rules map Prism's token types onto them. jedee kept every hue except blue and changed saturation and lightness per theme to clear WCAG AA against the code block background (commit `ce80897`, 2026-03-08); the two values that had failed are commented in `code.css`.

⚠ The palette is **not** derived from GitHub's color-blind themes, although the style guide said so from 2026-09-10 until this check. GitHub's *protanopia and deuteranopia* themes (`light_colorblind` and `dark_colorblind` in [Primer's primitives](https://github.com/primer/primitives)) start from the default syntax colors and swap out exactly the ones red–green color-blind readers confuse:

| Token | GitHub dark | GitHub dark, color-blind | jedee dark |
| --- | --- | --- | --- |
| keyword (`if`, `return`) | red `#ff7b72` | orange `#f0883e` | violet |
| HTML tag | green `#7ee787` | light blue `#a5d6ff` | pink, 350° |
| constant | blue `#79c0ff` | blue `#79c0ff` | pink |
| class name | purple `#d2a8ff` | purple `#d2a8ff` | orange |

The light themes follow the same pattern: keyword `#cf222e` becomes `#bc4c00`, and a regular expression `#116329` becomes `#0550ae`. The rule to take from it is to keep red and green out of any pair that has to be told apart, and let blue and orange carry the difference. jedee's pink tags are the red GitHub removes.

How much that matters was measured rather than assumed. Each palette was run through [Machado et al.'s 2009 simulation](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) of full protanopia and deuteranopia, with jedee's translucent colors first composited over the code block background, and every pair of token colors compared by distance in OKLab (×100, where about 2 is the smallest difference most people can see):

| Palette | Weakest pair, protanopia | Weakest pair, deuteranopia |
| --- | --- | --- |
| jedee dark | indigo / violet 8.4 | pink / gray and violet / gray 6.0 |
| GitHub dark, color-blind | class name / constant 3.2 | class name / constant 2.3 |
| jedee light | blue / violet 5.8 | violet / gray 5.9 |
| GitHub light, color-blind | tag / class name 2.3 | tag / class name 2.4 |

By this measure jedee's palette keeps its colors further apart than GitHub's color-blind themes do; both of GitHub's put a blue next to a purple that the simulation nearly merges. Two limits: the simulation models the most severe form of each condition, and a distance says nothing about which colors a reader with the condition finds comfortable. Reworking jedee's palette toward GitHub's is planned (TODO §33), and the check that produced the table is kept, local-only, at `_local/design/cvd-check.mjs`.

### Inline code

Inline code never reaches Prism. A backtick span is a markdown-it `code_inline` token with no language, so the only thing that styles it is `code.css`. jedee sets it as a raised chip, after the inline code on [arielsalminen.com](https://arielsalminen.com/2026/progressive-web-components/): a surface a shade off the page, rounded corners, and a very faint shadow. Her four values, swapped for jedee tokens:

| Ariel | jedee |
| --- | --- |
| `background: var(--color-surface)` | `--color-bg-accent` mixed halfway toward `--color-bg`, since the plain surface read too strong in both themes |
| `border-radius: var(--border-radius)` | `--border-radius-medium`, the same radius as a code block |
| `box-shadow: var(--box-shadow-dimmed)` | `--box-shadow-chip`, and `-chip-dark` on the dark theme, a new pair in `shadows.json`, smaller than `popup` |
| `padding: .188rem .5rem` | `--space-3xs --space-xs` |
| `font-size: 75%` | unchanged: `code` already sets `--size-step-min-1`, about 80% of body text |

```css
:where(:not(pre)) > code {
  --inline-code-bg: color-mix(in oklab, var(--color-bg-accent) 50%, var(--color-bg));
  --inline-code-shadow: var(--box-shadow-chip);

  padding: var(--space-3xs) var(--space-xs);
  border-radius: var(--border-radius-medium);
  background-color: var(--inline-code-bg);
  box-shadow: var(--inline-code-shadow);
}
```

The code text shares the prose baseline because nothing moves it: no `vertical-align`, no offset. ⚠ Eleventy Excellent's version of this rule nudges inline code up with `position: relative; top: -0.05em`, the one declaration that would take it off the baseline; jedee had already dropped it. The chip also stays `display: inline`. Measured, `inline-block` keeps the text on the baseline too, since an inline-block's baseline is its last line of text; what changes is that the vertical padding then counts toward the line's height (the test paragraph grew 0.84px), and a long span can no longer wrap onto the next line. The selector is EE's, and so was the plain `0.1em 0.4em` padding it replaces. The chip is jedee's own.

Related: [[The interlinker's second render pass]] — the other thing in this pipeline that rewrites content mid-build, and a reminder that markdown plugin order is load-bearing. [[Wikilinks]] — the interlinker deliberately ignores wikilinks inside code blocks, the other place fenced content gets special treatment.

Raw source: `src/_raw/dev-notes/How njk code blocks got syntax highlighting.md`
