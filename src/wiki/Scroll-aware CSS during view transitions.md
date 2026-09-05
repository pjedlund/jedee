---
description: "How cross-document view transitions snapshot two pages, and a tested finding that CSS can still read the arriving page's scroll position with no JavaScript."
date: 2026-07-31
---

A [cross-document view transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) animates between two *pages* of a multi-page site rather than between two states of one page. Opting in is one at-rule, present in the CSS of both documents:

```css
@view-transition { navigation: auto; }
```

The browser then snapshots the outgoing page, loads the incoming one, snapshots that, and animates between the two images inside a pseudo-element tree — `::view-transition` and its `::view-transition-old()` / `::view-transition-new()` children — which lives in its own top layer above the rest of the document. Giving an element a `view-transition-name` lifts it out of the page-wide snapshot so it animates independently, which is the mechanism behind an element appearing to persist across a navigation.

Scroll position sits awkwardly in that model. The transition spans a navigation: the outgoing document had a scroll offset, the incoming one has its own, and the pseudo-element tree is not in the normal flow of either. Whether CSS can observe the arriving page's scroll position *while the transition runs* is not something the specifications say much about — which is why the answer below had to be established by testing rather than by reading.

**Finding: during a cross-document view transition, CSS can react to the arriving page's scroll position — two different ways, with no JavaScript.** No prior art was found for either, so this is recorded as tested behavior rather than documented API.

## The problem

A cross-document view transition snapshots elements on the old page and animates them on the new one, and **the snapshots keep the old page's viewport coordinates**. So if an element near the top gets an exit animation and the new page arrives *scrolled down* — a back navigation with scroll restoration, or a link to a `#fragment` — the exit animation plays at the top of the viewport, floating over the middle of whatever content is now there.

The fix needs a condition CSS famously lacks: "only run this if the page is at the top." The transition pseudo-elements also live in their own layer hanging off the root, so it wasn't obvious any scroll-aware mechanism could reach them.

## Mechanism 1 — a `scroll-state()` container query

Chromium 133+. Make the root a scroll-state container and ask whether the page can still scroll toward the top:

```css
html { container: root-scroll / scroll-state; }

@container root-scroll scroll-state(scrollable: top) {
  ::view-transition-old(my-element):only-child { animation: none; opacity: 0; }
}
```

Why it can work at all: **a pseudo-element may use its own originating element as its query container**, and the `::view-transition-*` pseudos originate from the root — the very element carrying `container`.

**Tested: works.** Arriving scrolled, the exit animation is dropped; arriving at the top, it plays. The scroll state reported during the transition is the *new* page's, which is the useful one.

## Mechanism 2 — a scroll-driven animation

Chromium 115+, Safari 26. A second animation on the same pseudo-element, driven by scroll position instead of time, acts as an opacity gate:

```css
::view-transition-old(my-element):only-child {
  animation: my-exit-animation 0.3s ease-in both, scroll-gate 1ms linear both;
  animation-timeline: auto, scroll(root);
  animation-range: normal, 0rem 4rem;
}
@keyframes scroll-gate { from { opacity: 1 } to { opacity: 0 } }
```

At the top the gate holds opacity 1 and the exit shows; past 4rem it holds 0 and the exit plays invisibly. ⚠ **`animation-timeline` must be declared after the `animation` shorthand**, because the shorthand resets it.

**Tested: works too.**

## How it was tested — and two traps

A generated demo site with long scrollable pages: a control with no gate, and one version per mechanism. Each gated page carries a **sanity widget** (a chip that flips to "scrolled", a scroll progress bar) styled by the same mechanism on a *normal* element — so "this browser doesn't support the feature" can't be mistaken for "the feature can't reach the transition pseudos." That control is the part worth copying into any similar investigation.

- **Cross-document view transitions silently skip in hidden and automation-driven tabs.** Judging has to be real clicks in a real browser window — which rules out the usual headless verification.
- **`scroll-state()` results update one frame *after* a scroll**, so reading a computed style in the same frame looks like a failure when nothing is wrong.

## The honest caveat

Chromium-only in practice. Safari has cross-document view transitions but no `scroll-state()`; its scroll-driven animation support arrived in Safari 26, but the transition-pseudo reach was only verified in Chromium. Firefox has neither. **On a real site this can only ever be an enhancement layered over something that works without it.**

## In jedee

**Nothing on this site ships it.** The breadcrumb animation that motivated the investigation was shelved for having too many hard-to-explain edge behaviors, and `main` uses the browser's plain cross-fade. The finding is kept here because the platform behavior stands regardless of whether this site uses it.

Raw source: `src/_raw/dev-notes/CSS can see the scroll during a view transition.md`
