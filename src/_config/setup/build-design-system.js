/**
 * Build the `project/` tree for the "jedee design system" Artifact (claude.ai/artifact/8SUYhAYSZX7ELYM8LhaTzH) into `_local/claude-design-system/`.
 *
 * Workflow:
 *   1. Build the site once so `src/_includes/css/global.css` is current
 *   2. Run `npm run design:system`
 *   3. Ask Claude to publish the folder to the design system's url
 *
 * ⚠ The Artifact type CANNOT read DTCG. Its tokens.json wants a flat LIST per family — a name-to-value map makes the family render empty. This script is the DTCG-to-lists converter; the repo keeps DTCG as the source of truth, exactly as build-penpot-tokens.js and build-sketch-tokens.js do.
 */

import {readFile, writeFile, mkdir, copyFile, rm} from 'node:fs/promises';
import {dirname, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const TOKENS_DIR = resolve(REPO_ROOT, 'src/_data/designTokens');
const OUT = resolve(REPO_ROOT, '_local/claude-design-system/project');

const readJSON = async f => JSON.parse(await readFile(resolve(TOKENS_DIR, f), 'utf8'));
const globalCss = await readFile(resolve(REPO_ROOT, 'src/_includes/css/global.css'), 'utf8');

/* ── Resolve the site's own custom properties, per theme ───────────── */

// Brace-walk the compiled CSS collecting :root declarations, so a value here is the one the browser would use rather than a guess. Dark comes from both the media query and the explicit attribute.
function collectRootVars(css) {
	const light = {};
	const dark = {};
	let i = 0;
	const stack = [];
	while (i < css.length) {
		const open = css.indexOf('{', i);
		if (open === -1) break;
		const prelude = css.slice(i, open).split(/[;}]/).pop().trim();
		const close = matchBrace(css, open);
		const body = css.slice(open + 1, close);
		const inDarkMedia = stack.some(s => /prefers-color-scheme\s*:\s*dark/.test(s));
		if (prelude.startsWith('@')) {
			stack.push(prelude);
			const inner = collectScoped(body, inDarkMedia || /prefers-color-scheme\s*:\s*dark/.test(prelude));
			Object.assign(light, inner.light);
			Object.assign(dark, inner.dark);
			stack.pop();
		} else if (/(^|,)\s*:root/.test(prelude)) {
			const isDark = inDarkMedia || /data-theme=['"]?dark/.test(prelude);
			const target = isDark ? dark : light;
			for (const [, k, v] of body.matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;}]+)/g)) target[k] = v.trim();
		}
		i = close + 1;
	}
	return {light, dark};
}

function collectScoped(css, isDark) {
	const out = collectRootVars(css);
	return isDark ? {light: {}, dark: {...out.light, ...out.dark}} : out;
}

function matchBrace(s, open) {
	let depth = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === '{') depth++;
		else if (s[i] === '}' && --depth === 0) return i;
	}
	return s.length;
}

const raw = collectRootVars(globalCss);
const themeVars = {light: raw.light, dark: {...raw.light, ...raw.dark}};

