// A page's <style> holds only the CSS of the pieces on that page. Each case builds a throwaway copy of the site. Run: node --test tests/css-split.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTempSite } from './lib/temp-site.mjs'

const PAGE = 'privacy/index.html'
const NOTE = '---\ntitle: A small note\ndate: 2026-01-01\n---\n\nHello.\n'
const STANDALONE = body => `---\ntitle: A plain page\nlayout: page\npermalink: /plain/\n---\n\n${body}\n`

// ⚠ .mainnav alone proves nothing: nav-menu-cls.css supplies it too, so .megamenu-label stands for main-nav.css.
const CHROME = ['.site-header', '.skip-link', '.mainnav', '.megamenu-label', '.breadcrumb', '.theme-toggle', '.site-footer', '[data-tooltip']
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

test('tooltips on, but nothing on the page carries a label: no tooltip CSS', async t => {
  const site = await makeTempSite({ settings: { switches: { header: false, footer: false, shortcuts: false, easteregg: false, themeToggle: false } } })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(!styleOf(site, PAGE).includes('[data-tooltip'), 'tooltip CSS is on a page with nothing to label')
})

test('the header and footer without breadcrumb, menu or shortcuts carry none of their rules', async t => {
  const site = await makeTempSite({ settings: { switches: { breadcrumb: false, mainNav: false, shortcuts: false } } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, PAGE)
  for (const piece of ['.site-header .breadcrumb', '.site-header .menu-toggle', '.footer-shortcuts']) assert.ok(!style.includes(piece), `${piece} is in the page's CSS`)
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
  for (const piece of ['pre[class', '.button', 'activity', 'place-map', '.token', '.skip-link', '.divider']) assert.ok(!style.includes(piece), `${piece} is in the CSS of a bare page`)
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

test('an archive brings the divider, and other pages do not', async t => {
  const site = await makeTempSite({ files: { 'src/posts/notes/a-small-note.md': NOTE } })
  t.after(() => site.cleanup())
  await site.build()
  assert.match(site.read('notes/index.html'), /<svg[^>]*class="?divider/)
  assert.equal(copies(styleOf(site, 'notes/index.html'), '.divider>.divider'), 1)
  assert.ok(!styleOf(site, PAGE).includes('.divider'), 'the divider is on a page with no archive header')
})

test('lightbox CSS: only on a page with a lightbox, and in the blocks layer', async t => {
  const plain = { 'src/pages/plain.md': STANDALONE('Just words.') }
  const site = await makeTempSite({
    files: {
      ...plain,
      'src/pages/tagged.njk': '---\ntitle: Tagged\nlayout: base\npermalink: /tagged/\n---\n<div class="wrapper"><div class="feature"><photo-lightbox @href="/a.jpg" @width="10" @height="10"><img slot="image" src="/a.jpg" alt="" eleventy:ignore></photo-lightbox></div></div>\n',
      'src/pages/shortcode.njk': '---\ntitle: Shortcode\nlayout: base\npermalink: /shortcode/\n---\n{% lightbox "/assets/images/template/opengraph-default.jpg", "A picture" %}\n',
    },
  })
  t.after(() => site.cleanup())
  await site.build()
  assert.ok(!styleOf(site, 'plain/index.html').includes('photo-lightbox'), 'a page with no lightbox still carries its CSS')
  for (const file of ['tagged/index.html', 'shortcode/index.html']) {
    const local = [...site.read(file).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1])[1] ?? ''
    assert.match(local, /@layer blocks\{[^]*photo-lightbox/, `${file}: the lightbox CSS is missing or outside the blocks layer`)
  }
  assert.match(styleOf(site, 'plain/index.html'), /figure:is\(\.popout,\s*\.feature,\s*\.full\)/, 'a plain breakout figure lost its caption rule')
})

// A logo of a different shape: if the CSS held a fixed path, this one could not reach the page.
const OTHER_LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 40" fill="#123456"><path d="M1 1h18v38H1z" /></svg>\n'

test('the map preloader mark comes from the theme logo, and the stem is a theme setting', async t => {
  const site = await makeTempSite({ settings: { theme: 'sample' }, files: { 'src/_includes/themes/sample/logo.svg': OTHER_LOGO } })
  t.after(() => site.cleanup())
  await site.build()
  const style = styleOf(site, 'design-system/index.html')
  assert.ok(style.includes("viewBox='0 0 20 40'><path d='M1 1h18v38H1z'/>"), 'the preloader mark is not the theme logo')
  assert.ok(!style.includes('__THEME_LOGO__'), 'the placeholder reached the page')
  assert.ok(!style.includes('m50 0 .588'), 'a fixed logo is still in the CSS')
  assert.match(style, /var\(--preloader-stem-width,\s*0\)/, 'the stem box is still fixed to one logo')
})

test('the YouTube placeholder mark comes from the theme logo', async t => {
  const site = await makeTempSite({ settings: { theme: 'sample' }, files: { 'src/_includes/themes/sample/logo.svg': OTHER_LOGO, 'src/pages/tube.njk': '---\ntitle: Tube\nlayout: base\npermalink: /tube/\n---\n<custom-youtube @slug="abc123" @label="A film"></custom-youtube>\n' } })
  t.after(() => site.cleanup())
  await site.build()
  const html = site.read('tube/index.html')
  assert.ok(html.includes("--yt-logo-mark: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 40' fill='%23808080' fill-opacity='.1'%3E%3Cpath d='M1 1h18v38H1z'/%3E%3C/svg%3E\")"), 'the mark is not the theme logo')
  assert.ok(!html.includes('__THEME_LOGO_MARK__'), 'the placeholder reached the page')
  assert.ok(!html.includes('m50 0 .588'), 'a fixed logo is still in the markup')
})

// A feed's body holds the embed's <style> too. It goes through the page's transforms, which is why the placeholder is filled in there as well.
test('the YouTube placeholder never reaches a feed', async t => {
  const note = '---\ntitle: A filmed note\ndate: 2026-01-01\n---\n\n<div><custom-youtube @slug="abc123" @label="A film"> </custom-youtube></div>\n'
  const site = await makeTempSite({ files: { 'src/posts/notes/a-filmed-note.md': note } })
  t.after(() => site.cleanup())
  await site.build()
  for (const file of ['feed.xml', 'feed.json']) {
    const text = site.read(file)
    assert.ok(text.includes('--yt-logo-mark'), `${file} has no embed to check`)
    assert.ok(!text.includes('__THEME_LOGO_MARK__'), `the placeholder reached ${file}`)
  }
})
