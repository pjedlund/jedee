// Builds temp sites and runs the built worker in a made-up browser (node:vm). Run: node --test tests/serviceworker.test.js
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { makeTempSite } from './lib/temp-site.mjs'
import { resolvePwa } from '../src/_config/utils/pwa.js'

// Runs the worker source with a made-up browser. Caches are plain Maps; `failAdd` names files whose download fails.
function loadWorker(source, { failAdd = [], stores = new Map(), fetchStub = async () => { throw new TypeError('offline') } } = {}) {
  const handlers = {}
  const shown = []
  const added = []
  const calls = { focus: 0, opened: [] }
  const caches = {
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map())
      return {
        match: async request => stores.get(name).get(typeof request === 'string' ? request : request.url),
        add: async request => {
          const url = typeof request === 'string' ? request : request.url
          if (failAdd.includes(url)) throw new TypeError('Failed to fetch')
          added.push(url)
        },
        addAll: async urls => {
          if (urls.some(url => failAdd.includes(url))) throw new TypeError('Failed to fetch')
          added.push(...urls)
        },
      }
    },
    match: async request => {
      const key = typeof request === 'string' ? request : request.url
      for (const store of stores.values()) if (store.has(key)) return store.get(key)
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
  }
  let windows = []
  const clients = {
    claim: async () => {},
    matchAll: async () => windows,
    openWindow: async url => { calls.opened.push(url) },
  }
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn },
    registration: { showNotification: async (title, options) => shown.push({ title, ...options }) },
    clients,
    location: { origin: 'https://example.test' },
    skipWaiting: () => {},
  }
  vm.runInNewContext(source, { self, caches, clients, fetch: fetchStub, Request: class { constructor(url) { this.url = url } }, URL, Response })
  const fire = async (type, event = {}) => {
    let done
    handlers[type]({ ...event, waitUntil: promise => { done = promise } })
    await done
  }
  return {
    stores, shown, added, calls, handlers, fire,
    setWindows: list => { windows = list },
    push: data => fire('push', { data }),
    click: () => fire('notificationclick', { notification: { close: () => {} } }),
  }
}

const json = payload => ({ json: () => payload, text: () => JSON.stringify(payload) })

let plain, pushed, moved, sample
before(async () => {
  plain = await makeTempSite()
  pushed = await makeTempSite({ settings: { pwa: { keepCaches: ['dimma-alerts'], push: 'pwa/push.js' } } })
  moved = await makeTempSite({ settings: { pwa: { workerPath: '/sw.js' } } })
  sample = await makeTempSite({ settings: { theme: 'sample' } })
  await Promise.all([plain, pushed, moved, sample].map(site => site.build()))
})
after(() => [plain, pushed, moved, sample].forEach(site => site?.cleanup()))

test('default unchanged: the worker is at /serviceworker.js and the page registers it', () => {
  assert.ok(plain.exists('serviceworker.js'), 'dist/serviceworker.js is missing')
  assert.match(plain.read('privacy/index.html'), /serviceWorker\.register\('\/serviceworker\.js'\)/)
})

test('kept caches survive an update; other old ones go', async () => {
  const stores = new Map([['dimma-alerts', new Map()], ['cache-old', new Map()]])
  const worker = loadWorker(pushed.read('serviceworker.js'), { stores })
  stores.set('cache-current', new Map())
  await worker.fire('install')
  await worker.fire('activate')
  assert.ok(stores.has('dimma-alerts'), 'the kept cache was deleted')
  assert.ok(!stores.has('cache-old'), 'the old cache is still there')
  assert.ok([...stores.keys()].some(name => name.startsWith('cache-2')), 'the current cache was deleted')
})

test('without keepCaches every old cache goes', async () => {
  const stores = new Map([['dimma-alerts', new Map()], ['cache-old', new Map()]])
  const worker = loadWorker(plain.read('serviceworker.js'), { stores })
  await worker.fire('activate')
  assert.deepEqual([...stores.keys()], [])
})

test('no push code without push', () => {
  const source = plain.read('serviceworker.js')
  assert.doesNotMatch(source, /'push'/)
  assert.doesNotMatch(source, /showNotification/)
  assert.ok(!loadWorker(source).handlers.push)
})

