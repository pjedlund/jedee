/**
 * Assemble the Claude Design bundle in `_local/claude-design/` from the site's own compiled CSS, so the design system there is the real thing rather than a hand-kept copy.
 *
 * Workflow:
 *   1. Build the site at least once (`npm start` or `npm run build`) so `src/_includes/css/*.css` is current
 *   2. Run `npm run design:bundle`
 *   3. Upload `_local/claude-design/` with the DesignSync tool (ask Claude to sync the design system)
 *
 * Preview pages are hand-written in `design-previews/` and copied verbatim; the token pages read their swatches out of the live stylesheet at render time, so they never need regenerating.
 */

import {readFile, writeFile, mkdir, copyFile, readdir, rm} from 'node:fs/promises';
import {dirname, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CSS_DIR = resolve(REPO_ROOT, 'src/_includes/css');
const PREVIEW_SRC = resolve(dirname(fileURLToPath(import.meta.url)), 'design-previews');
const OUT = resolve(REPO_ROOT, '_local/claude-design');

await rm(OUT, {recursive: true, force: true});
await mkdir(resolve(OUT, 'fonts'), {recursive: true});
await mkdir(resolve(OUT, 'local'), {recursive: true});
await mkdir(resolve(OUT, 'preview'), {recursive: true});

const globalCss = await readFile(resolve(CSS_DIR, 'global.css'), 'utf8');

// The site serves fonts from an absolute path; the bundle flattens them next to the stylesheet, where a relative url() resolves.
const fontPaths = [...globalCss.matchAll(/url\((\/assets\/fonts\/[^)]+\.woff2)\)/g)].map(m => m[1]);
const rewritten = globalCss.replace(/url\(\/assets\/fonts\/[^)]*\/([^/)]+\.woff2)\)/g, 'url(fonts/$1)');
await writeFile(resolve(OUT, 'jedee.css'), rewritten);

for (const p of [...new Set(fontPaths)]) {
	await copyFile(resolve(REPO_ROOT, 'src', p.slice(1)), resolve(OUT, 'fonts', basename(p)));
}

// The per-page bundles ride along so a preview can link the one it needs — custom-card.css and friends are not in global.css by design.
const localCss = (await readdir(CSS_DIR)).filter(f => f.endsWith('.css') && f !== 'global.css');
for (const f of localCss) {
	await copyFile(resolve(CSS_DIR, f), resolve(OUT, 'local', f));
}

const previews = (await readdir(PREVIEW_SRC)).filter(f => f.endsWith('.html'));
for (const f of previews) {
	await copyFile(resolve(PREVIEW_SRC, f), resolve(OUT, 'preview', f));
}

const SETUP = dirname(fileURLToPath(import.meta.url));
await copyFile(resolve(SETUP, 'design-system-README.md'), resolve(OUT, 'README.md'));
await copyFile(resolve(SETUP, 'design-system-SKILL.md'), resolve(OUT, 'SKILL.md'));

console.log(`Claude Design bundle → _local/claude-design/`);
console.log(`  jedee.css        ${(rewritten.length / 1024).toFixed(1)} KB`);
console.log(`  fonts/           ${new Set(fontPaths).size} files`);
console.log(`  local/           ${localCss.length} bundles`);
console.log(`  preview/         ${previews.length} pages`);
