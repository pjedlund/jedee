// Everything that is always on has a switch, on by default. Each case builds a throwaway copy of the site. Run: node --test tests/switches.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
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

// ⚠ A site's settings may turn some off, so these cases name them; left to the file, a marker can be missing for the wrong reason.
const ALL_ON = Object.fromEntries(Object.keys(MARKERS).map(name => [name, true]))

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

test('a settings file with no switches block builds with every marker in place', async t => {
  const site = await makeTempSite({ settings: { switches: null } })
  t.after(() => site.cleanup())
  await site.build()
  const page = pageAndScripts(site, PAGE)
  for (const [name, marker] of Object.entries(MARKERS)) assert.ok(page.includes(marker), `${name}: ${marker} is missing when settings have no switches`)
})

test('the shortcuts dialog lists the search keys only when there is a search to use them in', async t => {
  const on = await makeTempSite()
  t.after(() => on.cleanup())
  await on.build()
  assert.ok(on.read(PAGE).includes('<kbd>K</kbd>'), 'the search key is missing')
  const off = await makeTempSite({ settings: { switches: { header: false } } })
  t.after(() => off.cleanup())
  await off.build()
  assert.ok(off.read(PAGE).includes('id="shortcuts"') && !off.read(PAGE).includes('<kbd>K</kbd>'), 'the dialog still lists the search keys')
})

