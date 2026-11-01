// Which files belong to one site, and the check that a site's shared files still match stomme. Run: node --test tests/compare-upstream.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isSiteFile } from './lib/site-files.mjs';

const script = path.resolve(import.meta.dirname, 'compare-upstream.mjs');

test('isSiteFile tells site files from shared files', () => {
  assert.equal(isSiteFile('src/posts/articles/a.md'), true);
  assert.equal(isSiteFile('src/posts/articles/articles.json'), false);
  assert.equal(isSiteFile('src/pages/about.md'), true);
  assert.equal(isSiteFile('src/pages/articles.njk'), false);
  assert.equal(isSiteFile('src/_layouts/base.njk'), false);
});

test("the demo branch's photos count as site files", () => {
  assert.equal(isSiteFile('src/assets/images/demo/a/b.jpg'), true);
});

// A fake stomme and a site cloned from it, with the clone's origin renamed to upstream.
function makeSite(t, upstreamName = 'stomme') {
  const dir = mkdtempSync(path.join(tmpdir(), 'stomme-compare-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
  const parent = path.join(dir, upstreamName);
  mkdirSync(path.join(parent, 'src/_layouts'), { recursive: true });
  mkdirSync(path.join(parent, 'src/pages'), { recursive: true });
  writeFileSync(path.join(parent, 'src/_layouts/base.njk'), 'shared\n');
  writeFileSync(path.join(parent, 'src/pages/about.md'), 'about\n');
  git(parent, 'init', '-q', '-b', 'main');
  git(parent, 'add', '-A');
  git(parent, 'commit', '-q', '-m', 'first');
  const site = path.join(dir, 'site');
  git(dir, 'clone', '-q', '-o', 'upstream', parent, site);
  const run = () => spawnSync(process.execPath, [script], { cwd: site, encoding: 'utf8' });
  return { site, run };
}

test('a matching site passes', t => {
  const { run } = makeSite(t);
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a changed site file passes, a changed shared file is listed and fails', t => {
  const { site, run } = makeSite(t);
  writeFileSync(path.join(site, 'src/pages/about.md'), 'mine\n');
  assert.equal(run().status, 0);
  writeFileSync(path.join(site, 'src/_layouts/base.njk'), 'changed\n');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /src\/_layouts\/base\.njk/);
  assert.doesNotMatch(result.stdout, /about\.md/);
});

test('a new shared file that git does not track yet is listed too', t => {
  const { site, run } = makeSite(t);
  writeFileSync(path.join(site, 'src/_layouts/extra.njk'), 'new\n');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /src\/_layouts\/extra\.njk/);
});

test('an upstream that is not stomme says so and passes', t => {
  const { site, run } = makeSite(t, 'eleventy-excellent');
  writeFileSync(path.join(site, 'src/_layouts/base.njk'), 'changed\n');
  const result = run();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /isn't stomme/);
  assert.doesNotMatch(result.stdout, /base\.njk/);
});
