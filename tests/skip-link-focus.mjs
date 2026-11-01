// The comparison never shoots a focused page, so this presses Tab once on a built page and checks that the skip link takes focus and comes into view. Given two builds, it also checks that their computed styles match. Run: node tests/skip-link-focus.mjs <build> [<other build>]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const PAGE = '/privacy/';
const builds = process.argv.slice(2).map(dir => path.resolve(dir));
if (!builds.length) {
  console.error('Usage: node tests/skip-link-focus.mjs <build> [<other build>]');
  process.exit(2);
}

const serve = async dir => {
  const server = createServer((req, res) => {
    let file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return server;
};

const readLink = () => {
  const link = document.querySelector('.skip-link');
  const style = getComputedStyle(link);
  const box = link.getBoundingClientRect();
  return {
    focused: document.activeElement === link,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    // Real properties only: a variable a page doesn't use may rightly be gone from it.
    style: Object.fromEntries([...style].filter(name => !name.startsWith('--')).map(name => [name, style.getPropertyValue(name)]))
  };
};

const failures = [];
const views = [{ width: 1400, scheme: 'light' }, { width: 390, scheme: 'dark' }];
const executablePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath, headless: 'new' });
const results = [];

for (const dir of builds) {
  const server = await serve(dir);
  const result = {};
  for (const { width, scheme } of views) {
    const label = `${path.basename(dir)} at ${width} ${scheme}`;
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.goto(`http://127.0.0.1:${server.address().port}${PAGE}`, { waitUntil: 'load' });
    const before = await page.evaluate(readLink);
    await page.keyboard.press('Tab');
    // ⚠ Links ease their color, so the focused colors can only be read once that has finished.
    await new Promise(done => setTimeout(done, 400));
    const after = await page.evaluate(readLink);
    await page.close();
    if (!after.focused) failures.push(`${label}: one Tab didn't focus the skip link`);
    if (before.box.width > 1) failures.push(`${label}: the skip link is ${before.box.width}px wide before it has focus`);
    if (after.box.width <= 1 || after.box.height <= 1) failures.push(`${label}: the focused skip link is ${after.box.width} by ${after.box.height}px, so it can't be seen`);
    if (before.style.clip === after.style.clip) failures.push(`${label}: its clip stays ${after.style.clip} on focus`);
    console.log(`${label}: focused ${after.focused}; clip ${before.style.clip} → ${after.style.clip}; ${before.box.width}×${before.box.height} → ${after.box.width}×${after.box.height} at ${after.box.x},${after.box.y}`);
    result[`${width} ${scheme}`] = { before, after };
  }
  results.push(result);
  server.close();
}
await browser.close();

if (results.length === 2) {
  let compared = 0;
  for (const view of Object.keys(results[0])) {
    for (const state of ['before', 'after']) {
      const [one, other] = results.map(result => result[view][state]);
      for (const name of Object.keys(one.style)) {
        compared++;
        if (one.style[name] !== other.style[name]) failures.push(`${view} ${state}: ${name} is ${one.style[name]} in one build and ${other.style[name]} in the other`);
      }
      if (JSON.stringify(one.box) !== JSON.stringify(other.box)) failures.push(`${view} ${state}: the box moved from ${JSON.stringify(one.box)} to ${JSON.stringify(other.box)}`);
    }
  }
  console.log(`Computed styles compared between the two builds: ${compared}.`);
}

if (failures.length) {
  console.error(`\nFAIL\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('PASS: the skip link works.');
