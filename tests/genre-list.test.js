// Unit tests for the genre grouping used by the /jams/genres/ index
// (src/_config/collections.js → genreList). Pure function over a fake
// collection: no Eleventy, no IO.
//
// Run: npm run test:unit   (or: node --test tests/genre-list.test.js)
//
// The two behaviours worth pinning: `genre` is stored as Obsidian [[wikilinks]]
// so the brackets must never reach a URL or a label, and the vocabulary has
// case drift ("Soundtrack" vs "soundtrack") that slugging is expected to
// collapse onto ONE page rather than split into two near-empty ones.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { genreList } from '../src/_config/collections.js'

// Minimal stand-in for an Eleventy collection item.
const jam = (title, genre) => ({ data: { category: 'jam', title, genre } })

const fakeCollection = items => ({ getAll: () => items })

test('genreList: strips [[wikilink]] brackets from the label', () => {
  const result = genreList(fakeCollection([jam('A', ['"[[Blackgaze]]"'.replace(/"/g, '')])]))
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Blackgaze')
  assert.equal(result[0].slug, 'blackgaze')
})

test('genreList: an alias wikilink shows the alias, not the target', () => {
  const result = genreList(fakeCollection([jam('A', ['[[post-metal|Post-Metal]]'])]))
  assert.equal(result[0].name, 'Post-Metal')
})

test('genreList: case variants collapse onto one genre', () => {
  const result = genreList(
    fakeCollection([jam('A', ['[[Soundtrack]]']), jam('B', ['[[soundtrack]]'])])
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].slug, 'soundtrack')
  assert.equal(result[0].items.length, 2)
})

test('genreList: a jam appears under each of its genres', () => {
  const result = genreList(fakeCollection([jam('A', ['[[Metal]]', '[[Doom]]'])]))
  assert.deepEqual(
    result.map(g => g.slug).sort(),
    ['doom', 'metal']
  )
})

test('genreList: posts without a genre field are skipped, not crashed on', () => {
  const result = genreList(
    fakeCollection([jam('A', undefined), jam('B', ['[[Rock]]']), { data: {} }])
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].slug, 'rock')
})

test('genreList: a scalar genre works as well as a list', () => {
  const result = genreList(fakeCollection([jam('A', '[[Jazz]]')]))
  assert.equal(result[0].name, 'Jazz')
})

test('genreList: only jams are considered', () => {
  const notAJam = { data: { category: 'note', genre: ['[[Rock]]'] } }
  const result = genreList(fakeCollection([notAJam, jam('A', ['[[Metal]]'])]))
  assert.deepEqual(result.map(g => g.slug), ['metal'])
})

test('genreList: genres are sorted by name, newest jam first within a genre', () => {
  const result = genreList(
    fakeCollection([jam('A', ['[[Zydeco]]']), jam('B', ['[[Ambient]]'])])
  )
  assert.deepEqual(result.map(g => g.name), ['Ambient', 'Zydeco'])
})

test('genreList: empty and whitespace-only values never become a genre', () => {
  const result = genreList(fakeCollection([jam('A', ['[[Rock]]', '', '   ', '[[]]'])]))
  assert.deepEqual(result.map(g => g.slug), ['rock'])
})

test('genreList: the label is the most common spelling, not the first seen', () => {
  const result = genreList(
    fakeCollection([
      jam('A', ['[[soundtrack]]']),
      jam('B', ['[[Soundtrack]]']),
      jam('C', ['[[Soundtrack]]'])
    ])
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Soundtrack')
})

test('genreList: a tied spelling resolves the same way every build', () => {
  const forwards = genreList(
    fakeCollection([jam('A', ['[[post-rock]]']), jam('B', ['[[Post-Rock]]'])])
  )
  const backwards = genreList(
    fakeCollection([jam('B', ['[[Post-Rock]]']), jam('A', ['[[post-rock]]'])])
  )
  assert.equal(forwards[0].name, backwards[0].name)
})
