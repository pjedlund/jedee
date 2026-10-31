// Unit tests for the webmention.io fetch (src/_config/utils/webmention-fetch.js).
// The point of this module is that it NEVER throws: webmention.io 502s intermittently,
// the fetch runs in production only, and before 2026-09-05 a failure took the whole
// Netlify deploy with it. Every case below must come back `false` so the caller keeps
// its cache and leaves `lastFetched` where it was.
//
// Run: npm run test:unit   (or: node --test tests/webmention-fetch.test.js)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fetchWebmentions } from '../src/_config/utils/webmention-fetch.js'

const ok = { domain: 'example.com', token: 'tok' }
const feed = { children: [{ 'wm-id': 1 }, { 'wm-id': 2 }] }

test('missing config returns false rather than attempting a fetch', async () => {
  const never = () => { throw new Error('should not have been called') }

  assert.equal(await fetchWebmentions({ token: 'tok', fetcher: never }), false)
  assert.equal(await fetchWebmentions({ domain: 'example.com', fetcher: never }), false)
})

test('a throwing fetch returns false instead of propagating', async () => {
  const badGateway = () => Promise.reject(new Error('Bad response for … (502): Bad Gateway'))

  assert.equal(await fetchWebmentions({ ...ok, fetcher: badGateway }), false)
})

test('a 200 that is not a JF2 feed counts as a failure', async () => {
  // Merging one of these would advance lastFetched past mentions never received.
  for (const body of [undefined, null, '', 'maintenance', {}, { children: 'nope' }]) {
    assert.equal(await fetchWebmentions({ ...ok, fetcher: async () => body }), false, `body: ${JSON.stringify(body)}`)
  }
})

test('a good feed comes back untouched', async () => {
  assert.deepEqual(await fetchWebmentions({ ...ok, fetcher: async () => feed }), feed)
})

test('an empty feed is a success, not a failure', async () => {
  // The common case on a quiet day: 200 with zero children. Must NOT be treated as
  // an error, or lastFetched would never advance and every build would refetch all.
  const empty = { children: [] }
  assert.deepEqual(await fetchWebmentions({ ...ok, fetcher: async () => empty }), empty)
})

test('since is only appended when given, and the token is passed through', async () => {
  let seen
  const capture = async url => { seen = url; return feed }

  await fetchWebmentions({ ...ok, fetcher: capture })
  assert.ok(seen.includes('domain=example.com'), seen)
  assert.ok(seen.includes('token=tok'), seen)
  assert.ok(!seen.includes('since='), seen)

  await fetchWebmentions({ ...ok, since: '2026-06-01T00:00:00.000Z', fetcher: capture })
  assert.ok(seen.includes('since=2026-06-01T00%3A00%3A00.000Z') || seen.includes('since=2026-06-01T00:00:00.000Z'), seen)
})
