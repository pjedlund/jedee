// A site's look is a folder in src/_includes/themes, chosen by settings.theme. ⚠ Paths here are relative to the project root; Eleventy's passthrough keys need that.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load as yamlLoad} from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const THEMES = 'src/_includes/themes';

export function themeName() {
  // @until the boilerplate — the default stays jedee only while JEDEE is the only site; a new site must choose.
  const name = yamlLoad(fs.readFileSync(path.join(ROOT, 'src/_data/settings.yaml'), 'utf8')).theme || 'jedee';
  if (!fs.existsSync(path.join(ROOT, THEMES, name))) throw new Error(`settings.theme is "${name}", but ${THEMES}/${name} doesn't exist`);
  return name;
}

export const themeDir = () => `${THEMES}/${themeName()}`;

export const TOKENS_DIR = `${themeDir()}/tokens`;

const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

export const loadTokens = file => readJson(`${TOKENS_DIR}/${file}`);

export const loadThemeConfig = () => readJson(`${themeDir()}/theme.json`);
