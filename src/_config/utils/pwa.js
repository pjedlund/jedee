// The service worker's settings (settings.pwa), with defaults. ⚠ A bad value stops the build and names the setting.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const INCLUDES = fileURLToPath(new URL('../../_includes', import.meta.url));

export function resolvePwa(settings, includesDir = INCLUDES) {
  const given = settings?.pwa ?? {};
  const workerPath = given.workerPath || '/serviceworker.js';
  if (typeof workerPath !== 'string' || !workerPath.startsWith('/') || !workerPath.endsWith('.js')) throw new Error(`settings.pwa.workerPath is ${JSON.stringify(workerPath)}, but it must start with / and end in .js`);
  const keepCaches = given.keepCaches ?? [];
  if (!Array.isArray(keepCaches) || keepCaches.some(name => typeof name !== 'string')) throw new Error('settings.pwa.keepCaches must be a list of cache names');
  const push = given.push || false;
  if (push !== false) {
    if (typeof push !== 'string') throw new Error(`settings.pwa.push is ${JSON.stringify(push)}, but it must be false or a path under src/_includes`);
    const file = path.resolve(includesDir, push);
    if (!file.startsWith(includesDir + path.sep) || !fs.existsSync(file)) throw new Error(`settings.pwa.push is "${push}", but src/_includes/${push} doesn't exist`);
  }
  return {workerPath, keepCaches, push};
}
