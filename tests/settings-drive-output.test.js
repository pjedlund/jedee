// Settings, not template text, decide the analytics script and the host name in the built CSS. Each case builds a throwaway copy of the site. Run: node --test tests/settings-drive-output.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTempSite } from './lib/temp-site.mjs'
import { siteDomain } from '../src/_data/meta.js'

// ⚠ The analytics script is left out when the build's URL is localhost, so these builds set a deployed-looking one.
const DEPLOYED = { URL: 'https://analytics-test.example' }

// The minifier may or may not keep the quotes around the host name.
const namesHost = host => new RegExp(`href\\*=["']?${host.replaceAll('.', '\\.')}["']?`)

test('analytics script appears with the id from settings', async t => {
  const site = await makeTempSite({ settings: { analytics: { umamiId: 'test-umami-id-123' } } })
  t.after(() => site.cleanup())
  await site.build(DEPLOYED)
  assert.match(site.read('index.html'), /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="test-umami-id-123"><\/script>/)
})

test('no analytics script when analytics.umamiId is unset', async t => {
  const site = await makeTempSite({ settings: { analytics: null } })
  t.after(() => site.cleanup())
  await site.build(DEPLOYED)
  assert.ok(!site.read('index.html').includes('umami'), 'index.html still has the analytics script')
})

test('the built CSS holds the site\'s own host name, never the placeholder', async t => {
  const site = await makeTempSite()
  t.after(() => site.cleanup())
  await site.build()
  const home = site.read('index.html')
  assert.match(home, namesHost(siteDomain), `the CSS does not name ${siteDomain}`)
  assert.ok(!home.includes('__SITE_DOMAIN__'), 'the placeholder is still in the CSS')
})

test('a different identity.website puts the new host name in the CSS', async t => {
  const site = await makeTempSite({ settings: { identity: { website: 'https://other-site.example' } } })
  t.after(() => site.cleanup())
  await site.build()
  const home = site.read('index.html')
  assert.match(home, namesHost('other-site.example'), 'the CSS does not name other-site.example')
  assert.ok(!home.includes('__SITE_DOMAIN__'), 'the placeholder is still in the CSS')
})
