// Dead wikilinks in published content must render as plain text — never raw [[brackets]], never a private wiki URL. Covers the custom interlinker resolving function.
//
// Run: npm run test:unit   (or: node --test tests/wikilink-dead-link.test.js)

import {test} from 'node:test';
import assert from 'node:assert/strict';

import {resolveOrPlainText} from '../src/_config/plugins/interlinker-resolver.js';

test('dead wikilink renders as plain text, no brackets', async () => {
  assert.equal(
    await resolveOrPlainText({name: 'Secret Wiki Page', title: null, href: false, link: '[[Secret Wiki Page]]'}),
    'Secret Wiki Page'
  );
});

test('dead wikilink with alias shows the alias text', async () => {
  assert.equal(
    await resolveOrPlainText({name: 'Target', title: 'Display', href: false, link: '[[Target|Display]]'}),
    'Display'
  );
});

test('live wikilink still renders an anchor', async () => {
  assert.equal(
    await resolveOrPlainText({name: 'A Post', title: null, href: '/posts/a-post/'}),
    '<a href="/posts/a-post/">A Post</a>'
  );
});

test('anchor fragment carries into a live link', async () => {
  assert.equal(
    await resolveOrPlainText({name: 'A Post', title: null, href: '/posts/a-post/', anchor: 'section'}),
    '<a href="/posts/a-post/#section">A Post</a>'
  );
});

test('a dead link with an anchor still renders as plain text, never href="false#..."', async () => {
  assert.equal(await resolveOrPlainText({name: 'Dead Page', title: null, href: false, anchor: 'section'}), 'Dead Page');
});

test('plain text output is HTML-escaped', async () => {
  assert.equal(await resolveOrPlainText({name: 'a < b & c', title: null, href: false}), 'a &lt; b &amp; c');
});
