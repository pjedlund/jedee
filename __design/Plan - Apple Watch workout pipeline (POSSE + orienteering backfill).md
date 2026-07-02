# Design increment — Apple Watch workout pipeline (POSSE + orienteering backfill)

**Date:** 2026-07-01
**Status:** Job B done (109 posts imported, uncommitted on `feat/workout-post-type`); Job C done (19 covers matched + wired, uncommitted); Job A designed 2026-07-02 (Health Auto Export → new `health-export.js` adapter → existing Micropub endpoint; not yet built).
**Source of truth:** this document + `_generated/import-orienteering.mjs` (import script) + `_generated/training-import-manifest.json` (per-post manifest for Job C).
**Purpose:** durable record of the three-job split so a later session doesn't have to re-derive scope or re-run the deep-research pass.

## The three jobs

- **Job A — live pipeline** (Watch/Health → site). Designed 2026-07-02, not yet built.
  Scope narrowed from the original "Watch → site → Strava" framing: Johan posts races
  to Strava manually via the iPhone app already (confirmed, not automatic HealthKit
  sync), so reverse-POSSE from the site to Strava is dropped, not just deferred —
  Strava/Livelox links stay a manual add after the fact, same as the Job B/C backfill.
  This also moots the earlier finding that reverse-POSSE was "unaffected" by Strava's
  terms — moot because it's superseded, but worth flagging: Strava's API went behind a
  paid developer tier (~$11.99/mo, effective 2026-06-30, same wall Job B hit on the
  bulk-export side) that would have covered the upload endpoint too, so that earlier
  finding was already going stale on its own. Full zero-touch publishing is still not
  achievable (iOS blocks HealthKit reads while locked; background execution is
  OS-scheduled, not deterministic) — confirmed via the Health Auto Export docs
  themselves (automations "rely on Background App Refresh").
  **Approach:** a new `netlify/functions/health-export.js`, sibling to `micropub.js`,
  receives Health Auto Export's REST-API automation POSTs and translates+forwards to
  the existing Micropub endpoint unchanged — no new auth system, it passes through
  whatever bearer token the automation is configured with and lets Micropub's existing
  token check be the real gate (Johan mints one long-lived token the same way any other
  Micropub client does, pastes it into Health Auto Export's custom automation headers).
  **Two automations, one adapter:** a timer-based one allow-listed to Running +
  Gym/strength-training activity types (the routine net), and a manual-trigger-only one
  (Health Auto Export's own "Manual Export" action) with no activity-type filter, for
  one-off activities outside that net (a hike, a ski tour). A query-string marker on
  the target URL (e.g. `?mode=manual`) tells the adapter which automation sent it, so
  only the manual one skips the filter. Exact allow-list strings (Apple's workout-type
  naming) get confirmed against a real captured payload during setup, not guessed.
  **Field mapping** (Health Auto Export's documented Workouts v2 schema → the existing
  `WORKOUT_KEY` properties in `micropub.js`): `distance`→`distanceKm`,
  `duration`(seconds, already matches)→`duration`, `avgHeartRate`→`hrAvg`,
  `maxHeartRate`→`hrMax`, `activeEnergyBurned`→`energyKcal`, and two **new** keys to add
  to `WORKOUT_KEY` — `elevationUp`/`elevationDown`→`elevationGain`/`elevationLoss`
  (mirrors exactly how `hrMax` was added 2026-06-29; the training layout already renders
  elevation, it just had no way in via Micropub yet). `route` (GPS) is received but not
  forwarded — see out-of-scope below.
  **Always a draft:** every post goes through as `visibility: private` (the engine's
  existing draft mechanism), landing in `src/posts/activities/` exactly like a
  hand-copied post. Johan reviews, adds a note, fixes the activity label if it's not a
  plain run, adds Strava/Livelox links, and publishes by hand.
  **Dedup:** each workout's own Health Auto Export `id` is stashed in the post's
  frontmatter as a hidden bookkeeping field, so a workout re-sent by the timer (overlap
  in what counts as "since last sync") is recognized and skipped instead of creating a
  duplicate draft/commit.
  **Error handling:** log-and-stop, no retries or alerts — a missed draft is
  recoverable (the source data still lives in Apple Health/Strava, and the manual
  copy-and-edit fallback still works), so nothing sturdier is worth building for a
  personal site.
  **Explicitly out of scope this round:** GPS routes/maps — the data's available
  (Health Auto Export can send route points or GPX directly) but the site has no map
  component, and publishing exact GPS start points is a privacy call worth making on
  purpose later, not defaulting into. Heart-rate recovery — available in the data,
  skipped, nothing on the site shows it. Cadence — not available on Johan's watch.
  Full findings from the original research session live in that session's
  `/deep-research` workflow output only — not persisted elsewhere.
- **Job B — orienteering backfill** (DONE, 2026-07-01). 109 posts imported to
  `src/posts/activities/` (folder named `training/` at the time, renamed 2026-07-01 —
  see Decisions below) from `__strava/activities.csv` (Strava's free bulk-export CSV;
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

- Post-type name/URL: renamed "Training" → "Activities" (`/activities/`) on 2026-07-01,
  after this doc first shipped — `workout`/`collections.workout`/layout names were kept
  as-is (Jam-style asymmetry: type name and URL don't have to match).
- The 10 excluded casual-named runs (see the script's `EXCLUDE` set) stay excluded;
  everything else that read as orienteering-flavored was imported, including
  ambiguous-but-plausible entries (e.g. a warmup jog logged separately from its race).
- Raw GPS track files (GPX/FIT) not pursued this session — none exist on disk, and
  Strava's archive request has no way to ask for just those. Re-requesting the full
  archive is a future fast-follow, not blocking.
