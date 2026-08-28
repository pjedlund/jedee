// Builds the one-line descriptions shown on /jams/genres/<slug>/ from Wikipedia. Companion to enrich-genres.js, which fills the `genre:` front matter itself from MusicBrainz. See TODO §20.
//
//   node ./src/_config/setup/genre-descriptions.js fetch           — populate the cache (safe to re-run; only misses cost a request)
//   node ./src/_config/setup/genre-descriptions.js build           — show what the data file would contain, write nothing
//   node ./src/_config/setup/genre-descriptions.js build --write   — write src/_data/genreDescriptions.json
//
// ⚠ MusicBrainz is NOT a source here — its genre entities are name-only (2 of 100 sampled carried even a short disambiguation) and its genre search endpoint is unimplemented.
// ⚠ Wikipedia text is CC BY-SA, so every description ships with a visible link to its article. Dropping the link makes the page a licence violation, not just impolite — see partials/genre-description.njk.

import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const CACHE = '_local/data/wikipedia-genres.json';
const DATA = 'src/_data/genreDescriptions.json';
const UA = 'jedee-genre-descriptions/1.0 (https://johanedlund.se; pjohanedlund@gmail.com)';
const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

// Wikipedia's REST API has no published per-second limit, but it asks for a descriptive User-Agent and no hammering.
const RATE_MS = 200;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const unwikilink = value => String(value).replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1').trim();
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The curated half of this script — a genre name is not a Wikipedia title, and the gap is not guessable. A string forces the article to use; `{text}` is a description written here instead of taken from Wikipedia (no source link, so keep the words your own); `null` means the value deliberately gets no description. ⚠ Without these, `country` describes a political entity, `americana` describes historical artifacts and `noise` describes unwanted sound. Delete a slug here and re-run `fetch` to reconsider it.
const OVERRIDES = {
  country: 'Country music',
  americana: 'Americana music',
  noise: 'Noise music',
  experimental: 'Experimental music',
  psychedelic: 'Psychedelic music',
  idm: 'Intelligent dance music',
  doom: 'Doom metal',
  'romantic-era': 'Romantic music',
  'baroque-era': 'Baroque music',
  'modern-dancehall': 'Dancehall',
  'post-black-metal': 'Blackgaze',
  // Written here because Wikipedia's lead sentence is a list of ancestors, not a description of the sound.
  'math-rock': {
    text: 'Math-rock deconstructs traditional rhythmic patterns with odd time signatures and polyrhythms.',
  },
  // Not genres at all — leftovers from the Apple Music and Bandcamp imports, kept only because posts still carry them.
  contemporary: null,
  worldwide: null,
  filth: null,
  // Real musical things, but an instrument and a texture rather than genres; the articles describe the wrong subject.
  violin: null,
  'solo-instrumental': null,
  // No article under any name the search will accept.
  'dark-jazz': null,
};

/** Does this read like an article about music? An exact title match is NOT enough on its own — "noise" matches the acoustics article exactly. Used as a review flag, never as a silent filter: a genre whose description trips this is reported at every build until it is overridden or accepted. */
export function looksMusical(description) {
  return /\b(music|musical|genre|subgenre|rock|jazz|metal|punk|hip.hop|band|song|album|dance)\b/i.test(
    description || ''
  );
}

/* ---------- the pieces worth testing ---------- */

/** Wikipedia titles to try for one genre, best first. A bare genre name often lands on a disambiguation page or an unrelated article ("filth" is a novel, "dance" is the activity); "<name> music" is what disambiguates most of them. */
export function candidateTitles(genre) {
  const base = genre.trim();
  return [...new Set([base, `${base} music`, `${base} (music)`, `${base} (genre)`])];
}

/** The lead sentence of the extract — a full paragraph is too much under a heading. Abbreviations would break a naive split, so only a period followed by a space and a capital ends a sentence; a very short lead (a stub like "Drone is a genre.") takes the second sentence too. */
export function firstSentence(extract) {
  if (!extract) return '';
  const sentences = extract.replace(/\s+/g, ' ').trim().split(/(?<=\.)\s+(?=[A-Z])/);
  const lead = sentences[0] || '';
  return lead.length < 60 && sentences[1] ? `${lead} ${sentences[1]}` : lead;
}

/** Did the article we landed on actually correspond to the genre we asked about? A summary lookup follows redirects, so "contemporary" quietly resolves to "Contemporary history" and "orchestral" to "Orchestra" — both perfectly valid articles about the wrong thing. Anything that is not an exact match (allowing the " music" / "(music)" / "(genre)" variants and the hyphen-vs-space drift) is reported for review rather than trusted. */
export function isExactMatch(genre, title) {
  const wanted = candidateTitles(genre).map(slug);
  return wanted.includes(slug(title));
}

