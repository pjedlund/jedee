---
description: "Keeping a design file's tokens in step with the code that holds them: importing versus writing variables directly, what does not survive the trip, and how copies drift."
searchTerms: "DTCG"
date: 2026-08-22
updated: 2026-11-18
---

A **design token** is a named design value — a color, a spacing step, a radius — held somewhere both a stylesheet and a design tool can read. **Design token sync** is keeping those two copies in agreement. The interchange format is [DTCG](https://tr.designtokens.org/format/), a W3C community-group JSON schema that [Tokens Studio](https://tokens.studio/) popularized and that Figma, Penpot and others now import. A tool that a script can drive offers a second route: read its variables and write the differences, with no file in between.

The direction matters more than the format. Two arrangements are common:

- **Design tool as source.** Designers edit tokens in the tool; a job exports them into the codebase. Natural if the design system is run by designers.
- **Code as source.** The repo holds the tokens; a build step generates the tool's file. Natural for a site where the CSS is the thing that actually ships.

The second is one-way by construction, which sounds safer and mostly is — but it fails in a specific way that catches people out.

## Import replaces a set, it does not merge into it

An importer that takes a DTCG file typically replaces every token *set* whose name matches, wholesale. It does not diff, and it does not preserve extras. So a token created by hand in the tool, inside a set the generator also emits, is deleted the next time anyone imports — and anything bound to it silently loses its binding.

This is easy to miss because the two sides can look synchronized right up until the moment it happens. Every token the generator emits may match the tool exactly, and that is what "in sync" usually gets checked against. Sync is then a *subset* relationship, not equality: the tool holds extras the generator has never heard of, and the import doesn't care about the difference.

The fix is not to remember the extras. It is to give each one a source in the repo, so the generated file reproduces it and the import becomes a no-op. A hand-made token inside a generated set is borrowed time; a hand-made token inside a set the generator never emits is safe, though only by accident, and giving *that* set a source is what would put it at risk.

## Writing variables directly instead of importing

When a design tool can be driven by a script — a plugin API, or a control port that takes commands — the sync can skip the file and the import. The script reads the tool's variables, compares each one with the repo's value, and writes only the ones that differ. Three things change.

- **The report comes before the write.** Every difference is listed by name and mode (changed, missing, only in the tool), so a run can be a check with nothing written. An import shows nothing until it has already replaced the set.
- **Extras survive.** A variable that exists only in the tool is reported and left alone, so the subset problem above becomes a line in a report instead of a deletion.
- **References can stay references**, where the tool has them: a token written as `{color.text}` becomes a link to the variable `color.text`, not a copied hex.

The cost is that the script has to run while nobody is editing: it writes to the same file a designer has open. Working on a copy, and copying it back only if the original's bytes have not changed meanwhile, keeps a run from overwriting someone's unsaved edits.

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

A design tool's color token holds a color. It does not hold a *calculation* over other tokens — Penpot rejects `color-mix(in srgb, {color.bg}, {color.green.vivid} 8%)` outright, with token references and with plain hex alike (`invalid-token-value`), and offers no modifier. So a palette built on `color-mix()`, as jedee's map colors are, has nowhere to land: flattening each mix to one hex loses the recipe, which is the part worth tweaking.

**Stacking rebuilds it.** Alpha compositing in sRGB and `color-mix()` in sRGB are the same arithmetic, so a shape bound to token A with a copy above it bound to token B at 8% opacity renders exactly `color-mix(in srgb, A, B 8%)` — and the percentage is now a number in the tool, editable without breaking either binding. Nested mixes stack as more layers, in the order the CSS nests them.

⚠ **The percentage has to be the layer's opacity, not the fill's.** Binding a token writes it into the shape's first fill and resets that fill's opacity to 1; editing that fill's opacity afterwards silently drops the binding, leaving the resolved color behind and the token gone.

## A thing no token can recolor

Some things on a page change between themes without being a color at all. A map picture in the design file is two different images; a native `<audio>` player is drawn by the browser, which picks its light or dark chrome from `color-scheme`. The site switches them with `<picture>` and `prefers-color-scheme`, or leaves them to the browser. A design tool's theme only swaps token values, so neither has anything to bind to.

**Opacity tokens switch them.** Stack a light and a dark version, and bind each one's layer opacity to an opacity token that is fully on in one theme and off in the other: `opacity.light-only` (100 in light, 0 in dark) and `opacity.dark-only` (the reverse). Whether "fully on" is `1` or `100` depends on the tool; Penpot takes a fraction, FigCraft a percent. Switching the tool's theme then shows exactly one of the pair, with nothing to toggle by hand. Browser chrome that is a flat color can instead get ordinary color tokens sampled from the browser in each theme. These are design-tool-only tokens: no stylesheet reads them, so they need a source in the repo for the same reason as any other hand-made token — the next import deletes them otherwise.

The opacity has to be the layer's, for the reason given above: a token on a fill resets that fill's opacity.

Binding visibility instead of opacity is tempting and wrong where the layers sit in an auto layout: a hidden layer gives up its space, so the frame shrinks in one theme.

## A copied color drifts without a sound

A color the site computes — `color-mix()`, a tint over the page color — has to be written into the token files as a fixed hex for the design file to use it. Nothing ties that hex to the CSS that made it. Change a percentage in the stylesheet and the copy is wrong from then on, while every check that compares the token files with the design file still passes, because those two agree with each other.

The check that catches it measures the site instead: load a built page in a headless browser, in each theme, read the color each element is actually drawn with, and compare that with the token. A canvas converts whatever the browser computes (`oklab()`, `color(srgb …)`) to plain RGB. A token that is a reference to another token cannot drift this way, which is the argument for writing one wherever the value really is another token, as with a menu icon that rests in the same color as the count beside it.

## Two variable sets for one design system

Importing a design file that uses a separate library file can bring in two sets of variables with the same names: one from the library, linked by its components, and one from the file, linked by its pages. They start with the same values and then drift, because a change made in one is invisible in the other, and a theme switch has to be made twice.

Merging them is a relink, not a delete. Deleting a set first leaves every layer looking right — the tool keeps each layer's last value — while every link to the deleted set is gone. The safe order is: list every link to the old set (layers and styles; a text style's font size or family can be linked too), point each at the same-named variable in the set that stays, confirm no link is left, then delete. Pictures of every board before and after, in each theme, show whether anything moved.

