---
description: "How the activities archive was built backward from Strava exports, and why its layout is activity.njk rather than workout.njk."
date: 2026-07-31
---

`/activities/` holds 180 workout posts (2026-09-06), 112 of them orienteering races from 2020–2026 — the count grows, the orienteering figure is the closed set the original import recovered. Almost none were written as posts — the archive was built backward: imported from Strava, enriched by matching scripts, and only then opened for new posts.

⚠ The layout is `activity.njk` and the folder data sets `category: activity` — **not** `workout.njk`, despite "workout post" being the natural phrase.

## The goal that failed first

The plan was auto-publishing: finish a run on an Apple Watch and have it appear on the site the moment it ends, no phone unlocked, no button pressed. **Apple's design blocks this.** Health data is inaccessible while the phone is locked — no app, shortcut, or background process can read a finished workout until unlock. There is no workaround; the restriction is the platform working as intended. So the project turned from automating the future to recovering the past. New posts now arrive through the Micropub endpoint instead ([[Micropub]] — a workout has no engine post-type, so it is routed as a note and rerouted here on its `activity` property).

## Frontmatter stores recorded numbers only

```yaml
activityType: orienteering
distanceKm: 3.81
duration: 1913
hrAvg: 167
hrMax: 180
stravaUrl: https://www.strava.com/activities/12296712412
eventorUrl: https://eventor.orientering.se/Events/Show/25464
liveloxUrl: https://www.livelox.com/Viewer/FK-Asen-medel/H55?classId=828393
```

- **Never store a derived value.** `duration` is raw seconds (1913, not "31:53") and `distanceKm` stays metric; the layout formats and converts at render time.
- **The three URL fields are the race's paper trail:** the recording, the official event page, and the route drawn on the map.
- Posts with commentary carry it as the body — usually the Strava description, in Swedish, exactly as written after the race.

## Dual units, derived at render

`withMiles` turns `4.91` into "4.91 km (3.05 mi)". `paceOrSpeed` picks the format by sport: foot sports (run, hike, orienteering) get pace as "m:ss/km (m:ss/mi)"; wheels and skis get speed; anything else — weight training — gets nothing at all. **Every field in the stats list is conditional except duration**, so a gym session simply renders a shorter list and the markup never shows empty rows.

The stats block is deliberately plain HTML: no standard microformats2 property exists for workout stats, so the post stays a valid `h-entry` on its title, date, and body alone. Inventing mf2 properties would be worse than omitting them.

## The backfill, in passes

1. **Posts from Strava** — 109 races plus 37 weight-training sessions and 7 runs, exported and converted to markdown, keeping each description as the body.
2. **Links from Livelox** — 85 races got `eventorUrl`/`liveloxUrl` matched by script, by date, disambiguating same-date races (multi-stage events, park sprints) by distance.
3. **Covers from photos** — 19 race maps had been photographed in batches days after the races, so photo metadata was useless for matching; each was matched by reading the event name and date *printed on the map itself*.
4. **Coordinates**, later — arena lat/lon scraped from Eventor's public event pages (49 posts), then first-GPS-point extraction from the Strava export's `.gpx`/`.fit.gz` route files (68 more). The 36 remaining are indoor gym sessions with no GPS at all, which is why they never appear on the map.

**The general pattern:** where an official source publishes the data (Eventor's arena position), scrape it; where only a personal export has it, mine the export; accept that some records simply have no data and let the UI omit them. All four passes are one-time frontmatter backfills, not build-time fetches — the scripts live in `_local/generated/`.

## Topping it up

The archive is not finished; a fresh Strava export is pulled every few months and the races since the last one are added. Three things about the export are easy to get wrong on the second run, having been solved and forgotten on the first:

- ⚠ **`activities.csv` has two columns literally named `Distans`** — the first kilometres with a comma decimal (`5,34`), the second metres as a float (`5343.4`). A `csv.DictReader` collapses duplicate keys to the last, so a dict read silently returns metres where the 2021 script's positional `pick()` returned kilometres.
- **The `Media` column carries the race maps.** Pipe-separated `media/<uuid>.jpg` paths, which is where pass 3's photographed maps now come from rather than the phone — no matching by printed event name needed. Two caveats: the export downsizes them to 1600 px on the long edge (the 2025-and-earlier covers are 3024 px originals), and not every attachment is a map — E1 2026's second photo is the split printout.
- ⚠ **`Aktivitetsdatum` is UTC**, not the Swedish wall-clock time the 2021 script's comment claims. See [[Timestamps without a time zone]] — the backfilled posts are two hours early in their time of day, which is harmless for dates and permalinks and has not been swept.

Four posts is below the threshold where a script pays for itself: the 2026 O-Ringen import was four hand-written files plus one `fitparse` call for coordinates. `import-orienteering.mjs` and `strava-coords.py` remain in `_local/generated/` as reference for a larger batch.

## The race map is a lightbox

22 posts carry a photographed race map as `cover`, printed beside the stats at 14 rem — enough to see the shape of the course and nothing else. Every one of them opens in [[The PhotoSwipe lightbox]].

This is the one layout where the cover goes through `{% imageKeys %}` rather than a plain `<img>`. The shortcode prepends `./src` to its source and so breaks on a remote URL — which is why reading, watching, jam and recipe covers must stay plain `<img>` (see [[Self-hosting remote images at build time]]). Activity covers are always local scans under `/assets/images/activities/`, so the shortcode is safe here. The divergence is commented in `activity.njk`, because it otherwise reads as a violation of the rule the other four follow.

The overview map that consumes those coordinates is a separate piece: a server-rendered place list from frontmatter is both the data source and the no-JS path. ⚠ Nunjucks `selectattr` can't reach `data.lat`, which is why a custom `located` filter exists.

Raw source: `src/_raw/dev-notes/How the activities archive was built.md`
