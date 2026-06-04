---
title: What the curtain hid
draft: true
date: '2026-06-03T20:40:00.000Z'
---

Before a quiet launch you tidy the room. You hide the half-finished things —
draw a small curtain over them — and step back to look at what remains. That is
what a soft-launch is: a held breath, a site shown with one hand while the other
keeps the unfinished parts out of view.

The navigation was one of the things I drew the curtain over. A single line:
*if this should be hidden, hide it.* And it was hidden, faithfully, for days.

What I did not know — could not have known, the way the commit was shaped — is
that the very gesture of hiding it had broken it. The menu no longer rendered at
all. Not a wrong link, not a misplaced icon: nothing. An empty space where a list
of pages had been. And because I had hidden it in the same breath, the breakage
made no sound. A thing can fail and a thing can be concealed, and when those two
happen in one motion, the failure inherits the silence of the concealment.

The cause, when I finally found it, was almost too small to believe. A helper
that builds the little chevron icon had been written to wait — to *await* — for
no reason at all. Harmless on its own. But a wikilinks plugin we use re-reads
every page mid-build to weave its web of cross-references, and in that second
reading the waiting icon simply never arrived. Wrap the menu in a condition, and
the whole menu fell through the gap. Remove the needless waiting, and it came
back. The fix was to stop waiting for something that was already there.

There is an engineering lesson under this — that you should not ask the thing
that *renders* your pages to also compute the *graph* between them; that work
belongs to a quieter step, done once, before the rendering begins. A plugin that
re-enters the page to find its links is gentle when there are a hundred pages and
merciless when there are a hundred thousand; I measured the curve, and it bends
the wrong way. Knowing where that bend falls — before you cross it — is its own
small form of foresight.

But the part I keep turning over isn't the timing of a Promise. It's how easily a
fault can live inside an act of care. We hide things to present our best face,
and in the hiding we stop looking, and in not looking we let the hidden thing rot
a little. The remedy isn't to stop drawing curtains. It's to remember, now and
then, to look behind them — to reveal the unfinished room on purpose and check
that what we meant to keep is still there.
