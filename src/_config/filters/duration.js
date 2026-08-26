/** Recipe duration helpers (spec §9). Accept an integer of minutes OR an ISO-8601 "PT…" string, and produce two outputs:
 *   - toISODuration → normalized PT…M for dt-duration (µf2) + schema prep/cook/totalTime.
 *   - formatDuration → a human-readable string for the page and card.
 * Parse scope is hours + minutes (recipes don't need days/seconds). */

/** Parse an integer-minutes number OR a "PT#H#M" string into total minutes. */
const toMinutes = input => {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return 0;
  const match = input.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
};

/** Normalized ISO-8601 → dt-duration (µf2) + schema prep/cook/totalTime.
 * Integer minutes become PT<n>M; an already-valid PT… string passes through. */
export const toISODuration = input => {
  if (typeof input === 'number') return `PT${input}M`;
  return input;
};

/** Human-readable → the page + card ("1 hr 30 min", "55 min", "4 hr"). */
export const formatDuration = input => {
  const mins = toMinutes(input);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ');
};

/** Audio/Video itunes:duration formatter (spec §8/§9). A clock shape (unlike formatDuration): parses "PT#H#M#S" or an integer of seconds. Emits MM:SS, or H:MM:SS with hours; "" on empty/invalid. */
export const itunesDuration = input => {
  let totalSeconds = 0;
  if (typeof input === 'number') {
    totalSeconds = input;
  } else if (typeof input === 'string') {
    const match = input.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return '';
    totalSeconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  } else {
    return '';
  }
  if (!totalSeconds) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
