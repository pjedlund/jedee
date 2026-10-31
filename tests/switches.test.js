// Everything that is always on has a switch, on by default. Each case builds a throwaway copy of the site. Run: node --test tests/switches.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { load } from 'js-yaml'
import { makeTempSite } from './lib/temp-site.mjs'
import { SWITCHES, resolveSwitches } from '../src/_config/utils/switches.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const NOTE = '---\ntitle: A small note\ndate: 2026-01-01\n---\n\nHello.\n'

// The page, plus every script file it loads: the deferred scripts are bundled into a file of their own.
function pageAndScripts(site, file) {
  const html = site.read(file)
  const scripts = [...html.matchAll(/<script[^>]*\ssrc="(\/[^"]+\.js)"/g)].map(match => match[1].slice(1)).filter(src => site.exists(src))
  return [html, ...scripts.map(src => site.read(src))].join('\n')
}

// What each switch puts on the page. ⚠ Look for markup or script text, never a bare class name: the inlined CSS names almost every class.
const MARKERS = {
  easteregg: '<custom-easteregg',
  shortcuts: 'id="shortcuts"',
  tooltips: '[data-tooltip]:is(:hover, :focus-visible)',
  devGrid: 'className="dev-grid"',
  themeToggle: 'id="theme-toggle"',
  serviceWorker: 'serviceWorker.register',
  webmentions: 'rel="webmention"',
  micropub: 'rel="micropub"',
  relMe: 'rel="me"',
  feeds: 'application/atom+xml',
  header: '<header class="site-header',
  breadcrumb: 'class="breadcrumb"',
  footer: '<footer class="site-footer',
}

// Markers that need no posts to show up. The menu needs posts and hideNav off, so it has a case of its own.
const PAGE = 'privacy/index.html'

test('every switch has a marker here', () => {
  assert.deepEqual(Object.keys(MARKERS).sort(), SWITCHES.filter(name => name !== 'mainNav').sort())
})

test('resolveSwitches: every switch is on unless settings say false', () => {
  const all = resolveSwitches({})
  assert.deepEqual(Object.keys(all).sort(), [...SWITCHES].sort())
  assert.ok(Object.values(all).every(value => value === true))
  assert.deepEqual(resolveSwitches({ switches: { feeds: false, hideNav: true } }).feeds, false)
  assert.deepEqual(resolveSwitches({ switches: { hideNav: true } }), all, 'a setting that is not a switch is left out')
  assert.throws(() => resolveSwitches({ switches: { feeds: 'no' } }), /switches\.feeds/)
})

