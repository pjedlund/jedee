---
description: "Using Tailwind as a compiler that turns design tokens into CSS custom properties rather than as a utility framework — the CUBE boilerplate inversion, and what actually survives into the stylesheet."
date: 2026-09-05
---

[Tailwind CSS](https://tailwindcss.com/) is normally used by writing its utility classes in markup — `class="mt-4 flex items-center"` — and letting it emit only the classes it finds. Its config file is a secondary thing: a place to declare the values those utilities are built from.

Andy Bell's [CUBE CSS boilerplate](https://github.com/Set-Creative-Studio/cube-boilerplate) inverts that. The config becomes the point and the utilities become optional. Tailwind is fed a set of design tokens, and a config plugin walks the resolved theme and writes every value out as a CSS custom property on `:root`. What comes out is a token stylesheet — `--color-*`, `--space-*`, `--size-*` — that ordinary hand-written CSS then consumes with `var()`. Tailwind never sees a hand-written selector, and the markup can contain no Tailwind classes at all.

The reason to do it this way rather than write the custom properties by hand is that the token values need to exist in two forms. A build step already needs them as data (to generate palettes, to export to a design tool, to compute fluid `clamp()` pairs), and the browser needs them as CSS. Tailwind's config is a convenient place for the data to live, and its plugin API is a convenient way to emit the CSS.

Andy Bell's argument for it is that Tailwind generates utilities **on demand**, where the earlier tools he used and wrote generated every utility up front and bloated the output. He is candid about the seam: routing the `:root` token block through `addComponents` so it lands on Tailwind's components layer is, in his words, "a bit of a hack". Both of the sources below are worth reading in full — his [A CSS project boilerplate](https://piccalil.li/blog/a-css-project-boilerplate/) (2024-02-12) is the detailed one, and Lene Saile's [What is Tailwind CSS doing here?](https://eleventy-excellent.netlify.app/blog/what-is-tailwind-css-doing-here/) (2023-11-30) is the short answer written for people who had just discovered their Tailwind classes did not work.

This surprises people, which is why Eleventy Excellent ships [a post explaining it](https://eleventy-excellent.netlify.app/blog/what-is-tailwind-css-doing-here/): normal Tailwind classes do not work on a site built this way, and that looks like a broken install rather than a deliberate configuration.

## What the configuration actually does

Three settings do the inverting, all of them in `tailwind.config.js`:

```js
corePlugins: {preflight: false, textOpacity: false, backgroundOpacity: false, borderOpacity: false},
blocklist: ['container'],
experimental: {optimizeUniversalDefaults: true}
```

`preflight: false` removes Tailwind's reset, because the project brings its own. The three `*Opacity` plugins are off because they wrap every color in a `rgb(… / var(--tw-*-opacity))` expression, which is unusable as a plain token value. `optimizeUniversalDefaults` suppresses the block of empty `--tw-*` custom properties Tailwind otherwise emits on every element; it is an experimental flag, and Tailwind prints a warning about that on every build.

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

**Andy Bell** wrote it, in the Set Creative Studio [cube-boilerplate](https://github.com/Set-Creative-Studio/cube-boilerplate). His `tailwind.config.js` is the one jedee still runs, nearly line for line — the disabled preflight and opacity plugins, the blocklisted `container`, `optimizeUniversalDefaults`, the `variantOrder`, and both plugins. jedee's copy still carries his `© Andy Bell` header. ⚠ But his `global.css` uses **plain `@import` with no `layer()` at all** — source order alone does the work, and the file says so. There are no cascade layers in the original.

**Lene Saile** adopted it into Eleventy Excellent and wrapped every import in a named cascade layer. That is what produced the `tailwindBase` / `tailwindComponents` / `tailwindUtilities` names — and, because the CUBE folders kept their bare names, the collision described below. It could not exist in Andy's version, since his version names no layers. She also inverted his first two imports: Andy loads `blocks` then `compositions`, EE loads `compositions` then `blocks`, so a block outranks a composition here and the reverse is true upstream.

**jedee** forked EE and replaced the token adapter (below), and diverged in one place worth knowing: Lene's EE grew a per-file `prefix` key, so a token file can name its own custom-property prefix through a `tokenPrefixes` map. jedee's config predates that and hardcodes the prefixes in the `groups` array, so adding a token file means editing `tailwind.config.js` rather than the JSON.

## In jedee

jedee's own divergence is the adapter between the tokens and the config. EE 4.0 flattens its token files with a `tokensToTailwind()` helper built around `slugify`; jedee's tokens are DTCG-conformant, so `src/_config/utils/dtcg-to-tailwind.js` replaces it with three functions that read the `$value` shape:

- `dtcgToTailwind()` — recursive, joining nested key paths with hyphens, skipping `$`-prefixed metadata. A node can be both a leaf and a group (`red` with a `subdued` child), so it recurses either way.
- `dtcgFluidToTailwind()` — same, but converts a fluid `{min, max}` pair into a `clamp()` string. Used for spacing and font sizes, which is how the Utopia scales reach the stylesheet.
- `dtcgShadowToTailwind()` — composes Penpot-shaped shadow layers into one `box-shadow` string, because the tokens are stored in Penpot's layered form and CSS is the derived shape. See [[Design token sync]].

Fifteen token files feed the config. The output is what [[Undefined custom properties]] is about: every `var(--color-…)` in the hand-written CSS resolves against this block, and a name that is not in it fails silently.

Tailwind runs inside an Eleventy event rather than a separate build step — `src/_config/events/build-css.js` pipes each stylesheet through PostCSS with `postcss-import-ext-glob`, `postcss-import`, `tailwindcss`, `autoprefixer` and `cssnano`, writing `global.css` plus every `local/*.css` into `src/_includes/css/`. There is no `postcss.config.js`; the plugin list lives in that file. (The generated output landing inside `_includes/` is the precondition for [[Watch loops]].)

### What actually survives — measured

The declared layer order in `global/global.css`:

```
tailwindBase → reset → fonts → tailwindComponents → variables →
global → compositions → blocks → utilities → tailwindUtilities
```

Compiled, on 2026-09-05: **`tailwindComponents` is 3.0 KB and contains zero class selectors** — it is the `:root` token block and nothing else, which is the arrangement working as intended. `tailwindUtilities` holds 52 selectors.

A count of that layer is misleading on its own, because **most of what is in it was never written as a class**. Tailwind's `content` scan reads every file under `src/` as plain text and keeps any substring that *could* be a class name. Plenty of ordinary English words qualify — `block`, `hidden`, `italic`, `absolute`, `static`, `table`, `visible`, `collapse`, `contents`, `filter`, `outline`, `transform`, `truncate`, `uppercase`, `resize`, `isolate` — so writing prose about CSS generates CSS.

Checking each of the 52 against every `class=""` attribute in the project:

- **28 appear in no class attribute anywhere.** Scanner noise, from prose and template comments. Excluding `src/wiki/`, `src/_raw/` and `src/posts/` from the scan drops the layer from 52 to 42, so this wiki's own pages account for ten of them.
- **Three exist only inside wiki code samples**: `.flex` and `.items-center` come from this page quoting `class="flex items-center gap-4"` as the anti-pattern to avoid, and `.grid` from a snippet on [[Favicons]]. Writing about the anti-pattern emitted it.
- **The rest are the token utilities the setup exists to produce.** The three CUBE-property families (`gutter-s`, `gutter-xs-s`, `gutter-2xs`, `gutter-3xs`, `gutter-xs`, `flow-space-m`, `region-space-m`), the type scale (`text-step-1` in twelve files, `text-step-min-1` in eight, plus `-2`, `-4`, `min-2`), spacing named for the tokens themselves (`mt-xl`, `mt-s-m`, `mt-l-xl`, `my-s-m`, `p-s-m`), `font-base`, and a couple of alignment helpers (`justify-center`, `text-center`).

The clearest demonstration arrived by accident. Saving these two source articles into `src/_raw/` on 2026-09-05 took the layer from **52 selectors to 55**, and one of the new ones is `.md\:text-right` — a responsive variant, shipped to every visitor, generated because Lene's article *names that class as an example* while explaining that responsive variants exist. Nobody wrote it in any markup. Clipping an article about Tailwind changed the CSS the site serves.

(Her point stands on its own, and is worth knowing: variants like `md:text-right` really are available here, because `screens` is wired to `viewports.json`.)

So the folk version — "Tailwind is imported but you don't write utility classes" — holds. Generic Tailwind utilities are not used in this project's markup at all; every genuine class in the layer is named after a design token, which is the sanctioned use. `.grid` and `.relative` are the near-misses, and both are coincidence: `.grid` is the CUBE *composition* of the same name and Tailwind's duplicate sets only `display: grid`, while `.relative` is one WebC component positioning an embed.

⚠ **A cascade layer must not be named `utilities` here, because Tailwind claims the name.** Fixed on 2026-09-05 by renaming it `cubeUtilities`; what follows is what went wrong and how it was found, because the trap applies to any layer called `base`, `components` or `utilities`. `@import-glob 'utilities/*.css' layer(utilities)` should produce a ninth cascade layer between `blocks` and `tailwindUtilities`. The compiled file has no `@layer utilities` at all, and the six hand-written utilities (`region`, `ontop`, `grayscale`, `heading-line`, `visually-hidden`, `spin`) come out *inside* `tailwindUtilities`, after Tailwind's own rules.

The cause is a name collision, and it is Tailwind rather than the import plugins. Tailwind 3 has its **own** `@layer` directive — `base`, `components`, `utilities` — which predates native cascade layers and means "put these rules in that bucket". It cannot tell a native `@layer utilities { … }` apart from its own directive, so it swallows the block and hoists the rules into its utilities output. `compositions` and `blocks` survive precisely because Tailwind does not recognise those names.

Bisecting the PostCSS pipeline shows exactly where it happens: after `postcss-import-ext-glob` + `postcss-import` the layer is present (as six `@layer utilities` blocks, one per globbed file, 9 rules in total) and `tailwindUtilities` is empty; adding `tailwindcss` makes `utilities` vanish and `tailwindUtilities` jump to 61 rules. Autoprefixer and cssnano change neither. Renaming the layer to anything Tailwind does not claim restores it — with `layer(cubeUtilities)` the compiled file carries `cubeUtilities` at 9 rules and `tailwindUtilities` drops to 52, which is the same 9 rules moving back where they were declared.

The consequence was an inverted precedence — merged into one layer, source order handed the win to the hand-written set, where two layers would have given it to Tailwind. In practice it changed nothing at all: comparing the two layers' selectors after the fix, **not one is defined in both**, so there was never a rule for the ordering to decide. The compiled stylesheet holds the same 305 rules before and after the rename, with only their order changed. This is Eleventy Excellent stock CSS, so any EE site using the same `global.css` has the same latent trap.

The fix is one word — `@import-glob 'utilities/*.css' layer(cubeUtilities)` — and the folder keeps its name, since only the *layer* label collides. The compiled stack now reads `… compositions (21) → blocks (166) → cubeUtilities (9) → tailwindUtilities (52)`, which is what `global.css` intended all along.

(An earlier version of this page also claimed Tailwind's responsive variants escape the layers entirely. That was wrong — an artifact of counting braces by hand across an escaped `\:` selector. Parsed with PostCSS, the compiled stylesheet has **zero** top-level nodes outside a layer; the trailing `@media (min-width:1000px){.md\:text-right{…}}` sits inside `tailwindUtilities` like everything else.)

Raw sources: `src/_raw/A CSS project boilerplate.md` (Andy Bell, 2024-02-12) · `src/_raw/What is Tailwind CSS doing here.md` (Lene Saile, 2023-11-30) · `src/_raw/dev-notes/How Tailwind is used as a token engine.md` (this site's own measurements)
