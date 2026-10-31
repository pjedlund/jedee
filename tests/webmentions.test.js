// Unit tests for the five webmention filters (src/_config/filters/webmentions.js).
// These are the pure slicing helpers the render partial composes; the data file
// (network/cache) is deliberately not exercised here. Asserted against a small
// JF2-shaped fixture mirroring webmention.io's `mentions.jf2` `children` array.
//
// Run: npm run test:unit   (or: node --test tests/webmentions.test.js)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  webmentionGetForUrl,
  webmentionisOwn,
  webmentionSort
} from '../src/_config/filters/webmentions.js'
import { author } from '../src/_data/meta.js'

const A = 'https://site.example/notes/a/'
const B = 'https://site.example/notes/b/'

// Minimal JF2 feed: two mentions on A (a like + a reply) and one own like on B.
const feed = {
  lastFetched: '2026-06-01T00:00:00.000Z',
  children: [
    {
      'wm-id': 1,
      'wm-target': A,
      'wm-property': 'like-of',
      'like-of': A,
      published: '2026-01-02T10:00:00Z',
      author: { name: 'Bob', url: 'https://bob.example', photo: 'https://bob.example/a.jpg' }
    },
    {
      'wm-id': 2,
      'wm-target': A,
      'wm-property': 'in-reply-to',
      'in-reply-to': A,
      published: '2026-01-01T10:00:00Z',
      content: { text: 'Nice one!' },
      author: { name: 'Carol', url: 'https://carol.example' }
    },
    {
      'wm-id': 3,
      'wm-target': B,
      'wm-property': 'like-of',
      'like-of': B,
      published: '2026-01-03T10:00:00Z',
      author: { name: author.name, url: author.website }
    }
  ]
}

test('webmentionGetForUrl: filters by wm-target', () => {
  const onA = webmentionGetForUrl(feed, A)
  assert.equal(onA.length, 2)
  assert.deepEqual(onA.map(m => m['wm-id']).sort(), [1, 2])

  assert.equal(webmentionGetForUrl(feed, B).length, 1)
  assert.equal(webmentionGetForUrl(feed, 'https://site.example/notes/zzz/').length, 0)
})

test('webmentionGetForUrl: a list of targets merges twins, one source reacting to both counts once', () => {
  assert.equal(webmentionGetForUrl(feed, [A, B]).length, 3)
  const twinFeed = { children: [
    { 'wm-id': 7, 'wm-target': A, 'wm-source': 'https://dan.example/1', 'wm-property': 'like-of' },
    { 'wm-id': 8, 'wm-target': B, 'wm-source': 'https://dan.example/1', 'wm-property': 'like-of' },
    { 'wm-id': 9, 'wm-target': B, 'wm-source': 'https://dan.example/1', 'wm-property': 'in-reply-to' }
  ] }
  assert.deepEqual(webmentionGetForUrl(twinFeed, [A, B]).map(m => m['wm-id']), [7, 9])
})

test('webmentionisOwn: true only for the site owner\'s identities', () => {
  // own apex URL
  assert.equal(webmentionisOwn({ author: { url: author.website } }), true)
  // every rel=me profile in settings
  assert.ok(author.me.length > 0, 'settings has no rel=me profiles to test')
  for (const url of author.me) assert.equal(webmentionisOwn({ author: { url } }), true, url)
  // a stranger
  assert.equal(webmentionisOwn({ author: { url: 'https://bob.example' } }), false)
  // no author / no url → falsy
  assert.equal(!!webmentionisOwn({}), false)
  assert.equal(!!webmentionisOwn({ author: {} }), false)
})

test('webmentionisOwn: true for the silo-post self-echo (brid.gy /post/ source)', () => {
  // Bridgy backfeeds a Flickr photo's own description as a mention-of with a
  // /post/ source — drop it, even though its author is a silo profile (Flickr),
  // not one of the site owner's own identity URLs.
  assert.equal(
    webmentionisOwn({
      'wm-source': 'https://brid.gy/post/flickr/36098627@N00/53236844443',
      author: { name: author.name, url: 'https://www.flickr.com/people/someone-else/' },
      content: { text: 'A photo caption' }
    }),
    true
  )
  // …but his own genuine comment (a /comment/ source) still renders.
  assert.equal(
    webmentionisOwn({
      'wm-source': 'https://brid.gy/comment/flickr/36098627@N00/53236844443/123',
      author: { name: author.name, url: 'https://www.flickr.com/people/someone-else/' },
      content: { text: 'Thanks a lot!' }
    }),
    false
  )
  // a stranger's comment is unaffected
  assert.equal(
    webmentionisOwn({
      'wm-source': 'https://brid.gy/comment/flickr/36098627@N00/53236844443/456',
      author: { name: 'Ludwig Römer', url: 'https://www.flickr.com/people/187551935@N04/' }
    }),
    false
  )
})

test('webmentionSort: oldest published first', () => {
  // ids 1 (Jan 02) and 2 (Jan 01) → sorted ascending → [2, 1]
  const onA = webmentionGetForUrl(feed, A)
  const sorted = webmentionSort([...onA])
  assert.deepEqual(sorted.map(m => m['wm-id']), [2, 1])
})
