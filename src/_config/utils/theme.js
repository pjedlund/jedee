// A site's look is a folder in src/_includes/themes, chosen by settings.theme. ⚠ Paths here are relative to the project root; Eleventy's passthrough keys need that.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load as yamlLoad} from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const THEMES = 'src/_includes/themes';

export function themeName() {
  const name = yamlLoad(fs.readFileSync(path.join(ROOT, 'src/_data/settings.yaml'), 'utf8')).theme;
  if (!name) throw new Error(`settings.theme is missing: name a folder in ${THEMES} in src/_data/settings.yaml`);
  if (!fs.existsSync(path.join(ROOT, THEMES, name))) throw new Error(`settings.theme is "${name}", but ${THEMES}/${name} doesn't exist`);
  return name;
}

export const themeDir = () => `${THEMES}/${themeName()}`;

export const TOKENS_DIR = `${themeDir()}/tokens`;

const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

export const loadTokens = file => readJson(`${TOKENS_DIR}/${file}`);

export const loadThemeConfig = () => readJson(`${themeDir()}/theme.json`);

export const loadLogo = () => fs.readFileSync(path.join(ROOT, themeDir(), 'logo.svg'), 'utf8');

// The logo's outline for the share cards: every path's d="…", joined. ⚠ A logo with no double-quoted d="…" stops the build.
export const logoOutline = (svg, file = 'logo.svg') => {
	const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map(match => match[1]);
	if (!paths.length) throw new Error(`${file} has no path with a double-quoted d="…", so the share cards have no logo mark.`);
	return paths.join(' ');
};

// The font files a theme's fonts.css loads, each once; a rule with no file (a local() fallback) is left out.
export const themeFontFiles = css => {
	const files = new Map();
	for (const [, rule] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
		const source = rule.match(/url\(['"]?\/assets\/fonts\/([^'")]+\.woff2)/)?.[1];
		if (!source || files.has(source)) continue;
		const value = name => rule.match(new RegExp(`${name}:\\s*([^;]+)`))?.[1].trim();
		files.set(source, {family: value('font-family').replace(/['"]/g, ''), file: `fonts/${path.basename(source)}`, source, weight: value('font-weight') ?? '400', style: value('font-style') ?? 'normal'});
	}
	return [...files.values()];
};