## A mockup states the same value twice

Stacking rebuilds a computed color, but it also means the design file holds the recipe once for every place it draws it. A mockup that shows a rendering *and* a legend of the values behind it carries each color twice — once in the artwork, once in the swatch — with nothing linking them. Changing a color is then two edits, and skipping one leaves the file internally inconsistent while both halves still look deliberate.

The artwork is the authority when the two disagree: it is what the mockup is for, and it is the half a reader trusts. A legend is a caption. When checking a design value against code, read the artwork's fills *and strokes* rather than the legend — a swatch strip flattens any distinction the drawing makes, because one named color may be drawn several ways.

jedee's Place map page in Penpot is shaped this way: a light board and a dark board, each a drawn map above a strip of ten swatches naming the `--map-*` custom properties. The two agreed on every value when they were checked against each other, but the drawing carried something the strip could not — light draws `--map-road` and `--map-road-minor` as the same white at all five stroke widths, while dark splits them into two grays. Only the strokes show that; the strip shows two swatches that happen to match in one theme.

## Some tools have no references, no themes, and no variants

Three things DTCG can express that a design tool may simply not model. Each one moves work from the tool back into the generator, and each one costs something that is worth naming in the file rather than discovering later.

**References.** DTCG lets a token point at another with `{curly.brackets}`, and a tool that understands them keeps the link live: change the palette entry and everything derived from it moves. A tool without that concept can only store the resolved value, so the generator has to resolve the references itself. What arrives is a snapshot. The relationship still exists, but only in the repo — a swatch in the design file cannot tell anyone it was derived, and nothing moves there until someone re-runs the build and re-pushes.

