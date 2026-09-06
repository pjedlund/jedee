// Fails if the two halves of a [data-compare] pair render identically — a comparison that shows no difference is worse than none. Run: npm run mockups:check
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import puppeteer from 'puppeteer';

const here = path.dirname(fileURLToPath(import.meta.url));
const chromePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1400, deviceScaleFactor: 2 });

let failures = 0;

for (const file of readdirSync(here).filter(f => f.endsWith('.html')).sort()) {
  await page.goto(`file://${path.join(here, file)}`, { waitUntil: 'networkidle0' });
  // A mockup that freezes an animation sets window.__mockupReady = false up front and true once it has settled; one that does not is ready as soon as it loads.
  await page.waitForFunction(() => window.__mockupReady !== false, { timeout: 10000 });

  // ⚠ The pair is compared as PIXELS, not as text: the wrapping specimens differ in line breaks, but border width, a focus ring and a syntax color do not move a single word.
  // Every frame, not just the top document — a mockup that needs real viewport widths draws its sides in iframes, and their elements are unreachable from the top document.
  const byName = {};
  for (const frame of page.frames()) {
    for (const handle of await frame.$$('[data-compare]')) {
      // ElementHandle.screenshot resolves the frame offset and any CSS transform on the way up; a hand-built clip from getBoundingClientRect does neither.
      const buf = await handle.screenshot({ omitBackground: true });
      const name = await handle.evaluate(el => el.dataset.compare);
      (byName[name] ??= []).push(createHash('sha1').update(buf).digest('hex').slice(0, 12));
    }
  }

  for (const [name, sides] of Object.entries(byName)) {
    const distinct = new Set(sides).size;
    const ok = distinct === sides.length;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${file} → ${name}: ${sides.length} sides, ${distinct} distinct`);
    if (!ok) sides.forEach((s, i) => console.log(`        side ${i}: ${s}`));
  }
}

await browser.close();
if (failures) {
  console.error(`\n${failures} comparison(s) render identically. Widen the sweep or change what varies — see the ⚠ on the wiki page.`);
  process.exit(1);
}
