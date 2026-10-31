// Shared files must not carry the site owner's personal details; what a site owns is listed in tests/site-owned.json. Run: node --test tests/no-personal-details.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const owned = JSON.parse(readFileSync(path.join(root, 'tests/site-owned.json'), 'utf8'))
const PERSONAL = ['Johan', 'Edlund', 'johanedlund', 'pjedlund', 'Malmö', 'Soli Deo', 'Västra', 'Tolstoy', '75b79efd']

// A pattern is a path where ** matches anything and * matches anything but a slash.
const toRegExp = pattern => new RegExp('^' + pattern.split('**').map(part => part.split('*').map(piece => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$')
const ownedPatterns = owned.map(toRegExp)
const isOwned = file => ownedPatterns.some(pattern => pattern.test(file))

test('no personal details in shared files', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean)
  const found = []
  for (const file of tracked) {
    if (isOwned(file)) continue
    let buffer
    try {
      buffer = readFileSync(path.join(root, file))
    } catch {
      continue
    }
    if (buffer.includes(0)) continue
    const text = buffer.toString('utf8')
    for (const word of PERSONAL) if (text.includes(word)) found.push(`${file}: ${word}`)
  }
  assert.deepEqual(found, [], `Personal details in shared files. Reword them, read them from settings, or (if the file belongs to the site) list it in tests/site-owned.json:\n${found.join('\n')}`)
})
