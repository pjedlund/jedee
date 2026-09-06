---
description: "The three states a theme control has to represent, the blocking script that prevents a flash of the wrong one, and jedee's single SVG masked from sun to moon."
date: 2026-07-31
---

Dark mode reaches a page two ways. [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) reports the operating system's setting and handles most visitors with no interface at all. A toggle exists for everyone else — someone whose system is dark but who wants this one site light — and the moment a site has one it has three states to represent rather than two: light, dark, and *follow the system*, which is not the same as either of the others.

Two problems arrive with the toggle, and both are more awkward than the button itself.

**The flash of the wrong theme.** A chosen theme is stored on the client, usually in `localStorage`, and reading it is JavaScript. If that script runs after the page has painted, the visitor sees the default theme for a frame and then a jump. The only reliable fix is a small *blocking* inline script in the head that applies the theme before first paint — one of the few cases where a render-blocking script is the correct answer rather than an oversight.

**Motion.** A control that morphs one shape into another is exactly the decorative animation [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) exists for. The state change still has to read clearly with the animation off, which means the reduced-motion path needs to be a designed alternative rather than `animation: none`.

## In jedee

One button, one SVG: a sun that morphs into a moon when the theme goes dark. Adapted from [Adam Argyle's sun-and-moon theme switch](https://web.dev/building-a-theme-switch-component) (MIT). Three files carry it — `partials/theme-toggle.njk`, `blocks/theme-toggle.css`, and `scripts/bundle/theme-toggle.js`.

**Diverges from Eleventy Excellent**, which ships its own toggle. This replaced an earlier two-icon version that stacked both glyphs and showed whichever was *inactive*.

### There is no moon shape

The moon is the sun's disc with a circle masked out of it:

```html
<mask class="moon" id="theme-toggle-moon-mask">
  <rect x="0" y="0" width="100%" height="100%" fill="white" />
  <circle cx="24" cy="10" r="6" fill="black" />
</mask>
<circle class="sun" cx="12" cy="12" r="6" mask="url(#theme-toggle-moon-mask)" fill="currentColor" />
```

In light mode the mask circle sits at `cx="24"`, outside the disc, so the mask does nothing. Going dark it slides left and bites the crescent while the disc grows and the eight ray lines fade out.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/theme-toggle-morph.png" alt="Five orange glyphs in a row, each labelled with a time in milliseconds. At 0ms a sun with eight rays. At 80ms the rays have faded to pale stubs and the disc is larger. At 260ms a plain circle with no rays and no bite taken out of it. At 420ms a circle with a rounded notch cut into its upper right. At 750ms a crescent moon." width="1332" height="422">
  <figcaption>The morph, frozen at five instants. The middle frame is the whole point: for a moment the moon is a plain disc, because a moon is all it ever is — a disc with a circle masked out of it.</figcaption>
</figure>

The mockup is `src/wiki/_sources/theme-toggle.html`. It links the site's compiled `global.css`, so the easings, the durations and the mask geometry in the picture are this stylesheet's rather than a copy, and each frame is a real transition paused and seeked with `getAnimations()`. The glyph is drawn far larger than its shipped 24px, where the mask circle's whole travel is about three pixels; the color is held at the sun's orange across all five, since what changes here is shape and the color question is below.

⚠ **A transition only exists where a value changes.** The first version rendered each frame with `data-theme="dark"` already on it, so nothing ever transitioned and `getAnimations()` had nothing to seek — all five frames came out as the finished moon. They have to be built in the light state, flipped, and *then* frozen. Reading a computed value in between is what forces the recalc that creates the transitions.

### The reduced-motion split

Everything keys off `data-theme` on `<html>`. The **end states always apply**; only the animation between them lives inside `@media (prefers-reduced-motion: no-preference)`. A reduced-motion user gets an instant swap, never a broken half-state — this is EE's "opt in to motion" idiom rather than the reset's global duration clamp.

```css
[data-theme='dark'] .sun-and-moon > .sun { transform: scale(1.75); }
[data-theme='dark'] .sun-and-moon > .sun-beams { opacity: 0; }

@supports (cx: 1px) {
  [data-theme='dark'] .sun-and-moon > .moon > circle { transform: translateX(0); cx: 17px; }
}
```

The mask circle animates its `cx` **attribute** where CSS geometry properties are supported, which keeps the mask geometry honest; older browsers get a `translateX` fallback of the same distance. Timings are staggered: beams fold in fast (0.15s, −25° rotation), disc grows in 0.25s, mask circle slides last (0.25s delay, 0.5s); going light the disc springs back on an elastic easing.

Argyle's original pulls its easings from Open Props via a remote `@import`. Here the four cubic-beziers are local custom properties on the button, so **nothing is fetched at runtime**.

### No flash of the wrong theme

`scripts/bundle/theme-toggle.js` is minified into `_includes/scripts/` and inlined into `<head>` by `js-inline.njk`, so it runs **before the body renders**:

```js
function getColorPreference() {
  if (localStorage.getItem(storageKey)) return localStorage.getItem(storageKey);
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
reflectPreference(); // set early so no page flashes
```

The choice lives in `localStorage` under `theme-preference` and is applied as `data-theme` on `document.firstElementChild` — the attribute all theme CSS, including the icon morph, selects on. With no saved choice it follows the system setting, and a listener on that media query keeps the page in sync if the OS switches while the page is open. `setPreference()` also rewrites `<meta name="theme-color">` from the two colors in `src/_data/meta.js`.

### Accessibility details worth copying

- **The accessible name is a visually-hidden label**; the SVG is `aria-hidden`. State rides on `aria-pressed`, where pressed = dark mode active.
- **The button is wrapped in `<is-land on:idle>`** and hidden by CSS until the island upgrades (`is-land:not(:defined) .theme-toggle { display: none; }`) — a toggle that can't run shouldn't show. The theme itself doesn't depend on the button; the inline script sets it.
- **The hit area stays at the WCAG 2.5.8 minimum of 24×24px on purpose.** A bigger target would be empty space pushing the icon away from the nav. Sized with `--theme-toggle-size: var(--size-step-min-1)` to sit alongside the wordmark.

### Why the icon can't be yellow

The **sun** is `--color-accent-orange` (`#d0621e`), the same orange as the breadcrumb logomark at the other end of the header, and hover only deepens it — `color-mix(in oklab, var(--color-accent-orange) 82%, var(--color-text))`. Mixing toward the *text* color rather than a fixed second color is what lets one declaration work in both themes: it darkens on the light page and lightens on the dark one, which is the direction that preserves contrast each way.

The **moon** is not orange — a night-sky object rather than a warm one. It is `--color-text` cooled by 12% `--color-blue-vivid` (`#b9c3cd`), with the accent orange kept for its hover. So the two glyphs do not share a color, and the dark override is where that is expressed.

The tint is a nod to perception rather than physics. The lunar surface is grey-brown with an albedo close to worn asphalt, and moonlight is reflected sunlight, so spectrally it is faintly *warm*. We see night as blue because of the [Purkinje effect](https://en.wikipedia.org/wiki/Purkinje_effect): in dim light vision shifts to the rods, whose peak sensitivity lies further toward blue-green. An icon should follow the perception.

Two practical notes. There is no light blue to reach for — the ramp is three dark values (`#245375`, `#2f536e`, `#3d8ecc`), and the lightest reads as a link blue, an interface color that would compete with the orange logomark a few centimetres to its left in the same header. And the mix has to come from blue-**vivid**: `--color-accent-blue` resolves to the desaturated `#2f536e` in dark, so 12% of it barely registers (chroma 0.010 against 0.018). Contrast is not the constraint here the way it was for the sun — every mix from 6% to 30% lands between 8.9 and 10.6 on the dark background, so the percentage is purely an aesthetic dial.

| mix into `--color-text` | hex | on `#141619` | chroma |
|---|---|---|---|
| none (`#c8cacc`) | `#c8cacc` | 11.03 | 0.004 |
| 6% blue-vivid | `#c0c7cc` | 10.58 | 0.011 |
| **12% blue-vivid** | **`#b9c3cd`** | **10.14** | **0.018** |
| 20% blue-vivid | `#aebfcd` | 9.58 | 0.027 |
| 30% blue-vivid | `#a1b9cd` | 8.91 | 0.039 |

Fixing the logomark to match found two live contrast failures on every page but the start page, where the trail's home crumb takes `--color-logo-icon` rather than the `aria-current` orange: that token was `--color-base-dark` (`#bbbfca`) in light, measuring **1.67**, and `--color-orange-700` (`#8c2100`) in dark, measuring **2.01**. Both are now the one accent orange, and the `aria-current` special case is gone with them — the home crumb no longer differs from anywhere else.

A yellower, lighter sun was the design intent and is not reachable. The sun only ever appears in the light theme, on `#f4f4f2`, and [WCAG 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) wants 3:1 for a graphic you need in order to operate a control — which an icon-only button's icon is, notwithstanding its `aria-hidden` (that attribute governs the accessibility *tree*, not what a sighted user has to see). Measured against that background, the palette's lighter oranges are nowhere close:

| | on `#f4f4f2` | on `#141619` |
|---|---|---|
| orange-200 `#ffdec3` | 1.16 | 14.23 |
| orange-300 `#ffb78a` | 1.54 | 10.70 |
| orange-400 `#f68f5a` | 2.12 | 7.76 |
| **orange-500 `#d0621e`** | **3.50** | **4.70** |

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/theme-toggle-sun-colors.png" alt="The same sun glyph four times on the site's light page color, in progressively deeper oranges, each labelled with its contrast ratio. The first at 1.16 to 1 is a pale cream barely separable from the background; the second at 1.54 and the third at 2.12 are legible but faint; only the fourth, at 3.50 to 1, reads as a solid mark." width="1372" height="386">
  <figcaption>The same table, drawn. The sun is only ever shown on this background, and only the last of the four is a graphic a person could use to operate a control.</figcaption>
</figure>

This is a general constraint, not a palette flaw: a light background and a yellow object cannot both be true at 3:1, which is why yellow suns live on dark headers. orange-500 is the lightest shade that clears the bar in the theme where the sun is shown.

The eight states as shipped, measured on the painted pixels rather than derived:

| | light rest | light hover | dark rest | dark hover |
|---|---|---|---|---|
| logomark | 3.50 | 3.94 | 4.70 | 5.56 |
| toggle icon | 3.50 | 3.94 | 10.14 | 4.70 |

### Current state, not target state

Because the CSS selects on `[data-theme='dark']` and the icon's resting form is the sun, the icon always shows the theme **you are in**. The old two-icon version did the opposite — it advertised what a click would give you. Dropping that convention makes the state indicator and the control the same object, and `aria-pressed` tells assistive tech the same story.

### The label

The accessible name is a `visually-hidden` span, not the SVG, which is `aria-hidden`; `aria-pressed` carries the state. Since 2026-09-02 there is also a visible tooltip on hover and keyboard focus — see [[Tooltips]] — and the two strings deliberately say different things.

The name is a fixed "Toggle dark mode". It has to be: on a toggle button the state lives in `aria-pressed`, and a name that flips with it announces the state twice in two vocabularies. The tooltip is decoration, exposed to nobody, so it is free to say what a click *will* do — "Show dark mode" in light, "Show light mode" in dark, set by `reflectToggleState()` in the same breath as `aria-pressed`, so a theme change from any source (the button, the system preference listener, first load) updates both.

The markup carries no `data-tooltip`; the script adds it. That keeps a wrong string from ever existing, and costs nothing, because the button is already hidden until its island upgrades. The `title` attribute that used to serve this purpose was removed, or the browser would draw its own native tooltip beside the styled one.

Raw source: `src/_raw/dev-notes/How the theme toggle works.md`
