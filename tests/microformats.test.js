// mf2 structural verification for the h-entry root promotion (§6).
// Parses the BUILT html (dist/) of one representative page per post type and
// asserts the entry root, authorship, and per-type interaction property all
// parse INSIDE the h-entry — and that received webmentions do NOT pollute it.
//
// Requires a prior build:  npm run rebuild
// Run:  npm run test:unit            (auto-discovered by the tests/*.test.js glob)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mf2 } from 'microformats-parser'
import { author } from '../src/_data/meta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
// Mirror src/_data/meta.js exactly: absolute URLs in the built markup use
// process.env.URL (set by Netlify; pinned to localhost in .env for local dev),
// so the entry permalink/author URLs we assert against share that base.
const BASE = process.env.URL || 'http://localhost:8080'
const AUTHOR = author.name

// type -> built section directory (per-post pages live one level below)
const TYPE_DIR = {
  article: 'articles', note: 'notes', reply: 'replies', like: 'likes',
  repost: 'reposts', bookmark: 'bookmarks', rsvp: 'rsvps', reading: 'reading',
  watching: 'watching', jam: 'jams', photo: 'photos', audio: 'audio',
  video: 'videos', recipe: 'recipes', event: 'events'
}

// per-type interaction property expected INSIDE the entry (null = none expected)
const INTERACTION = {
  article: null, note: null,
  reply: 'in-reply-to', like: 'like-of', repost: 'repost-of',
  bookmark: 'bookmark-of', rsvp: 'in-reply-to',
  reading: 'read-of', watching: 'watch-of', jam: 'listen-of',
  photo: 'photo', audio: 'audio',
  video: null,  // sample may be an embed (no u-video by design) — generic invariants still apply
  recipe: null, event: null
}

// first built per-post page under a section dir (skip paginated archive dirs)
function firstEntryHtml(sectionDir) {
  const dir = join(DIST, sectionDir)
  if (!existsSync(dir)) return null
  const subs = readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('page'))
    .map(d => d.name).sort()
  for (const s of subs) {
    const f = join(dir, s, 'index.html')
    if (existsSync(f)) return readFileSync(f, 'utf8')
  }
  return null
}

function entryOf(html) {
  // microformats-parser v2 throws ERR_INVALID_URL on a relative <base href>.
  // Rewrite any relative base href to absolute before parsing.
  const fixedHtml = html.replace(
    /(<base\s[^>]*href=")(\/)([^"]*")/i,
    (_, pre, slash, rest) => `${pre}${BASE}/${rest}`
  )
  const { items } = mf2(fixedHtml, { baseUrl: BASE })
  return items.find(i => i.type.includes('h-entry'))
}

if (!existsSync(DIST)) {
  test('microformats: dist not built', (t) =>
    t.skip('Run `npm run rebuild` before this suite'))
} else {
  for (const [type, sectionDir] of Object.entries(TYPE_DIR)) {
    test(`h-entry root — ${type}`, (t) => {
      const html = firstEntryHtml(sectionDir)
      // A prod build (no BUILD_DRAFTS) omits draft-only types — every sample of
      // repost/rsvp/audio/video/recipe/event is currently draft:true, so those
      // sections build empty. Nothing to check ⇒ skip (as the suite already does
      // when dist/ is absent), don't red-X. `npm run rebuild` covers them.
      if (!html) {
        t.skip(`no built sample under dist/${sectionDir}/ — build with BUILD_DRAFTS=1 to cover ${type}`)
        return
      }
      const entry = entryOf(html)
      assert.ok(entry, `${type}: no h-entry root parsed (visible article is not the entry root)`)
      const p = entry.properties

      // Wart 2 — exactly one entry-level u-url (the permalink), not permalink+home
      assert.equal(p.url?.length, 1, `${type}: entry should have exactly one u-url (the permalink)`)
      assert.ok(p.url[0].startsWith(BASE), `${type}: entry u-url should be the absolute permalink`)

      // Wart 3 — author is a complete h-card (name + url + photo)
      assert.ok(p.author?.length, `${type}: entry has no p-author`)
      const card = p.author[0]
      assert.ok(card.type?.includes('h-card'), `${type}: author is not an h-card`)
      assert.equal(card.properties.name?.[0], AUTHOR, `${type}: author h-card name`)
      assert.ok(card.properties.url?.[0], `${type}: author h-card has no u-url`)
      assert.ok(card.properties.photo?.[0], `${type}: author h-card has no u-photo`)

      // e-content present inside the entry (the whole point: content nested under the root)
      assert.ok(p.content?.length, `${type}: e-content not inside the entry`)

      // Wart 1 — entry p-name is the post title, never the author name
      if (p.name?.length) {
        assert.notEqual(p.name[0].trim(), AUTHOR, `${type}: entry p-name leaked the author name`)
      }

      // per-type interaction property nested inside the entry
      const key = INTERACTION[type]
      if (key) assert.ok(p[key]?.length, `${type}: u-${key} did not parse inside the entry`)
      if (type === 'rsvp') assert.ok(p.rsvp?.length, 'rsvp: p-rsvp did not parse inside the entry')

      // event nests a visible h-event as a child root
      if (type === 'event') {
        assert.ok((entry.children || []).some(c => c.type?.includes('h-event')),
          'event: visible h-event does not nest inside the h-entry')
      }

      // received webmentions must NOT pollute the entry (they live outside it)
      if (['article', 'note', 'photo'].includes(type)) {
        assert.ok(!(entry.children || []).some(c => c.type?.includes('h-cite')),
          `${type}: a received webmention h-cite is nested inside the entry`)
      }
    })
  }
}
