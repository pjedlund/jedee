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
import {loadLogo} from '../utils/theme.js';

// ⚠ Keep this synchronous: the interlinker plugin drops an async shortcode's Promise inside {% if %}-wrapped includes, and the nav renders empty.
export const svgShortcode = (svgName, ariaName = '', className = '', styleName = '') => {
  // "logo" is the active theme's; everything else lives in src/assets/svg.
  const svgData = svgName === 'logo' ? loadLogo() : readFileSync(`./src/assets/svg/${svgName}.svg`, 'utf8');

  const {data} = optimize(svgData);

  return data.replace(
    /<svg(.*?)>/,
    `<svg$1 ${ariaName ? `role="img" aria-label="${ariaName}"` : 'aria-hidden="true"'} ${className ? `class="${className}"` : ''} ${styleName ? `style="${styleName}"` : ''} >`
  );
};
