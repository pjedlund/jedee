---
title: Every vault answers to the same name
description: I finished the Web Clipper templates, then found that every Eleventy site I run gives its Obsidian vault the same name — and the way around it is the address no one sees.
date: 2026-05-30
tags:
  - obsidian
  - indieweb
draft: true
---

For a while now I've been teaching this site to catch things. [Obsidian Web Clipper](https://obsidian.md/clipper) templates, one per source, so an album or a film or a stray good page lands here as a real post instead of dying in a browser tab. This week I finished the set — replies and likes, the last two — and decided that reposting from a personal site was strange enough to leave out. The shelf is built.

Then the clips wouldn't land.

*Add to Obsidian,* I'd click, and Obsidian would shrug: no such vault. I'd pointed the clipper at *JEDEE*, the name I think of this project by. But Obsidian has never heard of JEDEE. It names a vault after the folder it opens, and the folder holding all my content is called `src` — the same `src` every Eleventy site keeps its source in. So the vault is named `src`. And I run more than one Eleventy site. Every one of their vaults is named `src`. The label that's supposed to tell them apart says the same word for all of them.

The fix is a number. Underneath that shared, useless name, each vault carries a hidden sixteen-character id, minted once when Obsidian first opens the folder and never shown unless you go digging for it. Point the clipper at the id instead of the name and the clip finds its way home, past all the other vaults wearing the same coat.

What I didn't expect was that the collision is also a kindness. If someone forks this site, their copy will keep its content in `src` too, and Obsidian will name their vault `src` as well — so a clipper set to save to "src" simply works for them, no number required. The sameness that confounds me on my own machine is exactly what makes the thing portable to a stranger. I need the address nobody sees; they can use the name everybody shares.

There's something to sit with there. The name a thing answers to in public is the one it holds in common with everything like it. The name that actually finds it is the one it never says out loud.
