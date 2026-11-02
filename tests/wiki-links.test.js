// A dead wikilink renders as plain text with no error (src/_config/plugins/interlinker-resolver.js), so this test is the only thing that catches one in a shared wiki page. Run: node --test tests/wiki-links.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { isSiteFile } from './lib/site-files.mjs'
import { stripCode } from '../src/_config/plugins/interlinker-ignore-code.js'

const wikiDir = path.resolve(import.meta.dirname, '../src/wiki')

// files: page file names; read: file name -> text; isSite: file name -> true for a page that belongs to one site
export const findDeadLinks = (files, read, isSite) => {
  const names = new Set(files.filter(file => !isSite(file)).map(file => file.slice(0, -3)))
  const dead = []
  for (const file of files) {
    if (isSite(file)) continue
    const text = stripCode(read(file))
    for (const [, target] of text.matchAll(/\[\[([^|\]\n]+?)(?:\|[^\]\n]+?)?\]\]/g)) {
      const name = target.split('#')[0].trim()
      if (name && !names.has(name)) dead.push(`${file} -> [[${target}]]`)
    }
  }
  return dead
}

test('shared wiki pages only link to shared wiki pages', () => {
  const files = readdirSync(wikiDir).filter(file => file.endsWith('.md'))
  const dead = findDeadLinks(files, file => readFileSync(path.join(wikiDir, file), 'utf8'), file => isSiteFile(`src/wiki/${file}`))
  assert.deepEqual(dead, [], `Shared wiki pages link to pages that are not in src/wiki/:\n${dead.join('\n')}`)
})

test('in a site with wiki pages of its content, a shared page linking to one of them is dead', () => {
  const pages = { 'Shared.md': 'See [[Site Page]] and [[Other Shared]].', 'Other Shared.md': 'Plain.', 'Site Page.md': 'About this site.' }
  const dead = findDeadLinks(Object.keys(pages), file => pages[file], file => file === 'Site Page.md')
  assert.deepEqual(dead, ['Shared.md -> [[Site Page]]'])
})

test('the wiki index has no empty section, and its intro holds on a site with a section of its pages', () => {
  const text = readFileSync(path.join(wikiDir, 'index.md'), 'utf8')
  const empty = [...text.matchAll(/^## (.+)\n\s*(?=^## |$(?![\s\S]))/gm)].map(match => match[1])
  assert.deepEqual(empty, [], `Empty sections: ${empty.join(', ')}`)
  assert.ok(!text.includes('live under "Stomme itself"'), 'the intro says every project page sits under one heading')
})
