// Compares two builds of the site: node tests/compare-builds.mjs <before> <after> [--shots] [--allowed file] [--sample file]
// Addresses: every page, feed and text file (including _redirects and _headers) in <before> must exist in <after>, and nothing new may appear. Markup: the HTML must match once scripts (JSON-LD kept), styles and a few moving parts are removed. Text files: feeds, sitemap, manifest, search index and redirects must match as written. Pictures (--shots): the sample pages are photographed in both builds and compared pixel by pixel.
// tests/compare-allowed.json declares the intended differences: {"added": [{path, reason}], "changed": [{path, reason}]}, plus an optional "removed". A "changed" path is excused for markup, text and pictures. Every allowance used is printed.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { launchArgs } from '../src/wiki/_sources/serve-mockups.js';

const here = import.meta.dirname;
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const flagValue = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const valueArgs = new Set(['--allowed', '--sample'].flatMap(name => (args.includes(name) ? [args.indexOf(name) + 1] : [])));
const [beforeDir, afterDir] = args.filter((arg, i) => !arg.startsWith('--') && !valueArgs.has(i)).map(dir => path.resolve(dir));
if (!beforeDir || !afterDir) {
  console.error('Usage: node tests/compare-builds.mjs <before> <after> [--shots] [--allowed file] [--sample file]');
  process.exit(2);
}

const allowedFile = path.resolve(flagValue('--allowed') || path.join(here, 'compare-allowed.json'));
const allowed = existsSync(allowedFile) ? JSON.parse(readFileSync(allowedFile, 'utf8')) : {};
// A path may be written as a page address ("/notes/") or as a file ("notes/index.html"); both are stored as the address.
const canon = p => `/${p}`.replace(/^\/+/, '/').replace(/index\.html$/, '');
const allowance = kind => new Map((allowed[kind] || []).map(({ path: p, reason }) => [canon(p), reason]));
const allowedAdded = allowance('added');
const allowedChanged = allowance('changed');
const allowedRemoved = allowance('removed');
const used = [];
const useAllowance = (kind, p, reason) => used.push(`${kind}: ${p} (${reason})`);

const failures = [];
const fail = text => failures.push(text);

// --- addresses
const addressTypes = new Set(['.html', '.xml', '.json', '.txt', '.webmanifest']);
const addressNames = new Set(['_redirects', '_headers']);
function addresses(dir) {
  const found = [];
  const walk = sub => {
    for (const entry of readdirSync(path.join(dir, sub), { withFileTypes: true })) {
      const rel = path.posix.join(sub, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (addressTypes.has(path.extname(entry.name)) || addressNames.has(entry.name)) found.push(rel);
    }
  };
  walk('');
  return new Set(found);
}
const before = addresses(beforeDir);
const after = addresses(afterDir);
const missing = [...before].filter(p => !after.has(p)).sort();
const added = [...after].filter(p => !before.has(p)).sort();

for (const p of missing) {
  if (allowedRemoved.has(canon(p))) useAllowance('removed', p, allowedRemoved.get(canon(p)));
  else fail(`missing from the new build: ${p}`);
}
for (const p of added) {
  if (allowedAdded.has(canon(p))) useAllowance('added', p, allowedAdded.get(canon(p)));
  else fail(`added in the new build: ${p}`);
}

// --- markup
// ⚠ Every rule here hides a difference: add one only for something that moves on its own between two builds of the same code.
function normalise(html) {
  return html
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, '$1$2')
    .replace(/(<script\b([^>]*)>)([\s\S]*?)(<\/script>)/gi, (all, open, attrs, body, close) => (/application\/ld\+json/i.test(attrs) ? all : `${open}${close}`))
    .replace(/\/bundle\/[\w-]+\.(css|js)/g, '/bundle/HASH.$1')
    .replace(/\/commit\/[0-9a-f]{40}/g, '/commit/HASH')
    .replace(/(Revised <time\b)[^>]*>[^<]*(<\/time>)/g, '$1>$2')
    .replace(/(All glory to God, )\d{4}/g, '$1YEAR')
    .replace(/\s+/g, ' ')
    .trim();
}

// Trims what the two share at each end and shows what is left of the difference.
function shortDiff(a, b) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const clip = text => (text.length > 160 ? `${text.slice(0, 160)}…` : text) || '(nothing)';
  const lead = a.slice(Math.max(0, start - 40), start);
  return `  ...${lead}\n  - ${clip(a.slice(start, endA))}\n  + ${clip(b.slice(start, endB))}`;
}