// A token may point at another through var(); the design system wants the literal, except between colors where an alias is the better record.
function resolve1(map, value, depth = 0) {
	if (depth > 16) return value;
	const m = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(value.trim());
	return m && map[m[1]] ? resolve1(map, map[m[1]], depth + 1) : value.trim();
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const expand = h => (h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h);
const colorValue = (theme, name) => {
	const v = resolve1(themeVars[theme], themeVars[theme][name] ?? '');
	return HEX.test(v) ? expand(v.toLowerCase()) : v;
};

/* ── tokens.json ───────────────────────────────────────────────────── */

// ⚠ The syntax-highlighting tokens are Prism internals built with color-mix(), which this format drops — they are not tokens anyone tunes here.
const SKIP = /^--color-(code-|border-height)/;

const USAGE = {
	'--color-bg': 'Page surface. Reads as paper rather than UI.',
	'--color-bg-accent': 'Elevated surface — cards, code blocks, the nav panel.',
	'--color-bg-accent-2': 'Dividers and hairlines against the page surface.',
	'--color-text': 'Body text on the page surface.',
	'--color-text-accent': 'Metadata, captions and secondary text.',
	'--color-headline': 'Headings, set in the display serif.',
	'--color-border-top': 'The 1rem band across the top of every page.',
	'--color-accent-orange': 'The single saturated driver — link underlines, the blockquote rule, active states.',
	'--color-accent-orange-text': 'Orange where it has to carry meaning as text and clear 4.5:1.',
	'--color-accent-blue': 'Desaturated companion for category cues and the conic logo.',
	'--color-accent-green': 'Desaturated companion for category cues and the conic logo.',
	'--color-link-text': 'Link text.',
	'--color-link-underline': 'Link underline at rest.',
	'--color-link-underline-hover': 'Link underline on hover.',
	'--color-logo-icon': 'The logomark in the breadcrumb. One value in both themes so it holds 3:1 either way.',
	'--color-route-line': 'Orienteering course on the activity map — reads on every tile set.',
	'--color-route-start': 'Route start dot. A saturated green of its own, because the accent green reads grey on a map.',
	'--color-light': 'Lightest neutral, for text on a dark fill.',
	'--color-dark': 'Darkest neutral, for fills and scrims.',
	'--color-mid': 'Mid neutral for muted marks.'
};

const paletteUsage = name => {
	const n = name.replace('--color-', '');
	if (/^gray-/.test(n)) return `Neutral scale step ${n.split('-')[1]}, generated in OKLCH from one base.`;
	if (/^orange-/.test(n)) return `Orange scale step ${n.split('-')[1]}, generated in OKLCH from one base.`;
	if (/^base-/.test(n)) return `Foundation tone, composed into the semantic roles.`;
	if (/-vivid$/.test(n)) return `Saturated ${n.replace('-vivid', '')}, for marks that must read on a map or photo.`;
	if (/-subdued$/.test(n)) return `Chroma-reduced ${n.replace('-subdued', '')} for dark theme.`;
	return `Accent hue used for category cues.`;
};

const colorNames = Object.keys(themeVars.light)
	.filter(n => n.startsWith('--color-') && !SKIP.test(n))
	.filter(n => HEX.test(colorValue('light', n)))
	.sort();

const color = {
	themes: [
		{id: 'light', name: 'Light'},
		{id: 'dark', name: 'Dark'}
	],
	tokens: colorNames.map(n => ({
		name: n.replace('--color-', ''),
		value: {light: colorValue('light', n), dark: colorValue('dark', n)},
		usage: USAGE[n] ?? paletteUsage(n)
	}))
};

// ⚠ Utopia values are {min, max}; the max is the honest single number, the same collapse build-penpot-tokens.js makes.
const spacingSrc = await readJSON('spacing.json');
const spacing = {
	note: 'A Utopia scale: each step is a clamp() between 320px and 1350px. The value shown is the maximum.',
	tokens: Object.entries(spacingSrc)
		.filter(([k, v]) => !k.startsWith('$') && v?.$value)
		.map(([k, v]) => ({
			name: `space-${k}`,
			value: `${v.$value.max}px`,
			usage: k.includes('-')
				? `Fluid pair ${k} — interpolates hard across the viewport; for rhythm between sections.`
				: `Step ${k}. Fixed relationships inside a component.`
		}))
};

const radiusSrc = await readJSON('borderRadius.json');
const RADIUS_USAGE = {small: 'Code, chips and small inline marks.', medium: 'Buttons and form inputs.', pill: 'Tags and the default button.'};
const radius = {
	note: 'Layout containers, articles and headings take no radius at all.',
	tokens: Object.entries(radiusSrc)
		.filter(([k, v]) => !k.startsWith('$') && v?.$value)
		.map(([k, v]) => ({
			name: `radius-${k}`,
			value: /rem$/.test(v.$value) ? `${parseFloat(v.$value) * 16}px` : v.$value,
			usage: RADIUS_USAGE[k] ?? ''
		}))
};

const shadowSrc = await readJSON('shadows.json');
const layers = v => v.$value.map(l => `${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px ${l.color.toLowerCase()}`).join(', ');
const SHADOW_USAGE = {
	panel: 'The mega-menu panel — the one thing that genuinely floats over the page.',
	popup: 'The map popup and tooltips.',
	chip: 'Inline code, the smallest lift there is.'
};
const shadow = {
	note: 'Two layers each — a tight contact shadow plus a wide soft one — and deeper in dark theme.',
	tokens: ['panel', 'popup', 'chip'].map(k => ({
		name: `shadow-${k}`,
		value: {light: layers(shadowSrc[k]), dark: layers(shadowSrc[`${k}-dark`])},
		usage: SHADOW_USAGE[k]
	}))
};

const sizes = await readJSON('textSizes.json');
const fontsSrc = await readJSON('fonts.json');
const px = step => `${sizes[step].$value.max}px`;

const FONT_FILES = [
	{family: 'Source Sans', file: 'fonts/source-sans.woff2', weight: '200 900', style: 'normal'},
	{family: 'Source Sans', file: 'fonts/source-sans-italic.woff2', weight: '200 900', style: 'italic'},
	{family: 'Source Serif', file: 'fonts/source-serif.woff2', weight: '700', style: 'normal'},
	{family: 'Source Serif', file: 'fonts/source-serif-bold-italic.woff2', weight: '700', style: 'italic'},
	{family: 'Source Code Pro', file: 'fonts/source-code-pro.woff2', weight: '200 900', style: 'normal'}
];

const type = {
	fonts: FONT_FILES,
	families: Object.fromEntries(Object.entries(fontsSrc).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, v.$value.join(', ')])),
	groups: [
		{
			name: 'Display',
			family: 'display',
			styles: [
				{name: 'h1', fontSize: px('step-6'), lineHeight: 1.1, fontWeight: 700, usage: 'Page title. One per page.'},
				{name: 'h2', fontSize: px('step-4'), lineHeight: 1.2, fontWeight: 700, usage: 'Section heading.'},
				{name: 'h3', fontSize: px('step-2'), lineHeight: 1.2, fontWeight: 700, usage: 'Sub-section heading.'}
			]
		},
		{
			name: 'Text',
			family: 'base',
			styles: [
				{name: 'lead', fontSize: px('step-1'), lineHeight: 1.4, fontWeight: 400, usage: 'Standfirst under a title.'},
				{name: 'body', fontSize: px('step-0'), lineHeight: 1.4, fontWeight: 400, usage: 'Running text. Old-style figures inside .prose.'},
				{name: 'small', fontSize: px('step-min-1'), lineHeight: 1.4, fontWeight: 400, usage: 'Card metadata and the footer.'},
				{name: 'label-caps', fontSize: px('step-min-2'), lineHeight: 1, fontWeight: 700, usage: 'The one uppercase style — breadcrumb, nav, category labels.'}
			]
		},
		{
			name: 'Code',
			family: 'mono',
			styles: [{name: 'code', fontSize: px('step-min-1'), lineHeight: 1.4, fontWeight: 400, usage: 'Inline code and code blocks.'}]
		}
	]
};

