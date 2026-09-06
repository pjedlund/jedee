---
description: "A var() pointing at nothing does not skip the declaration — it makes the property unset, which means inherit or initial depending on the property."
date: 2026-08-22
---

CSS lets a stylesheet name its own values — `--brand-color: crimson` — and read them back anywhere with `var(--brand-color)`. These are **custom properties**, and they are the machinery behind design tokens, theming and dark mode. This page is about what happens when the name is wrong: a typo, a token that got renamed, a property that was never defined at all.

When a declaration uses `var()` to reference a custom property that was never defined, and gives no fallback, the result is not what most people expect. The declaration is not a syntax error, and it is not skipped. It is **invalid at computed-value time** ([CSS Variables spec §invalid-variables](https://www.w3.org/TR/css-variables-1/#invalid-variables)), and the spec says the property then takes [`unset`](https://developer.mozilla.org/en-US/docs/Web/CSS/unset).

That is the whole trap, because `unset` means two different things:

- **Inherited properties** (`color`, `font-family`, `letter-spacing`, `visibility`…) → behave as `inherit`, taking the parent's value.
- **Non-inherited properties** (`border-width`, `background`, `padding`, `display`…) → behave as `initial`, taking the property's CSS-defined initial value.

So the same mistake is invisible on one property and visible on another:

```css
.thing {
  font-family: var(--nope);   /* inherits — looks fine */
  border-width: var(--nope);  /* initial → `medium` → 3px in every major browser */
}
```

Two things make this worse than an ordinary typo. Nothing errors — no console warning, no build failure; the stylesheet is valid CSS and the value simply isn't there. And the initial value of `border-width` is the keyword `medium`, not zero, so a reader reasoning "the declaration is ignored, therefore no border" is wrong twice over.

A fallback avoids the whole question, and is worth using wherever a property might not be defined in every context:

```css
border-width: var(--border-thickness, 1px);
```

Note also that the invalidity propagates only at *use* time. A custom property is allowed to hold nonsense — `--x: not-a-length` is a perfectly valid declaration — and nothing goes wrong until something tries to consume it. This is why the failure surfaces far from the line that caused it.

## In jedee

This shipped to production. `button.css` referenced two properties that are defined nowhere in the repo:

```css
--button-border-width: var(--border-thickness);
--button-font-family: var(--font-body);
```

Both names are Eleventy Excellent / Every Layout stock — Every Layout's Box primitive uses `--border-thickness`, and the `cube-css` skill lists it as one of the project's border tokens. jedee's rewritten token system dropped the definitions and the references stayed. `code.css` referenced `--border-thickness` three more times.

The consequences split exactly along the inherit/initial line. `font-family` inherited Source Sans from its parent and looked perfectly correct. `border-width` fell to `medium`, so **every non-small button on the live site carried a 3px border nobody chose** — confirmed with `getComputedStyle`, not inferred. `[data-small-button]` escaped it by setting `2px` explicitly.

It hid for so long because on four of the five variants the border color is `color-mix(in oklab, var(--button-bg) 80%, var(--color-text))` — a slightly darker shade of the button's own background. A 3px border in nearly the background color reads as a slightly heavier button. On the ghost button, whose border is `--color-text`, it was plainly visible once anyone looked.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/undefined-border-width.png" alt="Two rows of the same five buttons at equal size. In the top row the border is 3px; on the dark, orange, blue and green buttons it reads as a slightly heavier edge in almost the button's own color, while the white ghost button has an obviously thick dark outline. In the bottom row every border is 1px and the ghost button's outline is a hairline." width="1396" height="404">
  <figcaption>The accident on top, the fix below. Four variants absorb the extra 2px into a border that is nearly their own background; the ghost button, whose border is <code>--color-text</code>, is where it shows.</figcaption>
</figure>

The mockup is `src/wiki/_sources/undefined-custom-properties.html`, rendering the real `button.css` at the real palette; `npm run mockups` re-shoots it. Both rows are drawn in equal-width columns, so the border width is the only thing that differs between them — sizing each button to its own content would have let the 3px row grow and passed that off as part of the finding.

The fix defined it once, beside the existing border convention:

```css
--border-thickness: 1px;
--stroke: var(--border-thickness) solid var(--color-bg-accent);
```

1px was not a guess: `--stroke` was already 1px and already used by eighteen bordered things, and the Penpot component drew its ghost button at 1px. Deriving `--stroke` from the new property leaves one border width on the site rather than two beside each other.

**A related failure in the same area, from a different cause.** `code.css` had:

```css
border-size: var(--button-border-size);
```

`border-size` is not a CSS property at all, and `--button-border-size` does not exist either (`button.css` defines `--button-border-*width*`). The parser dropped the declaration, so `--code-border-size` — defined carefully in all three theme blocks of that same file — was consumed by nothing, and `<pre>` inherited the same accidental 3px from `border-style: solid` plus an unset width. Now `border-width: var(--code-border-size)`.

**The inherit branch is only harmless when the parent is ordinary.** A second instance of this turned up on 2026-09-02, on the other branch of `unset`. `tooltip.css` wrote `font-weight: var(--font-normal)` — the weight tokens here are `--font-regular`, `--font-bold`, `--font-extra-bold`, and `--font-normal` has never existed. `font-weight` is inherited, so the property took its parent's value, and the parent was `.menu-toggle` at `font-weight: 700`. The tooltip rendered bold and read as a deliberate choice; `getComputedStyle(el, '::after').fontWeight` returned `"700"` while the stylesheet plainly said otherwise.

That refines the rule above rather than contradicting it. The inherit branch "looks fine" when the parent is ordinary body text, which is the usual case and is why the `font-family` example above went unnoticed for months. It looks *wrong* the moment the parent is styled deliberately unlike body text — a control, a heading, a caption. Generated content is the sharpest version, because a `::after` always inherits from exactly such an element. See [[Tooltips]].

**How to sweep for it:** grep the source for `var(--…)` references and diff the names against the defined ones. A referenced-but-undefined property is always a mistake; only whether it is a *visible* mistake depends on the property. The moment to do this is after any token-system rewrite, which is precisely when such references get orphaned.

**EE stock vs jedee:** the two property names are upstream; the missing definitions, and therefore the bug, are jedee's own.

Related: [[Design token sync]] — the other silent token failure, at the boundary with the design tool rather than inside the stylesheet. [[Text wrapping]] — another case where a global CSS rule produces a surprise in one specific block.

Raw source: `src/_raw/dev-notes/How an undefined custom property broke every button border.md`
