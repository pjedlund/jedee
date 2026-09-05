---
description: "Sequencing a multi-step animation in CSS alone — a delay chain expressed as named step times, fill modes, clip-path wipes, and a caret that tracks the wipe edge."
date: 2026-08-28
---

A multi-step animation — wipe something away, reveal something else, blink, wipe again — does not need JavaScript to sequence it. CSS gives every element one animation clock, and several animations can run on it at once, comma-separated, each with its own duration, easing and delay. Chaining the delays is the whole technique.

Three properties carry it:

- **`animation-delay`** — where each step starts on the shared clock. Manual arithmetic: each delay is the sum of everything before it.
- **`animation-fill-mode`** — `both` holds the first keyframe *before* a delayed animation starts and the last one after it ends; `forwards` holds only the end. A delayed animation without a backwards fill flashes its unanimated state first, which is the most common cause of a sequence that "almost works".
- **`animation-iteration-count`** — repeat one step a fixed number of times (a caret blinking exactly twice) inside a longer chain.

```css
.old-text { animation: wipe-out 0.5s ease-in both; }
.new-text { animation: wipe-in 0.6s ease-out 0.5s both; }
.caret    { animation: blink 0.5s step-end 1.1s 2 both,
                       hide 0.1s linear 2.1s forwards; }
```

**Name the step times rather than writing the sums inline.** Past two or three steps, hard-coded delays stop being editable — changing one duration means re-adding every delay after it:

```css
--at-blink: calc(var(--delay) + var(--in));
--at-out:   calc(var(--at-blink) + var(--blink) * 2);
--at-end:   calc(var(--at-out) + var(--out));
```

Each step then declares "start when the one before ends", and a new knob (an initial hold, a longer blink) re-times the rest for free.

When several animations touch the *same* property, the last one in the list wins while it is active or filling — so ordering matters, and a later step with `fill: both` will clobber an earlier one during its own delay. Giving each step a different property avoids the question entirely.

## Wipes and carets

Reveal or erase content along a travelling edge with an animated `clip-path: inset()`. It works with any content, causes no layout shift, and clips live descendants:

```css
@keyframes wipe-in  { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes wipe-out { from { clip-path: inset(0 0 0 0); }   to { clip-path: inset(0 100% 0 0); } }
```

The familiar `steps()` typewriter — animating `width` in `ch` units — **assumes a monospace font**. With a proportional face the edge stutters through positions that don't correspond to character boundaries. A smooth `clip-path` wipe is the proportional-font equivalent.

To make the edge visible as a text cursor, put a bar inside the wiped element, absolutely positioned, and animate its `inset-inline-start` from `0` to `100%` with the same duration and easing as the clip. **A percentage offset is the one length that tracks text of unknown width** — the element's own rendered width, which CSS cannot otherwise name, and which changes with the font, the viewport and the content. Nothing has to be measured or synced.

`translate: -100% 0` then pulls the bar back inside the clip edge instead of straddling it, so it is never half-clipped mid-wipe.

⚠ **A percentage offset on an absolutely positioned child resolves against the parent's padding box.** So a bar pinned at `inset-inline-start: 100%` sits with its *right* edge on the padding-box edge, and its own width eats any gap you tried to open with padding. The padding has to carry both:

```css
padding-inline-end: calc(var(--caret-gap) + var(--caret-width));
```

A caret blink is `@keyframes blink { 50% { opacity: 0 } }` with `step-end` — the honest on/off of a terminal cursor. Eased, it reads as a pulse rather than a caret.

## The resting state is the state without motion

An on-load animation has to decide what a visitor sees when it never runs — reduced motion, an unsupporting browser, a hidden tab. Author the **base rule as that resting state**, and let the animation opt in:

```css
.thing { clip-path: inset(0 100% 0 0); }         /* hidden at rest */

@media (prefers-reduced-motion: no-preference) {
  .thing { animation: wipe-in 0.6s ease-out both; }
}
```

Written the other way round — visible at rest, hidden by the animation — a reduced-motion visitor gets the intro's *end* state permanently, which for decoration usually means the thing stuck on screen forever.

## When an on-load animation actually starts

Not at `load`, and not at first paint: the clock starts when the element is first styled. Measured on one page load of a small static site, local server:

| Event | Time |
| --- | --- |
| HTML response finished | 11 ms |
| animation clock starts | 12 ms |
| DOMContentLoaded | 33 ms |
| first paint | 72 ms |

