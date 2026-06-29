# Strava export — drop your data here

The `/training/` page builds from Strava's **free bulk account export**, not the
API (which Strava put behind a subscription on 2026-06-30).

## How to refresh the training log

1. On Strava: **Settings → "My Account" → "Download or Delete Your Account" →
   "Request your archive"**. Strava emails you a `.zip` (can take a few hours).
2. Unzip it. Inside is **`activities.csv`** (plus your route files).
3. Copy that `activities.csv` into this folder (`__strava/activities.csv`),
   replacing any previous one.
4. Commit it and push. Netlify rebuilds and the table shows your latest 50
   public activities.

Notes:

- Only **public** activities are shown (rows whose `Visibility` column is
  `everyone`). If your export has no `Visibility` column, *all* activities are
  shown — the build log warns when that happens.
- No `activities.csv` here yet → the page renders an empty table, no error.
- The parsing/mapping lives in `src/_config/strava-export.js`; the column
  mapping there assumes a **metric** export (distance in km). If your numbers
  look off, that's the place to adjust.
