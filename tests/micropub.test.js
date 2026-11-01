// Unit tests for the pure transform layer of the Micropub Function.
// These cover the three "patch points" that make a posted entry indistinguishable
// from a clipped one — folder routing, timestamp-prefix stripping, and the
// kebab->camelCase frontmatter rewrite — plus the title-less slug strategy.
//
// Run: npm run test:unit   (or: node --test tests/micropub.test.js)
// Lives OUTSIDE netlify/functions/ on purpose: Netlify treats every .js file in
// that directory as a deployable function, so a test file there breaks the deploy.
// (Real-client auth is exercised against the token endpoint after the domain
// move — see the sequencing note in _local/project_docs/micropub-pattern.html.)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  slugify,
  stripHtml,
  contentSlug,
  targetSlug,
  flatten,
  upgradeCoverUrl,
  formatSlug,
  titleToFilename,
  titleFromContent,
  humanizeUrl,
  titleFromTarget,
  ensureTitle,
  rewriteFrontmatter,
  resolveFilename,
  workoutFile,
  ymd,
  TYPE_DIR,
  deriveWorkoutTitle
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

// Sparkles' Movie/Book/Listen editors nest the media's identity in an h-cite
// (name/photo/url/published/author/content) and send the poster again top-level
// as `featured`. We destructure the cite into the layout contract: title (the
// missing piece), cover, identity url/link/source, + year/author/plot.
test('rewriteFrontmatter: watch-of h-cite -> title/cover/url/year/plot (Sparkles film shape)', () => {
  const out = rewriteFrontmatter({
    'watch-of': {
      type: 'cite',
      name: 'Project Hail Mary',
      photo: 'https://img/poster.jpg',
      url: 'https://themoviedb.org/movie/687163',
      published: '2026',
      content: 'A lone astronaut must save the earth.'
    },
    featured: 'https://img/poster.jpg',
    summary: 'Watched Project Hail Mary, 2026 - ★★★',
    rating: 3,
    progress: 'finished'
  })
  assert.equal(out.title, 'Project Hail Mary')
  assert.equal(out.url, 'https://themoviedb.org/movie/687163')
  assert.equal(out.cover, 'https://img/poster.jpg')
  assert.equal(out.year, '2026')
  assert.equal(out.plot, 'A lone astronaut must save the earth.')
  // the raw cite key and the duplicate top-level poster never leak as frontmatter
  assert.ok(!('watch-of' in out))
  assert.ok(!('featured' in out))
  // Sparkles' review extras pass through untouched (the layout ignores them today)
  assert.equal(out.rating, 3)
  assert.equal(out.progress, 'finished')
  assert.equal(out.summary, 'Watched Project Hail Mary, 2026 - ★★★')
})

test('rewriteFrontmatter: read-of h-cite -> link + author (book)', () => {
  const out = rewriteFrontmatter({
    'read-of': {
      type: 'cite',
      name: 'Pride and Prejudice',
      author: 'Jane Austen',
      photo: 'https://img/cover.jpg',
      url: 'https://openlibrary.org/works/OL1394508W',
      published: '1813'
    }
  })
  assert.equal(out.title, 'Pride and Prejudice')
  assert.equal(out.link, 'https://openlibrary.org/works/OL1394508W')
  assert.equal(out.cover, 'https://img/cover.jpg')
  assert.equal(out.author, 'Jane Austen')
  assert.equal(out.year, '1813')
  // read/watch are unaffected by the listen split: creator stays `author`, and the
  // jam-only `artist`/`album` keys are never introduced.
  assert.ok(!('artist' in out))
  assert.ok(!('album' in out))
})

test('rewriteFrontmatter: listen-of h-cite -> source + title/album/cover/artist (jam)', () => {
  // a jam diverges from watch/read: the cite `name` fills BOTH `title` and `album`,
  // and the cite `author` becomes `artist` (NOT `author`) — matching the jam clippers
  // (apple-music / bandcamp) and the jam layout.
  const out = rewriteFrontmatter({
    'listen-of': {
      type: 'cite',
      name: 'Teardrop',
      author: 'Massive Attack',
      photo: 'https://img/art.jpg',
      url: 'https://song.link/abc'
    }
  })
  assert.equal(out.title, 'Teardrop')
  assert.equal(out.album, 'Teardrop')
  assert.equal(out.source, 'https://song.link/abc')
  assert.equal(out.cover, 'https://img/art.jpg')
  assert.equal(out.artist, 'Massive Attack')
  // the performer lands on `artist`, never `author` (watch/read's key)
  assert.ok(!('author' in out))
})