const markupDiffs = [];
for (const p of [...before].filter(p => p.endsWith('.html') && after.has(p)).sort()) {
  const a = normalise(readFileSync(path.join(beforeDir, p), 'utf8'));
  const b = normalise(readFileSync(path.join(afterDir, p), 'utf8'));
  if (a === b) continue;
  if (allowedChanged.has(canon(p))) useAllowance('changed markup', p, allowedChanged.get(canon(p)));
  else markupDiffs.push({ p, diff: shortDiff(a, b) });
}
if (markupDiffs.length) {
  fail(`${markupDiffs.length} page(s) with different markup. First ${Math.min(20, markupDiffs.length)}:\n${markupDiffs.slice(0, 20).map(({ p, diff }) => `${p}\n${diff}`).join('\n')}`);
}

// --- text files
// Compared exactly as written: nothing in them moves between two builds of the same code. ⚠ Add a rule only for a stamp that does (a feed's updated date, say); today none is needed.
const textDiffs = [];
for (const p of [...before].filter(p => !p.endsWith('.html') && after.has(p)).sort()) {
  const a = readFileSync(path.join(beforeDir, p), 'utf8');
  const b = readFileSync(path.join(afterDir, p), 'utf8');
  if (a === b) continue;
  if (allowedChanged.has(canon(p))) useAllowance('changed text', p, allowedChanged.get(canon(p)));
  else textDiffs.push({ p, diff: shortDiff(a, b) });
}
if (textDiffs.length) {
  fail(`${textDiffs.length} feed or text file(s) with different content. First ${Math.min(20, textDiffs.length)}:\n${textDiffs.slice(0, 20).map(({ p, diff }) => `${p}\n${diff}`).join('\n')}`);
}

// --- the menu must be in the builds
// ⚠ Production hides the main menu and Featured. A build made without SHOW_HIDDEN=1 (npm run rebuild sets it) would compare nothing there, so it fails here instead.
for (const [name, dir] of [['old', beforeDir], ['new', afterDir]]) {
  const home = path.join(dir, 'index.html');
  if (!existsSync(home) || !readFileSync(home, 'utf8').includes('id="mainnav"')) fail(`the ${name} build's home page has no id="mainnav": rebuild with SHOW_HIDDEN=1 BUILD_DRAFTS=1 (npm run rebuild does)`);
}

// --- pictures
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' };

// A plain file server for one build folder, like Netlify's: a folder address serves its index.html.
async function serveFolder(dir) {
  const server = createServer((req, res) => {
    let file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(dir) || !existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const maxHeight = 6000;
const channelTolerance = 16;
const failAbove = 0.001;
// ⚠ A small change on a tall page (a menu label, a colour on one button) is a tiny share of all pixels, so a patch of this size with this many changed pixels fails on its own.
const patchSize = 48;
const patchLimit = 40;

async function photograph(browser, base, p, width, scheme) {
  const page = await browser.newPage();
  try {
    await page.bringToFront();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    const response = await page.goto(`${base}${p}`, { waitUntil: 'networkidle0', timeout: 60000 });
    if (!response || response.status() !== 200) return { error: `status ${response?.status()}` };
    // ⚠ Reduced motion leaves some loops running (the map's loading spinner), so every animation is jumped to its end state and held there. ⚠ Maps (canvas and their counting preloader) are hidden: they draw live remote tiles, so no two shots match.
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0.001s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition: none !important; } .place-map-preloader, canvas { visibility: hidden !important; }' });
    // ⚠ A full-page capture stitches strips together and repeats sticky headers, so the window is made as tall as the page instead. Lazy images are made eager so both builds load the same ones.
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(img => (img.loading = 'eager')));
    const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), maxHeight);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(img => !img.complete).map(img => new Promise(done => { img.onload = img.onerror = done; })));
      await new Promise(done => setTimeout(done, 300));
    });
    return { png: await page.screenshot() };
  } finally {
    await page.close();
  }
}

