// Builds an empty copy of the site in a temp folder, to prove makeTempSite works. Run: node --test tests/temp-site.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTempSite } from './lib/temp-site.mjs';

test('empty site builds', async t => {
  const site = await makeTempSite();
  t.after(() => site.cleanup());
  await site.build();
  assert.ok(site.exists('index.html'), 'dist/index.html is missing');
  assert.ok(site.exists('privacy/index.html'), 'dist/privacy/index.html is missing');
});

test('settings are merged', async t => {
  const site = await makeTempSite({ settings: { switches: { noindexSite: false } } });
  t.after(() => site.cleanup());
  await site.build();
  assert.ok(!site.read('index.html').includes('noindex'), 'index.html still says noindex');
});
