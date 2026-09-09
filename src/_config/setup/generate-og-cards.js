// Draws the composited Open Graph card for the artwork-bearing post types — cover beside the title and its one line of credit, filling a proper 1200x630. Run: npm run og:cards [type] [slug…]
// ⚠ Chrome renders it, like generate-og-default.js and unlike the SVG per-post cards, so this repo's woff2s are the fonts in the picture and nothing has to be installed.
// Without this, a shared jam previews as the bare square cover (src/_config/utils/og-image.js) — correct, but a small tile in a feed built for a wide card.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import matter from 'gray-matter';
import { author, pathToSvgLogo } from '../../_data/meta.js';
import { unwikilink } from '../filters/unwikilink.js';
import { slugifyString } from '../filters/slugify.js';

const SITE_DOMAIN = new URL(author.website).hostname;

// One layout, three types: only the eyebrow and the line under the title differ. A jam's cover is square, a poster and a book cover are portrait — the art is sized by HEIGHT so all three sit in the same 438px band.
const TYPES = {
  jam: {dir: 'src/posts/jams', eyebrow: 'Listening to', credit: data => data.artist},
  watching: {dir: 'src/posts/watching', eyebrow: 'Watching', credit: data => [data.director, data.year].flat().filter(Boolean)},
  reading: {dir: 'src/posts/reading', eyebrow: 'Reading', credit: data => data.author}
};

const PAPER = '#F4F4F2';
const INK = '#495464';
const MUTED = '#bbbfca';

const chromePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fontUri = p => `data:font/woff2;base64,${fs.readFileSync(p).toString('base64')}`;

const logo = fs.readFileSync(pathToSvgLogo, 'utf8');
const markPath = logo.match(/\sd="([^"]+)"/)[1];
const markColor = logo.match(/<svg[^>]*\sfill="([^"]+)"/)?.[1];
if (!markColor) throw new Error(`${pathToSvgLogo}: no fill on the root <svg> — the card's accent is derived from it.`);

const mark = (size, color, opacity = 1) =>
  `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" aria-hidden="true"><path d="${markPath}"/></svg>`;

const escape = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// ⚠ The site's own slugify filter, not a mirror of it: the filename is the key on both sides, and a hand-rolled copy drifts the moment a title contains a colon or an ampersand.

