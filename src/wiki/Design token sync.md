---
description: "Generating a design tool's tokens from the code that is their source of truth, and the three ways the two sides drift apart anyway."
date: 2026-08-22
updated: 2026-10-31
---

A **design token** is a named design value — a color, a spacing step, a radius — held somewhere both a stylesheet and a design tool can read. **Design token sync** is keeping those two copies in agreement. The interchange format is [DTCG](https://tr.designtokens.org/format/), a W3C community-group JSON schema that [Tokens Studio](https://tokens.studio/) popularized and that Figma, Penpot and others now import.

The direction matters more than the format. Two arrangements are common:

- **Design tool as source.** Designers edit tokens in the tool; a job exports them into the codebase. Natural if the design system is run by designers.
- **Code as source.** The repo holds the tokens; a build step generates the tool's file. Natural for a site where the CSS is the thing that actually ships.

The second is one-way by construction, which sounds safer and mostly is — but it fails in a specific way that catches people out.

## Import replaces a set, it does not merge into it

An importer that takes a DTCG file typically replaces every token *set* whose name matches, wholesale. It does not diff, and it does not preserve extras. So a token created by hand in the tool, inside a set the generator also emits, is deleted the next time anyone imports — and anything bound to it silently loses its binding.

This is easy to miss because the two sides can look synchronized right up until the moment it happens. Every token the generator emits may match the tool exactly, and that is what "in sync" usually gets checked against. Sync is then a *subset* relationship, not equality: the tool holds extras the generator has never heard of, and the import doesn't care about the difference.

The fix is not to remember the extras. It is to give each one a source in the repo, so the generated file reproduces it and the import becomes a no-op. A hand-made token inside a generated set is borrowed time; a hand-made token inside a set the generator never emits is safe, though only by accident, and giving *that* set a source is what would put it at risk.

## Units do not survive the trip

The deeper problem is that CSS has units a design tool has no concept of, and generating a number for the tool means choosing what to lose.

- **Font-relative units** (`ch`, `em`, `ex`) resolve against font metrics the browser computes. A design tool has no equivalent, so there is nothing to export — only a fixed number matched by eye against a rendering. And because the CSS value scales with the text, one CSS value becomes one px token *per size it is used at*: the unit's job moves into the token names.
- **Fluid values** (`clamp()`, Utopia scales) have no analogue either. Exporting the maximum is the usual compromise; the design file then shows the large end of every scale and never the small one.
- **Computed colors** (`color-mix()`, `oklch()` arithmetic) must be flattened to a literal. The literal is correct for exactly the inputs it was computed from, and goes stale the moment an upstream value changes — a generator that redoes the arithmetic itself is the only version that cannot drift.
- **Absolute units can still be rejected.** A tool may accept a unit on import and refuse it when the token is *bound* to a shape, which produces a validation error pointing at the token rather than at the unit.

A number in the design file that doesn't match the stylesheet is therefore not automatically wrong. It may be the value that reproduces the same *rendering* through a different unit system — in which case "correcting" it to match the CSS makes the design file wrong. Whichever it is, the reasoning belongs next to the number, because the next reader cannot recover it.

## A type the tool supports but its API cannot write

A design tool's plugin API is a separate implementation from its importer and its UI, and the three do not always agree about what a token can be. A type may be fully supported in the interface, documented in the API reference, and still be impossible to create through that API.

When it is, the API can usually still *read*. Making one token by hand in the UI and reading its stored value back is the cheapest way to learn the canonical shape — better than the reference documentation, because it is what the tool actually persists rather than what the types claim.

That shape is then what the generator has to emit, and it is worth checking against the docs rather than trusting them: derived fields the docs never mention, keys the docs list that are absent, and values in a different form than the type says are all normal.

## A computed color is not a token value

A design tool's color token holds a color. It does not hold a *calculation* over other tokens — Penpot rejects `color-mix(in srgb, {color.bg}, {color.green.vivid} 8%)` outright, with token references and with plain hex alike (`invalid-token-value`), and offers no modifier. So a palette built on `color-mix()`, as parts of stomme's place-map colors are, has nowhere to land: flattening each mix to one hex loses the recipe, which is the part worth tweaking.

**Stacking rebuilds it.** Alpha compositing in sRGB and `color-mix()` in sRGB are the same arithmetic, so a shape bound to token A with a copy above it bound to token B at 8% opacity renders exactly `color-mix(in srgb, A, B 8%)` — and the percentage is now a number in the tool, editable without breaking either binding. Nested mixes stack as more layers, in the order the CSS nests them.

⚠ **The percentage has to be the layer's opacity, not the fill's.** Binding a token writes it into the shape's first fill and resets that fill's opacity to 1; editing that fill's opacity afterwards silently drops the binding, leaving the resolved color behind and the token gone.

## A thing no token can recolor

Some things on a page change between themes without being a color at all. A map picture in the design file is two different images; a native `<audio>` player is drawn by the browser, which picks its light or dark chrome from `color-scheme`. Pages switch them with `<picture>` and `prefers-color-scheme`, or leave them to the browser. A design tool's theme only swaps token values, so neither has anything to bind to.

**Opacity tokens switch them.** Stack a light and a dark version, and bind each one's layer opacity to an opacity token that is `1` in one theme set and `0` in the other: `visibility.light-only` (1 in light, 0 in dark) and `visibility.dark-only` (the reverse). Switching the tool's theme then shows exactly one of the pair, with nothing to toggle by hand. Browser chrome that is a flat color can instead get ordinary color tokens sampled from the browser in each theme. These are design-tool-only tokens: no stylesheet reads them, so they need a source in the repo for the same reason as any other hand-made token — the next import deletes them otherwise.

The opacity has to be the layer's, for the reason given above: a token on a fill resets that fill's opacity.

## A mockup states the same value twice

Stacking rebuilds a computed color, but it also means the design file holds the recipe once for every place it draws it. A mockup that shows a rendering *and* a legend of the values behind it carries each color twice — once in the artwork, once in the swatch — with nothing linking them. Changing a color is then two edits, and skipping one leaves the file internally inconsistent while both halves still look deliberate.

The artwork is the authority when the two disagree: it is what the mockup is for, and it is the half a reader trusts. A legend is a caption. When checking a design value against code, read the artwork's fills *and strokes* rather than the legend — a swatch strip flattens any distinction the drawing makes, because one named color may be drawn several ways.

A place-map mockup in Penpot can be shaped this way: a light board and a dark board, each a drawn map above a strip of swatches naming the `--map-*` custom properties. The drawing can carry something the strip cannot — for instance one theme drawing `--map-road` and `--map-road-minor` as the same color at every stroke width while the other splits them into two. Only the strokes show that; the strip shows two swatches that happen to match in one theme.

## Some tools have no references, no themes, and no variants

Three things DTCG can express that a design tool may simply not model. Each one moves work from the tool back into the generator, and each one costs something that is worth naming in the file rather than discovering later.

**References.** DTCG lets a token point at another with `{curly.brackets}`, and a tool that understands them keeps the link live: change the palette entry and everything derived from it moves. A tool without that concept can only store the resolved value, so the generator has to resolve the references itself. What arrives is a snapshot. The relationship still exists, but only in the repo — a swatch in the design file cannot tell anyone it was derived, and nothing moves there until someone re-runs the build and re-pushes.

**Themes.** If a color token holds one value, a light/dark pair cannot be one token. It becomes two, and the theme stops being a property of the token and turns into a prefix on its name. That is survivable for palette colors and awkward for everything downstream, because any token whose value references a theme-dependent name has to be resolved once *per theme* rather than once. A component color defined as `{color.text}` is not a value; it is two.

**Variants.** If components have no state or variant mechanism, every state and every theme is a separate component. This multiplies rather than adds: seven buttons, each with a hover state, in two themes, is twenty-eight components — and each is a copy, so a change to one does not reach the other twenty-seven. Anything that can be pushed down into a shared child should be, because a child stays single. A container tint is the useful move here: it colors everything inside uniformly, so an icon can stay one theme-neutral component and take its color from whatever holds it.

## In stomme

The code is the source. The active theme's `tokens/*.json` (each theme has a `tokens/` folder in `src/_includes/themes/<theme>/`; `settings.theme` picks the active one) feeds both the website (through `tailwind.config.js`, which turns tokens into CSS custom properties) and the design file, via `npm run penpot:tokens` → `src/_config/setup/build-penpot-tokens.js` → `_local/penpot/penpot-tokens.dtcg.json` → a manual import in [Penpot](https://penpot.app)'s Tokens panel. The last step is a click because the plugin API cannot be trusted to write every token type (below). Seven sets are emitted: `core/colors`, `core/typography`, `core/spacing`, `core/layout`, `core/button`, `theme/light`, `theme/dark`.

**The near-miss, and what guards it.** Button colors used to exist only inside Penpot, inside `theme/light` and `theme/dark`, both of which the build regenerates, so an import would have deleted them and broken every button variant bound to them with no error anywhere. The theme's `tokens/buttonColors.json` now holds them and the build emits them, so the import reproduces them. Two details are load-bearing. The names are emitted **verbatim**, without the `color.*` prefix the `semanticColors` entries get, because existing Penpot bindings reference names such as `button.tertiary.bg`, and a prefix would read as a delete plus an unused new token. And the values are flattened `color-mix()` results, so they can drift: the CSS recomputes the mix on every theme change while the JSON does not. `tests/penpot-button-tokens.test.js` guards the first; the second is open.

`core/button` is emitted from the same `buttonColors.json`, declared through a `$penpotCoreSet` field so the emit loop stays generic. A set the build does not emit is safe from an import only by accident; emitting it makes it safe by construction.

**The three unit problems, all present here:**

- **Radii export as px, not rem.** Penpot imports `0.1875rem` and resolves it correctly, but its border-radius *binding* validator rejects rem: a bound corner warns "Reference in {radius.x} is not valid or is not in any active set", which points at the set when the unit is the problem. The build converts rem → px at a 16px base for radii only. The CSS keeps rem.
- **Letter-spacing is `ch` and cannot be exported.** Headings use `--tracking: -0.04ch`, font-relative so it scales with each heading. Penpot has no `ch`, so the theme's `typography.json` (a Penpot-only file that `tailwind.config.js` does not read) carries a bare number matched by eye against a rendering, and the number differs from the CSS on purpose: a literal px value in CSS would not scale with the heading the way `ch` does. Capital labels use `--tracking-wide` (0.16ch) at several sizes, so each size gets a separate px value in the same file: 0.16 × the font's `ch` in em × the size.
- **Fluid Utopia values collapse to their maximum.** `{min: 10, max: 14}` exports as `"14px"`, for spacing and font sizes alike.

**Penpot's plugin API cannot create a shadow token.** `set.addToken({type: 'shadow', ...})` rejects every shape, including the one Penpot itself stores:

```
[PENPOT PLUGIN] Value not valid: Field 0.value is invalid: Invalid data. Code: :error
```

Every variation tried failed — the documented `TokenShadowValueString[]`, numeric values, `inset` present in four forms and omitted, px units, a Tokens Studio `{x, y, blur, spread, color, type}` layer, a bare object, a wrapped one. The only accepted value is a plain CSS string, which stores with an empty `resolvedValueString` and is therefore useless. The UI creates them without complaint, and so does the DTCG import, so this is an API bug rather than a product limit — and it costs nothing, because the import is the path this project uses anyway.

Reading a hand-made one back gave the shape:

```json
[{"offsetX": "0", "offsetY": "2", "blur": "6", "spread": "-4", "color": "#0000000F", "colorResult": "rgba(0, 0, 0, 0.06)"}]
```

The docs list an `inset` key that is not there (the importer adds `inset: false` afterwards), omit the derived `colorResult`, and do not say that the color carries its alpha as **8-digit hex**.

**That alpha is the one unit that survives the trip.** `hsl(0 0% 0% / 0.06)` is `#0000000F`, CSS reads `#RRGGBBAA` natively, and Penpot stores exactly that — so the direction inverts for this one token type. The theme's `tokens/shadows.json` holds *Penpot's* layer shape as the source of truth and `dtcgShadowToTailwind()` composes the CSS `box-shadow` string from it, rather than the usual arrangement of storing the CSS and generating a number for the tool. Hex quantizes alpha to 1/255, so Penpot shows `0.0588` where the CSS said `0.06`; invisible here, and a property of the format rather than of either side.

`npm run penpot:tokens` also runs a second script, `build-design-md.js`, which regenerates the front matter of the active theme's `DESIGN.md`.