**Themes.** If a color token holds one value, a light/dark pair cannot be one token. It becomes two, and the theme stops being a property of the token and turns into a prefix on its name. That is survivable for palette colors and awkward for everything downstream, because any token whose value references a theme-dependent name has to be resolved once *per theme* rather than once. A component color defined as `{color.text}` is not a value; it is two.

**Variants.** If components have no state or variant mechanism, every state and every theme is a separate component. This multiplies rather than adds: seven buttons, each with a hover state, in two themes, is twenty-eight components — and each is a copy, so a change to one does not reach the other twenty-seven. Anything that can be pushed down into a shared child should be, because a child stays single. A container tint is the useful move here: it colors everything inside uniformly, so an icon can stay one theme-neutral component and take its color from whatever holds it.

## In jedee

The code is the source. `src/_includes/themes/jedee/tokens/*.json` (each theme has a `tokens/` folder; `jedee` is the active one) feeds the website through `tailwind.config.js`, which turns tokens into CSS custom properties, and the design file through `npm run figcraft:tokens`. The design file has been in FigCraft since 2026-11-17, imported from Penpot; Penpot is kept as a frozen backup (below).

**The sync writes variables directly.** `src/_config/setup/sync-figcraft-tokens.js` builds the same token list as the Penpot export (it imports `build()` from `build-penpot-tokens.js`), then:

1. copies the design file to a temporary folder and opens the copy in a second FigCraft window started with a control port: `open -n -a FigCraft.app --args --control 7979 --automation-read-root <dir> --automation-write-root <dir>`;
2. sends newline-separated JSON over TCP — `variable.list` to read, one `command.batch` of `variable.create` and `variable.set` to write, so the whole update is one undo step;
3. lists the result again and stops if anything still differs, then saves the copy and sends `app.quit`;
4. copies the file back only if the original's bytes are unchanged since the start.

`npm run figcraft:tokens -- --check` stops after the report. Each token becomes a FigCraft value: a hex color, a number with its `px` dropped, a font name as a string, and a `{reference}` as `{alias: <variable id>}`. Light and Dark are modes of one variable, so a theme pair stays one variable. A repo value without a reference counts as equal to a FigCraft link that ends on the same color.

```
jedee website
  changed   megamenu.icon                  Dark  #414d58  →  → megamenu.count
```

**What it leaves alone.** Letter spacing: FigCraft draws text like the browser (widths within 0.5%), so its text styles use the site's measured tracking (label 1.35, wide 2.37, headings −2.32 / −1.47 / −0.95) rather than `typography.json`'s by-eye Penpot values. `type.*`: FigCraft holds those as 22 text styles measured from the live site. `shadow.*`: effect styles. A text style can link its font family and size to variables, but not its line height (px only) or weight, so those variables are reference values nothing links to.

**The first run found stale copies on both sides.** The library's set still linked `button.default.bg` to `color.gray.800` instead of `color.text`; `megamenu.icon` differed in Dark; the light audio player was the old light Chrome player. Eleven values changed. Comparing the result with the site then showed the repo's own `megamenu.icon` was out of date: the menu icons have rested in the count color since 2026-11-17, so the token became `{megamenu.count}`.

**Two sets became one.** The Penpot import brought "jedee design tokens" (the library, linked by the Components page) and "jedee website" (linked by the other pages). 783 layer links and 44 text-style links moved to "jedee website", none were left on the old set, and pictures of all 21 boards matched pixel for pixel in Dark and Light before it was deleted. A text style's links show in `style.list` as `bound`; a layer's in `node.get` as `boundVariables`. The leftover `Themes/` prefix, Penpot's theme group, was dropped from the 118 names that had it; links follow the variable, not its name.

**A check of the copies against the site.** On 2026-11-18 headless Chrome read the 41 copied colors (page tints, buttons, mega-menu) from the built `/design-system/` page in both themes; all were within 2/255 of their tokens. The same check found 14 tokens nothing on the site uses apart from the design-system page's swatches, and 28 FigCraft variables nothing in the file links to, 13 of them line heights, weights and breakpoints, which no layer in FigCraft can link to.

