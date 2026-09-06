// Shoots every [data-shot] element in this folder's mockups to src/assets/images/wiki/<data-shot>.png. Run: npm run mockups
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(here, '../../assets/images/wiki');
const mockups = readdirSync(here).filter(f => f.endsWith('.html')).sort();

// puppeteer arrives transitively under pa11y-ci and hunts for its own pinned build — point it at an installed Chrome, same as meta.tests.pa11y.chromePath does.
const chromePath = process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });
const page = await browser.newPage();
// ⚠ deviceScaleFactor 2 is load-bearing: a wiki page declares each shot at its full pixel size and lets CSS scale it down, so a 1x shot renders soft.
await page.setViewport({ width: 1400, height: 1400, deviceScaleFactor: 2 });

const sizes = [];

for (const file of mockups) {
  await page.goto(`file://${path.join(here, file)}`, { waitUntil: 'networkidle0' });
  // A mockup that freezes an animation sets window.__mockupReady = false up front and true once it has settled; one that does not is ready as soon as it loads.
  await page.waitForFunction(() => window.__mockupReady !== false, { timeout: 10000 });

  // The mockup's own ground and drop shadows are dropped so each shot sits on the wiki page itself, in either theme.
  await page.evaluate(() => {
    document.body.style.background = 'transparent';
    document.querySelectorAll('[data-shot]').forEach(el => (el.style.boxShadow = 'none'));
  });

  const shots = await page.$$eval('[data-shot]', els =>
    els.map(el => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { name: el.dataset.shot, clip: { x, y, width, height } };
    })
  );

  for (const { name, clip } of shots) {
    // omitBackground keeps rounded corners transparent; clipping to the element itself is what removes the box around it.
    const buf = await page.screenshot({ path: `${outputDir}/${name}.png`, clip, omitBackground: true });
    // Read the size out of the PNG's own IHDR rather than doubling the clip — rounding the clip is off by one often enough to ship a soft image.
    sizes.push(`${name}.png  ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
  }
}

await browser.close();
console.log(`Wrote ${sizes.length} shots to ${outputDir}:`);
sizes.forEach(s => console.log(`  ${s}`));
console.log('⚠ Those are the intrinsic sizes — they must be the width/height on each <img>, or eleventy-img ships a soft image.');
