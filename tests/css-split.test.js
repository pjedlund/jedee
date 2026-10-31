// A page's <style> holds only the CSS of the pieces on that page. Each case builds a throwaway copy of the site. Run: node --test tests/css-split.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTempSite } from './lib/temp-site.mjs'

const PAGE = 'privacy/index.html'
const NOTE = '---\ntitle: A small note\ndate: 2026-01-01\n---\n\nHello.\n'
const STANDALONE = body => `---\ntitle: A plain page\nlayout: page\npermalink: /plain/\n---\n\n${body}\n`

const CHROME = ['.site-header', '.mainnav', '.breadcrumb', '.theme-toggle', '.site-footer', '[data-tooltip']
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