const tokens = {
	name: 'JEDEE',
	version: 1,
	color,
	type,
	spacing,
	radius,
	shadow,
	meta: {
		source: 'github',
		repo: 'pjedlund/jedee',
		paths: {tokens: ['src/_data/designTokens/*.json'], fonts: ['src/assets/fonts/'], docs: ['DESIGN.md']},
		synced: new Date().toISOString().slice(0, 10),
		note: 'Generated by src/_config/setup/build-design-system.js from the DTCG tokens and the compiled global.css.'
	}
};

/* ── Write the tree ────────────────────────────────────────────────── */

await rm(resolve(OUT, '..'), {recursive: true, force: true});
await mkdir(resolve(OUT, 'components'), {recursive: true});
await mkdir(resolve(OUT, 'fonts'), {recursive: true});

await writeFile(resolve(OUT, 'tokens.json'), JSON.stringify(tokens, null, 2));

// The site's own stylesheet rides in as bundle.css, which the type preloads into every preview — so a preview is styled by the real CSS, not a reconstruction. ⚠ Fonts sit a level up from components/.
// ⚠ custom-card and the mega-menu ship as per-page bundles, not in global.css — a preview linking its own stylesheet would be inert here, so they are concatenated in.
const localBundles = ['custom-card.css', 'nav-menu-cls.css'];
let localCss = '';
for (const f of localBundles) localCss += `\n${await readFile(resolve(REPO_ROOT, 'src/_includes/css', f), 'utf8')}`;
const bundleCss = (globalCss + localCss).replace(/url\(\/assets\/fonts\/[^/)]*\/([^/)]+\.woff2)\)/g, 'url(../fonts/$1)');
if (/<\/style/i.test(bundleCss)) throw new Error('bundle.css contains </style — the type refuses it');
await writeFile(resolve(OUT, 'components/bundle.css'), bundleCss);

for (const f of FONT_FILES) {
	const name = basename(f.file);
	const [dir] = name.replace('.woff2', '').split(/-(?=italic|bold|cyrillic)/);
	await copyFile(resolve(REPO_ROOT, 'src/assets/fonts', dir, name), resolve(OUT, 'fonts', name));
}

await copyFile(resolve(HERE, 'design-system-README.md'), resolve(OUT, 'README.md'));

