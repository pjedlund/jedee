# JEDEE Design System

**JEDEE** is the personal indieweb site of Johan Edlund — a designer and front-end developer in Malmö, Sweden. It publishes long-form articles, a reading and listening log, short wikilinked notes, and a dozen other IndieWeb post types. Built with Eleventy, styled with CUBE CSS over Utopia fluid type and space scales, deployed static. The sign-off *Soli Deo Gloria* signals public-domain intent.

## How this design system stays true

`jedee.css` **is the site's own compiled stylesheet**, copied unmodified from `src/_includes/css/global.css` with only the font URLs rewritten to sit beside it. It is not a translation, a summary, or a hand-kept copy. Every token name here is the name the site uses.

This matters because the previous version of this project was a hand-written translation under a third set of names, and it drifted three months out of date without anyone noticing — including a dark theme that was never in the site at all.

**So: this file holds only what cannot go stale** — intent, voice, and rules. Every *value* lives in the preview pages, which take their token names from `jedee.css` when the bundle is built and read each value from the live stylesheet as they render. If you want to know a number, open the preview; don't look for it here.

⚠ A preview must never discover token names through `document.styleSheets` — reading `cssRules` on a stylesheet served from another origin throws, and the page then renders empty with no error anyone would see.

Regenerate the bundle from the repo with `npm run design:bundle`.

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

## What's in here

```
README.md                      ← This file: voice, principles, rules
SKILL.md                       ← Agent skill descriptor
jedee.css                      ← The site's compiled stylesheet, verbatim
fonts/                         ← The seven self-hosted woff2 subsets it references
local/                         ← Per-page CSS bundles a preview links when it needs one
js/                            ← Compiled site scripts a preview needs to actually behave
preview/
  foundations-color.html       ← Every --color-* token, read live, light and dark
  foundations-type.html        ← Families and the full type scale, clamps resolved
  foundations-space.html       ← Space steps and fluid pairs
  component-button.html        ← All button variants and states
  component-card.html          ← <custom-card> and its image-ratio variants
  component-prose.html         ← Running text, quotes, code, lists, rules
  component-nav.html           ← The post-type mega-menu, running the site's own nav-menu.js
  component-breadcrumb.html    ← Home, archive and post trails in the header bar
  component-theme-toggle.html  ← The sun/moon morph, light and dark
  component-tooltip.html       ← Placement exceptions and the current-page suppression
  component-footer.html        ← Licence line, page links, rel="me" platform icons
```

Two previews carry live behaviour rather than a picture of it: **nav** runs the site's compiled `nav-menu.js`, so the MENU button really is injected from its template and the panel really closes on Escape; **theme toggle** uses a small stand-in script, because the compiled `theme-toggle.js` still holds `{{ meta.* }}` placeholders that only Eleventy fills.

## Rules for building with this

- Use the semantic tokens (`--color-text`, `--color-bg`, `--color-bg-accent`) — not the palette tokens (`--color-orange-500`). The semantic layer is what flips in dark theme.
- Never hard-code a hex, a size, or a space value. If there isn't a token, that's a design decision, not a licence to inline a number.
- Layout comes from compositions — `.flow`, `.wrapper`, `.cluster`, `.repel`, `.grid`, `.sidebar` — not from bespoke flexbox.
- Variants are data attributes (`data-button-variant="primary"`), never modifier classes.
- No Tailwind utility classes in markup. Tailwind is a token compiler here, not a utility framework.
