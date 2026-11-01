// The share-card scripts' fonts, named in theme.json's og block. A font with no file is a system font, so there's nothing to embed or check.
import fs from 'node:fs';
import {loadThemeConfig, themeDir} from './theme.js';

const {display, body} = loadThemeConfig().og;
const embedded = [display, body].filter(font => font.file);

// ⚠ Inlined as data: URIs, not file:// URLs. A setContent document has no file origin, so a file:// @font-face src fails silently.
const dataUri = font => {
  const file = `${themeDir()}/fonts/${font.file}`;
  if (!fs.existsSync(file)) throw new Error(`theme.json's og block names ${font.file}, but ${file} doesn't exist. Add the file, or leave "file" out to use a system font.`);
  return `data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}`;
};

export const cardFontFaces = embedded.map(font => `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; src: url('${dataUri(font)}') format('woff2'); }`).join('\n');

// Run in the page: the embedded families that never loaded. ⚠ A card silently set in a system fallback is a valid JPEG that is simply wrong.
export const missingCardFonts = page =>
  page.evaluate(families => families.filter(family => ![...document.fonts].some(face => face.family.replace(/["']/g, '') === family && face.status === 'loaded')), embedded.map(font => font.family));
