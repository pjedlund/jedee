// Unit test for the language-twin lookup (src/_config/filters/twin.js). Run: npm run test:unit
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { twinOf } from '../src/_config/filters/twin.js'

const en = { url: '/projects/bethink-yourselves/', data: { translation: '/projects/betanken-eder/' } }
const sv = { url: '/projects/betanken-eder/', data: { lang: 'sv' } }
const other = { url: '/notes/x/', data: {} }
const all = [en, sv, other]

test('twinOf: either side finds the other, a page without a twin finds nothing', () => {
  assert.equal(twinOf(all, en.url, en.data.translation), sv)
  assert.equal(twinOf(all, sv.url, sv.data.translation), en)
  assert.equal(twinOf(all, other.url, other.data.translation), undefined)
})
