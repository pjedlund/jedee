---
title: How the activities archive was built
description: A dev note on the /activities/ archive — 153 workout posts backfilled from Strava, matched to Eventor and Livelox by script, with frontmatter and layout excerpts.
date: 2026-07-05
tags:
  - orienteering
  - indieweb
draft: true
---

This site has an `/activities/` section: 153 workout posts, 109 of them orienteering races from 2020–2025. Almost none of them were written as posts. The archive was built backward — imported from Strava, enriched by a matching script, and only then opened for new posts. This note documents how.

## The original goal, and why it failed

The plan was auto-publishing: finish a run on an Apple Watch, and have the workout appear on the site the moment it ends, with no phone unlocked and no button pressed. Apple's design blocks this. Health data is inaccessible while the phone is locked — no app, shortcut, or background process can read a finished workout until the phone is unlocked. There is no workaround; the restriction is the platform working as intended.

So instead of automating the future, the project turned to the past: five years of orienteering races that existed only on Strava.

## The posts

Each activity is a markdown file in `src/posts/activities/`, named `YYYY-MM-DD-slug.md`. The frontmatter stores only recorded numbers — never derived values like pace. A representative race post, `2024-09-01-fk-asen-medeldistans-tollarp.md`:

```yaml
---
title: "FK Åsen medeldistans Tollarp"
date: "2024-09-01T07:55:50+02:00"
activityType: orienteering
distanceKm: 3.81
duration: 1913
hrAvg: 167
hrMax: 180
energyKcal: 376
stravaUrl: https://www.strava.com/activities/12296712412
elevationGain: 87
elevationLoss: 104
eventorUrl: https://eventor.orientering.se/Events/Show/25464
liveloxUrl: https://www.livelox.com/Viewer/FK-Asen-medel/H55?classId=828393
---
```

Pointers:

- **`duration` is raw seconds** (1913, not "31:53"); the layout formats it at render time.
- **`distanceKm` stays metric in storage.** The imperial equivalent is derived when rendering.
- **The three URL fields are the race's paper trail:** `stravaUrl` (the recording), `eventorUrl` (the official event page), `liveloxUrl` (the route drawn on the map).
- **Posts with commentary carry it as the body** — usually the Strava description, in Swedish, exactly as written after the race.
- **19 posts also have a `cover:` field** pointing at a photographed race map in `src/assets/images/activities/`.

## The layout

`src/_layouts/activity.njk` renders the stats as a description list. The interesting part:

{% raw %}

```jinja2
<dl class="activity-stats | cluster">
  {% if distanceKm %}
    <div><dt>Distance</dt><dd>{{ distanceKm | withMiles }}</dd></div>
  {% endif %}
  <div><dt>Duration</dt><dd>{{ duration | itunesDuration }}</dd></div>
  {% set pace = activityType | paceOrSpeed(distanceKm, duration) %}
  {% if pace %}
    <div><dt>Pace</dt><dd>{{ pace }}</dd></div>
  {% endif %}
  {% if hrAvg %}
    <div><dt>Heart rate</dt><dd>{{ hrAvg }}{% if hrMax %} ({{ hrMax }} max){% endif %}</dd></div>
  {% endif %}
  {% if elevationGain %}
    <div><dt>Elevation</dt><dd>+{{ elevationGain }} m{% if elevationLoss %} / -{{ elevationLoss }} m{% endif %}</dd></div>
  {% endif %}
  {% if energyKcal %}
    <div><dt>Energy</dt><dd>{{ energyKcal }} kcal</dd></div>
  {% endif %}
</dl>

{% if stravaUrl or liveloxUrl or eventorUrl %}
  <p class="cluster gutter-xs-s">
    {% if stravaUrl %}<a class="button" data-small-button href="{{ stravaUrl }}">View on Strava</a>{% endif %}
    {% if liveloxUrl %}<a class="button" data-small-button href="{{ liveloxUrl }}">View on Livelox</a>{% endif %}
    {% if eventorUrl %}<a class="button" data-small-button href="{{ eventorUrl }}">View on Eventor</a>{% endif %}
  </p>
{% endif %}
```

{% endraw %}

Pointers:

- **Units are dual, derived at render time.** `withMiles` (`src/_config/filters/distance.js`) turns `distanceKm: 4.91` into "4.91 km (3.05 mi)". `paceOrSpeed` (`src/_config/filters/pace.js`) picks the format by sport: foot sports (run, hike, orienteering) get pace as "m:ss/km (m:ss/mi)"; wheels and skis get speed as "km/h (mph)"; anything else — weight training, say — gets nothing.
- **Heart rate renders as one entry:** average with the peak in parentheses, e.g. "167 (180 max)".
- **Elevation shows gain and loss** when both were recorded: "+87 m / -104 m".
- **Every field is conditional except duration.** A gym session with no distance simply has a shorter list; the markup never shows empty rows.
- The stats block is deliberately plain HTML — no standard microformats2 property exists for workout stats, so the post stays a valid h-entry on its title, date, and body alone.

## The backfill

The archive was filled in three passes:

1. **Posts from Strava.** The 109 orienteering races (plus 37 weight-training sessions and 7 plain runs) were exported and converted to markdown files, keeping each activity's Strava description as the post body and its recorded elevation in frontmatter.
2. **Links from Livelox.** 85 of the 109 races got their `eventorUrl` and/or `liveloxUrl` from an export of the author's own Livelox account, matched by a script — `livelox-import.py`, kept in the gitignored `_generated/` working folder. It matches races by date; when two races share a date (multi-stage events, park sprints), it disambiguates by distance.
3. **Covers from photos.** 19 race maps had been hand-photographed over the years, in batches days after the races, so photo metadata was useless for matching. Each was matched by reading the event name and date printed on the map itself, then wired in as `cover:`.

The section was originally `/training/` and was renamed to `/activities/` — URL, folder, and navigation all changed. New posts arrive through the site's Micropub endpoint rather than any watch automation.

The story behind this archive — the races that only lived on Strava — is in [[The races the watch forgot]].
