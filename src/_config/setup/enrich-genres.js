// Fills in the `genre:` front matter of jam posts from MusicBrainz. Two phases, on purpose: `fetch` is slow (MusicBrainz allows 1 request/second) and `apply` is the part you re-run while deciding what the vocabulary should look like, so the lookups are cached to disk and never repeated. See TODO §20 and the wiki page "Genre enrichment from MusicBrainz".
//
//   node ./src/_config/setup/enrich-genres.js fetch           — populate the cache (safe to re-run; only misses cost a request)
//   node ./src/_config/setup/enrich-genres.js apply           — show what would change, write nothing
//   node ./src/_config/setup/enrich-genres.js apply --write   — write it into the .md files
//
// ⚠ Only MusicBrainz `genres` are read, never `tags`. Genres are a curated vocabulary (lowercase, deduplicated upstream); the raw tag list is where "seen live" and "favourites" live.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const CACHE = '_local/data/musicbrainz-genres.json';
const UA = 'jedee-genre-enrichment/1.0 (https://johanedlund.se; pjohanedlund@gmail.com)';
const MAX_GENRES = 3;

// MusicBrainz asks for 1 req/s and a descriptive User-Agent; going faster gets the IP throttled.
const RATE_MS = 1100;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const unwikilink = value => String(value).replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1').trim();
const asList = value => (Array.isArray(value) ? value : value ? [value] : []);
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- the two pieces worth testing ---------- */

/** Merge existing + MusicBrainz genres into the final list for one post. Existing values always survive — this enriches, it never overrules what a clip or Johan put there. Release-group genres outrank artist genres at equal vote count, because "the genre of this record" beats "the genre of everything this act ever did". */
export function pickGenres(existing, entry, max = MAX_GENRES) {
  const kept = existing.map(unwikilink).filter(Boolean);
  const seen = new Map(kept.map(name => [slug(name), name]));

  const candidates = [
    ...(entry?.releaseGenres || []).map(g => ({...g, weight: g.count + 0.5})),
    ...(entry?.artistGenres || []).map(g => ({...g, weight: g.count})),
  ].sort((a, b) => b.weight - a.weight);

  const added = [];
  for (const candidate of candidates) {
    if (kept.length + added.length >= max) break;
    // Grouping in collections.js is by slug, so "hip hop" and "hip-hop" are already one page. Matching on slug here keeps the *files* from carrying both spellings anyway.
    if (seen.has(slug(candidate.name))) continue;
    seen.set(slug(candidate.name), candidate.name);
    added.push(candidate.name);
  }

  return {genres: [...kept, ...added], added};
}

/** Replace (or insert) the `genre:` block in a post's raw text, touching nothing else. Deliberately a text edit rather than a gray-matter round-trip: re-serializing the front matter would requote every string and turn the dates into timestamps, burying the one line that changed. */
export function setGenres(text, genres) {
  const block = `genre:\n${genres.map(name => `  - "[[${name}]]"`).join('\n')}\n`;
  const bounds = text.match(/^---\n([\s\S]*?\n)---\n/);
  if (!bounds) throw new Error('no front matter');

  const front = bounds[1];
  const existing = front.match(/^genre:.*(?:\n[ \t]+.*|\n[ \t]*-.*)*\n/m);
  const updated = existing
    ? front.replace(existing[0], block)
    : // No `genre:` yet: sit it after `album:` where the clipper templates put it, else append.
      /^album:.*\n/m.test(front)
      ? front.replace(/^album:.*\n/m, match => match + block)
      : front + block;

  return text.replace(bounds[1], updated);
}

/* ---------- phase 1: fetch ---------- */

const readCache = () => (fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {});

const genresOf = doc =>
  (doc.genres || []).map(g => ({name: g.name, count: g.count})).sort((a, b) => b.count - a.count);

