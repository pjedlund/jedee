// Build-time Strava activity fetch with our own persistent cache. Mirrors the
// spirit of src/_data/webmentions.js: fetching is PRODUCTION-only; dev/test
// builds just read whatever is in `.cache/strava.json` (seed a fixture to
// preview locally). Missing creds or a failed call degrades gracefully — we
// return the cached/empty data so the build stays green and the table renders
// empty until the STRAVA_* env vars are set (local `.env` + Netlify build env).
//
// The cache survives across deploys via `netlify-plugin-cache` (netlify.toml).
// ponytail: overwrite cache each prod build; only 50 rows, no incremental merge.
import fs from 'node:fs';
import path from 'node:path';
import EleventyFetch from '@11ty/eleventy-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CACHE_DIR = '.cache';
const CACHE_FILE = path.join(CACHE_DIR, 'strava.json');
const {STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN} = process.env;

// Strava sport_type → display label. Default: split camelCase into words.
// One override: Johan only tags trail runs when orienteering (a real trail run
// is logged as a plain Run in Strava).
const TYPE_OVERRIDES = {TrailRun: 'Orienteering'};
const prettifyType = s => TYPE_OVERRIDES[s] || s.replace(/([a-z])([A-Z])/g, '$1 $2');

// Pace (min/km) vs speed (km/h) by sport family, keyed on raw sport_type.
const FOOT = new Set(['Run', 'TrailRun', 'Walk', 'Hike']);
const WHEEL = new Set(['Ride', 'MountainBikeRide', 'GravelRide', 'VirtualRide', 'EBikeRide']);
const SKI = new Set(['NordicSki', 'BackcountrySki', 'RollerSki']);

function paceOrSpeed(sportType, distanceM, movingTime) {
  if (!distanceM || !movingTime) return '';
  const km = distanceM / 1000;
  if (FOOT.has(sportType)) {
    const secPerKm = movingTime / km;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}/km`;
  }
  if (WHEEL.has(sportType) || SKI.has(sportType)) {
    return `${(km / (movingTime / 3600)).toFixed(1)} km/h`;
  }
  return '';
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

export function mapActivity(a) {
  return {
    id: a.id,
    type: prettifyType(a.sport_type),
    date: DATE_FMT.format(new Date(a.start_date_local)),
    distanceKm: a.distance ? +(a.distance / 1000).toFixed(2) : null,
    duration: formatDuration(a.moving_time),
    paceOrSpeed: paceOrSpeed(a.sport_type, a.distance, a.moving_time),
    hrAvg: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    hrMax: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    note: a.description || ''
  };
}

async function fetchActivities() {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    console.warn('>>> unable to fetch Strava: missing STRAVA_* env vars');
    return false;
  }

  // A non-2xx from Strava makes EleventyFetch throw; catch it so a rejected
  // token or the subscriber-only API gate (from 2026-06-30) degrades to an
  // empty table instead of failing the whole site build.
  try {
    // 1. Refresh-token grant → short-lived access token. duration '0s': always fresh.
    const token = await EleventyFetch('https://www.strava.com/oauth/token', {
      duration: '0s',
      type: 'json',
      fetchOptions: {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: STRAVA_REFRESH_TOKEN
        })
      }
    });
    if (!token.access_token) {
      console.warn('>>> Strava token exchange failed');
      return false;
    }

    // 2. 50 most recent activities.
    const activities = await EleventyFetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
      duration: '0s',
      type: 'json',
      fetchOptions: {headers: {Authorization: `Bearer ${token.access_token}`}}
    });
    console.log(`>>> ${activities.length} Strava activities fetched`);
    return activities;
  } catch (err) {
    console.warn(`>>> unable to fetch Strava: ${err.message}`);
    return false;
  }
}

function writeCache(data) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  console.log(`>>> ${data.length} Strava activities saved to ${CACHE_FILE}`);
}

function readCache() {
  if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  return [];
}

export default async function () {
  if (process.env.ELEVENTY_ENV === 'production') {
    const activities = await fetchActivities();
    if (activities) {
      // Public only. activity:read scope already excludes "Only You"; this also
      // drops "Followers only" (belt-and-suspenders).
      const mapped = activities.filter(a => a.visibility === 'everyone').map(mapActivity);
      writeCache(mapped);
      return mapped;
    }
  }
  return readCache();
}
