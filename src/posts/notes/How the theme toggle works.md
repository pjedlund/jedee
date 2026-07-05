---
title: How the theme toggle works
description: A dev note on the light/dark theme toggle — one SVG sun that animates into a moon, with code excerpts from the button partial, the CSS transitions, and the inline JavaScript that stores and applies the theme.
date: 2026-07-05
tags:
  - css
  - design
draft: true
---

The light/dark toggle in the header is a single button with a single SVG icon: a sun that animates into a moon when the theme goes dark. It replaces an earlier version that stacked two separate icons and showed whichever one was inactive. The design is [Adam Argyle's sun-and-moon theme switch](https://web.dev/building-a-theme-switch-component) from web.dev (MIT), adapted to this site's conventions. Three files carry it: the button partial, one CSS block, and one inlined script.

## The SVG

{% raw %}

`src/_includes/partials/theme-toggle.njk` holds the whole icon. It is one sun — a disc, eight ray lines, and a `<mask>` whose black circle starts off-canvas at `cx="24"`:

```html
<button type="button" id="theme-toggle" class="theme-toggle" data-theme-toggle aria-pressed="false" title="{{ meta.themeToggleLabel }}">
  <svg class="sun-and-moon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
    <mask class="moon" id="theme-toggle-moon-mask">
      <rect x="0" y="0" width="100%" height="100%" fill="white" />
      <circle cx="24" cy="10" r="6" fill="black" />
    </mask>
    <circle class="sun" cx="12" cy="12" r="6" mask="url(#theme-toggle-moon-mask)" fill="currentColor" />
    <g class="sun-beams" stroke="currentColor">
      <line x1="12" y1="1" x2="12" y2="3" />
      <!-- …seven more rays… -->
    </g>
  </svg>
  <span class="visually-hidden">{{ meta.themeToggleLabel }}</span>
</button>
```

Pointers:

- **There is no moon shape.** The moon is the sun's disc with a circle masked out of it. In light mode the mask circle sits at `cx="24"`, outside the disc, so the mask does nothing. In dark mode it slides left and bites the crescent.
- **The accessible name is the visually-hidden label** (`meta.themeToggleLabel`, "Toggle dark mode"); the SVG itself is decorative (`aria-hidden`). The on/off state is carried by `aria-pressed`, where pressed means dark mode is active.
- **The button is wrapped in `<is-land on:idle>`** and hidden by CSS until the island upgrades (`is-land:not(:defined) .theme-toggle { display: none; }`) — a toggle that can't run shouldn't show. The theme itself doesn't depend on this button; it is set by a separate inline script (below).

{% endraw %}

## The CSS

`src/assets/css/global/blocks/theme-toggle.css` does the morph. Everything keys off the `data-theme` attribute on `<html>`:

```css
/* DARK = moon: the disc grows, the beams fade, and the mask circle slides in
   to bite the crescent (cx where supported, translateX as a fallback). */
[data-theme='dark'] .sun-and-moon > .sun {
  transform: scale(1.75);
}

[data-theme='dark'] .sun-and-moon > .sun-beams {
  opacity: 0;
}

[data-theme='dark'] .sun-and-moon > .moon > circle {
  transform: translateX(-7px);
}

@supports (cx: 1px) {
  [data-theme='dark'] .sun-and-moon > .moon > circle {
    transform: translateX(0);
    cx: 17px;
  }
}
```

The transitions live entirely inside a `@media (prefers-reduced-motion: no-preference)` block. The end states above always apply; only the animation between them is conditional, so a reduced-motion user gets an instant swap instead of the morph:

```css
@media (prefers-reduced-motion: no-preference) {
  .sun-and-moon > .sun {
    transition: transform 0.5s var(--ease-elastic-3);
  }
  /* …beams and mask-circle transitions, dark-state timing overrides… */

  [data-theme='dark'] .sun-and-moon > .moon > circle {
    transition-delay: 0.25s;
    transition-duration: 0.5s;
  }
}
```

Pointers:

- **The timings are staggered.** Going dark, the beams fold in fast (0.15s, with a −25° rotation), the disc grows in 0.25s, and the mask circle slides in last (0.25s delay, 0.5s). Going light, the disc springs back with an elastic easing over 0.5s.
- **The mask circle animates its `cx` attribute directly** where the browser supports CSS geometry properties (`@supports (cx: 1px)`), which keeps the mask geometry honest; older browsers get a `translateX` fallback of the same distance.
- **The easings are inlined.** Argyle's original pulls its custom easings from Open Props via a remote `@import`; here the four cubic-bezier values are declared as local custom properties on the button, so nothing is fetched at runtime.
- **The sizing is a design decision, verified in the file:** `--theme-toggle-size: var(--size-step-min-1)`, commented "Sized to sit alongside the wordmark logo in the header." The hit area is kept at the WCAG 2.5.8 minimum of 24×24px on purpose — a bigger target would be empty space pushing the icon away from the nav.

## The JavaScript

{% raw %}

The readable source is `src/assets/scripts/bundle/theme-toggle.js`; a build step (`src/_config/events/build-js.js`) minifies everything in `scripts/bundle/` into `src/_includes/scripts/`, and `src/_includes/head/js-inline.njk` inlines the result into the `<head>` of every page. Because it runs before the body renders, the page never flashes the wrong theme:

```js
const storageKey = 'theme-preference';

function getColorPreference() {
  if (localStorage.getItem(storageKey)) {
    return localStorage.getItem(storageKey);
  } else {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

function reflectPreference() {
  document.firstElementChild.setAttribute('data-theme', theme.value);
}

// set early so no page flashes / CSS is made aware
reflectPreference();
```

The click handler flips `theme.value` between `'dark'` and `'light'`, then calls `setPreference()` to save and re-apply it.

Pointers:

- **Storage and application:** the choice lives in `localStorage` under `theme-preference`; it is applied as `data-theme="light|dark"` on `<html>` (`document.firstElementChild`), which is the attribute all the theme CSS — including the icon morph — selects on.
- **No saved choice falls back to the system setting** via `matchMedia('(prefers-color-scheme: dark)')`, and a listener on that media query keeps the page in sync if the OS switches theme while the page is open.
- **`setPreference()` also rewrites `<meta name="theme-color">`** so the browser chrome follows the page, using the two colors from `src/_data/meta.js`.
- **`reflectToggleState()` sets `aria-pressed` to whether dark mode is on** — the button reports its actual state, it doesn't advertise a target.

{% endraw %}

## Current state, not target state

Because the CSS selects on `[data-theme='dark']` and the icon's resting form is the sun, the icon always shows the theme you are in: sun during light mode, moon in dark mode. The old two-icon version did the opposite — it displayed the icon of the theme a click would give you, a "click for this" hint. The single-shape version drops that convention; the state indicator and the control are the same thing, and `aria-pressed` tells the same story to assistive tech.

The personal companion to this note is [[A shadow crosses the sun]].
