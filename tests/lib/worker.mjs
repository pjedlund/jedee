// A made-up browser for a built service worker, so a test can fire install, activate, fetch and push at it.
import vm from 'node:vm'

// Runs the worker source with a made-up browser. Caches are plain Maps; `failAdd` names files whose download fails.
export function loadWorker(source, { failAdd = [], stores = new Map(), fetchStub = async () => { throw new TypeError('offline') } } = {}) {
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
