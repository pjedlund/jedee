---
description: "The three states a theme control has to represent, the blocking script that prevents a flash of the wrong one, and stomme's single SVG masked from sun to moon."
date: 2026-07-31
updated: 2026-10-31
---

Dark mode reaches a page two ways. [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) reports the operating system's setting and handles most visitors with no interface at all. A toggle exists for everyone else — someone whose system is dark but who wants this one site light — and the moment a site has one it has three states to represent rather than two: light, dark, and *follow the system*, which is not the same as either of the others.

Two problems arrive with the toggle, and both are more awkward than the button itself.

**The flash of the wrong theme.** A chosen theme is stored on the client, usually in `localStorage`, and reading it is JavaScript. If that script runs after the page has painted, the visitor sees the default theme for a frame and then a jump. The only reliable fix is a small *blocking* inline script in the head that applies the theme before first paint — one of the few cases where a render-blocking script is the correct answer rather than an oversight.

**Motion.** A control that morphs one shape into another is exactly the decorative animation [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) exists for. The state change still has to read clearly with the animation off, which means the reduced-motion path needs to be a designed alternative rather than `animation: none`.

## In stomme

One button, one SVG: a sun that morphs into a moon when the theme goes dark. Adapted from [Adam Argyle's sun-and-moon theme switch](https://web.dev/building-a-theme-switch-component) (MIT). Four files carry it — `partials/theme-toggle.njk`, `local/theme-toggle.css` (the button), `local/sun-and-moon.css` (the icon and its animation), and `scripts/bundle/theme-toggle.js`.

**Diverges from Eleventy Excellent**, which ships its toggle. This replaced an earlier two-icon version that stacked both glyphs and showed whichever was *inactive*.

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
  <img eleventy:formats="webp,png" src="/assets/images/wiki/theme-toggle-morph.png" alt="Five tiles in a row. The first is a light tile holding a dark teal sun with eight rays, labeled &quot;light&quot;. The remaining four are dark tiles holding a pale blue-gray glyph, labeled with a time in milliseconds. At 80ms the rays have faded to dim stubs and the disc is larger. At 260ms a plain circle with no rays and no bite taken out of it. At 420ms a circle with a rounded notch cut into its upper right. At 750ms a crescent moon." width="1368" height="376">
  <figcaption>The morph, frozen at five instants. The middle frame is the whole point: for a moment the moon is a plain disc, because a moon is all it ever is — a disc with a circle masked out of it. The color and the page behind it carry no transition, so they have already changed by the second tile while the shape is still most of the way a sun.</figcaption>
</figure>

The mockup is `src/wiki/_sources/theme-toggle.html`. It links the site's compiled `global.css`, so the easings, the durations, the mask geometry and both palettes in the picture are this stylesheet's rather than a copy, and each frame is a real transition paused and seeked with `getAnimations()`. The glyph is drawn far larger than its shipped 24px, where the mask circle's whole travel is about three pixels. The first tile is the light resting state, before the click; the other four are past it, which is why they wear the dark page color and the moon's blue-gray from their first millisecond — when the figure was shot, neither the icon color nor the background was in any transition list, so both snapped while only the shape animated. Since 2026-10-26 the button fades its color with `transition: color`, and the icon is no longer orange or blue-gray; the colors are the subject further down.

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
- **The button is wrapped in an [[is-land]] island, `on:idle`** and hidden by CSS until the island upgrades (`is-land:not(:defined) .theme-toggle { display: none; }`) — a toggle that can't run shouldn't show. The theme itself doesn't depend on the button; the inline script sets it.
- **The hit area stays at the WCAG 2.5.8 minimum of 24×24px on purpose.** A bigger target would be empty space pushing the icon away from the nav. The glyph takes the header's shared icon size, `--theme-toggle-size: var(--site-header-icon-size, var(--size-step-min-2))`, the same as the logomark and the search magnifier.

### Why the icon can't be yellow

The icon is neither orange nor blue. Like the rest of the header chrome it rests at `--color-text-header-dim` in both themes and brightens to `--color-text-strong` on hover and keyboard focus; only the logomark takes the accent color. The reasoning below still holds for any colored icon in a header.

A colored icon is held to the same contrast rule as any graphic you need in order to operate a control: [WCAG 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) wants 3:1 for it, notwithstanding its `aria-hidden` (that attribute governs the accessibility *tree*, not what a sighted user has to see). So a yellower, lighter sun is not reachable in a light theme: a light background and a yellow object cannot both be true at 3:1, which is why yellow suns live on dark headers. A warm accent only works if it is dark enough, so measure the lightest shade of the accent ramp against the page color before choosing it.

Mixing a hover color toward the *text* color, rather than a fixed second color, is what lets one declaration work in both themes: it darkens on the light page and lightens on the dark one, which is the direction that preserves contrast each way. A tint added to the text color for a moon has to come from a vivid shade of the hue, since the theme's plain accent token can be desaturated in dark mode and barely register.

Check every state, not only the resting one: light and dark, rest and hover, for the toggle icon and for the logomark beside it. The icon should clear 4.5:1 in each, and the logomark 3:1. A header logomark that takes a token other than the accent can fail contrast on every page but the start page, so keep the home crumb on the same token as everywhere else.

### Current state, not target state

Because the CSS selects on `[data-theme='dark']` and the icon's resting form is the sun, the icon always shows the theme **you are in**. The old two-icon version did the opposite — it advertised what a click would give you. Dropping that convention makes the state indicator and the control the same object, and `aria-pressed` tells assistive tech the same story.

### The label

The accessible name is a `visually-hidden` span, not the SVG, which is `aria-hidden`; `aria-pressed` carries the state. There is also a visible tooltip on hover and keyboard focus — see [[Tooltips]] — and the two strings deliberately say different things.

The name is a fixed "Toggle dark mode". It has to be: on a toggle button the state lives in `aria-pressed`, and a name that flips with it announces the state twice in two vocabularies. The tooltip is decoration, exposed to nobody, so it is free to say what a click *will* do — "Show dark mode" in light, "Show light mode" in dark, set by `reflectToggleState()` in the same breath as `aria-pressed`, so a theme change from any source (the button, the system preference listener, first load) updates both.

The markup carries no `data-tooltip`; the script adds it. That keeps a wrong string from ever existing, and costs nothing, because the button is already hidden until its island upgrades. The `title` attribute that used to serve this purpose was removed, or the browser would draw its native tooltip beside the styled one.
