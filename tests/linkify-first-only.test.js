import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownLib } from '../src/_config/plugins/markdown.js';

test('a bare address links on its first mention only; hand-written links stay', () => {
  const html = markdownLib.render('Use schema.org.\n\nAgain schema.org, [schema.org](https://schema.org) by hand, schema.org.');
  assert.equal((html.match(/<a /g) || []).length, 2);
});
