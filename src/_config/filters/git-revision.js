import {execFileSync} from 'node:child_process';

// ponytail: one `git log` per page per build; memoized so dev rebuilds don't re-spawn git for every page.
const cache = new Map();

/** The last commit that touched a source file: {hash, date}, or null when git or the history is missing — the Revised link then just doesn't render (⚠ a shallow clone on the build host would hide it on most pages). */
export const gitRevision = inputPath => {
  if (cache.has(inputPath)) return cache.get(inputPath);
  let revision = null;
  try {
    const [hash, date] = execFileSync('git', ['log', '-1', '--format=%H%x09%cI', '--', inputPath], {encoding: 'utf8'}).trim().split('\t');
    if (hash) revision = {hash, date: new Date(date)};
  } catch {}
  cache.set(inputPath, revision);
  return revision;
};
