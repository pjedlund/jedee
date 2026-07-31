---
title: The file that outlived its page
description: A tidy-up of the project folders turned up five years of my own training data sitting in a public repository, kept there by a page that no longer exists.
date: 2026-07-31
tags:
  - archive
  - orienteering
draft: true
---

I set out this morning to do something dull: decide which of the folders at the root of this project actually belong in git. Three of them had accumulated without much thought — design notes, HTML specs, and a folder called `__strava` — and I wanted to know whether they were earning their place.

Two of them were. The design notes and the specs are cited by other tracked files; pulling them out would have left a trail of dead references for anyone who cloned the repo, including me on another machine. The third was a different matter. `__strava/activities.csv` is the bulk export Strava lets you download instead of paying for the API: every activity I have recorded, with dates, distances, times, and the visibility flag on each one. Three hundred kilobytes of where I have been running since 2020.

It was in a public repository. It had been there for a month.

What made it worse, in the way these things are always slightly worse than you first think, is that nothing needed it. I put it there for a `/training/` page that read the CSV at build time and printed the last fifty activities in a table. That page is gone. Those activities are real posts now, one file each, sitting in the archive with their own dates and maps and the descriptions I wrote in Swedish after the race. The import finished months ago. The scaffolding stayed up.

That is the part I want to remember. It wasn't a mistake of judgement — committing the file was the documented procedure at the time, and the README in that folder still cheerfully instructs you to *commit it and push*. It was a mistake of not going back. A build input is only justified by the build step that reads it, and when that step disappears the input doesn't announce itself. It just sits there, quietly public, with a README explaining why it belongs.

So it's out of the tree now, and out of the history too — ninety-eight commits rewritten to remove one file from one commit made in June. The folder kept its contents on my own disk and lost the extra underscore that had been marking it, wrongly, as something worth tracking.

I'm told, and I believe it, that this is not quite the same as the file never having been there. GitHub keeps unreachable objects around for a while, and anyone who noted the old commit hash can still ask for it. The honest position is that the data was public for a month and a force-push doesn't retroactively make it private; it only stops the next person from stumbling over it. Which is worth doing. It just isn't absolution.

The five years of races are still here, of course. They're the archive now, written up properly, each one a page instead of a row. That was always the point. I had just forgotten to take down the ladder.
