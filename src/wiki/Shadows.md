---
description: "Layered box-shadows that look like real shadows, one light source for the whole site, tinting and dark mode, and keeping an object's painted light from fighting the shadow it casts."
date: 2026-10-24
---

A single `box-shadow` is a blurred copy of the element's outline, moved and colored. It has one offset, one blur and one color, so it falls off in a straight ramp: either a tight dark edge or a wide gray haze, never the dense-near, soft-far shape of a shadow in a room. The fix that has become standard is to stack several shadows on the same element, each larger and fainter than the last.

## Layered shadows

Tobias Ahlin's [Smoother & sharper shadows with layered box-shadows](https://tobiasahlin.com/blog/layered-smooth-box-shadows/) (2019) is the origin of the technique. Each layer doubles the offset and blur of the one before, and every layer gets the same low alpha, so the shadow is densest where the layers overlap, near the object, and thins out as only the larger layers reach:

```css
.thumb {
  box-shadow:
    0 1px 1px hsl(0 0% 0% / 0.075),
    0 2px 2px hsl(0 0% 0% / 0.075),
    0 4px 4px hsl(0 0% 0% / 0.075),
    0 8px 8px hsl(0 0% 0% / 0.075),
    0 16px 16px hsl(0 0% 0% / 0.075);
}
```

More layers means a lower alpha per layer for the same overall depth. Ahlin's own example uses 0.12; anything between about 0.05 and 0.15 reads as a shadow rather than a smudge.

Josh Comeau's [Designing beautiful shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows) builds on it with three further ideas:

- **One light source for the whole page.** Every shadow on the site should fall the same way, so the horizontal offset is a fixed share of the vertical one. With the light up and to the left, `x = y / 2` puts every shadow down and a little to the right.
- **Elevation as a scale.** A low, a medium and a high shadow, each a set of layers, rather than a new value per component. His [shadow palette generator](https://www.joshwcomeau.com/css/introducing-shadow-palette-generator/) produces the three as custom properties, using negative spread on the larger layers to keep them tucked under the object.
- **Tinted shadows.** A shadow in pure black over a colored page looks gray and dirty, because a real shadow is the surface color with less light on it. Using a darker, desaturated version of the page's own hue instead of black keeps it clean.

Philipp Brumm's Smooth Shadow tool, which Comeau credits as his inspiration and which is now offline, spaced the layers on an easing curve instead of doubling them, which gives a very long, soft fall-off suited to large floating panels.

## Dark mode

A shadow is darkness subtracted from a lit surface. On a near-black page there is almost no light left to subtract, so the same alphas that read clearly on white vanish. Dark-theme shadows need several times the opacity to show at all, and they stay subtle even then; elevation on a dark page is carried mostly by surfaces that get lighter as they rise. Keeping the layer geometry and scaling only the alpha keeps the two themes recognizably the same shadow:

```css
:root { --shadow-color: 220 15% 30%; --shadow-k: 1; }
:root[data-theme='dark'] { --shadow-color: 0 0% 0%; --shadow-k: 2.4; }

.thumb {
  box-shadow:
    0 1px 1px hsl(var(--shadow-color) / calc(0.075 * var(--shadow-k))),
    /* … the other four layers the same way */;
}
```

## Painted light and cast shadow

An object built in CSS, a book or a sheet of paper, often carries two kinds of shade: light painted onto its own surface with gradients (a highlight toward the light, darkening away from it), and the shadow it casts on the page. The two have to agree, and they do not weigh the same in both themes. On a light page, strong darkening on the object reads as the object being dirty or in shade, while its cast shadow is faint; the eye wants the reverse, a surface that stays bright and a shadow that lands beside it. So in light mode the painted darkening stays faint and the cast shadow does the work, offset away from the light. On a dark page the painted light is what gives the object form, and the cast shadow can barely show, so the balance flips back.

## In jedee

The shadows are tokens in `src/_data/designTokens/shadows.json`, stored as Penpot-shaped layers (offset, blur, spread, 8-digit hex color) and composed into `--box-shadow-*` custom properties by `dtcgShadowToTailwind()` (see [[Tailwind]]); the same file feeds the Penpot export (see [[Design token sync]]). Each token has a `-dark` twin, swapped in by the component's own dark-theme rule. The rule in `DESIGN.md` is that nothing invents a shadow: a component takes one of these.

| Token | Shape | Used by |
|---|---|---|
| `panel` | two layers, tight contact plus wide soft | the mega-menu and the search panel |
| `popup` | `panel` scaled down | tooltips (see [[Tooltips]]) and the map popup |
| `chip` | smaller again | inline code (see [[Syntax highlighting]]) |
| `thumb` | Ahlin's five layers, straight down | the book's cover, and covers and images lying on the page |
| `thumb-cast` | `thumb` pushed right by half the drop, stronger in light | the pamphlet (see [[CSS 3D transforms]]) |

`thumb` was picked from a local comparison page that put Ahlin's layers, Comeau's low, medium and high, Brumm's eased layers, the existing `popup` and a value from the Penpot file on six album covers from near-black to near-white, two photos and two plain squares, in both themes. In light mode it is tinted with `#414958`, a dark blue-gray from the site's text color, at 0.075 a layer; in dark mode it is black at 0.18 a layer.

`thumb-cast` came out of the pamphlet on the *Bethink Yourselves!* note. Its cover had a gradient darkening to 34% brown at the bottom right, which looked heavy on the light page while its shadow was faint. In light mode the darkening is now 10%, the highlight 22% and the spine shade 15%, and the shadow is `thumb-cast` (offsets 0.5, 1, 2, 4 and 8px across, alpha 0.133 a layer). The dark theme keeps the stronger painted light, and `thumb-cast-dark` equals `thumb-dark`. The three amounts are custom properties at the top of `local/pamphlet.css`, with the dark values in its dark-theme rules:

```css
.pamphlet {
  --pamphlet-paper: #e0d0b0;
  --pamphlet-shadow: var(--box-shadow-thumb-cast);
  --pamphlet-highlight: 0.22;
  --pamphlet-falloff: 0.1;
  --pamphlet-spine: 0.15;
}
```

None of this is Eleventy Excellent stock: EE ships no shadow tokens, and the layer format exists because Penpot stores shadows that way.

Raw source: `src/_raw/dev-notes/How the shadow tokens were picked.md`
