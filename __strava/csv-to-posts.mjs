// One-shot: convert the 50 latest activities in __strava/activities.csv into
// `workout` posts under src/posts/training/. Reuses the tested CSV parsing in
// src/_config/strava-export.js (Swedish columns, decimal commas, type map, the
// duplicated-header handling), but emits the workout frontmatter the layout reads:
// raw `duration` in seconds + numeric `distanceKm`/`hrAvg` (pace is DERIVED at
// render), an ISO `date`, the Strava activity name as the title, and `draft: false`.
//
// Run:  node __strava/csv-to-posts.mjs
// Tied to the parked Strava-CSV path — delete this together with strava.js /
// strava-export.js / __strava/ when that path is finally retired.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { parseCSV, toObjects, mapRow } from '../src/_config/strava-export.js';

const CSV = path.join(process.cwd(), '__strava', 'activities.csv');
const OUT = path.join(process.cwd(), 'src', 'posts', 'training');
const MAX = 50;

// Case-insensitive column lookup with aliases (mirrors strava-export's private pick).
const pick = (row, ...names) => {
  for (const n of names) {
    const hit = Object.keys(row).find(k => k.toLowerCase() === n.toLowerCase());
    if (hit && row[hit] !== '') return row[hit];
  }
  return '';
};

// "H:MM:SS" / "MM:SS" (mapRow's formatted duration) -> seconds.
const toSeconds = clock => {
  const p = String(clock).split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(clock) || 0;
};

const slugify = s =>
  String(s).toLowerCase().normalize('NFKD')
    .replace(/[^\w\s-]+/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

const num = s => { const n = Number(s); return Number.isNaN(n) ? null : n; };

if (!fs.existsSync(CSV)) {
  console.error(`No CSV at ${CSV} — nothing to import.`);
  process.exit(1);
}

const { objects } = toObjects(parseCSV(fs.readFileSync(CSV, 'utf-8')));

// Map every row, keep its raw object alongside (for name/calories mapRow drops),
// newest first, take the latest MAX.
const rows = objects
  .map(obj => ({ a: mapRow(obj), obj }))
  .filter(r => r.a.ts) // drop rows whose date wouldn't parse
  .sort((x, y) => y.a.ts - x.a.ts)
  .slice(0, MAX);

const seen = new Set();
let written = 0;

for (const { a, obj } of rows) {
  const iso = new Date(a.ts).toISOString();
  const ymd = iso.slice(0, 10);
  const name = pick(obj, 'Activity Name', 'Aktivitetsnamn');
  const title = name || (a.distanceKm ? `${a.type} · ${a.distanceKm} km` : a.type);

  const data = { title, date: iso, activityType: a.type };
  if (a.distanceKm) data.distanceKm = a.distanceKm;
  data.duration = toSeconds(a.duration);
  if (a.hrAvg) data.hrAvg = a.hrAvg;
  const kcal = num(pick(obj, 'Calories', 'Kalorier'));
  if (kcal) data.energyKcal = kcal;
  if (a.id) data.stravaUrl = `https://www.strava.com/activities/${a.id}`;
  data.draft = false;

  // filename: <date>-<slug>; Eleventy strips the leading date for the slug and the
  // permalink re-adds it, so the URL is /training/<date>-<slug>/. Guard collisions.
  let base = `${ymd}-${slugify(title)}`;
  let name2 = base;
  let n = 2;
  while (seen.has(name2)) name2 = `${base}-${n++}`;
  seen.add(name2);

  fs.writeFileSync(path.join(OUT, `${name2}.md`), matter.stringify(a.note || '', data));
  written++;
}

console.log(`Wrote ${written} workout posts to src/posts/training/ (latest ${MAX} activities).`);