**The second window shows up in Recent files.** Each run's temporary copy lands in `recent_files` in `~/Library/Application Support/FigCraft/state.json`, and the quitting window writes that file as it exits. The script waits for the window's process to end and then removes every path under its temporary-folder prefix.

⚠ **`pgrep -f "--control 7979"` never finds the process.** A pattern that starts with `--` is read as an option, `pgrep` prints its usage and exits 2, and a check that treats any non-zero exit as "not running" moves on at once — here, tidying `state.json` before the window had written its own copy over it. `pgrep -f -- "--control 7979"` works.

## In Penpot (frozen 2026-11-18)

Until 2026-11-17 the design file was in [Penpot](https://penpot.app), fed by `npm run penpot:tokens` → `src/_config/setup/build-penpot-tokens.js` → `_local/penpot/penpot-tokens.dtcg.json` → a manual import in Penpot's Tokens panel. The last step was a click because the plugin API cannot be trusted to write every token type (below). Seven sets are emitted: `core/colors`, `core/typography`, `core/spacing`, `core/layout`, `core/button`, `theme/light`, `theme/dark`. The script still runs, but nothing imports its output any more.

**The near-miss.** Twelve button colors — `button.tertiary.bg` plus five `button.*.bg-hover`, in each theme — existed only inside Penpot, inside `theme/light` and `theme/dark`, both of which the build regenerates. The generated sets held 9 tokens against Penpot's 15. Importing would have replaced 15 with 9 and deleted the other six, twice; ten Button variants bind their fill to them, so the component would have broken with no error anywhere. `src/_includes/themes/jedee/tokens/buttonColors.json` now holds them and the build emits them, so the import replaces 15 with an identical 15.

Two details in that fix are load-bearing. The names are emitted **verbatim**, without the `color.*` prefix the `semanticColors` entries get, because the existing Penpot bindings reference `button.tertiary.bg` — a prefix would read as a delete plus an unused new token. And the values are flattened `color-mix()` results, so they can still drift; the CSS recomputes `color-mix(in oklab, var(--button-bg) 90%, var(--color-bg))` on every theme change while the JSON does not. `tests/penpot-button-tokens.test.js` guards the first; the second is open.

`core/button` was the accidental case for a while — ten Penpot-only tokens that survived every import because the build emitted no set by that name. It is now emitted too, from the same `buttonColors.json`, declared through a `$penpotCoreSet` field so the emit loop stays generic. Safe by accident became safe by construction.

**The three unit problems, all present here:**

- **Radii export as px, not rem.** Penpot imports `0.1875rem` and resolves it correctly, but its border-radius *binding* validator rejects rem: a bound corner warns "Reference in {radius.x} is not valid or is not in any active set", which points at the set when the unit is the problem. The build converts rem → px at a 16px base for radii only. The CSS keeps rem.
- **Letter-spacing is `ch` and cannot be exported.** Headings use `--tracking: -0.04ch`, font-relative so it scales with each heading. The Penpot value was matched by eye instead: `-5` on `type.heading.1`. Measured on the same string at 107px/700, that renders 864.66px against 870.91px for the CSS `-0.04ch` — 0.7% apart — while a literal `-5px` in CSS gives 820.18px, 5% tighter. So the mismatched number is the correct one. Part of the gap is the typeface (Penpot uses Google's `Source Serif 4`, the site a static subset, about 2% apart in width at that size) and part is unexplained: a literal `-5px` on `Source Serif 4` gives 838.59px, not Penpot's 864.66px. `heading.2` (`-3.2`) and `heading.3` (`-2.1`) are `heading.1` scaled by font size, which reproduces what `ch` does; they have not been checked against a rendering because no h2 or h3 exists in the file.
- **Capital labels are `--tracking-wide`, 0.16ch, at three sizes.** Measured as px with 1ch = 0.497em in Source Sans 3, that is 0.16 × 0.497 × size: `font.letterSpacing.label` 1.27 for 16px labels (breadcrumb, Menu, footer, tags, small buttons), `.table` 1.75 for 22px table heads, `.wide` 2.23 for 28px text such as the event card's month. They feed `type.label` (16px, bold, uppercase) and `type.table.header` (22px, regular, as `table.css` sets it). Until 2026-10-28 the library held a hand-made `wide` of 1.2 and a `widest` of 1.67, which matched no size the site uses and would have gone on the next import; `typography.json` now holds all three.
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

**That alpha is the one unit that survives the trip.** `hsl(0 0% 0% / 0.06)` is `#0000000F`, CSS reads `#RRGGBBAA` natively, and Penpot stores exactly that — so the direction inverts for this one token type. `src/_includes/themes/jedee/tokens/shadows.json` holds *Penpot's* layer shape as the source of truth and `dtcgShadowToTailwind()` composes the CSS `box-shadow` string from it, rather than the usual arrangement of storing the CSS and generating a number for the tool. Hex quantizes alpha to 1/255, so Penpot shows `0.0588` where the CSS said `0.06`; invisible here, and a property of the format rather than of either side.

**An import also rewrites which sets are active.** The import that delivered the shadows left `theme/light` and all five core sets active and switched `theme/dark` off, flipping the canvas from dark to light; before it, `theme/dark` was the active theme and `core/button` was not active at all. The active-set selection is something an import *writes*, not state it preserves — worth checking after every one, because an inactive set means its tokens resolve nowhere.

**Penpot's layout settles asynchronously.** A read immediately after a write returns stale geometry — after binding padding and changing text weight across ten variants, a verification read gave 95×30 for boards that settled at 97×30, and one variant reported a 1px difference from its siblings that a later read showed was not there. Token application is documented as async (~100 ms); reflow takes longer and isn't signalled. Read again before reporting a size.

**Theme switches for the Audio post type board.** Its static place map is a light and a dark image stacked, bound to `visibility.light-only` and `visibility.dark-only` (in FigCraft, `opacity.light-only` and `opacity.dark-only` in percent, which `themeVisibility.json` has held since 2026-11-18); Chrome's player is drawn with `ui.audio.bg` and `ui.audio.fg` (`#3A3A3A` and white, sampled from Chrome). Both themes carry the dark pair, because the site keeps the player dark in both: Chrome's light player, `#F1F3F4`, all but vanished on the light page. The sources are `themeVisibility.json` and `audioPlayerColors.json`, read by `build-penpot-tokens.js` through the same verbatim-name loop as `buttonColors.json`.

**Read the active theme before calling a color stale.** The library's Dark theme was on, so a mega-menu drawn in dark values looked out of date when it was right. Re-applying every bound color token to "refresh" it then unbound them, because `applyToken` with the token a shape already has switches the binding off — 85 bindings went, with the colors left looking unchanged. They came back from a map of each resolved hex to its Dark token. Penpot's plugin API has no undo; `penpot.history.undoBlockBegin()` / `undoBlockFinish()` only groups a script's edits into one ⌘Z.

**A check against the design-system page.** On 2026-10-28 the library held 162 of the 176 tokens the build emits with the same name and value. The rest were the dark top band (pointed at a Penpot-only `color.gray.1000`), the letter-spacing above, and the theme-switch and thumbnail-shadow tokens the library had not yet imported; five tokens existed only in Penpot. `/design-system/` is generated from the same JSON, so comparing against the export is comparing against the page.

Mapping rules and the full trap list live in `_local/penpot/penpot-tokens.md` (gitignored). `npm run penpot:tokens` also runs a second script, `build-design-md.js`, which regenerates the front matter of the repo-root `DESIGN.md`.

## In Sketch (retired)

Sketch was a second mirror from 2026-08-31 to 2026-10-06, built from its script and retired in favour of Penpot alone. The lesson that outlives it: a tool that models none of references, themes or fluid sizes makes the file a snapshot, so every token change needs a re-run and re-push by hand.

Raw sources: `src/_raw/dev-notes/How the Penpot library was checked against the design system.md`, `src/_raw/dev-notes/How the FigCraft token sync works.md`
