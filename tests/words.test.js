// Language, locale and person-or-club are settings, and the interface words live in one file per language (src/_config/words). Run: node --test tests/words.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'
import { makeTempSite } from './lib/temp-site.mjs'

const root = path.resolve(import.meta.dirname, '..')

// Every .njk and .webc file that could hold a template, leaving out the content folders and tools' own folders.
const SKIP = new Set(['node_modules', '_raw', 'posts', 'wiki', '.obsidian', '.git'])
const templates = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : templates(full)
    return /\.(njk|webc)$/.test(entry.name) ? [full] : []
  })

const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
const typesIn = value => (value && typeof value === 'object' ? [].concat(value['@type'] || [], ...Object.values(value).map(typesIn)) : [])

test('every word used exists', () => {
  const english = load(readFileSync(path.join(root, 'src/_config/words/en.yaml'), 'utf8'))
  const missing = []
  for (const file of templates(path.join(root, 'src'))) {
    for (const [, key] of readFileSync(file, 'utf8').matchAll(/\bwords\.(\w+)/g)) {
      if (!(key in english)) missing.push(`${path.relative(root, file)}: words.${key}`)
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'Words used in templates but missing from src/_config/words/en.yaml')
})

test('language setting works', async t => {
  const site = await makeTempSite({ settings: { site: { lang: 'sv', locale: 'sv_SE' } }, files: { 'src/_config/words/sv.yaml': 'skipContent: Hoppa till innehållet\n' } })
  t.after(() => site.cleanup())
  await site.build()
  const home = site.read('index.html')
  assert.ok(home.includes('<html lang="sv"'), 'index.html is not marked lang="sv"')
  assert.ok(home.includes('Hoppa till innehållet'), "the Swedish skip link isn't there")
  assert.ok(home.includes('Keyboard shortcuts'), 'a word sv.yaml does not translate should show in English')
  assert.ok(home.includes('content="sv_SE"'), 'og:locale is not sv_SE')
})

test('unknown language stops the build', async t => {
  const site = await makeTempSite({ settings: { site: { lang: 'xx' } } })
  t.after(() => site.cleanup())
  await assert.rejects(site.build(), /site\.lang/)
})

test('unknown site type stops the build', async t => {
  const site = await makeTempSite({ settings: { site: { type: 'Company' } } })
  t.after(() => site.cleanup())
  await assert.rejects(site.build(), /site\.type/)
})

test('no site block still builds', async t => {
  const site = await makeTempSite({ settings: { site: null } })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(site.read('index.html').includes('<html lang="en"'), 'index.html is not marked lang="en"')
})

test('a site that is a club says Organization and never Person', async t => {
  const note = '---\ntitle: A note\ndate: 2026-01-01\n---\n\nText.\n'
  const event = '---\ntitle: A meeting\ndate: 2026-01-01\nevent:\n  start: 2026-06-14T10:00:00+02:00\n  location: The hall\n---\n\nText.\n'
  const site = await makeTempSite({ settings: { site: { type: 'Organization' } }, files: { 'src/posts/notes/a-note.md': note, 'src/posts/events/a-meeting.md': event } })
  t.after(() => site.cleanup())
  await site.build()
  const pages = { home: 'index.html', note: 'notes/a-note/index.html', event: 'events/a-meeting/index.html' }
  for (const [name, file] of Object.entries(pages)) {
    const blocks = jsonLd(site.read(file))
    assert.ok(blocks.length > 0, `${name} has no JSON-LD`)
    const types = blocks.flatMap(typesIn)
    assert.ok(!types.includes('Person'), `the ${name} page's JSON-LD still says Person: ${types.join(', ')}`)
    if (name !== 'home') assert.ok(types.includes('Organization'), `the ${name} page's JSON-LD does not say Organization: ${types.join(', ')}`)
  }
})

test('a site that is a person still says Person', async t => {
  const site = await makeTempSite({ files: { 'src/posts/notes/a-note.md': '---\ntitle: A note\ndate: 2026-01-01\n---\n\nText.\n' } })
  t.after(() => site.cleanup())
  await site.build()
  const types = jsonLd(site.read('notes/a-note/index.html')).flatMap(typesIn)
  assert.ok(types.includes('Person') && !types.includes('Organization'), `expected Person only, got ${types.join(', ')}`)
})

test('on a Swedish site activity titles are not marked Swedish again', async () => {
  const {default: computed} = await import('../src/_data/eleventyComputed.js')
  const activity = lang => ({category: 'activity', title: 'Morgonlöpning', meta: {lang}})
  assert.equal(computed.titleLang(activity('en')), 'sv')
  assert.equal(computed.titleLang(activity('sv')), undefined)
  assert.equal(computed.titleLang({...activity('sv'), titleLang: 'en'}), 'en')
})
