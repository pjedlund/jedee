---
description: "Using Tailwind as a compiler that turns design tokens into CSS custom properties rather than as a utility framework — the CUBE boilerplate inversion, and what actually survives into the stylesheet."
date: 2026-09-05
updated: 2026-10-31
---

[Tailwind CSS](https://tailwindcss.com/) is normally used by writing its utility classes in markup — `class="mt-4 flex items-center"` — and letting it emit only the classes it finds. Its config file is a secondary thing: a place to declare the values those utilities are built from.

Andy Bell's [CUBE CSS boilerplate](https://github.com/Set-Creative-Studio/cube-boilerplate) inverts that. The config becomes the point and the utilities become optional. Tailwind is fed a set of design tokens, and a config plugin walks the resolved theme and writes every value out as a CSS custom property on `:root`. What comes out is a token stylesheet — `--color-*`, `--space-*`, `--size-*` — that ordinary hand-written CSS then consumes with `var()`. Tailwind never sees a hand-written selector, and the markup can contain no Tailwind classes at all.

The reason to do it this way rather than write the custom properties by hand is that the token values need to exist in two forms. A build step already needs them as data (to generate palettes, to export to a design tool, to compute fluid `clamp()` pairs), and the browser needs them as CSS. Tailwind's config is a convenient place for the data to live, and its plugin API is a convenient way to emit the CSS.

Andy Bell's argument for it is that Tailwind generates utilities **on demand**, where the earlier tools he used and wrote generated every utility up front and bloated the output. He is candid about the seam: routing the `:root` token block through `addComponents` so it lands on Tailwind's components layer is, in his words, "a bit of a hack". Both of the sources below are worth reading in full — his [A CSS project boilerplate](https://piccalil.li/blog/a-css-project-boilerplate/) (2024-02-12) is the detailed one, and Lene Saile's [What is Tailwind CSS doing here?](https://eleventy-excellent.netlify.app/blog/what-is-tailwind-css-doing-here/) (2023-11-30) is the short answer written for people who had just discovered their Tailwind classes did not work.

This surprises people, which is why Eleventy Excellent ships that post: normal Tailwind classes do not work on a site built this way, and that looks like a broken install rather than a deliberate configuration.

## What the configuration actually does

Three settings do the inverting, all of them in `tailwind.config.js` (Andy Bell's original lines; stomme's `corePlugins` also switches off `fontVariantNumeric`, covered below):

```js
corePlugins: {preflight: false, textOpacity: false, backgroundOpacity: false, borderOpacity: false},
blocklist: ['container'],
experimental: {optimizeUniversalDefaults: true}
```

`preflight: false` removes Tailwind's reset, because the project brings one. The three `*Opacity` plugins are off because they wrap every color in a `rgb(… / var(--tw-*-opacity))` expression, which is unusable as a plain token value. `optimizeUniversalDefaults` suppresses the block of empty `--tw-*` custom properties Tailwind otherwise emits on every element; it is an experimental flag, and Tailwind prints a warning about that on every build.

Then a plugin turns the theme into custom properties:

```js
plugin(function ({addComponents, config}) {
  // groups: colors→color, borderRadius→border-radius, spacing→space, fontSize→size, …
  groups.forEach(({key, prefix}) => {
    Object.keys(currentConfig.theme[key]).forEach(k => {
      result += `--${prefix}-${k}: ${currentConfig.theme[key][k]};`;
    });
  });
  addComponents({':root': postcssJs.objectify(postcss.parse(result))});
})
```

`addComponents` rather than a stylesheet, so the block lands in Tailwind's `components` output and can be placed in a cascade layer of the project's choosing.

A second plugin generates a small family of utilities that set CUBE CSS custom properties rather than declaring styles — `flow-space-*`, `region-space-*` and `gutter-*`, one class per spacing token. These are the exception to "no utility classes in markup": they exist so a composition's knob can be turned from a class instead of an inline style. See [[Configuring a layout composition]].

## Three authors, and who added what

The arrangement arrives here through two hands, and knowing which is which explains one of the findings below.

**Andy Bell** wrote it, in the Set Creative Studio [cube-boilerplate](https://github.com/Set-Creative-Studio/cube-boilerplate). His `tailwind.config.js` is the one stomme still runs, nearly line for line — the disabled preflight and opacity plugins, the blocklisted `container`, `optimizeUniversalDefaults`, the `variantOrder`, and both plugins. stomme's copy still carries his `© Andy Bell` header. But his `global.css` uses **plain `@import` with no `layer()` at all** — source order alone does the work, and the file says so. There are no cascade layers in the original.

**Lene Saile** adopted it into Eleventy Excellent and wrapped every import in a named cascade layer. That is what produced the `tailwindBase` / `tailwindComponents` / `tailwindUtilities` names — and, because the CUBE folders kept their bare names, the collision described below. It could not exist in Andy's version, since his version names no layers. She also inverted his first two imports: Andy loads `blocks` then `compositions`, EE loads `compositions` then `blocks`, so a block outranks a composition here and the reverse is true upstream.

**stomme** forked EE and replaced the token adapter (below), and diverged in one place worth knowing: Lene's EE grew a per-file `prefix` key, so a token file can name its custom-property prefix through a `tokenPrefixes` map. stomme's config predates that and hardcodes the prefixes in the `groups` array, so adding a token file means editing `tailwind.config.js` rather than the JSON.

## In stomme

stomme's divergence is the adapter between the tokens and the config. EE 4.0 flattens its token files with a `tokensToTailwind()` helper built around `slugify`; stomme's tokens are DTCG-conformant, so `src/_config/utils/dtcg-to-tailwind.js` replaces it with three functions that read the `$value` shape:

- `dtcgToTailwind()` — recursive, joining nested key paths with hyphens, skipping `$`-prefixed metadata. A node can be both a leaf and a group (`red` with a `subdued` child), so it recurses either way.
- `dtcgFluidToTailwind()` — same, but converts a fluid `{min, max}` pair into a `clamp()` string. Used for spacing and font sizes, which is how the Utopia scales reach the stylesheet.
- `dtcgShadowToTailwind()` — composes Penpot-shaped shadow layers into one `box-shadow` string, because the tokens are stored in Penpot's layered form and CSS is the derived shape. See [[Design token sync]].

Ten token files feed the config (`viewports`, `colors`, `borderRadius`, `borderWidth`, `shadows`, `spacing`, `fonts`, `textSizes`, `textWeights` and `textLeading`), read from the active theme's `tokens/` folder. A theme's other token files, such as `colorsBase`, `semanticColors`, `buttonColors`, `megamenuColors` and `typography`, feed the palette script (`create-colors.js`) and the Penpot, Figma and `DESIGN.md` exports instead. The output is what [[Undefined custom properties]] is about: every `var(--color-…)` in the hand-written CSS resolves against this block, and a name that is not in it fails silently.

Tailwind runs inside an Eleventy event rather than a separate build step — `src/_config/events/build-css.js` pipes each stylesheet through PostCSS with `postcss-import`, `tailwindcss`, `autoprefixer` and `cssnano`. Since EE 4.9.1, `postcss-import` expands the `*` in `@import 'compositions/*.css'` itself, through a `resolve` function that sorts Node's `fs.globSync` results; before that a separate `postcss-import-ext-glob` plugin and an `@import-glob` rule did it. The build writes `global.css` and every `local/*.css` into `src/_includes/css/`. There is no `postcss.config.js`; the plugin list lives in that file. (The generated output landing inside `_includes/` is the precondition for [[Watch loops]].)

### What actually survives — measured

The declared layer order in `global/global.css`:

```
tailwindBase → reset → fonts → tailwindComponents → variables →
global → compositions → blocks → cubeUtilities → tailwindUtilities → theme
```

In the compiled stylesheet, **`tailwindComponents` contains zero class selectors** — it is the `:root` token block and nothing else, which is the arrangement working as intended. `tailwindUtilities` is small, and the next paragraphs say why it holds more than the markup asks for.

A count of that layer is misleading by itself, because **most of what is in it was never written as a class**. Tailwind's `content` scan reads every file under `src/` as plain text and keeps any substring that *could* be a class name. Plenty of ordinary English words qualify — `block`, `hidden`, `italic`, `absolute`, `static`, `table`, `visible`, `collapse`, `contents`, `filter`, `outline`, `transform`, `truncate`, `uppercase`, `resize`, `isolate` — so writing prose about CSS generates CSS.

Checking each selector in that layer against every `class=""` attribute in a project sorts them into three groups:

- **Scanner noise.** Selectors that appear in no class attribute anywhere, picked up from prose and template comments. Excluding `src/wiki/` and `src/posts/` from the scan removes some of them, so a wiki's pages account for part of the layer.
- **Wiki code samples.** Selectors that exist only inside a page quoting a class, such as `.flex` and `.items-center` from this page quoting `class="flex items-center gap-4"` as the anti-pattern to avoid, and `.grid` from a snippet on [[Favicons]]. Writing about the anti-pattern emitted it.
- **The token utilities the setup exists to produce.** For example the CUBE-property families (`gutter-s`, `flow-space-m`, `region-space-m`), the type scale (`text-step-1`, `text-step-2`), spacing named for the tokens themselves (`mt-xl`, `mt-s-m`, `p-s-m`) and `font-base`.

The clearest demonstration is saving an article about Tailwind into `src/`: a responsive variant such as `.md\:text-right` appears in the layer, shipped to every visitor, because the article *names that class as an example* while explaining that responsive variants exist. Nobody wrote it in any markup. Clipping an article about Tailwind changes the CSS the site serves.

(Her point stands by itself, and is worth knowing: variants like `md:text-right` really are available here, because `screens` is wired to `viewports.json`.)

So the folk version — "Tailwind is imported but you don't write utility classes" — holds. Generic Tailwind utilities are not used in the shared templates at all; every genuine class in the layer is named after a design token, which is the sanctioned use. `.grid` and `.relative` are the near-misses, and both are coincidence: `.grid` is the CUBE *composition* of the same name and Tailwind's duplicate sets only `display: grid`, while `.relative` is one WebC component positioning an embed.

⚠ **A cascade layer must not be named `utilities` here, because Tailwind claims the name.** The layer is named `cubeUtilities`; what follows is what goes wrong under the other name and how it was found, because the trap applies to any layer called `base`, `components` or `utilities`. `@import 'utilities/*.css' layer(utilities)` should produce a ninth cascade layer between `blocks` and `tailwindUtilities`. The compiled file has no `@layer utilities` at all, and the hand-written utilities (`region`, `ontop`, `grayscale`, `visually-hidden` and the rest) come out *inside* `tailwindUtilities`, after Tailwind's rules.

The cause is a name collision, and it is Tailwind rather than the import plugins. Tailwind 3 has a **separate** `@layer` directive — `base`, `components`, `utilities` — which predates native cascade layers and means "put these rules in that bucket". It cannot tell a native `@layer utilities { … }` apart from its directive, so it swallows the block and hoists the rules into its utilities output. `compositions` and `blocks` survive precisely because Tailwind does not recognize those names.

Bisecting the PostCSS pipeline shows exactly where it happens: after the import plugins (`postcss-import-ext-glob` and `postcss-import` at the time) the layer is present (as one `@layer utilities` block per globbed file) and `tailwindUtilities` is empty; adding `tailwindcss` makes `utilities` vanish and `tailwindUtilities` grow by the same rules. Autoprefixer and cssnano change neither. Renaming the layer to anything Tailwind does not claim restores it — with `layer(cubeUtilities)` the compiled file carries `cubeUtilities` again and `tailwindUtilities` shrinks by the same rules, which move back where they were declared.

The consequence was an inverted precedence — merged into one layer, source order handed the win to the hand-written set, where two layers would have given it to Tailwind. In practice it changed nothing: comparing the two layers' selectors, **none is defined in both**, so there is no rule for the ordering to decide. The compiled stylesheet holds the same rules before and after the rename, with only their order changed. This is Eleventy Excellent stock CSS, so any EE site using the same `global.css` has the same latent trap.

**A hand-written utility that shares a name with a Tailwind core utility loses to it.** `utilities/numerals.css` defines `.tabular-nums`, `.lining-nums` and `.slashed-zero`. All three are also Tailwind `fontVariantNumeric` classes, and the content scan would generate Tailwind's versions from the markup that used them. `tailwindUtilities` is the last layer, so its `font-variant-numeric: var(--tw-ordinal) var(--tw-slashed-zero) …` replaced the hand-written value. `.fraction`, which is not a Tailwind name, was the only one of the four that worked. The fix is switching the plugin off in `corePlugins` (`fontVariantNumeric: false` in `tailwind.config.js`), which is safe as long as no markup relies on Tailwind's versions. Before naming a new utility, check it against Tailwind's class list. See [[Typographic conventions]].

The fix is one word — `@import 'utilities/*.css' layer(cubeUtilities)` — and the folder keeps its name, since only the *layer* label collides. The compiled stack then reads `… compositions → blocks → cubeUtilities → tailwindUtilities`, which is what `global.css` intends. To recheck it after a change to the imports, list the layer names in the compiled `global.css` and confirm `cubeUtilities` is there and non-empty.

**Tailwind's responsive variants end up outside every layer.** When the scan picks one up, such as the scanner-noise `md:text-right` from above, it appears in the compiled `global.css` as a top-level `@media (min-width:1000px){.md\:text-right{…}}` that isn't in a layer (check by parsing the file with PostCSS). An unlayered rule beats every layered one whatever its specificity, so a variant that real markup used would override the whole layer stack. Nothing in the shared templates uses one, so a variant that appears is scanner noise and does no harm.

Sources: Andy Bell, "A CSS project boilerplate" (2024-02-12) · Lene Saile, "What is Tailwind CSS doing here" (2023-11-30)
