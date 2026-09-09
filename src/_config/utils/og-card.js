import { existsSync } from 'node:fs';
import path from 'node:path';
import { slugifyString } from '../filters/slugify.js';
import { unwikilink } from '../filters/unwikilink.js';

const CARDS_DIR = 'src/assets/og-images';

// The composited social card drawn by `npm run og:cards` — cover art beside the title and its one line of credit. Returns the URL, or null so the head falls back to the bare artwork.
// ⚠ Generated on the laptop and committed, like the favicons: a post added since the last run has no card until it is re-run, which is what the existsSync is for.
export const ogCard = (type, slug) => {
  if (!type || !slug) return null;
  const file = `${slugifyString(slug)}.jpeg`;
  return existsSync(path.join(CARDS_DIR, type, file)) ? `/${path.join('assets/og-images', type, file)}` : null;
};

const list = value => (Array.isArray(value) ? value : [value]).filter(Boolean);
const credit = value => list(unwikilink(value)).join(', ');
const genres = data => list(unwikilink(data.genre)).join(', ');
const join = parts => parts.filter(Boolean).join(' · ');

// The line a post falls back to when it carries no `description:` of its own — the site-wide "Personal site of Johan Edlund" says nothing about a record, a film or a book.
// Each builds what its card cannot already show, from fields the posts already carry. Returns null rather than a bare fragment when there is nothing to say.
export const autoDescription = {
  // 6 of 120 jams carry a description; artist is 120/120, genre 113, year 99. The album is dropped when it merely repeats the title, which is the usual case.
  jam: data => {
    const artist = credit(data.artist);
    if (!artist) return null;
    const album = data.album && data.album !== data.title ? ` — ${data.album}` : '';
    const year = data.year ? ` (${data.year})` : '';
    return join([`${artist}${album}${year}`, genres(data)]);
  },
  // Every watching post carries a `plot` — a real sentence about the film, and better than anything composable.
  watching: data => data.plot || join([credit(data.director), data.year, genres(data)]) || null,
  // 7 of 8 reading posts already carry a description, so this is the thin case — thin enough that the author's name alone would read as a caption rather than a sentence. Author is 8/8.
  reading: data => (credit(data.author) ? join([`A book by ${credit(data.author)}`, genres(data)]) : null)
};