async function comparePixels(a, b, diffFile) {
  const [left, right] = await Promise.all([a, b].map(png => sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const { width: w1, height: h1, channels } = left.info;
  const { width: w2, height: h2 } = right.info;
  if (w1 !== w2 || h1 !== h2) return { share: 1, note: `different size: ${w1}x${h1} against ${w2}x${h2}` };
  const diff = Buffer.from(left.data);
  let count = 0;
  const patches = new Map();
  for (let i = 0; i < left.data.length; i += channels) {
    let worst = 0;
    for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(left.data[i + c] - right.data[i + c]));
    if (worst > channelTolerance) {
      count++;
      const pixel = i / channels;
      const key = `${Math.floor((pixel % w1) / patchSize)},${Math.floor(pixel / w1 / patchSize)}`;
      patches.set(key, (patches.get(key) || 0) + 1);
      diff[i] = 255;
      diff[i + 1] = 0;
      diff[i + 2] = 0;
      diff[i + 3] = 255;
    } else {
      diff[i + 3] = 90;
    }
  }
  if (count) {
    mkdirSync(path.dirname(diffFile), { recursive: true });
    await sharp(diff, { raw: { width: w1, height: h1, channels } }).png().toFile(diffFile);
  }
  const dense = [...patches].filter(([, n]) => n >= patchLimit).map(([key]) => key.split(',').map(n => n * patchSize));
  return { share: count / (w1 * h1), dense };
}

if (args.includes('--shots')) {
  const sampleFile = path.resolve(flagValue('--sample') || path.join(here, 'compare-sample.json'));
  const sample = JSON.parse(readFileSync(sampleFile, 'utf8'));
  // puppeteer arrives transitively under pa11y-ci and hunts for its own pinned build — point it at an installed Chrome, same as shoot-mockups.js.
  const executablePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const [serverBefore, serverAfter] = await Promise.all([serveFolder(beforeDir), serveFolder(afterDir)]);
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: launchArgs });
  const jobs = sample.flatMap(({ path: p }) => [1400, 390].flatMap(width => ['light', 'dark'].map(scheme => ({ p, width, scheme }))));
  const outDir = path.join(root, '_local/compare');
  const results = [];

  // Returns what's wrong with one view, or nothing if the two builds match.
  const shootAndCompare = async (p, width, scheme, slug) => {
    try {
      // ⚠ One page at a time: tabs open side by side get painted in strips and come out garbled.
      const a = await photograph(browser, serverBefore.base, p, width, scheme);
      const b = await photograph(browser, serverAfter.base, p, width, scheme);
      if (a.error || b.error) return `could not load (before: ${a.error ?? 'ok'}, after: ${b.error ?? 'ok'})`;
      const { share, note, dense = [] } = await comparePixels(a.png, b.png, path.join(outDir, `${slug}.png`));
      if (share > failAbove || dense.length) return `${note ?? `${(share * 100).toFixed(3)}% of pixels differ${dense.length ? `, ${dense.length} dense patch(es), first at x ${dense[0][0]} y ${dense[0][1]}` : ''}`}; diff image: _local/compare/${slug}.png`;
    } catch (error) {
      return `error: ${error.message}`;
    }
  };

  const worker = async () => {
    while (jobs.length) {
      const { p, width, scheme } = jobs.shift();
      const label = `${p} at ${width} ${scheme}`;
      const slug = `${p.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home'}-${width}-${scheme}`;
      // ⚠ Chrome can paint a scaled picture slightly differently between runs, so a failing view is shot once more and only a difference that repeats fails. The limits above don't change.
      const first = await shootAndCompare(p, width, scheme, slug);
      if (!first) continue;
      const second = await shootAndCompare(p, width, scheme, slug);
      if (second) results.push({ label, p, problem: second });
      else console.log(`Passed on the second shot: ${label} (first shot: ${first})`);
    }
  };
  await worker();
  await browser.close();
  serverBefore.server.close();
  serverAfter.server.close();

  const unexcused = [];
  for (const result of results.sort((x, y) => x.label.localeCompare(y.label))) {
    if (allowedChanged.has(canon(result.p))) useAllowance('changed picture', result.label, allowedChanged.get(canon(result.p)));
    else unexcused.push(`${result.label}: ${result.problem}`);
  }
  if (unexcused.length) fail(`${unexcused.length} picture(s) differ:\n${unexcused.map(line => `  ${line}`).join('\n')}`);
  console.log(`Pictures: ${sample.length} pages, 4 views each, ${results.length} difference(s).`);
}

// --- report
const staleAllowances = [...allowedAdded.keys()].filter(p => !added.some(a => canon(a) === p)).concat([...allowedRemoved.keys()].filter(p => !missing.some(m => canon(m) === p)));
if (used.length) console.log(`Allowances used:\n${used.map(line => `  ${line}`).join('\n')}`);
if (staleAllowances.length) console.log(`Allowances not needed (the page no longer differs):\n${staleAllowances.map(line => `  ${line}`).join('\n')}`);
console.log(`Addresses: ${before.size} in the old build, ${after.size} in the new, ${missing.length} missing, ${added.length} added.`);
if (failures.length) {
  console.error(`\nFAIL\n${failures.join('\n\n')}`);
  process.exit(1);
}
console.log('PASS: the two builds match.');
