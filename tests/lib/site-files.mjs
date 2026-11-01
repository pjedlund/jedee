// A file belongs to one site if a pattern in tests/site-files.json matches it, and is shared if none does.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const siteFiles = JSON.parse(readFileSync(path.join(root, 'tests/site-files.json'), 'utf8'));

// A pattern is a path where ** matches anything and * matches anything but a slash.
const toRegExp = pattern => new RegExp('^' + pattern.split('**').map(part => part.split('*').map(piece => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
const sitePatterns = siteFiles.map(toRegExp);

export const isSiteFile = file => sitePatterns.some(pattern => pattern.test(file));
