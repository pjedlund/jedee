// Builds the Figma copy of the DTCG tokens for the Tokens Studio plugin — same sets as Penpot's, with one fix.
// Workflow: edit src/_data/designTokens/ (run `npm run colors` after colorsBase.json) → `npm run figma:tokens` → import `_local/figma/figma-tokens.dtcg.json` via Tokens Studio.
// ⚠ Only difference from Penpot: line-height. Our tokens are unitless (1.2 = 1.2×font-size, CSS-style); Figma reads line-height as PX unless it ends in %, so a bare 1.2 collapses the text box. Here they become "120%".

import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from './build-penpot-tokens.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUTPUT_PATH = resolve(REPO_ROOT, '_local/figma/figma-tokens.dtcg.json');

// Unitless multiplier → Figma percentage. Composite type.* tokens reference these, so fixing the source tokens is enough.
function lineHeightToPercent(dtcg) {
	const lh = dtcg['core/typography']?.font?.lineHeight;
	if (!lh) return;
	for (const leaf of Object.values(lh)) {
		if (leaf?.$type === 'number') {
			leaf.$value = `${+(parseFloat(leaf.$value) * 100).toFixed(4)}%`;
			leaf.$type = 'lineHeights';
		}
	}
}

const dtcg = await build();
lineHeightToPercent(dtcg);
await mkdir(dirname(OUTPUT_PATH), {recursive: true});
await writeFile(OUTPUT_PATH, JSON.stringify(dtcg, null, 2) + '\n', 'utf8');
console.log(`Wrote ${OUTPUT_PATH.replace(REPO_ROOT + '/', '')}`);
console.log('Next: Tokens Studio → import this file, then select the Light theme.');