test('on by default: the header, menu button area and footer are not empty', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  const page = pageAndScripts(site, PAGE)
  for (const [name, marker] of Object.entries(MARKERS)) assert.ok(page.includes(marker), `${name}: ${marker} is missing with the default settings`)
  // ⚠ A partial that renders to nothing inside a wrapped include would leave the tags and an empty shell, so look inside.
  const header = site.read(PAGE).match(/<header class="site-header[^>]*>([\s\S]*?)<\/header>/)[1]
  assert.match(header, /class="skip-link"/)
  assert.match(header, /class="breadcrumb"/)
  assert.match(header, /id="theme-toggle"/)
  const footer = site.read(PAGE).match(/<footer class="site-footer[^>]*>([\s\S]*?)<\/footer>/)[1]
  assert.match(footer, /footer-links/)
  assert.match(footer, /feed\.xml/)
  assert.match(footer, /rel="me"/)
})

for (const name of Object.keys(MARKERS)) {
  test(`${name} off: its marker is gone`, async t => {
    const site = await makeTempSite({ settings: { switches: { [name]: false } } })
    t.after(() => site.cleanup())
    await site.build()
    const page = pageAndScripts(site, PAGE)
    assert.ok(!page.includes(MARKERS[name]), `${MARKERS[name]} is still on the page`)
    const others = Object.entries(MARKERS).filter(([other]) => other !== name && !(name === 'header' && other === 'breadcrumb') && !(name === 'header' && other === 'themeToggle'))
    for (const [other, marker] of others) assert.ok(page.includes(marker), `turning ${name} off also removed ${other} (${marker})`)
  })
}

test('with posts, the menu is there; mainNav off takes it away', async t => {
  const files = { 'src/posts/notes/a-small-note.md': NOTE }
  const on = await makeTempSite({ settings: { switches: { hideNav: false } }, files })
  t.after(() => on.cleanup())
  await on.build()
  const nav = on.read(PAGE).match(/<nav id="mainnav"[\s\S]*?<\/nav>/)
  assert.ok(nav, 'the menu is missing')
  assert.match(nav[0], /href="\/notes\/"/)

  const off = await makeTempSite({ settings: { switches: { hideNav: false, mainNav: false } }, files })
  t.after(() => off.cleanup())
  await off.build()
  assert.ok(!off.read(PAGE).includes('id="mainnav"'), 'the menu is still there')
  assert.ok(off.read(PAGE).includes('<header class="site-header'), 'the header went with the menu')
})

test('header off: no header, no skip link, and the page is still there', async t => {
  const site = await makeTempSite({ settings: { switches: { header: false } } })
  t.after(() => site.cleanup())
  await site.build()
  const html = site.read(PAGE)
  assert.ok(!html.includes('skip-link"'), 'the skip link is still there')
  assert.ok(html.includes('id="main"'), 'the main area is gone')
})

test('breadcrumb off: the logo and name take its place', async t => {
  const site = await makeTempSite({ settings: { switches: { breadcrumb: false } } })
  t.after(() => site.cleanup())
  await site.build()
  assert.match(site.read(PAGE).match(/<header class="site-header[\s\S]*?<\/header>/)[0], /class="logo \| cluster"/)
})

test('feeds off: no feed files and no links to them', async t => {
  const site = await makeTempSite({ settings: { switches: { feeds: false } }, files: { 'src/posts/notes/a-small-note.md': NOTE } })
  t.after(() => site.cleanup())
  await site.build()
  const feeds = readdirSync(path.join(site.dir, 'dist'), { recursive: true }).filter(file => /(^|\/)feed\.(xml|json)$/.test(file))
  assert.deepEqual(feeds, [])
  assert.ok(!site.exists('notes/feed.xml'), 'the notes feed is still built')
  const page = site.read(PAGE)
  assert.ok(!page.includes('feed.xml') && !page.includes('feed.json'), 'a link to a feed is left')
})

test('feeds on: the feed files are built', async t => {
  const site = await makeTempSite({ files: { 'src/posts/notes/a-small-note.md': NOTE } })
  t.after(() => site.cleanup())
  await site.build()
  for (const file of ['feed.xml', 'feed.json', 'notes/feed.xml']) assert.ok(site.exists(file), `${file} is missing`)
})

test('serviceWorker off: no file, no registration; on: both', async t => {
  const off = await makeTempSite({ settings: { switches: { serviceWorker: false } } })
  t.after(() => off.cleanup())
  await off.build()
  assert.ok(!off.exists('serviceworker.js'), '/serviceworker.js is still written')
  const on = await makeTempSite()
  t.after(() => on.cleanup())
  await on.build()
  assert.ok(on.exists('serviceworker.js'), '/serviceworker.js is missing')
})

// A saved reply for the note, as the build-time fetch would have left it in .cache.
const SAVED = JSON.stringify({ lastFetched: '2026-01-02T00:00:00.000Z', children: [{ 'wm-id': 1, 'wm-source': 'https://friend.example/reply', 'wm-target': 'http://localhost:8080/notes/a-small-note/', 'wm-property': 'in-reply-to', published: '2026-01-02T10:00:00Z', content: { text: 'A saved reply text' }, author: { name: 'A Friend', url: 'https://friend.example' } }] })

test('webmentions: saved ones show on a note, and not when the switch is off', async t => {
  const files = { 'src/posts/notes/a-small-note.md': NOTE, '.cache/webmentions.json': SAVED }
  const on = await makeTempSite({ files })
  t.after(() => on.cleanup())
  await on.build()
  assert.match(on.read('notes/a-small-note/index.html'), /A saved reply text/)

  const off = await makeTempSite({ settings: { switches: { webmentions: false } }, files })
  t.after(() => off.cleanup())
  await off.build()
  assert.doesNotMatch(off.read('notes/a-small-note/index.html'), /A saved reply text|class="webmentions/)
})

// The form: a yes/no field missing from settings.yaml is saved as false, which would turn that part of the site off.
const config = load(readFileSync(path.join(ROOT, 'admin/config.yml'), 'utf8'))
const settingsForm = config.singletons.find(single => single.file === 'src/_data/settings.yaml')

test('the Sveltia form has a yes/no field for every switch, and settings.yaml holds a value for each', () => {
  const fields = settingsForm.fields.find(field => field.name === 'switches').fields
  const settings = load(readFileSync(path.join(ROOT, 'src/_data/settings.yaml'), 'utf8'))
  for (const name of SWITCHES) {
    assert.equal(fields.find(field => field.name === name)?.widget, 'boolean', `switches.${name} has no yes/no field in admin/config.yml`)
    assert.equal(typeof settings.switches[name], 'boolean', `switches.${name} is not in settings.yaml`)
  }
})

// ⚠ The report needs the `yaml` package (Sveltia's own YAML library), which this project does not list as a dependency yet; without it the case is skipped, not passed.
let hasYaml = true
try { createRequire(path.join(ROOT, 'package.json')).resolve('yaml') } catch { hasYaml = false }

test('a Sveltia save of settings.yaml keeps theme, site, analytics, postTypes and every switch', { skip: !hasYaml && 'the yaml package is not installed' }, () => {
  const run = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'tests/sveltia-roundtrip.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const report = run().split('\n')
  assert.match(report.find(row => row.startsWith('src/_data/settings.yaml:')) ?? '', /values identical/)
  assert.deepEqual(report.filter(row => row.includes('src/_data/settings.yaml:') && row.includes('!')), [])
  const saved = load(run('src/_data/settings.yaml'))
  const before = load(readFileSync(path.join(ROOT, 'src/_data/settings.yaml'), 'utf8'))
  for (const key of ['theme', 'site', 'analytics', 'postTypes']) if (key in before) assert.deepEqual(saved[key], before[key], `${key} changes in a save`)
  for (const name of SWITCHES) assert.equal(saved.switches[name], before.switches[name], `switches.${name} is lost or changed in a save`)
})