/* ── Components: reuse the preview pages, minus their page chrome ──── */

const COMPONENTS = [
	{name: 'Button', src: 'component-button.html', group: 'Actions', height: 320},
	{name: 'Tooltip', src: 'component-tooltip.html', group: 'Actions', height: 560},
	{name: 'Card', src: 'component-card.html', group: 'Content', height: 900},
	{name: 'Prose', src: 'component-prose.html', group: 'Content', height: 1100},
	{name: 'Nav', src: 'component-nav.html', group: 'Chrome', height: 360},
	{name: 'Breadcrumb', src: 'component-breadcrumb.html', group: 'Chrome', height: 360},
	{name: 'ThemeToggle', src: 'component-theme-toggle.html', group: 'Chrome', height: 200},
	{name: 'Footer', src: 'component-footer.html', group: 'Chrome', height: 300}
];

const ICONS = resolve(REPO_ROOT, 'src/assets/svg/posts');
const inlineIcons = async html => {
	let out = html;
	for (const name of new Set([...html.matchAll(/<!--@icon:([\w-]+)-->/g)].map(m => m[1]))) {
		out = out.replaceAll(`<!--@icon:${name}-->`, (await readFile(resolve(ICONS, `${name}.svg`), 'utf8')).trim());
	}
	return out;
};

const navMenuJs = await readFile(resolve(REPO_ROOT, 'src/_includes/scripts/nav-menu.js'), 'utf8');

for (const c of COMPONENTS) {
	let html = await inlineIcons(await readFile(resolve(HERE, 'design-previews', c.src), 'utf8'));
	html = html
		.replace(/^<!-- @dsCard[^>]*-->\n/, '')
		// The frame preloads tokens.css, bundle.css and the fonts; a preview that links its own would be inert anyway.
		.replace(/\t*<link rel="stylesheet"[^>]*>\n/g, '')
		// Page chrome belongs to a standalone page, not to a card: the card carries its own title and the page its own theme control.
		.replace(/\t*<div class="repel">\s*<h1[^>]*>.*?<\/h1>\s*<button class="button" data-small-button[^>]*>.*?<\/button>\s*<\/div>\n/s, '')
		.replace(/\t*<h1 class="text-step-4">.*?<\/h1>\n/s, '')
		.replace(/\t*<script>\s*(?:const toggle = )?document\.getElementById\('theme'\)[\s\S]*?<\/script>\n/g, '')
		.replace(/\t*<script src="\.\.\/js\/nav-menu\.js"><\/script>\n/, `\t\t<script>${navMenuJs}</script>\n`);
	html = `<!-- @dsCard group="${c.group}" height=${c.height} -->\n${html}`;
	await mkdir(resolve(OUT, 'components', c.name), {recursive: true});
	await writeFile(resolve(OUT, 'components', c.name, 'preview.html'), html);
}

// Guidelines sit beside the previews; the cover is a preview with a BARE folder — a README next to it would make it an ordinary component and the system would have no cover.
const DOCS = resolve(HERE, 'design-system-docs');
for (const c of COMPONENTS) {
	await copyFile(resolve(DOCS, `${c.name}.md`), resolve(OUT, 'components', c.name, 'README.md'));
}
await mkdir(resolve(OUT, 'components/Cover'), {recursive: true});
await copyFile(resolve(DOCS, 'Cover.html'), resolve(OUT, 'components/Cover/preview.html'));

// The index names the system and is published LAST, because a call replaces the whole file and a stale copy would undo an edit someone made in the page meanwhile.
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const index = {
	v: 3,
	layout: 'files',
	createdOnFiles: {v: 1, at: now},
	title: 'jedee design system',
	namespace: 'JEDEE',
	libraries: [],
	sections: {},
	groups: [],
	assetGroups: {},
	blobs: {},
	docs: {readme: 'project/README.md', sections: []},
	lastChange: {by: 'Johan', at: now, via: 'Claude Code', note: 'Built from the repo tokens and the compiled global.css.'}
};
await writeFile(resolve(OUT, 'design-system.json'), JSON.stringify(index, null, 2));

console.log(`Design system tree → _local/claude-design-system/project/`);
console.log(`  tokens.json      ${color.tokens.length} colors · ${spacing.tokens.length} spacing · ${radius.tokens.length} radii · ${shadow.tokens.length} shadows`);
console.log(`  components/      ${COMPONENTS.length} previews + bundle.css (${(bundleCss.length / 1024).toFixed(1)} KB)`);
console.log(`  fonts/           ${FONT_FILES.length} files`);