test('on: the header, menu button area and footer are not empty', async t => {
  const site = await makeTempSite({ settings: { switches: ALL_ON } })
  t.after(() => site.cleanup())
  await site.build()
  const page = pageAndScripts(site, PAGE)
  for (const [name, marker] of Object.entries(MARKERS)) assert.ok(page.includes(marker), `${name}: ${marker} is missing with every switch on`)
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
    const site = await makeTempSite({ settings: { switches: { ...ALL_ON, [name]: false } } })
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
  assert.ok(!site.read(PAGE).includes('BreadcrumbList'), 'the trail is still in the structured data')
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
  const on = await makeTempSite({ settings: { switches: { webmentions: true } }, files })
  t.after(() => on.cleanup())
  await on.build()
  assert.match(on.read('notes/a-small-note/index.html'), /A saved reply text/)
  assert.match(on.read('notes/a-small-note/index.html'), /indieweb\.org\/Webmention/, 'the invitation to send one is missing')

  const off = await makeTempSite({ settings: { switches: { webmentions: false } }, files })
  t.after(() => off.cleanup())
  await off.build()
  assert.doesNotMatch(off.read('notes/a-small-note/index.html'), /A saved reply text|class="webmentions/)
  assert.doesNotMatch(off.read('notes/a-small-note/index.html'), /indieweb\.org\/Webmention/, 'the invitation to send one is still there')
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

test('a Sveltia save of settings.yaml keeps theme, site, analytics, postTypes and every switch', () => {
  const run = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'tests/sveltia-roundtrip.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const report = run().split('\n')
  assert.match(report.find(row => row.startsWith('src/_data/settings.yaml:')) ?? '', /values identical/)
  assert.deepEqual(report.filter(row => row.includes('src/_data/settings.yaml:') && row.includes('!')), [])
  const saved = load(run('src/_data/settings.yaml'))
  const before = load(readFileSync(path.join(ROOT, 'src/_data/settings.yaml'), 'utf8'))
  for (const key of ['theme', 'site', 'analytics', 'postTypes']) if (key in before) assert.deepEqual(saved[key], before[key], `${key} changes in a save`)
  for (const name of SWITCHES) assert.equal(saved.switches[name], before.switches[name], `switches.${name} is lost or changed in a save`)
})

test('humans.txt names no tool that belongs to one site, and a theme can add its tools', async t => {
  const plain = await makeTempSite()
  t.after(() => plain.cleanup())
  await plain.build()
  const text = plain.read('humans.txt')
  for (const tool of ['Warp', 'Nova', 'Penpot', 'Obsidian', 'Claude Code', 'Cloudflare R2']) assert.ok(!text.includes(tool), `humans.txt still names ${tool}`)
  assert.match(text, /Components: 11ty, Eleventy Excellent/)
  assert.ok(!text.includes('Software:'), 'an empty Software line is left behind')

  const themed = await makeTempSite({ files: { 'src/_includes/themes/sample/words.yaml': 'humansComponents: 11ty and a shed\nhumansSoftware: A pencil\n' } })
  t.after(() => themed.cleanup())
  await themed.build()
  assert.match(themed.read('humans.txt'), /Components: 11ty and a shed\n\s*Software: A pencil/)
})

// A bare page: every switch off, no post types, as `npm run bare` builds it. Tests of what it carries add their pages through `files`.
const BARE_SWITCHES = Object.fromEntries([...SWITCHES, 'nameReveal', 'viewRepo'].map(name => [name, false]))
const bareSite = (files = {}) => makeTempSite({ settings: { postTypes: [], switches: BARE_SWITCHES }, files })
const pageFile = (slug, body) => ({ [`src/pages/${slug}.njk`]: `---\ntitle: ${slug}\nlayout: base\npermalink: /${slug}/\n---\n\n${body}\n` })
const IS_LAND = '/assets/components/is-land.min.js'

test('is-land: a page with no island asks for no script', async t => {
  const site = await bareSite(pageFile('words', '<p>Just words.</p>'))
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(!site.read('words/index.html').includes(IS_LAND), 'the bare page still loads is-land')
})

// ⚠ The half that matters: a wrong gate makes islands silently never start, and an embed only becomes an <is-land> after WebC has run.
test('is-land: a page whose only island comes from a YouTube embed still loads the script', async t => {
  const site = await bareSite(pageFile('tube', '<custom-youtube @slug="abc123" @label="A film"></custom-youtube>'))
  t.after(() => site.cleanup())
  await site.build()
  const html = site.read('tube/index.html')
  assert.match(html, /<is-land\b/, 'the embed did not render an island')
  assert.ok(html.includes(IS_LAND), 'an island with no is-land script never starts')
})

test('is-land: the theme toggle, an island in the header, still gets the script', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  const html = site.read(PAGE)
  assert.match(html, /<is-land\b/)
  assert.ok(html.includes(IS_LAND))
})

test('speculation rules: only on a page with a link on the site to fetch ahead', async t => {
  const site = await bareSite({
    ...pageFile('words', '<p>Just words.</p>'),
    ...pageFile('outward', '<p><a href="https://example.org/">Away</a> and <a href="#here">here</a>.</p>'),
    ...pageFile('linked', '<p><a href="/words/">Words</a>.</p>'),
  })
  t.after(() => site.cleanup())
  await site.build()
  const rules = '"speculationrules"'
  assert.ok(!site.read('words/index.html').includes(rules), 'a page with no links carries the rules')
  assert.ok(!site.read('outward/index.html').includes(rules), 'a page with no link on the site carries the rules')
  assert.ok(site.read('linked/index.html').includes(rules), 'a page with a link on the site lost the rules')
})

const SHARE_PICTURE = 'src/assets/images/template/opengraph-default.jpg'
const SHARE_TAGS = ['og:image"', 'og:image:alt', 'og:image:width', 'og:image:height', 'twitter:card', 'twitter:image:alt']

test('share-image tags: a site with no default picture prints none on a page with no picture', async t => {
  const site = await bareSite({ [SHARE_PICTURE]: null, ...pageFile('words', '<p>Just words.</p>') })
  t.after(() => site.cleanup())
  await site.build()
  const html = site.read('words/index.html')
  for (const tag of SHARE_TAGS) assert.ok(!html.includes(tag), `${tag} is on a page with no picture to name`)
  assert.ok(html.includes('og:title'), 'the other share tags went too')
})

test('share-image tags: a page with its picture has them, and a default picture covers the rest', async t => {
  const withPicture = { 'src/pages/pictured.njk': '---\ntitle: Pictured\nlayout: base\npermalink: /pictured/\nogImage:\n  url: /assets/images/a.jpg\n  width: 800\n  height: 600\n---\n<p>Words.</p>\n' }
  const noDefault = await bareSite({ [SHARE_PICTURE]: null, ...withPicture })
  t.after(() => noDefault.cleanup())
  await noDefault.build()
  const pictured = noDefault.read('pictured/index.html')
  for (const tag of SHARE_TAGS) assert.ok(pictured.includes(tag), `${tag} is missing from a page with a picture`)
  assert.match(pictured, /og:image"\s+content="[^"]*\/assets\/images\/a\.jpg"/)

  const withDefault = await bareSite(pageFile('words', '<p>Just words.</p>'))
  t.after(() => withDefault.cleanup())
  await withDefault.build()
  const words = withDefault.read('words/index.html')
  for (const tag of SHARE_TAGS) assert.ok(words.includes(tag), `${tag} is missing where the default picture applies`)
  assert.match(words, /og:image"\s+content="[^"]*opengraph-default\.jpg"/)
})

test('search.json: not built with the header off, built with it on', async t => {
  const off = await makeTempSite({ settings: { switches: { header: false } } })
  t.after(() => off.cleanup())
  await off.build()
  assert.ok(!off.exists('search.json'), 'search.json is built with no header to search from')
  const on = await makeTempSite({ settings: { switches: { header: true } } })
  t.after(() => on.cleanup())
  await on.build()
  assert.ok(on.exists('search.json'), 'search.json is missing with the header on')
})
