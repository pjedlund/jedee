// Adapter in front of the existing Micropub endpoint: Health Auto Export's REST-API
// automations POST a workout here; this file filters it, translates it into the same
// flat properties a Micropub client would send, and hands it to the existing endpoint
// in-process (see the handler at the bottom — same auth check, same commit path as
// every other client, just a function call instead of an HTTP round-trip).
//
// Two automations point at this one file: a timer-based one for the routine
// Running/Gym net, and a manual-trigger-only one (Health Auto Export's own "Manual
// Export" action) with `?mode=manual` on the URL, which skips the activity-type
// filter entirely — for one-off activities outside that net (a hike, a ski tour).
//
// See __design/Plan - Apple Watch workout pipeline (POSSE + orienteering backfill).md

import matter from 'gray-matter'
import GitHubStore from '@benjifs/github-store'
import { buildEndpoint, workoutFile, deriveWorkoutTitle, CONTENT_DIR } from './micropub.js'

const { GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO, GITHUB_BRANCH } = process.env

// ponytail: seeded from Apple's known HealthKit workout-type display names. Confirm
// against a real Health Auto Export payload during setup (see the design doc) before
// trusting this list long-term — Apple's exact strings for Johan's watch aren't
// verified yet.
const ALLOWED_ACTIVITY_SUBSTRINGS = [
  'running',
  'traditional strength training',
  'functional strength training',
  'core training'
]

export const isAllowedActivity = (name = '', mode = 'auto') => {
  if (mode === 'manual') return true
  const lower = String(name).toLowerCase()
  return ALLOWED_ACTIVITY_SUBSTRINGS.some((s) => lower.includes(s))
}

// Health Auto Export's documented workout start/end format: "yyyy-MM-dd HH:mm:ss Z"
// (e.g. "2026-06-29 08:30:00 +0200") — not spec-compliant ISO 8601 (missing the `T`
// separator and the offset's colon), so plain `new Date()` parsing of it is unreliable
// across engines. Reassemble it into a real ISO string instead of trusting Date parsing.
const HEALTH_EXPORT_DATE_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{2})(\d{2})$/

export const healthExportDateToIso = (s = '') => {
  const m = String(s).match(HEALTH_EXPORT_DATE_RE)
  if (!m) return null
  const [, y, mo, d, h, mi, sec, offH, offM] = m
  return `${y}-${mo}-${d}T${h}:${mi}:${sec}${offH}:${offM}`
}

// Health Auto Export reports distance as { qty, units }; the site's `distanceKm`
// frontmatter has no unit field, so this adapter is the only place a unit conversion
// can happen. Rounded to 2 decimals (matches how distanceKm already reads on the
// backfilled posts).
export const normalizeDistanceKm = ({ qty, units } = {}) => {
  const n = Number(qty)
  if (Number.isNaN(n)) return null
  if (units === 'mi') return Math.round(n * 1.609344 * 100) / 100
  if (units === 'm') return Math.round((n / 1000) * 100) / 100
  return Math.round(n * 100) / 100 // km, or an unrecognized unit passed through as-is
}

// Same folder+slug logic the real post will get (workoutFile, already exported from
// micropub.js) — lets the handler check for a collision BEFORE forwarding, using a
// throwaway source path (only its directory portion survives workoutFile's rewrite).
const predictWorkoutPath = (activityType, distanceKm, date) => {
  const title = deriveWorkoutTitle(activityType, distanceKm)
  const { finalName } = workoutFile(`${CONTENT_DIR}/notes/precheck.md`, { title, date })
  return finalName
}

// Translate one Health Auto Export workout into the flat Micropub properties the
// existing WORKOUT_KEY map already reads, plus everything the handler needs to post
// and dedupe it. Pure — no I/O. Returns null when required fields are missing.
export const mapWorkout = (workout = {}) => {
  const { name, start, id } = workout
  if (!name || !start || !id) return null
  const date = healthExportDateToIso(start)
  if (!date) return null
  const distanceKm = workout.distance?.qty != null ? normalizeDistanceKm(workout.distance) : null

  const props = {
    h: 'entry',
    activity: name,
    date,
    visibility: 'private',
    'health-export-id': id
  }
  if (typeof workout.duration === 'number') props.duration = String(Math.round(workout.duration))
  if (distanceKm != null) props.distance = String(distanceKm)
  if (workout.avgHeartRate?.qty != null) props['heart-rate'] = String(Math.round(workout.avgHeartRate.qty))
  if (workout.maxHeartRate?.qty != null) props['max-heart-rate'] = String(Math.round(workout.maxHeartRate.qty))
  if (workout.activeEnergyBurned?.qty != null) props.energy = String(Math.round(workout.activeEnergyBurned.qty))
  if (workout.elevationUp?.qty != null) props['elevation-gain'] = String(Math.round(workout.elevationUp.qty))
  if (workout.elevationDown?.qty != null) props['elevation-loss'] = String(Math.round(workout.elevationDown.qty))

  return { props, predictedPath: predictWorkoutPath(name, distanceKm, date), healthExportId: id }
}
