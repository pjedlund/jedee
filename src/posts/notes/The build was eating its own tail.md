---
title: The build was eating its own tail
description: My dev server kept dying while I nudged colours around. I knew what the cause was, the way you know things that turn out not to be true.
date: 2026-08-02
tags:
  - eleventy
  - css
draft: true
---

I was changing one number in a stylesheet — a percentage, in a menu, the sort of thing described in the note next to this one — and the dev server kept falling over. Not slowly. I would save the file, wait, and find the whole thing dead with *JavaScript heap out of memory*.

I knew what this was. I'd seen it before, back when the site's images were being rebuilt and something in the image pipeline would eat every byte the machine had. I'd even written it down so I wouldn't have to work it out twice: if the build runs out of memory, it's the images, don't go looking at whatever you just changed.

That note is wrong, or at least it was answering a different question. And having it there, confidently, in my own handwriting, is exactly why I didn't look anywhere else for a while.

What was actually happening is that the build had started feeding itself.

Every time this site builds, one of the first things it does is compile the stylesheets — twenty-odd files, written out fresh into a folder the templates then read from. Those files are generated, so they're listed in `.gitignore`, and Eleventy has always been happy to take `.gitignore` as its own list of things not to watch. Generated files change constantly; you don't want the watcher jumping every time.

Then, a few weeks ago, I made the private wiki browsable on my own machine. The wiki lives in its own repository tucked inside this one, which means the outer repository ignores it completely — and Eleventy, obediently reading `.gitignore`, ignored it too. The way to make it visible was to tell Eleventy to stop consulting `.gitignore` at all.

Which it did. For the wiki, and for everything else on that list. Including the stylesheets the build writes on every single pass.

So: I save a file. The build starts. The build writes twenty-three generated files. The watcher, newly able to see them, notices twenty-three changes and starts another build. That build writes the same twenty-three files again. And so on, quietly, at full speed, until the machine gave out — nine rebuilds from one keystroke, and when we later took the safety rail off and let it run, eighteen and still going.

I had opened a door for the wiki and not noticed what else came through it.

The fix is two lines telling the watcher to disregard the folders the build owns. But the more interesting thing was underneath, and we only found it because the first fix worked and the crashes kept happening anyway, just later.

Eleventy's dev server does not give memory back. Every rebuild of this site keeps about three hundred and seventy megabytes and never releases it — measured properly, with the garbage collector run by hand between each one so there was no arguing about it. The line is dead straight: five hundred and seventy-four megabytes, then nine hundred and forty-nine, then thirteen hundred, and so on until it hits the ceiling and dies. About ten edits, if nothing else is going wrong.

That reframed the whole thing. The loop wasn't the illness. The loop was a multiplier — nine rebuilds at three hundred and seventy megabytes apiece is three and a half gigabytes arriving at once, which is why a single edit could kill it outright rather than merely bringing it closer to the edge. The fragility was always there. The wiki door just turned a slow leak into an immediate one.

It isn't my leak, as far as we could establish — the same climb happens with the image processing off, the wikilinks off, the wiki off, the stylesheet compiler off. So the honest fix was to raise the ceiling and write down where it is. Twenty-odd edits now instead of ten, and a note saying restart the server when it starts feeling heavy.

What I want to keep from this isn't the fix. It's how many confident explanations turned out to be decoration.

It's the images — no. It's because the CSS gets inlined into every page — no, this site serves it as a separate file during development, deliberately, and has for as long as I've had it. It's because the stylesheet's address has a content hash in it, so every page changes when the CSS changes — no; we hardcoded a fixed address and all five hundred and thirty-eight pages rebuilt anyway. Each of those was reasonable. Each one had a mechanism behind it I could describe out loud. Every single one dissolved the moment it was actually measured.

The ones that survived were the ones that came *from* a measurement rather than being checked by one afterwards. There's a version of this job where you reason your way to an answer and then look for confirmation, and it feels identical from the inside to the version where you look first. It is not identical. I keep having to learn that in a slightly different costume each time.
