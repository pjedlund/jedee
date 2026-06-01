// Unit tests for the pure transform layer of the Micropub Function.
// These cover the three "patch points" that make a posted entry indistinguishable
// from a clipped one — folder routing, timestamp-prefix stripping, and the
// kebab->camelCase frontmatter rewrite — plus the title-less slug strategy.
//
// Run: npm run test:unit   (or: node --test test/micropub.test.js)
// Lives OUTSIDE netlify/functions/ on purpose: Netlify treats every .js file in
// that directory as a deployable function, so a test file there breaks the deploy.
// (Real-client auth is exercised against the token endpoint after the domain
// move — see the sequencing note in __project_docs/micropub-pattern.html.)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  slugify,
  stripHtml,
  contentSlug,
  targetSlug,
  flatten,
  formatSlug,
  rewriteFrontmatter,
  resolveFilename,
  TYPE_DIR
} from '../netlify/functions/micropub.js'

test('formatSlug: maps engine post-type to the site folder', () => {
  assert.equal(formatSlug('note', 'hello'), 'notes/hello')
  assert.equal(formatSlug('reply', 'hello'), 'replies/hello')
  assert.equal(formatSlug('like', 'hello'), 'likes/hello')
  // folder asymmetries the routing table calls out
  assert.equal(formatSlug('listen', 'anna'), 'jams/anna')
  assert.equal(formatSlug('watch', 'dune'), 'watching/dune')
  assert.equal(formatSlug('read', 'karenina'), 'reading/karenina')
})

test('formatSlug: strips the engine leading unix-timestamp prefix (patch 1+2)', () => {
  assert.equal(formatSlug('like', '1733436000-css-nesting-is-here'), 'likes/css-nesting-is-here')
  // only the first numeric run is stripped — a title that starts with a year survives
  assert.equal(formatSlug('note', '1733436000-2026-in-review'), 'notes/2026-in-review')
})

test('formatSlug: a bare timestamp (title-less post) passes through here', () => {
  // no trailing "-" so it is not stripped; the store upgrades it later
  assert.equal(formatSlug('note', '1733436000'), 'notes/1733436000')
  assert.equal(formatSlug('reply', '1733436000'), 'replies/1733436000')
})

test('TYPE_DIR covers every routed engine type', () => {
  for (const t of ['note', 'reply', 'like', 'bookmark', 'repost', 'rsvp', 'watch', 'read', 'listen', 'article']) {
    assert.ok(TYPE_DIR[t], `missing folder for ${t}`)
  }
})

test('rewriteFrontmatter: renames kebab target keys to the layout keys (patch 3)', () => {
  assert.deepEqual(rewriteFrontmatter({ 'in-reply-to': 'https://x' }), { inReplyTo: 'https://x' })
  assert.deepEqual(rewriteFrontmatter({ 'like-of': 'https://x' }), { likeOf: 'https://x' })
  assert.deepEqual(rewriteFrontmatter({ 'bookmark-of': 'https://x' }), { bookmarkOf: 'https://x' })
  assert.deepEqual(rewriteFrontmatter({ 'repost-of': 'https://x' }), { repostOf: 'https://x' })
  // watch/read/listen map to url/link/source (confirmed against the layouts)
  assert.deepEqual(rewriteFrontmatter({ 'watch-of': 'https://x' }), { url: 'https://x' })
  assert.deepEqual(rewriteFrontmatter({ 'read-of': 'https://x' }), { link: 'https://x' })
  assert.deepEqual(rewriteFrontmatter({ 'listen-of': 'https://x' }), { source: 'https://x' })
})

test('rewriteFrontmatter: drops mf2/engine noise and client directives', () => {
  const out = rewriteFrontmatter({
    'like-of': 'https://x',
    type: 'entry',
    client_id: 'https://quill.p3k.io',
    'mp-slug': 'custom',
    'mp-syndicate-to': 'https://mastodon',
    access_token: 'secret'
  })
  assert.deepEqual(out, { likeOf: 'https://x' })
})

test('rewriteFrontmatter: never carries `category` (it is inherited from the folder)', () => {
  // the engine maps Micropub category -> tags, so a stray `category` would be
  // unusual, but if one arrives it must not survive as the post-type field.
  const out = rewriteFrontmatter({ 'like-of': 'https://x', tags: ['css'] })
  assert.ok(!('category' in out))
})

test('rewriteFrontmatter: post-status draft -> draft:true, published omitted', () => {
  assert.deepEqual(rewriteFrontmatter({ 'post-status': 'draft' }), { draft: true })
  assert.deepEqual(rewriteFrontmatter({ 'post-status': 'published' }), {})
})

test('rewriteFrontmatter: visibility unlisted -> native key kept (build interprets it)', () => {
  assert.deepEqual(rewriteFrontmatter({ visibility: 'unlisted' }), { visibility: 'unlisted' })
})

test('rewriteFrontmatter: visibility private -> draft:true (unpublished)', () => {
  // no true "private" on a public static build — reuse the draft mechanism
  assert.deepEqual(rewriteFrontmatter({ visibility: 'private' }), { draft: true })
})

test('rewriteFrontmatter: visibility public / stray value -> dropped, never leaks a key', () => {
  assert.deepEqual(rewriteFrontmatter({ visibility: 'public' }), {})
  assert.deepEqual(rewriteFrontmatter({ visibility: 'whatever' }), {})
  // alongside a real key: only the real key survives — no stray `visibility:` line
  assert.deepEqual(
    rewriteFrontmatter({ 'like-of': 'https://x', visibility: 'public' }),
    { likeOf: 'https://x' }
  )
})

