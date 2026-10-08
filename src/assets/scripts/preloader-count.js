// The map preloader's count, kept apart from place-map.js so a unit test can run it without MapLibre. ⚠ Lives outside components/: every file there is built as its own script.
const COUNT = 1200; // calibration knob: a full count when the map is ready in time
const BRAKE = 0.1; // calibration knob: from here on the count slows while the map isn't ready; early, so the slowdown spreads over the whole count instead of piling up at 98–99
const LIMIT = 0.97; // where an unready count heads, just past 99, slowing ever more (power 1.5) so it keeps ticking rather than parking
const GLIDE = 150; // ms for the speed to ease to a new target, so braking and recovering are curves

export const easeInOutQuad = (p) => (p < 0.5 ? 2 * p * p : 1 - (2 - 2 * p) ** 2 / 2);

// One frame: the real load only steers the speed, never the number.
export function countStep({ p, speed }, dt, loaded) {
  const target = loaded ? 1 : Math.min(1, Math.max(0, (LIMIT - p) / (LIMIT - BRAKE)) ** 1.5);
  speed += (target - speed) * (1 - Math.exp(-dt / GLIDE));
  p = Math.min(1, p + (dt / COUNT) * speed);
  return { p, speed, n: p === 1 ? 100 : Math.min(99, Math.floor(easeInOutQuad(p) * 100)) };
}
