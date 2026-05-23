/** Recipe duration helpers (spec §9). Accept an integer number of minutes OR an
 *  ISO-8601 "PT…" string, and produce two outputs from the one input:
 *    - toISODuration → a normalized PT…M for dt-duration (µf2) and schema
 *      prepTime/cookTime/totalTime.
 *    - formatDuration → a human-readable string for the page and card.
 *  No duration helper existed before this — dates.js holds only toISOString /
 *  formatDate, and Audio's itunes:duration formatter is a different (HH:MM:SS)
 *  shape. Parse scope is hours + minutes (recipes don't need days/seconds). */

/** Parse an integer-minutes number OR a "PT#H#M" string into total minutes. */
const toMinutes = input => {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return 0;
  const match = input.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
};

/** Normalized ISO-8601 → dt-duration (µf2) + schema prep/cook/totalTime.
 *  Integer minutes become PT<n>M; an already-valid PT… string passes through. */
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