test('push shows a notification with the title and body, and always shows one', async () => {
  const worker = loadWorker(pushed.read('serviceworker.js'))
  await worker.push(json({ title: 'High fog', body: 'Bokskogen tonight', tag: 'fog' }))
  assert.equal(worker.shown[0].title, 'High fog')
  assert.equal(worker.shown[0].body, 'Bokskogen tonight')
  assert.equal(worker.shown[0].tag, 'fog')
  assert.equal(worker.shown[0].icon, '/icon-192x192.png')

  await worker.push({ json: () => { throw new SyntaxError('not JSON') }, text: () => 'plain words' })
  assert.equal(worker.shown[1].body, 'plain words', 'a payload that is not JSON gets no notification')
  assert.ok(worker.shown[1].title, 'the notification has no title')

  await worker.push({ json: () => { throw new SyntaxError('x') }, text: () => { throw new Error('x') } })
  await worker.push(undefined)
  await worker.push(json(null))
  assert.equal(worker.shown.length, 5, 'an empty or broken payload shows no notification')
  assert.ok(worker.shown.every(note => note.title))
})

test('notification click focuses an open window, otherwise opens the start page', async () => {
  const worker = loadWorker(pushed.read('serviceworker.js'))
  let focused = 0
  worker.setWindows([{ focus: async () => { focused++ } }])
  await worker.click()
  assert.equal(focused, 1)
  assert.deepEqual(worker.calls.opened, [])
  worker.setWindows([])
  await worker.click()
  assert.deepEqual(worker.calls.opened, ['/'])
})

test('worker path: /sw.js is written, registered, and /serviceworker.js is not', () => {
  assert.ok(moved.exists('sw.js'), 'dist/sw.js is missing')
  assert.ok(!moved.exists('serviceworker.js'), '/serviceworker.js is still written')
  const page = moved.read('privacy/index.html')
  assert.match(page, /serviceWorker\.register\('\/sw\.js'\)/)
  assert.doesNotMatch(page, /serviceworker\.js/)
})

test('install survives a missing file in the list', async () => {
  const worker = loadWorker(plain.read('serviceworker.js'), { failAdd: ['/favicon.ico'] })
  await worker.fire('install')
  assert.ok(!worker.added.includes('/favicon.ico'))
  assert.ok(worker.added.includes('/icon-192x192.png') && worker.added.includes('/'), 'the other files were not cached')
  assert.ok(worker.added.some(url => url === '/offline/'), 'the offline page was not cached')
})

test('install still completes when the offline page is missing', async () => {
  const worker = loadWorker(plain.read('serviceworker.js'), { failAdd: ['/offline/'] })
  await worker.fire('install')
  assert.ok(worker.added.includes('/'), 'the other files were not cached')
  assert.ok(!worker.added.includes('/offline/'))
})

test('an address that exists only in a kept cache is not answered from it', async () => {
  const kept = new Map([['https://example.test/log.json', 'kept copy']])
  const stores = new Map([['dimma-alerts', kept]])
  const worker = loadWorker(pushed.read('serviceworker.js'), { stores, fetchStub: async () => 'network copy' })
  let answer
  const request = { url: 'https://example.test/log.json', method: 'GET', mode: 'cors' }
  worker.handlers.fetch({ request, respondWith: promise => { answer = promise }, waitUntil: () => {} })
  assert.equal(await answer, 'network copy')
})

test('the files the worker lists exist in a sample-theme site', () => {
  const list = sample.read('serviceworker.js').match(/PRECACHE_RESOURCES = \[([\s\S]*?)\]/)[1]
  const files = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]).filter(file => file !== '/')
  assert.ok(files.length > 0)
  for (const file of files) assert.ok(sample.exists(file.slice(1)), `${file} is not built for the sample theme`)
})

test('a bad pwa setting stops the build and names the setting', async t => {
  const bad = [
    [{ workerPath: 'sw.js' }, /settings\.pwa\.workerPath/],
    [{ workerPath: '/sw.txt' }, /settings\.pwa\.workerPath/],
    [{ push: 'pwa/nothing.js' }, /settings\.pwa\.push/],
  ]
  for (const [pwa, message] of bad) {
    const site = await makeTempSite({ settings: { pwa } })
    t.after(() => site.cleanup())
    await assert.rejects(site.build(), message)
  }
})

test('resolvePwa: defaults, and the checks', () => {
  assert.deepEqual(resolvePwa({}), { workerPath: '/serviceworker.js', keepCaches: [], push: false })
  assert.deepEqual(resolvePwa({ pwa: { workerPath: '/serviceworker.js' } }), { workerPath: '/serviceworker.js', keepCaches: [], push: false })
  assert.equal(resolvePwa({ pwa: { push: 'pwa/push.js' } }).push, 'pwa/push.js')
  assert.throws(() => resolvePwa({ pwa: { keepCaches: 'dimma-alerts' } }), /settings\.pwa\.keepCaches/)
  assert.throws(() => resolvePwa({ pwa: { push: '../../package.json' } }), /settings\.pwa\.push/)
  assert.throws(() => resolvePwa({ pwa: { push: true } }), /settings\.pwa\.push/)
})
