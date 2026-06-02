---
title: Not every class is a place to hang a style
description: I wrapped each post's body in a microformat so other people's sites could read it — and the spacing quietly collapsed everywhere, because the class I'd added looked like a style hook but was only ever data.
date: 2026-06-02
tags:
  - css
  - indieweb
draft: true
---

A while back I wrapped the body of every post in a small `<div>` and gave it a class: `e-content`. It's a [microformat](https://microformats.org/wiki/h-entry#p-name) — the label that tells other people's software *this part is the writing*. When someone's site sends a webmention, or a feed reader comes to parse the page, that one class is how the machine finds the words and ignores the furniture around them. A courtesy to readers I'll never meet, running on software I'll never see.

Then, weeks later, the spacing fell out.

Not on one page — on all of them. Notes, articles, films, the lot. Every paragraph had shuffled up against the next, the headings pressed into the text below, the whole column holding its breath. The kind of break where nothing errors and nothing crashes; the site just quietly stops breathing.

The rhythm here comes from a single rule — the [Stack](https://every-layout.dev/layouts/stack/), the little owl selector that puts space between an element and the sibling before it. The catch is the word *sibling*: it only ever looks one level down, at an element's own children. And my wrapper had made every paragraph a *grandchild*. The rule's gaze stopped at the `e-content` div and never saw the prose inside. Into that silence the reset poured its `margin: 0`, and the spacing was gone.

What threw me is that the class sat there looking exactly like every other class in the markup — a hook you'd hang a style on. But it was never that. It was data. A name for parsers, not for stylesheets. I couldn't rename it to dodge the problem, couldn't fold it away; remove it and the webmentions and feeds go dark. The machines need that word, spelled exactly so.

So the fix wasn't to take the wrapper out. It was to let the one element be two things at once: `e-content | flow` — the microformat for the machines, the layout for the reader, side by side in the same breath. The little pipe between them isn't doing anything to the browser; it's there for me, holding the name that's data apart from the name that's design, so I don't mistake one for the other again.

There's something to sit with there. Markup answers to two audiences that never stand in the room together — the parser and the person. A kindness I'd done for a stranger's software turned out to be a quiet theft from the reader right in front of me, and neither of them could tell me. Some classes aren't a place to hang a style at all. They're addressed elsewhere. The most you can do is set your design down gently beside them, and let the same element speak, at once, to the machine and to the eye.
