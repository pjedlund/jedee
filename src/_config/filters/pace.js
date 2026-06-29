/** paceOrSpeed — derive a workout's pace (min/km, foot sports) or speed (km/h,
 *  wheels/skis) from its stored raw distance + duration, at RENDER time. The
 *  workout post type (/training/) stores only the recorded numbers and never the
 *  derived pace; the layout + card call this filter.
 *
 *  Usage (value-first, Nunjucks): {{ activityType | paceOrSpeed(distanceKm, seconds) }}
 *
 *  ponytail: a self-contained copy of the same logic strava-export.js carries.
 *  That file is parked for deletion with the rest of the Strava-CSV path, so the
 *  workout path owns its pace logic rather than importing from death-row code.
 *  When the CSV path is retired, this stays. */

const normalize = s => (s || '').replace(/\s+/g, '').toLowerCase();
const FOOT = new Set(['run', 'trailrun', 'walk', 'hike', 'orienteering']);
const WHEEL = new Set(['ride', 'mountainbikeride', 'gravelride', 'virtualride', 'ebikeride']);
const SKI = new Set(['nordicski', 'backcountryski', 'rollerski']);

export const paceOrSpeed = (type, km, seconds) => {
  if (!km || !seconds) return '';
  const k = normalize(type);
  if (FOOT.has(k)) {
    const secPerKm = seconds / km;
    return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}/km`;
  }
  if (WHEEL.has(k) || SKI.has(k)) return `${(km / (seconds / 3600)).toFixed(1)} km/h`;
  return '';
};
