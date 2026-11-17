---
description: "How a site offers a dark theme: the system setting, a toggle that overrides it, what color-scheme hands to the browser, light-dark(), and how jedee wires all of it."
date: 2026-11-17
---

A dark theme can reach a page by two routes. The visitor's operating system reports its setting through the [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query, which needs no interface at all and covers most visitors. A toggle on the site lets someone override that for one site: dark on a light system, or the other way round. Most of what is hard about dark mode comes from keeping these two routes in step.

## Your colors and the browser's

A stylesheet only recolors what it styles. Everything the browser draws itself (scrollbars, form controls, the clear button in a search field, the open list of a `<select>`, media players, the default page background) follows a separate property, [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme):

```css
html {
  color-scheme: light dark;
}
```

`light dark` tells the browser the page supports both and lets the system setting choose. A matching `<meta name="color-scheme" content="light dark">` in the head lets the browser pick the right canvas color before the stylesheet has loaded. A toggle has to set the property as well as the colors. Otherwise the page is dark while the scrollbars and inputs stay light, because the browser is still following the system.

## Writing each color once: light-dark()

The traditional way to write a dark theme with a toggle needs every dark value twice: once in a `@media (prefers-color-scheme: dark)` block for visitors who never touch the toggle, and once under the toggle's attribute (`[data-theme='dark']`) for visitors who do. The block inside the media query also has to stand down when the toggle says light, which is why it is usually written as `:root:not([data-theme='light'])`.

[`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) folds both into one declaration. It returns its first color when the element's used `color-scheme` is light and its second when it is dark:

```css
:root {
  --color-text: light-dark(var(--color-base-darkest), var(--color-gray-250));
  --color-bg: light-dark(var(--color-base-lightest), var(--color-gray-900));
}
```

Since it reads `color-scheme`, a toggle that sets `color-scheme` switches every `light-dark()` value with no extra rule. It reached Baseline in May 2024, so by the usual 30-month rule it became widely available in November 2026. Two limits: it takes colors only (a shadow or a gradient still needs the old pair of blocks, though image values are arriving), and a browser that does not know it drops the whole declaration, leaving the browser's default black on white.

## Respecting the system after a toggle

A toggle has three states to represent, not two: light, dark, and *follow the system*, which is not the same as either. The usual mistake is saving whatever the visitor last picked. Someone who switches to dark and back to light ends up with "light" saved, and the site no longer goes dark in the evening with their system. Google Chrome's *Modern Web Guidance* puts the rule simply: when the visitor picks the scheme the system already shows, clear the saved choice instead of saving it. A saved choice that the system later happens to match is kept, or nobody whose system switches by time of day could pin a scheme at all.

## In jedee

Most of the machinery is Eleventy Excellent stock: the `color-scheme: light dark` rule, the meta tag, the inline script that applies a saved choice before the first paint (see [[The theme toggle]]), and the doubled `@media` and `[data-theme='dark']` blocks in `variables.css`. Lene Saile considered `light-dark()` for Eleventy Excellent 4.0 and left it out because browser support was still too low; in January 2025 it had been Baseline for only eight months. The reason was the date, not accessibility. Her theme documentation calls dark mode an accessibility feature in its own right and asks that a changed switch keep its accessible name.

jedee's own additions, all from 2026-11-17:

- **`color-scheme` follows the toggle.** Two rules in `global-styles.css`, `html[data-theme='light'] { color-scheme: light }` and the same for dark, carry the choice to the browser's own drawing. Stock Eleventy Excellent still leaves it to the system.
- **A choice that matches the system is cleared.** `setPreference()` in `theme-toggle.js` removes the saved value instead of storing it, and both `theme-color` tags follow the toggle, so the browser bar changes with the page.
- **The audio player stays dark in both themes.** `audio { color-scheme: dark }`. Chrome's light player is `#F1F3F4`, all but invisible on the light page's `#F4F4F2`. It only came to light once `color-scheme` followed the toggle: on a dark system with the site set to light, the player had been dark by accident. [[Design token sync]] carries the same dark pair for both themes.

Everything else that changes between themes is on its own page: the tinted shadows in [[Shadows]], code colors in [[Syntax highlighting]], the map's color properties in [[The place map]], the tooltip's shadow in [[Tooltips]], and icons drawn in `currentColor` in [[Icons]]. [[Figures]] covers the one thing a toggle cannot reach: a `<picture>` that switches screenshots with a media query follows the system setting only. [[The accessibility test]] explains why pa11y checks light mode only and how dark mode is checked separately.

Moving the color tokens to `light-dark()` is the next step, and it is in the backlog. Seventeen stylesheets carry the doubled blocks. ⚠ The order matters: `light-dark()` reads `color-scheme`, not `data-theme`, so on a site whose toggle does not set `color-scheme` it would stop the toggle from changing any color, with no error anywhere. In jedee that rule is now in place.

Raw source: `src/_raw/dev-notes/How dark mode works.md`
