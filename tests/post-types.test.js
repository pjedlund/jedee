// Post types can be switched off (settings.postTypes), and a type with nothing in it prints no page. Each build case makes a throwaway copy of the site. Run: node --test tests/post-types.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dump } from 'js-yaml'
import { makeTempSite } from './lib/temp-site.mjs'
import { POST_TYPES, POST_TYPE_DIRS, enabledPostTypes } from '../src/_config/collections.js'

const NOTE = '---\ntitle: A small note\ndate: 2026-01-01\n---\n\nHello.\n'
const TAGGED_NOTE = '---\ntitle: A tagged note\ndate: 2026-01-01\ntags:\n  - coffee\n---\n\nHello.\n'
const RECIPE = '---\ntitle: A small recipe\ndate: 2026-01-01\n---\n\nStir.\n'
const JAM = '---\ntitle: A small jam\ndate: 2026-01-01\nartist: Somebody\ngenre:\n  - "[[rock]]"\n---\n\nLoud.\n'
const featuredJam = dump({ posts: [{ type: 'jams', post: 'A small jam' }] })
const SHOW_FEATURED = { switches: { hideFeatured: false } }

test('enabledPostTypes: missing means all, [] means none, a list keeps only its types', () => {
  assert.deepEqual(enabledPostTypes({}), POST_TYPES)
  assert.deepEqual(enabledPostTypes({ postTypes: null }), POST_TYPES)
  assert.deepEqual(enabledPostTypes({ postTypes: [] }), [])
  assert.deepEqual(enabledPostTypes({ postTypes: ['recipe', 'note'] }), ['note', 'recipe'])
  assert.equal(POST_TYPES.length, 16)
  assert.deepEqual(Object.keys(POST_TYPE_DIRS).sort(), [...POST_TYPES].sort())
})

test('enabledPostTypes: a name that is not a post type stops the build, naming the setting and the value', () => {
  assert.throws(() => enabledPostTypes({ postTypes: ['note', 'notes'] }), /settings\.postTypes.*"notes"/)
  assert.throws(() => enabledPostTypes({ postTypes: 'note' }), /settings\.postTypes.*"note"/)
})

test('empty site prints no empty pages', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  for (const file of ['events/index.html', 'activities/index.html', 'tags/index.html', 'jams/genres/index.html']) assert.ok(!site.exists(file), `${file} is built with nothing to show`)
})

test('no postTypes setting builds all, and one untagged note prints no tags page', async t => {
  const site = await makeTempSite({ settings: { postTypes: null }, files: { 'src/posts/notes/A small note.md': NOTE, 'src/posts/recipes/A small recipe.md': RECIPE } })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(site.exists('notes/index.html'), 'the notes page is missing')
  assert.ok(site.exists('recipes/index.html'), 'the recipes page is missing')
  assert.ok(!site.exists('tags/index.html'), 'a tags page is built although no post has a tag')
  assert.ok(!site.exists('jams/genres/index.html'), 'a genres page is built although there are no jams')
})

test('switched-off type is gone: its pages, feed and menu link; the rest stays', async t => {
  const files = { 'src/posts/notes/A tagged note.md': TAGGED_NOTE, 'src/posts/recipes/A small recipe.md': RECIPE }
  const site = await makeTempSite({ settings: { postTypes: ['note'], switches: { hideNav: false } }, files })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(site.exists('notes/index.html'), 'the notes page is missing')
  assert.ok(site.exists('notes/feed.xml'), 'the notes feed is missing')
  assert.ok(site.exists('tags/coffee/index.html'), 'the tag page is missing')
  assert.ok(site.exists('tags/index.html'), 'the tags page is missing')
  assert.ok(!site.exists('recipes/index.html'), 'the recipes page is built')
  assert.ok(!site.exists('recipes/a-small-recipe/index.html'), 'the recipe is built')
  assert.ok(!site.exists('recipes/feed.xml'), 'the recipes feed is built')
  const nav = site.read('privacy/index.html').match(/<nav id="mainnav"[\s\S]*?<\/nav>/)
  assert.ok(nav, 'the menu is missing')
  assert.match(nav[0], /href="\/notes\/"/)
  assert.ok(!nav[0].includes('/recipes/'), 'the menu still links to the recipes')
  assert.ok(!site.read('sitemap.xml').includes('/recipes/'), 'the sitemap still lists the recipes')
})

test('postTypes: [] builds none of them', async t => {
  const site = await makeTempSite({ settings: { postTypes: [] }, files: { 'src/posts/notes/A small note.md': NOTE } })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(!site.exists('notes/index.html'), 'the notes page is built')
  assert.ok(!site.exists('notes/feed.xml'), 'the notes feed is built')
})

test('a pick from a switched-off type is left out and the build carries on', async t => {
  const files = { 'src/posts/jams/A small jam.md': JAM, 'src/_data/featured.yaml': featuredJam }
  const on = await makeTempSite({ settings: { ...SHOW_FEATURED, postTypes: ['note', 'jam'] }, files })
  t.after(() => on.cleanup())
  await on.build()
  assert.ok(on.read('index.html').includes('A small jam'), 'with jams on, the pick is missing from the home page, so this test proves nothing')
  assert.ok(on.exists('jams/genres/index.html'), 'a jam with a genre should get a genres page')

  const off = await makeTempSite({ settings: { ...SHOW_FEATURED, postTypes: ['note'] }, files })
  t.after(() => off.cleanup())
  await off.build()
  assert.ok(!off.read('index.html').includes('A small jam'), 'the pick is still on the home page')
  assert.ok(!off.exists('jams/genres/index.html'), 'a genres page is built although jams are off')
})

test('a misspelled pick still stops the build', async t => {
  const files = { 'src/posts/jams/A small jam.md': JAM, 'src/_data/featured.yaml': dump({ posts: [{ type: 'jams', post: 'A small jaam' }] }) }
  const site = await makeTempSite({ settings: { ...SHOW_FEATURED, postTypes: ['note'] }, files })
  t.after(() => site.cleanup())
  await assert.rejects(site.build(), /Picked post not found/)
})

test('a post type that is not one stops the build and names the setting', async t => {
  const site = await makeTempSite({ settings: { postTypes: ['notes'] } })
  t.after(() => site.cleanup())
  await assert.rejects(site.build(), /settings\.postTypes.*"notes"/)
})
