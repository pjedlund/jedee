// Measures each post-type icon's drawn outline (its bounding box inside the 256×256 frame) so the large type mark can hug the H1's edge. Run `npm run icons:bounds` after adding or changing an icon in src/assets/svg/posts/.
// ⚠ puppeteer comes in through pa11y-ci, not as a direct dependency; Chrome is the one pa11y uses (meta.tests.pa11y.chromePath).
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import puppeteer from 'puppeteer';
import {tests} from '../../_data/meta.js';

const dir = './src/assets/svg/posts';
const icons = readdirSync(dir).filter(f => f.endsWith('.svg'));

const browser = await puppeteer.launch({executablePath: tests.pa11y.chromePath, headless: true});
const page = await browser.newPage();
await page.setContent(icons.map(f => `<div data-name="${f.slice(0, -4)}">${readFileSync(`${dir}/${f}`, 'utf8')}</div>`).join(''));

const bounds = await page.evaluate(() =>
  Object.fromEntries(
    [...document.querySelectorAll('[data-name]')].map(d => {
      const b = d.querySelector('svg').getBBox();
      return [d.dataset.name, [b.x, b.y, b.width, b.height].map(n => Math.round(n * 100) / 100).join(' ')];
    })
  )
);
await browser.close();

writeFileSync('./src/_data/iconBounds.json', JSON.stringify(bounds, null, 2) + '\n');
console.log(`iconBounds.json: ${Object.keys(bounds).length} icons`);
