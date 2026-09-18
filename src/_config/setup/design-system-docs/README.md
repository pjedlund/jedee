# JEDEE Design System

**JEDEE** is the personal indieweb site of Johan Edlund — a designer and front-end developer in Malmö, Sweden. It publishes long-form articles, a reading and listening log, short wikilinked notes, and a dozen other IndieWeb post types. Built with Eleventy, styled with CUBE CSS over Utopia fluid type and space scales, deployed static. The sign-off *Soli Deo Gloria* signals public-domain intent.

## How this design system stays true

Every value here is generated from the site's own repository — the DTCG tokens in `src/_data/designTokens/*.json` and the compiled `src/_includes/css/global.css` — by one command, `npm run design:system`. Nothing in it is kept by hand.

`components/bundle.css` **is the site's own compiled stylesheet**, copied unmodified but for the font URLs, with the two per-page bundles the previews need concatenated on. The type preloads it into every preview, so a preview is styled by the CSS the site actually ships rather than by a reconstruction of it.

This matters because the previous version of this system was a hand-written translation under a third set of names. It drifted three months out of date without anyone noticing, and it carried a dark theme that was never in the site at all.

⚠ The repo's tokens are DTCG, and this format cannot read DTCG — a name-to-value map makes a family render empty. The generator converts to the flat lists this page wants. Edit the DTCG source, never these files.

## Content fundamentals

The writing voice is first-person, reflective, unhurried. Johan writes as himself — "I" throughout — closer to an essay or a letter than a blog post. Sentences can be long; the site earns its quiet. No marketing language, no imperative calls to action. The brand is the author.

**Casing:** sentence case everywhere — headings, navigation, labels. Uppercase appears only in the small-caps label style used for metadata and category labels.

**Emoji:** not used in body copy or UI.

**Punctuation:** em-dash for asides. Wikilinks (`[[like this]]`) are a first-class part of the writing system and render as orange-underlined anchors.

**US English spelling** — "colors", not "colours".

## Visual principles

**One accent does the work.** Orange is the single saturated driver — link underlines, the blockquote rule, the top-of-page border in dark mode, focus and active states. Blue and green are desaturated companions for category cues and the conic logo gradient, never calls to action. One screen rarely needs more than two or three orange touches.

**Warm, not neutral.** The page surface reads as paper rather than UI, and body text is a deep slate-blue rather than black, so the two stay warm together.

**Type carries hierarchy before color does.** Three Adobe Source families: a serif for display, a sans for reading, a mono for code. Weight, size and the small-caps label style do the work an icon or a color badge would do elsewhere.

**Everything is fluid.** Every type and space token is a Utopia `clamp()` between 320px and 1350px. There are almost no breakpoints; Every Layout compositions handle local layout intrinsically.

**Depth is tonal first.** A surface lifts by changing value — the page surface to the elevated surface — before it reaches for anything else. Shadows exist and are used deliberately, in three named recipes (`panel` for the mega-menu, `popup` for the map popup and tooltips, `chip` for inline code), each two layers and each going deeper in dark theme. A shadow is a tool for things that genuinely float above the page, not a default for cards.

**Motion is minimal.** Colour transitions around 200ms; a button scales to 99% on press. No page transitions, no parallax, no decorative motion. Everything is gated behind `prefers-reduced-motion`.

**Corners are mostly square.** Three named radius tokens — small for code and chips, medium for buttons and inputs, pill for tags. Layout containers, articles and headings take no radius at all.

**Focus is a ring, never a shadow.** A 3px outline at a 0.3ch offset, tuned by the `--focus-color` and `--focus-offset` tokens.

**Imagery** is editorial and documentary — warm, slightly desaturated, no heavy filters. Captions italic and centred.

**Icons** are a small hand-picked SVG set in `src/assets/svg/` (`misc/`, `platform/`, `posts/`, `divider/`), inlined at build time by an `{% svg %}` shortcode. No icon font, no sprite sheet, no third-party library, and no emoji standing in for an icon. Icons support the type; they never replace a label.

## About the previews

Two carry live behaviour rather than a picture of it. **Nav** runs the site's own compiled `nav-menu.js`, so the MENU button really is injected from its template, the panel really opens, and Escape really closes it. **Theme toggle** uses a small stand-in script, because the site's compiled `theme-toggle.js` still holds `{{ meta.* }}` placeholders that only Eleventy fills.

⚠ Because `bundle.css` is the site's real stylesheet, its global element rules apply to preview markup too. `global-styles.css` sizes every `<svg>` to `0.6lh` for inline icons, so a preview with a large SVG has to state its own size or it collapses.

## Rules for building with this

- Use the semantic tokens (`--color-text`, `--color-bg`, `--color-bg-accent`) — not the palette tokens (`--color-orange-500`). The semantic layer is what flips in dark theme.
- Never hard-code a hex, a size, or a space value. If there isn't a token, that's a design decision, not a licence to inline a number.
- Layout comes from compositions — `.flow`, `.wrapper`, `.cluster`, `.repel`, `.grid`, `.sidebar` — not from bespoke flexbox.
- Variants are data attributes (`data-button-variant="primary"`), never modifier classes.
- No Tailwind utility classes in markup. Tailwind is a token compiler here, not a utility framework.
