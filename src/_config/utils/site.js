// The site's language, locale and kind (person or club) from settings.site, and the interface words for that language. ⚠ Paths are relative to the project root, like theme.js.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load as yamlLoad} from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const WORDS = 'src/_config/words';
const TYPES = ['Person', 'Organization'];

const readYaml = file => yamlLoad(fs.readFileSync(path.join(ROOT, file), 'utf8'));

// A settings file with no site block builds as an English site for a person.
export function siteSettings() {
  const site = readYaml('src/_data/settings.yaml').site || {};
  const {lang = 'en', locale = 'en_US', type = 'Person'} = site;
  if (!TYPES.includes(type)) throw new Error(`settings.site.type is "${type}", but it must be one of: ${TYPES.join(', ')}`);
  if (!fs.existsSync(path.join(ROOT, WORDS, `${lang}.yaml`))) throw new Error(`settings.site.lang is "${lang}", but ${WORDS}/${lang}.yaml doesn't exist`);
  return {lang, locale, type};
}

// The chosen language laid over English, so a word nobody has translated yet shows in English instead of nothing.
export function loadWords() {
  const {lang} = siteSettings();
  const english = readYaml(`${WORDS}/en.yaml`);
  return lang === 'en' ? english : {...english, ...readYaml(`${WORDS}/${lang}.yaml`)};
}
