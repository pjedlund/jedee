// Regression test for the {% image %} / {% imageKeys %} shortcode's HTML
// escaping (src/_config/shortcodes/image.js). The shortcode builds its
// <picture>/<img>/<figure> markup by hand and returns it raw, bypassing
// Nunjucks' auto-escaping — so a straight double-quote in a frontmatter `alt`
// used to close the attribute and make the html-minify transform throw a Parse
// Error, failing the production build (invisible until a post with such an alt
// was published, since drafts are excluded). `escapeHtml` is the fix.
//
// Run: npm run test:unit   (or: node --test tests/image-escape.test.js)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { escapeHtml } from '../src/_config/shortcodes/image.js'

test('escapeHtml: straight double-quotes become &quot; (the build-breaking case)', () => {
  // The exact shape that broke the "Pier 4, Ribersborg" build.
  const alt = 'The black film rebate with "Kodak Ektar 100" edge markings'
  const escaped = escapeHtml(alt)

  assert.equal(
    escaped,
    'The black film rebate with &quot;Kodak Ektar 100&quot; edge markings'
  )
  // The whole point: no bare double-quote survives to break out of alt="…".
  assert.ok(!escaped.includes('"'), 'escaped value must contain no raw double-quote')
})

test('escapeHtml: escapes all five HTML-significant characters', () => {
  assert.equal(escapeHtml('&'), '&amp;')
  assert.equal(escapeHtml('<'), '&lt;')
  assert.equal(escapeHtml('>'), '&gt;')
  assert.equal(escapeHtml('"'), '&quot;')
  assert.equal(escapeHtml("'"), '&#39;')
  assert.equal(
    escapeHtml(`a & b < c > d " e ' f`),
    'a &amp; b &lt; c &gt; d &quot; e &#39; f'
  )
})

test('escapeHtml: single pass, ampersand escaped first (no &amp; mangling)', () => {
  // `&` is rewritten to `&amp;` exactly once; the inserted "amp;" is not
  // re-scanned, so AT&T → AT&amp;T, not AT&amp;amp;T.
  assert.equal(escapeHtml('AT&T'), 'AT&amp;T')
  assert.equal(escapeHtml('Tom & Jerry "best" <friends>'),
    'Tom &amp; Jerry &quot;best&quot; &lt;friends&gt;')
})

test('escapeHtml: null/undefined/empty coerce to empty string', () => {
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml(undefined), '')
  assert.equal(escapeHtml(''), '')
})

test('escapeHtml: leaves safe text untouched and coerces non-strings', () => {
  assert.equal(escapeHtml('A calm, glassy sea under a pastel sky'),
    'A calm, glassy sea under a pastel sky')
  assert.equal(escapeHtml(650), '650') // width/height pass through stringifyAttributes
})