// ⚠ A 503 here means throttling, not a broken request — MusicBrainz returns it whenever the 1 req/s budget is exceeded, including when something *else* on this machine is querying it at the same time. Without the backoff a busy minute silently skips dozens of posts; they stay uncached, so the damage is only a re-run, but you have to notice first.
async function mb(endpoint, params, attempt = 1) {
  const url = new URL(`https://musicbrainz.org/ws/2/${endpoint}`);
  Object.entries({fmt: 'json', ...params}).forEach(([k, v]) => url.searchParams.set(k, v));
  await sleep(RATE_MS * attempt);
  const response = await fetch(url, {headers: {'User-Agent': UA}});
  if (response.status === 503 && attempt < 4) return mb(endpoint, params, attempt + 1);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

// ⚠ Searching an artist by bare name is the weak join in this script: MusicBrainz `score` is string similarity, so a *different* act with the same name scores 100. Jakob's "Solace" is post-rock, but a classical "Jakob" won the name search and put `classical` on the post. Only used when there is no release to credit the artist for us.
async function findArtistId(name, byName) {
  if (name in byName) return byName[name];
  const found = await mb('artist', {query: `artist:"${name}"`, limit: 1});
  const hit = found.artists?.[0];
  return (byName[name] = hit && hit.score >= 90 ? hit.id : null);
}

async function artistGenres(mbid, byMbid) {
  if (!mbid) return {name: null, genres: []};
  if (mbid in byMbid) return byMbid[mbid];
  const full = await mb(`artist/${mbid}`, {inc: 'genres'});
  return (byMbid[mbid] = {name: full.name, genres: genresOf(full)});
}

// Returns the credited artist alongside the genres — that MBID is authoritative, unlike a name search.
async function lookupRelease(artist, album) {
  const found = await mb('release-group', {
    query: `artist:"${artist}" AND releasegroup:"${album}"`,
    limit: 1,
  });
  const hit = found['release-groups']?.[0];
  if (!hit || hit.score < 90) return {id: null, artistMbid: null, genres: []};
  const full = await mb(`release-group/${hit.id}`, {inc: 'genres'});
  return {
    id: hit.id,
    title: full.title,
    artistMbid: hit['artist-credit']?.[0]?.artist?.id || null,
    genres: genresOf(full),
  };
}

async function runFetch(posts) {
  const cache = readCache();
  const byName = {};
  const byMbid = {};
  let requests = 0;

  for (const post of posts) {
    if (cache[post.file]) continue;
    try {
      // 20 posts (live sessions, one-off videos) have no album — the artist's own genres are all MusicBrainz can offer them, and a name search is then the only way in.
      const release = post.album
        ? await lookupRelease(post.artist, post.album)
        : {id: null, artistMbid: null, genres: []};
      const artistMbid = release.artistMbid || (await findArtistId(post.artist, byName));
      const artist = await artistGenres(artistMbid, byMbid);
      cache[post.file] = {
        artist: post.artist,
        album: post.album || null,
        // Kept so a wrong match is visible in the cache rather than only in the resulting front matter.
        matchedArtist: artist.name,
        matchedVia: release.artistMbid ? 'release-credit' : artistMbid ? 'name-search' : null,
        artistMbid,
        releaseMbid: release.id,
        artistGenres: artist.genres,
        releaseGenres: release.genres,
      };
      requests += 1;
      console.log(
        `${post.artist} — ${post.album || '(no album)'}: ` +
          `${release.genres.map(g => g.name).join(', ') || '–'} | ` +
          `${artist.genres.map(g => g.name).join(', ') || '–'}`
      );
    } catch (error) {
      console.warn(`! ${post.file}: ${error.message}`);
    }
    if (requests % 10 === 0) fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  }

  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  console.log(`\nCached ${Object.keys(cache).length} of ${posts.length} posts → ${CACHE}`);
}

/* ---------- phase 2: apply ---------- */

function runApply(posts, write) {
  const cache = readCache();
  const distribution = new Map();
  let changed = 0;

  for (const post of posts) {
    const {genres, added} = pickGenres(post.genre, cache[post.file]);
    genres.forEach(name => distribution.set(slug(name), (distribution.get(slug(name)) || 0) + 1));
    if (!added.length) continue;
    changed += 1;
    console.log(`${path.basename(post.file)}: ${post.genre.map(unwikilink).join(', ') || '—'}  +  ${added.join(', ')}`);
    if (write) fs.writeFileSync(post.file, setGenres(fs.readFileSync(post.file, 'utf8'), genres));
  }

  const sorted = [...distribution.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n${changed} posts ${write ? 'updated' : 'would change'}.`);
  console.log(`${sorted.length} distinct genres; ${sorted.filter(([, n]) => n === 1).length} of them on a single post.`);
  console.log(sorted.map(([name, n]) => `${n} ${name}`).join('\n'));
  if (!write) console.log('\nDry run — pass --write to change the files.');
}

/* ---------- entry ---------- */

// Guarded so the unit tests can import pickGenres/setGenres without scanning the posts folder or reading argv.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const posts = (await fg('src/posts/jams/**/*.md'))
    .map(file => {
      const {data} = matter(fs.readFileSync(file, 'utf8'));
      return {
        file,
        artist: data.artist ? unwikilink(data.artist) : '',
        album: data.album || '',
        genre: asList(data.genre),
      };
    })
    .filter(post => post.artist);

  const [command, ...flags] = process.argv.slice(2);
  if (command === 'fetch') await runFetch(posts);
  else if (command === 'apply') runApply(posts, flags.includes('--write'));
  else console.log('Usage: enrich-genres.js fetch | apply [--write]');
}
