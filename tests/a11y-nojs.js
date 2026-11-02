/*
No-JS contrast check — the state pa11y-ci has never seen.

`npm run test:a11y` drives a real browser with JavaScript on, so it only ever sees the
enhanced nav (MENU button + closed panel). The fallback pill row exists only when scripts
don't run, and its contrast numbers were hand-measured. This walks the real no-JS page in
both themes and measures text against its effective background.

Run the dev server first (`npm start` — the nav is only revealed in serve mode), then:
  ~/.nvm/versions/node/v22.22.3/bin/node tests/a11y-nojs.js

⚠ Why this doesn't just run pa11y: pa11y's runner is async, and in a page where scripting
is off its promise never resolves — "ProtocolError: Promise was collected", both via
page.setJavaScriptEnabled(false) and via the launch flag below. Plain (non-async)
CDP evaluate still works, which is what this uses.

⚠ Turning JS off has to be the launch flag `--blink-settings=scriptEnabled=false`:
it is the only route that makes `(scripting: none)` match, and that media query is what
`nav-menu-cls.css` keys the pre-JS hide on. emulateMediaFeatures can't emulate `scripting`
(Chrome rejects it), and page.setJavaScriptEnabled leaves it reporting `enabled`, so with
either of those the nav would be measured while display:none — i.e. not measured at all.
*/

import puppeteer from 'puppeteer';

const BASE = 'http://localhost:8080';
const PATHS = ['/', '/about/', '/articles/', '/styleguide/'];
const THEMES = ['light', 'dark'];
// The bundled Chromium is not downloaded in this repo — use the system one.
const EXECUTABLE_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Runs inside the page. Returns every visible text run that misses its WCAG 1.4.3 target.
function auditContrast() {
  const srgbToLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const relLum = ([r, g, b]) =>
    0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
  const ratio = (a, b) => {
    const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  // Computed colors come back as oklab(…) wherever a color-mix() is involved, so parse
  // nothing by hand — let a 1×1 canvas do the conversion to rgba for any CSS color syntax.
  const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const parse = s => {
    if (!s || s === 'transparent') return [];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));

  // Effective background: composite every translucent layer up the tree onto the first opaque one.
  const bgOf = el => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const {backgroundColor, backgroundImage} = getComputedStyle(n);
      if (backgroundImage !== 'none') return {color: null, image: true};
      const c = parse(backgroundColor);
      if (!c.length || c[3] === 0) continue;
      layers.push(c);
      if ((c[3] ?? 1) === 1) break;
    }
    if (!layers.length) return {color: [255, 255, 255], image: false};
    let out = layers.pop().slice(0, 3);
    while (layers.length) out = over(layers.pop(), out);
    return {color: out, image: false};
  };

  const path = el => {
    const bits = [];
    for (let n = el; n && n.tagName !== 'HTML'; n = n.parentElement) {
      bits.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
    }
    return bits.slice(-3).join(' > ');
  };

  const fails = [];
  for (const el of document.querySelectorAll('body *')) {
    const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (!text || !el.checkVisibility()) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    // .visually-hidden survives checkVisibility() — it's clipped to a 1px box, not hidden.
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;

    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const target = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;

    const bg = bgOf(el);
    if (bg.image) continue; // can't measure text over an image or gradient
    const fg = over(parse(cs.color), bg.color);
    const r = ratio(fg, bg.color);
    if (r < target) {
      fails.push({sel: path(el), text: text.slice(0, 40), ratio: +r.toFixed(2), target, size: +size.toFixed(1)});
    }
  }
  return fails;
}

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--blink-settings=scriptEnabled=false']
});

let total = 0;

for (const theme of THEMES) {
  for (const path of PATHS) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{name: 'prefers-color-scheme', value: theme}]);
    await page.goto(BASE + path, {waitUntil: 'load'});

    const state = await page.evaluate(() => ({
      scriptingNone: matchMedia('(scripting: none)').matches,
      toggle: !!document.querySelector('[data-menu-toggle]'),
      navLinks: document.querySelectorAll('#mainnav a').length,
      navVisible: !!document.querySelector('#mainnav a')?.checkVisibility()
    }));
    if (!state.scriptingNone || state.toggle || !state.navVisible) {
      throw new Error(`not the no-JS state on ${path}: ${JSON.stringify(state)}`);
    }

    const fails = await page.evaluate(auditContrast);
    total += fails.length;
    console.log(`${theme.padEnd(5)} ${path.padEnd(12)} ${String(fails.length).padStart(2)} below target  [${state.navLinks} nav pills visible]`);
    for (const f of fails) {
      console.log(`      ${f.ratio}:1 (needs ${f.target}) ${f.size}px — ${f.sel}\n        "${f.text}"`);
    }

    await page.close();
  }
}

await browser.close();
console.log(`\n${total} text run(s) below target.`);
process.exit(total ? 1 : 0);
