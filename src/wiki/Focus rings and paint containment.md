---
description: "Why an outset focus ring vanishes inside anything that clips painting, and the inset override jedee uses on the YouTube play button."
date: 2026-07-31
---

A focus indicator is the visible mark showing which control the keyboard is on. It is required: [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) makes it a Level AA criterion, and WCAG 2.2 added [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) specifically because an indicator that exists but cannot be seen is no better than none.

Most sites draw it with `outline`, for a reason worth knowing: unlike `border`, an outline takes no space in the layout, so adding one on focus never shifts the page. `outline-offset` then controls where it sits relative to the element — positive values push it outward, negative values pull it inward. The modern pattern pairs this with [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible), which lets the browser decide when an indicator is warranted, so keyboard users get a ring and a mouse click on a button does not.

**The failure mode:** an outline is painted *outside* the element's border box, so any ancestor that clips painting will clip it away. Three common declarations do that:

- `overflow: hidden` (and `auto`/`scroll`)
- `contain: paint` or `contain: content`
- anything else establishing a paint-clipping context

Put a focusable child that fills its container inside one of those, give it an outset ring, and the ring lands just past the clip edge and vanishes. **Any box that paint-contains its content and holds a focusable child filling it needs an *inset* focus ring instead.** This is a silent accessibility failure — nothing errors, nothing looks wrong in the stylesheet, and a keyboard user simply sees nothing when they tab to the control. It is invisible in code review and obvious the moment you press Tab, which is why the check has to happen in a browser.

## In jedee

The site's focus ring is **outset** by design: `global-styles.css` suppresses the always-on ring with `:focus { outline: none }` and restores a strong one on `:focus-visible`, drawn with `--focus-color` and offset outward by `--focus-offset` (`0.3ch`). Tokenizing the offset is what makes the fix below a one-property override rather than a re-declaration of the whole `outline`. This is Eleventy Excellent stock; the clipping cases below are jedee's own.

### The case that found it

`lite-youtube` sets `contain: content` on itself, and its play button fills the whole embed. Tabbing to a video showed no indicator at all. The fix is to invert the offset for that one control so the ring lands inside the box:

```css
is-land lite-youtube .lyt-playbtn { --focus-offset: -4px; }
```

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/focus-ring-contained.png" alt="The same focused play button twice, side by side on the embed's pale placeholder surface. On the left, at the site's outset offset, there is no ring at all — only the red play glyph. On the right, with the offset inverted, a thick slate ring runs inside the edge of the embed." width="1412" height="512">
  <figcaption>Both halves are focused. On the left the ring is drawn 0.3ch outside the box and <code>contain: content</code> clips it away, so the missing outline <em>is</em> the finding; on the right the same ring at <code>-4px</code> lands inside the box and survives.</figcaption>
</figure>

The mockup is `src/wiki/_sources/focus-rings.html`, drawing the real `lite-yt-embed` rules and the real `:focus-visible` declaration; `npm run mockups` re-shoots it. It shows the embed in its pre-hydration placeholder state rather than over a video poster, because the poster is fetched at build time and is not what is being compared. Both halves keep `contain: content` — the fix does not remove the containment, it moves the ring inside it — so the offset is the only thing that differs.

⚠ **"Sees nothing" is very slightly stronger than the truth.** `lite-yt-embed` ships `.lyt-playbtn:focus { filter: none }` over a base `filter: grayscale(100%)`, so tabbing to the button does turn the glyph from gray to red — visible in the shot above, where both buttons are focused and both are red. That color change is not a focus indicator in any deliberate sense: it belongs to the embed's own hover styling, it is a filter on a graphic rather than a bounded indicator, and it disappears the moment the poster loads behind a button that was already colored. The site's actual indicator is the outline, and the outline was gone.

### The trap that made it worse

The first attempt at rounding the fading poster's corners used `overflow: hidden` on the wrapper — which added a *second* clip on top of lite-youtube's own containment. The corners are now rounded with `border-radius` on both layers instead, so nothing clips the ring. **Reach for `border-radius` before `overflow: hidden` when the only goal is rounded corners.**

### What to check

When adding any facade-style component — a video poster, a map canvas, a card that's one big link — ask whether the container clips paint and whether the focusable thing fills it. If both, set `--focus-offset` negative on that control. Verify by tabbing to it, not by reading the CSS: the failure is invisible in the stylesheet and obvious in the browser.

⚠ Don't "fix" the `:focus { outline: none }` line in `global-styles.css`. It is not the bare-`outline:none` anti-pattern — the paired `:focus-visible` rule restores a strong ring for keyboard users, and removing it brings back the mouse-click rings the design deliberately drops.

See also [[The YouTube embed]], where this surfaced.

Raw source: `src/_raw/dev-notes/How the YouTube embed loads.md`
