// Pace (foot sports) or speed (wheels, skis) from an activity's stored distance + duration, with the imperial figure alongside. Derived at render; never stored.
// Usage: {{ activityType | paceOrSpeed(distanceKm, seconds) }}

const normalize = s => (s || '').replace(/\s+/g, '').toLowerCase();
const FOOT = new Set(['run', 'trailrun', 'walk', 'hike', 'orienteering']);
const WHEEL = new Set(['ride', 'mountainbikeride', 'gravelride', 'virtualride', 'ebikeride']);
const SKI = new Set(['nordicski', 'backcountryski', 'rollerski']);
const KM_PER_MI = 1.609344;

// m:ss from a total-seconds value, carrying a 60s rounding overflow into the minute (Math.round(59.6) alone would print "60" seconds).
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
    return `${kmh.toFixed(1)}\u00a0km/h (${(kmh * KM_PER_MI).toFixed(1)}\u00a0mph)`;
  }
  return '';
};

// The activities table's pace: bare m:ss per km, foot sports only, since the column head carries the unit.
export const pace = (type, km, seconds) => (km && seconds && FOOT.has(normalize(type)) ? clock(seconds / km) : '');
