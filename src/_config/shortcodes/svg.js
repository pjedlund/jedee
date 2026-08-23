/**
 * Generates an optimized SVG shortcode with optional attributes.
 *
 * @param {string} svgName - The name of the SVG file (without the .svg extension).
 * @param {string} [ariaName=''] - The ARIA label for the SVG.
 * @param {string} [className=''] - The CSS class name for the SVG.
 * @param {string} [styleName=''] - The inline style for the SVG.
 * @returns {string} The optimized SVG shortcode.
 */

import {optimize} from 'svgo';
import {readFileSync} from 'node:fs';

// NOTE: svgo's optimize() and readFileSync are both synchronous, so this shortcode must stay synchronous too. A leftover `async`/`await` (vestige of svgo v1's old Promise API) made it return a Promise, which the interlinker plugin silently drops inside deeply-nested includes (base→header→main-nav) — blanking the whole nav. Keep this sync.
export const svgShortcode = (svgName, ariaName = '', className = '', styleName = '') => {
  const svgData = readFileSync(`./src/assets/svg/${svgName}.svg`, 'utf8');

  const {data} = optimize(svgData);

  return data.replace(
    /<svg(.*?)>/,
    `<svg$1 ${ariaName ? `aria-label="${ariaName}"` : 'aria-hidden="true"'} ${className ? `class="${className}"` : ''} ${styleName ? `style="${styleName}"` : ''} >`
  );
};
