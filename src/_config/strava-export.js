// Pure logic for the Strava training log, kept OUT of src/_data/ on purpose:
// Eleventy treats every module in _data as a global-data file, and (in 3.x) a
// data module with NAMED exports is stored as-is rather than invoked — so the
// _data entry (strava.js) must be default-export-only. This sibling holds the
// helpers + getActivities() so they can carry named exports and be unit-tested.
//
// Source: Strava's FREE bulk account export (Settings → "Download or Delete
// Your Account" → "Request your archive"). Drop the resulting activities.csv at
// __strava/activities.csv (git-tracked, so Netlify sees it). No API, no token,
// no subscription. Missing/empty file → empty list, build stays green.
import fs from 'node:fs';
import path from 'node:path';

const CSV_FILE = path.join(process.cwd(), '__strava', 'activities.csv');
const MAX_ROWS = 50;

// Sport label, normalized to English (Johan's export is Swedish; the site is
// US-English). The override Johan cares about: trail runs are only ever
// orienteering for him, so TrailRun / Terränglöpning → Orienteering. Unknown
// types fall back to camelCase-split (handles English sport_type, leaves an
// unrecognized label readable).
const normalize = s => (s || '').replace(/\s+/g, '').toLowerCase();
const TYPE_MAP = {
  // Johan's override, both languages
  trailrun: 'Orienteering', terränglöpning: 'Orienteering',
  // Swedish → English (the types in his export)
  löpning: 'Run', cykeltur: 'Ride', cykling: 'Ride', promenad: 'Walk',
  vandring: 'Hike', simning: 'Swim', styrketräning: 'Weight Training',
  träningspass: 'Workout', träning: 'Workout', längdskidåkning: 'Nordic Ski'
};

export function prettifyType(s) {
  if (!s) return '';
  return TYPE_MAP[normalize(s)] || s.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// Numbers: Strava's localized export uses a decimal COMMA in human columns
// ("4,84" km) but a dot in SI columns — tolerate both. '' / missing → NaN.
const num = s => (s ? parseFloat(String(s).replace(',', '.')) : NaN);

// Dates: English exports parse with `new Date`; Swedish ones ("14 maj 2026
// 08.09.54", "21 aug. 2025 13.09.53") don't — match day + month (full or
// abbreviated, first 3 letters) + year + optional dotted/colon time.
const SV_MONTH = {jan: 0, feb: 1, mar: 2, apr: 3, maj: 4, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11};
function parseDate(s) {
  const d = new Date(s);
  if (!isNaN(d)) return d;
  const m = s.match(/(\d{1,2})\s+([a-zåäö]+)\.?\s+(\d{4})(?:\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?)?/i);
  if (m) {
    const month = SV_MONTH[m[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) return new Date(+m[3], month, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  return new Date(NaN);
}

// Pace (min/km) vs speed (km/h) by sport family, keyed on the normalized type.
const FOOT = new Set(['run', 'trailrun', 'walk', 'hike', 'orienteering']);
const WHEEL = new Set(['ride', 'mountainbikeride', 'gravelride', 'virtualride', 'ebikeride']);
const SKI = new Set(['nordicski', 'backcountryski', 'rollerski']);

export function paceOrSpeed(type, km, movingTime) {
  if (!km || !movingTime) return '';
  const k = normalize(type);
  if (FOOT.has(k)) {
    const secPerKm = movingTime / km;
    return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}/km`;
  }
  if (WHEEL.has(k) || SKI.has(k)) return `${(km / (movingTime / 3600)).toFixed(1)} km/h`;
  return '';
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

// Minimal RFC-4180 parser: handles quoted fields containing commas, newlines,
// and escaped "" quotes (Strava activity descriptions have all three).
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {field += '"'; i++;} else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {row.push(field); field = '';}
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {row.push(field); rows.push(row);}
  return rows;
}

// Strava's export DUPLICATES some headers (two "Distance", two "Elapsed Time" —
// human-readable first, SI units later). First occurrence wins, keeping the
// km/seconds-friendly columns. Returns {objects, keys}.
export function toObjects(rows) {
  const [header = [], ...body] = rows;
  const keys = header.map(h => h.trim());
  const objects = body.map(cols => {
    const o = {};
    keys.forEach((k, i) => {
      if (!(k in o)) o[k] = (cols[i] || '').trim();
    });
    return o;
  });
  return {objects, keys};
}

// Case-insensitive column lookup with aliases; '' if absent/empty.
const pick = (row, ...names) => {
  for (const n of names) {
    const hit = Object.keys(row).find(k => k.toLowerCase() === n.toLowerCase());
    if (hit && row[hit] !== '') return row[hit];
  }
  return '';
};

export function mapRow(row) {
  const type = prettifyType(pick(row, 'Activity Type', 'Sport Type', 'Aktivitetstyp'));
  const km = num(pick(row, 'Distance', 'Distans')); // first "Distance"/"Distans" is km
  const distanceKm = km > 0 ? +km.toFixed(2) : null;
  // Prefer moving time; strength sessions have no movement, so fall back to elapsed.
  const moving = num(pick(row, 'Moving Time', 'Tid i rörelse'));
  const elapsed = num(pick(row, 'Elapsed Time', 'Total tid'));
  const seconds = Math.round((moving > 0 ? moving : elapsed) || 0);
  const hrAvg = Math.round(num(pick(row, 'Average Heart Rate', 'Genomsnittlig puls')));
  const hrMax = Math.round(num(pick(row, 'Max Heart Rate', 'Maxpuls')));
  const rawDate = pick(row, 'Activity Date', 'Aktivitetsdatum');
  const date = parseDate(rawDate);
  return {
    id: pick(row, 'Activity ID', 'Aktivitets-ID'),
    type,
    date: isNaN(date) ? rawDate : DATE_FMT.format(date),
    ts: isNaN(date) ? 0 : date.getTime(),
    distanceKm,
    duration: formatDuration(seconds),
    paceOrSpeed: paceOrSpeed(type, distanceKm, seconds),
    hrAvg: hrAvg || null,
    hrMax: hrMax || null,
    note: pick(row, 'Activity Description', 'Aktivitetsbeskrivning')
  };
}

export function getActivities(file = CSV_FILE) {
  if (!fs.existsSync(file)) {
    console.warn(`>>> Strava: no export at ${file} — table will be empty`);
    return [];
  }

  const {objects, keys} = toObjects(parseCSV(fs.readFileSync(file, 'utf-8')));

  // Public only — if the export carries a Visibility column, drop anything that
  // isn't "everyone". If it has no such column we can't tell, so keep all and
  // warn (curate the CSV, or make activities public on Strava).
  const hasVisibility = keys.some(k => k.toLowerCase() === 'visibility');
  if (!hasVisibility) console.warn('>>> Strava: export has no Visibility column — showing ALL activities');

  const activities = objects
    .filter(r => !hasVisibility || pick(r, 'Visibility').toLowerCase() === 'everyone')
    .map(mapRow)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_ROWS);

  console.log(`>>> Strava: ${activities.length} activities from export`);
  return activities;
}
