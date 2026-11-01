// Unit tests for the search index builder (src/_config/search-index.js).
// Pure functions over fake collection items: no Eleventy, no IO.
//
// Run: npm run test:unit   (or: node --test tests/search-index.test.js)
//
// What is worth pinning: the strip has to survive the markdown this site actually
// writes (wikilinks, fenced code, image refs), the excerpt has to cope with the 63
// orienteering posts that have no body at all, and `only` has to narrow activities
// to orienteering without touching any other type.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { stripMarkdown, excerpt, buildIndex } from '../src/_config/search-index.js'

// Minimal stand-in for an Eleventy collection item.
const item = (data, rawInput = '', url = '/x/') => ({
  url,
  date: new Date('2026-01-01'),
  data: { ...data, page: { rawInput } }
})

test('stripMarkdown: keeps link text and drops the URL', () => {
  assert.equal(stripMarkdown('see [the notes](/notes/) here'), 'see the notes here')
})

test('stripMarkdown: drops wikilink brackets but keeps the label', () => {
  assert.equal(stripMarkdown('a [[Blackgaze]] record'), 'a Blackgaze record')
})

test('stripMarkdown: keeps the alias, not the target, in a piped wikilink', () => {
  assert.equal(stripMarkdown('[[post-metal|Post-Metal]] again'), 'Post-Metal again')
})

test('stripMarkdown: removes fenced code blocks entirely', () => {
  assert.equal(stripMarkdown('before\n```js\nconst x = 1\n```\nafter'), 'before after')
})

test('stripMarkdown: removes image references', () => {
  assert.equal(stripMarkdown('look ![a moon](/moon.jpg) there'), 'look there')
})

test('stripMarkdown: removes heading markers but keeps the heading text', () => {
  assert.equal(stripMarkdown('## A Heading\nbody'), 'A Heading body')
})

test('stripMarkdown: removes HTML comments, so authoring TODOs stay unsearchable', () => {
  assert.equal(stripMarkdown('body <!-- TODO: add photos --> more'), 'body more')
})

test('stripMarkdown: collapses runs of whitespace', () => {
  assert.equal(stripMarkdown('a   b\n\n\nc'), 'a b c')
})

test('stripMarkdown: empty input returns an empty string', () => {
  assert.equal(stripMarkdown(''), '')
  assert.equal(stripMarkdown(undefined), '')
})

test('excerpt: cuts to the limit and trims', () => {
  assert.equal(excerpt('abcdef ghij', 7), 'abcdef')
})

test('excerpt: cuts at a word boundary, never mid-word', () => {
  assert.equal(excerpt('the quick brown fox jumps', 14), 'the quick')
})

test('excerpt: text shorter than the limit is returned whole', () => {
  assert.equal(excerpt('short', 140), 'short')
})

test('stripMarkdown: removes Nunjucks expressions, which rawInput still carries', () => {
  assert.equal(stripMarkdown('{{ personal.address }} and {% if x %}y{% endif %}'), 'and y')
})

test('excerpt: a body-less post yields an empty excerpt, not a crash', () => {
  assert.equal(excerpt(''), '')
})

test('buildIndex: an entry carries url, title, type, date, text and keywords', () => {
  const collections = { note: [item({ title: 'A Note', category: 'note' }, 'Body text here.', '/notes/a-note/')] }
  const [entry] = buildIndex(collections, { types: ['note'], only: {} })
  assert.equal(entry.url, '/notes/a-note/')
  assert.equal(entry.title, 'A Note')
  assert.equal(entry.type, 'note')
  assert.equal(entry.date, new Date('2026-01-01').getTime())
  assert.equal(entry.text, 'Body text here.')
  assert.match(entry.keywords, /a note/)
  assert.match(entry.keywords, /body text here/)
})

test('buildIndex: keywords are lowercased and include the tags', () => {
  const collections = { note: [item({ title: 'Loud', category: 'note', tags: ['music', 'Gear'] }, 'Hi')] }
  const [entry] = buildIndex(collections, { types: ['note'], only: {} })
  assert.match(entry.keywords, /music/)
  assert.match(entry.keywords, /gear/)
  assert.equal(entry.keywords, entry.keywords.toLowerCase())
})

test('buildIndex: `only` narrows activities to orienteering', () => {
  const collections = {
    activity: [
      item({ title: 'ParkOL', category: 'activity', activityType: 'orienteering' }),
      item({ title: 'Morning Run', category: 'activity', activityType: 'run' })
    ]
  }
  const entries = buildIndex(collections, { types: ['activity'], only: { activity: { activityType: 'orienteering' } } })
  assert.equal(entries.length, 1)
  assert.equal(entries[0].title, 'ParkOL')
})

test('buildIndex: a type absent from `only` is indexed whole', () => {
  const collections = { note: [item({ title: 'A', category: 'note' }), item({ title: 'B', category: 'note' })] }
  assert.equal(buildIndex(collections, { types: ['note'], only: { activity: { activityType: 'orienteering' } } }).length, 2)
})

test('buildIndex: a page with no category is typed as `page`', () => {
  const collections = { searchable: [item({ title: 'About' }, 'Hello', '/about/')] }
  const [entry] = buildIndex(collections, { types: ['searchable'], only: {} })
  assert.equal(entry.type, 'page')
})

test('buildIndex: a missing collection is skipped, not thrown on', () => {
  assert.deepEqual(buildIndex({}, { types: ['note', 'jam'], only: {} }), [])
})

test('buildIndex: a body-less post still produces an entry', () => {
  const collections = { activity: [item({ title: 'Snogeholmsskogen', category: 'activity' }, '')] }
  const [entry] = buildIndex(collections, { types: ['activity'], only: {} })
  assert.equal(entry.text, '')
  assert.match(entry.keywords, /snogeholmsskogen/)
})