The animation was already 60 ms in before anything was drawn. That gap is the connection speed: on a slow one, the opening of an intro plays into a blank screen and the visitor arrives part-way through. Whether that matters depends on whether the animation is decoration (it degrades to a shorter intro) or communication (it needs gating on `DOMContentLoaded`, which costs a line of JavaScript).

Nothing has to be wired up for the trigger itself. On a multi-page site every navigation is a fresh page load, and CSS animations run on load — see [[Scroll-aware CSS during view transitions]] for the separate question of animating *across* a navigation.

## Verifying one without watching it

The Web Animations API makes a sequence testable rather than eyeballed:

```js
document.getAnimations()
  .filter(a => /reveal-/.test(a.animationName))
  .forEach(a => { a.pause(); a.currentTime = 900; });
```

`getComputedStyle` then reports the state at that instant. Two traps: an animation that has finished with `fill: none` is **dropped from `getAnimations()`** — restart it by setting `element.style.animation = 'none'`, forcing a reflow, then clearing it — and a screenshot taken in the same batch as the pause can show the previous frame, so read the computed values as the source of truth and treat the picture as illustration.

## In jedee

The start page — and only the start page — types its own name. The header's logomark is followed by JOHAN EDLUND wiping in behind a caret, which blinks twice and then backspaces the name away, leaving the bare logomark that every other page shows. Everything above is from building it, 2026-08-28.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/reveal-filmstrip.png" alt="Six stacked frames of the site header, each labelled with a time. At 1.080s only the letters JO are visible with a caret bar beside them. At 1.325s the name has reached JOHAN EDL. At 1.650s the full name JOHAN EDLUND stands with the caret parked a small gap past the D. At 2.100s the name is complete and the caret has vanished. At 3.400s the name has shrunk back to JOHAN EDL with the caret on its edge. At 3.700s only the orange logomark is left." width="1360" height="1004">
  <figcaption>The chain at six instants on its own clock. The caret is one bar riding the wipe edge — the same duration and easing as the clip, and a percentage offset doing the tracking.</figcaption>
</figure>

The mockup is `src/wiki/_sources/breadcrumb-reveal.html`, and it is made with the technique in the section above: six copies of the real header, every animation in each paused and seeked to a different `currentTime`, so nothing is running when the shot is taken and the stale-frame trap cannot arise. It links the site's compiled `global.css` and this block's own `breadcrumb-reveal.css`, so the type, the logomark and every step time in the picture are the shipped ones rather than a copy. `npm run mockups` re-shoots it.

⚠ **The first frame is 1.080s, not 1.000s, and the gate is why.** At the instant the wipe starts the frame is blank, and so is the frame past the end — `npm run mockups:check` rejected the two as pixel-identical, which is the right answer: they are the same picture even though they mean different things. The one second of dead time before the first glyph is prose, not a frame.

`src/assets/css/local/breadcrumb-reveal.css` is a `local` bundle, included from `src/_includes/partials/breadcrumb.njk` inside the same condition that renders the markup, so neither the two spans nor the CSS exist on any other page. The name span is `aria-hidden`: the home crumb already carries a visually-hidden "Johan Edlund, home" label, and a second copy would be read twice.

`meta.navigation.nameReveal` in `src/_data/meta.js` is the site-wide switch, beside the existing `breadcrumb` and `hideNav` toggles. It gates the markup and the stylesheet include together — verified in the built output rather than in the template: with it off, `dist/index.html` contains neither.

The knobs, all on `.breadcrumb-reveal`: `--reveal-delay`, `--reveal-in`, `--reveal-blink` (one on/off cycle, run twice), `--reveal-out`, `--reveal-caret-width`, `--reveal-caret-gap`. The three step times are derived from them as above.

**EE stock vs jedee:** the reduced-motion opt-in idiom is Eleventy Excellent's convention for decorative motion (its reset separately clamps durations in the `reduce` branch); the block, the caret technique and the toggle are jedee's own.

The sibling half of this work — a directional wipe *between* pages, using per-crumb view transition names — is built but parked on `feat/breadcrumb-directional-wipe`, not merged.

Related: [[Undefined custom properties]] — the failure mode when a knob like `--reveal-caret-gap` is referenced before it is defined: the declaration is not skipped, `padding` falls to its initial `0`. [[The theme toggle]] — the site's other piece of decorative motion, and the same reduced-motion split. [[Configuring a layout composition]] — custom properties as a published API rather than internal values.

Raw source: `src/_raw/dev-notes/How the start page types its own name.md`
