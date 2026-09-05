/**
 * Build a flat Sketch payload from the jedee design tokens in `src/_data/designTokens/*.json`, ready to paste into a Sketch `run_code` script that creates Color Variables (swatches) and Text Styles.
 *
 * Workflow:
 *   1. Edit any file in src/_data/designTokens/ (if you edited colorsBase.json, run `npm run colors` first to regenerate colors.json)
 *   2. Run `npm run sketch:tokens`
 *   3. Feed `_local/sketch/sketch-tokens.json` to Sketch via the MCP `run_code` tool.
 *
 * Differences from the Penpot build (build-penpot-tokens.js), all forced by Sketch:
 *   - {curly.bracket} references are RESOLVED here. A Sketch swatch holds a hex, not a live link back to the palette, so the pushed file is a snapshot — re-run this after any token change.
 *   - Sketch has no light/dark switch on a swatch, so the semantic pair becomes two swatch groups, Light/… and Dark/….
 *   - Fluid Utopia sizes collapse to their `max` (desktop) value; Sketch has no fluid type.
 */

import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TOKENS_DIR = resolve(REPO_ROOT, 'src/_data/designTokens');
const OUTPUT_PATH = resolve(REPO_ROOT, '_local/sketch/sketch-tokens.json');

const LIGHT_DARK_COLOR_NAMES = ['red', 'blue', 'green'];

async function readJSON(file) {
	return JSON.parse(await readFile(resolve(TOKENS_DIR, file), 'utf8'));
}

const titleCase = (s) => s.replace(/(^|[-.])([a-z0-9])/g, (_, sep, ch) => (sep === '-' ? ' ' : sep === '.' ? '/' : '') + ch.toUpperCase());

async function build() {
	const [colors, fonts, textSizes, textLeading, textWeights, typography, semanticColors, buttonColors, megamenuColors] = await Promise.all([readJSON('colors.json'), readJSON('fonts.json'), readJSON('textSizes.json'), readJSON('textLeading.json'), readJSON('textWeights.json'), readJSON('typography.json'), readJSON('semanticColors.json'), readJSON('buttonColors.json'), readJSON('megamenuColors.json')]);

	// Flat lookup keyed the way the {curly.brackets} address tokens: color.gray.900, color.base.darkest, font.size.step-0, …
	const refs = new Map();
	const swatches = [];

	for (const [topKey, val] of Object.entries(colors)) {
		if (topKey.startsWith('$')) continue;
		if (val.$value !== undefined) {
			const [head, ...rest] = topKey.split('-');
			const path = rest.length ? `color.${head}.${rest.join('-')}` : `color.${topKey}`;
			refs.set(path, val.$value);
			if (!LIGHT_DARK_COLOR_NAMES.includes(topKey)) swatches.push({name: `Palette/${titleCase(path.slice('color.'.length).replace('.', '-'))}`.replace(' ', '/'), color: val.$value});
		} else {
			for (const [shade, shadeVal] of Object.entries(val)) {
				if (shadeVal?.$value === undefined) continue;
				refs.set(`color.${topKey}.${shade}`, shadeVal.$value);
				swatches.push({name: `Palette/${titleCase(topKey)}/${shade}`, color: shadeVal.$value});
			}
		}
	}

	const resolveRef = (v) => (typeof v === 'string' && v.startsWith('{') ? (refs.get(v.slice(1, -1)) ?? v) : v);

	// The component colors reference theme-dependent names like {color.text}, so each theme resolves against its own map rather than the shared palette one.
	for (const [theme, group] of [['light', 'Light'], ['dark', 'Dark']]) {
		const themeRefs = new Map(refs);
		for (const [name, value] of Object.entries(semanticColors.themes?.[theme] ?? {})) {
			const hex = resolveRef(value);
			themeRefs.set(`color.${name}`, hex);
			swatches.push({name: `${group}/${titleCase(name)}`, color: hex});
		}
		for (const name of LIGHT_DARK_COLOR_NAMES) {
			const value = theme === 'light' ? colors[name]?.$value : colors[name]?.subdued?.$value;
			if (!value) continue;
			themeRefs.set(`color.semantic.${name}`, value);
			swatches.push({name: `${group}/${titleCase(name)}`, color: value});
		}
		const resolveThemed = (v) => (typeof v === 'string' && v.startsWith('{') ? (themeRefs.get(v.slice(1, -1)) ?? v) : v);
		// buttonColors/megamenuColors mirror the color-mix() results in the stylesheet as flat hexes; `core` still holds references and needs resolving per theme.
		for (const componentColors of [buttonColors, megamenuColors]) {
			for (const [name, value] of Object.entries(componentColors.core ?? {})) {
				swatches.push({name: `${group}/${titleCase(name)}`, color: resolveThemed(value)});
			}
			for (const [name, value] of Object.entries(componentColors.themes?.[theme] ?? {})) {
				swatches.push({name: `${group}/${titleCase(name)}`, color: resolveThemed(value)});
			}
		}
	}

	for (const [k, v] of Object.entries(fonts)) if (!k.startsWith('$')) refs.set(`font.family.${k}`, v.penpot ?? (Array.isArray(v.$value) ? v.$value[0] : v.$value));
	for (const [k, v] of Object.entries(textWeights)) if (!k.startsWith('$')) refs.set(`font.weight.${k}`, v.$value);
	for (const [k, v] of Object.entries(textLeading)) if (!k.startsWith('$')) refs.set(`font.lineHeight.${k}`, v.$value);
	for (const [k, v] of Object.entries(textSizes)) if (!k.startsWith('$')) refs.set(`font.size.${k}`, v.$value?.max ?? v.$value);

	const textStyles = Object.entries(typography.styles ?? {}).map(([styleName, parts]) => {
		const size = resolveRef(parts.fontSize);
		return {
			name: titleCase(styleName),
			fontFamily: resolveRef(parts.fontFamily),
			fontWeight: resolveRef(parts.fontWeight),
			fontSize: size,
			lineHeight: Math.round(size * resolveRef(parts.lineHeight) * 100) / 100,
			// typography.json's letterSpacing was eyeballed against Penpot at ITS font sizes; it is a px nudge, carried over as-is.
			letterSpacing: parts.letterSpacing === undefined ? 0 : Number(parts.letterSpacing),
		};
	});

	return {swatches, textStyles};
}

const payload = await build();
await mkdir(dirname(OUTPUT_PATH), {recursive: true});
await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${OUTPUT_PATH.replace(REPO_ROOT + '/', '')}: ${payload.swatches.length} swatches, ${payload.textStyles.length} text styles.`);
