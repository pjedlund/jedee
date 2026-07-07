---
title: CSS can see the scroll during a view transition
description: A dev note on a small discovery — scroll-state() container queries and scroll-driven animations both reach the ::view-transition pseudo-elements in Chromium, so a cross-document transition can react to the arriving page's scroll position with no JavaScript.
date: 2026-07-07
tags:
  - css
draft: true
---

While prototyping animated breadcrumbs for this site I ran into a question I could find no answer to anywhere: during a cross-document view transition, can CSS *react to the scroll position* of the page? The answer turns out to be yes — two different ways — and since I couldn't find prior art for either, this note writes down what I tested and what happened. (The breadcrumb animation itself ended up shelved; the finding seems worth keeping anyway.)

## The problem that raised the question

A cross-document view transition snapshots elements on the old page and animates them on the new one. The snapshots keep the *old page's* viewport coordinates. So if an element near the top of the old page gets an exit animation, and the new page arrives *scrolled down* — a back navigation with scroll restoration, or a link to a `#fragment` — the exit animation plays at the top of the viewport, floating over the middle of whatever content is there now.

The fix needs a condition CSS famously doesn't have: "only run this animation if the page is at the top." The transition's pseudo-elements (`::view-transition-old()` and friends) also live in their own layer hanging off the root element, and it wasn't obvious that *any* scroll-aware CSS mechanism could reach them.

## Mechanism 1: a scroll-state() container query

Chromium 133 added `scroll-state()` container queries. Make the root element a scroll-state container, and a rule can ask whether the page can scroll toward the top — in other words, whether it is scrolled down:

```css
html {
  container: root-scroll / scroll-state;
}

@container root-scroll scroll-state(scrollable: top) {
  ::view-transition-old(my-element):only-child {
    animation: none;
    opacity: 0;
  }
}
```

The reason this has a chance of working: a pseudo-element is allowed to use its own originating element as its query container, and the `::view-transition-*` pseudos originate from the root — the very element carrying `container`.

**Tested: it works.** With the page arriving scrolled, the exit animation is dropped; arriving at the top, it plays normally. The scroll state the query reports during the transition is the *new* page's — which is exactly the useful one.

## Mechanism 2: a scroll-driven animation

Scroll-driven animations (Chromium 115+, Safari 26) can also do it, without container queries. A second animation on the same pseudo-element, driven by the page's scroll position instead of by time, acts as an opacity gate:

```css
::view-transition-old(my-element):only-child {
  animation:
    my-exit-animation 0.3s ease-in both,
    scroll-gate 1ms linear both;
  animation-timeline: auto, scroll(root);
  animation-range: normal, 0rem 4rem;
}

@keyframes scroll-gate {
  from { opacity: 1; }
  to   { opacity: 0; }
}
```

At the top of the page the gate holds opacity at 1 and the exit animation shows; scrolled past 4rem, it holds opacity at 0 and the exit animation plays invisibly. One ordering detail: `animation-timeline` has to be declared *after* the `animation` shorthand, because the shorthand resets it.

**Tested: this works too.**

## How it was tested

A small generated demo site — long scrollable pages, a control version with no gate, and one version per mechanism. Each gated page carries a sanity widget (a chip that flips to "scrolled", a scroll progress bar) styled by the same mechanism on a *normal* element, so "this browser doesn't support the feature" can't be mistaken for "the feature can't reach the transition pseudos." The control reliably shows the floating exit animation on scrolled arrivals; both gated versions kill it.

Two testing traps worth recording: cross-document view transitions silently skip in hidden and automation-driven tabs, so the judging has to be real clicks in a real browser window; and `scroll-state()` query results update one frame *after* a scroll, so reading a computed style in the same frame looks like a failure when nothing is wrong.

## Support and the honest caveat

All of this is Chromium-only in practice. Safari has cross-document view transitions but no `scroll-state()`; its scroll-driven animation support arrived in Safari 26 but the transition-pseudo reach is only something I've verified in Chromium. Firefox has neither cross-document transitions nor either mechanism. So on a real site this can only ever be an enhancement layered on top of something that works without it.

This site currently ships none of it — the breadcrumb animation that motivated the whole investigation turned out to have too many hard-to-explain edge behaviors, and I reverted to the browser's plain cross-fade. But the platform fact stands: the view-transition layer is not sealed off from scroll-aware CSS.