test('rewriteFrontmatter: tags merge keeps the firehose tag + user tags', () => {
  assert.deepEqual(rewriteFrontmatter({ tags: ['css', 'webdev'] }).tags, ['posts', 'css', 'webdev'])
  assert.deepEqual(rewriteFrontmatter({ tags: 'css' }).tags, ['posts', 'css'])
  // no de-dup surprises if the client already sent "posts"
  assert.deepEqual(rewriteFrontmatter({ tags: ['posts', 'css'] }).tags, ['posts', 'css'])
  // empty -> drop the key so the folder JSON's tags:"posts" is inherited
  assert.ok(!('tags' in rewriteFrontmatter({ tags: [] })))
  assert.ok(!('tags' in rewriteFrontmatter({ tags: '' })))
})

test('rewriteFrontmatter: flattens array / nested h-cite target values to a URL string', () => {
  assert.deepEqual(rewriteFrontmatter({ 'in-reply-to': ['https://x'] }), { inReplyTo: 'https://x' })
  assert.deepEqual(
    rewriteFrontmatter({ 'like-of': { type: 'cite', url: 'https://x', name: 'X' } }),
    { likeOf: 'https://x' }
  )
})

test('flatten: string / array / object', () => {
  assert.equal(flatten('https://x'), 'https://x')
  assert.equal(flatten(['https://x']), 'https://x')
  assert.equal(flatten({ url: 'https://x' }), 'https://x')
  assert.equal(flatten({ name: 'X' }), 'X')
})

test('contentSlug: first ~10 words of the body, slugified', () => {
  assert.equal(
    contentSlug('Just saw an incredible sunset over the fjord tonight, breathtaking and calm'),
    'just-saw-an-incredible-sunset-over-the-fjord-tonight-breathtaking'
  )
  assert.equal(contentSlug(''), '')
})

test('contentSlug: strips HTML in the body so markup never reaches the slug', () => {
  // regression: a note whose body carries an <a href> must not slug the markup
  assert.equal(
    contentSlug('A new note from Sparkles via the <a href="https://indieweb.org/Micropub">micropub</a> standard.'),
    'a-new-note-from-sparkles-via-the-micropub-standard'
  )
})

test('stripHtml: removes tags and entities', () => {
  assert.equal(stripHtml('Tom &amp; <em>Jerry</em>').replace(/\s+/g, ' ').trim(), 'Tom Jerry')
  assert.equal(stripHtml('<a href="https://x">link</a>').trim(), 'link')
})

test('targetSlug: last path segment, hostname fallback', () => {
  assert.equal(targetSlug({ inReplyTo: 'https://adactio.com/journal/21888' }), '21888')
  assert.equal(targetSlug({ repostOf: 'https://example.com/' }), 'examplecom')
  assert.equal(targetSlug({}), '')
})

test('slugify: lowercase, kebab, punctuation dropped', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world')
  assert.equal(slugify('  spaced   out  '), 'spaced-out')
})

// resolveFilename — the title-less re-slug guard. Re-slugging fires ONLY when the
// engine produced a bare timestamp (it had nothing to name from). A user mp-slug,
// a cite-derived slug, and any titled post are all left untouched.

test('resolveFilename: title-less + bare-timestamp slug -> re-slugged from content', () => {
  const { finalName } = resolveFilename(
    'src/posts/notes/1733436000.md',
    {},
    'Just saw an incredible sunset over the fjord tonight'
  )
  assert.equal(finalName, 'src/posts/notes/just-saw-an-incredible-sunset-over-the-fjord-tonight.md')
})

test('resolveFilename: title-less + bare-timestamp + no content -> target-URL slug', () => {
  const { finalName } = resolveFilename(
    'src/posts/replies/1733436000.md',
    { inReplyTo: 'https://adactio.com/journal/21888' },
    ''
  )
  assert.equal(finalName, 'src/posts/replies/21888.md')
})

test('resolveFilename: title-less + non-timestamp slug (mp-slug) -> preserved', () => {
  // regression: a user-supplied mp-slug must NOT be clobbered by the re-slug
  const { finalName } = resolveFilename(
    'src/posts/notes/my-custom-slug.md',
    {},
    'A note body that would otherwise drive the slug'
  )
  assert.equal(finalName, 'src/posts/notes/my-custom-slug.md')
})

test('resolveFilename: cite-derived slug (star-wars-1977) -> preserved (not a bare timestamp)', () => {
  const { finalName } = resolveFilename('src/posts/watching/star-wars-1977.md', {}, '')
  assert.equal(finalName, 'src/posts/watching/star-wars-1977.md')
})

test('resolveFilename: titled post -> never re-slugged', () => {
  const { finalName } = resolveFilename(
    'src/posts/articles/anna-karenina.md',
    { title: 'Anna Karenina' },
    'Happy families are all alike'
  )
  assert.equal(finalName, 'src/posts/articles/anna-karenina.md')
})

test('resolveFilename: bare timestamp with neither content nor target -> keeps the timestamp', () => {
  const { finalName } = resolveFilename('src/posts/notes/1733436000.md', {}, '')
  assert.equal(finalName, 'src/posts/notes/1733436000.md')
})

test('resolveFilename: a filename that does not match dir/folder/slug -> returned unchanged', () => {
  // the engine always emits CONTENT_DIR/<folder>/<slug>.md, but the helper must
  // pass anything else straight through rather than throw
  assert.deepEqual(resolveFilename('flat.md', {}, 'body'), { finalName: 'flat.md', location: null })
  assert.deepEqual(resolveFilename('', {}, ''), { finalName: '', location: null })
})
