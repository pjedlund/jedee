// A site's look is a folder in src/_includes/themes, chosen by settings.theme. Run: node --test tests/theme.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { makeTempSite } from './lib/temp-site.mjs';

// The sample theme's themeColor, which nothing else in the site uses.
const SAMPLE_MARKER = '#1f5f5b';

test('unknown theme stops the build', async t => {
  const site = await makeTempSite({ settings: { theme: 'nope' } });
  t.after(() => site.cleanup());
  await assert.rejects(site.build(), /settings\.theme is "nope", but src\/_includes\/themes\/nope doesn't exist/);
});

test('no theme setting still builds', async t => {
  const site = await makeTempSite({ settings: { theme: null } });
  t.after(() => site.cleanup());
  await site.build();
  assert.ok(site.exists('index.html'), 'dist/index.html is missing');
});

test('sample theme replaces the look', async t => {
  const site = await makeTempSite({ settings: { theme: 'sample' } });
  t.after(() => site.cleanup());
  await site.build();
  const home = site.read('index.html');
  assert.ok(!/#495464/i.test(home), "index.html still has JEDEE's slate colour");
  assert.ok(!home.includes('Source Serif'), 'index.html still names Source Serif');
  assert.ok(!home.includes('source-sans'), 'index.html still points at a source-sans font file');
  assert.ok(home.includes(SAMPLE_MARKER), "index.html doesn't have the sample theme's colour");
  assert.ok(!site.exists('assets/fonts/source-serif'), 'dist/assets/fonts still holds source-serif');
});

test('theme.css comes last', async t => {
  const site = await makeTempSite({ files: { 'src/_includes/themes/jedee/theme.css': ':root { --theme-marker: 1; }\n' } });
  t.after(() => site.cleanup());
  await site.build();
  const home = site.read('index.html');
  const position = layer => home.indexOf(`@layer ${layer}`);
  assert.match(home, /@layer theme\s*\{[^}]*--theme-marker:\s*1/, "theme.css isn't in the theme layer");
  assert.ok(position('cubeUtilities') > -1, 'the cubeUtilities layer is missing');
  assert.ok(position('theme') > position('cubeUtilities'), 'the theme layer comes before cubeUtilities');
  assert.ok(position('theme') > position('tailwindUtilities'), 'the theme layer comes before tailwindUtilities');
});

test("only the chosen theme's templates make classes", async t => {
  const unused = ['gutter-3xl', 'flow-space-2xl-3xl'];
  const site = await makeTempSite({
    files: {
      'src/_includes/themes/sample/home.njk': `<p class="${unused[0]}"></p>`,
      'src/_includes/themes/jedee/DESIGN.md': `Set \`${unused[1]}\` on it.`,
    },
  });
  t.after(() => site.cleanup());
  await site.build();
  const home = site.read('index.html');
  for (const name of unused) assert.ok(!home.includes(`.${name}{`), `${name} reached the CSS`);
});

// What the dev server does: one process, a token edited between two CSS builds.
test('an edited token reaches the next CSS build', async t => {
  const site = await makeTempSite();
  t.after(() => site.cleanup());
  const script = `
    import fs from 'node:fs';
    import {buildGlobalCss} from './src/_config/events/build-css.js';
    const file = 'src/_includes/themes/jedee/tokens/colors.json';
    await buildGlobalCss();
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('#495464', '#123456'));
    console.log((await buildGlobalCss()).includes('#123456'));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: site.dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  assert.match(output, /true/, 'the second build still has the old colour');
});