/** Decide what a lookup produced. A disambiguation page is a MISS, not a description — that is the guard that keeps "filth" and "worldwide" (both junk left in the vocabulary) from getting an authoritative-looking blurb. */
export function readSummary(payload) {
  if (!payload || payload.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
  if (payload.type === 'disambiguation') return null;
  const description = firstSentence(payload.extract);
  if (!description) return null;
  return {
    title: payload.title,
    description,
    url: payload.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(payload.title)}`,
  };
}

/* ---------- genres in use ---------- */

async function genresInUse() {
  const found = new Map();
  for (const file of await fg('src/posts/jams/**/*.md')) {
    const {data} = matter(fs.readFileSync(file, 'utf8'));
    const values = Array.isArray(data.genre) ? data.genre : data.genre ? [data.genre] : [];
    values.map(unwikilink).filter(Boolean).forEach(name => {
      const key = slug(name);
      found.set(key, {slug: key, name: found.get(key)?.name || name, count: (found.get(key)?.count || 0) + 1});
    });
  }
  return [...found.values()].sort((a, b) => b.count - a.count);
}

/* ---------- fetch ---------- */

const readCache = () => (fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {});

async function searchTitle(genre) {
  await sleep(RATE_MS);
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(genre)}&limit=3`;
  const response = await fetch(url, {headers: {'User-Agent': UA}});
  if (!response.ok) return null;
  const {pages = []} = await response.json();
  return pages.map(page => page.title).find(title => isExactMatch(genre, title)) || null;
}

async function runFetch(genres) {
  const cache = readCache();

  for (const genre of genres) {
    if (cache[genre.slug]) continue;
    let result = null;
    const tried = [];

    if (OVERRIDES[genre.slug]?.text) {
      cache[genre.slug] = {name: genre.name, count: genre.count, exact: true, own: true, description: OVERRIDES[genre.slug].text};
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
      console.log(`✎ ${genre.name} (described here, not from Wikipedia)`);
      continue;
    }

    if (genre.slug in OVERRIDES && OVERRIDES[genre.slug] === null) {
      cache[genre.slug] = {name: genre.name, count: genre.count, skipped: true};
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
      console.log(`– ${genre.name} (no description by choice)`);
      continue;
    }

    // Article titles are case-sensitive after the first letter, so a lowercase genre never matches "Contemporary R&B". The title search is the only way to recover those — but it happily answers "dark jazz" with "Dark Ozz", so its answer is used ONLY when it matches the genre exactly.
    const searched = OVERRIDES[genre.slug] ? null : await searchTitle(genre.name);
    const titles = OVERRIDES[genre.slug]
      ? [OVERRIDES[genre.slug]]
      : [...candidateTitles(genre.name), ...(searched ? [searched] : [])];
    for (const title of titles) {
      await sleep(RATE_MS);
      const response = await fetch(SUMMARY + encodeURIComponent(title), {headers: {'User-Agent': UA}});
      const payload = response.ok || response.status === 404 ? await response.json() : null;
      tried.push({title, type: payload?.type || `HTTP ${response.status}`});
      result = readSummary(payload);
      if (result) break;
    }

    const exact = result ? OVERRIDES[genre.slug] === result.title || isExactMatch(genre.name, result.title) : false;
    cache[genre.slug] = {name: genre.name, count: genre.count, exact, tried, ...(result || {})};
    console.log(
      `${result ? (exact ? '✓' : '?') : '✗'} ${genre.name}` +
        (result ? ` → ${result.title}` : ` (${tried.map(t => t.type).join(', ')})`)
    );
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  }

  const hits = Object.values(cache).filter(entry => entry.description).length;
  console.log(`\n${hits} of ${Object.keys(cache).length} genres described → ${CACHE}`);
}

/* ---------- build ---------- */

function runBuild(genres, write) {
  const cache = readCache();
  const data = {};
  const missing = [];
  const review = [];

  for (const genre of genres) {
    const entry = cache[genre.slug];
    if (!entry?.description) {
      if (!entry?.skipped) missing.push(genre);
      continue;
    }
    data[genre.slug] = entry.own
      ? {description: entry.description}
      : {description: entry.description, source: entry.url, sourceTitle: entry.title};
    // Two independent ways a description can be about the wrong subject: a redirect took us elsewhere, or the title matched but the article isn't musical. Either one wants eyes.
    if (!entry.exact || !looksMusical(entry.description)) review.push({genre, entry});
  }

  console.log(`${Object.keys(data).length} described, ${missing.length} with no article found.`);
  missing.forEach(genre => console.log(`  ✗ ${genre.name} (${genre.count} ${genre.count === 1 ? 'jam' : 'jams'})`));

  if (review.length) {
    console.log(`\n${review.length} to check — add a title to OVERRIDES to correct one, or null to drop it:`);
    review.forEach(({genre, entry}) =>
      console.log(
        `  ? ${genre.name} (${genre.count}) → ${entry.title}` +
          `${looksMusical(entry.description) ? '' : ' [not about music]'}: ${entry.description.slice(0, 90)}`
      )
    );
  }

  if (write) {
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
    console.log(`\nWrote ${DATA}`);
  } else {
    console.log('\nDry run — pass --write to update the data file.');
  }
}

/* ---------- entry ---------- */

// Guarded so the unit tests can import the helpers without hitting the network or reading argv.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const genres = await genresInUse();
  const [command, ...flags] = process.argv.slice(2);
  if (command === 'fetch') await runFetch(genres);
  else if (command === 'build') runBuild(genres, flags.includes('--write'));
  else console.log('Usage: genre-descriptions.js fetch | build [--write]');
}
