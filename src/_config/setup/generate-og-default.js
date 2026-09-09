// Draws the fallback Open Graph card — the image every page that is NOT an article shares. Run: npm run og:default
// ⚠ Chrome renders it, not sharp/resvg, so the woff2s in this repo are the fonts in the picture. The per-post cards in src/common/og-images.njk go the other way and need Source Serif 4 / Source Sans 3 INSTALLED, which is the silent-fallback trap on the wiki page "Open Graph images".
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { siteName, author, pathToSvgLogo, opengraph_default } from '../../_data/meta.js';

// The landing page's own second sentence. Mirrored rather than parsed — the h1 and intro live in content, not in meta.
const TAGLINE = 'I design and build for the web from Malmö, Sweden.';

// ⚠ NOT meta.domain — that is derived from meta.url, which is `http://localhost:8080` unless URL is set, so a local run stamped the card "localhost". author.website is the hardcoded canonical.
const SITE_DOMAIN = new URL(author.website).hostname;

// The per-post cards' palette (src/common/og-images.njk front matter), so the fallback sits in the same set.
const PAPER = '#F4F4F2';
const INK = '#495464';
const MUTED = '#bbbfca';

const OUT = path.join('src', opengraph_default.replace(/^\//, ''));
const chromePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// ⚠ Inlined as data: URIs, not file:// URLs. A setContent document has no file origin, so a file:// @font-face src fails silently — FontFace.status comes back 'error' and the card renders in Georgia/Arial. The two subset woff2s are ~76 kB together, so inlining costs nothing.
const fontUri = p => `data:font/woff2;base64,${fs.readFileSync(p).toString('base64')}`;

// The mark's own fill is the single source of truth for the brand color, same as generate-favicons.js. ⚠
const logo = fs.readFileSync(pathToSvgLogo, 'utf8');
const markPath = logo.match(/\sd="([^"]+)"/)[1];
const markColor = logo.match(/<svg[^>]*\sfill="([^"]+)"/)?.[1];
if (!markColor) throw new Error(`${pathToSvgLogo}: no fill on the root <svg> — the card's accent is derived from it.`);

const mark = (size, color, opacity = 1) =>
  `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" aria-hidden="true"><path d="${markPath}"/></svg>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Source Serif'; font-weight: 700; src: url('${fontUri('src/assets/fonts/source-serif/source-serif.woff2')}') format('woff2'); }
  @font-face { font-family: 'Source Sans'; font-weight: 100 1000; src: url('${fontUri('src/assets/fonts/source-sans/source-sans.woff2')}') format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${PAPER}; position: relative; overflow: hidden; }
  /* The site's own mark as the ground, where Eleventy Excellent's template puts its star. Bled off two edges so it reads as texture rather than a second logo. */
  .watermark { position: absolute; inset-block-start: 96px; inset-inline-end: 96px; line-height: 0; }
  .content { position: absolute; inset-block-start: 200px; inset-inline-start: 160px; }
  /* 80px / 700 / -1 tracking is the per-post card's title treatment, so a shared link and a shared post look like the same site. */
  h1 { font-family: 'Source Serif', Georgia, serif; font-weight: 700; font-size: 80px; line-height: 1.1; letter-spacing: -1px; color: ${INK}; }
  p { font-family: 'Source Sans', Arial, sans-serif; font-weight: 400; font-size: 30px; line-height: 1.4; color: ${INK}; opacity: 0.75; margin-block-start: 18px; max-width: 760px; }
  /* Bottom-right signature, on the per-post card's own baseline (y=580) and right edge. */
  .sig { position: absolute; inset-block-end: 38px; inset-inline-end: 160px; display: flex; align-items: center; gap: 12px;
         font-family: 'Source Sans', Arial, sans-serif; font-weight: 600; font-size: 22px; letter-spacing: -0.5px; color: ${MUTED}; }
  .sig svg { display: block; }
</style></head><body>
  <div class="watermark">${mark(438, markColor, 0.1)}</div>
  <div class="content">
    <h1>${siteName}</h1>
    <p>${TAGLINE}</p>
  </div>
  <div class="sig">${mark(26, markColor)}<span>${SITE_DOMAIN}</span></div>
</body></html>`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });
const page = await browser.newPage();
// Shot at 2x and resized down, so the type is crisp at the 1200x630 every platform expects.
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// ⚠ A card silently set in a system fallback is a valid JPEG that is simply wrong — the failure mode this file exists to avoid. Assert both faces actually loaded.
const missing = await page.evaluate(() =>
  ['Source Serif', 'Source Sans'].filter(f => ![...document.fonts].some(ff => ff.family === f && ff.status === 'loaded'))
);
if (missing.length) throw new Error(`Font(s) never loaded: ${missing.join(', ')} — the card would ship set in a system fallback.`);

const shot = await page.screenshot({ type: 'png' });
await browser.close();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await sharp(shot).resize(1200, 630).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(OUT);
console.log(`Wrote ${OUT} — 1200x630, ${(fs.statSync(OUT).size / 1024).toFixed(0)} kB`);
console.log(`⚠ meta.opengraph_default_alt must still describe it: "${siteName} — personal website"`);
console.log('⚠ This is the fallback for every page that is NOT an article — see the wiki "Open Graph images".');
