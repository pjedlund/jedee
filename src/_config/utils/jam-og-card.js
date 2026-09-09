import { existsSync } from 'node:fs';
import path from 'node:path';
import { slugifyString } from '../filters/slugify.js';
import { unwikilink } from '../filters/unwikilink.js';

const CARDS_DIR = 'src/assets/og-images/jams';

// The composited social card drawn by `npm run og:jams` — album art beside the title and artist. Returns its URL, or null so the head falls back to the bare square cover.
// ⚠ Generated on the laptop and committed, like the favicons: a jam added since the last run has no card until it is re-run, which is what the existsSync is for.
export const jamOgCard = slug => {
  if (!slug) return null;
  const file = `${slugifyString(slug)}.jpeg`;
  return existsSync(path.join(CARDS_DIR, file)) ? `/assets/og-images/jams/${file}` : null;
};

// A jam carries no description of its own 114 times out of 120, and the site-wide "Personal site of Johan Edlund" says nothing about the record. Build the line the card can't show: artist, year, and what it sounds like.
// The album is dropped when it just repeats the title, which is the usual case for a single-album jam.
export const jamDescription = data => {
  const artist = unwikilink(data.artist);
  if (!artist) return null;
  const album = data.album && data.album !== data.title ? ` — ${data.album}` : '';
  const year = data.year ? ` (${data.year})` : '';
  const genres = (unwikilink(data.genre) || []).filter(Boolean);
  return `${artist}${album}${year}${genres.length ? ` · ${genres.join(', ')}` : ''}`;
};
