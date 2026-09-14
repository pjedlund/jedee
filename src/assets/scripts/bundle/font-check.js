// Dev server only: greys out characters the web font lacks and outlines text set in a style with no real font file. See the wiki "Font subsetting".
// ponytail: skips ::before/::after text and emoji; the wiki's cmap scan covers the whole built site.
const BLANK = 'd09GMgABAAAAAAE0AAoAAAAAArAAAADtAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAAWAoYNgE2AiQDCAsGAAQgBXsHLBsWAgAeB3aM+IYDoYnOhpYtInDNZpO0D+gI1AtHpCxIcVK+ZCNJF3R0m+L373s8PhFVMAyiqL5c3eA4ooEHgGmy9VFHG2wecFxhtzE84ozqBdbsoppZBiONKMD9AE56r8f9gnrsDQBwDCoq9lXJscxvNMdoMXjsnU/1VwFrYB8QnCi9I6CAhqBhBGggtNS1YjbMgCD8nP6JjZv5Yq3/8PsdUciQGaoCwpyrMsNLBgEAlMwAQdEEFAAANGcCYhMBxYJNVdqSOLZVW7Hu3MQKWyh2VT5MtVHYxgXPijMNnixqNOHS6yUOFlwhZXQMAAA='; // one zero-width glyph for every code point up to U+2FFFF, built with fontTools; ⚠ .notdef must have an outline or Chrome rejects the font ("glyf: zero-length table")

const name = f => f.replace(/["']/g, '').trim();
const num = w => ({normal: 400, bold: 700})[w] ?? parseFloat(w);
const skip = /[\p{M}\p{Cf}\p{Z}\p{Cc}\p{Extended_Pictographic}]/u;

const check = async () => {
  await document.fonts.ready;
  const faces = [...document.fonts].map(f => ({family: name(f.family), italic: f.style !== 'normal', maxWeight: num(f.weight.split(' ').pop())}));
  document.fonts.add(await new FontFace('font-check-blank', `url(data:font/woff2;base64,${BLANK})`).load());
  const ctx = document.createElement('canvas').getContext('2d');
  const cache = new Map();

  // A character the web font lacks falls through to the blank font, which draws it zero-wide.
  const lacks = (font, ch) => {
    if (skip.test(ch)) return false;
    const key = font + ch;
    if (!cache.has(key)) {
      ctx.font = `${font}, "font-check-blank"`;
      cache.set(key, ctx.measureText(ch).width === 0);
    }
    return cache.get(key);
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n; (n = walker.nextNode()); ) if (n.data.trim() && !n.parentElement.closest('script, style, template, noscript')) nodes.push(n);

  let letters = 0, fakes = 0;
  for (const node of nodes) {
    const el = node.parentElement;
    const cs = getComputedStyle(el);
    const family = name(cs.fontFamily.split(',')[0]);
    const own = faces.filter(f => f.family === family);
    if (!own.length) continue;

    const italic = cs.fontStyle !== 'normal';
    const styled = own.filter(f => f.italic === italic);
    const weight = num(cs.fontWeight);
    const fake = (italic && !styled.length && 'italic') || (weight >= 600 && Math.max(0, ...styled.map(f => f.maxWeight)) < 600 && 'bold');
    if (fake && !el.dataset.fontCheck) {
      el.dataset.fontCheck = 'fake';
      el.title = `${family} has no real ${fake}: the browser fakes it (or refuses, under font-synthesis)`;
      fakes++;
    }

    const font = `${cs.fontStyle} ${cs.fontWeight} 40px "${family}"`;
    const chars = [...node.data];
    if (!chars.some(ch => lacks(font, ch))) continue;

    const frag = document.createDocumentFragment();
    for (const ch of chars) {
      if (lacks(font, ch)) {
        const span = document.createElement('span');
        span.dataset.fontCheck = 'missing';
        span.title = `Not in ${family}: drawn by a fallback font`;
        span.textContent = ch;
        frag.append(span);
        letters++;
      } else frag.append(ch);
    }
    node.replaceWith(frag);
  }

  document.head.insertAdjacentHTML('beforeend', '<style>[data-font-check="missing"]{opacity:.35;text-decoration:underline dotted}[data-font-check="fake"]{outline:1px dashed currentColor;outline-offset:2px}</style>');
  if (letters || fakes) console.warn(`font-check: ${letters} character(s) drawn by a fallback font, ${fakes} element(s) in a fake style`);
};

addEventListener('load', check);
