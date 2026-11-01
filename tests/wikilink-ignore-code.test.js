// Wikilinks and hrefs written inside code must not be detected as links. They were, which
// made the dead-link report 13 warnings and 13 false positives — and gave the published
// Anna Karenina post backlinks into the private wiki, because two wiki pages use
// `[[Anna Karenina]]` as a code EXAMPLE. Covers the stripCode half of interlinker-ignore-code.
//
// Run: npm run test:unit   (or: node --test tests/wikilink-ignore-code.test.js)

import {test} from 'node:test';
import assert from 'node:assert/strict';

import {stripCode, stripTemplatedHrefs} from '../src/_config/plugins/interlinker-ignore-code.js';

// The plugin's own regex, so these assert what it would actually match.
const WIKILINK = /(?<!!)(!?)\[\[([^|\n]+?)(\|([^\n]+?))?]]/g;
const HREF = /href="\/(.*?)"/g;

const wikilinks = md => (stripCode(md).match(WIKILINK) || []);
const hrefs = md => (stripCode(md).match(HREF) || []);

test('a wikilink in an inline code span is not detected', () => {
  assert.deepEqual(wikilinks('A link is written `[[Page Title]]` in prose.'), []);
});

test('a wikilink in a fenced block is not detected', () => {
  assert.deepEqual(wikilinks('text\n\n```toml\n[[plugins]]\n```\n\ntext'), []);
});

test('a templated href in a fenced block is not detected', () => {
  assert.deepEqual(hrefs('```html\n<a href="/assets/x-2000w.jpeg">z</a>\n```'), []);
});

test('a real wikilink in prose IS still detected', () => {
  assert.deepEqual(wikilinks('See [[Microformats]] for the vocabulary.'), ['[[Microformats]]']);
});

test('a real wikilink survives on a line that also has a code span', () => {
  assert.deepEqual(wikilinks('The `e-content` wrapper — see [[Microformats]].'), ['[[Microformats]]']);
});

test('a real href in prose IS still detected', () => {
  assert.deepEqual(hrefs('<a href="/about/">About</a>'), ['href="/about/"']);
});

// The reason inline stripping is held to one line: an unpaired backtick must not pair with
// the next one paragraphs away and swallow every real wikilink in between.
test('a stray backtick does not swallow a later wikilink', () => {
  assert.deepEqual(
    wikilinks('A stray ` here.\n\nA paragraph.\n\nSee [[Microformats]] and a closing ` there.'),
    ['[[Microformats]]']
  );
});

test('code fences do not glue surrounding text into a new match', () => {
  assert.deepEqual(wikilinks('start [[\n\n```\ncode\n```\n\n]] end'), []);
});

// Templated hrefs: the parsers read raw template source, so an expression-built path is
// matched literally and can never resolve. Dropping them costs no real backlink.
const templatedHrefs = md => (stripTemplatedHrefs(md).match(HREF) || []);

test('an href built from a Nunjucks expression is not detected', () => {
  assert.deepEqual(templatedHrefs('<a href="/tags/{{ tag | slugify }}/">{{ tag }}</a>'), []);
});

test('an href built from a Nunjucks statement is not detected', () => {
  assert.deepEqual(templatedHrefs('<a href="/x/{% if y %}a{% endif %}/">z</a>'), []);
});

test('a static internal href IS still detected', () => {
  assert.deepEqual(templatedHrefs('<a href="/articles/">Articles</a>'), ['href="/articles/"']);
});

test('a static href on the same line as a templated one survives', () => {
  assert.deepEqual(
    templatedHrefs('<a href="/about/">A</a> <a href="/tags/{{ t }}/">B</a> <a href="/articles/">C</a>'),
    ['href="/about/"', 'href="/articles/"']
  );
});

test('neutralizing an href leaves the rest of the tag intact', () => {
  assert.match(stripTemplatedHrefs('<a class="button" href="/tags/{{ t }}/" data-x>T</a>'), /class="button".*data-x/);
});
