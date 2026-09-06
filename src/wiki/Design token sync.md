---
description: "Generating a design tool's tokens from the code that is their source of truth, and the three ways the two sides drift apart anyway."
date: 2026-08-22
---

A **design token** is a named design value — a color, a spacing step, a radius — held somewhere both a stylesheet and a design tool can read. **Design token sync** is keeping those two copies in agreement. The interchange format is [DTCG](https://tr.designtokens.org/format/), a W3C community-group JSON schema that [Tokens Studio](https://tokens.studio/) popularized and that Figma, Penpot and others now import.

The direction matters more than the format. Two arrangements are common:

- **Design tool as source.** Designers edit tokens in the tool; a job exports them into the codebase. Natural if the design system is owned by designers.
- **Code as source.** The repo holds the tokens; a build step generates the tool's file. Natural for a site where the CSS is the thing that actually ships.

The second is one-way by construction, which sounds safer and mostly is — but it fails in a specific way that catches people out.

## Import replaces a set, it does not merge into it

An importer that takes a DTCG file typically replaces every token *set* whose name matches, wholesale. It does not diff, and it does not preserve extras. So a token created by hand in the tool, inside a set the generator also emits, is deleted the next time anyone imports — and anything bound to it silently loses its binding.

This is easy to miss because the two sides can look synchronized right up until the moment it happens. Every token the generator emits may match the tool exactly, and that is what "in sync" usually gets checked against. Sync is then a *subset* relationship, not equality: the tool holds extras the generator has never heard of, and the import doesn't care about the difference.

The fix is not to remember the extras. It is to give each one a source in the repo, so the generated file reproduces it and the import becomes a no-op. A hand-made token inside a generated set is borrowed time; a hand-made token inside a set the generator never emits is safe, though only by accident, and giving *that* set a source is what would put it at risk.

## Units do not survive the trip

The deeper problem is that CSS has units a design tool has no concept of, and generating a number for the tool means choosing what to lose.

- **Font-relative units** (`ch`, `em`, `ex`) resolve against font metrics the browser computes. A design tool has no equivalent, so there is nothing to export — only a fixed number matched by eye against a rendering.
- **Fluid values** (`clamp()`, Utopia scales) have no analogue either. Exporting the maximum is the usual compromise; the design file then shows the large end of every scale and never the small one.
- **Computed colors** (`color-mix()`, `oklch()` arithmetic) must be flattened to a literal. The literal is correct for exactly the inputs it was computed from, and goes stale the moment an upstream value changes — a generator that redoes the arithmetic itself is the only version that cannot drift.
- **Absolute units can still be rejected.** A tool may accept a unit on import and refuse it when the token is *bound* to a shape, which produces a validation error pointing at the token rather than at the unit.

A number in the design file that doesn't match the stylesheet is therefore not automatically wrong. It may be the value that reproduces the same *rendering* through a different unit system — in which case "correcting" it to match the CSS makes the design file wrong. Whichever it is, the reasoning belongs next to the number, because the next reader cannot recover it.

## A type the tool supports but its API cannot write

A design tool's plugin API is a separate implementation from its importer and its UI, and the three do not always agree about what a token can be. A type may be fully supported in the interface, documented in the API reference, and still be impossible to create through that API.

When it is, the API can usually still *read*. Making one token by hand in the UI and reading its stored value back is the cheapest way to learn the canonical shape — better than the reference documentation, because it is what the tool actually persists rather than what the types claim.

That shape is then what the generator has to emit, and it is worth checking against the docs rather than trusting them: derived fields the docs never mention, keys the docs list that are absent, and values in a different form than the type says are all normal.

## Some tools have no references, no themes, and no variants

Three things DTCG can express that a design tool may simply not model. Each one moves work from the tool back into the generator, and each one costs something that is worth naming in the file rather than discovering later.

**References.** DTCG lets a token point at another with `{curly.brackets}`, and a tool that understands them keeps the link live: change the palette entry and everything derived from it moves. A tool without that concept can only store the resolved value, so the generator has to resolve the references itself. What arrives is a snapshot. The relationship still exists, but only in the repo — a swatch in the design file cannot tell anyone it was derived, and nothing moves there until someone re-runs the build and re-pushes.

**Themes.** If a color token holds one value, a light/dark pair cannot be one token. It becomes two, and the theme stops being a property of the token and turns into a prefix on its name. That is survivable for palette colors and awkward for everything downstream, because any token whose value references a theme-dependent name has to be resolved once *per theme* rather than once. A component color defined as `{color.text}` is not a value; it is two.

**Variants.** If components have no state or variant mechanism, every state and every theme is its own component. This multiplies rather than adds: seven buttons, each with a hover state, in two themes, is twenty-eight components — and each is a copy, so a change to one does not reach the other twenty-seven. Anything that can be pushed down into a shared child should be, because a child stays single. A container tint is the useful move here: it colors everything inside uniformly, so an icon can stay one theme-neutral component and take its color from whatever holds it.

## In jedee

The code is the source. `src/_data/designTokens/*.json` feeds both the website (through `tailwind.config.js`, which turns tokens into CSS custom properties) and the design file, via `npm run penpot:tokens` → `src/_config/setup/build-penpot-tokens.js` → `_local/penpot/penpot-tokens.dtcg.json` → a manual import in [Penpot](https://penpot.app)'s Tokens panel. The last step is a click because the plugin API cannot be trusted to write every token type (below). Seven sets are emitted: `core/colors`, `core/typography`, `core/spacing`, `core/layout`, `core/button`, `theme/light`, `theme/dark`.

**The near-miss.** Twelve button colors — `button.tertiary.bg` plus five `button.*.bg-hover`, in each theme — existed only inside Penpot, inside `theme/light` and `theme/dark`, both of which the build regenerates. The generated sets held 9 tokens against Penpot's 15. Importing would have replaced 15 with 9 and deleted the other six, twice; ten Button variants bind their fill to them, so the component would have broken with no error anywhere. `src/_data/designTokens/buttonColors.json` now holds them and the build emits them, so the import replaces 15 with an identical 15.

Two details in that fix are load-bearing. The names are emitted **verbatim**, without the `color.*` prefix the `semanticColors` entries get, because the existing Penpot bindings reference `button.tertiary.bg` — a prefix would read as a delete plus an unused new token. And the values are flattened `color-mix()` results, so they can still drift; the CSS recomputes `color-mix(in oklab, var(--button-bg) 90%, var(--color-bg))` on every theme change while the JSON does not. `_local/tests/penpot-button-tokens.test.js` guards the first; the second is open.

`core/button` was the accidental case for a while — ten Penpot-only tokens that survived every import because the build emitted no set by that name. It is now emitted too, from the same `buttonColors.json`, declared through a `$penpotCoreSet` field so the emit loop stays generic. Safe by accident became safe by construction.

**The three unit problems, all present here:**

- **Radii export as px, not rem.** Penpot imports `0.1875rem` and resolves it correctly, but its border-radius *binding* validator rejects rem: a bound corner warns "Reference in {radius.x} is not valid or is not in any active set", which points at the set when the unit is the problem. The build converts rem → px at a 16px base for radii only. The CSS keeps rem.
- **Letter-spacing is `ch` and cannot be exported.** Headings use `--tracking: -0.04ch`, font-relative so it scales with each heading. The Penpot value was matched by eye instead: `-5` on `type.heading.1`. Measured on the same string at 107px/700, that renders 864.66px against 870.91px for the CSS `-0.04ch` — 0.7% apart — while a literal `-5px` in CSS gives 820.18px, 5% tighter. So the mismatched number is the correct one. Part of the gap is the typeface (Penpot uses Google's `Source Serif 4`, the site a static subset, about 2% apart in width at that size) and part is unexplained: a literal `-5px` on `Source Serif 4` gives 838.59px, not Penpot's 864.66px. `heading.2` (`-3.2`) and `heading.3` (`-2.1`) are `heading.1` scaled by font size, which reproduces what `ch` does; they have not been checked against a rendering because no h2 or h3 exists in the file.
- **Fluid Utopia values collapse to their maximum.** `{min: 10, max: 14}` exports as `"14px"`, for spacing and font sizes alike.

**Penpot's plugin API cannot create a shadow token.** `set.addToken({type: 'shadow', ...})` rejects every shape, including the one Penpot itself stores:

```
[PENPOT PLUGIN] Value not valid: Field 0.value is invalid: Invalid data. Code: :error
```

Nine variations fail — the documented `TokenShadowValueString[]`, numeric values, `inset` present in four forms and omitted, px units, a Tokens Studio `{x, y, blur, spread, color, type}` layer, a bare object, a wrapped one. The only accepted value is a plain CSS string, which stores with an empty `resolvedValueString` and is therefore useless. The UI creates them without complaint, and so does the DTCG import, so this is an API bug rather than a product limit — and it costs nothing, because the import is the path this project uses anyway.

Reading a hand-made one back gave the shape:

```json
[{"offsetX": "0", "offsetY": "2", "blur": "6", "spread": "-4", "color": "#0000000F", "colorResult": "rgba(0, 0, 0, 0.06)"}]
```

The docs list an `inset` key that is not there (the importer adds `inset: false` afterwards), omit the derived `colorResult`, and do not say that the color carries its alpha as **8-digit hex**.

**That alpha is the one unit that survives the trip.** `hsl(0 0% 0% / 0.06)` is `#0000000F`, CSS reads `#RRGGBBAA` natively, and Penpot stores exactly that — so the direction inverts for this one token type. `src/_data/designTokens/shadows.json` holds *Penpot's* layer shape as the source of truth and `dtcgShadowToTailwind()` composes the CSS `box-shadow` string from it, rather than the usual arrangement of storing the CSS and generating a number for the tool. Hex quantizes alpha to 1/255, so Penpot shows `0.0588` where the CSS said `0.06`; invisible here, and a property of the format rather than of either side.

**An import also rewrites which sets are active.** The import that delivered the shadows left `theme/light` and all five core sets active and switched `theme/dark` off, flipping the canvas from dark to light; before it, `theme/dark` was the active theme and `core/button` was not active at all. The active-set selection is something an import *writes*, not state it preserves — worth checking after every one, because an inactive set means its tokens resolve nowhere.

**Penpot's layout settles asynchronously.** A read immediately after a write returns stale geometry — after binding padding and changing text weight across ten variants, a verification read gave 95×30 for boards that settled at 97×30, and one variant reported a 1px difference from its siblings that a later read showed was not there. Token application is documented as async (~100 ms); reflow takes longer and isn't signalled. Read again before reporting a size.

Mapping rules and the full trap list live in `_local/penpot/penpot-tokens.md` (gitignored). The same build script also regenerates the front matter of the repo-root `DESIGN.md`.

## In Sketch

A second mirror since 2026-08-31, built the same way and losing different things. `npm run sketch:tokens` → `src/_config/setup/build-sketch-tokens.js` → `_local/sketch/sketch-tokens.json`, fed into `_local/sketch/JEDEE - design system.sketch` through Sketch's MCP server. 91 Color Variables, 7 text styles, 67 symbols.

Sketch models none of the three above, so all three costs land at once. References are resolved in the build, making the file a snapshot rather than a live mirror. The light/dark semantic pair becomes two swatch groups, `Light/…` and `Dark/…`, and the component colors in `buttonColors.json` and `megamenuColors.json` are resolved once per theme, because their `core` entries reference `{color.text}` and `{color.semantic.blue}` — which is how `Light/Button/Default/Bg` and `Dark/Button/Default/Bg` correctly land on different hexes from one source line. And every state and theme is its own symbol: fourteen buttons per theme, where the CSS has one rule and a handful of custom-property overrides.

The fluid problem resolves the same way it did for Penpot — frozen at `max`, so the file shows the desktop end of every scale. Two values had to be approximated rather than exported, both `color-mix()` results with no token behind them: the button border, bound to the fill swatch instead of `color-mix(in oklab, bg 80%, text)` and invisible at 1px, and the mega-menu's leader dots, drawn as a dashed 1px line on a 6px pitch rather than a repeating radial gradient.

**A missing token showed up as a binding that reached too far.** `--color-accent-orange` is set in `variables.css` from a palette shade and had no entry in `semanticColors.json`, so nothing generated a swatch for it — and six hover symbols bound straight to `Palette/Orange/500`, skipping the semantic layer to grab a raw shade. The design file is a good place to notice this, because a binding is visible in a way a `var()` chain is not: the symbol names the thing it points at. Giving it a source is a one-line change that emits nothing into the CSS, since the Tailwind config does not read that file. Worth checking which side of the pair is actually wrong first — here the design file was faithfully reflecting a real gap in the token set.

Its value is deliberately identical in both themes, which makes the light/dark pair look redundant and is not: a single-valued swatch needs one per theme even when they agree. Unlike `accent-blue` and `accent-green`, which flip to subdued variants and already reach both tools as the light_dark colors in `colors.json`.

The one thing that got *better* under the constraint: because a symbol cannot carry a theme, the sixteen post-type icons were made theme-neutral and the row that holds one tints its icon slot. One icon set serves both themes, and the tint survives swapping which icon a row shows — which per-shape color overrides would not. The constraint pushed the color to the right place.

Related: [[Undefined custom properties]] — the other way a token reference fails silently, on the CSS side rather than at the tool boundary. [[Three things called cache]] — another page where two systems share a name for different things.

Raw sources: `src/_raw/dev-notes/How the Penpot token sync survives an import.md`, `src/_raw/dev-notes/How the shadow tokens got into Penpot.md`