// ⚠ Inlined as a data: URI, never a file:// or remote src. A setContent document has no origin, so a file:// image fails silently and the card ships with a blank square — the same trap as the fonts.
const coverUri = async cover => {
  if (cover.startsWith('/')) {
    const local = path.join('src', cover.replace(/^\//, ''));
    const type = path.extname(local).slice(1).replace('jpg', 'jpeg') || 'jpeg';
    return `data:image/${type};base64,${fs.readFileSync(local).toString('base64')}`;
  }
  const res = await fetch(cover);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const type = res.headers.get('content-type') || 'image/jpeg';
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
};

const cardHtml = (post, cover, type) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Source Serif'; font-weight: 700; src: url('${fontUri('src/assets/fonts/source-serif/source-serif.woff2')}') format('woff2'); }
  @font-face { font-family: 'Source Sans'; font-weight: 100 1000; src: url('${fontUri('src/assets/fonts/source-sans/source-sans.woff2')}') format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${PAPER}; display: flex; align-items: center; gap: 72px; padding: 96px; overflow: hidden; position: relative; }
  /* Sized by height, not width: a square album cover comes out 438x438 and a 2:3 poster or book cover 292x438, so every type sits in the same band without letterboxing. */
  .art { height: 438px; width: auto; max-width: 438px; flex: none; border-radius: 6px; object-fit: cover; box-shadow: 0 18px 40px rgb(73 84 100 / 0.22); }
  .text { min-width: 0; }
  .eyebrow { font-family: 'Source Sans', Arial, sans-serif; font-weight: 600; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; color: ${markColor}; margin-block-end: 18px; }
  /* 700 / -1 tracking is the per-post card's title treatment; 56px rather than its 80 because a title shares this card with an artist and a cover. */
  h1 { font-family: 'Source Serif', Georgia, serif; font-weight: 700; font-size: 56px; line-height: 1.12; letter-spacing: -1px; color: ${INK};
       display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  .artist { font-family: 'Source Sans', Arial, sans-serif; font-weight: 400; font-size: 32px; line-height: 1.3; color: ${INK}; opacity: 0.75; margin-block-start: 20px;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .sig { position: absolute; inset-block-end: 38px; inset-inline-end: 96px; display: flex; align-items: center; gap: 12px;
         font-family: 'Source Sans', Arial, sans-serif; font-weight: 600; font-size: 22px; letter-spacing: -0.5px; color: ${MUTED}; }
  .sig svg { display: block; }
</style></head><body>
  <img class="art" src="${cover}" alt="">
  <div class="text">
    <div class="eyebrow">${TYPES[type].eyebrow}</div>
    <h1>${escape(post.title)}</h1>
    ${creditLine(post, type) ? `<p class="artist">${escape(creditLine(post, type))}</p>` : ''}
  </div>
  <div class="sig">${mark(26, markColor)}<span>${SITE_DOMAIN}</span></div>
</body></html>`;

// The line under the title: artist, or director and year, or author. Arrays (they are wikilinks) join with a comma.
const creditLine = (post, type) => {
  const value = TYPES[type].credit(post);
  return (Array.isArray(value) ? value : [value]).filter(Boolean).map(v => unwikilink(String(v))).join(', ');
};

const [maybeType, ...only] = process.argv.slice(2);
const types = TYPES[maybeType] ? [maybeType] : Object.keys(TYPES);
if (maybeType && !TYPES[maybeType]) only.unshift(maybeType);

const posts = types.flatMap(type =>
  fs
    .readdirSync(TYPES[type].dir, {recursive: true})
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const file = path.join(TYPES[type].dir, f);
      const {data} = matter(fs.readFileSync(file, 'utf8'));
      return {file, type, ...data, slug: slugifyString(data.slug || path.basename(file, '.md'))};
    })
    .filter(post => post.cover && (!only.length || only.includes(post.slug)))
);

if (!posts.length) throw new Error(only.length ? `Nothing matched: ${only.join(', ')}` : 'No posts with a cover.');

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });
const page = await browser.newPage();
// Shot at 2x and resized down, so the type is crisp at the 1200x630 every platform expects.
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
types.forEach(type => fs.mkdirSync(path.join('src/assets/og-images', type), { recursive: true }));

let written = 0;
const skipped = [];
for (const post of posts) {
  let cover;
  try {
    cover = await coverUri(post.cover);
  } catch (error) {
    // A dead cover means no composited card; the page falls back to the bare artwork, then to the default. Never abort the run over one post.
    skipped.push(`${post.slug} (${error.message})`);
    continue;
  }
  await page.setContent(cardHtml(post, cover, post.type), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // ⚠ A card silently set in a system fallback, or with a blank square where the art should be, is a valid JPEG that is simply wrong. Assert both before shooting.
  const bad = await page.evaluate(() => {
    const missing = ['Source Serif', 'Source Sans'].filter(f => ![...document.fonts].some(ff => ff.family === f && ff.status === 'loaded'));
    const art = document.querySelector('.art');
    if (!art.complete || !art.naturalWidth) missing.push('the cover image');
    return missing;
  });
  if (bad.length) throw new Error(`${post.slug}: never loaded — ${bad.join(', ')}. The card would ship wrong.`);

  const shot = await page.screenshot({ type: 'png' });
  await sharp(shot).resize(1200, 630).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(path.join('src/assets/og-images', post.type, `${post.slug}.jpeg`));
  written++;
}
await browser.close();

console.log(`Wrote ${written} card${written === 1 ? '' : 's'} for ${types.join(', ')} — 1200x630 each.`);
if (skipped.length) console.log(`⚠ Skipped ${skipped.length} (cover unreachable): ${skipped.join(', ')}`);
