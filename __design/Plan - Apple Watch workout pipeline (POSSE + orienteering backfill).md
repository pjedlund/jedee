# Design increment — Apple Watch workout pipeline (POSSE + orienteering backfill)

**Date:** 2026-07-01
**Status:** Job B done (109 posts imported, uncommitted on `feat/workout-post-type`); Job C done (19 covers matched + wired, uncommitted); Job A research-only.
**Source of truth:** this document + `_generated/import-orienteering.mjs` (import script) + `_generated/training-import-manifest.json` (per-post manifest for Job C).
**Purpose:** durable record of the three-job split so a later session doesn't have to re-derive scope or re-run the deep-research pass.

## The three jobs

- **Job A — live pipeline** (Watch → site → Strava). Research-only, not built. Verdict:
  fully zero-touch publishing is not achievable — iOS blocks HealthKit reads while the
  phone is locked and background execution is OS-scheduled, not deterministic.
  Near-zero-touch is achievable via Health Auto Export's REST-API automation (POSTing
  to a custom endpoint on an interval) feeding a small translation adapter in front of
  the existing Micropub endpoint. Reverse-POSSE to Strava (`POST /api/v3/uploads`,
  `activity:write` scope) is officially supported and unaffected by Strava's Nov 2024
  API-terms tightening (that tightening only restricts showing one user's data to
  other users / AI training). Full findings live in this session's `/deep-research`
  workflow output only — not persisted elsewhere; re-run if this thread is lost.
- **Job B — orienteering backfill** (DONE, 2026-07-01). 109 posts imported to
  `src/posts/training/` from `__strava/activities.csv` (Strava's free bulk-export CSV;
  the Strava API itself went behind a paid subscription 2026-06-30, confirmed via
  `__strava/README.md` and Strava's own support page — bulk-export has no
  configuration options, it's all-or-nothing). Detection heuristic:
  `Aktivitetstyp === 'Löpning'` rows whose name isn't a Strava-auto-generated default
  (the `Tävling`/race column is empty for all 928 rows and couldn't be used). 10
  confirmed-casual runs excluded by exact date+name (see `EXCLUDE` in the script).
  Frontmatter matches the existing contract: `activityType: orienteering`,
  `distanceKm`, `duration`, `hrAvg`, `hrMax`, `energyKcal`, `stravaUrl`. Dates are
  DST-aware Europe/Stockholm ISO strings.
- **Job C — photo backfill** (DONE, 2026-07-01). Johan exported the candidate
  race-map/course photos by hand into `_generated/photos/` (23 JPEGs) rather than
  going through `osxphotos` — the planned iCloud-library extraction was never
  needed. EXIF capture-date proximity to `dateKey` turned out to be an unreliable
  matcher on its own: the photos are a photographed *stack* of paper maps, taken in
  irregular batches days-to-weeks after the races (one 2025-09-16 batch of 5
  photos covered four unrelated events). Matched all 23 by reading the event
  name/date printed on each map image and cross-checking against
  `training-import-manifest.json`, not by date alone. **19 of 23 matched** and
  wired: photo copied to `src/assets/images/activities/<slug>.jpg`, `cover:
  "/assets/images/activities/<slug>.jpg"` added to the post's frontmatter. **3
  photos were duplicates** of an already-matched map (extra shots of the same
  physical page) and weren't copied — one cover per post is enough. **1 photo
  excluded on purpose:** `IMG_0125.jpeg`, confirmed by Johan to be from a solo
  training race with no corresponding Strava/Livelox activity. `workout.njk`'s
  `cover` field (added earlier this session, mirrored from `reading.njk`) needed
  no changes — Job C was pure content + frontmatter, no template work. Verified
  two of the 19 live on the dev server (correct map thumbnail, no console
  errors).

## Incidental fix (this session)

`cluster.css`/`sidebar.css`/`repel.css` all had a typo'd fallback token
(`--space-s-l`, which doesn't exist — the fluid-space scale only has adjacent-tier
pairs). It silently zeroed the gap on any `.cluster`/`.sidebar`/`.repel` element that
didn't set its own `--gutter`, site-wide — not just workout posts. Fixed to
`--space-s-m` (each file's own header comment already documented this as the intended
default). Confirmed live before/after via the dev server.

## Decisions already made (don't re-litigate)

- Post-type name/URL stays "Training" — Johan considered "Activities", declined.
- The 10 excluded casual-named runs (see the script's `EXCLUDE` set) stay excluded;
  everything else that read as orienteering-flavored was imported, including
  ambiguous-but-plausible entries (e.g. a warmup jog logged separately from its race).
- Raw GPS track files (GPX/FIT) not pursued this session — none exist on disk, and
  Strava's archive request has no way to ask for just those. Re-requesting the full
  archive is a future fast-follow, not blocking.
