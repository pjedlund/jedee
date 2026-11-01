// Shared files must not carry one site's personal details. ⚠ The words are in _local/personal-words.json, never in a tracked file, so with no such file this skips. Run: node --test tests/no-personal-details.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isSiteFile } from './lib/site-files.mjs'

const root = path.resolve(import.meta.dirname, '..')
const wordsFile = path.join(root, '_local/personal-words.json')
const skip = existsSync(wordsFile) ? false : 'needs _local/personal-words.json, a local list that is not in the repo'

test('no personal details in shared files', { skip }, () => {
  const words = JSON.parse(readFileSync(wordsFile, 'utf8'))
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean)
  const found = []
  for (const file of tracked) {
    if (isSiteFile(file)) continue
    let buffer
    try {
      buffer = readFileSync(path.join(root, file))
    } catch {
      continue
    }
    if (buffer.includes(0)) continue
    const text = buffer.toString('utf8')
    for (const { word, kind, except = [] } of words) if (text.includes(word) && !except.includes(file)) found.push(`${file}: ${kind}`)
  }
  assert.deepEqual(found, [], `Personal details in shared files. Reword them, read them from settings, or (if the file belongs to the site) list it in tests/site-files.json:\n${found.join('\n')}`)
})

test('with no word list the check skips and names the file it needs', () => {
  // ⚠ With this variable set, a nested test run prints nothing.
  const { NODE_TEST_CONTEXT, ...env } = process.env
  const dir = mkdtempSync(path.join(tmpdir(), 'stomme-words-'))
  try {
    mkdirSync(path.join(dir, 'tests/lib'), { recursive: true })
    for (const file of ['package.json', 'tests/no-personal-details.test.js', 'tests/site-files.json', 'tests/lib/site-files.mjs']) copyFileSync(path.join(root, file), path.join(dir, file))
    const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=no personal details in shared files', 'tests/no-personal-details.test.js'], { cwd: dir, encoding: 'utf8', env })
    assert.match(output, /# SKIP .*_local\/personal-words\.json/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the language word files hold no first-person wording', () => {
  const dir = path.join(root, 'src/_config/words')
  const found = []
  for (const file of readdirSync(dir)) {
    for (const line of readFileSync(path.join(dir, file), 'utf8').split('\n')) {
      if (/\b(I|I'm|I've|my|me|mine)\b/.test(line.replace(/^[\w-]+:/, '').replaceAll("''", "'"))) found.push(`${file}: ${line}`)
    }
  }
  assert.deepEqual(found, [], "First-person wording belongs in the site's theme words.yaml, not in a language file:\n" + found.join('\n'))
})
