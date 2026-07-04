/** paceOrSpeed — derive a workout's pace (min/km, foot sports) or speed (km/h,
 *  wheels/skis) from its stored raw distance + duration, at RENDER time, with the
 *  imperial equivalent alongside it. The workout post type (/activities/) stores
 *  only the recorded numbers and never the derived pace; the layout + card call
 *  this filter.
 *
 *  Usage (value-first, Nunjucks): {{ activityType | paceOrSpeed(distanceKm, seconds) }}
 *
 *  Originally copied from the retired Strava-CSV path (strava-export.js, deleted
 *  2026-07-04); the workout path owns its pace logic. */

const normalize = s => (s || '').replace(/\s+/g, '').toLowerCase();
const FOOT = new Set(['run', 'trailrun', 'walk', 'hike', 'orienteering']);
const WHEEL = new Set(['ride', 'mountainbikeride', 'gravelride', 'virtualride', 'ebikeride']);
const SKI = new Set(['nordicski', 'backcountryski', 'rollerski']);
const KM_PER_MI = 1.609344;

// m:ss from a total-seconds value, carrying a 60s rounding overflow into the
// minute (Math.round(59.6) alone would print "60" seconds).
const clock = totalSeconds => {
  let m = Math.floor(totalSeconds / 60);
  let s = Math.round(totalSeconds % 60);
  if (s === 60) { s = 0; m += 1; }
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const paceOrSpeed = (type, km, seconds) => {
  if (!km || !seconds) return '';
  const k = normalize(type);
  if (FOOT.has(k)) {
    const secPerKm = seconds / km;
    return `${clock(secPerKm)}/km (${clock(secPerKm * KM_PER_MI)}/mi)`;
  }
  if (WHEEL.has(k) || SKI.has(k)) {
    const kmh = km / (seconds / 3600);
    return `${kmh.toFixed(1)} km/h (${(kmh * KM_PER_MI).toFixed(1)} mph)`;
  }
  return '';
};
