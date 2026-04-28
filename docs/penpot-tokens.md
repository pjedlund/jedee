# Penpot tokens

How the design tokens in `src/_data/designTokens/` are pushed into the
**JEDEE - design tokens** file on [design.penpot.app](https://design.penpot.app).

## TL;DR

```bash
npm run penpot:tokens
```

That writes two files from the same JSON sources:

- `tokens/penpot-tokens.dtcg.json` — import in Penpot
  (JEDEE - design tokens file → **Tokens panel** → import)
- `docs/DESIGN.md` — Anthropic-style design-system spec for AI agents
  and humans (front matter is regenerated; the markdown body is
  preserved verbatim — humans own the prose, the script owns the tokens)

To regenerate only one of the two:

```bash
npm run design:md      # only DESIGN.md
# or run the penpot script directly:
node ./src/_config/setup/build-penpot-tokens.js
```

## Sources of truth

| File | Becomes |
| --- | --- |
| `src/_data/designTokens/colors.json` | `core/colors` set + `color.semantic.*` in `theme/light` + `theme/dark` |
| `src/_data/designTokens/fonts.json` | `font.family.*` in `core/typography` |
| `src/_data/designTokens/textWeights.json` | `font.weight.*` in `core/typography` |
| `src/_data/designTokens/textSizes.json` | `font.size.*` in `core/typography` |
| `src/_data/designTokens/textLeading.json` | `font.lineHeight.*` in `core/typography` |
| `src/_data/designTokens/typography.json` | `type.*` composite styles in `core/typography` |
| `src/_data/designTokens/spacing.json` | `space.*` in `core/spacing` |
| `src/_data/designTokens/borderRadius.json` | `radius.*` in `core/layout` |
| `src/_data/designTokens/viewports.json` | `breakpoint.*` in `core/layout` |
| `src/_data/designTokens/semanticColors.json` | `color.bg/text/headline/...` in `theme/light` + `theme/dark` |

The JSON files are themselves the source of truth for the website. The
DTCG file is a derived artifact you regenerate any time the JSON changes.

`colors.json` is itself generated from `colorsBase.json` by `npm run colors`,
so if you edited `colorsBase.json` first, run that before `penpot:tokens`.

## Mapping rules

The build script (`src/_config/setup/build-penpot-tokens.js`) applies these
transformations:

- **JSON nesting → dot-separated token names.** `gray.100` becomes
  `color.gray.100`. Hyphens stay (`space.s-m`, `font.size.step-min-2`).
- **Fluid Utopia values become the max, in pixels.** `{min: 10, max: 14}`
  becomes `"14px"`. Spacing and font sizes both go through this.
- **Border radii keep their rem.** Penpot accepts unit-suffixed strings,
  so `0.1875rem` stays `"0.1875rem"` and accessibility-relative sizing is
  preserved.
- **Viewports become `dimension` tokens with px.** `640` → `"640px"`.
- **Light/dark colors are split.** The `red`, `blue`, `green` colors in
  `colors.json` have a primary value plus a `.subdued` variant. The
  primary values land in `theme/light`; the subdued values land in
  `theme/dark`. They share the same token names (e.g. `color.semantic.red`)
  so a shape bound to `color.semantic.red` automatically follows whichever
  theme is active. The same theme-swap pattern is used for the semantic
  background/text/headline tokens defined in `semanticColors.json`, which
  mirror the `--color-*` CSS variables in `variables.css`.
- **Font families use the Penpot-recognized name.** Penpot's font registry
  uses canonical names like `Source Serif 4` and `Source Sans 3`, not the
  CSS-side family + fallback stack. Each entry in `fonts.json` carries an
  optional `penpot` field (e.g. `"penpot": "Source Serif 4"`); the build
  script prefers it and emits a single-element `fontFamilies` value. The
  full CSS fallback stack stays untouched in `$value` for the website.
- **Typography composites bundle several atomic tokens.** Each entry in
  `typography.json` becomes a `type.*` token of Penpot's `typography`
  type, with inner keys (`fontFamily`, `fontWeight`, `fontSize`,
  `lineHeight`) referencing the atomic tokens via the `{token.path}`
  syntax. Editing a font size in `textSizes.json` cascades through every
  type style automatically.

## Sets and themes

Six sets are emitted, in this order (order matters — Penpot resolves
conflicts in favor of later sets):

1. `core/colors` (~23 tokens) — the gray, orange, and base palettes
2. `core/typography` (~27 tokens) — families, weights, sizes, line heights,
   and `type.*` composite styles (body, heading.1–3, blockquote, citation,
   caption)
3. `core/spacing` (~16 tokens) — fixed and fluid spacing steps
4. `core/layout` (~7 tokens) — border radii and viewport breakpoints
5. `theme/light` (~9 tokens) — semantic colors for light mode (accent
   reds/blues/greens plus bg/text/headline)
6. `theme/dark` (~9 tokens) — same names with dark-mode values

Two themes are declared in the `$themes` block of the DTCG file:

- **Light** activates `core/*` + `theme/light`
- **Dark** activates `core/*` + `theme/dark`

## Theme caveat

When the tokens were first pushed via the Penpot Plugin API,
`theme.addSet(set)` returned silently and never actually attached sets to
themes (`activeSets` stayed empty no matter how many times it was called).
The DTCG file emits a Tokens Studio-style `$themes` block, which the
Penpot importer is supposed to honor.

If, after import, the Light and Dark themes still show empty in the
Tokens panel, set the membership manually:

1. Tokens panel → **Themes** tab → **+ Theme**
2. Name it `Light`
3. Check `core/colors`, `core/typography`, `core/spacing`, `core/layout`,
   `theme/light`
4. Repeat for `Dark` with `theme/dark` instead of `theme/light`

The `core/*` sets are theme-agnostic; only the `theme/*` set differs
between the two themes.

## Re-running

The push is non-destructive in the JSON direction (JSON is always the
source). On the Penpot side, importing replaces the existing token sets
with the same names. If you want a clean wipe before importing, delete
all sets in the Tokens panel first.

```bash
# After editing any token JSON:
npm run colors           # only if colorsBase.json changed
npm run penpot:tokens    # regenerates tokens/penpot-tokens.dtcg.json
# Then in Penpot: Tokens panel → import → select the file
```

## Why a manual import step?

The Penpot Plugin API can write tokens programmatically, but only from
inside an in-browser plugin connected to an open file. There is no
documented Node-side API for token writes. So the local script generates
a DTCG file and the import is a manual click in Penpot.

If a future Penpot release exposes a Node-side API, the same build
function in `src/_config/setup/build-penpot-tokens.js` can be reused to
drive it directly.

## Files

- `src/_config/setup/build-penpot-tokens.js` — the build script
- `src/_data/designTokens/*.json` — sources
- `tokens/penpot-tokens.dtcg.json` — generated artifact (committed so
  PR diffs show token changes)
- `package.json` → `scripts.penpot:tokens`
