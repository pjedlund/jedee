// Builds a bare page (every switch off, no post types, the sample theme) and prints what it weighs and what it asks for. Run: npm run bare
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { SWITCHES } from '../src/_config/utils/switches.js';
import { makeTempSite } from './lib/temp-site.mjs';

const root = path.resolve(import.meta.dirname, '..');
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
const BARE_PAGE = '---\ntitle: Bare\nlayout: base\npermalink: /bare/\n---\n\n<p>Just words.</p>\n';
// ⚠ These are the numbers on the old, full-featured page, measured before the trimming started. A bare page is meant to land far under them.
const BEFORE = { total: 88, gzip: 21, sharedCss: 54, pageCss: 8, html: 23 };

const switches = Object.fromEntries([...SWITCHES, 'nameReveal', 'viewRepo'].map(name => [name, false]));
const site = await makeTempSite({ settings: { theme: 'sample', postTypes: [], switches }, files: { 'src/pages/bare.njk': BARE_PAGE } });
try {
  await site.build();
  const html = site.read('bare/index.html');
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
  const [shared = '', local = ''] = styles;
  const css = styles.join('');
  const withoutStyles = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const markup = withoutStyles.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  const gzip = gzipSync(html, { level: 9 }).length;
  const brotli = brotliCompressSync(html).length;

  console.log(`Bare page /bare/ (theme sample, every switch off, postTypes: [])\n`);
  console.log(`Page total        ${kb(html.length)}   (before: ${BEFORE.total} KB)`);
  console.log(`Compressed        ${kb(gzip)} gzip, ${kb(brotli)} brotli   (before: ${BEFORE.gzip} KB)`);
  console.log(`CSS, shared       ${kb(shared.length)}   (before: ${BEFORE.sharedCss} KB)`);
  console.log(`CSS, this page    ${kb(local.length)}   (before: ${BEFORE.pageCss} KB)`);
  console.log(`HTML without CSS  ${kb(withoutStyles.length)}, of which scripts ${kb(withoutStyles.length - markup.length)}, markup ${kb(markup.length)}   (before: ${BEFORE.html} KB)`);

  console.log('\nShared CSS by layer');
  for (const [name, text] of layers(shared)) console.log(`  ${name.padEnd(20)} ${kb(text.length)}`);

  console.log('\nCSS pieces found in the page-only <style> (matched on each file\'s first selector)');
  const found = cssFiles().map(file => [file, probe(file)]).filter(([, text]) => text && local.replace(/\s+/g, '').includes(text)).map(([file]) => path.relative(root, file));
  for (const file of found) console.log(`  ${file}`);
  if (!found.length) console.log('  none');

  console.log('\nInline scripts');
  for (const script of inlineScripts) console.log(`  ${kb(script.length)}  ${script.trim().slice(0, 70).replace(/\s+/g, ' ')}`);

  console.log('\nFiles the page asks for');
  const asked = new Set();
  for (const match of html.matchAll(/<(?:script|img|source|iframe)\b[^>]*\ssrc="([^"]+)"/gi)) asked.add(`script/img  ${match[1]}`);
  for (const match of html.matchAll(/<link\b(?![^>]*rel="canonical")[^>]*\shref="([^"]+)"/gi)) asked.add(`link        ${match[1]}`);
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) if (!match[1].startsWith('data:')) asked.add(`css url     ${match[1]}`);
  for (const line of [...asked].sort()) console.log(`  ${line}`);

  const external = [...asked].filter(line => /\s(https?:)?\/\/(?!localhost)/.test(line));
  console.log(`\nOutside the site: ${external.length ? external.map(line => line.trim()).join(', ') : 'nothing'}`);
  console.log(`\nWhole dist folder (every page of this empty site): ${kb(folderSize(path.join(site.dir, 'dist')))}`);
} finally {
  site.cleanup();
}

// Splits the top level of a stylesheet into its @layer blocks.
function layers(text) {
  const out = [];
  let index = 0;
  while (index < text.length) {
    const start = text.indexOf('@layer', index);
    if (start === -1) break;
    const open = text.indexOf('{', start);
    const semi = text.indexOf(';', start);
    if (semi !== -1 && semi < open) { index = semi + 1; continue; }
    let depth = 0, end = open;
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++;
      else if (text[end] === '}' && --depth === 0) break;
    }
    out.push([text.slice(start + 7, open).trim(), text.slice(start, end + 1)]);
    index = end + 1;
  }
  const rest = text.length - out.reduce((sum, [, block]) => sum + block.length, 0);
  if (rest > 200) out.push(['(outside any layer)', 'x'.repeat(rest)]);
  return out;
}

function cssFiles() {
  const list = [];
  const walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.css')) list.push(full); } };
  walk(path.join(root, 'src/_includes/css'));
  return list;
}

// The first selector of a file, with no spaces: enough to tell whether its rules are in the page's CSS.
function probe(file) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@layer[^{;]*;/g, '');
  const selector = text.match(/(?:^|[};])\s*([^@{};][^{};]*)\{/)?.[1];
  return selector?.replace(/\s+/g, '').slice(0, 60);
}

function folderSize(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? folderSize(full) : statSync(full).size);
  }, 0);
}