test('rewriteFrontmatter: top-level `featured` is the cover fallback when the cite has no photo', () => {
  const out = rewriteFrontmatter({
    'watch-of': { name: 'Birth', url: 'https://x' },
    featured: 'https://img/poster.jpg'
  })
  assert.equal(out.cover, 'https://img/poster.jpg')
})

test('rewriteFrontmatter: `featured` on a non-media post is dropped, never a stray cover', () => {
  // featured only folds into cover within a media-cite post; elsewhere it is noise
  assert.deepEqual(rewriteFrontmatter({ featured: 'https://x', 'like-of': 'https://y' }), { likeOf: 'https://y' })
})

test('rewriteFrontmatter: a custom mp-slug on a TITLED post -> a `slug` URL field (filename stays the title)', () => {
  // the slug routes to the URL via the permalink; the title still names the file
  const out = rewriteFrontmatter({
    'watch-of': { name: 'Project Hail Mary', url: 'https://x' },
    'mp-slug': 'custom-slug'
  })
  assert.equal(out.title, 'Project Hail Mary')
  assert.equal(out.slug, 'custom-slug')
})

test('rewriteFrontmatter: mp-slug on a TITLE-LESS post -> no `slug` field (the engine named the file)', () => {
  // a note/like already gets its filename from the mp-slug — a `slug` field would be redundant
  const out = rewriteFrontmatter({ 'like-of': 'https://x', 'mp-slug': 'my-like' })
  assert.ok(!('slug' in out))
  assert.deepEqual(out, { likeOf: 'https://x' })
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

test('rewriteFrontmatter: tags carry only the user tags; the folder JSON adds "posts"', () => {
  // the folder JSON's tags:"posts" is concatenated by Eleventy's data cascade, so
  // we must NOT re-add it here or the post double-tags ("posts" + "posts").
  assert.deepEqual(rewriteFrontmatter({ tags: ['css', 'webdev'] }).tags, ['css', 'webdev'])
  assert.deepEqual(rewriteFrontmatter({ tags: 'css' }).tags, ['css'])
  // a client that sends "posts" itself must not reintroduce the duplicate
  assert.deepEqual(rewriteFrontmatter({ tags: ['posts', 'css'] }).tags, ['css'])
  // only "posts" -> drop the key entirely; the folder JSON re-adds it
  assert.ok(!('tags' in rewriteFrontmatter({ tags: ['posts'] })))
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

// upgradeCoverUrl — thumbnail cover URLs from Sparkles' editors are upscaled to a
// full-resolution variant so the build self-hosts a sharp image, not a tiny one.
test('upgradeCoverUrl: Apple Music (mzstatic) 100x100 -> 1000x1000', () => {
  assert.equal(
    upgradeCoverUrl('https://is1-ssl.mzstatic.com/image/thumb/Features123/v4/aa/mza_1627.jpg/100x100bb.jpg'),
    'https://is1-ssl.mzstatic.com/image/thumb/Features123/v4/aa/mza_1627.jpg/1000x1000bb.jpg'
  )
  // any existing dimensions are normalized to 1000x1000
  assert.ok(upgradeCoverUrl('https://is5-ssl.mzstatic.com/x/400x400bb.png').endsWith('/1000x1000bb.png'))
})

test('upgradeCoverUrl: OpenLibrary -S / -M -> -L (the largest); -L unchanged', () => {
  assert.equal(
    upgradeCoverUrl('https://covers.openlibrary.org/b/id/12621800-M.jpg'),
    'https://covers.openlibrary.org/b/id/12621800-L.jpg'
  )
  assert.equal(
    upgradeCoverUrl('https://covers.openlibrary.org/b/id/12621800-S.jpg'),
    'https://covers.openlibrary.org/b/id/12621800-L.jpg'
  )
  assert.equal(
    upgradeCoverUrl('https://covers.openlibrary.org/b/id/12621800-L.jpg'),
    'https://covers.openlibrary.org/b/id/12621800-L.jpg'
  )
})

test('upgradeCoverUrl: unknown hosts and empty values pass through unchanged', () => {
  assert.equal(upgradeCoverUrl('https://example.com/cover.jpg'), 'https://example.com/cover.jpg')
  assert.equal(upgradeCoverUrl(''), '')
  assert.equal(upgradeCoverUrl(), '')
})

test('rewriteFrontmatter: a media cover from a known thumbnail host is upgraded to full-res', () => {
  const out = rewriteFrontmatter({
    'listen-of': {
      type: 'cite',
      name: 'Teardrop',
      photo: 'https://is1-ssl.mzstatic.com/image/thumb/x/mza.jpg/100x100bb.jpg',
      url: 'https://song.link/abc'
    }
  })
  assert.equal(out.cover, 'https://is1-ssl.mzstatic.com/image/thumb/x/mza.jpg/1000x1000bb.jpg')
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

test('resolveFilename: title-less + bare-timestamp slug -> re-slugged from content (no derived title)', () => {
  // fallback path: with no derived title passed, the content-slug still drives it
  const { finalName } = resolveFilename(
    'src/posts/notes/1733436000.md',
    {},
    'Just saw an incredible sunset over the fjord tonight'
  )
  assert.equal(finalName, 'src/posts/notes/just-saw-an-incredible-sunset-over-the-fjord-tonight.md')
})

test('resolveFilename: title-less + bare-timestamp -> slug from the derived title (notes/rsvp)', () => {
  // the primary path: the derived title drives the filename + URL, so file/URL/<h1> match
  const rsvp = resolveFilename(
    'src/posts/rsvps/1733436000.md',
    { inReplyTo: 'https://malmo.se/event' },
    'Linns studentfest. Kommer gärna på min brorsdotters studentfirande.',
    'Linns studentfest'
  )
  assert.equal(rsvp.finalName, 'src/posts/rsvps/linns-studentfest.md')

  const note = resolveFilename(
    'src/posts/notes/1733436000.md',
    {},
    'I feel we should update the parent repo with a tab',
    'I feel we should update'
  )
  assert.equal(note.finalName, 'src/posts/notes/i-feel-we-should-update.md')
})

test('resolveFilename: a derived title never overrides a user mp-slug (non-timestamp passes through)', () => {
  const { finalName } = resolveFilename(
    'src/posts/notes/my-custom-slug.md',
    {},
    'A note body',
    'A note body'
  )
  assert.equal(finalName, 'src/posts/notes/my-custom-slug.md')
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

test('resolveFilename: titled post -> Obsidian Title-Case filename (patch #2)', () => {
  // a film/book/note WITH a title is renamed to the title verbatim so Obsidian
  // [[wikilinks]] resolve; the permalink slugifies it, so the URL stays clean.
  const { finalName } = resolveFilename(
    'src/posts/watching/project-hail-mary-2026.md',
    { title: 'Project Hail Mary' },
    'My review'
  )
  assert.equal(finalName, 'src/posts/watching/Project Hail Mary.md')
})

test('resolveFilename: titled post already named from its title -> unchanged', () => {
  const { finalName } = resolveFilename(
    'src/posts/watching/Project Hail Mary.md',
    { title: 'Project Hail Mary' },
    ''
  )
  assert.equal(finalName, 'src/posts/watching/Project Hail Mary.md')
})

test('resolveFilename: a titled post keeps its Obsidian filename even with a custom slug (slug -> URL)', () => {
  // rewriteFrontmatter writes data.slug for a titled mp-slug post; the title still
  // names the file, and the slug only drives the URL (via the titled-type permalink).
  const { finalName } = resolveFilename(
    'src/posts/watching/custom-slug.md',
    { title: 'Project Hail Mary', slug: 'custom-slug' },
    ''
  )
  assert.equal(finalName, 'src/posts/watching/Project Hail Mary.md')
})

test('titleToFilename: keeps Title Case + spaces + commas, strips Obsidian-illegal chars', () => {
  assert.equal(titleToFilename('Project Hail Mary'), 'Project Hail Mary')
  assert.equal(titleToFilename('Paris, Texas'), 'Paris, Texas')
  assert.equal(titleToFilename('Dune: Part Two'), 'Dune Part Two')
  assert.equal(titleToFilename('Face/Off'), 'FaceOff')
  assert.equal(titleToFilename('  Spaced   Out  '), 'Spaced Out')
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

// Title derivation — every post should carry a title (a title-less post degrades
// in <title>, OG tags, feeds, the notes card headline, and the h-entry p-name).
// Media/article keep their own title; these cover the title-less types.

test('titleFromContent: first line, trailing periods trimmed, opening capitalized', () => {
  assert.equal(titleFromContent('Lorem ipsum dolar sit amet..'), 'Lorem ipsum dolar sit amet')
  // a short line (<= the word cap) is kept whole
  assert.equal(titleFromContent('Just saw an incredible sunset'), 'Just saw an incredible sunset')
  // a leading-lowercase note still gets a capitalized title
  assert.equal(titleFromContent('went for a walk today'), 'Went for a walk today')
})

test('titleFromContent: prefers the first sentence when a line packs several', () => {
  assert.equal(titleFromContent('Why bother? It is fine, really.'), 'Why bother?')
  assert.equal(titleFromContent('Lorem ipsum dolar sit amet.. And then more.'), 'Lorem ipsum dolar sit amet')
})

test('titleFromContent: strips HTML and leading markdown markers', () => {
  assert.equal(titleFromContent('> a quoted opening line'), 'A quoted opening line')
  assert.equal(titleFromContent('# A heading-style note'), 'A heading-style note')
})

test('titleFromContent: caps at ~6 words on a word boundary, no ellipsis', () => {
  // the title also becomes the filename/slug, so cut cleanly rather than signal "…"
  const title = titleFromContent(
    'This is a deliberately long note opening that runs well beyond the word cap we set'
  )
  assert.ok(!title.includes('…'))
  assert.ok(title.split(' ').length <= 6, `expected <=6 words, got "${title}"`)
  assert.equal(title, 'This is a deliberately long note')
})

test('titleFromContent: a dangling stopword left by the cut is trimmed', () => {
  // "...should update the" cuts at 6 words ending on a stopword -> trim it
  assert.equal(
    titleFromContent('I feel we should update the Example project parent repo'),
    'I feel we should update'
  )
  // HTML is stripped before the cap; "...from Sparkles via" -> "via" trimmed
  assert.equal(
    titleFromContent('A new note from Sparkles via the <a href="https://indieweb.org/Micropub">micropub</a> standard.'),
    'A new note from Sparkles'
  )
})

test('titleFromContent: empty / whitespace-only body -> empty string', () => {
  assert.equal(titleFromContent(''), '')
  assert.equal(titleFromContent('   \n  '), '')
})

test('humanizeUrl: drops scheme, www, and trailing slash', () => {
  assert.equal(humanizeUrl('https://themoviedb.org/movie/134'), 'themoviedb.org/movie/134')
  assert.equal(humanizeUrl('https://www.example.com/'), 'example.com')
  assert.equal(humanizeUrl('https://adactio.com/journal/21888'), 'adactio.com/journal/21888')
})

test('titleFromTarget: verb-phrase per response type, mirroring the card', () => {
  assert.equal(titleFromTarget({ likeOf: 'https://themoviedb.org/movie/134' }), 'Liked themoviedb.org/movie/134')
  assert.equal(titleFromTarget({ inReplyTo: 'https://adactio.com/journal/21888' }), 'In reply to adactio.com/journal/21888')
  assert.equal(titleFromTarget({ bookmarkOf: 'https://example.com/x' }), 'Bookmarked example.com/x')
  assert.equal(titleFromTarget({ repostOf: 'https://example.com/x' }), 'Reposted example.com/x')
  // rsvp carries both a value and the event URL; the value is checked first
  assert.equal(
    titleFromTarget({ rsvp: 'yes', inReplyTo: 'https://example.com/event' }),
    'RSVP yes to example.com/event'
  )
  assert.equal(titleFromTarget({}), '')
})

test('ensureTitle: keeps an existing title untouched (media/article)', () => {
  assert.deepEqual(ensureTitle({ title: 'O Brother, Where Art Thou?', url: 'https://x' }, 'My review'), {
    title: 'O Brother, Where Art Thou?',
    url: 'https://x'
  })
})

test('ensureTitle: content-first — a note gets its title from the body', () => {
  assert.deepEqual(ensureTitle({ draft: true }, 'Lorem ipsum dolar sit amet..'), {
    title: 'Lorem ipsum dolar sit amet',
    draft: true
  })
})

test('ensureTitle: a reply with a comment uses the comment (content-first)', () => {
  const out = ensureTitle({ inReplyTo: 'https://adactio.com/journal/21888' }, 'Great point, thanks for sharing.')
  assert.equal(out.title, 'Great point, thanks for sharing')
})

test('ensureTitle: a URL-only response uses the verb-phrase target', () => {
  assert.equal(ensureTitle({ likeOf: 'https://themoviedb.org/movie/134' }, '').title, 'Liked themoviedb.org/movie/134')
  assert.equal(ensureTitle({ repostOf: 'https://example.com/x' }, '').title, 'Reposted example.com/x')
})

test('ensureTitle: title is written first in the object', () => {
  assert.deepEqual(Object.keys(ensureTitle({ draft: true, date: 'd' }, 'A note')), ['title', 'draft', 'date'])
})

test('ensureTitle: a truly empty post (no content, no target) stays title-less', () => {
  assert.deepEqual(ensureTitle({ draft: true }, ''), { draft: true })
})

// Workout (Apple Watch -> iOS Shortcut). The Shortcut POSTs flat properties; the
// store maps them to the activity post's frontmatter, coerces the numbers, derives
// a title, and reroutes the file to src/posts/activities/.

test('rewriteFrontmatter: maps the workout properties + coerces the numbers', () => {
  const out = rewriteFrontmatter({
    activity: 'Run',
    distance: '5.2',
    duration: '1920',
    'heart-rate': '152',
    'max-heart-rate': '176',
    energy: '410',
    strava: 'https://www.strava.com/activities/123',
    livelox: 'https://www.livelox.com/x',
    date: '2026-06-29T08:30:00.000Z'
  })
  assert.equal(out.activityType, 'Run')
  assert.equal(out.distanceKm, 5.2) // number, not "5.2"
  assert.equal(out.duration, 1920)
  assert.equal(out.hrAvg, 152)
  assert.equal(out.hrMax, 176)
  assert.equal(out.energyKcal, 410)
  assert.equal(out.stravaUrl, 'https://www.strava.com/activities/123')
  assert.equal(out.liveloxUrl, 'https://www.livelox.com/x')
  assert.equal(out.date, '2026-06-29T08:30:00.000Z')
  // derived title carries the distance
  assert.equal(out.title, 'Run · 5.2 km')
  // the raw flat keys never leak through
  assert.ok(!('activity' in out) && !('distance' in out) && !('heart-rate' in out))
})

test('rewriteFrontmatter: `hr` is an accepted alias for heart-rate', () => {
  assert.equal(rewriteFrontmatter({ activity: 'Ride', hr: '138' }).hrAvg, 138)
})

test('rewriteFrontmatter: `hr-max` is an accepted alias for max-heart-rate', () => {
  assert.equal(rewriteFrontmatter({ activity: 'Run', 'hr-max': '181' }).hrMax, 181)
})

test('rewriteFrontmatter: a distance-less workout titles from the activity alone', () => {
  const out = rewriteFrontmatter({ activity: 'Strength', duration: '2700' })
  assert.equal(out.title, 'Strength')
  assert.ok(!('distanceKm' in out))
})

test('rewriteFrontmatter: empty / non-numeric workout values are skipped, never null/NaN', () => {
  const out = rewriteFrontmatter({ activity: 'Walk', distance: '', 'heart-rate': 'n/a', energy: '0' })
  assert.equal(out.activityType, 'Walk')
  assert.ok(!('distanceKm' in out)) // '' skipped
  assert.ok(!('hrAvg' in out)) // NaN skipped
  assert.equal(out.energyKcal, 0) // a real 0 survives
})

test('ymd: ISO date -> YYYY-MM-DD; unparseable -> empty', () => {
  assert.equal(ymd('2026-06-29T08:30:00.000Z'), '2026-06-29')
  assert.equal(ymd('not-a-date'), '')
})

test('workoutFile: reroutes notes/ -> activities/ with a dated kebab slug', () => {
  const { finalName } = workoutFile('src/posts/notes/1733436000.md', {
    title: 'Run · 5.2 km',
    date: '2026-06-29T08:30:00.000Z'
  })
  // slugify drops the decimal point (5.2 -> 52); the date prefix keeps repeats unique
  assert.equal(finalName, 'src/posts/activities/2026-06-29-run-52-km.md')
})

test('workoutFile: falls back to the activity when there is no title, and to no date prefix when undated', () => {
  assert.equal(
    workoutFile('src/posts/notes/123.md', { activityType: 'Strength' }).finalName,
    'src/posts/activities/strength.md'
  )
})

test('workoutFile: a filename that does not match dir/folder/slug -> unchanged', () => {
  assert.deepEqual(workoutFile('flat.md', { title: 'Run' }), { finalName: 'flat.md', location: null })
})

test('deriveWorkoutTitle: activity + distance when present, activity alone otherwise', () => {
  assert.equal(deriveWorkoutTitle('Run', 5.2), 'Run · 5.2 km')
  assert.equal(deriveWorkoutTitle('Strength', undefined), 'Strength')
  assert.equal(deriveWorkoutTitle('Strength', null), 'Strength')
})

test('rewriteFrontmatter: elevation-gain/elevation-loss + health-export-id map + coerce', () => {
  const out = rewriteFrontmatter({
    activity: 'Running',
    'elevation-gain': '120',
    'elevation-loss': '85.5',
    'health-export-id': 'abc-123'
  })
  assert.equal(out.elevationGain, 120)
  assert.equal(out.elevationLoss, 85.5)
  assert.equal(out.healthExportId, 'abc-123') // string, not coerced — not in WORKOUT_NUMERIC
  assert.ok(!('elevation-gain' in out) && !('elevation-loss' in out) && !('health-export-id' in out))
})
