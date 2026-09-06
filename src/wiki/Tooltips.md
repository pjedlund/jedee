---
description: "A label that appears on hover or focus; why its text must never be the control's only accessible name, and why CSS alone is enough for the decorative case."
date: 2026-09-02
---

A tooltip is a small label that appears when a pointer rests on a control or the control takes keyboard focus. On the web it comes in three forms, and they are not interchangeable.

**The `title` attribute** is the native one. It costs nothing, works with no CSS and no JavaScript, and is contributed to the accessible name — but it is [widely discouraged](https://www.tpgi.com/using-the-html-title-attribute-updated/) for anything that matters: it never appears on touch, most browsers never show it to keyboard users, its delay and styling are the operating system's, and it is truncated without warning. Treat it as a fallback of last resort rather than a feature.

**A CSS-generated tooltip** — a `::after` on the control, with `content: attr(data-tooltip)` — is the lightweight custom version. It needs no script, positions itself in the control's own coordinate space, and can be styled to match the design. Its limit is that generated content is not dependable as an accessible name.

**A scripted tooltip** — a real element, `aria-describedby`, positioning against the viewport, dismissable per [WCAG 1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) — is what you need when the tooltip carries information that exists nowhere else on the page. If a visitor cannot complete a task without reading it, it is not decoration and CSS alone is not enough.

## Generated content is not an accessible name

This is the decision the other three follow from. `content: attr(…)` is exposed to assistive technology inconsistently across browser and screen-reader combinations, and it vanishes entirely with author styles disabled. So a control whose only label is in a `::after` has, for some visitors, no label at all.

The way out is to stop asking the tooltip to be the label:

```html
<button data-tooltip="Toggle dark mode">
  <svg aria-hidden="true">…</svg>
  <span class="visually-hidden">Toggle dark mode</span>
</button>
```

The `visually-hidden` span is the accessible name. The tooltip shows sighted pointer and keyboard users the same string visually. The duplication is the design, not a smell — and it means the tooltip can be dropped entirely without breaking anything.

It follows that a CSS tooltip must never carry information that is not already available another way. The moment it does, it needs the scripted treatment.

### Where the two strings are allowed to differ

Being decoration also buys the tooltip a freedom the accessible name does not have. On a **toggle button** — `aria-pressed`, a control whose meaning flips — the accessible name has to stay put. [ARIA's guidance on toggle buttons](https://www.w3.org/WAI/ARIA/apg/patterns/button/) is explicit: the state is `aria-pressed`, and changing the label as well announces the state twice, in two vocabularies that will sooner or later disagree. "Show light mode, toggle button, pressed" is a sentence nobody can act on.

A visible tooltip carries no state to assistive technology, so it is free to say what a click *will* do — which is the more useful thing for someone looking at an ambiguous icon. A static accessible name plus a dynamic tooltip is correct on both counts, and it is the one case where the two strings should not match.

## Hover is not the only trigger

The common failure in copy-and-paste tooltip CSS is a `:hover`-only selector. A keyboard user tabbing through a row of icon buttons then sees nothing. `:is(:hover, :focus-visible)` costs one selector:

```css
[data-tooltip]:is(:hover, :focus-visible)::after { opacity: 1; visibility: visible; }
```

`:focus-visible` rather than `:focus`, so a mouse click on the control doesn't leave the tooltip stuck open afterwards.

Touch is the third case, and the honest answer is that a hover tooltip does not exist there — a tap fires neither `:hover` nor `:focus-visible` in any useful way. That is another reason the content has to be redundant.

## Positioning and the page edge

A tooltip centred under its control is `inset-inline-start: 50%` plus a `-50%` translate. That is correct until the control sits at the edge of the page, where half the label lands outside the viewport and the document grows a scrollbar — on every page, not just when the tooltip is showing, because a `visibility: hidden` element still takes part in layout and overflow.

The vertical version of the same thing is easier to miss: a tooltip *below* a control near the foot of the page extends past the document, adding dead scroll under the footer that nothing visible accounts for. Both are worth measuring rather than eyeballing — compare `documentElement.scrollWidth` / `scrollHeight` against `clientWidth` / `clientHeight` with the tooltip hidden.

Without the CSS Anchor Positioning API (not yet broadly available) the cheap fix is explicit placement exceptions, chosen in the markup by whoever places the control: anchor the label to the control's leading or trailing edge instead of its centre, and flip it above the control instead of below.

Keeping the two axes independent is worth a little care, or a control that needs both gets one and loses the other. Expressing the placement as two custom properties the exceptions rewrite — one inline nudge, one block nudge — lets an alignment and a position combine, where two rules each rewriting the whole `translate` cannot.

## Transitioning `visibility`

Fading a tooltip with `opacity` alone leaves it in the hit-testing and layout picture while invisible. `visibility: hidden` takes it out, and it can be transitioned alongside opacity — `visibility` animates as a step function, so it flips at the end of the delay rather than interpolating. Transition both, or the fade-out reveals the element snapping away.

## In jedee

One CUBE block, `src/assets/css/global/blocks/tooltip.css`, about 55 lines. The block itself is CSS only; a control may opt into one extra behavior with a line of its own script (see "Dismissing after use" below). Not Eleventy Excellent stock — EE ships no tooltip. Adapted from the header tooltip on [arielsalminen.com](https://arielsalminen.com/), retokenized and given the triggers below.

Ten controls use it. In the header, the breadcrumb logomark (`Home`) and the light/dark toggle (see [[The theme toggle]]), both icon-only and at opposite edges. In the footer, the whole icon row — the Atom feed link and seven platform links, all of them icon-only with a `visually-hidden` label. Both header controls previously carried a `title`, which was removed: with `data-tooltip` in place the browser draws its own native tooltip alongside the styled one.

The theme toggle is the divergence case described above. Its accessible name is a fixed "Toggle dark mode" with `aria-pressed` carrying the state, while its tooltip is set by `theme-toggle.js` on every theme change — "Show dark mode" in light, "Show light mode" in dark. The markup carries no `data-tooltip` at all; the script adds it, which is honest, since the button is already hidden until its island upgrades.

The colors need no dark-mode rules. Background is `--color-text` and text is `--color-bg`, so the label inverts against the page in both themes on its own; only the shadow swaps (`--box-shadow-popup` → `--box-shadow-popup-dark`), the same way the mega-menu panel does it.

Three behaviors the source design did not have:

- **`:focus-visible` as well as `:hover`.** Verified with a real Tab press — Chromium does not honour `element.focus({focusVisible: true})` from script, so a scripted focus reports `:focus-visible` as false and reads as broken CSS.
- **Two edge anchors**, `data-tooltip-align="start"` and `="end"`, because both header controls are at opposite edges, and a `data-tooltip-position="top"` for the footer's feed icon, which sits close enough to the bottom of the document that a tooltip below it added 16px of dead scroll — measured, not guessed. The defaults stay centred and below for anything placed inland.
- **Suppressed on `aria-current`.** The source spells this `:not(.active)` on its nav items; the attribute already carries the state, so `[data-tooltip][aria-current]::after` does it without a class. On the start page the logomark *is* the current page, and its tooltip would have landed on top of the wordmark typing itself in (see [[Choreographing CSS animations]]).

### A `::after` inherits from a control styled not to look like text

Both header controls are deliberately unlike body text, and four of those properties reached the label: weight, case, tracking and leading. Resetting case and tracking was obvious. Weight was not, because the reset that was written did not work:

```css
font-weight: var(--font-normal);   /* --font-normal does not exist */
```

The weight tokens here are `--font-regular`, `--font-bold`, `--font-extra-bold`. So the declaration was invalid at computed-value time, the property fell to `unset`, and — `font-weight` being inherited — that meant taking the host button's `700`. The label rendered bold and looked deliberate; `getComputedStyle(el, '::after').fontWeight` returned `"700"` while the stylesheet said otherwise. See [[Undefined custom properties]], of which this is the inherited-branch twin.

`line-height` is pinned for the same reason rather than inherited: a tooltip should read identically on every control it attaches to.

### Dismissing after use

`:active` hides the tooltip for the length of the press, and that is all CSS can express: on mouseup the pointer is still over the control, `:hover` still matches, and the label comes back over a button the visitor has just finished using. There is no CSS state for "hidden until the pointer leaves and returns."

`:hover:not(:focus)` is the usual trick and was rejected. It relies on a click focusing the button, which Chrome and Firefox do and Safari on macOS does not, so the behaviour would be absent on one engine and the tooltip would additionally stay suppressed for as long as the button kept focus — including after the pointer left and came back.

Instead the control's own script sets a `data-tooltip-dismissed` attribute on click and removes it on `pointerleave` or `blur`; the block hides on that attribute alongside `:active`. Four lines inside the existing theme-toggle click handler, correct in every engine, and keyboard-safe — nothing is blurred, so an Enter press leaves focus where it was. The attribute is part of the block's contract, so any control can opt in the same way.

### What is not built

No `bottom`/`left`/`right` placements beyond the three that a real control needed, no arrow, no delay knob, no JS repositioning — nothing measures the viewport, so placement is the author's call rather than automatic. The MENU button briefly had a tooltip and lost it — it already carries a visible label, so the tooltip was pure decoration there. It left the padding behind (`var(--space-xs) var(--space-s)`, taken from `.menu-toggle`) so the label reads at the same density as the header's one bordered control.

Related: [[The theme toggle]] — the other half of the header's right-hand cluster, and the control the first tooltip was built for. [[Focus rings and paint containment]] — the other case where a decoration positioned outside a control's box gets clipped or overflows by surprise.

Raw source: `src/_raw/dev-notes/How the header tooltips work.md`
