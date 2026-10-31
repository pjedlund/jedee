// A page's <style> holds only the CSS of the pieces on that page. Each case builds a throwaway copy of the site. Run: node --test tests/css-split.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTempSite } from './lib/temp-site.mjs'

const PAGE = 'privacy/index.html'
const NOTE = '---\ntitle: A small note\ndate: 2026-01-01\n---\n\nHello.\n'
const STANDALONE = body => `---\ntitle: A plain page\nlayout: page\npermalink: /plain/\n---\n\n${body}\n`

// ⚠ .mainnav alone proves nothing: nav-menu-cls.css supplies it too, so .megamenu-label stands for main-nav.css.
const CHROME = ['.site-header', '.mainnav', '.megamenu-label', '.breadcrumb', '.theme-toggle', '.site-footer', '[data-tooltip']
const SMALL_PIECES = { kbd: 'kbd:not(:has(kbd))', section: '.section__inner', textgradient: '.gradient-text' }

const styleOf = (site, file) => [...site.read(file).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n')

test('header off, no header CSS', async t => {
  const site = await makeTempSite({ settings: { switches: { header: false, footer: false, tooltips: false, shortcuts: false } } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, PAGE)
  for (const selector of CHROME) assert.ok(!style.includes(selector), `${selector} is still in the page's CSS`)
  for (const [name, selector] of Object.entries(SMALL_PIECES)) assert.ok(!style.includes(selector), `${name}: ${selector} is in the CSS of a page that doesn't use it`)
})

// ⚠ The menu only prints with a post to list and hideNav off.
test('header on, CSS present', async t => {
  const site = await makeTempSite({ settings: { switches: { hideNav: false } }, files: { 'src/posts/notes/a-small-note.md': NOTE } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, PAGE)
  for (const selector of CHROME) assert.ok(style.includes(selector), `${selector} is missing from the page's CSS`)
})

test('moved CSS keeps its old place: the layer order is declared first, and the pieces sit in the blocks layer', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  const [global, local] = [...site.read(PAGE).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1])
  assert.match(global, /^@layer tailwindBase, *reset, *fonts, *tailwindComponents, *variables, *global, *compositions, *blocks, *cubeUtilities, *tailwindUtilities, *theme;/)
  assert.match(local, /@layer blocks\{\.site-footer/)
})

test('kbd, section and textgradient load when the page uses them, without the switches that also bring them', async t => {
  const body = '<kbd>K</kbd> <div class="section"><div class="section__inner">In a band.</div></div> <h2 class="gradient-text">Shiny</h2>'
  const site = await makeTempSite({ settings: { switches: { shortcuts: false } }, files: { 'src/pages/plain.md': STANDALONE(body) } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, 'plain/index.html')
  for (const [name, selector] of Object.entries(SMALL_PIECES)) assert.ok(style.includes(selector), `${name}: ${selector} is missing`)
  const other = styleOf(site, PAGE)
  for (const [name, selector] of Object.entries(SMALL_PIECES)) assert.ok(!other.includes(selector), `${name}: ${selector} is on a page that doesn't use it`)
})

test('the shortcuts dialog brings the key caps with it', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(styleOf(site, PAGE).includes(SMALL_PIECES.kbd))
})

// ⚠ A default page has a footer and a dialog that both bring buttons, so a bare page turns off everything around the content.
const BARE = { header: false, footer: false, shortcuts: false, tooltips: false, easteregg: false, themeToggle: false }
const BARE_PAGE = '---\ntitle: Bare\nlayout: base\npermalink: /bare/\n---\n\n<p>Just words.</p>\n'
// ⚠ As a class, not as the start of .prose-wrapper, which is a composition and stays.
const PROSE = /\.prose(?![\w-])/
const copies = (text, piece) => text.split(piece).length - 1

test('bare page has no article or code CSS', async t => {
  const site = await makeTempSite({ settings: { switches: BARE }, files: { 'src/pages/bare.njk': BARE_PAGE } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, 'bare/index.html')
  assert.doesNotMatch(style, PROSE)
  for (const piece of ['pre[class', '.button', 'activity', 'place-map', '.token']) assert.ok(!style.includes(piece), `${piece} is in the CSS of a bare page`)
  assert.ok(style.includes('--line:'), 'the line unit is part of the basics: the page chrome is spaced by it')
  assert.ok(style.includes('@property --line'), 'the line unit has lost its registration')
})

test('article page has them', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, PAGE)
  assert.match(style, PROSE)
  assert.ok(style.includes('.prose hr'), 'the rhythm is missing')
  assert.ok(/\.design-system\)[^{]*a\[href\^=/.test(style), 'the external-link arrow is missing')
  assert.ok(style.includes('.button'), 'the footer brings its buttons')
  assert.ok(!style.includes('.token'), 'a page with no code has the code CSS')
})

test('code, buttons and activity colors follow the content, each once', async t => {
  const body = '<pre class="language-css"><code class="language-css">a {}</code></pre> <a href="/" class="no-indicator button">Go</a> <span data-activity="run">Run</span>'
  const site = await makeTempSite({ files: { 'src/pages/plain.md': STANDALONE(body) } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, 'plain/index.html')
  for (const piece of ['.token.keyword', '.button[data-ghost-button]:hover', '[data-activity=run]', '.prose hr']) assert.equal(copies(style, piece), 1, `${piece} should be on the page once`)
  assert.ok(!styleOf(site, PAGE).includes('[data-activity=run]'), 'activity colors on a page with no activity')
})

test('a map brings its default line color', async t => {
  const site = await makeTempSite({ settings: { switches: BARE }, files: { 'src/pages/bare.njk': BARE_PAGE } })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(!styleOf(site, 'bare/index.html').includes('--color-route-line'), 'the map\'s colors are on a page with no map')
  assert.ok(styleOf(site, 'design-system/index.html').includes('--color-route-line:'), 'a page with a map lost the map\'s colors')
})
