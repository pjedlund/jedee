// Unit tests for the pure transform layer of the Health Auto Export adapter.
// Mirrors tests/micropub.test.js's style/scope: pure functions only, no network/IO.
//
// Run: npm run test:unit   (or: node --test tests/health-export.test.js)
// Lives OUTSIDE netlify/functions/ on purpose (see micropub.test.js's header note —
// Netlify treats every .js file there as a deployable function).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  isAllowedActivity,
  toActivityLabel,
  healthExportDateToIso,
  normalizeDistanceKm,
  mapWorkout
} from '../netlify/functions/health-export.js'

test('isAllowedActivity: running and strength-training pass the auto net', () => {
  assert.equal(isAllowedActivity('Running'), true)
  assert.equal(isAllowedActivity('running'), true) // case-insensitive
  assert.equal(isAllowedActivity('Traditional Strength Training'), true)
  assert.equal(isAllowedActivity('Functional Strength Training'), true)
})

test('isAllowedActivity: other activity types are filtered out of the auto net', () => {
  assert.equal(isAllowedActivity('Cycling'), false)
  assert.equal(isAllowedActivity('Swimming'), false)
  assert.equal(isAllowedActivity(''), false)
})

test('isAllowedActivity: manual mode skips the filter entirely', () => {
  assert.equal(isAllowedActivity('Cycling', 'manual'), true)
  assert.equal(isAllowedActivity('Anything At All', 'manual'), true)
})

test('toActivityLabel: Apple display names normalize to the site vocabulary paceOrSpeed knows', () => {
  assert.equal(toActivityLabel('Running'), 'run')
  assert.equal(toActivityLabel('running'), 'run') // case-insensitive
  assert.equal(toActivityLabel('Trail Running'), 'trailrun') // spaces stripped, not mis-mapped to "run"
  assert.equal(toActivityLabel('Walking'), 'walk')
  assert.equal(toActivityLabel('Hiking'), 'hike')
})

test('toActivityLabel: unmapped activities pass through unchanged for hand-relabeling', () => {
  assert.equal(toActivityLabel('Traditional Strength Training'), 'Traditional Strength Training')
  assert.equal(toActivityLabel('Cycling'), 'Cycling')
  assert.equal(toActivityLabel(''), '')
})

test('healthExportDateToIso: reassembles the space-separated format into real ISO 8601', () => {
  assert.equal(healthExportDateToIso('2026-06-29 08:30:00 +0200'), '2026-06-29T08:30:00+02:00')
  assert.equal(healthExportDateToIso('2026-01-05 17:02:45 -0500'), '2026-01-05T17:02:45-05:00')
})

test('healthExportDateToIso: unparseable input returns null, never a bad string', () => {
  assert.equal(healthExportDateToIso('not a date'), null)
  assert.equal(healthExportDateToIso(''), null)
  assert.equal(healthExportDateToIso(undefined), null)
})

test('normalizeDistanceKm: km passes through rounded to 2 decimals', () => {
  assert.equal(normalizeDistanceKm({ qty: 10.567, units: 'km' }), 10.57)
})

test('normalizeDistanceKm: miles and meters convert to km', () => {
  assert.equal(normalizeDistanceKm({ qty: 6.2, units: 'mi' }), 9.98)
  assert.equal(normalizeDistanceKm({ qty: 5000, units: 'm' }), 5)
})

test('normalizeDistanceKm: non-numeric qty returns null', () => {
  assert.equal(normalizeDistanceKm({ qty: 'oops', units: 'km' }), null)
  assert.equal(normalizeDistanceKm({}), null)
})

test('mapWorkout: full workout maps every field to the Micropub flat properties', () => {
  const out = mapWorkout({
    id: 'abc-123',
    name: 'Running',
    start: '2026-06-29 08:30:00 +0200',
    end: '2026-06-29 09:15:00 +0200',
    duration: 1920,
    distance: { qty: 5.2, units: 'km' },
    avgHeartRate: { qty: 152.4 },
    maxHeartRate: { qty: 176 },
    activeEnergyBurned: { qty: 410.2 },
    elevationUp: { qty: 120 },
    elevationDown: { qty: 85.5 }
  })
  assert.deepEqual(out.props, {
    h: 'entry',
    activity: 'run', // "Running" normalized so paceOrSpeed's FOOT set recognizes it
    date: '2026-06-29T08:30:00+02:00',
    visibility: 'private',
    'health-export-id': 'abc-123',
    duration: '1920',
    distance: '5.2',
    'heart-rate': '152',
    'max-heart-rate': '176',
    energy: '410',
    'elevation-gain': '120',
    'elevation-loss': '86' // Math.round(85.5) -> 86
  })
  assert.equal(out.healthExportId, 'abc-123')
  // predicted path uses the normalized label too, so dedup matches the real write
  assert.equal(out.predictedPath, 'src/posts/activities/2026-06-29-run-52-km.md')
})

test('mapWorkout: missing optional fields are simply omitted, never null/NaN', () => {
  const out = mapWorkout({
    id: 'xyz-789',
    name: 'Functional Strength Training',
    start: '2026-07-01 18:00:00 +0200'
  })
  assert.deepEqual(out.props, {
    h: 'entry',
    activity: 'Functional Strength Training',
    date: '2026-07-01T18:00:00+02:00',
    visibility: 'private',
    'health-export-id': 'xyz-789'
  })
  assert.equal(out.predictedPath, 'src/posts/activities/2026-07-01-functional-strength-training.md')
})

test('mapWorkout: missing id, name, or start -> null (nothing to post)', () => {
  assert.equal(mapWorkout({ name: 'Running', start: '2026-06-29 08:30:00 +0200' }), null) // no id
  assert.equal(mapWorkout({ id: '1', start: '2026-06-29 08:30:00 +0200' }), null) // no name
  assert.equal(mapWorkout({ id: '1', name: 'Running' }), null) // no start
})

test('mapWorkout: unparseable start date -> null', () => {
  assert.equal(mapWorkout({ id: '1', name: 'Running', start: 'garbage' }), null)
})
