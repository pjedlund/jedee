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

At first only one of them looked like a problem. The design notes and the specs are cited by other tracked files, and pulling them out would have left a trail of dead references behind — so I set those two aside as earning their keep and moved on. The third was a different matter. `__strava/activities.csv` is the bulk export Strava lets you download instead of paying for the API: every activity I have recorded, with dates, distances, times, and the visibility flag on each one. Three hundred kilobytes of where I have been running since 2020.

It was in a public repository. It had been there for a month.

What made it worse, in the way these things are always slightly worse than you first think, is that nothing needed it. I put it there for a `/training/` page that read the CSV at build time and printed the last fifty activities in a table. That page is gone. Those activities are real posts now, one file each, sitting in the archive with their own dates and maps and the descriptions I wrote in Swedish after the race. The import finished months ago. The scaffolding stayed up.

That is the part I want to remember. It wasn't a mistake of judgement — committing the file was the documented procedure at the time, and the README in that folder still cheerfully instructs you to *commit it and push*. It was a mistake of not going back. A build input is only justified by the build step that reads it, and when that step disappears the input doesn't announce itself. It just sits there, quietly public, with a README explaining why it belongs.

So it's out of the tree now, and out of the history too — ninety-eight commits rewritten to remove one file from one commit made in June. The folder kept its contents on my own disk and lost the extra underscore that had been marking it, wrongly, as something worth tracking. By the end of the day it had lost the rest of its old name as well, but I'm getting ahead of myself.

I'm told, and I believe it, that this is not quite the same as the file never having been there. GitHub keeps unreachable objects around for a while, and anyone who noted the old commit hash can still ask for it. The honest position is that the data was public for a month and a force-push doesn't retroactively make it private; it only stops the next person from stumbling over it. Which is worth doing. It just isn't absolution.

Later in the day I went back for the other two, and they didn't survive the second look. The argument that had saved them in the morning — tracked files cite them, so removing them breaks references — went circular the moment I asked what was doing the citing: a roadmap and a to-do list that nobody but me reads, in a repository nobody but me works in. The dead references I was protecting were dead only to an audience that doesn't exist. So the design notes went, and the specs, and the roadmap that cited them, and the Strava folder after them — all into one folder called `_local/` that git is told to ignore in a single line. What's on GitHub now is the site and the instructions for building it. Nothing else.

None of that needed the history rewritten. They were only ever my own notes, so it was enough that they stop being there from this commit on. That's a tidy-up, and I want to keep the word well away from what I had to do to the CSV. However similar the two looked from the outside, they were not the same job.

A single leading underscore means local now. There is no second tier, no folder marked as worth tracking, nothing to get wrong next time in the way I got it wrong in June.

The five years of races are still here, of course. They're the archive now, written up properly, each one a page instead of a row. That was always the point. I had just forgotten to take down the ladder.
