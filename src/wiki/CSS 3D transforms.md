---
description: "Building a solid-looking object out of flat layers with preserve-3d, perspective and transform-origin, faking light and shadow on it, and the choices that keep its shape at every size."
date: 2026-10-23
---

CSS can place elements in three dimensions. Each element is still a flat rectangle, but with [`transform-style: preserve-3d`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style) on a parent its children keep their own depth instead of being flattened into the parent's plane, so a handful of positioned rectangles can be arranged into a box, a book or a stack of paper and turned as one object. Sebastien Castiel's [animated 3D book in CSS](https://dev.to/scastiel/create-an-animated-3d-book-in-css-step-by-step-26ic) is a clear walkthrough of the technique.

## The parts

- **The object**: one element with `transform-style: preserve-3d` and the rotation. Its children are the faces, all `position: absolute; inset: 0`.
- **Faces at a depth**: `translateZ()` moves a face toward or away from the viewer. A front cover at `translateZ(thickness / 2)` and a back cover at `translateZ(-thickness / 2)` make a slab.
- **Side faces**: a strip as wide as the thickness, turned `rotateY(90deg)` about its own centre, stands on the slab's edge. It faces outward, so it shows only when the object is turned toward it.
- **Layers instead of sides**: a stack of identical rectangles at small `translateZ` steps is an alternative to side strips. It costs more elements, but every layer can have `border-radius`, so the corners stay round all the way through the thickness, which strips meeting at a corner cannot do.
- **The view**: [`perspective()`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/perspective) as the first function in the object's own `transform` sets the viewing distance, so no wrapper element is needed. Then `rotateX()` tips it back, `rotateY()` turns it, `rotateZ()` spins it flat.

```css
.object {
  position: relative;
  aspect-ratio: 2 / 3;
  transform-style: preserve-3d;
  transform: perspective(calc(var(--width) * 4)) rotateY(-30deg);
}

.object > * { position: absolute; inset: 0; }
```

⚠ Some properties force a `preserve-3d` element back to flat, with no warning: `overflow` other than `visible`, `filter`, `opacity` below 1, `clip-path` and `mask` among them (the spec calls them [grouping properties](https://drafts.csswg.org/css-transforms-2/#grouping-property-values)). The object then renders as a single flat picture of itself. They are fine on a face that has nothing 3D inside it, such as `overflow: hidden` to clip a cover image.

## Keeping the shape at every size

Two choices decide whether the object holds its shape when the layout makes it bigger or smaller:

- **Scale the viewing distance with the width.** A fixed `perspective(1400px)` distorts a large object more than a small one, because the distance is the same while the object grows. Give the object `container-type: inline-size` on a wrapper and use `perspective(calc(100cqi * 8))`. The proportions of the drawing then no longer depend on the size. A longer distance (8 × width) gives an almost undistorted view; a shorter one (3.5 × width) a stronger sense of depth.
- **Tilt about the near edge.** With `transform-origin` at the far edge, tipping the object back brings the near edge toward the viewer, and perspective draws it wider than the element's own box. On a phone it then runs into the page margin. `transform-origin: 50% 100%` keeps the near edge at its true width and lets only the far edge recede.

Thickness belongs in the same ratio: a thickness given as a share of the width (`calc(100cqi * 0.18)`) keeps a book a book in a narrow column.

## Faking light and shadow

There is no lighting in CSS 3D, so the light is painted on:

- **Light**: a pseudo-element over the top face with a gradient from a light tint in one corner to a shade in the opposite one. Plain semi-transparent white and brown layers work; `mix-blend-mode: soft-light` is almost invisible on a pale surface.
- **Details**: a narrow gradient band does for a fold, a hardcover's groove beside the spine, or the darkening where a page block meets its boards. Alternating colors on stacked layers read as page edges.
- **Shadow**: a `box-shadow` on the bottom layer lies in that layer's plane, so it reads as a shadow on the surface under the object. A separate blurred element behind it reads as the object hovering. jedee's pamphlet and book take the site's `thumb` shadow, five equal layers from 1 to 16px after Tobias Ahlin, with a deeper `-dark` twin, because a light shadow vanishes on a near-black page.

## Motion

A turned object easing to face the reader on hover is the classic interaction. Gate both halves:

```css
@media (hover: hover) {
  .object { --turn: -30deg; }
  .object:hover { --turn: 0deg; }
}

@media (prefers-reduced-motion: no-preference) {
  .object { transition: transform 0.5s ease-out; }
}
```

The resting angle sits inside `(hover: hover)`: a device that cannot hover cannot bring the object back to face-on, so there it rests face-on from the start. The transition is opted into rather than switched off, the same idiom as the site's other motion.

## In jedee

Two partials, each with its own local CSS that loads only where they are used:

- `partials/pamphlet.njk` with `local/pamphlet.css`: the 1904 cover of *Betänken Eder!*, traced to SVG, as a stapled pamphlet lying on a table. Twelve stacked sheets carry the thickness and the rounded corners; the view is a 10° tilt and a 2° spin, eased flat on hover. It floats into the text it belongs to (see [[Floats]]), and lies flat whenever it is not floated. Used on the *Bethink Yourselves!* note.
- `partials/book.njk` with `local/book.css`: a hardcover after Castiel's structure (front cover, page block, back board), turned −32° to show its pages. The cover is a plain `<img>` through the Image transform, so a reading post's remote cover works as is (see [[Self-hosting remote images at build time]]).

Both are shown under Patterns on the design system page, `/design-system/`.

Raw source: `src/_raw/dev-notes/How the pamphlet and book mock-ups work.md`
