// Regression test for the per-theme button colors in the Penpot token export
// (src/_data/designTokens/buttonColors.json → build-penpot-tokens.js).
//
// Why this exists: importing a DTCG file into Penpot REPLACES any token set
// whose name matches, and the build generates theme/light + theme/dark. Twelve
// button colors used to live only inside the Penpot file, so the next import
// would have deleted them — and ten Button variants bind their fill to one of
// them, so the component would have broken with no error anywhere. Emitting
// them from a JSON source makes the import reproduce them instead.
//
// Two things must hold, and a plausible refactor breaks either one:
//   1. All twelve names survive into the generated theme sets.
//   2. They are emitted VERBATIM — not under the `color.*` prefix that the
//      semanticColors entries get. The Penpot bindings reference them as
//      `button.tertiary.bg`; prefixing renames them, which reads as a delete
//      plus an unused new token.
//
// Run: npm run test:unit   (or: node --test tests/penpot-button-tokens.test.js)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = resolve(REPO_ROOT, 'src/_config/setup/build-penpot-tokens.js')
const OUTPUT = resolve(REPO_ROOT, '_local/penpot/penpot-tokens.dtcg.json')
const SOURCE = resolve(REPO_ROOT, 'src/_data/designTokens/buttonColors.json')

// Flatten a DTCG set into { 'dotted.token.name': value }.
function flatten(set) {
  const out = {}
  ;(function walk(node, path) {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue
      if (value && typeof value === 'object' && '$value' in value) {
        out[[...path, key].join('.')] = value.$value
      } else if (value && typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  })(set, [])
  return out
}

async function generate() {
  await run('node', [BUILD], { cwd: REPO_ROOT })
  return JSON.parse(await readFile(OUTPUT, 'utf8'))
}

test('every button color in the source survives into the generated theme sets, verbatim', async () => {
  const source = JSON.parse(await readFile(SOURCE, 'utf8'))
  const dtcg = await generate()

  for (const theme of ['light', 'dark']) {
    const expected = source.themes[theme]
    const generated = flatten(dtcg[`theme/${theme}`])

    assert.ok(
      Object.keys(expected).length > 0,
      `buttonColors.json has no ${theme} colors — the guard is empty`
    )

    for (const [name, value] of Object.entries(expected)) {
      assert.equal(
        generated[name],
        value,
        `theme/${theme} is missing ${name} (or its value changed). ` +
          `Importing this file into Penpot would delete that token and break ` +
          `the Button variants bound to it.`
      )
      assert.ok(
        generated[`color.${name}`] === undefined,
        `theme/${theme} emitted ${name} under the color.* prefix. Penpot's ` +
          `existing bindings reference the bare name, so a prefix is a rename ` +
          `— the bound token disappears.`
      )
    }
  }
})

test('the semanticColors entries still DO get the color.* prefix', async () => {
  // Guards the other direction: the button colors are the exception, not a new
  // rule. If a refactor unified the two loops, these would lose their prefix.
  const dtcg = await generate()
  const light = flatten(dtcg['theme/light'])

  assert.ok(light['color.bg'] !== undefined, 'theme/light lost color.bg')
  assert.ok(light['color.text'] !== undefined, 'theme/light lost color.text')
  assert.ok(light['bg'] === undefined, 'theme/light emitted bg without the color.* prefix')
})
